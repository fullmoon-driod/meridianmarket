const express = require('express');
const https = require('https');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const util = require('util');
const path = require('path');
const fs = require('fs');
// Load .env from the folder that contains server.js (works no matter where the process is
// started from, e.g. pm2/systemd), then fall back to the current working directory.
const envFile = path.resolve(__dirname, '.env');
const envLoaded = require('dotenv').config({ path: envFile });
require('dotenv').config();
console.log(
  envLoaded.error
    ? `[config] no .env file found at ${envFile} (using the process environment only)`
    : `[config] loaded .env from ${envFile}`,
);

// ============================================================================
// CONFIGURATION
// ----------------------------------------------------------------------------
//   ADMIN_EMAIL / ADMIN_PASSWORD   master CRM admin login (checked on the SERVER now; it is no
//                                  longer hard-coded in the browser bundle). Set both in .env.
//   DEFAULT_RESET_PASSWORD         temporary password issued by a password reset (default A123456)
//   ALLOW_SELF_SERVICE_RESET       'true' lets a client reset THEMSELVES to the temporary password
//                                  from POST /api/forgot-password (email + registered phone must
//                                  match). Default 'false': the request is queued for CRM staff.
//   REQUIRE_CLIENT_TOKEN           'true' rejects client API calls that carry no session token.
//                                  Turn it on once your login page stores `client.token`.
//   ENFORCE_MARGIN                 'true' rejects orders that exceed free margin (default false)
//   DEFAULT_LEVERAGE               leverage used when an order does not specify one (default 100)
// ============================================================================
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'klaus@meridianmarket.net').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Wizzy01@';
const DEFAULT_RESET_PASSWORD = process.env.DEFAULT_RESET_PASSWORD || 'A123456';
const ALLOW_SELF_SERVICE_RESET = String(process.env.ALLOW_SELF_SERVICE_RESET).toLowerCase() === 'true';
const REQUIRE_CLIENT_TOKEN = String(process.env.REQUIRE_CLIENT_TOKEN).toLowerCase() === 'true';
const ENFORCE_MARGIN = String(process.env.ENFORCE_MARGIN).toLowerCase() === 'true';
const DEFAULT_LEVERAGE = Math.min(500, Math.max(1, parseInt(process.env.DEFAULT_LEVERAGE, 10) || 100));
const STAFF_SESSION_MS = 24 * 60 * 60 * 1000;
const CLIENT_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_KYC_BYTES = 10 * 1024 * 1024;
const MAX_KYC_DOCS_PER_CLIENT = 10;
const UPLOAD_DIR = path.resolve(__dirname, 'uploads', 'kyc');
const scrypt = util.promisify(crypto.scrypt);

const app = express();
// --- SSL CERTIFICATE CONFIGURATION ---
let sslOptions = {};
try {
  sslOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/meridianmarket.net/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/meridianmarket.net/fullchain.pem'),
  };
} catch (err) {
  console.error('Failed to load SSL certificates:', err.message);
}
const server = https.createServer(sslOptions, app);
const wss = new WebSocket.Server({ server, maxPayload: 1024 * 1024 });
// --- CORS & MIDDLEWARE CONFIGURATION ---
app.use(
  cors({
    origin: true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);
app.options('*', cors());
app.use(express.json({ limit: '16mb' })); // KYC uploads arrive as base64 (10MB file ~ 13.4MB)
app.set('trust proxy', true);
// --- SERVE FRONTEND STATIC FILES ---
const staticPath = path.resolve(__dirname, '../frontend/dist');
app.use(express.static(staticPath));

// ============================================================================
// SMALL UTILITIES
// ============================================================================
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const round2 = (n) => parseFloat(Number(n || 0).toFixed(2));
const parseClientId = (raw) => {
  if (raw === undefined || raw === null) return null;
  const n = parseInt(String(raw).replace(/^CL-/i, ''), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};
const digitsOnly = (s) => String(s || '').replace(/\D/g, '');
const clientIpOf = (req) => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// In-memory sliding-window rate limiter (login / password-reset abuse protection)
const rateBuckets = new Map();
function rateLimited(key, max, windowMs) {
  const now = Date.now();
  const hits = (rateBuckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    rateBuckets.set(key, hits);
    return true;
  }
  hits.push(now);
  rateBuckets.set(key, hits);
  return false;
}
setInterval(() => {
  const now = Date.now();
  rateBuckets.forEach((hits, k) => {
    const live = hits.filter((t) => now - t < 3600 * 1000);
    if (live.length) rateBuckets.set(k, live);
    else rateBuckets.delete(k);
  });
}, 10 * 60 * 1000).unref();

// Password hashing (scrypt). Legacy plaintext rows are still accepted and upgraded on first login.
async function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = await scrypt(String(pw), salt, 64);
  return `scrypt$${salt}$${key.toString('hex')}`;
}
async function verifyPassword(pw, stored) {
  if (!stored) return false;
  if (String(stored).startsWith('scrypt$')) {
    const [, salt, hex] = String(stored).split('$');
    const expected = Buffer.from(hex || '', 'hex');
    const actual = await scrypt(String(pw), salt, expected.length || 64);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  }
  return safeEqual(pw, stored); // legacy plaintext
}
const isHashed = (stored) => String(stored || '').startsWith('scrypt$');

// ============================================================================
// DATABASE
// ============================================================================
let db;
const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
const dbGet = (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))));
const dbAll = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || []))));

const dbPath = path.resolve(__dirname, 'meridian.db');

// Runs several statements as ONE atomic unit: everything commits, or nothing does.
// It uses its own short-lived connection, so requests that arrive while the transaction is open can never
// slip their statements into it (the shared connection above has no isolation between concurrent requests).
async function withTx(work, { foreignKeys = true } = {}) {
  const conn = await new Promise((resolve, reject) => {
    const c = new sqlite3.Database(dbPath, (err) => (err ? reject(err) : resolve(c)));
  });
  const tx = {
    run: (sql, params = []) =>
      new Promise((resolve, reject) => {
        conn.run(sql, params, function (err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      }),
    get: (sql, params = []) => new Promise((resolve, reject) => conn.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)))),
    all: (sql, params = []) => new Promise((resolve, reject) => conn.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])))),
  };
  try {
    await tx.run('PRAGMA busy_timeout = 8000');
    await tx.run(`PRAGMA foreign_keys = ${foreignKeys ? 'ON' : 'OFF'}`);
    await tx.run('BEGIN IMMEDIATE');
    try {
      const result = await work(tx);
      await tx.run('COMMIT');
      return result;
    } catch (e) {
      await tx.run('ROLLBACK').catch(() => {});
      throw e;
    }
  } finally {
    conn.close(() => {});
  }
}
const dbReady = new Promise((resolve, reject) => {
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
      return reject(err);
    }
    console.log('Connected to SQLite database.');
    initDatabase().then(resolve, reject);
  });
});
dbReady.catch((e) => console.error('Database initialisation failed:', e));

async function addColumn(table, column, ddl) {
  const cols = await dbAll(`PRAGMA table_info(${table})`);
  if (!cols.some((c) => c.name === column)) await dbRun(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
}

async function initDatabase() {
  await dbRun('PRAGMA foreign_keys = ON');
  await dbRun('PRAGMA journal_mode = WAL').catch(() => {});
  await dbRun('PRAGMA busy_timeout = 5000').catch(() => {});

  await dbRun(`
    CREATE TABLE IF NOT EXISTS crm_agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'AGENT',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  await dbRun(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      password TEXT NOT NULL,
      balance REAL DEFAULT 0.00,
      bonus REAL DEFAULT 0.00,
      ip_address TEXT,
      agent_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES crm_agents(id) ON DELETE SET NULL
    )`);
  // Base columns every query below relies on, for databases created by much older versions of this server
  await addColumn('crm_agents', 'role', "TEXT DEFAULT 'AGENT'");
  await addColumn('crm_agents', 'created_at', 'DATETIME');
  await addColumn('clients', 'created_at', 'DATETIME');
  await dbRun(`UPDATE clients SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL`);
  await dbRun(`UPDATE crm_agents SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL`);
  // Columns added over time (checked against the real schema, not "try and ignore the error")
  await addColumn('clients', 'agent_id', 'INTEGER');
  await addColumn('clients', 'ip_address', 'TEXT');
  await addColumn('clients', 'balance', 'REAL DEFAULT 0.00');
  await addColumn('clients', 'bonus', 'REAL DEFAULT 0.00');
  await addColumn('clients', 'kyc_status', "TEXT DEFAULT 'PENDING'");
  await addColumn('clients', 'kyc_updated_at', 'DATETIME');
  await addColumn('clients', 'kyc_note', 'TEXT');
  await addColumn('clients', 'kyc_reviewed_by', 'TEXT');
  await addColumn('clients', 'kyc_reviewed_at', 'DATETIME');
  await addColumn('clients', 'kyc_full_name', 'TEXT');
  await addColumn('clients', 'kyc_doc_type', 'TEXT');
  await addColumn('clients', 'kyc_id_number', 'TEXT');
  await addColumn('clients', 'kyc_submitted_at', 'DATETIME');
  await addColumn('clients', 'must_change_password', 'INTEGER DEFAULT 0');
  await addColumn('clients', 'password_updated_at', 'DATETIME');

  await dbRun(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'PENDING',
      method TEXT,
      tx_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )`);
  // Older databases may hold a transactions table with fewer columns: bring it up to date column by column.
  // Rows that pre-date the status column are history, not open requests, so they must never show up as pending
  // (approving one would credit the client a second time).
  const txHadStatus = (await dbAll(`PRAGMA table_info(transactions)`)).some((c) => c.name === 'status');
  await addColumn('transactions', 'status', 'TEXT');
  if (!txHadStatus) await dbRun(`UPDATE transactions SET status = 'APPROVED' WHERE status IS NULL`);
  await addColumn('transactions', 'method', 'TEXT');
  await addColumn('transactions', 'tx_hash', 'TEXT');
  await addColumn('transactions', 'created_at', 'DATETIME');
  // Review trail for deposit / withdrawal requests (who decided, when, and why)
  await addColumn('transactions', 'details', 'TEXT'); // withdrawal payout details (account name / IBAN / wallet ...)
  await addColumn('transactions', 'note', 'TEXT');
  await addColumn('transactions', 'processed_by', 'TEXT');
  await addColumn('transactions', 'processed_at', 'DATETIME');
  // Indexes only speed things up: a problem creating one must never take the whole database offline
  for (const ddl of [
    `CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions (status, id)`,
    `CREATE INDEX IF NOT EXISTS idx_tx_client ON transactions (client_id)`,
  ]) {
    await dbRun(ddl).catch((e) => console.warn('[db] optional index skipped:', e.message));
  }
  await dbRun(`
    CREATE TABLE IF NOT EXISTS client_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )`);
  await addColumn('client_logs', 'action_type', 'TEXT');
  await addColumn('client_logs', 'details', 'TEXT');
  await addColumn('client_logs', 'created_at', 'DATETIME');
  // Uploaded verification documents (files live in ./uploads/kyc, metadata lives here)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS kyc_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      doc_type TEXT,
      file_name TEXT,
      mime_type TEXT NOT NULL,
      size INTEGER,
      stored_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )`);
  // Server-side positions: the single source of truth the CRM and the client both read
  await dbRun(`
    CREATE TABLE IF NOT EXISTS positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      volume REAL NOT NULL,
      leverage INTEGER DEFAULT 100,
      open_price REAL NOT NULL,
      margin REAL DEFAULT 0,
      sl REAL DEFAULT 0,
      tp REAL DEFAULT 0,
      status TEXT DEFAULT 'OPEN',
      close_price REAL,
      realized_pnl REAL,
      opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )`);
  await dbRun(`
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      subject_id INTEGER NOT NULL,
      name TEXT,
      email TEXT,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )`);
  await dbRun(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      status TEXT DEFAULT 'PENDING',
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      resolved_by TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )`);
  // Deliberately holds no personal data: only that an account was removed, by whom and when.
  await dbRun(`
    CREATE TABLE IF NOT EXISTS deleted_accounts_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      subject_id INTEGER NOT NULL,
      deleted_by TEXT,
      deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  await dbRun(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`);

  await dbRun(`CREATE INDEX IF NOT EXISTS idx_positions_client_status ON positions (client_id, status)`).catch((e) => console.warn('[db] optional index skipped:', e.message));
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_kycdocs_client ON kyc_documents (client_id)`).catch((e) => console.warn('[db] optional index skipped:', e.message));
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_clients_agent ON clients (agent_id)`).catch((e) => console.warn('[db] optional index skipped:', e.message));
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_sessions_subject ON sessions (kind, subject_id)`).catch((e) => console.warn('[db] optional index skipped:', e.message));

  // Normalise KYC values written by earlier versions so a status can never "reset" on read
  await dbRun(`UPDATE clients SET kyc_status = 'APPROVED' WHERE UPPER(COALESCE(kyc_status,'')) IN ('VERIFIED','APPROVE')`);
  await dbRun(`UPDATE clients SET kyc_status = 'PENDING' WHERE kyc_status IS NULL OR TRIM(kyc_status) = ''`);

  // Seed the original default agent ONCE (first run only) so deleting that agent sticks across restarts.
  const seeded = await dbGet(`SELECT value FROM meta WHERE key = 'default_agent_seeded'`);
  if (!seeded) {
    const anyAgent = await dbGet(`SELECT id FROM crm_agents LIMIT 1`);
    if (!anyAgent) {
      await dbRun(`INSERT INTO crm_agents (name, email, password, role) VALUES (?, ?, ?, 'AGENT')`, [
        'Daniel Mz',
        'daniel@meridianmarket.net',
        await hashPassword('agent123'),
      ]);
    }
    await dbRun(`INSERT OR REPLACE INTO meta (key, value) VALUES ('default_agent_seeded', '1')`);
  }

  await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
  await dbRun(`DELETE FROM sessions WHERE expires_at < ?`, [Date.now()]);
  await loadAccountState().catch((e) => console.error('[db] could not load account state (continuing):', e));
  console.log('[db] schema ready');
}
setInterval(() => {
  if (db) dbRun(`DELETE FROM sessions WHERE expires_at < ?`, [Date.now()]).catch(() => {});
}, 60 * 60 * 1000).unref();

// Open https://your-site/api/health in a browser to see whether the database started (and why not, if it did not).
let dbInitError = null;
dbReady.catch((e) => {
  dbInitError = e;
});
app.get('/api/health', (req, res) => {
  dbReady.then(
    () => res.json({ ok: true, build: 'r4-cashier-diagnostics', db: 'ready', accounts: accountCache.size, openPositions: openPositions.length, uptimeSeconds: Math.round(process.uptime()), startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString() }),
    () => res.status(503).json({ ok: false, db: 'failed', reason: String((dbInitError && dbInitError.message) || 'unknown'), uptimeSeconds: Math.round(process.uptime()) }),
  );
});

// Make sure no request is served before the schema exists
app.use('/api', (req, res, next) => {
  dbReady.then(() => next(), () => res.status(503).json({ success: false, error: 'Database unavailable.', reason: String((dbInitError && dbInitError.message) || '') }));
});

// ============================================================================
// IN-MEMORY ACCOUNT STATE (kept in step with the DB; used for live equity)
// ============================================================================
const accountCache = new Map(); // clientId -> { balance, bonus, agentId }
let openPositions = []; // every OPEN position of every client (mirrors the `positions` table)

const safeIso = (v) => {
  if (!v) return new Date().toISOString();
  const str = String(v);
  const d = new Date(/[zZ]$|[+-]\d\d:?\d\d$/.test(str) ? str : `${str.replace(' ', 'T')}Z`);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};
const num = (v, fallback = 0) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : fallback);

// A damaged row must never stop the server from starting: bad rows are repaired in memory or skipped, and logged.
async function loadAccountState() {
  accountCache.clear();
  (await dbAll(`SELECT id, balance, bonus, agent_id FROM clients`)).forEach((r) =>
    accountCache.set(r.id, { balance: num(r.balance), bonus: num(r.bonus), agentId: r.agent_id }),
  );
  const rows = await dbAll(`SELECT * FROM positions WHERE status = 'OPEN'`);
  openPositions = [];
  rows.forEach((r) => {
    try {
      openPositions.push(rowToPosition(r));
    } catch (e) {
      console.error(`[db] skipped unreadable position #${r && r.id}:`, e.message);
    }
  });
  console.log(`[db] loaded ${accountCache.size} accounts and ${openPositions.length} open positions`);
}
function rowToPosition(r) {
  return {
    id: r.id,
    clientId: r.client_id,
    symbol: r.symbol,
    side: String(r.side || 'BUY').toUpperCase() === 'SELL' ? 'SELL' : 'BUY',
    volume: num(r.volume),
    leverage: num(r.leverage, 1) || 1,
    openPrice: num(r.open_price),
    margin: num(r.margin),
    sl: num(r.sl),
    tp: num(r.tp),
    openedAt: safeIso(r.opened_at),
    pnl: 0,
    currentPrice: null,
  };
}

// ============================================================================
// SESSIONS & AUTH
// ============================================================================
const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

async function createSession(kind, subjectId, name, email) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const ttl = kind === 'CLIENT' ? CLIENT_SESSION_MS : STAFF_SESSION_MS;
  await dbRun(`INSERT INTO sessions (token_hash, kind, subject_id, name, email, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
    hashToken(token),
    kind,
    subjectId,
    name || '',
    email || '',
    now,
    now + ttl,
  ]);
  return token;
}

// -> { kind: 'ADMIN'|'AGENT'|'CLIENT', id, name, email } or null
async function lookupSession(token) {
  if (!token) return null;
  const row = await dbGet(`SELECT * FROM sessions WHERE token_hash = ?`, [hashToken(token)]);
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    await dbRun(`DELETE FROM sessions WHERE token_hash = ?`, [row.token_hash]).catch(() => {});
    return null;
  }
  if (row.kind === 'ADMIN') return { kind: 'ADMIN', id: 0, name: row.name, email: row.email };
  if (row.kind === 'AGENT') {
    const a = await dbGet(`SELECT id, name, email FROM crm_agents WHERE id = ?`, [row.subject_id]);
    return a ? { kind: 'AGENT', id: a.id, name: a.name, email: a.email } : null; // deleted agent => session dies
  }
  if (row.kind === 'CLIENT') {
    const c = await dbGet(`SELECT id, full_name, email FROM clients WHERE id = ?`, [row.subject_id]);
    return c ? { kind: 'CLIENT', id: c.id, name: c.full_name, email: c.email } : null; // deleted client => session dies
  }
  return null;
}

const bearerToken = (req) => {
  const h = req.headers.authorization || '';
  return /^Bearer\s+/i.test(h) ? h.replace(/^Bearer\s+/i, '').trim() : '';
};

// Staff (admin / agent) guard. roles: which staff kinds may pass.
function staffAuth(roles = ['ADMIN', 'AGENT'], { queryToken = false } = {}) {
  return wrap(async (req, res, next) => {
    const token = bearerToken(req) || (queryToken ? String(req.query.token || '') : '');
    const session = await lookupSession(token);
    if (!session || session.kind === 'CLIENT') throw new HttpError(401, 'Authentication required. Please sign in again.');
    if (!roles.includes(session.kind)) throw new HttpError(403, 'You do not have permission to do that.');
    req.auth = session;
    next();
  });
}

// Client guard. Works with a client session token; falls back to the bare client id only while
// REQUIRE_CLIENT_TOKEN is off (so an older login page that does not store the token keeps working).
function clientAuth({ allowStaff = false } = {}) {
  return wrap(async (req, res, next) => {
    const token = bearerToken(req);
    const session = token ? await lookupSession(token) : null;
    const claimed = parseClientId(req.params.clientId ?? (req.body && req.body.clientId) ?? req.query.clientId);
    if (session && session.kind === 'CLIENT') {
      if (claimed !== null && claimed !== session.id) throw new HttpError(403, 'This session belongs to a different account.');
      req.clientId = session.id;
      req.auth = session;
      return next();
    }
    if (session && allowStaff) {
      if (claimed === null) throw new HttpError(400, 'Invalid client ID.');
      if (session.kind === 'AGENT') await getClientForStaff(session, claimed); // scope check
      req.clientId = claimed;
      req.auth = session;
      return next();
    }
    if (token) throw new HttpError(401, 'Session expired. Please sign in again.');
    if (REQUIRE_CLIENT_TOKEN) throw new HttpError(401, 'Authentication required. Please sign in again.');
    if (claimed === null) throw new HttpError(400, 'Invalid client ID.');
    req.clientId = claimed;
    req.auth = null;
    next();
  });
}

// Loads a client row and enforces that an AGENT only touches their own clients.
async function getClientForStaff(auth, clientId) {
  const row = await dbGet(`SELECT * FROM clients WHERE id = ?`, [clientId]);
  if (!row) throw new HttpError(404, 'Client not found.');
  if (auth.kind === 'AGENT' && row.agent_id !== auth.id) throw new HttpError(403, 'This client is not assigned to you.');
  return row;
}

// ============================================================================
// WEBSOCKET AUDIENCES
// ----------------------------------------------------------------------------
// Public: MARKET_TICK (quotes only). Everything account-related is private:
//   - to the owning client's sockets
//   - to staff sockets (admins see all, an agent only sees their own clients)
// A socket identifies itself with {action:'AUTH', token}.
// ============================================================================
function sendJson(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
    } catch (e) {
      /* socket closing */
    }
  }
}
function emitToClient(clientId, payload) {
  const text = JSON.stringify(payload);
  wss.clients.forEach((ws) => {
    if (ws.ctx && ws.ctx.kind === 'CLIENT' && ws.ctx.id === clientId) sendJson(ws, text);
  });
}
// agentId === null  -> every staff socket; otherwise admins + that agent only
function emitToStaff(payload, agentId = null) {
  const text = JSON.stringify(payload);
  wss.clients.forEach((ws) => {
    if (!ws.ctx || ws.ctx.kind === 'CLIENT') return;
    if (ws.ctx.kind === 'ADMIN' || agentId === null || ws.ctx.id === agentId) sendJson(ws, text);
  });
}
// Admin sockets only (deposit / withdrawal requests are reviewed by admins, agents never see them)
function emitToAdmins(payload) {
  const text = JSON.stringify(payload);
  wss.clients.forEach((ws) => {
    if (ws.ctx && ws.ctx.kind === 'ADMIN') sendJson(ws, text);
  });
}
function closeSockets(predicate, code, reason) {
  wss.clients.forEach((ws) => {
    if (ws.ctx && predicate(ws.ctx)) {
      try {
        ws.close(code, reason);
      } catch (e) {
        /* noop */
      }
    }
  });
}

function logClientActivity(clientId, actionType, details = {}) {
  const numericId = parseClientId(clientId);
  if (!numericId) return;
  dbRun(`INSERT INTO client_logs (client_id, action_type, details) VALUES (?, ?, ?)`, [numericId, actionType, JSON.stringify(details)]).catch((err) =>
    console.error('Activity Log Error:', err.message),
  );
}

// ============================================================================
// LIVE MARKET DATA FEED (replaces the old random-walk simulator)
// ----------------------------------------------------------------------------
// Real bid/ask quotes are streamed from professional data providers and fanned
// out to every connected browser over the existing WebSocket server.
//
//   Forex, Metals, Commodities, Indices -> OANDA v20 pricing stream (bid/ask)
//   Crypto                              -> Binance bookTicker stream (bid/ask)
//   US Stocks                           -> Alpaca market data snapshots (bid/ask)
//
// Environment variables (put them in your .env file):
//   OANDA_API_TOKEN, OANDA_ACCOUNT_ID   required for Forex/Metals/Commodities/Indices
//   OANDA_ENV                           'practice' (default) or 'live'
//   OANDA_STREAM_URL                    optional override of the stream host
//   BINANCE_WS_URL                      default wss://stream.binance.com:9443
//                                       (use wss://stream.binance.us:9443 from the US)
//   BINANCE_ENABLED                     set to 'false' to turn the crypto feed off
//   ALPACA_KEY_ID, ALPACA_SECRET_KEY    required for Stocks
//   ALPACA_FEED                         'iex' (free, default) or 'sip' (paid)
//   ALPACA_DATA_URL                     default https://data.alpaca.markets
//   QUOTE_BROADCAST_MS                  push interval to browsers (default 500)
//   STOCK_POLL_MS                       stock polling interval (default 2000)
//   TWELVEDATA_API_KEY                  alternative to OANDA/Alpaca (works from any country);
//                                       streams Forex, Metals and Stocks. Optional extras:
//                                       TWELVEDATA_SYMBOL_MAP (JSON, for commodities/indices),
//                                       TWELVEDATA_SPREAD_BPS (spread used when no bid/ask is sent)
//   OANDA_STALE_MS / BINANCE_STALE_MS / ALPACA_STALE_MS / TWELVEDATA_STALE_MS   staleness limits
// ============================================================================
const QUOTE_CONFIG = {
  broadcastMs: Math.max(100, parseInt(process.env.QUOTE_BROADCAST_MS, 10) || 500),
  stockPollMs: Math.max(1000, parseInt(process.env.STOCK_POLL_MS, 10) || 2000),
  staleMs: {
    oanda: parseInt(process.env.OANDA_STALE_MS, 10) || 60000,
    binance: parseInt(process.env.BINANCE_STALE_MS, 10) || 30000,
    alpaca: parseInt(process.env.ALPACA_STALE_MS, 10) || 300000,
    twelvedata: parseInt(process.env.TWELVEDATA_STALE_MS, 10) || 120000,
  },
};

// Instrument registry: front-end symbol -> provider + provider symbol.
// A null provider symbol means no feed is wired for that instrument (no quote is
// ever invented for it, and trading is blocked in the UI).
const INSTRUMENTS = {};
const addInstruments = (category, provider, entries) => {
  Object.entries(entries).forEach(([symbol, providerSymbol]) => {
    INSTRUMENTS[symbol] = { category, provider: providerSymbol ? provider : null, providerSymbol };
  });
};
const fromPairs = (pairs) => Object.fromEntries(pairs.map((p) => [p, p.replace('/', '_')]));

addInstruments(
  'Forex',
  'oanda',
  fromPairs([
    'EUR/USD',
    'GBP/USD',
    'USD/JPY',
    'USD/CHF',
    'USD/CAD',
    'AUD/USD',
    'NZD/USD',
    'EUR/GBP',
    'EUR/JPY',
    'EUR/CHF',
    'EUR/AUD',
    'EUR/CAD',
    'EUR/NZD',
    'GBP/JPY',
    'GBP/CHF',
    'GBP/AUD',
    'GBP/CAD',
    'GBP/NZD',
    'AUD/JPY',
    'AUD/CHF',
    'AUD/CAD',
    'AUD/NZD',
    'CAD/JPY',
    'CAD/CHF',
    'CHF/JPY',
    'NZD/JPY',
    'NZD/CAD',
    'NZD/CHF',
    'USD/MXN',
    'USD/ZAR',
    'USD/TRY',
    'USD/SGD',
    'USD/HKD',
    'USD/NOK',
    'USD/SEK',
    'USD/PLN',
    'USD/CNH',
    'USD/THB',
    'EUR/SEK',
    'EUR/NOK',
    'EUR/TRY',
  ]),
);
addInstruments('Metals', 'oanda', {
  'XAU/USD': 'XAU_USD',
  'XAG/USD': 'XAG_USD',
  'XPT/USD': 'XPT_USD',
  'XPD/USD': 'XPD_USD',
  'XAU/EUR': 'XAU_EUR',
  'XCU/USD': 'XCU_USD',
});
addInstruments('Commodities', 'oanda', {
  USOIL: 'WTICO_USD',
  UKOIL: 'BCO_USD',
  NATGAS: 'NATGAS_USD',
  WHEAT: 'WHEAT_USD',
  CORN: 'CORN_USD',
  SOYBEAN: 'SOYBN_USD',
  SUGAR: 'SUGAR_USD',
  COFFEE: null,
  COCOA: null,
  COTTON: null, // not offered by OANDA: no feed wired
});
addInstruments('Indices', 'oanda', {
  US30: 'US30_USD',
  NAS100: 'NAS100_USD',
  SPX500: 'SPX500_USD',
  US2000: 'US2000_USD',
  GER40: 'DE30_EUR',
  UK100: 'UK100_GBP',
  JPN225: 'JP225_USD',
  FRA40: 'FR40_EUR',
  HK50: 'HK33_HKD',
  AUS200: 'AU200_AUD',
});
addInstruments(
  'Crypto',
  'binance',
  Object.fromEntries(
    [
      'BTC',
      'ETH',
      'BNB',
      'SOL',
      'XRP',
      'ADA',
      'DOGE',
      'AVAX',
      'DOT',
      'LINK',
      'MATIC',
      'LTC',
      'BCH',
      'TRX',
      'ATOM',
      'XLM',
      'NEAR',
      'ARB',
    ].map((base) => [`${base}/USD`, base === 'MATIC' ? 'POLUSDT' : `${base}USDT`]), // MATIC was renamed POL on Binance
  ),
);
addInstruments(
  'Stocks',
  'alpaca',
  Object.fromEntries(
    [
      'NVDA',
      'AAPL',
      'TSLA',
      'MSFT',
      'AMZN',
      'GOOGL',
      'META',
      'NFLX',
      'AMD',
      'INTC',
      'PLTR',
      'PEP',
      'JPM',
      'BAC',
      'GS',
      'V',
      'MA',
      'DIS',
      'BA',
      'KO',
      'MCD',
      'NKE',
      'WMT',
      'XOM',
      'CVX',
      'PFE',
      'JNJ',
      'UBER',
    ].map((t) => [t, t]),
  ),
);

// ---- Provider selection ---------------------------------------------------------
// OANDA (Forex/Metals/Commodities/Indices) and Alpaca (Stocks) are used when their keys
// are set. Otherwise, if TWELVEDATA_API_KEY is set, Twelve Data streams those instruments
// instead (useful where OANDA/Alpaca accounts are unavailable). Forex, metals and stocks use
// the same symbol as the dashboard; commodities and indices need an explicit mapping, e.g.
//   TWELVEDATA_SYMBOL_MAP={"USOIL":"WTI/USD","SPX500":"SPX"}
// Anything without a mapping simply has no quote (and cannot be traded).
const TWELVE_KEY = (
  process.env.TWELVEDATA_API_KEY ||
  process.env.TWELVE_DATA_API_KEY ||
  process.env.TWELVEDATA_KEY ||
  process.env.TWELVE_DATA_KEY ||
  ''
).trim();
const HAS_OANDA = !!(process.env.OANDA_API_TOKEN && process.env.OANDA_ACCOUNT_ID);
const HAS_ALPACA = !!(process.env.ALPACA_KEY_ID && process.env.ALPACA_SECRET_KEY);
let twelveSymbolMap = {};
try {
  twelveSymbolMap = JSON.parse(process.env.TWELVEDATA_SYMBOL_MAP || '{}');
} catch (e) {
  console.warn('[feed:twelvedata] TWELVEDATA_SYMBOL_MAP is not valid JSON; ignoring it.');
}
console.log(
  `[config] API keys detected -> OANDA: ${HAS_OANDA ? 'yes' : 'no'}, Alpaca: ${HAS_ALPACA ? 'yes' : 'no'}, Twelve Data: ${TWELVE_KEY ? 'yes' : 'no'}`,
);
if (TWELVE_KEY) {
  Object.entries(INSTRUMENTS).forEach(([symbol, cfg]) => {
    if (cfg.category === 'Crypto') return;
    const servedNatively = (cfg.provider === 'oanda' && HAS_OANDA) || (cfg.provider === 'alpaca' && HAS_ALPACA);
    if (servedNatively) return;
    const tdSymbol = twelveSymbolMap[symbol] || (['Forex', 'Metals', 'Stocks'].includes(cfg.category) ? symbol : null);
    cfg.provider = tdSymbol ? 'twelvedata' : null;
    cfg.providerSymbol = tdSymbol;
  });
}

const symbolsBySource = { oanda: {}, binance: {}, alpaca: {}, twelvedata: {} };
Object.entries(INSTRUMENTS).forEach(([symbol, cfg]) => {
  if (cfg.provider) symbolsBySource[cfg.provider][cfg.providerSymbol] = symbol;
});

const feedStatus = { oanda: 'disabled', binance: 'disabled', alpaca: 'disabled', twelvedata: 'disabled' };
const feedNotes = { oanda: '', binance: '', alpaca: '', twelvedata: '' }; // last failure reason, shown in the dashboard

// ---- Quote store ------------------------------------------------------------
const quotes = new Map(); // symbol -> { bid, ask, ts, tradeable, stale, open, dayKey }
const dirtySymbols = new Set();

function applyQuote(symbol, bid, ask, { ts = Date.now(), tradeable = true, est = false } = {}) {
  if (!INSTRUMENTS[symbol]) return;
  if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid <= 0 || ask <= 0 || ask < bid) return; // drop bad / crossed quotes
  const mid = (bid + ask) / 2;
  const dayKey = new Date().toISOString().slice(0, 10);
  const prev = quotes.get(symbol);
  const open = prev && prev.dayKey === dayKey ? prev.open : mid; // reference price for the day's % change (00:00 UTC, or first quote seen)
  if (prev && prev.bid === bid && prev.ask === ask && prev.tradeable === tradeable && prev.ts === ts && prev.est === est) return;
  const stale = Date.now() - ts > staleLimitFor(symbol); // a replayed old quote must never look fresh
  quotes.set(symbol, { bid, ask, ts, tradeable, stale, open, dayKey, est });
  dirtySymbols.add(symbol);
}

const staleLimitFor = (symbol) => QUOTE_CONFIG.staleMs[INSTRUMENTS[symbol].provider] || 60000;

function refreshStaleness() {
  const now = Date.now();
  quotes.forEach((q, symbol) => {
    const stale = now - q.ts > staleLimitFor(symbol);
    if (stale !== q.stale) {
      q.stale = stale;
      dirtySymbols.add(symbol);
    }
  });
}

const serializeQuote = (symbol, q) => ({
  bid: q.bid,
  ask: q.ask,
  ts: q.ts,
  open: q.open,
  tradeable: q.tradeable,
  stale: q.stale,
  est: !!q.est, // true when the spread is estimated from a last-price feed
  category: INSTRUMENTS[symbol].category,
});

const snapshotQuotes = () => {
  const out = {};
  quotes.forEach((q, symbol) => {
    out[symbol] = serializeQuote(symbol, q);
  });
  return out;
};

function getLiveQuote(symbol) {
  const q = quotes.get(symbol);
  // Staleness is re-checked at the moment of use, not only on the broadcast timer.
  return q && q.tradeable && Date.now() - q.ts <= staleLimitFor(symbol) ? q : null;
}

// ---- Provider: OANDA v20 streaming (Forex, Metals, Commodities, Indices) ----
function startOandaFeed() {
  const token = process.env.OANDA_API_TOKEN;
  const accountId = process.env.OANDA_ACCOUNT_ID;
  const bySymbol = symbolsBySource.oanda;
  if (!token || !accountId) {
    console.warn('[feed:oanda] disabled - set OANDA_API_TOKEN and OANDA_ACCOUNT_ID to stream Forex/Metals/Commodities/Indices.');
    return;
  }
  const baseUrl = new URL(
    process.env.OANDA_STREAM_URL ||
      (process.env.OANDA_ENV === 'live' ? 'https://stream-fxtrade.oanda.com' : 'https://stream-fxpractice.oanda.com'),
  );
  const transport = baseUrl.protocol === 'http:' ? http : https;
  const path_ = `/v3/accounts/${encodeURIComponent(accountId)}/pricing/stream?instruments=${encodeURIComponent(Object.keys(bySymbol).join(','))}&snapshot=true`;
  let attempt = 0;

  const connect = () => {
    feedStatus.oanda = 'connecting';
    let finished = false;
    let lastData = Date.now();
    let buffer = '';
    let watchdog = null;
    let req = null;

    const finish = (reason) => {
      if (finished) return;
      finished = true;
      clearInterval(watchdog);
      feedStatus.oanda = 'reconnecting';
      feedNotes.oanda = String(reason).slice(0, 200);
      const delay = Math.min(1000 * 2 ** attempt, 30000);
      attempt += 1;
      console.warn(`[feed:oanda] ${reason}; reconnecting in ${delay / 1000}s`);
      try {
        req && req.destroy();
      } catch (e) {
        /* already closed */
      }
      setTimeout(connect, delay);
    };

    req = transport.get(
      {
        protocol: baseUrl.protocol,
        hostname: baseUrl.hostname,
        port: baseUrl.port || undefined,
        path: path_,
        headers: { Authorization: `Bearer ${token}`, 'Accept-Datetime-Format': 'RFC3339' },
      },
      (res) => {
        if (res.statusCode !== 200) {
          let body = '';
          res.on('data', (c) => {
            body += c;
          });
          res.on('end', () => finish(`HTTP ${res.statusCode} ${body.slice(0, 200)}`));
          return;
        }
        feedStatus.oanda = 'connected';
        feedNotes.oanda = '';
        attempt = 0;
        console.log(`[feed:oanda] streaming ${Object.keys(bySymbol).length} instruments`);
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          lastData = Date.now();
          buffer += chunk;
          let nl;
          while ((nl = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line) continue;
            let msg;
            try {
              msg = JSON.parse(line);
            } catch (e) {
              continue;
            }
            if (msg.type !== 'PRICE') continue; // HEARTBEATs just refresh lastData
            const symbol = bySymbol[msg.instrument];
            if (!symbol) continue;
            const bid = parseFloat((msg.bids && msg.bids[0] && msg.bids[0].price) ?? msg.closeoutBid);
            const ask = parseFloat((msg.asks && msg.asks[0] && msg.asks[0].price) ?? msg.closeoutAsk);
            applyQuote(symbol, bid, ask, { tradeable: msg.tradeable !== false });
          }
        });
        res.on('end', () => finish('stream ended'));
        res.on('error', (e) => finish(`stream error: ${e.message}`));
      },
    );
    req.on('error', (e) => finish(`request error: ${e.message}`));
    // OANDA sends a heartbeat every 5s; silence for 12s means a dead connection.
    watchdog = setInterval(() => {
      if (Date.now() - lastData > 12000) finish('no data/heartbeat for 12s');
    }, 4000);
  };
  connect();
}

// ---- Provider: Binance bookTicker (Crypto) ----------------------------------
function startBinanceFeed() {
  if (process.env.BINANCE_ENABLED === 'false') {
    console.warn('[feed:binance] disabled by BINANCE_ENABLED=false');
    return;
  }
  const bySymbol = symbolsBySource.binance;
  const streams = Object.keys(bySymbol)
    .map((s) => `${s.toLowerCase()}@bookTicker`)
    .join('/');
  const base = (process.env.BINANCE_WS_URL || 'wss://stream.binance.com:9443').replace(/\/+$/, '');
  let attempt = 0;

  const connect = () => {
    feedStatus.binance = 'connecting';
    let finished = false;
    let lastData = Date.now();
    const ws = new WebSocket(`${base}/stream?streams=${streams}`);
    const watchdog = setInterval(() => {
      if (Date.now() - lastData > 20000) {
        try {
          ws.terminate();
        } catch (e) {
          /* noop */
        }
      }
    }, 5000);

    const finish = (reason) => {
      if (finished) return;
      finished = true;
      clearInterval(watchdog);
      feedStatus.binance = 'reconnecting';
      feedNotes.binance = String(reason).slice(0, 200);
      const delay = Math.min(1000 * 2 ** attempt, 30000);
      attempt += 1;
      console.warn(`[feed:binance] ${reason}; reconnecting in ${delay / 1000}s`);
      setTimeout(connect, delay);
    };

    ws.on('open', () => {
      feedStatus.binance = 'connected';
      feedNotes.binance = '';
      attempt = 0;
      console.log(`[feed:binance] streaming ${Object.keys(bySymbol).length} instruments`);
    });
    ws.on('message', (raw) => {
      lastData = Date.now();
      let m;
      try {
        m = JSON.parse(raw);
      } catch (e) {
        return;
      }
      const d = m.data || m;
      const symbol = bySymbol[d && d.s];
      if (symbol) applyQuote(symbol, parseFloat(d.b), parseFloat(d.a));
    });
    ws.on('ping', () => {
      lastData = Date.now();
    });
    ws.on('close', () => finish('connection closed'));
    ws.on('error', (e) => finish(`error: ${e.message}`));
  };
  connect();
}

// ---- Provider: Alpaca market data snapshots (US Stocks) ---------------------
function startAlpacaFeed() {
  const keyId = process.env.ALPACA_KEY_ID;
  const secret = process.env.ALPACA_SECRET_KEY;
  const bySymbol = symbolsBySource.alpaca;
  if (!keyId || !secret) {
    console.warn('[feed:alpaca] disabled - set ALPACA_KEY_ID and ALPACA_SECRET_KEY to stream US stock quotes.');
    return;
  }
  const base = (process.env.ALPACA_DATA_URL || 'https://data.alpaca.markets').replace(/\/+$/, '');
  const url = `${base}/v2/stocks/snapshots?symbols=${encodeURIComponent(Object.keys(bySymbol).join(','))}&feed=${encodeURIComponent(process.env.ALPACA_FEED || 'iex')}`;
  feedStatus.alpaca = 'connecting';
  let failures = 0;

  const poll = async () => {
    try {
      const res = await fetch(url, {
        headers: { 'APCA-API-KEY-ID': keyId, 'APCA-API-SECRET-KEY': secret },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 160)}`);
      const body = await res.json();
      const snaps = body.snapshots || body;
      Object.keys(bySymbol).forEach((ticker) => {
        const lq = snaps[ticker] && snaps[ticker].latestQuote;
        if (!lq) return;
        const bid = parseFloat(lq.bp);
        const ask = parseFloat(lq.ap);
        const ts = Date.parse(lq.t); // keep the exchange timestamp so closed-market quotes go stale
        applyQuote(ticker, bid, ask, { ts: Number.isFinite(ts) ? ts : Date.now() });
      });
      if (failures > 0 || feedStatus.alpaca !== 'connected') console.log('[feed:alpaca] polling OK');
      failures = 0;
      feedStatus.alpaca = 'connected';
      feedNotes.alpaca = '';
    } catch (e) {
      failures += 1;
      feedStatus.alpaca = 'error';
      feedNotes.alpaca = String(e.message).slice(0, 200);
      if (failures === 1 || failures % 30 === 0) console.warn(`[feed:alpaca] poll failed: ${e.message}`);
    }
  };
  poll();
  setInterval(poll, QUOTE_CONFIG.stockPollMs);
}

// ---- Provider: Twelve Data WebSocket (alternative for Forex/Metals/Stocks/...) ----
// Twelve Data streams a last price and only includes bid/ask for some instruments. When
// a message has no bid/ask, a spread is applied around the price (basis points, see
// TWELVEDATA_SPREAD_BPS) and the quote is flagged `est` so the UI labels the spread "est.".
// A paid Twelve Data plan is required to stream more than a handful of symbols.
function startTwelveDataFeed() {
  const key = TWELVE_KEY;
  const bySymbol = symbolsBySource.twelvedata;
  const symbols = Object.keys(bySymbol);
  if (!key) return;
  if (symbols.length === 0) {
    console.warn('[feed:twelvedata] no instruments mapped to Twelve Data.');
    return;
  }
  const override = parseFloat(process.env.TWELVEDATA_SPREAD_BPS);
  const defaultBps = { Forex: 1.5, Metals: 3, Commodities: 5, Indices: 2, Stocks: 2 };
  const bpsFor = (symbol) => (Number.isFinite(override) ? override : defaultBps[INSTRUMENTS[symbol].category] || 3);
  const url = process.env.TWELVEDATA_WS_URL || 'wss://ws.twelvedata.com/v1/quotes/price';
  let attempt = 0;

  const connect = () => {
    feedStatus.twelvedata = 'connecting';
    let finished = false;
    let lastData = Date.now();
    let heartbeat = null;
    const ws = new WebSocket(`${url}?apikey=${encodeURIComponent(key)}`);
    const watchdog = setInterval(() => {
      if (Date.now() - lastData > 30000) {
        try {
          ws.terminate();
        } catch (e) {
          /* noop */
        }
      }
    }, 10000);

    const finish = (reason) => {
      if (finished) return;
      finished = true;
      clearInterval(watchdog);
      clearInterval(heartbeat);
      feedStatus.twelvedata = 'reconnecting';
      feedNotes.twelvedata = String(reason).slice(0, 200);
      const delay = Math.min(1000 * 2 ** attempt, 30000);
      attempt += 1;
      console.warn(`[feed:twelvedata] ${reason}; reconnecting in ${delay / 1000}s`);
      setTimeout(connect, delay);
    };

    ws.on('open', () => {
      feedStatus.twelvedata = 'connected';
      feedNotes.twelvedata = '';
      attempt = 0;
      ws.send(JSON.stringify({ action: 'subscribe', params: { symbols: symbols.join(',') } }));
      heartbeat = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ action: 'heartbeat' })), 10000);
      console.log(`[feed:twelvedata] subscribed to ${symbols.length} instruments`);
    });
    ws.on('message', (raw) => {
      lastData = Date.now();
      let m;
      try {
        m = JSON.parse(raw);
      } catch (e) {
        return;
      }
      if (m.event === 'subscribe-status') {
        const failed = (m.fails || []).map((f) => f.symbol || f);
        const ok = (m.success || []).length;
        if (failed.length) {
          console.warn(`[feed:twelvedata] could not subscribe to ${failed.length} symbols (plan limit or unknown symbol): ${failed.join(',').slice(0, 300)}`);
          feedNotes.twelvedata = `subscribed to ${ok}, rejected ${failed.length} (plan limit or unknown symbol)`;
        }
        return;
      }
      if (m.status === 'error' || m.event === 'error' || m.code >= 400) {
        const why = String(m.message || m.msg || JSON.stringify(m)).slice(0, 200);
        console.warn(`[feed:twelvedata] API error: ${why}`);
        feedNotes.twelvedata = `API error: ${why}`;
        return;
      }
      if (m.event !== 'price') return;
      const symbol = bySymbol[m.symbol];
      if (!symbol) return;
      let bid = parseFloat(m.bid);
      let ask = parseFloat(m.ask);
      let est = false;
      if (!(Number.isFinite(bid) && Number.isFinite(ask) && bid > 0 && ask >= bid)) {
        const price = parseFloat(m.price);
        if (!Number.isFinite(price) || price <= 0) return;
        const half = (price * bpsFor(symbol)) / 20000;
        bid = price - half;
        ask = price + half;
        est = true;
      }
      applyQuote(symbol, bid, ask, { est });
    });
    ws.on('close', () => finish('connection closed'));
    ws.on('error', (e) => finish(`error: ${e.message}`));
  };
  connect();
}

startOandaFeed();
startBinanceFeed();
startAlpacaFeed();
startTwelveDataFeed();


// ============================================================================
// ACCOUNTS, POSITIONS & LIVE EQUITY
// ============================================================================
const contractMultiplier = (symbol) => (INSTRUMENTS[symbol] && INSTRUMENTS[symbol].category === 'Forex' ? 100000 : 100);

// Convert a P&L expressed in the pair's quote currency into USD using live rates.
function quoteToUsd(symbol) {
  if (!symbol.includes('/')) return 1;
  const quoteCcy = symbol.split('/')[1];
  if (quoteCcy === 'USD') return 1;
  const direct = quotes.get(`${quoteCcy}/USD`);
  if (direct) return (direct.bid + direct.ask) / 2;
  const inverse = quotes.get(`USD/${quoteCcy}`);
  if (inverse) return 2 / (inverse.bid + inverse.ask);
  return null;
}

function markToMarket(pos) {
  const q = quotes.get(pos.symbol);
  const conv = quoteToUsd(pos.symbol);
  if (!q || conv === null) return;
  // Longs are valued at the price they could be sold at (bid), shorts at the price to buy back (ask).
  const closePrice = pos.side === 'BUY' ? q.bid : q.ask;
  const delta = pos.side === 'BUY' ? closePrice - pos.openPrice : pos.openPrice - closePrice;
  pos.currentPrice = closePrice;
  pos.pnl = round2(delta * pos.volume * contractMultiplier(pos.symbol) * conv);
}

// Shape the dashboard and CRM both consume.
const publicPosition = (p) => ({
  id: p.id,
  clientId: p.clientId,
  symbol: p.symbol,
  type: p.side, // dashboard field name
  side: p.side,
  volume: p.volume,
  leverage: p.leverage,
  openPrice: p.openPrice,
  currentPrice: p.currentPrice,
  margin: round2(p.margin),
  sl: p.sl,
  tp: p.tp,
  pnl: p.pnl,
  live: true,
  openedAt: p.openedAt,
});

function summarize(clientId, balance, bonus) {
  const positions = openPositions.filter((p) => p.clientId === clientId);
  positions.forEach(markToMarket);
  const floatingPnl = round2(positions.reduce((s, p) => s + (Number.isFinite(p.pnl) ? p.pnl : 0), 0));
  const marginUsed = round2(positions.reduce((s, p) => s + (p.margin || 0), 0));
  const bal = round2(balance);
  const equity = round2(bal + floatingPnl);
  return {
    clientId,
    balance: bal,
    bonus: round2(bonus),
    floatingPnl,
    equity,
    marginUsed,
    freeMargin: round2(equity - marginUsed),
    marginLevel: marginUsed > 0 ? round2((equity / marginUsed) * 100) : null,
    openCount: positions.length,
    positions: positions.map(publicPosition),
  };
}
function accountSummary(clientId) {
  const acc = accountCache.get(clientId);
  return acc ? summarize(clientId, acc.balance, acc.bonus) : null;
}

// Re-read the balance row, refresh the cache and push the new numbers to the owner and to staff.
async function refreshAccount(clientId, { notify = true } = {}) {
  const row = await dbGet(`SELECT id, balance, bonus, agent_id FROM clients WHERE id = ?`, [clientId]);
  if (!row) {
    accountCache.delete(clientId);
    return null;
  }
  accountCache.set(clientId, { balance: row.balance || 0, bonus: row.bonus || 0, agentId: row.agent_id });
  if (notify) pushAccount(clientId);
  return row;
}
function balancePayload(clientId) {
  const s = accountSummary(clientId);
  if (!s) return null;
  return {
    type: 'BALANCE_UPDATE',
    clientId,
    balance: s.balance,
    bonus: s.bonus,
    floatingPnl: s.floatingPnl,
    equity: s.equity,
    marginUsed: s.marginUsed,
    openCount: s.openCount,
    serverTime: Date.now(),
  };
}
function positionsPayload(clientId) {
  return { type: 'POSITIONS_UPDATE', clientId, positions: openPositions.filter((p) => p.clientId === clientId).map(publicPosition), serverTime: Date.now() };
}
function pushAccount(clientId) {
  const payload = balancePayload(clientId);
  if (!payload) return;
  const agentId = (accountCache.get(clientId) || {}).agentId ?? null;
  emitToClient(clientId, payload);
  emitToStaff(payload, agentId === null ? 0 : agentId); // unassigned clients are visible to admins only
}
function pushPositions(clientId) {
  const payload = positionsPayload(clientId);
  const agentId = (accountCache.get(clientId) || {}).agentId ?? null;
  emitToClient(clientId, payload);
  emitToStaff(payload, agentId === null ? 0 : agentId);
}

// ---- KYC helpers ---------------------------------------------------------------
const normKyc = (s) => {
  const v = String(s || 'PENDING').trim().toUpperCase();
  if (['APPROVED', 'APPROVE', 'VERIFIED'].includes(v)) return 'APPROVED';
  if (['REJECTED', 'DECLINED', 'FAILED'].includes(v)) return 'REJECTED';
  return 'PENDING';
};
// What the trader sees: unverified (nothing sent), pending (under review), verified, rejected
const deriveKycState = (status, submittedAt, docCount) =>
  status === 'APPROVED' ? 'verified' : status === 'REJECTED' ? 'rejected' : docCount > 0 || submittedAt ? 'pending' : 'unverified';

const docExt = (d) => path.extname(String(d.stored_name || '')) || '';
const docUrl = (d) => `/api/crm/kyc/documents/${d.id}/file/doc-${d.id}${docExt(d)}`;
const publicDoc = (d) => ({
  id: d.id,
  type: d.doc_type || 'Document',
  name: d.file_name || '',
  mime: d.mime_type,
  url: docUrl(d),
  uploadedAt: d.created_at,
});

function kycFields(row, docCount) {
  const status = normKyc(row.kyc_status);
  return {
    kyc_status: status,
    kyc_state: deriveKycState(status, row.kyc_submitted_at, docCount),
    kyc_note: row.kyc_note || '',
    kyc_reviewed_by: row.kyc_reviewed_by || '',
    kyc_reviewed_at: row.kyc_reviewed_at || null,
    kyc_updated_at: row.kyc_updated_at || null,
    kyc_submitted_at: row.kyc_submitted_at || null,
    kyc_full_name: row.kyc_full_name || '',
    kyc_doc_type: row.kyc_doc_type || '',
    kyc_id_number: row.kyc_id_number || '',
    kyc_document_count: docCount,
  };
}

async function notifyKyc(clientId) {
  const row = await dbGet(`SELECT * FROM clients WHERE id = ?`, [clientId]);
  if (!row) return;
  const n = (await dbGet(`SELECT COUNT(*) AS n FROM kyc_documents WHERE client_id = ?`, [clientId])).n;
  const payload = { type: 'KYC_UPDATE', clientId, ...kycFields(row, n), serverTime: Date.now() };
  emitToClient(clientId, payload);
  emitToStaff(payload, row.agent_id === null ? 0 : row.agent_id);
}
const notifyStaffRefresh = (event, clientId) => emitToStaff({ type: 'CLIENT_EVENT', event, clientId, serverTime: Date.now() });

// What a client is allowed to know about themselves (never the password hash)
async function publicClient(row, token) {
  const n = (await dbGet(`SELECT COUNT(*) AS n FROM kyc_documents WHERE client_id = ?`, [row.id])).n;
  const out = {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    balance: row.balance || 0,
    bonus: row.bonus || 0,
    agent_id: row.agent_id,
    created_at: row.created_at,
    must_change_password: !!row.must_change_password,
    ...kycFields(row, n),
  };
  if (token) out.token = token;
  return out;
}

// ============================================================================
// TRADING ENGINE (server-authoritative: price, fill, margin and realised P&L are decided here)
// ============================================================================
async function openPosition(clientId, params) {
  const symbol = String(params.symbol || '');
  const side = String(params.side || params.type || '').toUpperCase();
  const volume = parseFloat(params.volume);
  if (!INSTRUMENTS[symbol]) throw new HttpError(400, 'Unknown instrument.');
  if (side !== 'BUY' && side !== 'SELL') throw new HttpError(400, 'Order side must be BUY or SELL.');
  if (!Number.isFinite(volume) || volume <= 0 || volume > 1000) throw new HttpError(400, 'Invalid order volume.');
  if (!accountCache.has(clientId)) throw new HttpError(404, 'Account not found.');
  const q = getLiveQuote(symbol);
  if (!q) throw new HttpError(409, 'No live quote available (market closed or feed down).');
  const conv = quoteToUsd(symbol);
  if (conv === null) throw new HttpError(409, 'No live conversion rate for this instrument.');
  const openPrice = side === 'BUY' ? q.ask : q.bid; // buyers lift the ask, sellers hit the bid
  const leverage = Math.min(500, Math.max(1, parseInt(params.leverage, 10) || DEFAULT_LEVERAGE));
  const margin = round2((openPrice * volume * contractMultiplier(symbol) * conv) / leverage);
  if (ENFORCE_MARGIN) {
    const s = accountSummary(clientId);
    if (margin > s.freeMargin) throw new HttpError(409, `Insufficient free margin (required $${margin.toFixed(2)}, available $${Math.max(0, s.freeMargin).toFixed(2)}).`);
  }
  const sl = Math.max(0, parseFloat(params.sl) || 0);
  const tp = Math.max(0, parseFloat(params.tp) || 0);
  const r = await dbRun(`INSERT INTO positions (client_id, symbol, side, volume, leverage, open_price, margin, sl, tp, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')`, [
    clientId,
    symbol,
    side,
    volume,
    leverage,
    openPrice,
    margin,
    sl,
    tp,
  ]);
  const pos = { id: r.lastID, clientId, symbol, side, volume, leverage, openPrice, margin, sl, tp, openedAt: new Date().toISOString(), pnl: 0, currentPrice: null };
  markToMarket(pos);
  openPositions.push(pos);
  logClientActivity(clientId, 'PLACE_ORDER', { positionId: pos.id, symbol, side, volume, openPrice });
  pushPositions(clientId);
  pushAccount(clientId);
  return pos;
}

async function closePosition(clientId, positionId) {
  const idx = openPositions.findIndex((p) => p.id === positionId && p.clientId === clientId);
  if (idx === -1) throw new HttpError(404, 'Position not found (it may already be closed).');
  const pos = openPositions[idx];
  if (!getLiveQuote(pos.symbol)) throw new HttpError(409, 'Cannot close on a stale quote (market closed or feed down).');
  markToMarket(pos);
  const pnl = Number.isFinite(pos.pnl) ? pos.pnl : 0;
  const closePrice = pos.currentPrice;
  openPositions.splice(idx, 1); // removed synchronously, so a double-click can never settle twice
  try {
    const upd = await dbRun(`UPDATE positions SET status = 'CLOSED', close_price = ?, realized_pnl = ?, closed_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'OPEN'`, [
      closePrice,
      pnl,
      pos.id,
    ]);
    if (upd.changes !== 1) throw new Error('position was not open in the database');
    try {
      await dbRun(`UPDATE clients SET balance = MAX(0, ROUND(COALESCE(balance,0) + ?, 2)) WHERE id = ?`, [pnl, clientId]);
    } catch (balErr) {
      await dbRun(`UPDATE positions SET status = 'OPEN', close_price = NULL, realized_pnl = NULL, closed_at = NULL WHERE id = ?`, [pos.id]).catch(() => {});
      throw balErr;
    }
  } catch (err) {
    openPositions.push(pos); // settlement failed: keep the position open rather than lose it
    console.error('[trade] close failed:', err.message);
    throw new HttpError(500, 'Could not close the position. Please try again.');
  }
  logClientActivity(clientId, 'CLOSE_POSITION', { positionId: pos.id, symbol: pos.symbol, realizedPnL: pnl });
  const row = await refreshAccount(clientId);
  pushPositions(clientId);
  return { positionId: pos.id, realizedPnl: pnl, balance: row ? row.balance : null };
}

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================
app.post(
  '/api/register',
  wrap(async (req, res) => {
    const { fullName, email, phone, password } = req.body || {};
    if (!fullName || !email || !phone || !password) throw new HttpError(400, 'All fields are required.');
    const normalizedEmail = String(email).toLowerCase().trim();
    const cleanPassword = String(password).trim();
    const clientIp = clientIpOf(req);
    const agent =
      (await dbGet(`SELECT id FROM crm_agents WHERE LOWER(name) LIKE '%daniel%' ORDER BY id ASC LIMIT 1`)) ||
      (await dbGet(`SELECT id FROM crm_agents ORDER BY id ASC LIMIT 1`));
    let result;
    try {
      result = await dbRun(`INSERT INTO clients (full_name, email, phone, password, balance, ip_address, agent_id) VALUES (?, ?, ?, ?, 0, ?, ?)`, [
        String(fullName).trim(),
        normalizedEmail,
        String(phone).trim(),
        await hashPassword(cleanPassword),
        clientIp,
        agent ? agent.id : null,
      ]);
    } catch (e) {
      if (String(e.message).includes('UNIQUE constraint failed')) throw new HttpError(400, 'Email address is already registered.');
      throw new HttpError(500, `Registration Failed: ${e.message}`);
    }
    const id = result.lastID;
    await refreshAccount(id, { notify: false });
    logClientActivity(id, 'ACCOUNT_CREATED', { fullName, email: normalizedEmail, phone, ip_address: clientIp });
    notifyStaffRefresh('CLIENT_CREATED', id);
    const token = await createSession('CLIENT', id, fullName, normalizedEmail);
    const row = await dbGet(`SELECT * FROM clients WHERE id = ?`, [id]);
    res.json({ success: true, token, client: await publicClient(row, token) });
  }),
);

app.post(
  '/api/login',
  wrap(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) throw new HttpError(400, 'Email and password required.');
    const cleanEmail = String(email).toLowerCase().trim();
    if (rateLimited(`login:${clientIpOf(req)}:${cleanEmail}`, 10, 15 * 60 * 1000)) throw new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');
    const row = await dbGet(`SELECT * FROM clients WHERE LOWER(email) = ?`, [cleanEmail]);
    const ok = row && (await verifyPassword(String(password).trim(), row.password));
    if (!ok) throw new HttpError(401, 'Invalid email or password.');
    if (!isHashed(row.password)) await dbRun(`UPDATE clients SET password = ? WHERE id = ?`, [await hashPassword(String(password).trim()), row.id]);
    logClientActivity(row.id, 'CLIENT_LOGIN', { timestamp: new Date() });
    const token = await createSession('CLIENT', row.id, row.full_name, row.email);
    res.json({ success: true, token, client: await publicClient(row, token) });
  }),
);

// Client forgot their password.
//  - default: the request is queued for CRM staff (who verify the caller and issue the temporary password)
//  - ALLOW_SELF_SERVICE_RESET=true: email + registered phone must match, then the account is reset immediately
app.post(
  '/api/forgot-password',
  wrap(async (req, res) => {
    const { email, phone } = req.body || {};
    if (!email) throw new HttpError(400, 'Email is required.');
    const cleanEmail = String(email).toLowerCase().trim();
    if (rateLimited(`forgot:${clientIpOf(req)}`, 5, 15 * 60 * 1000) || rateLimited(`forgot-acct:${cleanEmail}`, 5, 60 * 60 * 1000)) {
      throw new HttpError(429, 'Too many requests. Please try again later.');
    }
    const generic = ALLOW_SELF_SERVICE_RESET
      ? { success: true, message: `If the details match an account, its password has been reset to the temporary password ${DEFAULT_RESET_PASSWORD}. Sign in and choose a new password straight away.` }
      : { success: true, message: 'Request received. Your account manager will reset your password and contact you shortly.' };
    const row = await dbGet(`SELECT * FROM clients WHERE LOWER(email) = ?`, [cleanEmail]);
    if (!row) return res.json(generic); // never reveal whether an account exists
    const phoneMatches = digitsOnly(phone).length >= 6 && digitsOnly(phone) === digitsOnly(row.phone);
    if (ALLOW_SELF_SERVICE_RESET) {
      if (phoneMatches) await applyPasswordReset(row.id, DEFAULT_RESET_PASSWORD, 'SELF_SERVICE');
      return res.json(generic);
    }
    const pending = await dbGet(`SELECT id FROM password_resets WHERE client_id = ? AND status = 'PENDING'`, [row.id]);
    if (!pending) await dbRun(`INSERT INTO password_resets (client_id) VALUES (?)`, [row.id]);
    logClientActivity(row.id, 'PASSWORD_RESET_REQUESTED', { phoneMatched: phoneMatches, ip: clientIpOf(req) });
    notifyStaffRefresh('PASSWORD_RESET_REQUESTED', row.id);
    res.json(generic);
  }),
);

async function applyPasswordReset(clientId, newPassword, resolvedBy) {
  await dbRun(`UPDATE clients SET password = ?, must_change_password = 1, password_updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [await hashPassword(newPassword), clientId]);
  await dbRun(`DELETE FROM sessions WHERE kind = 'CLIENT' AND subject_id = ?`, [clientId]); // old logins stop working
  await dbRun(`UPDATE password_resets SET status = 'RESOLVED', resolved_at = CURRENT_TIMESTAMP, resolved_by = ? WHERE client_id = ? AND status = 'PENDING'`, [resolvedBy, clientId]);
  closeSockets((c) => c.kind === 'CLIENT' && c.id === clientId, 4002, 'password reset');
  logClientActivity(clientId, 'PASSWORD_RESET', { by: resolvedBy });
  notifyStaffRefresh('PASSWORD_RESET', clientId);
}

app.post(
  '/api/client/change-password',
  clientAuth(),
  wrap(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    const next = String(newPassword || '').trim();
    if (!currentPassword || !next) throw new HttpError(400, 'Current and new password are required.');
    if (next.length < 6) throw new HttpError(400, 'New password must be at least 6 characters.');
    if (next === DEFAULT_RESET_PASSWORD) throw new HttpError(400, 'Please choose a password other than the temporary one.');
    const row = await dbGet(`SELECT * FROM clients WHERE id = ?`, [req.clientId]);
    if (!row) throw new HttpError(404, 'Client not found.');
    if (rateLimited(`chpw:${req.clientId}`, 8, 15 * 60 * 1000)) throw new HttpError(429, 'Too many attempts. Please wait and try again.');
    if (!(await verifyPassword(String(currentPassword).trim(), row.password))) throw new HttpError(401, 'Current password is incorrect.');
    await dbRun(`UPDATE clients SET password = ?, must_change_password = 0, password_updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [await hashPassword(next), row.id]);
    logClientActivity(row.id, 'PASSWORD_CHANGED', {});
    res.json({ success: true, message: 'Password updated.' });
  }),
);

// CRM staff login (master admin from env + agents from the database)
const handleStaffLogin = wrap(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw new HttpError(400, 'Email and password are required.');
  const cleanEmail = String(email).toLowerCase().trim();
  const cleanPassword = String(password).trim();
  if (rateLimited(`staff:${clientIpOf(req)}:${cleanEmail}`, 10, 15 * 60 * 1000)) throw new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');

  if (cleanEmail === ADMIN_EMAIL && safeEqual(String(password), ADMIN_PASSWORD)) {
    const token = await createSession('ADMIN', 0, 'Klaus Admin', ADMIN_EMAIL);
    return res.json({ success: true, token, role: 'ADMIN', agent: { id: 0, name: 'Klaus Admin', email: ADMIN_EMAIL, role: 'ADMIN' } });
  }
  const agent = await dbGet(`SELECT * FROM crm_agents WHERE LOWER(email) = ?`, [cleanEmail]);
  if (!agent || !(await verifyPassword(cleanPassword, agent.password))) throw new HttpError(401, 'Invalid agent credentials.');
  if (!isHashed(agent.password)) await dbRun(`UPDATE crm_agents SET password = ? WHERE id = ?`, [await hashPassword(cleanPassword), agent.id]);
  const token = await createSession('AGENT', agent.id, agent.name, agent.email);
  res.json({ success: true, token, role: 'AGENT', agent: { id: agent.id, name: agent.name, email: agent.email, role: 'AGENT' } });
});
app.post('/api/admin/agent-login', handleStaffLogin);
app.post('/api/crm/agent/login', handleStaffLogin);

app.post(
  '/api/auth/logout',
  wrap(async (req, res) => {
    const token = bearerToken(req);
    if (token) await dbRun(`DELETE FROM sessions WHERE token_hash = ?`, [hashToken(token)]);
    res.json({ success: true });
  }),
);

// ============================================================================
// CLIENT ACCOUNT ENDPOINTS
// ============================================================================
const handleAccount = wrap(async (req, res) => {
  const row = await dbGet(`SELECT * FROM clients WHERE id = ?`, [req.clientId]);
  if (!row) throw new HttpError(404, 'Client not found.');
  const summary = accountSummary(req.clientId) || summarize(req.clientId, row.balance, row.bonus);
  res.json({ success: true, client: await publicClient(row), summary, positions: summary.positions, serverTime: Date.now() });
});
app.get('/api/client/profile/:clientId', clientAuth({ allowStaff: true }), handleAccount);
app.get('/api/client/account/:clientId', clientAuth({ allowStaff: true }), handleAccount);

app.post(
  '/api/trade/open',
  clientAuth(),
  wrap(async (req, res) => {
    const pos = await openPosition(req.clientId, req.body || {});
    const s = accountSummary(req.clientId);
    res.json({ success: true, position: publicPosition(pos), balance: s.balance, summary: s });
  }),
);
app.post(
  '/api/trade/close',
  clientAuth(),
  wrap(async (req, res) => {
    const positionId = parseInt(req.body && (req.body.positionId ?? req.body.id), 10);
    if (!Number.isInteger(positionId)) throw new HttpError(400, 'Invalid position id.');
    const result = await closePosition(req.clientId, positionId);
    res.json({ success: true, ...result, summary: accountSummary(req.clientId) });
  }),
);

// ---- KYC: client submits identity details + a document ----------------------------
function sniffFile(buf) {
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { mime: 'image/png', ext: '.png' };
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: '.jpg' };
  if (buf.length > 5 && buf.slice(0, 5).toString('latin1') === '%PDF-') return { mime: 'application/pdf', ext: '.pdf' };
  return null;
}
const cleanText = (v, max) => String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

app.post(
  '/api/client/kyc/submit',
  clientAuth(),
  wrap(async (req, res) => {
    const clientId = req.clientId;
    const row = await dbGet(`SELECT * FROM clients WHERE id = ?`, [clientId]);
    if (!row) throw new HttpError(404, 'Client not found.');
    if (normKyc(row.kyc_status) === 'APPROVED') throw new HttpError(409, 'Your identity is already verified.');
    const body = req.body || {};
    const fullName = cleanText(body.fullName, 120);
    const documentType = cleanText(body.documentType, 40) || 'Document';
    const idNumber = cleanText(body.idNumber, 60);
    if (!fullName || !idNumber) throw new HttpError(400, 'Full name and document number are required.');
    const b64 = String(body.dataBase64 || body.file || '').replace(/^data:[^;]+;base64,/, '');
    if (!b64) throw new HttpError(400, 'Please attach a document image or PDF.');
    const buf = Buffer.from(b64, 'base64');
    if (!buf.length) throw new HttpError(400, 'The uploaded file is empty.');
    if (buf.length > MAX_KYC_BYTES) throw new HttpError(413, 'File is too large. Maximum size is 10MB.');
    const kind = sniffFile(buf);
    if (!kind) throw new HttpError(400, 'Unsupported file type. Please upload a PNG, JPG or PDF.');
    const count = (await dbGet(`SELECT COUNT(*) AS n FROM kyc_documents WHERE client_id = ?`, [clientId])).n;
    if (count >= MAX_KYC_DOCS_PER_CLIENT) throw new HttpError(400, 'Document limit reached. Please contact support.');

    const storedName = `${clientId}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${kind.ext}`;
    await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.promises.writeFile(path.join(UPLOAD_DIR, storedName), buf, { mode: 0o640 });
    try {
      await dbRun(`INSERT INTO kyc_documents (client_id, doc_type, file_name, mime_type, size, stored_name) VALUES (?, ?, ?, ?, ?, ?)`, [
        clientId,
        documentType,
        cleanText(body.fileName, 160) || `document${kind.ext}`,
        kind.mime,
        buf.length,
        storedName,
      ]);
      // A new submission always goes (back) to PENDING for staff review; it can never produce APPROVED.
      await dbRun(
        `UPDATE clients SET kyc_status = 'PENDING', kyc_note = '', kyc_full_name = ?, kyc_doc_type = ?, kyc_id_number = ?,
           kyc_submitted_at = CURRENT_TIMESTAMP, kyc_updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [fullName, documentType, idNumber, clientId],
      );
    } catch (e) {
      await fs.promises.unlink(path.join(UPLOAD_DIR, storedName)).catch(() => {});
      throw e;
    }
    logClientActivity(clientId, 'KYC_SUBMITTED', { documentType, mime: kind.mime, bytes: buf.length });
    await notifyKyc(clientId);
    notifyStaffRefresh('DOCUMENT_UPLOADED', clientId);
    const fresh = await dbGet(`SELECT * FROM clients WHERE id = ?`, [clientId]);
    res.json({ success: true, message: 'Documents received. Awaiting compliance review.', client: await publicClient(fresh) });
  }),
);

// ---- Deposit / withdrawal requests --------------------------------------------------
const REQUEST_TYPES = ['DEPOSIT', 'WITHDRAWAL'];
const MAX_PENDING_PER_CLIENT = 10;
const MAX_REQUEST_AMOUNT = 10000000;
const isoOf = (v) => {
  if (!v) return null;
  const str = String(v);
  const d = new Date(/[zZ]$|[+-]\d\d:?\d\d$/.test(str) ? str : `${str.replace(' ', 'T')}Z`); // SQLite CURRENT_TIMESTAMP is UTC without a zone
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const publicTx = (t) => ({
  id: t.id,
  clientId: t.client_id,
  type: t.type,
  amount: round2(t.amount),
  method: t.method || '',
  reference: t.tx_hash && t.tx_hash !== 'N/A' ? t.tx_hash : '',
  details: t.details || '',
  status: t.status,
  note: t.note || '',
  processedBy: t.processed_by || '',
  processedAt: isoOf(t.processed_at),
  createdAt: isoOf(t.created_at),
  ...(t.full_name !== undefined ? { clientName: t.full_name, clientEmail: t.email, agentName: t.agent_name || 'Unassigned' } : {}),
});
const TX_WITH_CLIENT = `SELECT t.*, c.full_name, c.email, COALESCE(a.name, 'Unassigned') AS agent_name
  FROM transactions t JOIN clients c ON c.id = t.client_id LEFT JOIN crm_agents a ON a.id = c.agent_id`;
const loadTxWithClient = (id) => dbGet(`${TX_WITH_CLIENT} WHERE t.id = ?`, [id]);
const pendingRequestStats = async () => {
  const rows = await dbAll(`SELECT type, COUNT(*) AS n, COALESCE(SUM(amount), 0) AS total FROM transactions WHERE status = 'PENDING' AND type IN ('DEPOSIT','WITHDRAWAL') GROUP BY type`);
  const stat = { pendingCount: 0, pendingDeposits: 0, pendingWithdrawals: 0, pendingDepositTotal: 0, pendingWithdrawalTotal: 0 };
  rows.forEach((r) => {
    stat.pendingCount += r.n;
    if (r.type === 'DEPOSIT') {
      stat.pendingDeposits = r.n;
      stat.pendingDepositTotal = round2(r.total);
    } else {
      stat.pendingWithdrawals = r.n;
      stat.pendingWithdrawalTotal = round2(r.total);
    }
  });
  return stat;
};

async function createCashierRequest(req, type) {
  const body = req.body || {};
  const amt = round2(parseFloat(body.amount));
  if (!Number.isFinite(amt) || amt <= 0) throw new HttpError(400, 'Please enter a valid amount.');
  if (amt > MAX_REQUEST_AMOUNT) throw new HttpError(400, 'That amount is above the allowed limit.');
  const clientId = req.clientId;
  const row = await dbGet(`SELECT id, full_name, balance, agent_id FROM clients WHERE id = ?`, [clientId]);
  if (!row) throw new HttpError(404, 'Client not found.');
  const pending = await dbGet(`SELECT COUNT(*) AS n, COALESCE(SUM(CASE WHEN type = 'WITHDRAWAL' THEN amount ELSE 0 END), 0) AS w FROM transactions WHERE client_id = ? AND status = 'PENDING'`, [clientId]);
  if (pending.n >= MAX_PENDING_PER_CLIENT) throw new HttpError(429, 'You already have several requests waiting for review. Please wait for them to be processed.');

  let details = '';
  if (type === 'WITHDRAWAL') {
    const summary = accountSummary(clientId) || summarize(clientId, row.balance, 0);
    // What can actually leave the account: never more than the balance, never margin that open positions need,
    // and not money that is already promised to another pending withdrawal.
    const available = Math.max(0, round2(Math.min(row.balance || 0, summary.freeMargin) - pending.w));
    if (amt > available + 1e-9) throw new HttpError(400, `Insufficient available balance. You can withdraw up to $${available.toFixed(2)} right now.`);
    const accountName = cleanText(body.accountName, 120);
    const payout = cleanText(body.paymentDetails, 400);
    if (!payout) throw new HttpError(400, 'Please enter where the funds should be sent.');
    details = [accountName && `Account holder: ${accountName}`, payout].filter(Boolean).join(' | ');
  }
  const method = cleanText(body.method || body.paymentMethod, 60) || (type === 'DEPOSIT' ? 'Crypto' : 'Bank Transfer');
  const reference = cleanText(body.txHash || body.reference, 200) || 'N/A';
  let r;
  try {
    r = await dbRun(`INSERT INTO transactions (client_id, type, amount, status, method, tx_hash, details) VALUES (?, ?, ?, 'PENDING', ?, ?, ?)`, [clientId, type, amt, method, reference, details || null]);
  } catch (e) {
    // The table in an older database may have different columns / constraints: say exactly what is wrong, and try a minimal row.
    console.error('[cashier] insert failed:', e.message);
    try {
      // fill any extra NOT NULL column an older table may carry (currency, network ...) with a neutral value
      const cols = await dbAll(`PRAGMA table_info(transactions)`);
      const names = ['client_id', 'type', 'amount', 'status'];
      const vals = [clientId, type, amt, 'PENDING'];
      cols.forEach((c) => {
        if (c.pk || names.includes(c.name) || !c.notnull || c.dflt_value !== null) return;
        names.push(c.name);
        vals.push(/INT|REAL|NUM|FLOA|DOUB|DEC/i.test(c.type || '') ? 0 : /^currency$|^asset$|^coin$/i.test(c.name) ? 'USD' : '');
      });
      r = await dbRun(`INSERT INTO transactions (${names.map(quoteIdent).join(', ')}) VALUES (${names.map(() => '?').join(', ')})`, vals);
      await dbRun(`UPDATE transactions SET method = ?, tx_hash = ?, details = ? WHERE id = ?`, [method, reference, details || null, r.lastID]).catch(() => {});
    } catch (e2) {
      console.error('[cashier] minimal insert failed too:', e2.message);
      throw new HttpError(500, `Could not save the request (${e2.message}). Please contact support.`);
    }
  }
  logClientActivity(clientId, `${type}_REQUESTED`, { amount: amt, method, transactionId: r.lastID });

  let tx = await loadTxWithClient(r.lastID).catch((e) => {
    console.error('[cashier] could not reload request:', e.message);
    return null;
  });
  if (!tx) tx = { id: r.lastID, client_id: clientId, type, amount: amt, method, tx_hash: reference, details, status: 'PENDING', created_at: new Date().toISOString(), full_name: row.full_name, email: '', agent_name: '' };
  try {
    const stats = await pendingRequestStats();
    emitToAdmins({ type: 'TRANSACTION_REQUEST', transaction: publicTx(tx), ...stats, serverTime: Date.now() }); // instant notification in the CRM
    emitToClient(clientId, { type: 'TRANSACTION_UPDATE', clientId, transaction: publicTx(tx), serverTime: Date.now() });
  } catch (e) {
    console.error('[cashier] notification failed:', e.message);
  }
  return tx;
}
const cashierHandler = (forcedType) =>
  wrap(async (req, res) => {
    const type = forcedType || String((req.body && req.body.type) || 'DEPOSIT').toUpperCase();
    if (!REQUEST_TYPES.includes(type)) throw new HttpError(400, 'Invalid transaction type.');
    let tx;
    try {
      tx = await createCashierRequest(req, type);
    } catch (e) {
      if (e instanceof HttpError) throw e;
      console.error(`[cashier] ${type} request failed:`, e);
      throw new HttpError(500, `Could not submit the request: ${String((e && e.message) || e).slice(0, 200)}`);
    }
    res.json({
      success: true,
      message: type === 'DEPOSIT' ? 'Deposit request submitted. It will be credited once the team confirms your payment.' : 'Withdrawal request submitted for review.',
      transactionId: tx.id,
      transaction: publicTx(tx),
    });
  });
app.post('/api/cashier/deposit', clientAuth(), cashierHandler(null)); // `type` in the body may still say WITHDRAWAL (older clients)
app.post('/api/cashier/withdraw', clientAuth(), cashierHandler('WITHDRAWAL'));

// The client's own requests (newest first) with their current status
const handleMyTransactions = wrap(async (req, res) => {
  const rows = await dbAll(`SELECT * FROM transactions WHERE client_id = ? AND type IN ('DEPOSIT','WITHDRAWAL') ORDER BY id DESC LIMIT 30`, [req.clientId]);
  res.json({ success: true, transactions: rows.map(publicTx) });
});
app.get('/api/client/transactions', clientAuth(), handleMyTransactions);
app.get('/api/client/transactions/:clientId', clientAuth(), handleMyTransactions);

// ============================================================================
// CRM / ADMIN ENDPOINTS  (every one requires a staff session; agents are scoped to their own clients)
// ============================================================================
const agentScopeSql = (auth, alias = 'c') => (auth.kind === 'AGENT' ? { where: `WHERE ${alias}.agent_id = ?`, params: [auth.id] } : { where: '', params: [] });

app.get(
  '/api/admin/clients-detailed',
  staffAuth(),
  wrap(async (req, res) => {
    const scope = agentScopeSql(req.auth);
    const rows = await dbAll(
      `SELECT c.id, c.full_name, c.email, c.phone, c.balance, c.bonus, c.ip_address, c.created_at, c.agent_id,
              c.kyc_status, c.kyc_updated_at, c.kyc_note, c.kyc_reviewed_by, c.kyc_reviewed_at,
              c.kyc_full_name, c.kyc_doc_type, c.kyc_id_number, c.kyc_submitted_at, c.must_change_password,
              COALESCE(a.name, 'Unassigned') AS agent_name,
              (SELECT COUNT(*) FROM password_resets r WHERE r.client_id = c.id AND r.status = 'PENDING') AS reset_requests
       FROM clients c LEFT JOIN crm_agents a ON c.agent_id = a.id ${scope.where} ORDER BY c.id DESC`,
      scope.params,
    );
    const docsByClient = new Map();
    (await dbAll(`SELECT id, client_id, doc_type, file_name, mime_type, stored_name, created_at FROM kyc_documents ORDER BY id`)).forEach((d) => {
      if (!docsByClient.has(d.client_id)) docsByClient.set(d.client_id, []);
      docsByClient.get(d.client_id).push(d);
    });
    const clients = rows.map((c) => {
      const docs = docsByClient.get(c.id) || [];
      const s = summarize(c.id, c.balance, c.bonus);
      return {
        id: c.id,
        full_name: c.full_name,
        email: c.email,
        phone: c.phone,
        ip_address: c.ip_address,
        created_at: c.created_at,
        agent_id: c.agent_id,
        agent_name: c.agent_name,
        balance: s.balance,
        bonus: s.bonus,
        floating_pnl: s.floatingPnl,
        equity: s.equity,
        margin_used: s.marginUsed,
        open_positions: s.openCount,
        must_change_password: !!c.must_change_password,
        reset_requested: c.reset_requests > 0,
        ...kycFields(c, docs.length),
        kyc_documents: docs.map(publicDoc),
      };
    });
    res.json({ success: true, serverTime: Date.now(), clients });
  }),
);

// Every client's balance, floating P&L, equity and open positions in one call
app.get(
  '/api/admin/portfolios',
  staffAuth(),
  wrap(async (req, res) => {
    const scope = agentScopeSql(req.auth);
    const rows = await dbAll(
      `SELECT c.id, c.full_name, c.email, c.balance, c.bonus, c.agent_id, COALESCE(a.name, 'Unassigned') AS agent_name
       FROM clients c LEFT JOIN crm_agents a ON c.agent_id = a.id ${scope.where} ORDER BY c.id DESC`,
      scope.params,
    );
    const accounts = rows.map((r) => ({ ...summarize(r.id, r.balance, r.bonus), name: r.full_name, email: r.email, agentId: r.agent_id, agentName: r.agent_name }));
    const totals = accounts.reduce(
      (t, a) => ({
        balance: round2(t.balance + a.balance),
        bonus: round2(t.bonus + a.bonus),
        floatingPnl: round2(t.floatingPnl + a.floatingPnl),
        equity: round2(t.equity + a.equity),
        marginUsed: round2(t.marginUsed + a.marginUsed),
        openPositions: t.openPositions + a.openCount,
      }),
      { balance: 0, bonus: 0, floatingPnl: 0, equity: 0, marginUsed: 0, openPositions: 0 },
    );
    res.json({ success: true, serverTime: Date.now(), accounts, totals });
  }),
);

app.get(
  '/api/crm/agents',
  staffAuth(),
  wrap(async (req, res) => {
    res.json({ agents: await dbAll(`SELECT id, name, email, role FROM crm_agents ORDER BY id`) });
  }),
);

app.post(
  '/api/admin/assign-agent',
  staffAuth(['ADMIN']),
  wrap(async (req, res) => {
    const { clientId, assignedAgent, agentId } = req.body || {};
    const id = parseClientId(clientId);
    if (!id) throw new HttpError(400, 'Invalid Client ID provided.');
    const client = await dbGet(`SELECT id FROM clients WHERE id = ?`, [id]);
    if (!client) throw new HttpError(404, 'Client not found.');
    if (assignedAgent === 'Unassigned' || assignedAgent === null) {
      await dbRun(`UPDATE clients SET agent_id = NULL WHERE id = ?`, [id]);
      await refreshAccount(id, { notify: false });
      logClientActivity(id, 'AGENT_UNASSIGNED', { by: req.auth.name });
      notifyStaffRefresh('AGENT_CHANGED', id);
      return res.json({ success: true, message: 'Client unassigned successfully.' });
    }
    let agent = null;
    if (agentId) agent = await dbGet(`SELECT id FROM crm_agents WHERE id = ?`, [agentId]);
    else {
      const name = String(assignedAgent || '').trim();
      agent = await dbGet(`SELECT id FROM crm_agents WHERE LOWER(TRIM(name)) = LOWER(?)`, [name]);
      if (!agent && name) {
        const fuzzy = await dbAll(`SELECT id FROM crm_agents WHERE LOWER(name) LIKE LOWER(?)`, [`%${name}%`]);
        if (fuzzy.length === 1) agent = fuzzy[0]; // only when it is unambiguous
      }
    }
    if (!agent) throw new HttpError(404, 'Agent not found in database.');
    await dbRun(`UPDATE clients SET agent_id = ? WHERE id = ?`, [agent.id, id]);
    await refreshAccount(id, { notify: false });
    logClientActivity(id, 'AGENT_ASSIGNED', { agentId: agent.id, assignedAgent, by: req.auth.name });
    notifyStaffRefresh('AGENT_CHANGED', id);
    res.json({ success: true, message: 'Agent assigned successfully.' });
  }),
);

app.post(
  '/api/admin/create-agent',
  staffAuth(['ADMIN']),
  wrap(async (req, res) => {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) throw new HttpError(400, 'Agent name, email, and password are required.');
    const cleanEmail = String(email).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new HttpError(400, 'Please enter a valid agent email.');
    if (cleanEmail === ADMIN_EMAIL) throw new HttpError(400, 'Agent email already exists.');
    let r;
    try {
      r = await dbRun(`INSERT INTO crm_agents (name, email, password, role) VALUES (?, ?, ?, 'AGENT')`, [String(name).trim(), cleanEmail, await hashPassword(String(password).trim())]);
    } catch (e) {
      if (String(e.message).includes('UNIQUE constraint failed')) throw new HttpError(400, 'Agent email already exists.');
      throw new HttpError(500, 'Failed to create agent.');
    }
    const agents = await dbAll(`SELECT id, name, email, role FROM crm_agents ORDER BY id`);
    res.json({ success: true, agent: { id: r.lastID, name: String(name).trim(), email: cleanEmail, role: 'AGENT' }, agents });
  }),
);

// ---- Permanent deletion ----------------------------------------------------------
// Every table that stores something about a client, at any depth. Discovered from the live schema (tables with a
// foreign key into `clients`, tables that reference those, and any table with a plain client_id column), so extra
// tables in an older or customised database are cleaned up too instead of blocking the delete with
// "FOREIGN KEY constraint failed". Returns DELETE statements ordered deepest-first.
const quoteIdent = (name) => `"${String(name).replace(/"/g, '""')}"`;
async function clientDeletionPlan(clientId) {
  const names = (await dbAll(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`)).map((r) => r.name);
  const schema = new Map();
  for (const name of names) {
    const q = quoteIdent(name);
    const fks = await dbAll(`PRAGMA foreign_key_list(${q})`);
    const cols = await dbAll(`PRAGMA table_info(${q})`);
    const pk = cols.find((c) => c.pk === 1);
    schema.set(name.toLowerCase(), { name, fks, hasClientId: cols.some((c) => c.name === 'client_id'), pk: pk ? pk.name : 'rowid' });
  }
  const steps = []; // parents are pushed before their children, so we run it in reverse
  const visit = (parentKey, parentWhere, chain) => {
    for (const [key, t] of schema) {
      if (chain.includes(key) || key === 'clients') continue;
      for (const fk of t.fks.filter((f) => String(f.table).toLowerCase() === parentKey)) {
        const parent = schema.get(parentKey);
        const target = fk.to || parent.pk;
        const where = `${quoteIdent(fk.from)} IN (SELECT ${quoteIdent(target)} FROM ${quoteIdent(parent.name)} WHERE ${parentWhere})`;
        steps.push(`DELETE FROM ${quoteIdent(t.name)} WHERE ${where}`);
        visit(key, where, [...chain, key]);
      }
    }
  };
  visit('clients', 'id = ?', ['clients']);
  // tables that only carry a client_id column (no declared foreign key)
  for (const [key, t] of schema) {
    if (key === 'clients' || !t.hasClientId) continue;
    if (t.fks.some((f) => String(f.table).toLowerCase() === 'clients')) continue;
    steps.push(`DELETE FROM ${quoteIdent(t.name)} WHERE ${quoteIdent('client_id')} = ?`);
  }
  // every statement has exactly one `?` per occurrence of the root condition: count them for the params
  return steps.reverse().map((sql) => ({ sql, params: Array(sql.split('?').length - 1).fill(clientId) }));
}

// Permanently removes a client and everything attached to it. All-or-nothing: if any step fails the database is left
// exactly as it was (no half-deleted client). Everything after the commit is best-effort and can never turn a
// successful delete into an error response.
async function deleteClientCascade(clientId, actor) {
  const client = await dbGet(`SELECT id FROM clients WHERE id = ?`, [clientId]);
  if (!client) return { alreadyDeleted: true }; // deleting twice is not an error: the goal state has been reached
  const files = await dbAll(`SELECT stored_name FROM kyc_documents WHERE client_id = ?`, [clientId]).catch(() => []);
  const plan = await clientDeletionPlan(clientId);

  // Housekeeping deletes (child tables, sessions, audit rows) are best-effort: a missing table/column in an older
  // database must not block the delete. Only the client row itself has to go, or the whole thing is rolled back.
  const tolerant = async (tx, sql, params) => {
    try {
      await tx.run(sql, params);
    } catch (e) {
      if (/FOREIGN KEY|locked|busy|readonly|disk|corrupt/i.test(String(e && e.message))) throw e;
      console.warn(`[delete-client] skipped step (${e.message}): ${sql.slice(0, 120)}`);
    }
  };
  const work = async (tx) => {
    for (const step of plan) await tolerant(tx, step.sql, step.params);
    await tolerant(tx, `DELETE FROM sessions WHERE kind = 'CLIENT' AND subject_id = ?`, [clientId]);
    const del = await tx.run(`DELETE FROM clients WHERE id = ?`, [clientId]);
    if (del.changes !== 1) throw new Error('The client row could not be deleted.');
    await tx.run(`INSERT INTO deleted_accounts_log (kind, subject_id, deleted_by) VALUES ('CLIENT', ?, ?)`, [clientId, actor]).catch(() => {});
  };
  try {
    await withTx(work);
  } catch (e) {
    console.warn('[delete-client] first attempt failed:', e && e.message);
    // A table we could not see (a foreign key that points at one of the client's child tables, a mismatched foreign
    // key definition ...) is in the way. Retry the same all-or-nothing transaction with enforcement off.
    try {
      await withTx(work, { foreignKeys: false });
    } catch (e2) {
      console.error('[delete-client] failed:', e2);
      throw new HttpError(500, `Could not delete the client: ${String((e2 && e2.message) || e2).slice(0, 200)}`);
    }
  }

  // ---- committed: from here on nothing may throw ----
  try {
    openPositions = openPositions.filter((p) => p.clientId !== clientId); // stop marking their positions
    accountCache.delete(clientId);
    await Promise.all(files.map((f) => fs.promises.unlink(path.join(UPLOAD_DIR, path.basename(f.stored_name))).catch(() => {})));
    emitToClient(clientId, { type: 'ACCOUNT_DELETED', clientId });
    closeSockets((c) => c.kind === 'CLIENT' && c.id === clientId, 4001, 'account deleted');
    notifyStaffRefresh('CLIENT_DELETED', clientId);
    emitToAdmins({ type: 'TRANSACTIONS_CHANGED', serverTime: Date.now() }); // their pending requests vanished with them
  } catch (e) {
    console.error('[delete-client] post-delete cleanup:', e);
  }
  return { alreadyDeleted: false };
}
app.delete(
  '/api/admin/clients/:clientId',
  staffAuth(['ADMIN']),
  wrap(async (req, res) => {
    const id = parseClientId(req.params.clientId);
    if (!id) throw new HttpError(400, 'Invalid client ID.');
    const r = await deleteClientCascade(id, req.auth.name);
    res.json({ success: true, alreadyDeleted: r.alreadyDeleted, message: r.alreadyDeleted ? 'This client was already removed.' : 'Client and all related data permanently deleted.' });
  }),
);
app.post(
  '/api/admin/delete-client',
  staffAuth(['ADMIN']),
  wrap(async (req, res) => {
    const id = parseClientId(req.body && req.body.clientId);
    if (!id) throw new HttpError(400, 'Invalid client ID.');
    const r = await deleteClientCascade(id, req.auth.name);
    res.json({ success: true, alreadyDeleted: r.alreadyDeleted, message: r.alreadyDeleted ? 'This client was already removed.' : 'Client and all related data permanently deleted.' });
  }),
);

async function deleteAgentCascade(agentId, actor) {
  const agent = await dbGet(`SELECT id FROM crm_agents WHERE id = ?`, [agentId]);
  if (!agent) throw new HttpError(404, 'Agent not found.');
  const n = (await dbGet(`SELECT COUNT(*) AS n FROM clients WHERE agent_id = ?`, [agentId])).n;
  await dbRun(`UPDATE clients SET agent_id = NULL WHERE agent_id = ?`, [agentId]); // clients are kept, just unassigned
  await dbRun(`DELETE FROM sessions WHERE kind = 'AGENT' AND subject_id = ?`, [agentId]);
  const del = await dbRun(`DELETE FROM crm_agents WHERE id = ?`, [agentId]);
  if (del.changes !== 1) throw new HttpError(500, 'Failed to delete agent.');
  accountCache.forEach((acc) => {
    if (acc.agentId === agentId) acc.agentId = null;
  });
  await dbRun(`INSERT INTO deleted_accounts_log (kind, subject_id, deleted_by) VALUES ('AGENT', ?, ?)`, [agentId, actor]);
  closeSockets((c) => c.kind === 'AGENT' && c.id === agentId, 4001, 'account deleted');
  notifyStaffRefresh('AGENT_DELETED', 0);
  return n;
}
app.delete(
  '/api/admin/agents/:agentId',
  staffAuth(['ADMIN']),
  wrap(async (req, res) => {
    const id = parseInt(req.params.agentId, 10);
    if (!Number.isInteger(id)) throw new HttpError(400, 'Invalid agent ID.');
    const unassigned = await deleteAgentCascade(id, req.auth.name);
    res.json({ success: true, unassignedClients: unassigned, agents: await dbAll(`SELECT id, name, email, role FROM crm_agents ORDER BY id`) });
  }),
);
app.post(
  '/api/admin/delete-agent',
  staffAuth(['ADMIN']),
  wrap(async (req, res) => {
    const id = parseInt(req.body && req.body.agentId, 10);
    if (!Number.isInteger(id)) throw new HttpError(400, 'Invalid agent ID.');
    const unassigned = await deleteAgentCascade(id, req.auth.name);
    res.json({ success: true, unassignedClients: unassigned, agents: await dbAll(`SELECT id, name, email, role FROM crm_agents ORDER BY id`) });
  }),
);

// ---- Password reset (staff side) ----------------------------------------------------
app.post(
  '/api/admin/reset-client-password',
  staffAuth(),
  wrap(async (req, res) => {
    const id = parseClientId(req.body && req.body.clientId);
    if (!id) throw new HttpError(400, 'Invalid client ID.');
    await getClientForStaff(req.auth, id); // agents may only reset their own clients
    const custom = req.body.newPassword ? String(req.body.newPassword).trim() : '';
    if (custom && custom.length < 6) throw new HttpError(400, 'Password must be at least 6 characters.');
    const temp = custom || DEFAULT_RESET_PASSWORD;
    await applyPasswordReset(id, temp, req.auth.name);
    res.json({ success: true, temporaryPassword: temp, message: 'Password reset. The client must choose a new password at next login.' });
  }),
);
app.get(
  '/api/admin/password-resets',
  staffAuth(),
  wrap(async (req, res) => {
    const scope = agentScopeSql(req.auth);
    const rows = await dbAll(
      `SELECT r.id, r.client_id, r.requested_at, c.full_name, c.email FROM password_resets r JOIN clients c ON c.id = r.client_id
       ${scope.where} ${scope.where ? 'AND' : 'WHERE'} r.status = 'PENDING' ORDER BY r.id DESC`,
      scope.params,
    );
    res.json({ success: true, requests: rows });
  }),
);

// ---- Transactions: review queue + approval workflow (admin only) --------------------------------
// One call gives the whole screen: what is waiting, what was decided recently, and the headline numbers.
app.get(
  '/api/admin/transactions',
  staffAuth(['ADMIN']),
  wrap(async (req, res) => {
    const pending = await dbAll(`${TX_WITH_CLIENT} WHERE t.status = 'PENDING' AND t.type IN ('DEPOSIT','WITHDRAWAL') ORDER BY t.id ASC`);
    const history = await dbAll(`${TX_WITH_CLIENT} WHERE t.status <> 'PENDING' AND t.type IN ('DEPOSIT','WITHDRAWAL') ORDER BY COALESCE(t.processed_at, t.created_at) DESC, t.id DESC LIMIT 150`);
    res.json({ success: true, pending: pending.map(publicTx), history: history.map(publicTx), ...(await pendingRequestStats()), serverTime: Date.now() });
  }),
);
// Kept for older CRM builds: same rows, original response shape
app.get(
  '/api/admin/pending-transactions',
  staffAuth(['ADMIN']),
  wrap(async (req, res) => {
    const rows = await dbAll(`${TX_WITH_CLIENT} WHERE t.status = 'PENDING' ORDER BY t.id DESC`);
    res.json({ transactions: rows.map((t) => ({ ...t, ...publicTx(t) })) });
  }),
);

// Decide a request. The decision, the balance change and the review trail are ONE atomic transaction:
//   APPROVED deposit    -> balance + amount
//   APPROVED withdrawal -> balance - amount (refused if the client no longer has that much)
//   REJECTED            -> balance untouched
async function processTransaction(transactionId, decision, note, actor) {
  const { t, newBalance } = await withTx(async (tx) => {
    const row = await tx.get(`SELECT * FROM transactions WHERE id = ?`, [transactionId]);
    if (!row) throw new HttpError(404, 'Transaction not found.');
    if (!REQUEST_TYPES.includes(row.type)) throw new HttpError(400, 'Only deposit and withdrawal requests can be reviewed.');
    if (row.status !== 'PENDING') throw new HttpError(409, `This request was already ${String(row.status).toLowerCase()}.`);
    const client = await tx.get(`SELECT id, balance FROM clients WHERE id = ?`, [row.client_id]);
    if (!client) throw new HttpError(404, 'The client for this request no longer exists.');
    let balance = round2(client.balance || 0);
    if (decision === 'APPROVED') {
      const amount = round2(row.amount);
      if (row.type === 'WITHDRAWAL') {
        if (balance + 1e-9 < amount) {
          throw new HttpError(409, `Cannot approve: the client's balance ($${balance.toFixed(2)}) is lower than the withdrawal ($${amount.toFixed(2)}). Reject the request or adjust the balance first.`);
        }
        balance = round2(balance - amount);
      } else {
        balance = round2(balance + amount);
      }
      await tx.run(`UPDATE clients SET balance = ? WHERE id = ?`, [balance, client.id]);
    }
    const upd = await tx.run(`UPDATE transactions SET status = ?, note = ?, processed_by = ?, processed_at = ? WHERE id = ? AND status = 'PENDING'`, [
      decision,
      cleanText(note, 300) || null,
      actor,
      new Date().toISOString(),
      transactionId,
    ]);
    if (upd.changes !== 1) throw new HttpError(409, 'This request was already processed.'); // lost a race with another admin: roll everything back
    return { t: row, newBalance: balance };
  });

  // Committed. Push the new numbers; a failure here must not report a failed approval for money that has moved.
  let tx = null;
  try {
    if (decision === 'APPROVED') await refreshAccount(t.client_id); // BALANCE_UPDATE to the client and to staff, instantly
    tx = await loadTxWithClient(transactionId);
    const pub = publicTx(tx);
    emitToClient(t.client_id, { type: 'TRANSACTION_UPDATE', clientId: t.client_id, transaction: pub, balance: newBalance, serverTime: Date.now() });
    emitToAdmins({ type: 'TRANSACTION_PROCESSED', transaction: pub, ...(await pendingRequestStats()), serverTime: Date.now() });
    logClientActivity(t.client_id, `${t.type}_${decision}`, { transactionId, amount: t.amount, by: actor });
  } catch (e) {
    console.error('[transactions] post-commit notification failed:', e.message);
  }
  return { transaction: tx ? publicTx(tx) : null, balance: newBalance };
}
const decisionHandler = (forced) =>
  wrap(async (req, res) => {
    const body = req.body || {};
    const id = parseInt(body.transactionId ?? body.id, 10);
    const raw = String(forced || body.status || body.decision || body.action || '').trim().toUpperCase();
    const decision = ['APPROVED', 'APPROVE'].includes(raw) ? 'APPROVED' : ['REJECTED', 'REJECT', 'DECLINED', 'DECLINE'].includes(raw) ? 'REJECTED' : null;
    if (!Number.isInteger(id) || id <= 0 || !decision) throw new HttpError(400, 'Invalid transaction approval parameters.');
    const out = await processTransaction(id, decision, body.note, req.auth.name);
    const verb = decision === 'APPROVED' ? 'approved' : 'rejected';
    res.json({ success: true, message: `Transaction ${verb} successfully.`, status: decision, ...out });
  });
app.post('/api/admin/approve-transaction', staffAuth(['ADMIN']), decisionHandler(null)); // body.status = APPROVED | REJECTED
app.post('/api/admin/reject-transaction', staffAuth(['ADMIN']), decisionHandler('REJECTED'));

// ---- Manual balance / bonus adjustment (admin only) --------------------------------
const handleBalanceAdjustment = wrap(async (req, res) => {
  const body = req.body || {};
  const clientId = parseClientId(body.clientId);
  const amount = parseFloat(body.amount);
  const rawType = String(body.type || body.adjustmentType || '').trim().toUpperCase();
  const KINDS = { ADD: 'CREDIT', CREDIT: 'CREDIT', MINUS: 'DEBIT', DEDUCT: 'DEBIT', DEBIT: 'DEBIT', BONUS: 'BONUS' };
  const kind = KINDS[rawType];
  if (!clientId || !Number.isFinite(amount) || amount <= 0) throw new HttpError(400, 'Invalid client ID or amount.');
  if (!kind) throw new HttpError(400, 'Invalid adjustment type. Use ADD, MINUS or BONUS.');
  const client = await dbGet(`SELECT id, balance, bonus FROM clients WHERE id = ?`, [clientId]);
  if (!client) throw new HttpError(404, 'Client not found.');
  let applied = amount;
  if (kind === 'BONUS') {
    await dbRun(`UPDATE clients SET bonus = ROUND(COALESCE(bonus,0) + ?, 2) WHERE id = ?`, [amount, clientId]);
    await dbRun(`INSERT INTO transactions (client_id, type, amount, status, method) VALUES (?, 'BONUS', ?, 'APPROVED', 'ADMIN_BONUS')`, [clientId, amount]);
    logClientActivity(clientId, 'ADMIN_BONUS_ADDED', { amount, by: req.auth.name });
  } else {
    const current = client.balance || 0;
    applied = kind === 'DEBIT' ? Math.min(amount, current) : amount;
    if (applied <= 0) throw new HttpError(400, 'This client has no balance to deduct.');
    const delta = kind === 'DEBIT' ? -applied : applied;
    await dbRun(`UPDATE clients SET balance = MAX(0, ROUND(COALESCE(balance,0) + ?, 2)) WHERE id = ?`, [delta, clientId]);
    await dbRun(`INSERT INTO transactions (client_id, type, amount, status, method) VALUES (?, ?, ?, 'APPROVED', 'ADMIN_ADJUSTMENT')`, [clientId, kind, applied]);
    logClientActivity(clientId, 'ADMIN_BALANCE_ADJUSTMENT', { amount: delta, type: rawType, by: req.auth.name });
  }
  const row = await refreshAccount(clientId); // pushes BALANCE_UPDATE to the client and to staff instantly
  const s = accountSummary(clientId);
  res.json({
    success: true,
    message: kind === 'BONUS' ? 'Bonus updated successfully.' : 'Client balance updated successfully.',
    applied: round2(applied),
    balance: row.balance,
    bonus: row.bonus,
    equity: s ? s.equity : row.balance,
  });
});
app.post('/api/admin/update-balance', staffAuth(['ADMIN']), handleBalanceAdjustment);
app.post('/api/admin/adjust-balance', staffAuth(['ADMIN']), handleBalanceAdjustment);

// ---- KYC review (admin, or the client's own agent) ------------------------------------
const KYC_WORDS = {
  APPROVED: ['APPROVED', 'APPROVE', 'VERIFIED', 'VERIFY', 'ACCEPTED', 'ACCEPT', 'TRUE'],
  REJECTED: ['REJECTED', 'REJECT', 'DECLINED', 'DECLINE', 'DENIED', 'DENY', 'FALSE'],
  PENDING: ['PENDING', 'RESET', 'UNVERIFIED'],
};
const parseKycDecision = (body) => {
  const raw = body.kycStatus ?? body.kyc_status ?? body.status ?? body.decision ?? body.action ?? body.approved;
  if (raw === true) return 'APPROVED';
  if (raw === false) return 'REJECTED';
  const v = String(raw === undefined || raw === null ? '' : raw).trim().toUpperCase();
  return Object.keys(KYC_WORDS).find((k) => KYC_WORDS[k].includes(v)) || null;
};

const handleKycReview = wrap(async (req, res) => {
  const body = req.body || {};
  const clientId = parseClientId(body.clientId ?? body.client_id ?? body.id ?? body.userId ?? req.params.clientId);
  const status = parseKycDecision(body);
  if (!clientId) throw new HttpError(400, 'Invalid client ID.');
  if (!status) throw new HttpError(400, 'Invalid KYC status. Use APPROVED, REJECTED or PENDING.');
  await getClientForStaff(req.auth, clientId);
  const note = status === 'REJECTED' ? cleanText(body.note ?? body.reason, 1000) : '';
  await dbRun(
    `UPDATE clients SET kyc_status = ?, kyc_note = ?, kyc_reviewed_by = ?, kyc_reviewed_at = CURRENT_TIMESTAMP, kyc_updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [status, note, req.auth.name, clientId],
  );
  logClientActivity(clientId, `KYC_${status}`, { kycStatus: status, note: note || null, by: req.auth.name });
  await notifyKyc(clientId); // the client's dashboard and every open CRM update immediately
  const row = await dbGet(`SELECT * FROM clients WHERE id = ?`, [clientId]);
  const n = (await dbGet(`SELECT COUNT(*) AS n FROM kyc_documents WHERE client_id = ?`, [clientId])).n;
  res.status(200).json({
    success: true,
    confirmed: true,
    clientId,
    kycStatus: status,
    status,
    message: `KYC ${status.toLowerCase()} successfully.`,
    ...kycFields(row, n),
  });
});
[
  '/api/crm/kyc/review',
  '/api/admin/kyc-status',
  '/api/admin/update-kyc',
  '/api/admin/approve-kyc',
  '/api/admin/kyc',
  '/api/crm/kyc-status',
  '/api/crm/kyc',
  '/api/crm/client/:clientId/kyc',
].forEach((route) => {
  app.post(route, staffAuth(), handleKycReview);
  app.put(route, staffAuth(), handleKycReview);
  app.patch(route, staffAuth(), handleKycReview);
});

app.get(
  '/api/crm/client/:clientId/kyc',
  staffAuth(),
  wrap(async (req, res) => {
    const id = parseClientId(req.params.clientId);
    if (!id) throw new HttpError(400, 'Invalid client ID.');
    const row = await getClientForStaff(req.auth, id);
    const docs = await dbAll(`SELECT id, client_id, doc_type, file_name, mime_type, stored_name, created_at FROM kyc_documents WHERE client_id = ? ORDER BY id`, [id]);
    res.json({ success: true, clientId: id, ...kycFields(row, docs.length), kyc_documents: docs.map(publicDoc) });
  }),
);

// Streams an uploaded document. Staff only; the token may ride in ?token= so <img>/<a> tags can load it.
app.get(
  '/api/crm/kyc/documents/:docId/file/:name?',
  staffAuth(['ADMIN', 'AGENT'], { queryToken: true }),
  wrap(async (req, res) => {
    const docId = parseInt(req.params.docId, 10);
    const doc = Number.isInteger(docId) ? await dbGet(`SELECT * FROM kyc_documents WHERE id = ?`, [docId]) : null;
    if (!doc) throw new HttpError(404, 'Document not found.');
    await getClientForStaff(req.auth, doc.client_id);
    res.setHeader('Content-Type', doc.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="doc-${doc.id}${docExt(doc)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(path.join(UPLOAD_DIR, path.basename(doc.stored_name)), (err) => {
      if (err && !res.headersSent) res.status(404).json({ success: false, error: 'Document file is missing on the server.' });
    });
  }),
);

app.get(
  '/api/crm/client/:clientId/activity',
  staffAuth(),
  wrap(async (req, res) => {
    const id = parseClientId(req.params.clientId);
    if (!id) throw new HttpError(400, 'Invalid client ID.');
    await getClientForStaff(req.auth, id);
    const rows = await dbAll(`SELECT * FROM client_logs WHERE client_id = ? ORDER BY id DESC LIMIT 50`, [id]);
    res.json({
      logs: rows.map((r) => {
        let details = {};
        try {
          details = JSON.parse(r.details || '{}');
        } catch (e) {
          /* keep {} */
        }
        return { ...r, details };
      }),
    });
  }),
);

// ============================================================================
// LIVE BROADCAST LOOP
// ============================================================================
function broadcast(payload) {
  const text = JSON.stringify(payload);
  wss.clients.forEach((client) => sendJson(client, text));
}

const feedSummary = () => ({
  ...feedStatus,
  notes: { ...feedNotes },
  keys: { oanda: HAS_OANDA, alpaca: HAS_ALPACA, twelvedata: !!TWELVE_KEY },
  quotes: quotes.size,
  instruments: Object.keys(INSTRUMENTS).length,
});

// Accounts that currently hold positions (these are the only ones whose equity moves with the market)
function accountsWithPositions() {
  const ids = [...new Set(openPositions.map((p) => p.clientId))];
  return ids
    .map((id) => {
      const acc = accountCache.get(id);
      return acc ? { ...summarize(id, acc.balance, acc.bonus), agentId: acc.agentId } : null;
    })
    .filter(Boolean);
}
function portfolioPayloadFor(ctx, accounts) {
  const list = ctx.kind === 'ADMIN' ? accounts : accounts.filter((a) => a.agentId === ctx.id);
  return { type: 'PORTFOLIO_TICK', accounts: list, serverTime: Date.now() };
}

let lastTickSent = 0;
setInterval(() => {
  refreshStaleness();
  const now = Date.now();
  const hasPositions = openPositions.length > 0;
  if (dirtySymbols.size === 0 && now - lastTickSent < 2000) return; // idle: only a 2s keep-alive
  const prices = {};
  dirtySymbols.forEach((symbol) => {
    const q = quotes.get(symbol);
    if (q) prices[symbol] = serializeQuote(symbol, q);
  });
  dirtySymbols.clear();
  lastTickSent = now;
  // Quotes are public. No account data is ever included here.
  broadcast({ type: 'MARKET_TICK', data: { prices, full: false, feeds: feedSummary(), serverTime: now } });
  if (hasPositions) {
    const accounts = accountsWithPositions();
    wss.clients.forEach((ws) => {
      if (ws.ctx && ws.ctx.kind !== 'CLIENT') sendJson(ws, portfolioPayloadFor(ws.ctx, accounts));
    });
  }
}, QUOTE_CONFIG.broadcastMs);

// Public HTTP snapshot (used by the dashboard as a fallback when the socket is down)
app.get('/api/quotes', (req, res) => {
  refreshStaleness();
  res.json({ success: true, serverTime: Date.now(), feeds: feedSummary(), quotes: snapshotQuotes() });
});

// ---- WebSocket ---------------------------------------------------------------------
async function handleWsAuth(ws, msg) {
  let ctx = null;
  if (msg.token) {
    const s = await lookupSession(String(msg.token));
    if (s) ctx = { kind: s.kind, id: s.id };
  } else if (!REQUIRE_CLIENT_TOKEN) {
    const id = parseClientId(msg.clientId); // legacy: id only (clients only, never staff)
    if (id && accountCache.has(id)) ctx = { kind: 'CLIENT', id };
  }
  if (!ctx) return sendJson(ws, { type: 'AUTH_ERROR', error: 'Authentication failed.' });
  ws.ctx = ctx;
  sendJson(ws, { type: 'AUTH_OK', kind: ctx.kind, id: ctx.id });
  if (ctx.kind === 'CLIENT') {
    const b = balancePayload(ctx.id);
    if (b) sendJson(ws, b);
    sendJson(ws, positionsPayload(ctx.id));
  } else {
    sendJson(ws, portfolioPayloadFor(ctx, accountsWithPositions()));
  }
}

wss.on('connection', (ws) => {
  ws.ctx = null;
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  // A new client gets the complete quote book immediately, then incremental ticks.
  refreshStaleness();
  sendJson(ws, { type: 'MARKET_TICK', data: { prices: snapshotQuotes(), full: true, feeds: feedSummary(), serverTime: Date.now() } });

  ws.on('message', async (message) => {
    let msg;
    try {
      msg = JSON.parse(message);
    } catch (e) {
      return;
    }
    try {
      const action = msg && msg.action;
      if (action === 'AUTH') return await handleWsAuth(ws, msg);
      if (action === 'PLACE_ORDER' || action === 'CLOSE_POSITION') {
        // Legacy socket orders: only for an authenticated CLIENT socket, always for that client's own account.
        if (!ws.ctx || ws.ctx.kind !== 'CLIENT') return sendJson(ws, { type: 'ORDER_REJECTED', reason: 'Not authenticated.' });
        const data = msg.data || {};
        try {
          if (action === 'PLACE_ORDER') await openPosition(ws.ctx.id, data);
          else await closePosition(ws.ctx.id, parseInt(data.id ?? data.positionId, 10));
        } catch (e) {
          sendJson(ws, { type: 'ORDER_REJECTED', symbol: data.symbol, reason: e.message });
        }
      }
    } catch (err) {
      console.error('WebSocket Error:', err);
    }
  });
});
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    try {
      ws.ping();
    } catch (e) {
      /* noop */
    }
  });
}, 30000).unref();

// ============================================================================
// FALLBACKS, ERRORS, LISTEN
// ============================================================================
app.use('/api', (req, res) => res.status(404).json({ success: false, error: 'Unknown API endpoint.' }));
app.get('*', (req, res) => {
  const indexFile = path.resolve(__dirname, '../frontend/dist/index.html');
  res.sendFile(indexFile, (err) => {
    if (!err || res.headersSent) return;
    // The website files are missing (frontend not built / built into another folder / build still running)
    console.error(`[spa] cannot serve ${indexFile}: ${err.code || err.message}. Build the frontend (npm run build) so that ../frontend/dist/index.html exists next to this server's folder.`);
    res.status(503).type('text/plain').send('The website files are not available right now. The server cannot find the frontend build (frontend/dist/index.html).');
  });
});
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof HttpError) return res.status(err.status).json({ success: false, error: err.message });
  if (err && err.type === 'entity.too.large') return res.status(413).json({ success: false, error: 'Upload too large.' });
  if (err && err.type === 'entity.parse.failed') return res.status(400).json({ success: false, error: 'Malformed request body.' });
  console.error(`[api] unhandled error on ${req.method} ${req.originalUrl.split('?')[0]}:`, err);
  const staffRoute = /^\/api\/(admin|crm)\//.test(req.path || req.originalUrl);
  res.status(500).json({ success: false, error: 'Internal server error.', ...(staffRoute ? { detail: String((err && err.message) || err).slice(0, 300) } : {}) });
});
process.on('unhandledRejection', (e) => console.error('[process] unhandled rejection:', e));
// One bad message / row must not take the whole trading server (and every client's feed) down with it.
process.on('uncaughtException', (e) => console.error('[process] uncaught exception (server kept running):', e));

const HTTPS_PORT = process.env.HTTPS_PORT || 443;
server.listen(HTTPS_PORT, '0.0.0.0', () => {
  console.log(`HTTPS Server listening on port ${HTTPS_PORT}`);
});
http
  .createServer((req, res) => {
    res.writeHead(301, { Location: 'https://' + req.headers['host'] + req.url });
    res.end();
  })
  .listen(80, '0.0.0.0');
