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
  Gauge,
} from 'lucide-react';
// ==========================================
// 0. LIVE MARKET DATA FEED
// ==========================================
// Quotes (real bid/ask) are pushed by the back end over WebSocket. Leave these
// empty to talk to the same host that served the page; set them only if the API
// lives elsewhere (e.g. 'wss://api.example.com' and 'https://api.example.com').
const QUOTE_WS_URL = '';
const QUOTE_HTTP_URL = '';
const QUOTE_POLL_MS = 2000; // HTTP fallback interval while the socket is down
const QUOTE_SILENCE_MS = 6000; // reconnect if the socket goes quiet this long
// ==========================================
// 1. MULTI-ASSET MATRIX & INITIAL DATA
// ==========================================
const MULTI_ASSET_REGISTRY = {
  // ---------- FOREX : MAJORS ----------
  'EUR/USD': { name: 'EUR/USD (Euro / US Dollar)', digits: 5, category: 'Forex', tv: 'OANDA:EURUSD' },
  'GBP/USD': { name: 'GBP/USD (British Pound)', digits: 5, category: 'Forex', tv: 'OANDA:GBPUSD' },
  'USD/JPY': { name: 'USD/JPY (US Dollar / Japanese Yen)', digits: 3, category: 'Forex', tv: 'OANDA:USDJPY' },
  'USD/CHF': { name: 'USD/CHF (US Dollar / Swiss Franc)', digits: 5, category: 'Forex', tv: 'OANDA:USDCHF' },
  'USD/CAD': { name: 'USD/CAD (US Dollar / Canadian Dollar)', digits: 5, category: 'Forex', tv: 'OANDA:USDCAD' },
  'AUD/USD': { name: 'AUD/USD (Australian Dollar)', digits: 5, category: 'Forex', tv: 'OANDA:AUDUSD' },
  'NZD/USD': { name: 'NZD/USD (New Zealand Dollar)', digits: 5, category: 'Forex', tv: 'OANDA:NZDUSD' },
  // ---------- FOREX : MINORS / CROSSES ----------
  'EUR/GBP': { name: 'EUR/GBP (Euro / British Pound)', digits: 5, category: 'Forex', tv: 'OANDA:EURGBP' },
  'EUR/JPY': { name: 'EUR/JPY (Euro / Japanese Yen)', digits: 3, category: 'Forex', tv: 'OANDA:EURJPY' },
  'EUR/CHF': { name: 'EUR/CHF (Euro / Swiss Franc)', digits: 5, category: 'Forex', tv: 'OANDA:EURCHF' },
  'EUR/AUD': { name: 'EUR/AUD (Euro / Australian Dollar)', digits: 5, category: 'Forex', tv: 'OANDA:EURAUD' },
  'EUR/CAD': { name: 'EUR/CAD (Euro / Canadian Dollar)', digits: 5, category: 'Forex', tv: 'OANDA:EURCAD' },
  'EUR/NZD': { name: 'EUR/NZD (Euro / NZ Dollar)', digits: 5, category: 'Forex', tv: 'OANDA:EURNZD' },
  'GBP/JPY': { name: 'GBP/JPY (British Pound / Yen)', digits: 3, category: 'Forex', tv: 'OANDA:GBPJPY' },
  'GBP/CHF': { name: 'GBP/CHF (British Pound / Franc)', digits: 5, category: 'Forex', tv: 'OANDA:GBPCHF' },
  'GBP/AUD': { name: 'GBP/AUD (British Pound / Aussie)', digits: 5, category: 'Forex', tv: 'OANDA:GBPAUD' },
  'GBP/CAD': { name: 'GBP/CAD (British Pound / CAD)', digits: 5, category: 'Forex', tv: 'OANDA:GBPCAD' },
  'GBP/NZD': { name: 'GBP/NZD (British Pound / NZD)', digits: 5, category: 'Forex', tv: 'OANDA:GBPNZD' },
  'AUD/JPY': { name: 'AUD/JPY (Australian Dollar / Yen)', digits: 3, category: 'Forex', tv: 'OANDA:AUDJPY' },
  'AUD/CHF': { name: 'AUD/CHF (Australian Dollar / Franc)', digits: 5, category: 'Forex', tv: 'OANDA:AUDCHF' },
  'AUD/CAD': { name: 'AUD/CAD (Australian Dollar / CAD)', digits: 5, category: 'Forex', tv: 'OANDA:AUDCAD' },
  'AUD/NZD': { name: 'AUD/NZD (Australian / NZ Dollar)', digits: 5, category: 'Forex', tv: 'OANDA:AUDNZD' },
  'CAD/JPY': { name: 'CAD/JPY (Canadian Dollar / Yen)', digits: 3, category: 'Forex', tv: 'OANDA:CADJPY' },
  'CAD/CHF': { name: 'CAD/CHF (Canadian Dollar / Franc)', digits: 5, category: 'Forex', tv: 'OANDA:CADCHF' },
  'CHF/JPY': { name: 'CHF/JPY (Swiss Franc / Yen)', digits: 3, category: 'Forex', tv: 'OANDA:CHFJPY' },
  'NZD/JPY': { name: 'NZD/JPY (NZ Dollar / Yen)', digits: 3, category: 'Forex', tv: 'OANDA:NZDJPY' },
  'NZD/CAD': { name: 'NZD/CAD (NZ Dollar / CAD)', digits: 5, category: 'Forex', tv: 'OANDA:NZDCAD' },
  'NZD/CHF': { name: 'NZD/CHF (NZ Dollar / Franc)', digits: 5, category: 'Forex', tv: 'OANDA:NZDCHF' },
  // ---------- FOREX : EXOTICS ----------
  'USD/MXN': { name: 'USD/MXN (US Dollar / Mexican Peso)', digits: 4, category: 'Forex', tv: 'OANDA:USDMXN' },
  'USD/ZAR': { name: 'USD/ZAR (US Dollar / South African Rand)', digits: 4, category: 'Forex', tv: 'OANDA:USDZAR' },
  'USD/TRY': { name: 'USD/TRY (US Dollar / Turkish Lira)', digits: 4, category: 'Forex', tv: 'OANDA:USDTRY' },
  'USD/SGD': { name: 'USD/SGD (US Dollar / Singapore Dollar)', digits: 5, category: 'Forex', tv: 'OANDA:USDSGD' },
  'USD/HKD': { name: 'USD/HKD (US Dollar / Hong Kong Dollar)', digits: 5, category: 'Forex', tv: 'OANDA:USDHKD' },
  'USD/NOK': { name: 'USD/NOK (US Dollar / Norwegian Krone)', digits: 4, category: 'Forex', tv: 'OANDA:USDNOK' },
  'USD/SEK': { name: 'USD/SEK (US Dollar / Swedish Krona)', digits: 4, category: 'Forex', tv: 'OANDA:USDSEK' },
  'USD/PLN': { name: 'USD/PLN (US Dollar / Polish Zloty)', digits: 5, category: 'Forex', tv: 'OANDA:USDPLN' },
  'USD/CNH': { name: 'USD/CNH (US Dollar / Offshore Yuan)', digits: 5, category: 'Forex', tv: 'OANDA:USDCNH' },
  'USD/THB': { name: 'USD/THB (US Dollar / Thai Baht)', digits: 4, category: 'Forex', tv: 'OANDA:USDTHB' },
  'EUR/SEK': { name: 'EUR/SEK (Euro / Swedish Krona)', digits: 4, category: 'Forex', tv: 'OANDA:EURSEK' },
  'EUR/NOK': { name: 'EUR/NOK (Euro / Norwegian Krone)', digits: 4, category: 'Forex', tv: 'OANDA:EURNOK' },
  'EUR/TRY': { name: 'EUR/TRY (Euro / Turkish Lira)', digits: 4, category: 'Forex', tv: 'OANDA:EURTRY' },
  // ---------- METALS ----------
  'XAU/USD': { name: 'XAU/USD (Gold Spot / US Dollar)', digits: 2, category: 'Metals', tv: 'OANDA:XAUUSD' },
  'XAG/USD': { name: 'XAG/USD (Silver Spot)', digits: 2, category: 'Metals', tv: 'OANDA:XAGUSD' },
  'XPT/USD': { name: 'XPT/USD (Platinum Spot)', digits: 2, category: 'Metals', tv: 'OANDA:XPTUSD' },
  'XPD/USD': { name: 'XPD/USD (Palladium Spot)', digits: 2, category: 'Metals', tv: 'OANDA:XPDUSD' },
  'XAU/EUR': { name: 'XAU/EUR (Gold Spot / Euro)', digits: 2, category: 'Metals', tv: 'OANDA:XAUEUR' },
  'XCU/USD': { name: 'XCU/USD (Copper Spot)', digits: 4, category: 'Metals', tv: 'OANDA:XCUUSD' },
  // ---------- COMMODITIES ----------
  USOIL: { name: 'USOIL (WTI Crude Oil)', digits: 3, category: 'Commodities', tv: 'TVC:USOIL' },
  UKOIL: { name: 'UKOIL (Brent Crude Oil)', digits: 3, category: 'Commodities', tv: 'TVC:UKOIL' },
  NATGAS: { name: 'NATGAS (Natural Gas)', digits: 4, category: 'Commodities', tv: 'NYMEX:NG1!' },
  WHEAT: { name: 'WHEAT (Chicago Wheat Futures)', digits: 2, category: 'Commodities', tv: 'CBOT:ZW1!' },
  CORN: { name: 'CORN (Chicago Corn Futures)', digits: 2, category: 'Commodities', tv: 'CBOT:ZC1!' },
  SOYBEAN: { name: 'SOYBEAN (Chicago Soybean Futures)', digits: 2, category: 'Commodities', tv: 'CBOT:ZS1!' },
  SUGAR: { name: 'SUGAR (No. 11 Raw Sugar)', digits: 2, category: 'Commodities', tv: 'ICEUS:SB1!' },
  COFFEE: { name: 'COFFEE (Arabica Coffee)', digits: 2, category: 'Commodities', tv: 'ICEUS:KC1!' },
  COCOA: { name: 'COCOA (ICE Cocoa Futures)', digits: 2, category: 'Commodities', tv: 'ICEUS:CC1!' },
  COTTON: { name: 'COTTON (No. 2 Cotton Futures)', digits: 2, category: 'Commodities', tv: 'ICEUS:CT1!' },
  // ---------- CRYPTO ----------
  'BTC/USD': { name: 'BTC/USD (Bitcoin Spot)', digits: 2, category: 'Crypto', tv: 'BINANCE:BTCUSDT' },
  'ETH/USD': { name: 'ETH/USD (Ethereum Spot)', digits: 2, category: 'Crypto', tv: 'BINANCE:ETHUSDT' },
  'BNB/USD': { name: 'BNB/USD (BNB Spot)', digits: 2, category: 'Crypto', tv: 'BINANCE:BNBUSDT' },
  'SOL/USD': { name: 'SOL/USD (Solana Spot)', digits: 2, category: 'Crypto', tv: 'BINANCE:SOLUSDT' },
  'XRP/USD': { name: 'XRP/USD (Ripple Spot)', digits: 4, category: 'Crypto', tv: 'BINANCE:XRPUSDT' },
  'ADA/USD': { name: 'ADA/USD (Cardano Spot)', digits: 4, category: 'Crypto', tv: 'BINANCE:ADAUSDT' },
  'DOGE/USD': { name: 'DOGE/USD (Dogecoin Spot)', digits: 4, category: 'Crypto', tv: 'BINANCE:DOGEUSDT' },
  'AVAX/USD': { name: 'AVAX/USD (Avalanche Spot)', digits: 2, category: 'Crypto', tv: 'BINANCE:AVAXUSDT' },
  'DOT/USD': { name: 'DOT/USD (Polkadot Spot)', digits: 3, category: 'Crypto', tv: 'BINANCE:DOTUSDT' },
  'LINK/USD': { name: 'LINK/USD (Chainlink Spot)', digits: 2, category: 'Crypto', tv: 'BINANCE:LINKUSDT' },
  'MATIC/USD': { name: 'MATIC/USD (Polygon Spot)', digits: 4, category: 'Crypto', tv: 'BINANCE:MATICUSDT' },
  'LTC/USD': { name: 'LTC/USD (Litecoin Spot)', digits: 2, category: 'Crypto', tv: 'BINANCE:LTCUSDT' },
  'BCH/USD': { name: 'BCH/USD (Bitcoin Cash Spot)', digits: 2, category: 'Crypto', tv: 'BINANCE:BCHUSDT' },
  'TRX/USD': { name: 'TRX/USD (Tron Spot)', digits: 4, category: 'Crypto', tv: 'BINANCE:TRXUSDT' },
  'ATOM/USD': { name: 'ATOM/USD (Cosmos Spot)', digits: 3, category: 'Crypto', tv: 'BINANCE:ATOMUSDT' },
  'XLM/USD': { name: 'XLM/USD (Stellar Spot)', digits: 4, category: 'Crypto', tv: 'BINANCE:XLMUSDT' },
  'NEAR/USD': { name: 'NEAR/USD (NEAR Protocol Spot)', digits: 3, category: 'Crypto', tv: 'BINANCE:NEARUSDT' },
  'ARB/USD': { name: 'ARB/USD (Arbitrum Spot)', digits: 4, category: 'Crypto', tv: 'BINANCE:ARBUSDT' },
  // ---------- STOCKS ----------
  NVDA: { name: 'NVIDIA Corp.', digits: 2, category: 'Stocks', tv: 'NASDAQ:NVDA' },
  AAPL: { name: 'Apple Inc.', digits: 2, category: 'Stocks', tv: 'NASDAQ:AAPL' },
  TSLA: { name: 'Tesla Inc.', digits: 2, category: 'Stocks', tv: 'NASDAQ:TSLA' },
  MSFT: { name: 'Microsoft Corp.', digits: 2, category: 'Stocks', tv: 'NASDAQ:MSFT' },
  AMZN: { name: 'Amazon.com Inc.', digits: 2, category: 'Stocks', tv: 'NASDAQ:AMZN' },
  GOOGL: { name: 'Alphabet Inc. Class A', digits: 2, category: 'Stocks', tv: 'NASDAQ:GOOGL' },
  META: { name: 'Meta Platforms Inc.', digits: 2, category: 'Stocks', tv: 'NASDAQ:META' },
  NFLX: { name: 'Netflix Inc.', digits: 2, category: 'Stocks', tv: 'NASDAQ:NFLX' },
  AMD: { name: 'Advanced Micro Devices', digits: 2, category: 'Stocks', tv: 'NASDAQ:AMD' },
  INTC: { name: 'Intel Corp.', digits: 2, category: 'Stocks', tv: 'NASDAQ:INTC' },
  PLTR: { name: 'Palantir Technologies', digits: 2, category: 'Stocks', tv: 'NASDAQ:PLTR' },
  PEP: { name: 'PepsiCo Inc.', digits: 2, category: 'Stocks', tv: 'NASDAQ:PEP' },
  JPM: { name: 'JPMorgan Chase & Co.', digits: 2, category: 'Stocks', tv: 'NYSE:JPM' },
  BAC: { name: 'Bank of America Corp.', digits: 2, category: 'Stocks', tv: 'NYSE:BAC' },
  GS: { name: 'Goldman Sachs Group', digits: 2, category: 'Stocks', tv: 'NYSE:GS' },
  V: { name: 'Visa Inc. Class A', digits: 2, category: 'Stocks', tv: 'NYSE:V' },
  MA: { name: 'Mastercard Inc.', digits: 2, category: 'Stocks', tv: 'NYSE:MA' },
  DIS: { name: 'Walt Disney Co.', digits: 2, category: 'Stocks', tv: 'NYSE:DIS' },
  BA: { name: 'Boeing Co.', digits: 2, category: 'Stocks', tv: 'NYSE:BA' },
  KO: { name: 'Coca-Cola Co.', digits: 2, category: 'Stocks', tv: 'NYSE:KO' },
  MCD: { name: "McDonald's Corp.", digits: 2, category: 'Stocks', tv: 'NYSE:MCD' },
  NKE: { name: 'Nike Inc. Class B', digits: 2, category: 'Stocks', tv: 'NYSE:NKE' },
  WMT: { name: 'Walmart Inc.', digits: 2, category: 'Stocks', tv: 'NYSE:WMT' },
  XOM: { name: 'Exxon Mobil Corp.', digits: 2, category: 'Stocks', tv: 'NYSE:XOM' },
  CVX: { name: 'Chevron Corp.', digits: 2, category: 'Stocks', tv: 'NYSE:CVX' },
  PFE: { name: 'Pfizer Inc.', digits: 2, category: 'Stocks', tv: 'NYSE:PFE' },
  JNJ: { name: 'Johnson & Johnson', digits: 2, category: 'Stocks', tv: 'NYSE:JNJ' },
  UBER: { name: 'Uber Technologies Inc.', digits: 2, category: 'Stocks', tv: 'NYSE:UBER' },
  // ---------- INDICES ----------
  US30: { name: 'US30 (Dow Jones Industrial)', digits: 2, category: 'Indices', tv: 'TVC:DJI' },
  NAS100: { name: 'NAS100 (US Tech 100 Index)', digits: 2, category: 'Indices', tv: 'TVC:NDX' },
  SPX500: { name: 'SPX500 (S&P 500 Index)', digits: 2, category: 'Indices', tv: 'TVC:SPX' },
  US2000: { name: 'US2000 (Russell 2000 Index)', digits: 2, category: 'Indices', tv: 'TVC:RUT' },
  GER40: { name: 'GER40 (DAX 40 Index)', digits: 2, category: 'Indices', tv: 'TVC:DAX' },
  UK100: { name: 'UK100 (FTSE 100 Index)', digits: 2, category: 'Indices', tv: 'TVC:UKX' },
  JPN225: { name: 'JPN225 (Nikkei 225 Index)', digits: 2, category: 'Indices', tv: 'TVC:NI225' },
  FRA40: { name: 'FRA40 (CAC 40 Index)', digits: 2, category: 'Indices', tv: 'TVC:CAC40' },
  HK50: { name: 'HK50 (Hang Seng Index)', digits: 2, category: 'Indices', tv: 'TVC:HSI' },
  AUS200: { name: 'AUS200 (ASX 200 Index)', digits: 2, category: 'Indices', tv: 'ASX:XJO' },
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
    instructions: 'Send USDT via Coins.ph app to the deposit address below.',
  },
  Malaysia: {
    country: 'Malaysia',
    platform: 'Luno',
    currency: 'USDT (TRC-20)',
    walletAddress: 'TJjZoAYLytwapoPKPMBJJiPeJW2GXsB5B2',
    network: 'Tron Network (TRC20)',
    instructions: 'Transfer USDT directly from your Luno Malaysia wallet.',
  },
  Thailand: {
    country: 'Thailand',
    platform: 'Binance',
    currency: 'USDT (TRC-20)',
    walletAddress: 'TJjZoAYLytwapoPKPMBJJiPeJW2GXsB5B2',
    network: 'Tron Network (TRC20)',
    instructions: 'Withdraw USDT via Binance Thailand to the official exchange address.',
  },
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
    color: 'from-emerald-50 to-white',
    borderColor: 'border-emerald-200',
  },
  {
    id: 'usdt-trc20',
    currency: 'USDT',
    network: 'TRC20 (Tron)',
    address: 'TJjZoAYLytwapoPKPMBJJiPeJW2GXsB5B2',
    color: 'from-blue-50 to-white',
    borderColor: 'border-blue-200',
  },
  {
    id: 'eth-erc20',
    currency: 'ETH',
    network: 'ERC20 (Ethereum)',
    address: '0xE2B3A63602783a4C19c98760cE158551E6fc2D05',
    color: 'from-indigo-50 to-white',
    borderColor: 'border-indigo-200',
  },
  {
    id: 'btc',
    currency: 'BTC',
    network: 'Bitcoin Native',
    address: 'bc1qq4r3revsd6tfw427u25xkkqd9xrw5a2m69cvar',
    color: 'from-amber-50 to-white',
    borderColor: 'border-amber-200',
  },
];
// ==========================================
// 4. PRESENTATION LAYER (light white + blue theme)
// ==========================================
const ASSET_CATEGORIES = ['ALL', 'FOREX', 'STOCKS', 'METALS', 'COMMODITIES', 'CRYPTO', 'INDICES'];
const CHART_INTERVALS = [
  { label: '1m', value: '1' },
  { label: '5m', value: '5' },
  { label: '15m', value: '15' },
  { label: '1H', value: '60' },
  { label: '4H', value: '240' },
  { label: '1D', value: 'D' },
];
// The three primary views (persistent navigation)
const PRIMARY_TABS = [
  { key: 'assets', label: 'Assets', icon: Activity },
  { key: 'charts', label: 'Account & Charts', icon: CandlestickChart },
  { key: 'order', label: 'Order Execution', icon: Zap },
];
// Secondary pages (reachable from the account menu)
const SECONDARY_TABS = [
  { key: 'deposit', label: 'Deposit Funds', icon: Wallet },
  { key: 'kyc', label: 'KYC Compliance', icon: FileCheck },
  { key: 'profile', label: 'Profile', icon: User },
];
// Shared class strings
const LABEL = 'block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5';
const FIELD = 'td-field w-full rounded-xl px-4 py-3 text-sm';
const BTN_PRIMARY = 'td-primary font-bold text-white rounded-xl transition';
const BTN_GHOST =
  'bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 font-bold rounded-xl transition';
const fmtUSD = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
function TerminalStyles() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
html,body,#root,#__next{margin:0!important;padding:0!important;width:100%!important;max-width:none!important;min-height:100%;border:0!important;display:block!important;text-align:left!important;background:#F4F7FB}
body{overflow-x:hidden}
.td-root{
width:100%; max-width:none; min-height:100vh; min-height:100dvh; margin:0; border:0;
--td-blue:#2563EB; --td-blue-dark:#1D4ED8; --td-blue-soft:#EFF6FF; --td-blue-line:#BFDBFE;
--td-bg:#F4F7FB; --td-line:#E2E8F0; --td-ink:#0F172A;
font-family:'Inter',ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
-webkit-font-smoothing:antialiased; background:var(--td-bg); color:var(--td-ink);
}
.td-num{font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}
@keyframes tdFadeUp{from{opacity:0;transform:translate3d(0,10px,0)}to{opacity:1;transform:none}}
@keyframes tdPulseRing{0%{transform:scale(.85);opacity:.9}70%{transform:scale(2.2);opacity:0}100%{opacity:0}}
@keyframes tdMarquee{from{transform:translate3d(0,0,0)}to{transform:translate3d(-50%,0,0)}}
@keyframes tdFlashUp{0%{background-color:rgba(16,185,129,.22)}100%{background-color:transparent}}
@keyframes tdFlashDown{0%{background-color:rgba(244,63,94,.20)}100%{background-color:transparent}}
@keyframes tdGlow{0%,100%{opacity:.5}50%{opacity:1}}
@keyframes tdSpin{to{transform:rotate(360deg)}}
@keyframes tdToast{0%{opacity:0;transform:translate3d(0,12px,0)}12%{opacity:1;transform:none}88%{opacity:1;transform:none}100%{opacity:0;transform:translate3d(0,12px,0)}}
.td-enter{animation:tdFadeUp .4s cubic-bezier(.16,1,.3,1) both}
.td-glow{animation:tdGlow 3.2s ease-in-out infinite}
.td-spin{animation:tdSpin 1.1s linear infinite}
.td-toast{animation:tdToast 2.6s ease both}
.td-flash-up{animation:tdFlashUp .7s ease-out}
.td-flash-down{animation:tdFlashDown .7s ease-out}
.td-marquee{display:flex;width:max-content;animation:tdMarquee 48s linear infinite}
.td-marquee:hover{animation-play-state:paused}
.td-fade-x{-webkit-mask-image:linear-gradient(90deg,transparent,#000 4%,#000 96%,transparent);mask-image:linear-gradient(90deg,transparent,#000 4%,#000 96%,transparent)}
.td-panel{background:#fff;border:1px solid var(--td-line);box-shadow:0 1px 2px rgba(15,23,42,.04),0 10px 28px -14px rgba(30,64,175,.16)}
.td-inset{background:#F8FAFC;border:1px solid var(--td-line)}
.td-field{background:#fff;border:1px solid #CBD5E1;color:var(--td-ink);transition:border-color .15s,box-shadow .15s}
.td-field::placeholder{color:#94A3B8}
.td-field:focus{outline:none;border-color:var(--td-blue);box-shadow:0 0 0 3px rgba(37,99,235,.16)}
.td-row{transition:background-color .18s,border-color .18s,box-shadow .18s}
.td-row:hover{background-color:var(--td-blue-soft)}
.td-primary{background:linear-gradient(96deg,#2563EB,#1D4ED8);box-shadow:0 8px 18px -10px rgba(37,99,235,.75)}
.td-primary:hover{filter:brightness(1.08)}
.td-buy{background:linear-gradient(96deg,#16A34A,#059669);transition:filter .25s,transform .25s,box-shadow .25s}
.td-buy:hover{filter:brightness(1.08);transform:translateY(-2px);box-shadow:0 14px 26px -14px rgba(5,150,105,.9)}
.td-sell{background:linear-gradient(96deg,#E11D48,#DC2626);transition:filter .25s,transform .25s,box-shadow .25s}
.td-sell:hover{filter:brightness(1.08);transform:translateY(-2px);box-shadow:0 14px 26px -14px rgba(225,29,72,.9)}
.td-scroll{scrollbar-width:thin;scrollbar-color:rgba(100,116,139,.35) transparent}
.td-scroll::-webkit-scrollbar{width:7px;height:7px}
.td-scroll::-webkit-scrollbar-track{background:transparent}
.td-scroll::-webkit-scrollbar-thumb{background:rgba(100,116,139,.3);border-radius:99px}
.td-scroll::-webkit-scrollbar-thumb:hover{background:rgba(37,99,235,.55)}
.td-bottomnav{padding-bottom:env(safe-area-inset-bottom)}
.td-root a:focus-visible,.td-root button:focus-visible,.td-root select:focus-visible,.td-root [role="button"]:focus-visible{outline:2px solid var(--td-blue);outline-offset:2px;border-radius:10px}
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
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 grid grid-rows-4 grid-cols-6 opacity-60 pointer-events-none">
        {[...Array(24)].map((_, i) => (
          <div key={i} className="border-r border-b border-slate-200" />
        ))}
      </div>
      <div className="h-full w-full flex items-end justify-between space-x-1.5 p-4 pt-10 relative z-10">
        {[40, 55, 35, 60, 75, 50, 65, 80, 70, 85, 90, 60, 75, 95, 80, 100].map((h, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end">
            <div className="w-0.5 bg-slate-300 h-full" />
            <div
              style={{ height: `${h}%` }}
              className={`w-full rounded-sm transition-all duration-500 ${
                idx % 2 === 0 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-gradient-to-t from-rose-600 to-rose-400'
              }`}
            />
          </div>
        ))}
      </div>
      <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center">
        <span className="text-[11px] td-num text-slate-600 bg-white/90 border border-slate-200 rounded-full px-3 py-1">
          Offline preview — chart feed unavailable
        </span>
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
          theme: 'light',
          style: '1',
          locale: 'en',
          timezone: 'Etc/UTC',
          toolbar_bg: '#F8FAFC',
          hide_top_toolbar: false,
          hide_legend: false,
          allow_symbol_change: false,
          save_image: false,
          withdateranges: true,
          details: false,
          backgroundColor: 'rgba(255,255,255,1)',
          gridColor: 'rgba(15,23,42,0.06)',
          studies: [],
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
      } catch (e) {
        /* widget already torn down */
      }
      if (holderRef.current) holderRef.current.innerHTML = '';
    };
  }, [tvSymbol, interval]);
  if (status === 'failed') return <FallbackCandles />;
  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden td-inset">
      <div ref={holderRef} className="h-full w-full" />
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white">
          <RefreshCw className="w-5 h-5 text-blue-600 td-spin" />
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
    if (Number.isFinite(value) && Number.isFinite(prev.current)) {
      if (value > prev.current) setDir('up');
      else if (value < prev.current) setDir('down');
    }
    prev.current = value;
    const t = setTimeout(() => setDir(null), 700);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <span
      className={`td-num inline-block rounded px-1 ${className} ${dir === 'up' ? 'td-flash-up text-emerald-700' : dir === 'down' ? 'td-flash-down text-rose-600' : ''}`}
    >
      {Number.isFinite(value) ? Number(value).toFixed(digits) : '—'}
    </span>
  );
}
/* ---- Profile field: only renders what actually exists on the account ---- */
function ProfileField({ icon: Icon, label, value }) {
  const has = value !== undefined && value !== null && String(value).trim() !== '';
  return (
    <div className="td-inset rounded-xl p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase mb-2">
        <Icon className="w-3.5 h-3.5 text-blue-600" />
        <span>{label}</span>
      </div>
      {has ? (
        <div className="text-sm font-semibold text-slate-900 break-words">{String(value)}</div>
      ) : (
        <div className="text-sm text-slate-400 italic">Not on file</div>
      )}
    </div>
  );
}
/* ---- Small shared pieces ---- */
function PanelTitle({ icon: Icon, children, right }) {
  return (
    <div className="flex justify-between items-center gap-3 mb-4 pb-3 border-b border-slate-200">
      <h3 className="text-xs font-bold uppercase tracking-wide text-blue-700 flex items-center gap-2">
        <Icon className="w-4 h-4" />
        <span>{children}</span>
      </h3>
      {right}
    </div>
  );
}
// ==========================================
// 5. ACCOUNT PERSISTENCE + VALUATION HELPERS
// ==========================================
// Each trader gets a dedicated record (balance + open positions) keyed by their
// id/email. It is independent of the session object, so logging out and back in
// can never reset it to the default balance.
const ACCOUNT_STORE_PREFIX = 'meridian_account_v1:';
// Any user "directory" arrays the login / CRM layer may keep; mirrored best-effort.
const USER_DIRECTORY_KEYS = ['users', 'registered_users', 'all_users', 'crm_users', 'platform_users'];

const getAccountKey = (user) => {
  const k = user && (user.id ?? user._id ?? user.clientId ?? user.email ?? user.username);
  return k ? String(k).trim().toLowerCase() : null;
};

const readAccount = (key) => {
  try {
    const raw = localStorage.getItem(ACCOUNT_STORE_PREFIX + key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const balance = parseFloat(data?.balance);
    return {
      balance: Number.isFinite(balance) ? balance : null,
      positions: Array.isArray(data?.positions) ? data.positions : [],
    };
  } catch (e) {
    return null;
  }
};

const sameUser = (a, b) => {
  const ka = getAccountKey(a);
  return !!ka && ka === getAccountKey(b);
};

const writeAccount = (user, balance, positions) => {
  const key = getAccountKey(user);
  if (!key) return;
  try {
    // 1) Dedicated per-account record (source of truth)
    localStorage.setItem(ACCOUNT_STORE_PREFIX + key, JSON.stringify({ balance, positions }));
    // 2) Active session object
    const updatedUser = { ...user, balance, balanceUSD: balance };
    localStorage.setItem('current_user', JSON.stringify(updatedUser));
    // 3) Mirror into any user directory the login layer reads from
    USER_DIRECTORY_KEYS.forEach((dirKey) => {
      const raw = localStorage.getItem(dirKey);
      if (!raw) return;
      let list;
      try {
        list = JSON.parse(raw);
      } catch (e) {
        return;
      }
      if (!Array.isArray(list)) return;
      let touched = false;
      const next = list.map((u) => {
        if (sameUser(u, user)) {
          touched = true;
          return { ...u, balance, balanceUSD: balance };
        }
        return u;
      });
      if (touched) localStorage.setItem(dirKey, JSON.stringify(next));
    });
  } catch (e) {
    /* storage full / unavailable: keep trading in memory */
  }
};

const contractMultiplierFor = (symbol) => (MULTI_ASSET_REGISTRY[symbol]?.category === 'Forex' ? 100000 : 100);

const round2 = (n) => parseFloat(Number(n).toFixed(2));

// ---------- Live quote helpers ----------
const fmtPnl = (p) => (p === null || p === undefined ? '—' : p >= 0 ? `+$${p.toFixed(2)}` : `-$${Math.abs(p).toFixed(2)}`);
const pnlColor = (p) => (p === null || p === undefined ? 'text-slate-400' : p >= 0 ? 'text-emerald-700' : 'text-rose-600');
const isQuoteLive = (q) => !!q && q.tradeable !== false && !q.stale;
const fmtPrice = (v, digits) => (Number.isFinite(v) ? Number(v).toFixed(digits) : '—');
const quoteMid = (q) => (q ? (q.bid + q.ask) / 2 : null);
const quoteChangePct = (q) => (q && q.open ? ((quoteMid(q) - q.open) / q.open) * 100 : null);
const formatSpread = (asset, q) => {
  if (!q) return '—';
  const diff = q.ask - q.bid;
  if (asset.category === 'Forex') {
    const pip = asset.digits >= 4 ? 0.0001 : 0.01; // JPY-style pairs: 0.01
    return `${(diff / pip).toFixed(1)} pips`;
  }
  return diff.toFixed(asset.digits);
};

// P&L is computed in the pair's quote currency; convert it to USD with live rates.
const quoteToUsd = (symbol, quotes) => {
  if (!symbol.includes('/')) return 1;
  const quoteCcy = symbol.split('/')[1];
  if (quoteCcy === 'USD') return 1;
  const direct = quotes[`${quoteCcy}/USD`];
  if (direct) return quoteMid(direct);
  const inverse = quotes[`USD/${quoteCcy}`];
  if (inverse) return 1 / quoteMid(inverse);
  return null;
};

/* ---- Live quote subscription ----
   Primary transport is the back end's WebSocket (full snapshot on connect, then
   incremental ticks). If the socket drops, quotes are polled over HTTP until it
   reconnects; if both fail, every quote is flagged stale so nothing can trade on
   an old price. */
function useLiveQuotes() {
  const [quotes, setQuotes] = useState({});
  const [feed, setFeed] = useState({ status: 'connecting', lastTick: null, feeds: null });
  useEffect(() => {
    let alive = true;
    let ws = null;
    let reconnectTimer = null;
    let pollTimer = null;
    let watchdog = null;
    let attempt = 0;
    let lastMsg = 0;
    let pollFailures = 0;

    const merge = (incoming, full, meta) => {
      if (!alive || !incoming) return;
      setQuotes((prev) => {
        const next = full ? {} : { ...prev };
        Object.keys(incoming).forEach((sym) => {
          const q = incoming[sym];
          if (q && Number.isFinite(q.bid) && Number.isFinite(q.ask)) next[sym] = q;
        });
        return next;
      });
      setFeed((f) => ({ status: meta.status, lastTick: Date.now(), feeds: meta.feeds || f.feeds }));
    };

    const markAllStale = () =>
      setQuotes((prev) => {
        const next = {};
        Object.keys(prev).forEach((k) => {
          next[k] = { ...prev[k], stale: true };
        });
        return next;
      });

    const base = () => QUOTE_HTTP_URL || '';
    const poll = async () => {
      try {
        const res = await fetch(`${base()}/api/quotes`, { cache: 'no-store' });
        const body = await res.json();
        if (!res.ok || !body.quotes) throw new Error('bad response');
        pollFailures = 0;
        merge(body.quotes, true, { status: 'polling', feeds: body.feeds });
      } catch (e) {
        pollFailures += 1;
        if (alive && pollFailures >= 2) {
          setFeed((f) => ({ ...f, status: 'offline' }));
          markAllStale();
        }
      }
    };
    const startPolling = () => {
      if (pollTimer) return;
      poll();
      pollTimer = setInterval(poll, QUOTE_POLL_MS);
    };
    const stopPolling = () => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
      pollFailures = 0;
    };

    const connect = () => {
      if (!alive) return;
      const url = QUOTE_WS_URL || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;
      try {
        ws = new WebSocket(url);
      } catch (e) {
        startPolling();
        reconnectTimer = setTimeout(connect, 3000);
        return;
      }
      const socket = ws;
      socket.onopen = () => {
        attempt = 0;
        lastMsg = Date.now();
        stopPolling();
      };
      socket.onmessage = (evt) => {
        lastMsg = Date.now();
        let msg;
        try {
          msg = JSON.parse(evt.data);
        } catch (e) {
          return;
        }
        if (msg && msg.type === 'MARKET_TICK' && msg.data) {
          merge(msg.data.prices || {}, !!msg.data.full, { status: 'live', feeds: msg.data.feeds });
        }
      };
      socket.onclose = () => {
        if (!alive || socket !== ws) return;
        setFeed((f) => ({ ...f, status: f.status === 'offline' ? 'offline' : 'polling' }));
        startPolling();
        const delay = Math.min(1000 * 2 ** attempt, 10000);
        attempt += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
      socket.onerror = () => {
        try {
          socket.close();
        } catch (e) {
          /* noop */
        }
      };
    };

    // A socket that stays open but silent is as bad as a closed one.
    watchdog = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN && Date.now() - lastMsg > QUOTE_SILENCE_MS) {
        try {
          ws.close();
        } catch (e) {
          /* noop */
        }
      }
    }, 2000);

    connect();
    return () => {
      alive = false;
      clearTimeout(reconnectTimer);
      clearInterval(watchdog);
      stopPolling();
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        try {
          ws.close();
        } catch (e) {
          /* noop */
        }
      }
    };
  }, []);
  return { quotes, feed };
}

export default function TradingDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('assets');
  const [selectedCountry, setSelectedCountry] = useState('Philippines');
  const [kycState, setKycState] = useState({
    status: 'unverified',
    fullName: '',
    idNumber: '',
    documentType: 'Passport',
  });
  const kycFileInputRef = useRef(null);
  const [kycFile, setKycFile] = useState(null);
  const [kycFileError, setKycFileError] = useState('');
  const handleKycFile = (file) => {
    if (!file) return;
    const typeOk =
      ['image/png', 'image/jpeg', 'application/pdf'].includes(file.type) || (!file.type && /\.(png|jpe?g|pdf)$/i.test(file.name));
    if (!typeOk) {
      setKycFile(null);
      setKycFileError('Unsupported file type. Please upload a PNG, JPG or PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setKycFile(null);
      setKycFileError('File is too large. Maximum size is 10MB.');
      return;
    }
    setKycFileError('');
    setKycFile(file);
  };
  const [currentUser, setCurrentUser] = useState(null);
  // Financial state. `balanceUSD` and the raw open positions are persisted per account.
  // Equity is NOT stored: it is derived below (balance + total floating PnL).
  const [balanceUSD, setBalanceUSD] = useState(0.0);
  const [positionsState, setPositionsState] = useState([]);
  const [accountKey, setAccountKey] = useState(null); // set only once hydration has finished
  const [marginUsed] = useState(0.0);
  const accountKeyRef = useRef(null);
  // Hydrate once per account: the saved record wins over whatever balance the
  // session object carries (which may have been reset to the default at login).
  useEffect(() => {
    const syncUserData = () => {
      try {
        const raw = localStorage.getItem('current_user');
        if (!raw) return;
        const user = JSON.parse(raw);
        const key = getAccountKey(user);
        setCurrentUser((prev) => (JSON.stringify(prev) === JSON.stringify(user) ? prev : user));
        if (key && key !== accountKeyRef.current) {
          const saved = readAccount(key);
          const sessionBalance = parseFloat(user.balance ?? user.balanceUSD ?? 0.0) || 0;
          accountKeyRef.current = key;
          // Batched: balance, positions and key land in the same render, so the
          // save effect can never write default values over the stored record.
          setBalanceUSD(saved && saved.balance !== null ? saved.balance : sessionBalance);
          setPositionsState(saved ? saved.positions : []);
          setAccountKey(key);
        }
      } catch (e) {
        setCurrentUser(null);
      }
    };
    syncUserData();
    const interval = setInterval(syncUserData, 2000); // detects account switches only
    return () => clearInterval(interval);
  }, []);
  // Persist balance + open positions whenever they change (after hydration only).
  // Positions are saved as raw trade data; PnL is always recomputed from live prices.
  const positionsSig = positionsState.map((p) => p.id).join(',');
  useEffect(() => {
    if (!accountKey || !currentUser) return;
    writeAccount(currentUser, balanceUSD, positionsState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountKey, balanceUSD, positionsSig]);
  // Keep other tabs of the same account in sync
  useEffect(() => {
    if (!accountKey) return;
    const onStorage = (e) => {
      if (e.key !== ACCOUNT_STORE_PREFIX + accountKey || !e.newValue) return;
      const saved = readAccount(accountKey);
      if (!saved) return;
      if (saved.balance !== null) setBalanceUSD(saved.balance);
      setPositionsState(saved.positions);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [accountKey]);
  // Active Selected Market Ticker
  const [selectedAssetKey, setSelectedAssetKey] = useState('EUR/USD');
  const { quotes, feed } = useLiveQuotes();
  // Order Ticket State
  const [orderVolume, setOrderVolume] = useState('1.00');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  // Real-time valuation: every position is marked to the live market on each quote
  // update. Longs are valued at the bid (what you could sell at), shorts at the ask
  // (what it costs to buy back); P&L is converted to USD with live FX rates.
  // Positions saved before the live feed existed (no `live` flag) were opened at
  // simulated prices, so they are carried flat at 0 P&L instead of being compared
  // with real quotes.
  const openPositions = useMemo(
    () =>
      positionsState.map((pos) => {
        const q = quotes[pos.symbol];
        if (pos.live !== true) {
          return { ...pos, legacy: true, currentPrice: pos.openPrice, closable: true, pnl: 0 };
        }
        if (!q) return { ...pos, currentPrice: null, closable: false, pnl: null };
        const currentPrice = pos.type === 'BUY' ? q.bid : q.ask;
        const conv = quoteToUsd(pos.symbol, quotes);
        const priceDelta = pos.type === 'BUY' ? currentPrice - pos.openPrice : pos.openPrice - currentPrice;
        return {
          ...pos,
          currentPrice,
          closable: isQuoteLive(q),
          pnl: conv === null ? null : round2(priceDelta * pos.volume * contractMultiplierFor(pos.symbol) * conv),
        };
      }),
    [positionsState, quotes],
  );
  const floatingPnL = useMemo(() => round2(openPositions.reduce((sum, p) => sum + (p.pnl || 0), 0)), [openPositions]);
  // Equity = Balance + total floating PnL of all active positions
  const equityUSD = round2(balanceUSD + floatingPnL);
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
    paymentDetails: '',
  });
  // Filter Assets by Category
  const [assetCategoryFilter, setAssetCategoryFilter] = useState('ALL');
  // Presentation-only state
  const [assetSearch, setAssetSearch] = useState('');
  const [chartInterval, setChartInterval] = useState('60');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  // Close the account menu with Escape
  useEffect(() => {
    if (!accountMenuOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setAccountMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [accountMenuOpen]);
  // Scroll back to the top whenever the view changes
  useEffect(() => {
    try {
      window.scrollTo({ top: 0 });
    } catch (e) {
      /* non-browser env */
    }
  }, [activeTab]);
  const activeAsset = MULTI_ASSET_REGISTRY[selectedAssetKey];
  const activeQuote = quotes[selectedAssetKey] || null;
  const activeBid = activeQuote ? activeQuote.bid : null;
  const activeAsk = activeQuote ? activeQuote.ask : null;
  const canTrade = isQuoteLive(activeQuote) && feed.status !== 'offline';
  const tradeBlockReason = !activeQuote
    ? 'No live quote for this instrument.'
    : feed.status === 'offline'
      ? 'Price feed offline.'
      : activeQuote.tradeable === false || activeQuote.stale
        ? 'Market closed or quote stale.'
        : '';
  const activeCryptoConfig = REGIONAL_CRYPTO_CONFIG[selectedCountry];
  const goTo = (key) => {
    setActiveTab(key);
    setAccountMenuOpen(false);
  };
  const showToast = (msg) => {
    setToast({ msg, id: Date.now() });
    setTimeout(() => setToast(null), 2600);
  };
  const handleExecuteTrade = (type) => {
    if (!canTrade) {
      showToast(tradeBlockReason || 'Trading unavailable.');
      return;
    }
    const vol = parseFloat(orderVolume) || 0.1;
    // Fill at the real market: buyers lift the ask, sellers hit the bid.
    const fillPrice = type === 'BUY' ? activeAsk : activeBid;
    const newPosition = {
      id: Date.now() * 1000 + Math.floor(Math.random() * 1000),
      symbol: selectedAssetKey,
      type: type,
      live: true,
      volume: vol,
      openPrice: fillPrice,
      sl: parseFloat(stopLoss) || 0,
      tp: parseFloat(takeProfit) || 0,
      time: new Date().toLocaleTimeString(),
    };
    setPositionsState((prev) => [newPosition, ...prev]);
    showToast(`${type} ${vol} lots ${selectedAssetKey} @ ${fillPrice.toFixed(activeAsset.digits)}`);
  };
  const handleClosePosition = (posId) => {
    const targetPos = openPositions.find((p) => p.id === posId); // carries live PnL
    if (!targetPos) return;
    if (!targetPos.closable || targetPos.pnl === null) {
      showToast('Cannot close right now: no live quote (market closed or feed down).');
      return;
    }
    // Realise PnL into the balance and drop the position in one batched update;
    // the persistence effect then saves both together.
    setBalanceUSD((prev) => round2(prev + (targetPos.pnl || 0)));
    setPositionsState((prev) => prev.filter((p) => p.id !== posId));
  };
  const handleLogout = () => {
    // Flush the latest state before leaving so nothing is lost
    if (accountKey && currentUser) writeAccount(currentUser, balanceUSD, positionsState);
    navigate('/');
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
  const filteredAssets = Object.keys(MULTI_ASSET_REGISTRY).filter((key) => {
    if (assetCategoryFilter === 'ALL') return true;
    return MULTI_ASSET_REGISTRY[key].category.toUpperCase() === assetCategoryFilter.toUpperCase();
  });
  const visibleAssets = useMemo(() => {
    const q = assetSearch.trim().toLowerCase();
    if (!q) return filteredAssets;
    return filteredAssets.filter((k) => k.toLowerCase().includes(q) || MULTI_ASSET_REGISTRY[k].name.toLowerCase().includes(q));
  }, [filteredAssets, assetSearch]);
  const totalAssets = Object.keys(MULTI_ASSET_REGISTRY).length;
  const tickerStrip = useMemo(
    () => [
      'EUR/USD',
      'GBP/USD',
      'USD/JPY',
      'XAU/USD',
      'BTC/USD',
      'ETH/USD',
      'NAS100',
      'US30',
      'USOIL',
      'AAPL',
      'NVDA',
      'TSLA',
      'SPX500',
      'XAG/USD',
    ],
    [],
  );
  const freeMargin = equityUSD - marginUsed;
  const marginLevel = marginUsed > 0 ? (equityUSD / marginUsed) * 100 : 0;
  const isSecondary = SECONDARY_TABS.some((t) => t.key === activeTab);
  const activeChangePct = quoteChangePct(activeQuote) ?? 0;
  const liveQuoteCount = Object.keys(MULTI_ASSET_REGISTRY).filter((k) => isQuoteLive(quotes[k])).length;
  const feedUi = {
    live: { dot: 'bg-emerald-500', label: 'Live market feed' },
    polling: { dot: 'bg-amber-500', label: 'Live (HTTP fallback)' },
    connecting: { dot: 'bg-amber-500', label: 'Connecting to feed…' },
    offline: { dot: 'bg-rose-500', label: 'Feed offline' },
  }[feed.status] || { dot: 'bg-amber-500', label: 'Connecting to feed…' };
  const kycBadge =
    kycState.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200';
  /* ---------- Reusable blocks ---------- */
  const activeAssetBar = (
    <div className="td-panel rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Selected instrument</div>
        <div className="flex items-center gap-2 mt-0.5 min-w-0">
          <span className="td-num text-base font-extrabold text-slate-900">{selectedAssetKey}</span>
          <span className="td-num text-[11px] text-slate-500 truncate hidden sm:inline">{activeAsset.name}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <PriceTick value={activeBid} digits={activeAsset.digits} className="text-base font-extrabold text-slate-900" />
        <button onClick={() => goTo('assets')} className={`${BTN_GHOST} px-3 py-2 text-xs`}>
          Change
        </button>
      </div>
    </div>
  );
  return (
    <div className="td-root w-full min-h-screen flex flex-col selection:bg-blue-600 selection:text-white">
      <TerminalStyles />
      {/* HEADER / TOP NAVIGATION BAR */}
      <header className="bg-white/90 border-b border-slate-200 px-4 sm:px-6 py-3 flex justify-between items-center gap-3 sticky top-0 z-40 backdrop-blur-xl">
        <div className="flex items-center gap-5 min-w-0">
          <div className="flex items-center gap-3 cursor-pointer group shrink-0" onClick={() => navigate('/')}>
            <div className="relative p-2 bg-blue-50 border border-blue-200 rounded-xl group-hover:border-blue-400 transition">
              <Shield className="w-5 h-5 text-blue-600 group-hover:scale-110 transition" />
            </div>
            <div className="leading-none">
              <span className="text-sm font-extrabold tracking-tight text-slate-900 block group-hover:text-blue-700 transition">
                Meridian
              </span>
              <span className="td-num text-[9px] text-blue-600 tracking-[0.3em] uppercase font-bold">Markets</span>
            </div>
          </div>
          {/* Desktop tab bar */}
          <nav
            className="hidden md:flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs font-semibold"
            aria-label="Primary"
          >
            {PRIMARY_TABS.map((item) => (
              <button
                key={item.key}
                onClick={() => goTo(item.key)}
                aria-current={activeTab === item.key ? 'page' : undefined}
                className={`px-3.5 py-2 rounded-lg transition duration-200 flex items-center gap-2 ${
                  activeTab === item.key
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
                    : 'text-slate-600 hover:text-blue-700 hover:bg-white'
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 px-3 sm:px-4 py-1.5 rounded-xl td-num shrink-0"
            title="Account balance"
            aria-label="Account balance"
          >
            <Wallet className="w-4 h-4 text-blue-300" />
            <div className="leading-tight">
              <div className="text-[9px] uppercase tracking-[0.18em] text-slate-400 font-semibold">Balance</div>
              <div className="text-sm text-white font-extrabold">{fmtUSD(balanceUSD)}</div>
            </div>
          </div>
          <div
            className="hidden sm:flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl text-xs td-num"
            title="Equity = Balance + floating PnL"
          >
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-slate-500 hidden md:inline">Equity:</span>
            <span className="text-blue-700 font-extrabold">{fmtUSD(equityUSD)}</span>
          </div>
          <button
            onClick={() => setIsWithdrawOpen(true)}
            className={`${BTN_GHOST} px-3 sm:px-4 py-2 text-xs flex items-center gap-1.5`}
            title="Withdraw"
          >
            <ArrowUpRight className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Withdraw</span>
          </button>
          {/* Account menu: Deposit / KYC / Profile / Gateway */}
          <div className="relative">
            <button
              onClick={() => setAccountMenuOpen((v) => !v)}
              aria-expanded={accountMenuOpen}
              aria-haspopup="menu"
              className={`p-2 sm:px-3 border rounded-xl transition flex items-center gap-2 text-xs font-bold ${
                accountMenuOpen || isSecondary
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-700'
              }`}
              title="Account menu"
            >
              {accountMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              <span className="hidden lg:inline">Account</span>
            </button>
            {accountMenuOpen && (
              <>
                <button aria-label="Close menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setAccountMenuOpen(false)} />
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] td-panel rounded-2xl p-2 z-50 td-enter"
                >
                  {SECONDARY_TABS.map((item) => (
                    <button
                      key={item.key}
                      role="menuitem"
                      onClick={() => goTo(item.key)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold text-left flex items-center gap-3 transition ${
                        activeTab === item.key ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  ))}
                  <div className="my-2 border-t border-slate-200" />
                  <div className="px-3.5 py-2">
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-600" /> Deposit gateway
                    </label>
                    <select
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      className="td-field w-full rounded-lg px-3 py-2 text-sm font-semibold cursor-pointer"
                    >
                      {Object.keys(REGIONAL_CRYPTO_CONFIG).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="my-2 border-t border-slate-200" />
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold text-left flex items-center gap-3 text-rose-600 hover:bg-rose-50 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      {/* LIVE TICKER STRIP */}
      <div className="bg-white border-b border-slate-200 py-2 td-fade-x overflow-hidden">
        <div className="td-marquee gap-7 pr-7">
          {[...tickerStrip, ...tickerStrip].map((sym, i) => {
            const cfg = MULTI_ASSET_REGISTRY[sym];
            if (!cfg) return null;
            const tq = quotes[sym];
            if (!tq) return null;
            const px = tq.bid;
            const up = (quoteChangePct(tq) ?? 0) >= 0;
            return (
              <button
                key={`${sym}-${i}`}
                onClick={() => {
                  setSelectedAssetKey(sym);
                  goTo('charts');
                }}
                className="flex items-center gap-2 text-[11px] whitespace-nowrap hover:opacity-70 transition"
              >
                <span className="font-semibold text-slate-500">{sym}</span>
                <span className="td-num text-slate-900">{fmtPrice(px, cfg.digits)}</span>
                {up ? <ArrowUpRight className="w-3 h-3 text-emerald-600" /> : <ArrowDownRight className="w-3 h-3 text-rose-600" />}
              </button>
            );
          })}
        </div>
      </div>
      {/* MAIN CONTAINER */}
      <main className="flex-1 p-4 sm:p-6 pb-28 md:pb-8 w-full max-w-none">
        {/* ======================= VIEW 1: ASSETS ======================= */}
        {activeTab === 'assets' && (
          <div className="space-y-4 td-enter">
            <div className="td-panel rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    Assets Watchlist
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Live market quotes. Tap an instrument to select it, then open its chart or trade it.
                  </p>
                </div>
                <div className="flex items-center gap-3 td-num text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${feedUi.dot} td-glow`} />
                    {feedUi.label}
                  </span>
                  <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-semibold">
                    {liveQuoteCount}/{totalAssets} quoting
                  </span>
                </div>
              </div>
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="relative lg:w-80 shrink-0">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    placeholder="Search symbol or name…"
                    className="td-field w-full rounded-xl pl-10 pr-3 py-2.5 text-sm"
                  />
                </div>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] font-bold overflow-x-auto td-scroll">
                  {ASSET_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setAssetCategoryFilter(cat)}
                      className={`px-3 py-2 rounded-lg transition shrink-0 ${
                        assetCategoryFilter === cat
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                          : 'text-slate-600 hover:text-blue-700 hover:bg-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {visibleAssets.length === 0 && (
              <div className="td-panel rounded-2xl text-center py-14 text-sm text-slate-500">No instruments match that search.</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {visibleAssets.map((symbol) => {
                const asset = MULTI_ASSET_REGISTRY[symbol];
                const q = quotes[symbol];
                const price = q ? q.bid : null;
                const isSelected = selectedAssetKey === symbol;
                const changePct = quoteChangePct(q);
                const up = (changePct ?? 0) >= 0;
                const quoteOk = isQuoteLive(q);
                return (
                  <div
                    key={symbol}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedAssetKey(symbol)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedAssetKey(symbol);
                      }
                    }}
                    className={`td-row p-3.5 rounded-2xl border cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 shadow-md shadow-blue-600/10'
                        : 'bg-white border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <span className="truncate">{symbol}</span>
                          <span className="td-num text-[10px] text-slate-500 font-medium bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 shrink-0">
                            {asset.category}
                          </span>
                        </div>
                        <div className="td-num text-[11px] text-amber-700 mt-1">
                          {q ? (
                            <>
                              Ask {fmtPrice(q.ask, asset.digits)} · Spread {formatSpread(asset, q)}
                            </>
                          ) : (
                            'No live feed'
                          )}
                          {q && !quoteOk && <span className="ml-1.5 text-slate-500">(closed)</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <PriceTick
                          value={price}
                          digits={asset.digits}
                          className={`text-sm font-bold ${isSelected ? 'text-blue-700' : 'text-slate-900'}`}
                        />
                        <div
                          className={`flex items-center justify-end gap-0.5 text-[11px] font-bold ${changePct === null ? 'text-slate-400' : up ? 'text-emerald-700' : 'text-rose-600'}`}
                        >
                          {changePct !== null && (up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}
                          <span className="td-num">{changePct === null ? '—' : `${changePct.toFixed(2)}%`}</span>
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-blue-200">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            goTo('charts');
                          }}
                          className={`${BTN_GHOST} py-2 text-xs flex items-center justify-center gap-1.5`}
                        >
                          <CandlestickChart className="w-3.5 h-3.5" /> View chart
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            goTo('order');
                          }}
                          className={`${BTN_PRIMARY} py-2 text-xs flex items-center justify-center gap-1.5`}
                        >
                          <Zap className="w-3.5 h-3.5" /> Trade
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* ================= VIEW 2: ACCOUNT & CHARTS ================= */}
        {activeTab === 'charts' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 td-enter">
            {/* Account summary */}
            <div className="lg:col-span-3 space-y-3">
              <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
                {[
                  {
                    l: 'Equity',
                    v: fmtUSD(equityUSD),
                    c: 'text-blue-700',
                    i: TrendingUp,
                    sub: `Floating P&L ${floatingPnL >= 0 ? '+' : '-'}${fmtUSD(Math.abs(floatingPnL))}`,
                  },
                  { l: 'Free Margin', v: fmtUSD(freeMargin), c: 'text-emerald-700', i: Layers },
                  { l: 'Margin Level', v: `${marginLevel.toFixed(2)}%`, c: 'text-amber-700', i: Gauge },
                ].map((s, i) => (
                  <div key={i} className="td-panel rounded-2xl p-4">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                      <s.i className="w-3.5 h-3.5 text-blue-600" />
                      {s.l}
                    </div>
                    <div className={`td-num text-lg font-bold truncate ${s.c}`}>{s.v}</div>
                    {s.sub && (
                      <div className={`td-num text-[11px] mt-0.5 ${floatingPnL >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{s.sub}</div>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => goTo('order')}
                className={`${BTN_PRIMARY} w-full py-3.5 text-sm flex items-center justify-center gap-2`}
              >
                <Zap className="w-4 h-4" /> Trade {selectedAssetKey}
              </button>
            </div>
            {/* Chart */}
            <div className="lg:col-span-9">
              <div className="td-panel rounded-2xl p-4 sm:p-5 h-[540px] sm:h-[600px] lg:h-[680px] flex flex-col relative overflow-hidden">
                <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <select
                      value={selectedAssetKey}
                      onChange={(e) => setSelectedAssetKey(e.target.value)}
                      aria-label="Chart instrument"
                      className="td-field td-num rounded-xl pl-3 pr-8 py-2 text-base font-extrabold cursor-pointer max-w-[170px]"
                    >
                      {Object.keys(MULTI_ASSET_REGISTRY).map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                    <span className="td-num text-[11px] bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200 truncate max-w-[220px] hidden sm:inline">
                      {activeAsset.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-[11px] font-bold">
                      {CHART_INTERVALS.map((iv) => (
                        <button
                          key={iv.value}
                          onClick={() => setChartInterval(iv.value)}
                          className={`px-2.5 py-1.5 rounded-md transition ${
                            chartInterval === iv.value
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-600 hover:text-blue-700 hover:bg-white'
                          }`}
                        >
                          {iv.label}
                        </button>
                      ))}
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wide">Bid</div>
                      <PriceTick
                        value={activeBid}
                        digits={activeAsset.digits}
                        className={`text-base font-extrabold ${activeChangePct >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex-1 my-4 min-h-0">
                  <TradingViewChart tvSymbol={activeAsset.tv} interval={chartInterval} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 justify-between items-center text-[11px] text-slate-500 td-num pt-3 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span
                        className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-70"
                        style={{ animation: 'tdPulseRing 1.8s ease-out infinite' }}
                      />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span>{feedUi.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CandlestickChart className="w-3.5 h-3.5 text-blue-600" />
                    <span>Chart: {activeAsset.tv}</span>
                  </div>
                  <div>Leverage Mode: 1:500 ECN Direct</div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ================= VIEW 3: ORDER EXECUTION ================= */}
        {activeTab === 'order' && (
          <div className="space-y-4 td-enter">
            {activeAssetBar}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Trade ticket */}
              <div className="lg:col-span-5 xl:col-span-4 td-panel rounded-2xl p-5">
                <PanelTitle
                  icon={Zap}
                  right={
                    <span className="td-num text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded font-semibold">
                      Market Instant
                    </span>
                  }
                >
                  Order Ticket
                </PanelTitle>
                <div className="mb-5 grid grid-cols-2 gap-2.5">
                  <div className="td-inset rounded-xl p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-600 mb-1">Sell / Bid</div>
                    <PriceTick value={activeBid} digits={activeAsset.digits} className="text-base font-bold text-slate-900" />
                  </div>
                  <div className="td-inset rounded-xl p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 mb-1">Buy / Ask</div>
                    <PriceTick value={activeAsk} digits={activeAsset.digits} className="text-base font-bold text-slate-900" />
                  </div>
                  <div className="col-span-2 flex items-center justify-between td-inset rounded-xl px-3 py-2 text-xs td-num">
                    <span className="text-slate-500">Spread</span>
                    <span className="text-amber-700 font-bold">{formatSpread(activeAsset, activeQuote)}</span>
                  </div>
                  {!canTrade && (
                    <div className="col-span-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-800">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{tradeBlockReason} Trading is paused until a live price arrives.</span>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={LABEL}>Trade Volume (Lots)</label>
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={orderVolume}
                      onChange={(e) => setOrderVolume(e.target.value)}
                      className={`${FIELD} td-num`}
                    />
                    <div className="flex gap-1.5 mt-2">
                      {['0.01', '0.10', '1.00', '5.00'].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setOrderVolume(v)}
                          className={`td-num flex-1 py-2 rounded-lg border text-[11px] font-bold transition ${
                            orderVolume === v
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white border-slate-200 text-slate-600 hover:text-blue-700 hover:border-blue-300'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Stop Loss (SL)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="Optional"
                        value={stopLoss}
                        onChange={(e) => setStopLoss(e.target.value)}
                        className={`${FIELD} td-num`}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>Take Profit (TP)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="Optional"
                        value={takeProfit}
                        onChange={(e) => setTakeProfit(e.target.value)}
                        className={`${FIELD} td-num`}
                      />
                    </div>
                  </div>
                  <div className="td-inset rounded-xl p-3.5 space-y-2.5 text-xs td-num text-slate-600">
                    <div className="flex justify-between">
                      <span>Margin Required:</span>
                      <span className="text-slate-900 font-bold">$200.00 USD</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Execution Speed:</span>
                      <span className="text-emerald-700 font-bold">&lt; 10ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Instrument:</span>
                      <span className="text-blue-700 font-bold">{activeAsset.category}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 pt-5 mt-5 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleExecuteTrade('BUY')}
                      disabled={!canTrade}
                      className="td-buy py-4 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-600/20 flex flex-col items-center leading-tight disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>BUY / LONG</span>
                      <span className="td-num text-[11px] font-bold opacity-90">{fmtPrice(activeAsk, activeAsset.digits)}</span>
                    </button>
                    <button
                      onClick={() => handleExecuteTrade('SELL')}
                      disabled={!canTrade}
                      className="td-sell py-4 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-rose-600/20 flex flex-col items-center leading-tight disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>SELL / SHORT</span>
                      <span className="td-num text-[11px] font-bold opacity-90">{fmtPrice(activeBid, activeAsset.digits)}</span>
                    </button>
                  </div>
                  <div className="text-[11px] text-center text-slate-500 td-num">Direct Market Access (DMA) Execution</div>
                </div>
              </div>
              {/* Open positions */}
              <div className="lg:col-span-7 xl:col-span-8 td-panel rounded-2xl p-5">
                <PanelTitle
                  icon={Layers}
                  right={
                    openPositions.length > 0 && (
                      <span className="td-num text-[11px] text-slate-500 hidden sm:inline">
                        {feed.lastTick ? `Live · updated ${new Date(feed.lastTick).toLocaleTimeString()}` : 'Waiting for quotes…'}
                      </span>
                    )
                  }
                >
                  Open Positions ({openPositions.length})
                </PanelTitle>
                {openPositions.length === 0 ? (
                  <div className="text-center py-12 flex flex-col items-center gap-2.5">
                    <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100">
                      <Layers className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="text-sm font-semibold text-slate-700">No active positions open</div>
                    <div className="text-xs text-slate-500">Execute a trade from the order ticket to get started.</div>
                  </div>
                ) : (
                  <>
                    {/* Mobile: cards */}
                    <div className="md:hidden space-y-3">
                      {openPositions.map((pos) => (
                        <div key={pos.id} className="td-inset rounded-xl p-3.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">
                                {pos.symbol}
                                {pos.legacy && (
                                  <span className="ml-1.5 text-[9px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded px-1 py-0.5 align-middle">
                                    LEGACY
                                  </span>
                                )}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${pos.type === 'BUY' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}
                              >
                                {pos.type}
                              </span>
                            </div>
                            <span className={`td-num text-sm font-bold ${pnlColor(pos.pnl)}`}>{fmtPnl(pos.pnl)}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-3 td-num text-[11px]">
                            <div>
                              <div className="text-slate-500">Volume</div>
                              <div className="text-slate-800 font-semibold">{pos.volume} Lots</div>
                            </div>
                            <div>
                              <div className="text-slate-500">Open</div>
                              <div className="text-slate-800 font-semibold">
                                {fmtPrice(pos.openPrice, MULTI_ASSET_REGISTRY[pos.symbol]?.digits ?? 5)}
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-500">Current</div>
                              <div className="text-slate-800 font-semibold">
                                {fmtPrice(pos.currentPrice, MULTI_ASSET_REGISTRY[pos.symbol]?.digits ?? 5)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                            <span className="td-num text-[11px] text-slate-500">#{pos.id}</span>
                            <button
                              onClick={() => handleClosePosition(pos.id)}
                              className="px-3 py-1.5 bg-white hover:bg-rose-600 hover:text-white border border-rose-300 text-rose-600 rounded-lg text-xs font-bold transition"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Desktop: table */}
                    <div className="hidden md:block overflow-x-auto td-scroll">
                      <table className="w-full min-w-[640px] text-left text-xs td-num">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wide">
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
                        <tbody className="divide-y divide-slate-100">
                          {openPositions.map((pos) => (
                            <tr key={pos.id} className="td-row">
                              <td className="py-3 text-slate-500">#{pos.id}</td>
                              <td className="py-3 font-bold text-slate-900">
                                {pos.symbol}
                                {pos.legacy && (
                                  <span
                                    title="Opened before the live feed; carried flat at 0 P&L"
                                    className="ml-1.5 text-[9px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded px-1 py-0.5 align-middle"
                                  >
                                    LEGACY
                                  </span>
                                )}
                              </td>
                              <td className="py-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${pos.type === 'BUY' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}
                                >
                                  {pos.type}
                                </span>
                              </td>
                              <td className="py-3 text-slate-700">{pos.volume} Lots</td>
                              <td className="py-3 text-slate-700">
                                {fmtPrice(pos.openPrice, MULTI_ASSET_REGISTRY[pos.symbol]?.digits ?? 5)}
                              </td>
                              <td className="py-3 text-slate-700">
                                {fmtPrice(pos.currentPrice, MULTI_ASSET_REGISTRY[pos.symbol]?.digits ?? 5)}
                              </td>
                              <td className={`py-3 font-bold ${pnlColor(pos.pnl)}`}>{fmtPnl(pos.pnl)}</td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => handleClosePosition(pos.id)}
                                  className="px-2.5 py-1 bg-white hover:bg-rose-600 hover:text-white border border-rose-300 text-rose-600 rounded-lg text-[11px] font-bold transition"
                                >
                                  Close
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        {/* ======================= DEPOSIT PAGE ======================= */}
        {activeTab === 'deposit' && (
          <div className="max-w-4xl mx-auto space-y-8 py-2 td-enter">
            <div className="text-center max-w-2xl mx-auto space-y-2.5">
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-full text-xs text-blue-700 font-semibold">
                <Shield className="w-3.5 h-3.5" />
                <span>Instant Web3 &amp; Crypto Deposit Gateway</span>
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Deposit Funds</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Choose your preferred payment method and specify your transfer amount. All transactions are securely processed and credited
                to your trading account.
              </p>
            </div>
            <div className="td-panel rounded-3xl p-5 sm:p-8 max-w-2xl mx-auto space-y-6">
              <div className="flex justify-between items-center gap-3 pb-4 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-blue-600" />
                  <span>Deposit Details</span>
                </h3>
                <span className="td-num text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 rounded-full font-semibold">
                  Zero Processing Fees
                </span>
              </div>
              <div className="td-inset p-4 rounded-2xl space-y-2">
                <div className="text-[11px] text-slate-500 td-num uppercase tracking-wide font-semibold">Selected Regional Gateway</div>
                <div className="text-sm font-bold text-slate-900 flex justify-between items-center gap-2">
                  <span>
                    {activeCryptoConfig.platform} ({activeCryptoConfig.country})
                  </span>
                  <span className="text-blue-700 td-num">{activeCryptoConfig.currency}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className={LABEL}>Select Payment Method</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {['USDT (TRC-20)', 'USDT (ERC-20)', 'Ethereum (ETH)', 'Bitcoin (BTC)', 'Bank Wire'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSelectedDepositMethod(method)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition text-center ${
                        selectedDepositMethod === method
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20'
                          : 'bg-white border-slate-200 text-slate-600 hover:text-blue-700 hover:border-blue-300'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className={LABEL}>Deposit Address ({activeCryptoConfig.network})</label>
                <div className="td-inset rounded-xl p-3.5 flex items-center justify-between gap-2 td-num text-xs">
                  <span className="text-blue-700 font-bold break-all">{activeCryptoConfig.walletAddress}</span>
                  <button
                    onClick={() => handleCopyAddress()}
                    className="px-3 py-1.5 bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
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
              <form onSubmit={handleDepositSubmit} className="space-y-4 pt-2">
                <div>
                  <label className={LABEL}>Deposit Amount (USD)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 500"
                    value={depositAmountUsdt}
                    onChange={(e) => setDepositAmountUsdt(e.target.value)}
                    className={`${FIELD} td-num py-3.5`}
                  />
                </div>
                <div className="flex gap-2">
                  {['100', '250', '500', '1000', '5000'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDepositAmountUsdt(amt)}
                      className="flex-1 py-2 rounded-lg bg-white border border-slate-200 text-[11px] font-bold td-num text-slate-600 hover:text-blue-700 hover:border-blue-300 transition"
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
                <button type="submit" className={`${BTN_PRIMARY} w-full py-4 text-sm mt-2`}>
                  Submit Deposit Request
                </button>
              </form>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {CRYPTO_WALLETS.map((wallet) => (
                <div
                  key={wallet.id}
                  className={`bg-white border ${wallet.borderColor} bg-gradient-to-br ${wallet.color} rounded-2xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[11px] uppercase tracking-widest text-slate-500 font-bold block">Method / Network</span>
                      <h4 className="td-num text-lg font-extrabold text-slate-900 flex items-center gap-2 flex-wrap">
                        <span>{wallet.currency}</span>
                        <span className="text-xs text-blue-700 font-medium">[{wallet.network}]</span>
                      </h4>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600">
                      <QrCode className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between td-num text-[11px]">
                    <span className="text-slate-800 font-semibold truncate mr-2">{wallet.address}</span>
                    <button
                      onClick={() => handleCopyAddress(wallet.address, wallet.id)}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-blue-50 text-slate-700 border border-slate-200 rounded text-[11px] font-bold transition flex items-center gap-1 shrink-0"
                    >
                      {copiedWalletId === wallet.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedWalletId === wallet.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* ======================= KYC COMPLIANCE ======================= */}
        {activeTab === 'kyc' && (
          <div className="max-w-2xl mx-auto py-4 td-enter">
            <div className="td-panel rounded-2xl p-5 sm:p-8 space-y-6">
              <div className="border-b border-slate-200 pb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-blue-600" />
                    <span>KYC Identity Verification</span>
                  </h2>
                  <p className="text-sm text-slate-500 mt-1.5">Submit official identification to activate unverified withdrawal limits.</p>
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${kycBadge}`}>
                  {kycState.status === 'pending' ? 'Under review' : 'Unverified'}
                </span>
              </div>
              <form onSubmit={handleKycSubmit} className="space-y-4">
                <div>
                  <label className={LABEL}>Full Legal Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Matching Official ID"
                    value={kycState.fullName}
                    onChange={(e) => setKycState({ ...kycState, fullName: e.target.value })}
                    className={FIELD}
                  />
                </div>
                <div>
                  <label className={LABEL}>Document Type</label>
                  <select
                    value={kycState.documentType}
                    onChange={(e) => setKycState({ ...kycState, documentType: e.target.value })}
                    className={FIELD}
                  >
                    <option value="Passport">International Passport</option>
                    <option value="National ID">National ID Card</option>
                    <option value="Driver License">Driver License</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Document / ID Number</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Document ID Number"
                    value={kycState.idNumber}
                    onChange={(e) => setKycState({ ...kycState, idNumber: e.target.value })}
                    className={`${FIELD} td-num`}
                  />
                </div>
                <div
                  onClick={() => kycFileInputRef.current && kycFileInputRef.current.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleKycFile(e.dataTransfer.files && e.dataTransfer.files[0]);
                  }}
                  className="border-2 border-dashed border-blue-200 hover:border-blue-500 rounded-xl p-8 text-center cursor-pointer transition bg-blue-50/50"
                >
                  <input
                    ref={kycFileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                    className="hidden"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      handleKycFile(e.target.files && e.target.files[0]);
                      e.target.value = '';
                    }}
                  />
                  <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-sm font-bold text-slate-900">Click or drag front image of ID document</div>
                  <div className={`text-xs mt-1 ${kycFileError ? 'text-red-600' : 'text-slate-500'}`}>
                    {kycFileError || (kycFile ? kycFile.name : 'PNG, JPG or PDF (Max 10MB)')}
                  </div>
                </div>
                <button type="submit" className={`${BTN_PRIMARY} w-full py-3.5 text-sm`}>
                  Submit KYC Documentation
                </button>
              </form>
            </div>
          </div>
        )}
        {/* ======================= PROFILE ======================= */}
        {activeTab === 'profile' && (
          <div className="max-w-5xl mx-auto py-2 space-y-5 td-enter">
            <div className="td-panel rounded-2xl p-5 sm:p-7 relative overflow-hidden">
              <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-blue-500/10 blur-[80px] pointer-events-none" />
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                  <span className="text-2xl font-extrabold text-blue-700">
                    {(currentUser?.fullName || currentUser?.name || 'A').toString().trim().charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight truncate">
                    {currentUser?.fullName || currentUser?.name || 'Account holder'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1 break-all">{currentUser?.email || 'No email on file for this session'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <span className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${kycBadge}`}>
                    KYC: {kycState.status === 'pending' ? 'Under review' : 'Unverified'}
                  </span>
                  <span className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                </div>
              </div>
            </div>
            {!currentUser && (
              <div className="rounded-2xl p-4 flex items-start gap-3 bg-amber-50 border border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900/80 leading-relaxed">
                  No stored account record was found for this session. Profile fields below show only what the system actually holds —
                  nothing is filled in on your behalf. Log in again to repopulate it.
                </p>
              </div>
            )}
            <div className="td-panel rounded-2xl p-5 sm:p-6">
              <PanelTitle icon={User}>Account details</PanelTitle>
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
                <ProfileField icon={Globe} label="Country / region" value={currentUser?.country || currentUser?.region} />
              </div>
            </div>
            <div className="td-panel rounded-2xl p-5 sm:p-6">
              <PanelTitle icon={BarChart2}>Trading account</PanelTitle>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <ProfileField
                  icon={Hash}
                  label="Account number"
                  value={currentUser?.accountNumber || currentUser?.tradingAccount || currentUser?.accountId}
                />
                <ProfileField icon={Star} label="Account type" value={currentUser?.accountType || currentUser?.tier || currentUser?.plan} />
                <ProfileField icon={Wallet} label="Balance" value={fmtUSD(balanceUSD)} />
                <ProfileField icon={TrendingUp} label="Equity" value={fmtUSD(equityUSD)} />
                <ProfileField icon={Layers} label="Margin used" value={fmtUSD(marginUsed)} />
                <ProfileField icon={Gauge} label="Free margin" value={fmtUSD(freeMargin)} />
                <ProfileField icon={Activity} label="Open positions" value={String(openPositions.length)} />
                <ProfileField
                  icon={Globe}
                  label="Deposit gateway"
                  value={`${activeCryptoConfig.country} — ${activeCryptoConfig.platform}`}
                />
              </div>
              <p className="mt-5 text-xs text-slate-500 leading-relaxed">
                Fields marked “Not on file” are not present on your stored account record. Nothing here is generated or estimated — contact
                the desk to have missing details added.
              </p>
            </div>
          </div>
        )}
      </main>
      {/* TRADE TOAST */}
      {toast && (
        <div className="fixed inset-x-0 bottom-24 md:bottom-8 z-50 flex justify-center px-4 pointer-events-none">
          <div
            key={toast.id}
            className="td-toast bg-slate-900 text-white text-xs font-semibold td-num px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 max-w-full"
            role="status"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">{toast.msg}</span>
          </div>
        </div>
      )}
      {/* PERSISTENT BOTTOM NAV (mobile / small tablet) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 td-bottomnav shadow-[0_-8px_24px_-16px_rgba(30,64,175,0.35)]"
        aria-label="Primary"
      >
        <div className="grid grid-cols-3">
          {PRIMARY_TABS.map((item) => {
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => goTo(item.key)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 pt-2.5 pb-2 min-h-[60px] transition ${
                  active ? 'text-blue-600' : 'text-slate-500 hover:text-blue-600'
                }`}
              >
                {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-10 rounded-b-full bg-blue-600" />}
                <span className={`px-4 py-1 rounded-full transition ${active ? 'bg-blue-50' : ''}`}>
                  <item.icon className="w-5 h-5" />
                </span>
                <span className={`text-[11px] leading-none whitespace-nowrap ${active ? 'font-bold' : 'font-semibold'}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      {/* DEPOSIT MODAL POPUP */}
      {isDepositOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="td-panel rounded-3xl max-w-md w-full p-6 relative td-enter">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-600" />
                <span>Instant Crypto Deposit</span>
              </h3>
              <button
                onClick={() => setIsDepositOpen(false)}
                className="text-slate-500 hover:text-slate-900 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="td-inset p-4 rounded-2xl space-y-2">
                <div className="text-[11px] text-slate-500 td-num uppercase">Selected Region Payment Method</div>
                <div className="text-sm font-bold text-slate-900 flex justify-between">
                  <span>
                    {activeCryptoConfig.platform} ({activeCryptoConfig.country})
                  </span>
                  <span className="text-blue-700 td-num">{activeCryptoConfig.currency}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className={LABEL}>Deposit Address ({activeCryptoConfig.network})</label>
                <div className="td-inset rounded-xl p-3 flex items-center justify-between td-num text-xs">
                  <span className="text-blue-700 font-bold truncate mr-2">{activeCryptoConfig.walletAddress}</span>
                  <button
                    onClick={() => handleCopyAddress()}
                    className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 rounded text-[11px] font-bold shrink-0"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <form onSubmit={handleDepositSubmit} className="space-y-4 pt-2">
                <div>
                  <label className={LABEL}>Amount (USDT)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 500"
                    value={depositAmountUsdt}
                    onChange={(e) => setDepositAmountUsdt(e.target.value)}
                    className={`${FIELD} td-num`}
                  />
                </div>
                <button type="submit" className={`${BTN_PRIMARY} w-full py-3.5 text-sm`}>
                  Submit Deposit Request
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* WITHDRAWAL MODAL POPUP */}
      {isWithdrawOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60] overflow-y-auto">
          <div className="td-panel rounded-3xl max-w-md w-full p-6 relative my-auto td-enter">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-blue-600" />
                <span>Withdraw Funds</span>
              </h3>
              <button
                onClick={() => setIsWithdrawOpen(false)}
                className="text-slate-500 hover:text-slate-900 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className={LABEL}>Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="Beneficiary Legal Name"
                  value={withdrawForm.accountName}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, accountName: e.target.value })}
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL}>Withdrawal Amount ($)</label>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={withdrawForm.amount}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                  className={`${FIELD} td-num`}
                />
              </div>
              <div>
                <label className={LABEL}>Payment Method</label>
                <select
                  value={withdrawForm.paymentMethod}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, paymentMethod: e.target.value })}
                  className={FIELD}
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="USDT TRC-20">USDT (TRC-20)</option>
                  <option value="Bitcoin (BTC)">Bitcoin (BTC)</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Payment Destination Details</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Bank IBAN / Account Number or Wallet Address"
                  value={withdrawForm.paymentDetails}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, paymentDetails: e.target.value })}
                  className={FIELD}
                />
              </div>
              <button type="submit" className={`${BTN_PRIMARY} w-full py-3.5 text-sm`}>
                Submit Withdrawal Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
