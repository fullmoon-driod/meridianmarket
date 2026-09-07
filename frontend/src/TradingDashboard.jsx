import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  LogOut,
  BarChart2,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  CheckCircle2,
  X,
  AlertCircle,
  FileCheck,
  Clock,
  Globe,
  Upload,
  Copy,
  Check,
  QrCode,
  Zap,
  TrendingUp,
  RefreshCw,
  Search,
  Activity,
  User,
  Mail,
  Phone,
  Calendar,
  Hash,
  Menu,
  Star,
  CandlestickChart,
  Gauge
} from 'lucide-react';

// ==========================================
// 0. OPTIONAL REAL PRICE FEED (OFF BY DEFAULT)
// ==========================================
const PRICE_FEED_URL = '';
const PRICE_FEED_INTERVAL_MS = 5000;

// ==========================================
// 1. MULTI-ASSET MATRIX & INITIAL DATA
// ==========================================
const MULTI_ASSET_REGISTRY = {
  // ---------- FOREX : MAJORS ----------
  'EUR/USD': { name: 'EUR/USD (Euro / US Dollar)', price: 1.08420, digits: 5, category: 'Forex', spread: '0.2 pips', tv: 'OANDA:EURUSD' },
  'GBP/USD': { name: 'GBP/USD (British Pound)', price: 1.26500, digits: 5, category: 'Forex', spread: '0.4 pips', tv: 'OANDA:GBPUSD' },
  'USD/JPY': { name: 'USD/JPY (US Dollar / Japanese Yen)', price: 154.250, digits: 3, category: 'Forex', spread: '0.3 pips', tv: 'OANDA:USDJPY' },
  'USD/CHF': { name: 'USD/CHF (US Dollar / Swiss Franc)', price: 0.90420, digits: 5, category: 'Forex', spread: '0.4 pips', tv: 'OANDA:USDCHF' },
  'USD/CAD': { name: 'USD/CAD (US Dollar / Canadian Dollar)', price: 1.36850, digits: 5, category: 'Forex', spread: '0.5 pips', tv: 'OANDA:USDCAD' },
  'AUD/USD': { name: 'AUD/USD (Australian Dollar)', price: 0.65820, digits: 5, category: 'Forex', spread: '0.3 pips', tv: 'OANDA:AUDUSD' },
  'NZD/USD': { name: 'NZD/USD (New Zealand Dollar)', price: 0.60140, digits: 5, category: 'Forex', spread: '0.6 pips', tv: 'OANDA:NZDUSD' },
  // ---------- FOREX : MINORS / CROSSES ----------
  'EUR/GBP': { name: 'EUR/GBP (Euro / British Pound)', price: 0.85700, digits: 5, category: 'Forex', spread: '0.5 pips', tv: 'OANDA:EURGBP' },
  'EUR/JPY': { name: 'EUR/JPY (Euro / Japanese Yen)', price: 167.230, digits: 3, category: 'Forex', spread: '0.6 pips', tv: 'OANDA:EURJPY' },
  'EUR/CHF': { name: 'EUR/CHF (Euro / Swiss Franc)', price: 0.98010, digits: 5, category: 'Forex', spread: '0.7 pips', tv: 'OANDA:EURCHF' },
  'EUR/AUD': { name: 'EUR/AUD (Euro / Australian Dollar)', price: 1.64720, digits: 5, category: 'Forex', spread: '0.9 pips', tv: 'OANDA:EURAUD' },
  'EUR/CAD': { name: 'EUR/CAD (Euro / Canadian Dollar)', price: 1.48350, digits: 5, category: 'Forex', spread: '0.9 pips', tv: 'OANDA:EURCAD' },
  'EUR/NZD': { name: 'EUR/NZD (Euro / NZ Dollar)', price: 1.80290, digits: 5, category: 'Forex', spread: '1.4 pips', tv: 'OANDA:EURNZD' },
  'GBP/JPY': { name: 'GBP/JPY (British Pound / Yen)', price: 195.140, digits: 3, category: 'Forex', spread: '0.9 pips', tv: 'OANDA:GBPJPY' },
  'GBP/CHF': { name: 'GBP/CHF (British Pound / Franc)', price: 1.14380, digits: 5, category: 'Forex', spread: '1.1 pips', tv: 'OANDA:GBPCHF' },
  'GBP/AUD': { name: 'GBP/AUD (British Pound / Aussie)', price: 1.92180, digits: 5, category: 'Forex', spread: '1.3 pips', tv: 'OANDA:GBPAUD' },
  'GBP/CAD': { name: 'GBP/CAD (British Pound / CAD)', price: 1.73090, digits: 5, category: 'Forex', spread: '1.3 pips', tv: 'OANDA:GBPCAD' },
  'GBP/NZD': { name: 'GBP/NZD (British Pound / NZD)', price: 2.10360, digits: 5, category: 'Forex', spread: '1.8 pips', tv: 'OANDA:GBPNZD' },
  'AUD/JPY': { name: 'AUD/JPY (Australian Dollar / Yen)', price: 101.530, digits: 3, category: 'Forex', spread: '0.7 pips', tv: 'OANDA:AUDJPY' },
  'AUD/CHF': { name: 'AUD/CHF (Australian Dollar / Franc)', price: 0.59510, digits: 5, category: 'Forex', spread: '0.9 pips', tv: 'OANDA:AUDCHF' },
  'AUD/CAD': { name: 'AUD/CAD (Australian Dollar / CAD)', price: 0.90080, digits: 5, category: 'Forex', spread: '0.9 pips', tv: 'OANDA:AUDCAD' },
  'AUD/NZD': { name: 'AUD/NZD (Australian / NZ Dollar)', price: 1.09440, digits: 5, category: 'Forex', spread: '1.2 pips', tv: 'OANDA:AUDNZD' },
  'CAD/JPY': { name: 'CAD/JPY (Canadian Dollar / Yen)', price: 112.720, digits: 3, category: 'Forex', spread: '0.8 pips', tv: 'OANDA:CADJPY' },
  'CAD/CHF': { name: 'CAD/CHF (Canadian Dollar / Franc)', price: 0.66070, digits: 5, category: 'Forex', spread: '1.0 pips', tv: 'OANDA:CADCHF' },
  'CHF/JPY': { name: 'CHF/JPY (Swiss Franc / Yen)', price: 170.590, digits: 3, category: 'Forex', spread: '1.0 pips', tv: 'OANDA:CHFJPY' },
  'NZD/JPY': { name: 'NZD/JPY (NZ Dollar / Yen)', price: 92.760, digits: 3, category: 'Forex', spread: '1.0 pips', tv: 'OANDA:NZDJPY' },
  'NZD/CAD': { name: 'NZD/CAD (NZ Dollar / CAD)', price: 0.82310, digits: 5, category: 'Forex', spread: '1.4 pips', tv: 'OANDA:NZDCAD' },
  'NZD/CHF': { name: 'NZD/CHF (NZ Dollar / Franc)', price: 0.54370, digits: 5, category: 'Forex', spread: '1.3 pips', tv: 'OANDA:NZDCHF' },
  // ---------- FOREX : EXOTICS ----------
  'USD/MXN': { name: 'USD/MXN (US Dollar / Mexican Peso)', price: 17.8420, digits: 4, category: 'Forex', spread: '12.0 pips', tv: 'OANDA:USDMXN' },
  'USD/ZAR': { name: 'USD/ZAR (US Dollar / South African Rand)', price: 18.4310, digits: 4, category: 'Forex', spread: '14.0 pips', tv: 'OANDA:USDZAR' },
  'USD/TRY': { name: 'USD/TRY (US Dollar / Turkish Lira)', price: 32.4180, digits: 4, category: 'Forex', spread: '25.0 pips', tv: 'OANDA:USDTRY' },
  'USD/SGD': { name: 'USD/SGD (US Dollar / Singapore Dollar)', price: 1.35120, digits: 5, category: 'Forex', spread: '1.6 pips', tv: 'OANDA:USDSGD' },
  'USD/HKD': { name: 'USD/HKD (US Dollar / Hong Kong Dollar)', price: 7.81400, digits: 5, category: 'Forex', spread: '2.5 pips', tv: 'OANDA:USDHKD' },
  'USD/NOK': { name: 'USD/NOK (US Dollar / Norwegian Krone)', price: 10.6180, digits: 4, category: 'Forex', spread: '18.0 pips', tv: 'OANDA:USDNOK' },
  'USD/SEK': { name: 'USD/SEK (US Dollar / Swedish Krona)', price: 10.4720, digits: 4, category: 'Forex', spread: '18.0 pips', tv: 'OANDA:USDSEK' },
  'USD/PLN': { name: 'USD/PLN (US Dollar / Polish Zloty)', price: 3.94100, digits: 5, category: 'Forex', spread: '16.0 pips', tv: 'OANDA:USDPLN' },
  'USD/CNH': { name: 'USD/CNH (US Dollar / Offshore Yuan)', price: 7.24800, digits: 5, category: 'Forex', spread: '4.0 pips', tv: 'OANDA:USDCNH' },
  'USD/THB': { name: 'USD/THB (US Dollar / Thai Baht)', price: 36.4200, digits: 4, category: 'Forex', spread: '9.0 pips', tv: 'OANDA:USDTHB' },
  'EUR/SEK': { name: 'EUR/SEK (Euro / Swedish Krona)', price: 11.3520, digits: 4, category: 'Forex', spread: '20.0 pips', tv: 'OANDA:EURSEK' },
  'EUR/NOK': { name: 'EUR/NOK (Euro / Norwegian Krone)', price: 11.5140, digits: 4, category: 'Forex', spread: '20.0 pips', tv: 'OANDA:EURNOK' },
  'EUR/TRY': { name: 'EUR/TRY (Euro / Turkish Lira)', price: 35.1400, digits: 4, category: 'Forex', spread: '30.0 pips', tv: 'OANDA:EURTRY' },
  // ---------- METALS ----------
  'XAU/USD': { name: 'XAU/USD (Gold Spot / US Dollar)', price: 2380.50, digits: 2, category: 'Metals', spread: '1.2 pips', tv: 'OANDA:XAUUSD' },
  'XAG/USD': { name: 'XAG/USD (Silver Spot)', price: 28.40, digits: 2, category: 'Metals', spread: '1.5 pips', tv: 'OANDA:XAGUSD' },
  'XPT/USD': { name: 'XPT/USD (Platinum Spot)', price: 985.40, digits: 2, category: 'Metals', spread: '3.0 pips', tv: 'OANDA:XPTUSD' },
  'XPD/USD': { name: 'XPD/USD (Palladium Spot)', price: 942.10, digits: 2, category: 'Metals', spread: '4.5 pips', tv: 'OANDA:XPDUSD' },
  'XAU/EUR': { name: 'XAU/EUR (Gold Spot / Euro)', price: 2195.20, digits: 2, category: 'Metals', spread: '1.8 pips', tv: 'OANDA:XAUEUR' },
  'XCU/USD': { name: 'XCU/USD (Copper Spot)', price: 4.4820, digits: 4, category: 'Metals', spread: '2.5 pips', tv: 'OANDA:XCUUSD' },
  // ---------- COMMODITIES ----------
  'USOIL': { name: 'USOIL (WTI Crude Oil)', price: 78.420, digits: 3, category: 'Commodities', spread: '3.0 pips', tv: 'TVC:USOIL' },
  'UKOIL': { name: 'UKOIL (Brent Crude Oil)', price: 82.610, digits: 3, category: 'Commodities', spread: '3.0 pips', tv: 'TVC:UKOIL' },
  'NATGAS': { name: 'NATGAS (Natural Gas)', price: 2.6140, digits: 4, category: 'Commodities', spread: '4.0 pips', tv: 'NYMEX:NG1!' },
  'WHEAT': { name: 'WHEAT (Chicago Wheat Futures)', price: 604.25, digits: 2, category: 'Commodities', spread: '5.0 pips', tv: 'CBOT:ZW1!' },
  'CORN': { name: 'CORN (Chicago Corn Futures)', price: 448.50, digits: 2, category: 'Commodities', spread: '5.0 pips', tv: 'CBOT:ZC1!' },
  'SOYBEAN': { name: 'SOYBEAN (Chicago Soybean Futures)', price: 1182.75, digits: 2, category: 'Commodities', spread: '6.0 pips', tv: 'CBOT:ZS1!' },
  'SUGAR': { name: 'SUGAR (No. 11 Raw Sugar)', price: 19.42, digits: 2, category: 'Commodities', spread: '4.0 pips', tv: 'ICEUS:SB1!' },
  'COFFEE': { name: 'COFFEE (Arabica Coffee)', price: 228.60, digits: 2, category: 'Commodities', spread: '6.0 pips', tv: 'ICEUS:KC1!' },
  'COCOA': { name: 'COCOA (ICE Cocoa Futures)', price: 7420.00, digits: 2, category: 'Commodities', spread: '8.0 pips', tv: 'ICEUS:CC1!' },
  'COTTON': { name: 'COTTON (No. 2 Cotton Futures)', price: 72.14, digits: 2, category: 'Commodities', spread: '5.0 pips', tv: 'ICEUS:CT1!' },
  // ---------- CRYPTO ----------
  'BTC/USD': { name: 'BTC/USD (Bitcoin Spot)', price: 61500.00, digits: 2, category: 'Crypto', spread: '10.0 pips', tv: 'BINANCE:BTCUSDT' },
  'ETH/USD': { name: 'ETH/USD (Ethereum Spot)', price: 3480.00, digits: 2, category: 'Crypto', spread: '1.5 pips', tv: 'BINANCE:ETHUSDT' },
  'BNB/USD': { name: 'BNB/USD (BNB Spot)', price: 592.40, digits: 2, category: 'Crypto', spread: '1.2 pips', tv: 'BINANCE:BNBUSDT' },
  'SOL/USD': { name: 'SOL/USD (Solana Spot)', price: 148.30, digits: 2, category: 'Crypto', spread: '0.8 pips', tv: 'BINANCE:SOLUSDT' },
  'XRP/USD': { name: 'XRP/USD (Ripple Spot)', price: 0.5184, digits: 4, category: 'Crypto', spread: '0.5 pips', tv: 'BINANCE:XRPUSDT' },
  'ADA/USD': { name: 'ADA/USD (Cardano Spot)', price: 0.4412, digits: 4, category: 'Crypto', spread: '0.5 pips', tv: 'BINANCE:ADAUSDT' },
  'DOGE/USD': { name: 'DOGE/USD (Dogecoin Spot)', price: 0.1284, digits: 4, category: 'Crypto', spread: '0.6 pips', tv: 'BINANCE:DOGEUSDT' },
  'AVAX/USD': { name: 'AVAX/USD (Avalanche Spot)', price: 28.94, digits: 2, category: 'Crypto', spread: '0.9 pips', tv: 'BINANCE:AVAXUSDT' },
  'DOT/USD': { name: 'DOT/USD (Polkadot Spot)', price: 6.148, digits: 3, category: 'Crypto', spread: '0.7 pips', tv: 'BINANCE:DOTUSDT' },
  'LINK/USD': { name: 'LINK/USD (Chainlink Spot)', price: 14.72, digits: 2, category: 'Crypto', spread: '0.7 pips', tv: 'BINANCE:LINKUSDT' },
  'MATIC/USD': { name: 'MATIC/USD (Polygon Spot)', price: 0.5842, digits: 4, category: 'Crypto', spread: '0.6 pips', tv: 'BINANCE:MATICUSDT' },
  'LTC/USD': { name: 'LTC/USD (Litecoin Spot)', price: 73.40, digits: 2, category: 'Crypto', spread: '0.9 pips', tv: 'BINANCE:LTCUSDT' },
  'BCH/USD': { name: 'BCH/USD (Bitcoin Cash Spot)', price: 384.20, digits: 2, category: 'Crypto', spread: '1.4 pips', tv: 'BINANCE:BCHUSDT' },
  'TRX/USD': { name: 'TRX/USD (Tron Spot)', price: 0.1242, digits: 4, category: 'Crypto', spread: '0.5 pips', tv: 'BINANCE:TRXUSDT' },
  'ATOM/USD': { name: 'ATOM/USD (Cosmos Spot)', price: 7.284, digits: 3, category: 'Crypto', spread: '0.8 pips', tv: 'BINANCE:ATOMUSDT' },
  'XLM/USD': { name: 'XLM/USD (Stellar Spot)', price: 0.1042, digits: 4, category: 'Crypto', spread: '0.5 pips', tv: 'BINANCE:XLMUSDT' },
  'NEAR/USD': { name: 'NEAR/USD (NEAR Protocol Spot)', price: 4.812, digits: 3, category: 'Crypto', spread: '0.8 pips', tv: 'BINANCE:NEARUSDT' },
  'ARB/USD': { name: 'ARB/USD (Arbitrum Spot)', price: 0.7914, digits: 4, category: 'Crypto', spread: '0.7 pips', tv: 'BINANCE:ARBUSDT' },
  // ---------- STOCKS ----------
  'NVDA': { name: 'NVIDIA Corp.', price: 128.30, digits: 2, category: 'Stocks', spread: '0.1 pips', tv: 'NASDAQ:NVDA' },
  'AAPL': { name: 'Apple Inc.', price: 224.50, digits: 2, category: 'Stocks', spread: '0.1 pips', tv: 'NASDAQ:AAPL' },
  'TSLA': { name: 'Tesla Inc.', price: 215.80, digits: 2, category: 'Stocks', spread: '0.2 pips', tv: 'NASDAQ:TSLA' },
  'MSFT': { name: 'Microsoft Corp.', price: 416.20, digits: 2, category: 'Stocks', spread: '0.1 pips', tv: 'NASDAQ:MSFT' },
  'AMZN': { name: 'Amazon.com Inc.', price: 184.60, digits: 2, category: 'Stocks', spread: '0.1 pips', tv: 'NASDAQ:AMZN' },
  'GOOGL': { name: 'Alphabet Inc. Class A', price: 176.40, digits: 2, category: 'Stocks', spread: '0.1 pips', tv: 'NASDAQ:GOOGL' },
  'META': { name: 'Meta Platforms Inc.', price: 498.20, digits: 2, category: 'Stocks', spread: '0.2 pips', tv: 'NASDAQ:META' },
  'NFLX': { name: 'Netflix Inc.', price: 648.90, digits: 2, category: 'Stocks', spread: '0.3 pips', tv: 'NASDAQ:NFLX' },
  'AMD': { name: 'Advanced Micro Devices', price: 158.70, digits: 2, category: 'Stocks', spread: '0.2 pips', tv: 'NASDAQ:AMD' },
  'INTC': { name: 'Intel Corp.', price: 31.24, digits: 2, category: 'Stocks', spread: '0.1 pips', tv: 'NASDAQ:INTC' },
  'PLTR': { name: 'Palantir Technologies', price: 25.84, digits: 2, category: 'Stocks', spread: '0.2 pips', tv: 'NASDAQ:PLTR' },
  'PEP': { name: 'PepsiCo Inc.', price: 166.40, digits: 2, category: 'Stocks', spread: '0.2 pips', tv: 'NASDAQ:PEP' },
  'JPM': { name: 'JPMorgan Chase & Co.', price: 202.10, digits: 2, category: 'Stocks', spread: '0.2 pips', tv: 'NYSE:JPM' },
  'BAC': { name: 'Bank of America Corp.', price: 39.82, digits: 2, category: 'Stocks', spread: '0.1 pips', tv: 'NYSE:BAC' },
  'GS': { name: 'Goldman Sachs Group', price: 456.30, digits: 2, category: 'Stocks', spread: '0.3 pips', tv: 'NYSE:GS' },
  'V': { name: 'Visa Inc. Class A', price: 268.40, digits: 2, category: 'Stocks', spread: '0.2 pips', tv: 'NYSE:V' },
  'MA': { name: 'Mastercard Inc.', price: 442.80, digits: 2, category: 'Stocks', spread: '0.3 pips', tv: 'NYSE:MA' },
  'DIS': { name: 'Walt Disney Co.', price: 98.60, digits: 2, category: 'Stocks', spread: '0.2 pips', tv: 'NYSE:DIS' },
  'BA': { name: 'Boeing Co.', price: 178.40, digits: 2, category: 'Stocks', spread: '0.3 pips', tv: 'NYSE:BA' },
  'KO': { name: 'Coca-Cola Co.', price: 63.18, digits: 2, category: 'Stocks', spread: '0.1 pips', tv: 'NYSE:KO' },
  'MCD': { name: "McDonald's Corp.", price: 254.70, digits: 2, category: 'Stocks', spread: '0.2 pips', tv: 'NYSE:MCD' },
  'NKE': { name: 'Nike Inc. Class B', price: 74.90, digits: 2, category: 'Stocks', spread: '0.2 pips', tv: 'NYSE:NKE' },
  'WMT': { name: 'Walmart Inc.', price: 67.42, digits: 2, category: 'Stocks', spread: '0.1 pips', tv: 'NYSE:WMT' },
  'XOM': { name: 'Exxon Mobil Corp.', price: 114.20, digits: 2, category: 'Stocks', spread: '0.2 pips', tv: 'NYSE:XOM' },
  'CVX': { name: 'Chevron Corp.', price: 156.80, digits: 2, category: 'Stocks', spread: '0.2 pips', tv: 'NYSE:CVX' },
  'PFE': { name: 'Pfizer Inc.', price: 28.64, digits: 2, category: 'Stocks', spread: '0.1 pips', tv: 'NYSE:PFE' },
  'JNJ': { name: 'Johnson & Johnson', price: 148.30, digits: 2, category: 'Stocks', spread: '0.2 pips', tv: 'NYSE:JNJ' },
  'UBER': { name: 'Uber Technologies Inc.', price: 68.24, digits: 2, category: 'Stocks', spread: '0.2 pips', tv: 'NYSE:UBER' },
  // ---------- INDICES ----------
  'US30': { name: 'US30 (Dow Jones Industrial)', price: 38900.00, digits: 2, category: 'Indices', spread: '2.0 pips', tv: 'TVC:DJI' },
  'NAS100': { name: 'NAS100 (US Tech 100 Index)', price: 18250.00, digits: 2, category: 'Indices', spread: '1.8 pips', tv: 'TVC:NDX' },
  'SPX500': { name: 'SPX500 (S&P 500 Index)', price: 5460.00, digits: 2, category: 'Indices', spread: '1.2 pips', tv: 'TVC:SPX' },
  'US2000': { name: 'US2000 (Russell 2000 Index)', price: 2032.00, digits: 2, category: 'Indices', spread: '2.4 pips', tv: 'TVC:RUT' },
  'GER40': { name: 'GER40 (DAX 40 Index)', price: 18420.00, digits: 2, category: 'Indices', spread: '1.5 pips', tv: 'TVC:DAX' },
  'UK100': { name: 'UK100 (FTSE 100 Index)', price: 8180.00, digits: 2, category: 'Indices', spread: '2.0 pips', tv: 'TVC:UKX' },
  'JPN225': { name: 'JPN225 (Nikkei 225 Index)', price: 39100.00, digits: 2, category: 'Indices', spread: '6.0 pips', tv: 'TVC:NI225' },
  'FRA40': { name: 'FRA40 (CAC 40 Index)', price: 7620.00, digits: 2, category: 'Indices', spread: '1.8 pips', tv: 'TVC:CAC40' },
  'HK50': { name: 'HK50 (Hang Seng Index)', price: 17840.00, digits: 2, category: 'Indices', spread: '5.0 pips', tv: 'TVC:HSI' },
  'AUS200': { name: 'AUS200 (ASX 200 Index)', price: 7780.00, digits: 2, category: 'Indices', spread: '2.0 pips', tv: 'ASX:XJO' }
};

// ==========================================
// 2. CRYPTO-ONLY REGIONAL PAYMENT MATRIX
// ==========================================
const REGIONAL_CRYPTO_CONFIG = {
  Philippines: {
    country: 'Philippines',
    platform: 'Coins.ph',
    currency: 'USDT (TRC-20)',
    walletAddress: 'TJjZoAYLytwapoPKPMBJJiPeJW2GXsB5B2',
    network: 'Tron Network (TRC20)',
    instructions: 'Send USDT via Coins.ph app to the deposit address below.'
  },
  Malaysia: {
    country: 'Malaysia',
    platform: 'Luno',
    currency: 'USDT (TRC-20)',
    walletAddress: 'TJjZoAYLytwapoPKPMBJJiPeJW2GXsB5B2',
    network: 'Tron Network (TRC20)',
    instructions: 'Transfer USDT directly from your Luno Malaysia wallet.'
  },
  Thailand: {
    country: 'Thailand',
    platform: 'Binance',
    currency: 'USDT (TRC-20)',
    walletAddress: 'TJjZoAYLytwapoPKPMBJJiPeJW2GXsB5B2',
    network: 'Tron Network (TRC20)',
    instructions: 'Withdraw USDT via Binance Thailand to the official exchange address.'
  }
};

// ==========================================
// 3. EXPANDED CRYPTO WALLETS LIST
// ==========================================
const CRYPTO_WALLETS = [
  {
    id: 'usdt-erc20',
    currency: 'USDT',
    network: 'ERC20 (Ethereum)',
    address: '0xE2B3A63602783a4C19c98760cE158551E6fc2D05',
    color: 'from-emerald-500/20 to-teal-500/10',
    borderColor: 'border-emerald-500/40'
  },
  {
    id: 'usdt-trc20',
    currency: 'USDT',
    network: 'TRC20 (Tron)',
    address: 'TJjZoAYLytwapoPKPMBJJiPeJW2GXsB5B2',
    color: 'from-cyan-500/20 to-blue-500/10',
    borderColor: 'border-cyan-500/40'
  },
  {
    id: 'eth-erc20',
    currency: 'ETH',
    network: 'ERC20 (Ethereum)',
    address: '0xE2B3A63602783a4C19c98760cE158551E6fc2D05',
    color: 'from-purple-500/20 to-indigo-500/10',
    borderColor: 'border-purple-500/40'
  },
  {
    id: 'btc',
    currency: 'BTC',
    network: 'Bitcoin Native',
    address: 'bc1qq4r3revsd6tfw427u25xkkqd9xrw5a2m69cvar',
    color: 'from-amber-500/20 to-orange-500/10',
    borderColor: 'border-amber-500/40'
  }
];

// ==========================================
// 4. PRESENTATION LAYER (styles, chart, helpers)
// ==========================================
const ASSET_CATEGORIES = ['ALL', 'FOREX', 'STOCKS', 'METALS', 'COMMODITIES', 'CRYPTO', 'INDICES'];
const CHART_INTERVALS = [
  { label: '1m', value: '1' },
  { label: '5m', value: '5' },
  { label: '15m', value: '15' },
  { label: '1H', value: '60' },
  { label: '4H', value: '240' },
  { label: '1D', value: 'D' }
];

function TerminalStyles() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
.td-root{font-family:'Inter',ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
.td-num{font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}
@keyframes tdFadeUp{from{opacity:0;transform:translate3d(0,10px,0)}to{opacity:1;transform:none}}
@keyframes tdPulseRing{0%{transform:scale(.85);opacity:.9}70%{transform:scale(2.2);opacity:0}100%{opacity:0}}
@keyframes tdMarquee{from{transform:translate3d(0,0,0)}to{transform:translate3d(-50%,0,0)}}
@keyframes tdFlashUp{0%{background-color:rgba(16,185,129,.26)}100%{background-color:transparent}}
@keyframes tdFlashDown{0%{background-color:rgba(244,63,94,.26)}100%{background-color:transparent}}
@keyframes tdGlow{0%,100%{opacity:.5}50%{opacity:1}}
@keyframes tdSpin{to{transform:rotate(360deg)}}
.td-enter{animation:tdFadeUp .45s cubic-bezier(.16,1,.3,1) both}
.td-glow{animation:tdGlow 3.2s ease-in-out infinite}
.td-spin{animation:tdSpin 1.1s linear infinite}
.td-flash-up{animation:tdFlashUp .7s ease-out}
.td-flash-down{animation:tdFlashDown .7s ease-out}
.td-marquee{display:flex;width:max-content;animation:tdMarquee 48s linear infinite}
.td-marquee:hover{animation-play-state:paused}
.td-fade-x{-webkit-mask-image:linear-gradient(90deg,transparent,#000 4%,#000 96%,transparent);mask-image:linear-gradient(90deg,transparent,#000 4%,#000 96%,transparent)}
.td-panel{background:linear-gradient(168deg,rgba(20,29,48,.82),rgba(8,12,24,.92));border:1px solid rgba(148,163,184,.13);backdrop-filter:blur(14px)}
.td-inset{background:rgba(2,6,16,.55);border:1px solid rgba(148,163,184,.10)}
.td-row{transition:background-color .18s,border-color .18s,transform .18s}
.td-row:hover{background-color:rgba(34,211,238,.06)}
.td-buy{background:linear-gradient(96deg,#10B981,#0D9488);transition:filter .25s,transform .25s,box-shadow .25s}
.td-buy:hover{filter:brightness(1.12);transform:translateY(-2px);box-shadow:0 16px 32px -14px rgba(16,185,129,.9)}
.td-sell{background:linear-gradient(96deg,#F43F5E,#DC2626);transition:filter .25s,transform .25s,box-shadow .25s}
.td-sell:hover{filter:brightness(1.12);transform:translateY(-2px);box-shadow:0 16px 32px -14px rgba(244,63,94,.9)}
.td-scroll{scrollbar-width:thin;scrollbar-color:rgba(148,163,184,.28) transparent}
.td-scroll::-webkit-scrollbar{width:7px;height:7px}
.td-scroll::-webkit-scrollbar-track{background:transparent}
.td-scroll::-webkit-scrollbar-thumb{background:rgba(148,163,184,.26);border-radius:99px}
.td-scroll::-webkit-scrollbar-thumb:hover{background:rgba(34,211,238,.45)}
.td-root a:focus-visible,.td-root button:focus-visible,.td-root input:focus-visible,.td-root select:focus-visible{outline:2px solid #22D3EE;outline-offset:2px;border-radius:10px}
@media (prefers-reduced-motion: reduce){
  .td-root *,.td-root *::before,.td-root *::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}
}
`}</style>
  );
}

/* ---- TradingView loader (single shared promise) ---- */
let tvScriptPromise = null;
function loadTradingView() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.TradingView && window.TradingView.widget) return Promise.resolve(window.TradingView);
  if (tvScriptPromise) return tvScriptPromise;
  tvScriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/tv.js';
    s.async = true;
    s.onload = () => (window.TradingView ? resolve(window.TradingView) : reject(new Error('tv missing')));
    s.onerror = () => reject(new Error('tv blocked'));
    document.head.appendChild(s);
  });
  return tvScriptPromise;
}

/* ---- Fallback chart: the original simulated candle wave ---- */
function FallbackCandles() {
  return (
    <div className="h-full w-full relative overflow-hidden rounded-xl td-inset">
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 grid grid-rows-4 grid-cols-6 opacity-10 pointer-events-none">
        {[...Array(24)].map((_, i) => (
          <div key={i} className="border-r border-b border-slate-400" />
        ))}
      </div>
      <div className="h-full w-full flex items-end justify-between space-x-1.5 p-4 pt-10 relative z-10">
        {[40, 55, 35, 60, 75, 50, 65, 80, 70, 85, 90, 60, 75, 95, 80, 100].map((h, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end">
            <div className="w-0.5 bg-cyan-500/40 h-full" />
            <div
              style={{ height: `${h}%` }}
              className={`w-full rounded-sm transition-all duration-500 ${idx % 2 === 0
                ? 'bg-gradient-to-t from-emerald-500 to-emerald-400 shadow-sm shadow-emerald-500/30'
                : 'bg-gradient-to-t from-rose-500 to-rose-400 shadow-sm shadow-rose-500/30'}`}
            />
          </div>
        ))}
      </div>
      <div className="absolute bottom-3 left-0 right-0 text-center text-[10px] td-num text-slate-500">
        Offline preview — TradingView feed unavailable
      </div>
    </div>
  );
}

/* ---- Professional TradingView chart panel ---- */
function TradingViewChart({ tvSymbol, interval }) {
  const holderRef = useRef(null);
  const idRef = useRef(`tv_${Math.random().toString(36).slice(2, 10)}`);
  const [status, setStatus] = useState('loading'); // loading | ready | failed

  useEffect(() => {
    let cancelled = false;
    let widget = null;
    setStatus('loading');
    const timeout = setTimeout(() => {
      if (!cancelled) setStatus((s) => (s === 'loading' ? 'failed' : s));
    }, 9000);

    loadTradingView()
      .then((TV) => {
        if (cancelled || !holderRef.current) return;
        holderRef.current.innerHTML = '';
        const mount = document.createElement('div');
        mount.id = idRef.current;
        mount.style.height = '100%';
        mount.style.width = '100%';
        holderRef.current.appendChild(mount);

        widget = new TV.widget({
          container_id: idRef.current,
          symbol: tvSymbol,
          interval: interval,
          autosize: true,
          theme: 'dark',
          style: '1',
          locale: 'en',
          timezone: 'Etc/UTC',
          toolbar_bg: '#0A1020',
          hide_top_toolbar: false,
          hide_legend: false,
          allow_symbol_change: false,
          save_image: false,
          withdateranges: true,
          details: false,
          backgroundColor: 'rgba(8,12,24,1)',
          gridColor: 'rgba(148,163,184,0.08)',
          studies: []
        });

        clearTimeout(timeout);
        if (!cancelled) setStatus('ready');
      })
      .catch(() => {
        clearTimeout(timeout);
        if (!cancelled) setStatus('failed');
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      try {
        if (widget && typeof widget.remove === 'function') widget.remove();
      } catch (e) { /* widget already torn down */ }
      if (holderRef.current) holderRef.current.innerHTML = '';
    };
  }, [tvSymbol, interval]);

  if (status === 'failed') return <FallbackCandles />;

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden td-inset">
      <div ref={holderRef} className="h-full w-full" />
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#080C18]">
          <RefreshCw className="w-5 h-5 text-cyan-400 td-spin" />
          <span className="td-num text-[11px] text-slate-500">Connecting live chart feed…</span>
        </div>
      )}
    </div>
  );
}

/* ---- Price cell that flashes green/red on tick ---- */
function PriceTick({ value, digits, className = '' }) {
  const prev = useRef(value);
  const [dir, setDir] = useState(null);

  useEffect(() => {
    if (value > prev.current) setDir('up');
    else if (value < prev.current) setDir('down');
    prev.current = value;
    const t = setTimeout(() => setDir(null), 700);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <span
      className={`td-num inline-block rounded px-1 ${className} ${dir === 'up' ? 'td-flash-up text-emerald-300' : dir === 'down' ? 'td-flash-down text-rose-300' : ''}`}
    >
      {Number(value).toFixed(digits)}
    </span>
  );
}

/* ---- Profile field: only renders what actually exists on the account ---- */
function ProfileField({ icon: Icon, label, value }) {
  const has = value !== undefined && value !== null && String(value).trim() !== '';
  return (
    <div className="td-inset rounded-xl p-4">
      <div className="flex items-center gap-2 text-[10px] font-semibold tracking-wide text-slate-500 uppercase mb-2">
        <Icon className="w-3.5 h-3.5 text-cyan-400" />
        <span>{label}</span>
      </div>
      {has ? (
        <div className="text-sm font-semibold text-white break-words">{String(value)}</div>
      ) : (
        <div className="text-sm text-slate-600 italic">Not on file</div>
      )}
    </div>
  );
}

export default function TradingDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('terminal');
  const [selectedCountry, setSelectedCountry] = useState('Philippines');
  const [kycState, setKycState] = useState({
    status: 'unverified',
    fullName: '',
    idNumber: '',
    documentType: 'Passport'
  });

  // Financial Balances
  const [balanceUSD, setBalanceUSD] = useState(0.00);
  const [equityUSD, setEquityUSD] = useState(0.00);
  const [marginUsed] = useState(0.00);

  // Active Selected Market Ticker
  const [selectedAssetKey, setSelectedAssetKey] = useState('EUR/USD');
  const [livePrices, setLivePrices] = useState(
    Object.keys(MULTI_ASSET_REGISTRY).reduce((acc, key) => {
      acc[key] = MULTI_ASSET_REGISTRY[key].price;
      return acc;
    }, {})
  );

  // Order Ticket State
  const [orderVolume, setOrderVolume] = useState('1.00');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');

  // Active Open Positions
  const [openPositions, setOpenPositions] = useState([]);

  // Integrated Deposit Form & Modal State
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [selectedDepositMethod, setSelectedDepositMethod] = useState('USDT (TRC-20)');
  const [depositAmountUsdt, setDepositAmountUsdt] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedWalletId, setCopiedWalletId] = useState(null);

  // Withdrawal Modal State
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    accountName: '',
    amount: '',
    paymentMethod: 'Bank Transfer',
    paymentDetails: ''
  });

  // Filter Assets by Category
  const [assetCategoryFilter, setAssetCategoryFilter] = useState('ALL');

  // Presentation-only state
  const [assetSearch, setAssetSearch] = useState('');
  const [chartInterval, setChartInterval] = useState('60');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [feedMode, setFeedMode] = useState(PRICE_FEED_URL ? 'live' : 'simulated');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('current_user');
      if (raw) setCurrentUser(JSON.parse(raw));
    } catch (e) {
      setCurrentUser(null);
    }
  }, []);

  // Real-time price updates simulation
  useEffect(() => {
    const priceInterval = setInterval(() => {
      setLivePrices(prevPrices => {
        const updated = { ...prevPrices };
        Object.keys(updated).forEach(symbol => {
          const baseConfig = MULTI_ASSET_REGISTRY[symbol];
          const randomDelta = (Math.random() - 0.495) * (updated[symbol] * 0.0006);
          const newPrice = updated[symbol] + randomDelta;
          updated[symbol] = parseFloat(newPrice.toFixed(baseConfig.digits));
        });
        return updated;
      });
    }, 1200);
    return () => clearInterval(priceInterval);
  }, []);

  // Real quote feed integration
  useEffect(() => {
    if (!PRICE_FEED_URL) return;
    let alive = true;
    const pull = async () => {
      try {
        const res = await fetch(PRICE_FEED_URL);
        const quotes = await res.json();
        if (!alive || !quotes || typeof quotes !== 'object') return;
        setLivePrices(prev => {
          const next = { ...prev };
          Object.keys(quotes).forEach(sym => {
            if (MULTI_ASSET_REGISTRY[sym] && Number.isFinite(Number(quotes[sym]))) {
              next[sym] = parseFloat(Number(quotes[sym]).toFixed(MULTI_ASSET_REGISTRY[sym].digits));
            }
          });
          return next;
        });
        if (alive) setFeedMode('live');
      } catch (e) {
        if (alive) setFeedMode('simulated');
      }
    };
    pull();
    const id = setInterval(pull, PRICE_FEED_INTERVAL_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const activeAsset = MULTI_ASSET_REGISTRY[selectedAssetKey];
  const activePrice = livePrices[selectedAssetKey] || activeAsset.price;
  const activeCryptoConfig = REGIONAL_CRYPTO_CONFIG[selectedCountry];

  const handleExecuteTrade = (type) => {
    const vol = parseFloat(orderVolume) || 0.1;
    const newPosition = {
      id: Math.floor(1000 + Math.random() * 9000),
      symbol: selectedAssetKey,
      type: type,
      volume: vol,
      openPrice: activePrice,
      currentPrice: activePrice,
      sl: parseFloat(stopLoss) || 0,
      tp: parseFloat(takeProfit) || 0,
      pnl: 0.00,
      time: new Date().toLocaleTimeString()
    };
    setOpenPositions([newPosition, ...openPositions]);
  };

  const handleClosePosition = (posId) => {
    setOpenPositions(openPositions.filter(p => p.id !== posId));
  };

  const handleCopyAddress = (addr, id = null) => {
    navigator.clipboard.writeText(addr || activeCryptoConfig.walletAddress);
    if (id) {
      setCopiedWalletId(id);
      setTimeout(() => setCopiedWalletId(null), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDepositSubmit = (e) => {
    e.preventDefault();
    const amt = parseFloat(depositAmountUsdt) || 0;
    if (amt <= 0) return alert('Please enter a valid deposit amount.');
    setIsDepositOpen(false);
    setDepositAmountUsdt('');
    alert(`Deposit request of $${amt.toLocaleString()} (${selectedDepositMethod}) submitted!\n\nStatus: Pending Admin CRM Verification.`);
  };

  const handleWithdrawSubmit = (e) => {
    e.preventDefault();
    const amt = parseFloat(withdrawForm.amount) || 0;
    if (amt <= 0) return alert('Please enter a valid withdrawal amount.');
    if (amt > balanceUSD) return alert('Insufficient balance for this withdrawal request.');
    setIsWithdrawOpen(false);
    setWithdrawForm({ accountName: '', amount: '', paymentMethod: 'Bank Transfer', paymentDetails: '' });
    alert(`Withdrawal request of $${amt.toLocaleString()} submitted successfully!\n\nStatus: Pending Processing.`);
  };

  const handleKycSubmit = (e) => {
    e.preventDefault();
    setKycState({ ...kycState, status: 'pending' });
    alert('KYC Documentation submitted successfully!\n\nAwaiting Brokerage Compliance review.');
  };

  const filteredAssets = Object.keys(MULTI_ASSET_REGISTRY).filter(key => {
    if (assetCategoryFilter === 'ALL') return true;
    return MULTI_ASSET_REGISTRY[key].category.toUpperCase() === assetCategoryFilter.toUpperCase();
  });

  const visibleAssets = useMemo(() => {
    const q = assetSearch.trim().toLowerCase();
    if (!q) return filteredAssets;
    return filteredAssets.filter(k =>
      k.toLowerCase().includes(q) || MULTI_ASSET_REGISTRY[k].name.toLowerCase().includes(q)
    );
  }, [filteredAssets, assetSearch]);

  const totalAssets = Object.keys(MULTI_ASSET_REGISTRY).length;
  const tickerStrip = useMemo(
    () => ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'BTC/USD', 'ETH/USD', 'NAS100', 'US30', 'USOIL', 'AAPL', 'NVDA', 'TSLA', 'SPX500', 'XAG/USD'],
    []
  );

  const navItems = [
    { key: 'terminal', label: 'Execution Desk', icon: BarChart2 },
    { key: 'deposit', label: 'Deposit Funds', icon: Wallet },
    { key: 'kyc', label: 'KYC Compliance', icon: FileCheck },
    { key: 'profile', label: 'Profile', icon: User }
  ];

  const freeMargin = equityUSD - marginUsed;
  const marginLevel = marginUsed > 0 ? (equityUSD / marginUsed) * 100 : 0;

  return (
    <div className="td-root min-h-screen bg-[#060A14] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      <TerminalStyles />

      {/* HEADER / TOP NAVIGATION BAR */}
      <header className="bg-[#050810]/90 border-b border-white/[0.07] px-4 sm:px-6 py-3 flex justify-between items-center sticky top-0 z-40 backdrop-blur-xl">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="relative p-2 bg-gradient-to-br from-cyan-500/25 to-blue-600/15 border border-cyan-500/40 rounded-xl shadow-lg shadow-cyan-500/15 group-hover:border-cyan-400 transition">
              <Shield className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition" />
            </div>
            <div className="leading-none">
              <span className="text-sm font-extrabold tracking-tight text-white block group-hover:text-cyan-400 transition">Meridian</span>
              <span className="td-num text-[9px] text-cyan-400 tracking-[0.3em] uppercase font-bold">Markets</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-white/[0.04] p-1.5 rounded-xl border border-white/[0.08] text-xs font-semibold">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`px-3.5 py-2 rounded-lg transition duration-200 flex items-center gap-2 ${
                  activeTab === item.key
                    ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-md shadow-cyan-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="hidden xl:flex items-center gap-2 bg-white/[0.04] px-3.5 py-2 rounded-xl border border-white/[0.08] text-xs td-num">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-500">Gateway:</span>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              {Object.keys(REGIONAL_CRYPTO_CONFIG).map(c => (
                <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>
              ))}
            </select>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] px-3.5 py-2 rounded-xl text-xs td-num">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-500">Bal:</span>
            <span className="text-emerald-400 font-extrabold">${balanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>

          <button
            onClick={() => setIsWithdrawOpen(true)}
            className="px-3.5 sm:px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.10] hover:border-cyan-500/40 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
          >
            <ArrowUpRight className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Withdraw</span>
          </button>

          <button
            onClick={() => navigate('/')}
            className="p-2 bg-white/[0.04] hover:bg-rose-500/12 text-slate-400 hover:text-rose-400 border border-white/[0.08] hover:border-rose-500/30 rounded-xl transition"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>

          <button
            onClick={() => setMobileNavOpen(v => !v)}
            className="md:hidden p-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-slate-300"
            title="Menu"
          >
            {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* MOBILE NAV */}
      {mobileNavOpen && (
        <div className="md:hidden bg-[#050810]/98 border-b border-white/[0.07] backdrop-blur-xl px-4 py-3 flex flex-col gap-1 sticky top-[60px] z-30">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => { setActiveTab(item.key); setMobileNavOpen(false); }}
              className={`px-3.5 py-2.5 rounded-lg text-xs font-semibold text-left flex items-center gap-2.5 transition ${
                activeTab === item.key ? 'bg-cyan-500 text-slate-950 font-extrabold' : 'text-slate-300 hover:bg-white/[0.05]'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* LIVE TICKER STRIP */}
      <div className="bg-[#040711] border-b border-white/[0.06] py-2 td-fade-x overflow-hidden">
        <div className="td-marquee gap-7 pr-7">
          {[...tickerStrip, ...tickerStrip].map((sym, i) => {
            const cfg = MULTI_ASSET_REGISTRY[sym];
            const px = livePrices[sym] ?? cfg.price;
            const up = px >= cfg.price;
            return (
              <button
                key={`${sym}-${i}`}
                onClick={() => { setSelectedAssetKey(sym); setActiveTab('terminal'); }}
                className="flex items-center gap-2 text-[11px] whitespace-nowrap hover:opacity-80 transition"
              >
                <span className="font-semibold text-slate-400">{sym}</span>
                <span className="td-num text-white">{px.toFixed(cfg.digits)}</span>
                {up
                  ? <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                  : <ArrowDownRight className="w-3 h-3 text-rose-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 p-4 sm:p-6 max-w-[1700px] w-full mx-auto space-y-6">
        {/* TAB 1: TRADING TERMINAL DESK */}
        {activeTab === 'terminal' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 td-enter">
            {/* LEFT 3 COLS: WATCHLIST & ASSET SELECTOR */}
            <div className="lg:col-span-3 td-panel rounded-2xl p-4 flex flex-col lg:h-[820px] shadow-2xl">
              <div className="flex justify-between items-center mb-3.5 pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-cyan-400">
                  <Activity className="w-4 h-4" />
                  <span>Watchlist</span>
                </div>
                <span className="td-num text-[10px] bg-white/[0.05] text-slate-400 px-2 py-0.5 rounded-full border border-white/[0.08]">
                  {totalAssets} Assets
                </span>
              </div>

              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  placeholder="Search symbol or name…"
                  className="w-full td-inset rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 transition"
                />
              </div>

              <div className="flex gap-1 mb-3 bg-white/[0.03] p-1 rounded-xl border border-white/[0.07] text-[10px] font-bold overflow-x-auto td-scroll">
                {ASSET_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setAssetCategoryFilter(cat)}
                    className={`px-2.5 py-1.5 rounded-lg transition shrink-0 ${
                      assetCategoryFilter === cat
                        ? 'bg-cyan-500 text-slate-950 font-extrabold'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5 overflow-y-auto flex-1 min-h-[320px] max-h-[560px] lg:max-h-none pr-1 td-scroll">
                {visibleAssets.length === 0 && (
                  <div className="text-center py-10 text-xs text-slate-600">No instruments match that search.</div>
                )}
                {visibleAssets.map(symbol => {
                  const asset = MULTI_ASSET_REGISTRY[symbol];
                  const price = livePrices[symbol] || asset.price;
                  const isSelected = selectedAssetKey === symbol;
                  const up = price >= asset.price;
                  return (
                    <div
                      key={symbol}
                      onClick={() => setSelectedAssetKey(symbol)}
                      className={`td-row p-2.5 rounded-xl border cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-500/14 to-transparent border-cyan-500/50 text-white shadow-md shadow-cyan-500/10'
                          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.14] text-slate-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs flex items-center gap-2">
                          <span className="truncate">{symbol}</span>
                          <span className="td-num text-[8.5px] text-slate-500 font-normal shrink-0">[{asset.category}]</span>
                        </div>
                        <div className="td-num text-[10px] text-amber-400/90 mt-0.5">Spr: {asset.spread}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <PriceTick
                          value={price}
                          digits={asset.digits}
                          className={`text-xs font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}
                        />
                        <div className={`flex items-center justify-end gap-0.5 text-[9px] font-bold ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {up ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                          <span className="td-num">{(((price - asset.price) / asset.price) * 100).toFixed(2)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[10px] td-num text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${feedMode === 'live' ? 'bg-emerald-400' : 'bg-amber-400'} td-glow`} />
                  {feedMode === 'live' ? 'Live quote feed' : 'Simulated quotes'}
                </span>
                <span>{visibleAssets.length} shown</span>
              </div>
            </div>

            {/* MIDDLE 6 COLS: LIVE INTERACTIVE CHART & POSITIONS */}
            <div className="lg:col-span-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { l: 'Balance', v: `$${balanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, c: 'text-white', i: Wallet },
                  { l: 'Equity', v: `$${equityUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, c: 'text-cyan-300', i: TrendingUp },
                  { l: 'Free Margin', v: `$${freeMargin.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, c: 'text-emerald-300', i: Layers },
                  { l: 'Margin Level', v: `${marginLevel.toFixed(2)}%`, c: 'text-amber-300', i: Gauge }
                ].map((s, i) => (
                  <div key={i} className="td-panel rounded-xl p-3.5">
                    <div className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                      <s.i className="w-3 h-3 text-slate-500" />
                      {s.l}
                    </div>
                    <div className={`td-num text-base font-bold ${s.c}`}>{s.v}</div>
                  </div>
                ))}
              </div>

              <div className="td-panel rounded-2xl p-4 sm:p-5 h-[560px] flex flex-col shadow-2xl relative overflow-hidden">
                <div className="flex flex-wrap justify-between items-center gap-3 border-b border-white/[0.08] pb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="td-num text-lg font-extrabold text-white">{selectedAssetKey}</span>
                    <span className="td-num text-[11px] bg-white/[0.05] text-cyan-400 px-2.5 py-1 rounded-lg border border-white/[0.08] truncate max-w-[240px]">
                      {activeAsset.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex bg-white/[0.04] p-1 rounded-lg border border-white/[0.08] text-[10px] font-bold">
                      {CHART_INTERVALS.map(iv => (
                        <button
                          key={iv.value}
                          onClick={() => setChartInterval(iv.value)}
                          className={`px-2.5 py-1 rounded-md transition ${
                            chartInterval === iv.value
                              ? 'bg-cyan-500 text-slate-950 font-extrabold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {iv.label}
                        </button>
                      ))}
                    </div>
                    <div className="text-right">
                      <div className="text-[9.5px] text-slate-500 uppercase tracking-wide">Spot</div>
                      <PriceTick value={activePrice} digits={activeAsset.digits} className="text-base font-extrabold text-emerald-400" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 my-4 min-h-0">
                  <TradingViewChart tvSymbol={activeAsset.tv} interval={chartInterval} />
                </div>

                <div className="flex flex-wrap gap-y-2 justify-between items-center text-[10.5px] text-slate-500 td-num pt-2 border-t border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" style={{ animation: 'tdPulseRing 1.8s ease-out infinite' }} />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                    <span>Equinix NY4 Feed Connected</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CandlestickChart className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Chart: {activeAsset.tv}</span>
                  </div>
                  <div>Leverage Mode: 1:500 ECN Direct</div>
                </div>
              </div>

              <div className="td-panel rounded-2xl p-5 shadow-2xl">
                <div className="flex justify-between items-center mb-4 pb-2.5 border-b border-white/[0.08]">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-300 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>Open Positions ({openPositions.length})</span>
                  </h3>
                  {openPositions.length > 0 && (
                    <span className="td-num text-[10px] text-slate-500">Updated {new Date().toLocaleTimeString()}</span>
                  )}
                </div>

                {openPositions.length === 0 ? (
                  <div className="text-center py-10 flex flex-col items-center gap-2.5">
                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
                      <Layers className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="text-xs text-slate-500">No active positions open</div>
                    <div className="text-[11px] text-slate-600">Execute a trade from the order ticket to get started.</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto td-scroll">
                    <table className="w-full min-w-[720px] text-left text-xs td-num">
                      <thead>
                        <tr className="border-b border-white/[0.08] text-slate-500 text-[10px] uppercase tracking-wide">
                          <th className="pb-2.5 font-semibold">Order ID</th>
                          <th className="pb-2.5 font-semibold">Symbol</th>
                          <th className="pb-2.5 font-semibold">Type</th>
                          <th className="pb-2.5 font-semibold">Volume</th>
                          <th className="pb-2.5 font-semibold">Open Price</th>
                          <th className="pb-2.5 font-semibold">Current</th>
                          <th className="pb-2.5 font-semibold">PnL ($)</th>
                          <th className="pb-2.5 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {openPositions.map(pos => (
                          <tr key={pos.id} className="td-row">
                            <td className="py-3 text-slate-500">#{pos.id}</td>
                            <td className="py-3 font-bold text-white">{pos.symbol}</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pos.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                                {pos.type}
                              </span>
                            </td>
                            <td className="py-3 text-slate-300">{pos.volume} Lots</td>
                            <td className="py-3 text-slate-300">{pos.openPrice}</td>
                            <td className="py-3 text-slate-300">{pos.currentPrice}</td>
                            <td className="py-3 font-bold text-emerald-400">+$0.00</td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleClosePosition(pos.id)}
                                className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/30 text-rose-400 rounded-lg text-[10px] font-bold transition"
                              >
                                Close
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT 3 COLS: ORDER EXECUTION TICKET */}
            <div className="lg:col-span-3 td-panel rounded-2xl p-5 flex flex-col justify-between lg:h-[820px] shadow-2xl">
              <div>
                <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/[0.08]">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-400 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span>Order Execution</span>
                  </h3>
                  <span className="td-num text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded">Market Instant</span>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-2.5">
                  <div className="td-inset rounded-xl p-3">
                    <div className="text-[9.5px] font-semibold uppercase tracking-wide text-rose-400 mb-1">Sell / Bid</div>
                    <PriceTick value={activePrice} digits={activeAsset.digits} className="text-base font-bold text-white" />
                  </div>
                  <div className="td-inset rounded-xl p-3">
                    <div className="text-[9.5px] font-semibold uppercase tracking-wide text-emerald-400 mb-1">Buy / Ask</div>
                    <PriceTick value={activePrice} digits={activeAsset.digits} className="text-base font-bold text-white" />
                  </div>
                  <div className="col-span-2 flex items-center justify-between td-inset rounded-xl px-3 py-2 text-[10.5px] td-num">
                    <span className="text-slate-500">Spread</span>
                    <span className="text-amber-300 font-bold">{activeAsset.spread}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Trade Volume (Lots)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={orderVolume}
                      onChange={(e) => setOrderVolume(e.target.value)}
                      className="w-full td-inset rounded-xl px-4 py-3 text-sm text-white td-num focus:outline-none focus:border-cyan-500/60 transition"
                    />
                    <div className="flex gap-1.5 mt-2">
                      {['0.01', '0.10', '1.00', '5.00'].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setOrderVolume(v)}
                          className="td-num flex-1 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[10px] font-bold text-slate-400 hover:text-white hover:border-cyan-500/40 transition"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Stop Loss (SL)</label>
                      <input
                        type="number"
                        placeholder="Optional"
                        value={stopLoss}
                        onChange={(e) => setStopLoss(e.target.value)}
                        className="w-full td-inset rounded-xl px-3 py-2.5 text-xs text-white td-num focus:outline-none focus:border-rose-500/60 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Take Profit (TP)</label>
                      <input
                        type="number"
                        placeholder="Optional"
                        value={takeProfit}
                        onChange={(e) => setTakeProfit(e.target.value)}
                        className="w-full td-inset rounded-xl px-3 py-2.5 text-xs text-white td-num focus:outline-none focus:border-emerald-500/60 transition"
                      />
                    </div>
                  </div>

                  <div className="td-inset rounded-xl p-3.5 space-y-2.5 text-[11px] td-num text-slate-400">
                    <div className="flex justify-between">
                      <span>Margin Required:</span>
                      <span className="text-white font-bold">$200.00 USD</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Execution Speed:</span>
                      <span className="text-emerald-400 font-bold">&lt; 10ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Instrument:</span>
                      <span className="text-cyan-300 font-bold">{activeAsset.category}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-5 border-t border-white/[0.08]">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleExecuteTrade('BUY')}
                    className="td-buy py-4 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/25 flex flex-col items-center leading-tight"
                  >
                    <span>BUY / LONG</span>
                    <span className="td-num text-[10px] font-bold opacity-80">{activePrice.toFixed(activeAsset.digits)}</span>
                  </button>
                  <button
                    onClick={() => handleExecuteTrade('SELL')}
                    className="td-sell py-4 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-rose-500/25 flex flex-col items-center leading-tight"
                  >
                    <span>SELL / SHORT</span>
                    <span className="td-num text-[10px] font-bold opacity-80">{activePrice.toFixed(activeAsset.digits)}</span>
                  </button>
                </div>
                <div className="text-[10px] text-center text-slate-600 td-num">
                  Direct Market Access (DMA) Execution
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DEPOSIT PAGE — REPLACED WITH DEPOSIT MODAL COMPONENTS */}
        {activeTab === 'deposit' && (
          <div className="max-w-4xl mx-auto space-y-8 py-4 td-enter">
            <div className="text-center max-w-2xl mx-auto space-y-2.5">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-xs text-emerald-400 font-semibold">
                <Shield className="w-3.5 h-3.5" />
                <span>Instant Web3 &amp; Crypto Deposit Gateway</span>
              </div>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">Deposit Funds</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Choose your preferred payment method and specify your transfer amount. All transactions are securely processed and credited to your trading account.
              </p>
            </div>

            <div className="td-panel rounded-3xl p-6 sm:p-8 shadow-2xl max-w-2xl mx-auto space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-white/[0.08]">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                  <span>Deposit Details</span>
                </h3>
                <span className="td-num text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full font-semibold">
                  Zero Processing Fees
                </span>
              </div>

              {/* REGIONAL GATEWAY SELECTOR */}
              <div className="td-inset p-4 rounded-2xl space-y-2">
                <div className="text-[10px] text-slate-500 td-num uppercase tracking-wide font-semibold">Selected Regional Gateway</div>
                <div className="text-xs font-bold text-white flex justify-between items-center">
                  <span>{activeCryptoConfig.platform} ({activeCryptoConfig.country})</span>
                  <span className="text-emerald-400 td-num">{activeCryptoConfig.currency}</span>
                </div>
              </div>

              {/* PAYMENT METHOD SELECTOR */}
              <div className="space-y-2">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Select Payment Method</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {['USDT (TRC-20)', 'USDT (ERC-20)', 'Ethereum (ETH)', 'Bitcoin (BTC)', 'Bank Wire'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSelectedDepositMethod(method)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition text-center ${
                        selectedDepositMethod === method
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-lg shadow-cyan-500/10'
                          : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white hover:border-white/[0.2]'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* WALLET ADDRESS DISPLAY */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  Deposit Address ({activeCryptoConfig.network})
                </label>
                <div className="td-inset rounded-xl p-3.5 flex items-center justify-between td-num text-xs">
                  <span className="text-emerald-400 font-bold break-all mr-2">{activeCryptoConfig.walletAddress}</span>
                  <button
                    onClick={() => handleCopyAddress()}
                    className="px-3 py-1.5 bg-white/[0.07] hover:bg-white/[0.14] text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* DEPOSIT FORM */}
              <form onSubmit={handleDepositSubmit} className="space-y-4 pt-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Deposit Amount (USD)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 500"
                    value={depositAmountUsdt}
                    onChange={(e) => setDepositAmountUsdt(e.target.value)}
                    className="w-full td-inset rounded-xl px-4 py-3.5 text-sm text-white td-num focus:outline-none focus:border-emerald-500/60 transition"
                  />
                </div>

                <div className="flex gap-2">
                  {['100', '250', '500', '1000', '5000'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDepositAmountUsdt(amt)}
                      className="flex-1 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] font-bold td-num text-slate-400 hover:text-white hover:border-emerald-500/40 transition"
                    >
                      ${amt}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition mt-2"
                >
                  Submit Deposit Request
                </button>
              </form>
            </div>

            {/* EXPANDED CRYPTO WALLETS LIST FOR QUICK SELECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {CRYPTO_WALLETS.map((wallet) => (
                <div
                  key={wallet.id}
                  className={`bg-[#080D1A]/80 border ${wallet.borderColor} bg-gradient-to-br ${wallet.color} rounded-2xl p-4 shadow-xl flex flex-col justify-between backdrop-blur-md relative overflow-hidden`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">Method / Network</span>
                      <h4 className="td-num text-lg font-extrabold text-white flex items-center gap-2">
                        <span>{wallet.currency}</span>
                        <span className="text-xs text-cyan-400 font-normal">[{wallet.network}]</span>
                      </h4>
                    </div>
                    <div className="p-2 bg-black/40 border border-white/10 rounded-xl text-slate-300">
                      <QrCode className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="bg-black/40 border border-white/10 rounded-xl p-2.5 flex items-center justify-between td-num text-[11px]">
                    <span className="text-emerald-400 font-bold truncate mr-2">{wallet.address}</span>
                    <button
                      onClick={() => handleCopyAddress(wallet.address, wallet.id)}
                      className="px-2.5 py-1 bg-white/[0.07] hover:bg-white/[0.14] text-slate-200 border border-white/10 rounded text-[10px] font-bold transition flex items-center gap-1 shrink-0"
                    >
                      {copiedWalletId === wallet.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedWalletId === wallet.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: KYC COMPLIANCE */}
        {activeTab === 'kyc' && (
          <div className="max-w-2xl mx-auto py-6 td-enter">
            <div className="td-panel rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="border-b border-white/[0.08] pb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-cyan-400" />
                    <span>KYC Identity Verification</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1.5">Submit official identification to activate unverified withdrawal limits.</p>
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                  kycState.status === 'pending'
                    ? 'bg-amber-500/12 text-amber-300 border-amber-500/30'
                    : 'bg-slate-500/12 text-slate-400 border-white/10'
                }`}>
                  {kycState.status === 'pending' ? 'Under review' : 'Unverified'}
                </span>
              </div>

              <form onSubmit={handleKycSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Matching Official ID"
                    value={kycState.fullName}
                    onChange={(e) => setKycState({...kycState, fullName: e.target.value})}
                    className="w-full td-inset rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500/60 transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Document Type</label>
                  <select
                    value={kycState.documentType}
                    onChange={(e) => setKycState({...kycState, documentType: e.target.value})}
                    className="w-full td-inset rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500/60 transition"
                  >
                    <option value="Passport">International Passport</option>
                    <option value="National ID">National ID Card</option>
                    <option value="Driver License">Driver License</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Document / ID Number</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Document ID Number"
                    value={kycState.idNumber}
                    onChange={(e) => setKycState({...kycState, idNumber: e.target.value})}
                    className="w-full td-inset rounded-xl px-4 py-3 text-xs text-white td-num focus:outline-none focus:border-cyan-500/60 transition"
                  />
                </div>

                <div className="border-2 border-dashed border-white/10 hover:border-cyan-500/50 rounded-xl p-8 text-center cursor-pointer transition bg-white/[0.02]">
                  <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <div className="text-xs font-bold text-white">Click or drag front image of ID document</div>
                  <div className="text-[10px] text-slate-500 mt-1">PNG, JPG or PDF (Max 10MB)</div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-cyan-500/25 transition"
                >
                  Submit KYC Documentation
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: PROFILE */}
        {activeTab === 'profile' && (
          <div className="max-w-5xl mx-auto py-4 space-y-5 td-enter">
            <div className="td-panel rounded-2xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-cyan-500/10 blur-[90px] pointer-events-none" />
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/25 to-blue-600/15 border border-cyan-500/40 flex items-center justify-center shrink-0">
                  <span className="text-2xl font-extrabold text-cyan-300">
                    {(currentUser?.fullName || currentUser?.name || 'A').toString().trim().charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-extrabold text-white tracking-tight truncate">
                    {currentUser?.fullName || currentUser?.name || 'Account holder'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {currentUser?.email || 'No email on file for this session'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border ${
                    kycState.status === 'pending'
                      ? 'bg-amber-500/12 text-amber-300 border-amber-500/30'
                      : 'bg-slate-500/12 text-slate-400 border-white/10'
                  }`}>
                    KYC: {kycState.status === 'pending' ? 'Under review' : 'Unverified'}
                  </span>
                  <span className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-500/12 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                </div>
              </div>
            </div>

            {!currentUser && (
              <div className="td-panel rounded-2xl p-4 flex items-start gap-3 border-amber-500/25">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400 leading-relaxed">
                  No stored account record was found for this session. Profile fields below show only what the
                  system actually holds — nothing is filled in on your behalf. Log in again to repopulate it.
                </p>
              </div>
            )}

            <div className="td-panel rounded-2xl p-6 shadow-2xl">
              <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-400 flex items-center gap-2 mb-5 pb-3 border-b border-white/[0.08]">
                <User className="w-4 h-4" />
                <span>Account details</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <ProfileField icon={User} label="Full name" value={currentUser?.fullName || currentUser?.name} />
                <ProfileField icon={Mail} label="Email address" value={currentUser?.email} />
                <ProfileField icon={Phone} label="Phone number" value={currentUser?.phone} />
                <ProfileField icon={Hash} label="Client ID" value={currentUser?.id || currentUser?.clientId || currentUser?._id} />
                <ProfileField
                  icon={Calendar}
                  label="Registered"
                  value={currentUser?.createdAt || currentUser?.registeredAt || currentUser?.registrationDate}
                />
                <ProfileField
                  icon={Globe}
                  label="Country / region"
                  value={currentUser?.country || currentUser?.region}
                />
              </div>
            </div>

            <div className="td-panel rounded-2xl p-6 shadow-2xl">
              <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-400 flex items-center gap-2 mb-5 pb-3 border-b border-white/[0.08]">
                <BarChart2 className="w-4 h-4" />
                <span>Trading account</span>
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <ProfileField
                  icon={Hash}
                  label="Account number"
                  value={currentUser?.accountNumber || currentUser?.tradingAccount || currentUser?.accountId}
                />
                <ProfileField
                  icon={Star}
                  label="Account type"
                  value={currentUser?.accountType || currentUser?.tier || currentUser?.plan}
                />
                <ProfileField icon={Wallet} label="Balance" value={`$${balanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                <ProfileField icon={TrendingUp} label="Equity" value={`$${equityUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                <ProfileField icon={Layers} label="Margin used" value={`$${marginUsed.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                <ProfileField icon={Gauge} label="Free margin" value={`$${freeMargin.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                <ProfileField icon={Activity} label="Open positions" value={String(openPositions.length)} />
                <ProfileField icon={Globe} label="Deposit gateway" value={`${activeCryptoConfig.country} — ${activeCryptoConfig.platform}`} />
              </div>
              <p className="mt-5 text-[11px] text-slate-600 leading-relaxed">
                Fields marked “Not on file” are not present on your stored account record. Nothing here is
                generated or estimated — contact the desk to have missing details added.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* DEPOSIT MODAL POPUP */}
      {isDepositOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="td-panel rounded-3xl max-w-md w-full p-6 shadow-2xl relative td-enter">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <span>Instant Crypto Deposit</span>
              </h3>
              <button onClick={() => setIsDepositOpen(false)} className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="td-inset p-4 rounded-2xl space-y-2">
                <div className="text-[10px] text-slate-500 td-num uppercase">Selected Region Payment Method</div>
                <div className="text-xs font-bold text-white flex justify-between">
                  <span>{activeCryptoConfig.platform} ({activeCryptoConfig.country})</span>
                  <span className="text-emerald-400 td-num">{activeCryptoConfig.currency}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Deposit Address ({activeCryptoConfig.network})</label>
                <div className="td-inset rounded-xl p-3 flex items-center justify-between td-num text-xs">
                  <span className="text-emerald-400 font-bold truncate mr-2">{activeCryptoConfig.walletAddress}</span>
                  <button
                    onClick={() => handleCopyAddress()}
                    className="px-2.5 py-1 bg-white/[0.07] hover:bg-white/[0.14] text-slate-200 rounded text-[10px] font-bold shrink-0"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <form onSubmit={handleDepositSubmit} className="space-y-4 pt-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Amount (USDT)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 500"
                    value={depositAmountUsdt}
                    onChange={(e) => setDepositAmountUsdt(e.target.value)}
                    className="w-full td-inset rounded-xl px-4 py-3 text-xs text-white td-num focus:outline-none focus:border-emerald-500/60"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition"
                >
                  Submit Deposit Request
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* WITHDRAWAL MODAL POPUP */}
      {isWithdrawOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="td-panel rounded-3xl max-w-md w-full p-6 shadow-2xl relative my-auto td-enter">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-cyan-400" />
                <span>Withdraw Funds</span>
              </h3>
              <button onClick={() => setIsWithdrawOpen(false)} className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="Beneficiary Legal Name"
                  value={withdrawForm.accountName}
                  onChange={(e) => setWithdrawForm({...withdrawForm, accountName: e.target.value})}
                  className="w-full td-inset rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500/60"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Withdrawal Amount ($)</label>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={withdrawForm.amount}
                  onChange={(e) => setWithdrawForm({...withdrawForm, amount: e.target.value})}
                  className="w-full td-inset rounded-xl px-4 py-3 text-xs text-white td-num focus:outline-none focus:border-cyan-500/60"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Payment Method</label>
                <select
                  value={withdrawForm.paymentMethod}
                  onChange={(e) => setWithdrawForm({...withdrawForm, paymentMethod: e.target.value})}
                  className="w-full td-inset rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500/60"
                >
                  <option value="Bank Transfer">Bank Wire Transfer</option>
                  <option value="USDT TRC20">USDT (TRC-20 Wallet)</option>
                  <option value="Coins.ph">Coins.ph Wallet</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Bank Account / Wallet Destination</label>
                <input
                  type="text"
                  required
                  placeholder="IBAN, Account Number, or TRC20 Address"
                  value={withdrawForm.paymentDetails}
                  onChange={(e) => setWithdrawForm({...withdrawForm, paymentDetails: e.target.value})}
                  className="w-full td-inset rounded-xl px-4 py-3 text-xs text-white td-num focus:outline-none focus:border-cyan-500/60"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-cyan-500/25 transition"
              >
                Submit Withdrawal Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}