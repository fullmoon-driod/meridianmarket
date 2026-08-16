const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'trading_platform',
  password: process.env.DB_PASSWORD || 'postgres', // Change this to your Postgres password if you created one
  port: 5433,
});

async function createPosition({ accountId, symbol, side, volume, openPrice, leverage, usedMargin }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const insertQuery = `
      INSERT INTO positions (account_id, symbol, side, volume, open_price, leverage, used_margin, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPEN') RETURNING *;
    `;
    const res = await client.query(insertQuery, [accountId, symbol, side, volume, openPrice, leverage, usedMargin]);
    await client.query('COMMIT');
    return res.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function closePosition({ positionId, closePrice, realizedPnL }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const updatePosQuery = `
      UPDATE positions SET status = 'CLOSED', close_price = $1, unrealized_pnl = $2, closed_at = NOW()
      WHERE id = $3 RETURNING *;
    `;
    const updatedPos = await client.query(updatePosQuery, [closePrice, realizedPnL, positionId]);
    await client.query('COMMIT');
    return updatedPos.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, createPosition, closePosition };