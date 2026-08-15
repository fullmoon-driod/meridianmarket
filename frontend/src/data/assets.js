// src/data/assets.js

export const ASSET_CATEGORIES = [
  { id: 'all', name: 'All Assets' },
  { id: 'forex', name: 'Forex' },
  { id: 'crypto', name: 'Crypto' },
  { id: 'metals', name: 'Metals' },
  { id: 'indices', name: 'Indices' },
];

export const ASSETS = [
  // METALS
  { symbol: 'XAU/USD', name: 'Gold / US Dollar', category: 'metals', digits: 2 },
  { symbol: 'XAG/USD', name: 'Silver / US Dollar', category: 'metals', digits: 3 },
  // CRYPTO
  { symbol: 'BTC/USD', name: 'Bitcoin / USD', category: 'crypto', digits: 2 },
  { symbol: 'ETH/USD', name: 'Ethereum / USD', category: 'crypto', digits: 2 },
  { symbol: 'SOL/USD', name: 'Solana / USD', category: 'crypto', digits: 2 },
  // FOREX
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', category: 'forex', digits: 5 },
  { symbol: 'GBP/USD', name: 'British Pound / USD', category: 'forex', digits: 5 },
  { symbol: 'USD/JPY', name: 'USD / Japanese Yen', category: 'forex', digits: 3 },
  // INDICES
  { symbol: 'US500', name: 'S&P 500 Index', category: 'indices', digits: 2 },
  { symbol: 'US100', name: 'Nasdaq 100 Index', category: 'indices', digits: 2 },
];