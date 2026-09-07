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
    cert: fs.readFileSync('/etc/letsencrypt/live/meridianmarket.net/fullchain.pem')
  };
} catch (err) {
  console.error('Failed to load SSL certificates:', err.message);
}

const server = https.createServer(sslOptions, app);
const wss = new WebSocket.Server({ server });

app.use(cors());
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
        role TEXT DEFAULT 'AGENT'
      )
    `);

    // 2. Clients Table (Includes dedicated balance column)
    db.run(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT NOT NULL,
        password TEXT NOT NULL,
        balance REAL DEFAULT 0.00,
        ip_address TEXT,
        agent_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES crm_agents(id) ON DELETE SET NULL
      )
    `);

    // Ensure backwards compatibility columns exist
    db.run(`ALTER TABLE clients ADD COLUMN agent_id INTEGER`, () => {});
    db.run(`ALTER TABLE clients ADD COLUMN ip_address TEXT`, () => {});
    db.run(`ALTER TABLE clients ADD COLUMN balance REAL DEFAULT 0.00`, () => {});

    // 3. Transactions Table (For Deposits, Withdrawals, Admin Credit Adjustments)
    db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        type TEXT NOT NULL, -- 'DEPOSIT', 'WITHDRAWAL', 'CREDIT', 'DEBIT'
        amount REAL NOT NULL,
        status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
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

    // Seed Default Agents
    db.get(`SELECT COUNT(*) as count FROM crm_agents`, [], (err, row) => {
      if (row && row.count === 0) {
        db.run(`INSERT INTO crm_agents (name, email, password, role) VALUES ('Agent Smith', 'smith@meridian.com', 'agent123', 'Senior Retention')`);
        db.run(`INSERT INTO crm_agents (name, email, password, role) VALUES ('Agent Sarah', 'sarah@meridian.com', 'agent123', 'Account Executive')`);
      }
    });
  });
}

function logClientActivity(clientId, actionType, details = {}) {
  if (!clientId) return;
  db.run(
    `INSERT INTO client_logs (client_id, action_type, details) VALUES (?, ?, ?)`,
    [clientId, actionType, JSON.stringify(details)],
    (err) => { if (err) console.error('Activity Log Error:', err.message); }
  );
}

// --- AUTHENTICATION ENDPOINTS ---

app.post('/api/register', (req, res) => {
  const { fullName, email, phone, password } = req.body;
  if (!fullName || !email || !phone || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const normalizedEmail = email.toLowerCase();
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1';

  db.get(`SELECT id FROM crm_agents ORDER BY id ASC LIMIT 1`, [], (err, agentRow) => {
    const defaultAgentId = agentRow ? agentRow.id : null;
    const initialBalance = 0.00; // Default starting balance

    db.run(
      `INSERT INTO clients (full_name, email, phone, password, balance, ip_address, agent_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [fullName, normalizedEmail, phone, password, initialBalance, clientIp, defaultAgentId],
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
            agent_id: defaultAgentId
          }
        });
      }
    );
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.get(
    `SELECT id, full_name, email, phone, balance, agent_id FROM clients WHERE email = ? AND password = ?`,
    [email.toLowerCase(), password],
    (err, client) => {
      if (err || !client) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      logClientActivity(client.id, 'CLIENT_LOGIN', { timestamp: new Date() });
      return res.json({ success: true, client });
    }
  );
});

// --- ADMIN & TRANSACTION MANAGEMENT ENDPOINTS ---

// Fetch detailed clients including balance
app.get('/api/admin/clients-detailed', (req, res) => {
  const query = `
    SELECT c.id, c.full_name, c.email, c.phone, c.password, c.balance, c.ip_address, c.created_at, c.agent_id, a.name as agent_name
    FROM clients c
    LEFT JOIN crm_agents a ON c.agent_id = a.id
    ORDER BY c.id DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to query clients.' });
    return res.json({ clients: rows || [] });
  });
});

// Fetch pending transactions for Admin CRM
app.get('/api/admin/pending-transactions', (req, res) => {
  const query = `
    SELECT t.*, c.full_name, c.email 
    FROM transactions t
    JOIN clients c ON t.client_id = c.id
    WHERE t.status = 'PENDING'
    ORDER BY t.id DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch pending transactions.' });
    return res.json({ transactions: rows || [] });
  });
});

// Admin approves or rejects transaction
app.post('/api/admin/approve-transaction', (req, res) => {
  const { transactionId, status } = req.body; // status: 'APPROVED' or 'REJECTED'

  if (!transactionId || !['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid transaction approval parameters.' });
  }

  db.get(`SELECT * FROM transactions WHERE id = ?`, [transactionId], (err, tx) => {
    if (err || !tx) return res.status(404).json({ error: 'Transaction not found.' });
    if (tx.status !== 'PENDING') return res.status(400).json({ error: 'Transaction already processed.' });

    db.run(`UPDATE transactions SET status = ? WHERE id = ?`, [status, transactionId], function (updateErr) {
      if (updateErr) return res.status(500).json({ error: 'Failed to update transaction status.' });

      if (status === 'APPROVED') {
        // Adjust Client Balance
        const balanceChange = tx.type === 'WITHDRAWAL' ? -tx.amount : tx.amount;
        db.run(`UPDATE clients SET balance = balance + ? WHERE id = ?`, [balanceChange, tx.client_id]);
      }

      logClientActivity(tx.client_id, `TRANSACTION_${status}`, { transactionId, amount: tx.amount, type: tx.type });
      return res.json({ success: true, message: `Transaction ${status.toLowerCase()} successfully.` });
    });
  });
});

// Admin manually adjusts client balance (Direct Credit/Debit)
app.post('/api/admin/update-balance', (req, res) => {
  const { clientId, amount, type } = req.body; // type: 'ADD' or 'DEDUCT'
  
  if (!clientId || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid client or amount.' });
  }

  const adjustment = type === 'DEDUCT' ? -Math.abs(amount) : Math.abs(amount);

  db.run(`UPDATE clients SET balance = balance + ? WHERE id = ?`, [adjustment, clientId], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to update balance.' });

    // Record in transactions history
    db.run(
      `INSERT INTO transactions (client_id, type, amount, status, method) VALUES (?, ?, ?, 'APPROVED', 'ADMIN_ADJUSTMENT')`,
      [clientId, type === 'DEDUCT' ? 'DEBIT' : 'CREDIT', Math.abs(amount)]
    );

    logClientActivity(clientId, 'ADMIN_BALANCE_ADJUSTMENT', { amount: adjustment, newBalanceType: type });
    return res.json({ success: true, message: 'Client balance updated successfully.' });
  });
});

// --- CASHIER ENDPOINTS ---

app.post('/api/cashier/deposit', (req, res) => {
  const { amount, method, txHash, clientId } = req.body;

  if (!clientId || !amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid deposit request parameters.' });
  }

  db.run(
    `INSERT INTO transactions (client_id, type, amount, status, method, tx_hash) VALUES (?, 'DEPOSIT', ?, 'PENDING', ?, ?)`,
    [clientId, parseFloat(amount), method || 'Crypto', txHash || 'N/A'],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to process deposit request.' });

      logClientActivity(clientId, 'DEPOSIT_REQUESTED', { amount, method, txHash });
      return res.json({ success: true, message: 'Deposit request submitted for approval.', transactionId: this.lastID });
    }
  );
});

// --- CRM & AGENT ENDPOINTS ---

app.post('/api/crm/agent/login', (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT id, name, email, role FROM crm_agents WHERE email = ? AND password = ?`, [email.toLowerCase(), password], (err, agent) => {
    if (err || !agent) return res.status(401).json({ error: 'Invalid agent credentials.' });
    return res.json({ success: true, agent });
  });
});

app.get('/api/crm/agents', (req, res) => {
  db.all(`SELECT id, name, email, role FROM crm_agents`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch agents.' });
    return res.json({ agents: rows || [] });
  });
});

app.get('/api/crm/client/:clientId/activity', (req, res) => {
  const { clientId } = req.params;
  db.all(`SELECT * FROM client_logs WHERE client_id = ? ORDER BY id DESC LIMIT 50`, [clientId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch activity logs.' });
    const formatted = (rows || []).map(r => ({ ...r, details: JSON.parse(r.details || '{}') }));
    return res.json({ logs: formatted });
  });
});

// --- IN-MEMORY TRADING ENGINE & REALTIME BROADCAST ---
let marketPrices = {
  EURUSD: { bid: 1.0850, ask: 1.0852, category: 'MAJOR_FOREX' },
  BTCUSD: { bid: 65000.00, ask: 65010.00, category: 'CRYPTO' }
};

let activePositions = [];
let nextPositionId = 1;

// Tick simulation loop
setInterval(() => {
  const eurusdDelta = (Math.random() - 0.5) * 0.0004;
  marketPrices.EURUSD.bid = parseFloat((marketPrices.EURUSD.bid + eurusdDelta).toFixed(5));
  marketPrices.EURUSD.ask = parseFloat((marketPrices.EURUSD.bid + 0.0002).toFixed(5));

  const btcDelta = (Math.random() - 0.5) * 15;
  marketPrices.BTCUSD.bid = parseFloat((marketPrices.BTCUSD.bid + btcDelta).toFixed(2));
  marketPrices.BTCUSD.ask = parseFloat((marketPrices.BTCUSD.ask + 10).toFixed(2));

  // Recalculate trade PnLs
  activePositions.forEach((pos) => {
    const currentPrice = marketPrices[pos.symbol];
    if (!currentPrice) return;

    if (pos.side === 'BUY') {
      pos.pnl = (currentPrice.bid - pos.openPrice) * pos.volume * (pos.symbol === 'BTCUSD' ? 1 : 100000);
    } else {
      pos.pnl = (pos.openPrice - currentPrice.ask) * pos.volume * (pos.symbol === 'BTCUSD' ? 1 : 100000);
    }
  });

  const payload = JSON.stringify({
    type: 'MARKET_TICK',
    data: {
      prices: marketPrices,
      positions: activePositions
    }
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}, 1000);

// --- WEBSOCKET ENGINE ---
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);
      const { action, data } = parsed;

      if (action === 'PLACE_ORDER') {
        const { symbol, side, volume, leverage, clientId } = data;
        const priceInfo = marketPrices[symbol];
        if (!priceInfo) return;

        const openPrice = side === 'BUY' ? priceInfo.ask : priceInfo.bid;
        const requiredMargin = (openPrice * volume * (symbol === 'BTCUSD' ? 1 : 100000)) / leverage;

        const newPos = {
          id: nextPositionId++,
          clientId,
          symbol,
          side,
          volume,
          leverage,
          openPrice,
          margin: requiredMargin,
          pnl: 0
        };

        activePositions.push(newPos);
        logClientActivity(clientId, 'PLACE_ORDER', { positionId: newPos.id, symbol, side, volume, openPrice });
      }

      if (action === 'CLOSE_POSITION') {
        const { id, clientId } = data;
        const posIndex = activePositions.findIndex((p) => p.id === id);
        if (posIndex !== -1) {
          const closedPos = activePositions[posIndex];
          
          // Apply PnL directly to Client's DB Balance
          db.run(`UPDATE clients SET balance = balance + ? WHERE id = ?`, [closedPos.pnl, clientId]);
          
          activePositions.splice(posIndex, 1);
          logClientActivity(clientId, 'CLOSE_POSITION', { positionId: id, realizedPnL: closedPos.pnl });
        }
      }
    } catch (err) {
      console.error('WebSocket Error:', err);
    }
  });
});

// --- CATCH-ALL ROUTE FOR FRONTEND SPA ---
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/dist/index.html'));
});

// SERVER LISTEN
const HTTPS_PORT = process.env.HTTPS_PORT || 443;
server.listen(HTTPS_PORT, '0.0.0.0', () => {
  console.log(`HTTPS Server listening on port ${HTTPS_PORT}`);
});

http.createServer((req, res) => {
  res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
  res.end();
}).listen(80, '0.0.0.0');