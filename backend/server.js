const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Load environment variables (.env)
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

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
    // Enable Foreign Keys
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

    // 2. Clients Table
    db.run(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT NOT NULL,
        password TEXT NOT NULL,
        agent_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES crm_agents(id) ON DELETE SET NULL
      )
    `);

    // Ensure agent_id column exists if table was created previously without it
    db.run(`ALTER TABLE clients ADD COLUMN agent_id INTEGER`, (err) => {
      // Ignored if column already exists
    });

    // 3. Client Audit Activity Logs Table
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

    // Seed Default CRM Agents if empty
    db.get(`SELECT COUNT(*) as count FROM crm_agents`, [], (err, row) => {
      if (row && row.count === 0) {
        db.run(`INSERT INTO crm_agents (name, email, password, role) VALUES ('Agent Smith', 'smith@meridian.com', 'agent123', 'Senior Retention')`);
        db.run(`INSERT INTO crm_agents (name, email, password, role) VALUES ('Agent Sarah', 'sarah@meridian.com', 'agent123', 'Account Executive')`);
        console.log('Seeded default CRM agents.');
      }
    });
  });
}

// Helper: Log activity to CRM audit stream
function logClientActivity(clientId, actionType, details = {}) {
  if (!clientId) return;
  const detailsStr = JSON.stringify(details);
  db.run(
    `INSERT INTO client_logs (client_id, action_type, details) VALUES (?, ?, ?)`,
    [clientId, actionType, detailsStr],
    (err) => {
      if (err) console.error('Failed to log client activity:', err.message);
    }
  );
}

// --- AUTHENTICATION ENDPOINTS ---

// REGISTER USER (DIRECT REGISTRATION)
app.post('/api/register', (req, res) => {
  const { fullName, email, phone, password } = req.body;

  if (!fullName || !email || !phone || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const normalizedEmail = email.toLowerCase();

  // Find default agent safely
  db.get(`SELECT id FROM crm_agents ORDER BY id ASC LIMIT 1`, [], (err, agentRow) => {
    const defaultAgentId = agentRow ? agentRow.id : null;

    db.run(
      `INSERT INTO clients (full_name, email, phone, password, agent_id) VALUES (?, ?, ?, ?, ?)`,
      [fullName, normalizedEmail, phone, password, defaultAgentId],
      function (dbErr) {
        if (dbErr) {
          console.error('Registration Error:', dbErr.message);

          if (dbErr.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Email address is already registered.' });
          }
          return res.status(500).json({ error: `Registration Failed: ${dbErr.message}` });
        }

        const newClientId = this.lastID;
        logClientActivity(newClientId, 'ACCOUNT_CREATED', { fullName, email: normalizedEmail, phone });

        return res.json({
          success: true,
          client: { id: newClientId, full_name: fullName, email: normalizedEmail, phone, agent_id: defaultAgentId }
        });
      }
    );
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.get(
    `SELECT id, full_name, email, phone, agent_id FROM clients WHERE email = ? AND password = ?`,
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

// --- ADMIN MANAGEMENT ENDPOINTS ---

app.get('/api/admin/clients-detailed', (req, res) => {
  const query = `
    SELECT c.id, c.full_name, c.email, c.phone, c.created_at, c.agent_id, a.name as agent_name
    FROM clients c
    LEFT JOIN crm_agents a ON c.agent_id = a.id
    ORDER BY c.id DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to query clients.' });
    return res.json({ clients: rows || [] });
  });
});

app.post('/api/admin/assign-agent', (req, res) => {
  const { clientId, agentId } = req.body;
  if (!clientId) {
    return res.status(400).json({ error: 'Client ID is required.' });
  }

  db.run(
    `UPDATE clients SET agent_id = ? WHERE id = ?`,
    [agentId || null, clientId],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to assign agent.' });

      logClientActivity(clientId, 'AGENT_ASSIGNED_BY_ADMIN', { assignedAgentId: agentId });
      return res.json({ success: true, message: 'Agent assignment updated successfully.' });
    }
  );
});

app.delete('/api/admin/clients/:id', (req, res) => {
  const clientId = req.params.id;
  db.run(`DELETE FROM clients WHERE id = ?`, [clientId], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete client.' });
    return res.json({ success: true });
  });
});

// --- CRM & AGENT ENDPOINTS ---

app.post('/api/crm/agent/login', (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT id, name, email, role FROM crm_agents WHERE email = ? AND password = ?`, [email.toLowerCase(), password], (err, agent) => {
    if (err || !agent) {
      return res.status(401).json({ error: 'Invalid agent credentials.' });
    }
    return res.json({ success: true, agent });
  });
});

app.get('/api/crm/agents', (req, res) => {
  db.all(`SELECT id, name, email, role FROM crm_agents`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch agents.' });
    return res.json({ agents: rows || [] });
  });
});

app.get('/api/crm/agent/:agentId/clients', (req, res) => {
  const { agentId } = req.params;
  db.all(`SELECT id, full_name, email, phone, created_at FROM clients WHERE agent_id = ?`, [agentId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch assigned clients.' });
    return res.json({ clients: rows || [] });
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

// --- CASHIER ENDPOINT (UPDATED FOR PENDING APPROVAL & REGIONAL GATEWAYS) ---

app.post('/api/cashier/deposit', (req, res) => {
  const { amount, network, method, country, gateway, txHash, clientId } = req.body;
  
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid deposit amount.' });
  }

  // Record pending deposit in CRM logs for Admin approval
  if (clientId) {
    logClientActivity(clientId, 'DEPOSIT_PENDING', {
      amount: parseFloat(amount),
      network: network || 'TRC20',
      method: method || 'Crypto',
      country: country || 'Unspecified',
      gateway: gateway || 'External Exchange',
      txHash: txHash || 'EXTERNAL_REDIRECT',
      status: 'PENDING_APPROVAL',
      timestamp: new Date()
    });
  }

  return res.json({
    success: true,
    message: 'Deposit initiated. Pending admin verification.',
    status: 'PENDING'
  });
});

// --- IN-MEMORY TRADING STATE ---
let accountState = {
  balance: 10000,
  equity: 10000,
  usedMargin: 0,
  freeMargin: 10000,
  marginLevel: 0
};

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

  let totalPnL = 0;
  let totalMargin = 0;

  activePositions.forEach((pos) => {
    const currentPrice = marketPrices[pos.symbol];
    if (!currentPrice) return;

    if (pos.side === 'BUY') {
      pos.pnl = (currentPrice.bid - pos.openPrice) * pos.volume * (pos.symbol === 'BTCUSD' ? 1 : 100000);
    } else {
      pos.pnl = (pos.openPrice - currentPrice.ask) * pos.volume * (pos.symbol === 'BTCUSD' ? 1 : 100000);
    }

    totalPnL += pos.pnl;
    totalMargin += pos.margin;
  });

  accountState.equity = accountState.balance + totalPnL;
  accountState.usedMargin = totalMargin;
  accountState.freeMargin = accountState.equity - accountState.usedMargin;
  accountState.marginLevel = accountState.usedMargin > 0 ? (accountState.equity / accountState.usedMargin) * 100 : 0;

  const payload = JSON.stringify({
    type: 'MARKET_TICK',
    data: {
      prices: marketPrices,
      positions: activePositions,
      account: accountState
    }
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}, 1000);

// --- WEBSOCKET EVENT HANDLING ---
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
          symbol,
          side,
          volume,
          leverage,
          openPrice,
          margin: requiredMargin,
          pnl: 0
        };

        activePositions.push(newPos);

        if (clientId) {
          logClientActivity(clientId, 'PLACE_ORDER', { positionId: newPos.id, symbol, side, volume, openPrice });
        }
      }

      if (action === 'CLOSE_POSITION') {
        const { id, clientId } = data;
        const posIndex = activePositions.findIndex((p) => p.id === id);
        if (posIndex !== -1) {
          const closedPos = activePositions[posIndex];
          accountState.balance += closedPos.pnl;
          activePositions.splice(posIndex, 1);

          if (clientId) {
            logClientActivity(clientId, 'CLOSE_POSITION', { positionId: id, realizedPnL: closedPos.pnl });
          }
        }
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });
});

// --- CATCH-ALL ROUTE FOR FRONTEND SPA ---
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/dist/index.html'));
});

// LISTEN DIRECTLY ON PORT 80 TO ACCEPT STANDARD WEB TRAFFIC
const PORT = process.env.PORT || 80;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});