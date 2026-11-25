const express = require('express');
const https = require('https');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();
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
const wss = new WebSocket.Server({ server });
// --- CORS & MIDDLEWARE CONFIGURATION ---
app.use(
  cors({
    origin: true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }),
);
app.options('*', cors());
app.use(express.json());
app.set('trust proxy', true);
// --- SERVE FRONTEND STATIC FILES ---
const staticPath = path.resolve(__dirname, '../frontend/dist');
app.use(express.static(staticPath));
// --- DATABASE SETUP ---
const dbPath = path.resolve(__dirname, 'meridian.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initDatabase();
  }
});
function initDatabase() {
  db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON;');

    // 1. CRM Agents Table
    db.run(`
      CREATE TABLE IF NOT EXISTS crm_agents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'AGENT',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // 2. Clients Table
    db.run(`
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
      )
    `);
    db.run(`ALTER TABLE clients ADD COLUMN agent_id INTEGER`, () => {});
    db.run(`ALTER TABLE clients ADD COLUMN ip_address TEXT`, () => {});
    db.run(`ALTER TABLE clients ADD COLUMN balance REAL DEFAULT 0.00`, () => {});
    db.run(`ALTER TABLE clients ADD COLUMN bonus REAL DEFAULT 0.00`, () => {});
    db.run(`ALTER TABLE clients ADD COLUMN kyc_status TEXT DEFAULT 'PENDING'`, () => {});
    db.run(`ALTER TABLE clients ADD COLUMN kyc_updated_at DATETIME`, () => {});
    // 3. Transactions Table
    db.run(`
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
      )
    `);
    // 4. Audit Logs Table
    db.run(`
      CREATE TABLE IF NOT EXISTS client_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        action_type TEXT NOT NULL,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      )
    `);
    // Ensure Daniel Mz exists in backend SQLite table
    db.get(`SELECT id FROM crm_agents WHERE LOWER(name) LIKE '%daniel%'`, [], (err, row) => {
      if (!row) {
        db.run(
          `INSERT INTO crm_agents (name, email, password, role) VALUES ('Daniel Mz', 'daniel@meridianmarket.net', 'agent123', 'AGENT')`,
        );
      }
    });
  });
}
function logClientActivity(clientId, actionType, details = {}) {
  if (!clientId) return;
  const numericId = parseInt(String(clientId).replace('CL-', ''), 10);
  if (isNaN(numericId)) return;
  db.run(
    `INSERT INTO client_logs (client_id, action_type, details) VALUES (?, ?, ?)`,
    [numericId, actionType, JSON.stringify(details)],
    (err) => {
      if (err) console.error('Activity Log Error:', err.message);
    },
  );
}
function broadcastBalanceUpdate(clientId) {
  const numericId = parseInt(String(clientId).replace('CL-', ''), 10);
  if (isNaN(numericId)) return;
  db.get(`SELECT balance, bonus FROM clients WHERE id = ?`, [numericId], (err, row) => {
    if (!err && row) {
      const payload = JSON.stringify({
        type: 'BALANCE_UPDATE',
        clientId: numericId,
        balance: row.balance,
        bonus: row.bonus,
      });
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    }
  });
}
// --- AUTHENTICATION & CLIENT ENDPOINTS ---
app.post('/api/register', (req, res) => {
  const { fullName, email, phone, password } = req.body;
  if (!fullName || !email || !phone || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  const normalizedEmail = email.toLowerCase().trim();
  const cleanPassword = password.trim();
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1';

  db.get(`SELECT id FROM crm_agents WHERE LOWER(name) LIKE '%daniel%' LIMIT 1`, [], (err, specificAgent) => {
    const getAgentId = specificAgent
      ? Promise.resolve(specificAgent.id)
      : new Promise((resolve) => {
          db.get(`SELECT id FROM crm_agents ORDER BY id ASC LIMIT 1`, [], (_, fallback) => resolve(fallback ? fallback.id : null));
        });
    getAgentId.then((defaultAgentId) => {
      const initialBalance = 0.0;
      db.run(
        `INSERT INTO clients (full_name, email, phone, password, balance, ip_address, agent_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [fullName, normalizedEmail, phone, cleanPassword, initialBalance, clientIp, defaultAgentId],
        function (dbErr) {
          if (dbErr) {
            if (dbErr.message.includes('UNIQUE constraint failed')) {
              return res.status(400).json({ error: 'Email address is already registered.' });
            }
            return res.status(500).json({ error: `Registration Failed: ${dbErr.message}` });
          }
          const newClientId = this.lastID;
          logClientActivity(newClientId, 'ACCOUNT_CREATED', { fullName, email: normalizedEmail, phone, ip_address: clientIp });
          return res.json({
            success: true,
            client: {
              id: newClientId,
              full_name: fullName,
              email: normalizedEmail,
              phone,
              balance: initialBalance,
              agent_id: defaultAgentId,
            },
          });
        },
      );
    });
  });
});
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
  const cleanEmail = email.toLowerCase().trim();
  const cleanPassword = password.trim();
  db.get(
    `SELECT id, full_name, email, phone, balance, bonus, agent_id, kyc_status FROM clients WHERE LOWER(email) = ? AND password = ?`,
    [cleanEmail, cleanPassword],
    (err, client) => {
      if (err || !client) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      logClientActivity(client.id, 'CLIENT_LOGIN', { timestamp: new Date() });
      return res.json({ success: true, client });
    },
  );
});
app.get('/api/client/profile/:clientId', (req, res) => {
  const rawId = req.params.clientId;
  const clientId = parseInt(String(rawId).replace('CL-', ''), 10);
  if (isNaN(clientId)) return res.status(400).json({ error: 'Invalid client ID.' });
  db.get(
    `SELECT id, full_name, email, phone, balance, bonus, agent_id, kyc_status FROM clients WHERE id = ?`,
    [clientId],
    (err, client) => {
      if (err || !client) return res.status(404).json({ error: 'Client not found.' });
      return res.json({ success: true, client });
    },
  );
});
// --- ADMIN & CRM ENDPOINTS ---
app.get('/api/admin/clients-detailed', (req, res) => {
  const query = `
    SELECT c.id, c.full_name, c.email, c.phone, c.password, c.balance, c.bonus, c.ip_address, c.created_at, c.agent_id, c.kyc_status,
           COALESCE(a.name, 'Unassigned') as agent_name
    FROM clients c
    LEFT JOIN crm_agents a ON c.agent_id = a.id
    ORDER BY c.id DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to query clients.' });
    return res.json({ clients: rows || [] });
  });
});
// FLEXIBLE AGENT ASSIGNMENT ENDPOINT
app.post('/api/admin/assign-agent', (req, res) => {
  const { clientId, assignedAgent, agentId } = req.body;
  const rawId = parseInt(String(clientId).replace('CL-', ''), 10);
  if (isNaN(rawId)) {
    return res.status(400).json({ error: 'Invalid Client ID provided.' });
  }
  if (assignedAgent === 'Unassigned') {
    db.run(`UPDATE clients SET agent_id = NULL WHERE id = ?`, [rawId], function (err) {
      if (err) return res.status(500).json({ error: 'Failed to unassign agent.' });
      logClientActivity(rawId, 'AGENT_UNASSIGNED', {});
      return res.json({ success: true, message: 'Client unassigned successfully.' });
    });
    return;
  }
  // Find target agent by ID or flexible Name search
  const searchQuery = agentId
    ? `SELECT id FROM crm_agents WHERE id = ?`
    : `SELECT id FROM crm_agents WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) OR LOWER(name) LIKE LOWER(?)`;

  const searchParams = agentId ? [agentId] : [assignedAgent, `%${assignedAgent}%`];
  db.get(searchQuery, searchParams, (err, agentRow) => {
    if (err || !agentRow) {
      console.warn(`Could not match agent '${assignedAgent}' in DB. Setting unassigned.`);
      return res.status(404).json({ error: 'Agent not found in database.' });
    }
    db.run(`UPDATE clients SET agent_id = ? WHERE id = ?`, [agentRow.id, rawId], function (updateErr) {
      if (updateErr) return res.status(500).json({ error: 'Failed to update client agent.' });
      logClientActivity(rawId, 'AGENT_ASSIGNED', { agentId: agentRow.id, assignedAgent });
      return res.json({ success: true, message: 'Agent assigned successfully.' });
    });
  });
});
app.post('/api/admin/create-agent', (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Agent name, email, and password are required.' });
  }
  const cleanEmail = email.toLowerCase().trim();
  const cleanPassword = password.trim();
  db.run(
    `INSERT INTO crm_agents (name, email, password, role) VALUES (?, ?, ?, ?)`,
    [name.trim(), cleanEmail, cleanPassword, role || 'AGENT'],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Agent email already exists.' });
        }
        return res.status(500).json({ error: 'Failed to create agent.' });
      }
      db.all(`SELECT id, name, email, role FROM crm_agents`, [], (_, agentsList) => {
        return res.json({
          success: true,
          agent: { id: this.lastID, name: name.trim(), email: cleanEmail, role: role || 'AGENT' },
          agents: agentsList,
        });
      });
    },
  );
});
const handleAgentLogin = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const cleanEmail = email.toLowerCase().trim();
  const cleanPassword = password.trim();
  db.get(
    `SELECT id, name, email, role FROM crm_agents WHERE LOWER(email) = ? AND password = ?`,
    [cleanEmail, cleanPassword],
    (err, agent) => {
      if (err) return res.status(500).json({ error: 'Database error occurred during login.' });
      if (!agent) return res.status(401).json({ error: 'Invalid agent credentials.' });
      return res.json({ success: true, agent });
    },
  );
};
app.post('/api/admin/agent-login', handleAgentLogin);
app.post('/api/crm/agent/login', handleAgentLogin);
app.get('/api/crm/agents', (req, res) => {
  db.all(`SELECT id, name, email, role FROM crm_agents`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch agents.' });
    return res.json({ agents: rows || [] });
  });
});
app.get('/api/admin/pending-transactions', (req, res) => {
  const query = `
    SELECT t.id, t.client_id, t.type, t.amount, t.method, t.tx_hash, t.status, t.created_at, c.full_name, c.email
    FROM transactions t JOIN clients c ON t.client_id = c.id WHERE t.status = 'PENDING' ORDER BY t.id DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch pending transactions.' });
    return res.json({ transactions: rows || [] });
  });
});
app.post('/api/admin/approve-transaction', (req, res) => {
  const { transactionId, status } = req.body;
  if (!transactionId || !['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid transaction approval parameters.' });
  }
  db.get(`SELECT * FROM transactions WHERE id = ?`, [transactionId], (err, tx) => {
    if (err || !tx) return res.status(404).json({ error: 'Transaction not found.' });
    if (tx.status !== 'PENDING') return res.status(400).json({ error: 'Transaction already processed.' });
    db.run(`UPDATE transactions SET status = ? WHERE id = ?`, [status, transactionId], function (updateErr) {
      if (updateErr) return res.status(500).json({ error: 'Failed to update transaction status.' });
      if (status === 'APPROVED') {
        const delta = tx.type === 'WITHDRAWAL' ? -Math.abs(tx.amount) : Math.abs(tx.amount);
        db.run(`UPDATE clients SET balance = MAX(0, balance + ?) WHERE id = ?`, [delta, tx.client_id], (balErr) => {
          if (!balErr) broadcastBalanceUpdate(tx.client_id);
        });
      }
      logClientActivity(tx.client_id, `TRANSACTION_${status}`, { transactionId, amount: tx.amount, type: tx.type });
      return res.json({ success: true, message: `Transaction ${status.toLowerCase()} successfully.` });
    });
  });
});
const handleBalanceAdjustment = (req, res) => {
  const rawClientId = req.body.clientId;
  const clientId = parseInt(String(rawClientId).replace('CL-', ''), 10);
  const amount = parseFloat(req.body.amount);
  const rawType = (req.body.type || req.body.adjustmentType || 'ADD').toUpperCase();
  if (isNaN(clientId) || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid client ID or amount.' });
  }
  if (rawType === 'BONUS') {
    db.run(`UPDATE clients SET bonus = MAX(0, bonus + ?) WHERE id = ?`, [amount, clientId], function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update bonus balance.' });
      db.run(`INSERT INTO transactions (client_id, type, amount, status, method) VALUES (?, 'BONUS', ?, 'APPROVED', 'ADMIN_BONUS')`, [
        clientId,
        amount,
      ]);
      logClientActivity(clientId, 'ADMIN_BONUS_ADDED', { amount, type: 'BONUS' });
      broadcastBalanceUpdate(clientId);
      return res.json({ success: true, message: 'Bonus updated successfully.' });
    });
  } else {
    const isDeduction = rawType === 'DEDUCT' || rawType === 'MINUS';
    const adjustment = isDeduction ? -Math.abs(amount) : Math.abs(amount);
    db.run(`UPDATE clients SET balance = MAX(0, balance + ?) WHERE id = ?`, [adjustment, clientId], function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update balance.' });
      db.run(`INSERT INTO transactions (client_id, type, amount, status, method) VALUES (?, ?, ?, 'APPROVED', 'ADMIN_ADJUSTMENT')`, [
        clientId,
        isDeduction ? 'DEBIT' : 'CREDIT',
        Math.abs(amount),
      ]);
      logClientActivity(clientId, 'ADMIN_BALANCE_ADJUSTMENT', { amount: adjustment, type: rawType });
      broadcastBalanceUpdate(clientId);
      return res.json({ success: true, message: 'Client balance updated successfully.' });
    });
  }
};
app.post('/api/admin/update-balance', handleBalanceAdjustment);
app.post('/api/admin/adjust-balance', handleBalanceAdjustment);
app.post('/api/cashier/deposit', (req, res) => {
  const { amount, method, txHash, clientId, type } = req.body;
  const rawId = parseInt(String(clientId).replace('CL-', ''), 10);
  const transactionType = (type || 'DEPOSIT').toUpperCase();
  if (isNaN(rawId) || !amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid transaction parameters.' });
  }
  db.run(
    `INSERT INTO transactions (client_id, type, amount, status, method, tx_hash) VALUES (?, ?, ?, 'PENDING', ?, ?)`,
    [rawId, transactionType, parseFloat(amount), method || 'Crypto', txHash || 'N/A'],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to record transaction.' });
      logClientActivity(rawId, `${transactionType}_REQUESTED`, { amount, method, txHash });
      return res.json({ success: true, message: 'Request submitted for CRM approval.', transactionId: this.lastID });
    },
  );
});
// --- KYC APPROVAL ENDPOINT ---
const normalizeKycStatus = (body) => {
  const raw = body.kycStatus ?? body.kyc_status ?? body.status ?? body.decision ?? body.action ?? body.approved;
  if (raw === true) return 'APPROVED';
  if (raw === false) return 'REJECTED';
  const v = String(raw === undefined || raw === null ? '' : raw)
    .trim()
    .toUpperCase();
  if (['APPROVED', 'APPROVE', 'VERIFIED', 'VERIFY', 'ACCEPTED', 'ACCEPT', 'TRUE'].includes(v)) return 'APPROVED';
  if (['REJECTED', 'REJECT', 'DECLINED', 'DECLINE', 'DENIED', 'DENY', 'FALSE'].includes(v)) return 'REJECTED';
  if (['PENDING', 'RESET', 'UNVERIFIED'].includes(v)) return 'PENDING';
  return null;
};

const handleKycUpdate = (req, res) => {
  const body = req.body || {};
  const rawClientId = body.clientId ?? body.client_id ?? body.id ?? body.userId ?? req.params.clientId;
  const clientId = parseInt(String(rawClientId).replace('CL-', ''), 10);
  const kycStatus = normalizeKycStatus(body);

  if (isNaN(clientId)) return res.status(400).json({ success: false, error: 'Invalid client ID.' });
  if (!kycStatus) return res.status(400).json({ success: false, error: 'Invalid KYC status. Use APPROVED, REJECTED or PENDING.' });

  db.run(`UPDATE clients SET kyc_status = ?, kyc_updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [kycStatus, clientId], function (err) {
    if (err) {
      console.error('KYC Update Error:', err.message);
      return res.status(500).json({ success: false, error: 'Failed to update KYC status.' });
    }
    if (this.changes === 0) return res.status(404).json({ success: false, error: 'Client not found.' });

    logClientActivity(clientId, `KYC_${kycStatus}`, { kycStatus, note: body.note || body.reason || null });

    return res.status(200).json({
      success: true,
      confirmed: true,
      clientId,
      kyc_status: kycStatus,
      kycStatus,
      status: kycStatus,
      message: `KYC ${kycStatus.toLowerCase()} successfully.`,
    });
  });
};

[
  '/api/admin/kyc-status',
  '/api/admin/update-kyc',
  '/api/admin/approve-kyc',
  '/api/admin/kyc',
  '/api/crm/kyc-status',
  '/api/crm/kyc',
  '/api/crm/client/:clientId/kyc',
  '/api/client/kyc',
].forEach((route) => {
  app.post(route, handleKycUpdate);
  app.put(route, handleKycUpdate);
  app.patch(route, handleKycUpdate);
});

app.get('/api/crm/client/:clientId/kyc', (req, res) => {
  const clientId = parseInt(String(req.params.clientId).replace('CL-', ''), 10);
  if (isNaN(clientId)) return res.status(400).json({ error: 'Invalid client ID.' });
  db.get(`SELECT id, kyc_status, kyc_updated_at FROM clients WHERE id = ?`, [clientId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Client not found.' });
    return res.json({ success: true, clientId: row.id, kyc_status: row.kyc_status || 'PENDING', kyc_updated_at: row.kyc_updated_at });
  });
});

app.get('/api/crm/client/:clientId/activity', (req, res) => {
  const rawId = req.params.clientId;
  const clientId = parseInt(String(rawId).replace('CL-', ''), 10);
  if (isNaN(clientId)) return res.status(400).json({ error: 'Invalid client ID.' });
  db.all(`SELECT * FROM client_logs WHERE client_id = ? ORDER BY id DESC LIMIT 50`, [clientId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch activity logs.' });
    const formatted = (rows || []).map((r) => ({ ...r, details: JSON.parse(r.details || '{}') }));
    return res.json({ logs: formatted });
  });
});
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
//   OANDA_STALE_MS / BINANCE_STALE_MS / ALPACA_STALE_MS   staleness limits
// ============================================================================
const QUOTE_CONFIG = {
  broadcastMs: Math.max(100, parseInt(process.env.QUOTE_BROADCAST_MS, 10) || 500),
  stockPollMs: Math.max(1000, parseInt(process.env.STOCK_POLL_MS, 10) || 2000),
  staleMs: {
    oanda: parseInt(process.env.OANDA_STALE_MS, 10) || 60000,
    binance: parseInt(process.env.BINANCE_STALE_MS, 10) || 30000,
    alpaca: parseInt(process.env.ALPACA_STALE_MS, 10) || 300000,
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

const symbolsBySource = { oanda: {}, binance: {}, alpaca: {} };
Object.entries(INSTRUMENTS).forEach(([symbol, cfg]) => {
  if (cfg.provider) symbolsBySource[cfg.provider][cfg.providerSymbol] = symbol;
});

const feedStatus = { oanda: 'disabled', binance: 'disabled', alpaca: 'disabled' };

// ---- Quote store ------------------------------------------------------------
const quotes = new Map(); // symbol -> { bid, ask, ts, tradeable, stale, open, dayKey }
const dirtySymbols = new Set();

function applyQuote(symbol, bid, ask, { ts = Date.now(), tradeable = true } = {}) {
  if (!INSTRUMENTS[symbol]) return;
  if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid <= 0 || ask <= 0 || ask < bid) return; // drop bad / crossed quotes
  const mid = (bid + ask) / 2;
  const dayKey = new Date().toISOString().slice(0, 10);
  const prev = quotes.get(symbol);
  const open = prev && prev.dayKey === dayKey ? prev.open : mid; // reference price for the day's % change (00:00 UTC, or first quote seen)
  if (prev && prev.bid === bid && prev.ask === ask && prev.tradeable === tradeable && prev.ts === ts) return;
  const stale = Date.now() - ts > staleLimitFor(symbol); // a replayed old quote must never look fresh
  quotes.set(symbol, { bid, ask, ts, tradeable, stale, open, dayKey });
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
      const delay = Math.min(1000 * 2 ** attempt, 30000);
      attempt += 1;
      console.warn(`[feed:binance] ${reason}; reconnecting in ${delay / 1000}s`);
      setTimeout(connect, delay);
    };

    ws.on('open', () => {
      feedStatus.binance = 'connected';
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
    } catch (e) {
      failures += 1;
      feedStatus.alpaca = 'error';
      if (failures === 1 || failures % 30 === 0) console.warn(`[feed:alpaca] poll failed: ${e.message}`);
    }
  };
  poll();
  setInterval(poll, QUOTE_CONFIG.stockPollMs);
}

startOandaFeed();
startBinanceFeed();
startAlpacaFeed();

// ---- Trading engine (marks positions to the live bid/ask) -------------------
let activePositions = [];
let nextPositionId = 1;

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
  const delta = pos.side === 'BUY' ? q.bid - pos.openPrice : pos.openPrice - q.ask;
  pos.pnl = parseFloat((delta * pos.volume * contractMultiplier(pos.symbol) * conv).toFixed(2));
}

const feedSummary = () => ({ ...feedStatus, quotes: quotes.size, instruments: Object.keys(INSTRUMENTS).length });

function broadcast(payload) {
  const text = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(text);
  });
}

let lastTickSent = 0;
setInterval(() => {
  refreshStaleness();
  const now = Date.now();
  if (dirtySymbols.size === 0 && now - lastTickSent < 2000) return; // idle: only a 2s keep-alive
  const prices = {};
  dirtySymbols.forEach((symbol) => {
    const q = quotes.get(symbol);
    if (q) prices[symbol] = serializeQuote(symbol, q);
  });
  dirtySymbols.clear();
  activePositions.forEach(markToMarket);
  lastTickSent = now;
  broadcast({
    type: 'MARKET_TICK',
    data: { prices, full: false, positions: activePositions, feeds: feedSummary(), serverTime: now },
  });
}, QUOTE_CONFIG.broadcastMs);

// Public HTTP snapshot (used by the dashboard as a fallback when the socket is down)
app.get('/api/quotes', (req, res) => {
  refreshStaleness();
  res.json({ success: true, serverTime: Date.now(), feeds: feedSummary(), quotes: snapshotQuotes() });
});

wss.on('connection', (ws) => {
  // A new client gets the complete book immediately, then incremental ticks.
  refreshStaleness();
  ws.send(
    JSON.stringify({
      type: 'MARKET_TICK',
      data: { prices: snapshotQuotes(), full: true, positions: activePositions, feeds: feedSummary(), serverTime: Date.now() },
    }),
  );

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);
      const { action, data } = parsed;
      if (action === 'PLACE_ORDER') {
        const { symbol, side, volume, leverage, clientId } = data;
        const q = getLiveQuote(symbol);
        if (!q) {
          ws.send(JSON.stringify({ type: 'ORDER_REJECTED', symbol, reason: 'No live quote available (market closed or feed down).' }));
          return;
        }
        const openPrice = side === 'BUY' ? q.ask : q.bid;
        const conv = quoteToUsd(symbol) || 1;
        const requiredMargin = (openPrice * volume * contractMultiplier(symbol) * conv) / (leverage || 100);
        const newPos = {
          id: nextPositionId++,
          clientId,
          symbol,
          side,
          volume,
          leverage,
          openPrice,
          margin: requiredMargin,
          pnl: 0,
        };
        markToMarket(newPos);
        activePositions.push(newPos);
        logClientActivity(clientId, 'PLACE_ORDER', { positionId: newPos.id, symbol, side, volume, openPrice });
      }
      if (action === 'CLOSE_POSITION') {
        const { id, clientId } = data;
        const posIndex = activePositions.findIndex((p) => p.id === id);
        if (posIndex !== -1) {
          const closedPos = activePositions[posIndex];
          if (!getLiveQuote(closedPos.symbol)) {
            ws.send(
              JSON.stringify({
                type: 'ORDER_REJECTED',
                symbol: closedPos.symbol,
                reason: 'Cannot close on a stale quote (market closed or feed down).',
              }),
            );
            return;
          }
          markToMarket(closedPos);
          const rawId = parseInt(String(clientId).replace('CL-', ''), 10);
          db.run(`UPDATE clients SET balance = MAX(0, balance + ?) WHERE id = ?`, [closedPos.pnl, rawId], (err) => {
            if (!err) broadcastBalanceUpdate(rawId);
          });

          activePositions.splice(posIndex, 1);
          logClientActivity(rawId, 'CLOSE_POSITION', { positionId: id, realizedPnL: closedPos.pnl });
        }
      }
    } catch (err) {
      console.error('WebSocket Error:', err);
    }
  });
});
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/dist/index.html'));
});
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
