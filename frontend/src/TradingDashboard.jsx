import React, { useState, useEffect } from 'react';
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
  ArrowDownLeft,
  QrCode,
  Zap,
  TrendingUp,
  RefreshCw,
  Search,
  Activity
} from 'lucide-react';

// ==========================================
// 1. MULTI-ASSET MATRIX & INITIAL DATA
// ==========================================
const MULTI_ASSET_REGISTRY = {
  'EUR/USD': { name: 'EUR/USD (Euro / US Dollar)', price: 1.08420, digits: 5, category: 'Forex', spread: '0.2 pips' },
  'GBP/USD': { name: 'GBP/USD (British Pound)', price: 1.26500, digits: 5, category: 'Forex', spread: '0.4 pips' },
  'USD/JPY': { name: 'USD/JPY (US Dollar / Japanese Yen)', price: 154.250, digits: 3, category: 'Forex', spread: '0.3 pips' },
  'AUD/USD': { name: 'AUD/USD (Australian Dollar)', price: 0.65820, digits: 5, category: 'Forex', spread: '0.3 pips' },
  'XAU/USD': { name: 'XAU/USD (Gold Spot / US Dollar)', price: 2380.50, digits: 2, category: 'Metals', spread: '1.2 pips' },
  'XAG/USD': { name: 'XAG/USD (Silver Spot)', price: 28.40, digits: 2, category: 'Metals', spread: '1.5 pips' },
  'BTC/USD': { name: 'BTC/USD (Bitcoin Spot)', price: 61500.00, digits: 2, category: 'Crypto', spread: '10.0 pips' },
  'ETH/USD': { name: 'ETH/USD (Ethereum Spot)', price: 3480.00, digits: 2, category: 'Crypto', spread: '1.5 pips' },
  'NVDA': { name: 'NVIDIA Corp.', price: 128.30, digits: 2, category: 'Stocks', spread: '0.1 pips' },
  'AAPL': { name: 'Apple Inc.', price: 224.50, digits: 2, category: 'Stocks', spread: '0.1 pips' },
  'TSLA': { name: 'Tesla Inc.', price: 215.80, digits: 2, category: 'Stocks', spread: '0.2 pips' },
  'MSFT': { name: 'Microsoft Corp.', price: 416.20, digits: 2, category: 'Stocks', spread: '0.1 pips' },
  'US30': { name: 'US30 (Dow Jones Industrial)', price: 38900.00, digits: 2, category: 'Indices', spread: '2.0 pips' },
  'NAS100': { name: 'NAS100 (US Tech 100 Index)', price: 18250.00, digits: 2, category: 'Indices', spread: '1.8 pips' }
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

  // Financial Balances (Updated default starting balance to 0.00)
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

  // Deposit Modal State
  const [isDepositOpen, setIsDepositOpen] = useState(false);
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

  const activeAsset = MULTI_ASSET_REGISTRY[selectedAssetKey];
  const activePrice = livePrices[selectedAssetKey] || activeAsset.price;
  const activeCryptoConfig = REGIONAL_CRYPTO_CONFIG[selectedCountry];

  // Unlocked handleExecuteTrade (KYC check removed)
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
    if (amt <= 0) return alert('Please enter a valid USDT deposit amount.');

    setIsDepositOpen(false);
    setDepositAmountUsdt('');
    alert(`USDT Deposit request of ${amt.toLocaleString()} USDT (${activeCryptoConfig.platform}) submitted!\n\nStatus: Pending Admin CRM Verification.`);
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

  return (
    <div className="min-h-screen bg-[#06080d] text-slate-100 font-sans flex flex-col selection:bg-cyan-500 selection:text-black">
      
      {/* HEADER / TOP NAVIGATION BAR */}
      <header className="bg-slate-950/90 border-b border-slate-800/80 px-6 py-3.5 flex justify-between items-center sticky top-0 z-40 backdrop-blur-xl">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 rounded-xl shadow-lg shadow-cyan-500/10 group-hover:border-cyan-400 transition">
              <Shield className="w-5 h-5 text-cyan-400 group-hover:scale-105 transition" />
            </div>
            <div>
              <span className="text-sm font-black tracking-wider text-white uppercase block leading-none group-hover:text-cyan-400 transition">Meridian</span>
              <span className="text-[9px] text-cyan-400 font-mono tracking-widest uppercase font-bold">Markets</span>
            </div>
          </div>

          {/* CLIENT NAVIGATION */}
          <nav className="hidden md:flex items-center space-x-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 text-xs font-semibold">
            <button 
              onClick={() => setActiveTab('terminal')} 
              className={`px-4 py-2 rounded-lg transition duration-200 ${activeTab === 'terminal' ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              Execution Desk
            </button>
            <button 
              onClick={() => setActiveTab('deposit')} 
              className={`px-4 py-2 rounded-lg transition duration-200 ${activeTab === 'deposit' ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              Deposit Funds
            </button>
            <button 
              onClick={() => setActiveTab('kyc')} 
              className={`px-4 py-2 rounded-lg transition duration-200 ${activeTab === 'kyc' ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              KYC Compliance
            </button>
          </nav>
        </div>

        {/* RIGHT TOP CONTROLS */}
        <div className="flex items-center space-x-4">
          <div className="hidden lg:flex items-center space-x-2 bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Gateway:</span>
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

          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-mono">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">Bal:</span>
            <span className="text-emerald-400 font-extrabold">${balanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>

          <button 
            onClick={() => setIsDepositOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center space-x-1.5"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Deposit</span>
          </button>

          <button 
            onClick={() => setIsWithdrawOpen(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-white font-bold text-xs rounded-xl transition flex items-center space-x-1.5"
          >
            <ArrowUpRight className="w-4 h-4 text-cyan-400" />
            <span>Withdraw</span>
          </button>

          <button 
            onClick={() => navigate('/')}
            className="p-2 bg-slate-900 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 rounded-xl transition"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 p-6 max-w-[1700px] w-full mx-auto space-y-6">
        
        {/* TAB 1: TRADING TERMINAL DESK */}
        {activeTab === 'terminal' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT 3 COLS: WATCHLIST & ASSET SELECTOR */}
            <div className="lg:col-span-3 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between h-[780px] shadow-2xl backdrop-blur-md">
              <div>
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2 text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                    <Activity className="w-4 h-4" />
                    <span>Watchlist</span>
                  </div>
                  <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full font-mono border border-slate-800">14 Assets</span>
                </div>

                {/* Category Filters */}
                <div className="flex space-x-1 mb-4 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-[10px] font-bold overflow-x-auto">
                  {['ALL', 'FOREX', 'METALS', 'CRYPTO', 'STOCKS'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setAssetCategoryFilter(cat)}
                      className={`px-2.5 py-1.5 rounded-lg transition shrink-0 ${assetCategoryFilter === cat ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Asset Items List */}
                <div className="space-y-1.5 overflow-y-auto max-h-[600px] pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                  {filteredAssets.map(symbol => {
                    const asset = MULTI_ASSET_REGISTRY[symbol];
                    const price = livePrices[symbol] || asset.price;
                    const isSelected = selectedAssetKey === symbol;

                    return (
                      <div
                        key={symbol}
                        onClick={() => setSelectedAssetKey(symbol)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                          isSelected 
                            ? 'bg-gradient-to-r from-cyan-500/10 to-transparent border-cyan-500/50 text-white shadow-md' 
                            : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-900 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs flex items-center space-x-2">
                            <span>{symbol}</span>
                            <span className="text-[9px] text-slate-500 font-mono font-normal">[{asset.category}]</span>
                          </div>
                          <div className="text-[10px] text-amber-400 font-mono mt-0.5">Spr: {asset.spread}</div>
                        </div>
                        <div className="text-right font-mono">
                          <div className={`text-xs font-bold ${isSelected ? 'text-cyan-400' : 'text-slate-200'}`}>
                            {price.toFixed(asset.digits)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* MIDDLE 6 COLS: LIVE INTERACTIVE CHART & POSITIONS */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* CHART CANVAS */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 h-[500px] flex flex-col justify-between shadow-2xl relative overflow-hidden backdrop-blur-md">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg font-black text-white font-mono">{selectedAssetKey}</span>
                    <span className="text-xs bg-slate-900 text-cyan-400 font-mono px-2.5 py-1 rounded-lg border border-slate-800">
                      {activeAsset.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 font-mono">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase">Live Spot</div>
                      <div className="text-base font-extrabold text-emerald-400">{activePrice.toFixed(activeAsset.digits)}</div>
                    </div>
                  </div>
                </div>

                {/* GRAPHICAL CHART SIMULATION */}
                <div className="flex-1 my-4 bg-slate-900/40 border border-slate-800/50 rounded-xl p-4 relative flex flex-col justify-between overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent pointer-events-none"></div>
                  
                  {/* Grid lines */}
                  <div className="absolute inset-0 grid grid-rows-4 grid-cols-6 opacity-10 pointer-events-none">
                    {[...Array(24)].map((_, i) => (
                      <div key={i} className="border-r border-b border-slate-400"></div>
                    ))}
                  </div>

                  {/* Simulated Candle Visual Wave */}
                  <div className="h-full w-full flex items-end justify-between space-x-1.5 pt-10 pb-4 relative z-10">
                    {[40, 55, 35, 60, 75, 50, 65, 80, 70, 85, 90, 60, 75, 95, 80, 100].map((h, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                        <div className="w-0.5 bg-cyan-500/40 h-full"></div>
                        <div 
                          style={{ height: `${h}%` }} 
                          className={`w-full rounded-sm transition-all duration-500 ${idx % 2 === 0 ? 'bg-gradient-to-t from-emerald-500 to-emerald-400 shadow-sm shadow-emerald-500/30' : 'bg-gradient-to-t from-rose-500 to-rose-400 shadow-sm shadow-rose-500/30'}`}
                        ></div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>Equinix NY4 Feed Connected</span>
                  </div>
                  <div>Leverage Mode: 1:500 ECN Direct</div>
                </div>
              </div>

              {/* OPEN POSITIONS TABLE */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>Open Positions ({openPositions.length})</span>
                  </h3>
                </div>

                {openPositions.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs font-mono">
                    No active positions open. Execute trades via order ticket.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase">
                          <th className="pb-2">Order ID</th>
                          <th className="pb-2">Symbol</th>
                          <th className="pb-2">Type</th>
                          <th className="pb-2">Volume</th>
                          <th className="pb-2">Open Price</th>
                          <th className="pb-2">Current</th>
                          <th className="pb-2">PnL ($)</th>
                          <th className="pb-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {openPositions.map(pos => (
                          <tr key={pos.id} className="hover:bg-slate-900/40">
                            <td className="py-2.5 text-slate-400">#{pos.id}</td>
                            <td className="py-2.5 font-bold text-white">{pos.symbol}</td>
                            <td className="py-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pos.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                                {pos.type}
                              </span>
                            </td>
                            <td className="py-2.5 text-slate-300">{pos.volume} Lots</td>
                            <td className="py-2.5 text-slate-300">{pos.openPrice}</td>
                            <td className="py-2.5 text-slate-300">{pos.currentPrice}</td>
                            <td className="py-2.5 font-bold text-emerald-400">+$0.00</td>
                            <td className="py-2.5 text-right">
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
            <div className="lg:col-span-3 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between h-[780px] shadow-2xl backdrop-blur-md">
              <div>
                <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-800">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-2">
                    <Zap className="w-4 h-4" />
                    <span>Order Execution</span>
                  </h3>
                  <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded font-mono">Market Instant</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Trade Volume (Lots)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={orderVolume}
                      onChange={(e) => setOrderVolume(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-cyan-500 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Stop Loss (SL)</label>
                      <input 
                        type="number" 
                        placeholder="Optional"
                        value={stopLoss}
                        onChange={(e) => setStopLoss(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Take Profit (TP)</label>
                      <input 
                        type="number" 
                        placeholder="Optional"
                        value={takeProfit}
                        onChange={(e) => setTakeProfit(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 transition"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2 text-[11px] font-mono text-slate-400">
                    <div className="flex justify-between">
                      <span>Margin Required:</span>
                      <span className="text-white font-bold">$200.00 USD</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Execution Speed:</span>
                      <span className="text-emerald-400 font-bold">&lt; 10ms</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* EXECUTION BUTTONS */}
              <div className="space-y-3 pt-6 border-t border-slate-800">
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleExecuteTrade('BUY')}
                    className="py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition duration-200 transform hover:-translate-y-0.5"
                  >
                    BUY / LONG
                  </button>
                  <button 
                    onClick={() => handleExecuteTrade('SELL')}
                    className="py-4 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-black text-sm rounded-xl shadow-lg shadow-rose-500/20 transition duration-200 transform hover:-translate-y-0.5"
                  >
                    SELL / SHORT
                  </button>
                </div>
                <div className="text-[10px] text-center text-slate-500 font-mono">
                  Direct Market Access (DMA) Execution
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DEPOSIT PAGE — CRYPTO WALLETS */}
        {activeTab === 'deposit' && (
          <div className="max-w-6xl mx-auto space-y-8 py-4">
            
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-xs text-emerald-400 font-mono">
                <Shield className="w-3.5 h-3.5" />
                <span>Instant Web3 & Crypto Deposit Gateway</span>
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">Deposit Cryptocurrency</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Select your preferred cryptocurrency payment method below. Send exact funds to the designated wallet address. Deposits are credited automatically after network confirmations.
              </p>
            </div>

            {/* WALLETS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CRYPTO_WALLETS.map((wallet) => (
                <div 
                  key={wallet.id}
                  className={`bg-slate-950/80 border ${wallet.borderColor} bg-gradient-to-br ${wallet.color} rounded-2xl p-6 shadow-2xl flex flex-col justify-between backdrop-blur-md hover:scale-[1.01] transition duration-300 relative overflow-hidden`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>

                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block mb-1">Method / Network</span>
                        <h3 className="text-2xl font-black text-white font-mono flex items-center space-x-2">
                          <span>{wallet.currency}</span>
                          <span className="text-xs text-cyan-400 font-normal">[{wallet.network}]</span>
                        </h3>
                      </div>
                      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-slate-300">
                        <QrCode className="w-6 h-6" />
                      </div>
                    </div>

                    {/* ADDRESS BOX */}
                    <div className="space-y-2 mb-6">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Official Wallet Address</label>
                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between font-mono text-xs">
                        <span className="text-emerald-400 font-bold break-all mr-2">{wallet.address}</span>
                        <button 
                          onClick={() => handleCopyAddress(wallet.address, wallet.id)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shrink-0"
                        >
                          {copiedWalletId === wallet.id ? (
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
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex justify-between items-center text-[10px] font-mono text-slate-400">
                    <span>Confirmation Speed: ~2-5 mins</span>
                    <span className="text-emerald-400 font-bold">● Active Gateway</span>
                  </div>
                </div>
              ))}
            </div>

            {/* REGIONAL DEPOSIT FORM INTEGRATION */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md max-w-2xl mx-auto">
              <h3 className="text-base font-bold text-white mb-4 flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-cyan-400" />
                <span>Submit Deposit Confirmation Ticket</span>
              </h3>

              <form onSubmit={handleDepositSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Selected Regional Gateway</label>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white flex justify-between items-center">
                    <span>{activeCryptoConfig.country} — {activeCryptoConfig.platform}</span>
                    <span className="text-emerald-400 font-bold">{activeCryptoConfig.currency}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Deposit Amount (USDT)</label>
                  <input 
                    type="number" 
                    required
                    placeholder="e.g. 1000"
                    value={depositAmountUsdt}
                    onChange={(e) => setDepositAmountUsdt(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition"
                >
                  Confirm Deposit Transfer
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: KYC COMPLIANCE */}
        {activeTab === 'kyc' && (
          <div className="max-w-2xl mx-auto py-8">
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-8 shadow-2xl backdrop-blur-md space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <FileCheck className="w-5 h-5 text-cyan-400" />
                  <span>KYC Identity Verification</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">Submit official identification to activate unverified withdrawal limits.</p>
              </div>

              <form onSubmit={handleKycSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Legal Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Matching Official ID"
                    value={kycState.fullName}
                    onChange={(e) => setKycState({...kycState, fullName: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Document Type</label>
                  <select 
                    value={kycState.documentType}
                    onChange={(e) => setKycState({...kycState, documentType: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
                  >
                    <option value="Passport">International Passport</option>
                    <option value="National ID">National ID Card</option>
                    <option value="Driver License">Driver License</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Document / ID Number</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Enter Document ID Number"
                    value={kycState.idNumber}
                    onChange={(e) => setKycState({...kycState, idNumber: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>

                <div className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-xl p-8 text-center cursor-pointer transition bg-slate-900/40">
                  <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <div className="text-xs font-bold text-white">Click or drag front image of ID document</div>
                  <div className="text-[10px] text-slate-500 mt-1">PNG, JPG or PDF (Max 10MB)</div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition"
                >
                  Submit KYC Documentation
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* DEPOSIT MODAL POPUP */}
      {isDepositOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <span>Instant Crypto Deposit</span>
              </h3>
              <button onClick={() => setIsDepositOpen(false)} className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <div className="text-[10px] text-slate-500 font-mono uppercase">Selected Region Payment Method</div>
                <div className="text-xs font-bold text-white flex justify-between">
                  <span>{activeCryptoConfig.platform} ({activeCryptoConfig.country})</span>
                  <span className="text-emerald-400 font-mono">{activeCryptoConfig.currency}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deposit Address ({activeCryptoConfig.network})</label>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between font-mono text-xs">
                  <span className="text-emerald-400 font-bold truncate mr-2">{activeCryptoConfig.walletAddress}</span>
                  <button 
                    onClick={() => handleCopyAddress()}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold shrink-0"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <form onSubmit={handleDepositSubmit} className="space-y-4 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Amount (USDT)</label>
                  <input 
                    type="number" 
                    required
                    placeholder="e.g. 500"
                    value={depositAmountUsdt}
                    onChange={(e) => setDepositAmountUsdt(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition"
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <ArrowUpRight className="w-5 h-5 text-cyan-400" />
                <span>Withdraw Funds</span>
              </h3>
              <button onClick={() => setIsWithdrawOpen(false)} className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Account Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="Beneficiary Legal Name"
                  value={withdrawForm.accountName}
                  onChange={(e) => setWithdrawForm({...withdrawForm, accountName: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Withdrawal Amount ($)</label>
                <input 
                  type="number" 
                  required
                  placeholder="0.00"
                  value={withdrawForm.amount}
                  onChange={(e) => setWithdrawForm({...withdrawForm, amount: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Payment Method</label>
                <select 
                  value={withdrawForm.paymentMethod}
                  onChange={(e) => setWithdrawForm({...withdrawForm, paymentMethod: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Bank Transfer">Bank Wire Transfer</option>
                  <option value="USDT TRC20">USDT (TRC-20 Wallet)</option>
                  <option value="Coins.ph">Coins.ph Wallet</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bank Account / Wallet Destination</label>
                <input 
                  type="text" 
                  required
                  placeholder="IBAN, Account Number, or TRC20 Address"
                  value={withdrawForm.paymentDetails}
                  onChange={(e) => setWithdrawForm({...withdrawForm, paymentDetails: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition"
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