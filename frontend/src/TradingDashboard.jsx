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
  ArrowDownLeft
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
    walletAddress: 'TYa1a63P1vR8zS4mK9uLqN7xW8Y2bZ3x4C',
    network: 'Tron Network (TRC20)',
    instructions: 'Send USDT via Coins.ph app to the deposit address below.'
  },
  Malaysia: {
    country: 'Malaysia',
    platform: 'Luno',
    currency: 'USDT (TRC-20)',
    walletAddress: 'TQm8b72X8vR9zS5mK0uLqN8xW9Y3bA4y5D',
    network: 'Tron Network (TRC20)',
    instructions: 'Transfer USDT directly from your Luno Malaysia wallet.'
  },
  Thailand: {
    country: 'Thailand',
    platform: 'Binance',
    currency: 'USDT (TRC-20)',
    walletAddress: 'TRp9c83Y9vS0zT6mL1uMqO9xX0Z4cB5z6E',
    network: 'Tron Network (TRC20)',
    instructions: 'Withdraw USDT via Binance Thailand to the official exchange address.'
  }
};

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

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(activeCryptoConfig.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      <header className="bg-slate-950 border-b border-slate-800/80 px-6 py-3 flex justify-between items-center sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <div className="p-1.5 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 rounded-xl shadow-lg shadow-cyan-500/10">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <span className="text-sm font-black tracking-wider text-white uppercase block leading-none">Meridian</span>
              <span className="text-[9px] text-cyan-400 font-mono tracking-widest uppercase">Markets</span>
            </div>
          </div>
          {/* CLIENT NAVIGATION */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button 
              onClick={() => setActiveTab('terminal')} 
              className={`px-3.5 py-1.5 rounded-lg transition ${activeTab === 'terminal' ? 'bg-cyan-500 text-slate-950 font-extrabold shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Execution Desk
            </button>
            <button 
              onClick={() => setActiveTab('kyc')} 
              className={`px-3.5 py-1.5 rounded-lg transition ${activeTab === 'kyc' ? 'bg-cyan-500 text-slate-950 font-extrabold shadow' : 'text-slate-400 hover:text-white'}`}
            >
              KYC Compliance
            </button>
          </nav>
        </div>

        {/* RIGHT TOP CONTROLS */}
        <div className="flex items-center space-x-3">
          
          {/* REGION SELECTOR */}
          <div className="hidden lg:flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-500 uppercase text-[10px]">Region:</span>
            <select 
              value={selectedCountry} 
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="Philippines">🇵🇭 Philippines (Coins.ph)</option>
              <option value="Malaysia">🇲🇾 Malaysia (Luno)</option>
              <option value="Thailand">🇹🇭 Thailand (Binance)</option>
            </select>
          </div>

          {/* KYC BADGE */}
          <div>
            {kycState.status === 'approved' && (
              <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono rounded-lg flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">KYC Approved</span>
              </span>
            )}
            {kycState.status === 'pending' && (
              <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono rounded-lg flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">KYC Pending</span>
              </span>
            )}
            {kycState.status === 'unverified' && (
              <button 
                onClick={() => setActiveTab('kyc')} 
                className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono rounded-lg flex items-center space-x-1 hover:bg-rose-500/20 transition"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Verify ID</span>
              </button>
            )}
          </div>

          {/* DEPOSIT BUTTON */}
          <button 
            onClick={() => setIsDepositOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-extrabold text-xs rounded-xl transition shadow-lg shadow-cyan-500/20 flex items-center space-x-1.5"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Deposit</span>
          </button>

          {/* WITHDRAW BUTTON */}
          <button 
            onClick={() => setIsWithdrawOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs rounded-xl border border-slate-700 transition flex items-center space-x-1.5"
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-cyan-400" />
            <span>Withdraw</span>
          </button>

          <button 
            onClick={() => navigate('/')}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition"
            title="Exit Terminal"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      </header>

      {/* FINANCIAL METRICS BAR */}
      <section className="bg-slate-950/60 border-b border-slate-800/60 px-6 py-2.5 font-mono text-xs grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase">Balance (USD)</span>
          <span className="text-white font-bold text-sm">${balanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase">Equity (USD)</span>
          <span className="text-emerald-400 font-bold text-sm">${equityUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase">Used Margin</span>
          <span className="text-slate-300 font-bold">${marginUsed.toFixed(2)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase">Free Margin</span>
          <span className="text-white font-bold">${(equityUSD - marginUsed).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="hidden lg:flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase">Margin Level</span>
          <span className="text-cyan-400 font-bold">0%</span>
        </div>
        <div className="hidden lg:flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase">Active Leverage</span>
          <span className="text-amber-400 font-bold">1 : 500 ECN</span>
        </div>
      </section>

      {/* EXECUTION TERMINAL VIEW */}
      {activeTab === 'terminal' && (
        <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* CHART & POSITIONS */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
              <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl">
                    <BarChart2 className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-lg font-black text-white">{selectedAssetKey}</h2>
                      <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-[10px] font-mono rounded border border-cyan-500/20 uppercase">
                        {activeAsset.category}
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono rounded border border-emerald-500/20">
                        Spread: {activeAsset.spread}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{activeAsset.name}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6 font-mono">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block uppercase">Ask Price</span>
                    <span className="text-lg font-bold text-emerald-400">{activePrice}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block uppercase">Bid Price</span>
                    <span className="text-lg font-bold text-rose-400">{(activePrice * 0.9998).toFixed(activeAsset.digits)}</span>
                  </div>
                </div>
              </div>
              
              {/* TradingView Live Embed Container */}
              <div className="w-full h-[420px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative">
                <iframe 
                  className="w-full h-full"
                  src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_1&symbol=${selectedAssetKey.replace('/', '')}&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=dark&style=1&timezone=Etc%2FUTC`}
                  title="Live Asset Chart"
                />
              </div>
            </div>

            {/* OPEN POSITIONS TABLE */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Active ECN Positions ({openPositions.length})</span>
                </h3>
              </div>
              {openPositions.length === 0 ? (
                <div className="text-center py-10 text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No active market orders open. Execute a position from the right panel.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px]">
                        <th className="pb-3">Ticket</th>
                        <th className="pb-3">Symbol</th>
                        <th className="pb-3">Type</th>
                        <th className="pb-3">Volume</th>
                        <th className="pb-3">Open Price</th>
                        <th className="pb-3">Current</th>
                        <th className="pb-3">S / L</th>
                        <th className="pb-3">T / P</th>
                        <th className="pb-3">Profit (USD)</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {openPositions.map((pos) => (
                        <tr key={pos.id} className="hover:bg-slate-800/30">
                          <td className="py-3 text-slate-400">#{pos.id}</td>
                          <td className="py-3 font-bold text-white">{pos.symbol}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pos.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                              {pos.type}
                            </span>
                          </td>
                          <td className="py-3 text-slate-300">{pos.volume} lot</td>
                          <td className="py-3 text-slate-300">{pos.openPrice}</td>
                          <td className="py-3 text-slate-300">{pos.currentPrice}</td>
                          <td className="py-3 text-slate-500">{pos.sl || '-'}</td>
                          <td className="py-3 text-slate-500">{pos.tp || '-'}</td>
                          <td className={`py-3 font-bold ${pos.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {pos.pnl >= 0 ? `+$${pos.pnl.toFixed(2)}` : `-$${Math.abs(pos.pnl).toFixed(2)}`}
                          </td>
                          <td className="py-3 text-right">
                            <button 
                              onClick={() => handleClosePosition(pos.id)}
                              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 rounded transition font-sans text-[11px]"
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

          {/* RIGHT COLUMN: MULTI-ASSET SELECTOR & ORDER PANEL */}
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Asset Selection</h3>
                <div className="flex space-x-1 text-[10px] font-mono">
                  {['ALL', 'FX', 'Metals', 'Crypto', 'Stocks'].map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setAssetCategoryFilter(cat)}
                      className={`px-2 py-0.5 rounded ${assetCategoryFilter === cat ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {filteredAssets.map(symbolKey => {
                  const item = MULTI_ASSET_REGISTRY[symbolKey];
                  const pr = livePrices[symbolKey] || item.price;
                  const isSelected = selectedAssetKey === symbolKey;
                  return (
                    <div 
                      key={symbolKey}
                      onClick={() => setSelectedAssetKey(symbolKey)}
                      className={`p-2.5 rounded-xl border text-xs font-mono cursor-pointer transition flex justify-between items-center ${isSelected ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                    >
                      <div>
                        <div className="font-bold text-white">{symbolKey}</div>
                        <div className="text-[10px] text-slate-500">{item.category}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-white">{pr}</div>
                        <div className="text-[10px] text-emerald-400">{item.spread}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* INSTANT ORDER EXECUTION PANEL */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Instant Order Panel</h3>
              
              <div className="space-y-3 text-xs font-mono">
                <div>
                  <label className="block text-slate-400 uppercase text-[10px] mb-1">Volume (Lots)</label>
                  <input 
                    type="number" 
                    value={orderVolume} 
                    onChange={(e) => setOrderVolume(e.target.value)} 
                    step="0.01" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 uppercase text-[10px] mb-1">Stop Loss</label>
                    <input 
                      type="number" 
                      placeholder="Optional"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 uppercase text-[10px] mb-1">Take Profit</label>
                    <input 
                      type="number" 
                      placeholder="Optional"
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button 
                    onClick={() => handleExecuteTrade('BUY')}
                    className="py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center space-x-1 font-sans"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>BUY / LONG</span>
                  </button>
                  <button 
                    onClick={() => handleExecuteTrade('SELL')}
                    className="py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl shadow-lg shadow-rose-600/20 transition flex items-center justify-center space-x-1 font-sans"
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    <span>SELL / SHORT</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* KYC VERIFICATION MODULE */}
      {activeTab === 'kyc' && (
        <main className="flex-1 max-w-3xl w-full mx-auto p-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
              <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                <FileCheck className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Global Regulatory KYC Verification</h2>
                <p className="text-xs text-slate-400 font-mono">Verify your identity to complete compliance verification.</p>
              </div>
            </div>
            {kycState.status === 'approved' ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-8 text-center text-emerald-400 font-mono space-y-3">
                <CheckCircle2 className="w-12 h-12 mx-auto" />
                <h3 className="font-extrabold text-xl">Account Identity Approved</h3>
                <p className="text-xs text-emerald-300 max-w-md mx-auto">Your account meets financial regulations.</p>
              </div>
            ) : kycState.status === 'pending' ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-8 text-center text-amber-400 font-mono space-y-3">
                <Clock className="w-12 h-12 mx-auto animate-spin" />
                <h3 className="font-extrabold text-xl">Documents Under Review</h3>
                <p className="text-xs text-amber-300 max-w-md mx-auto">Your application has been received and is being verified by Compliance.</p>
              </div>
            ) : (
              <form onSubmit={handleKycSubmit} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-slate-400 uppercase text-[10px] mb-1">Full Legal Name</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. Juan Dela Cruz" 
                    value={kycState.fullName}
                    onChange={(e) => setKycState({ ...kycState, fullName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 uppercase text-[10px] mb-1">Document Type</label>
                    <select 
                      value={kycState.documentType}
                      onChange={(e) => setKycState({ ...kycState, documentType: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Passport">Passport</option>
                      <option value="National ID">National ID Card</option>
                      <option value="Driver License">Driver's License</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 uppercase text-[10px] mb-1">Document Number</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="P-9982412A" 
                      value={kycState.idNumber}
                      onChange={(e) => setKycState({ ...kycState, idNumber: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 uppercase text-[10px] mb-1">Upload ID Document</label>
                  <div className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-xl p-8 text-center cursor-pointer transition bg-slate-950/40">
                    <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                    <span className="text-slate-300 font-bold block">Click to upload files</span>
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-extrabold rounded-xl transition font-sans text-sm"
                >
                  Submit KYC Application
                </button>
              </form>
            )}
          </div>
        </main>
      )}

      {/* CRYPTO-ONLY REGIONAL DEPOSIT MODAL */}
      {isDepositOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase font-mono">Crypto Deposit Gateway</h3>
                <span className="text-[11px] text-cyan-400 font-mono">
                  {activeCryptoConfig.country} Region • {activeCryptoConfig.platform}
                </span>
              </div>
              <button onClick={() => setIsDepositOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div>
              <label className="block text-slate-400 uppercase font-mono text-[10px] mb-1">Select Region & Platform</label>
              <select 
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="Philippines">🇵🇭 Philippines — Coins.ph (USDT TRC-20)</option>
                <option value="Malaysia">🇲🇾 Malaysia — Luno (USDT TRC-20)</option>
                <option value="Thailand">🇹🇭 Thailand — Binance (USDT TRC-20)</option>
              </select>
            </div>

            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span>Asset: <strong className="text-emerald-400">USDT</strong></span>
                <span>Network: <strong className="text-amber-400">{activeCryptoConfig.network}</strong></span>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 uppercase mb-1">Deposit Address ({activeCryptoConfig.platform})</label>
                <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-lg p-2.5">
                  <span className="text-[11px] text-slate-200 font-bold truncate flex-1">{activeCryptoConfig.walletAddress}</span>
                  <button 
                    onClick={handleCopyAddress}
                    className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-md transition flex items-center space-x-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                ℹ️ {activeCryptoConfig.instructions} After sending, submit the transaction amount below for admin verification.
              </p>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 uppercase text-[10px] mb-1">
                  Amount Transferred (USDT)
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  placeholder="e.g. 500.00"
                  value={depositAmountUsdt}
                  onChange={(e) => setDepositAmountUsdt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-extrabold rounded-xl transition font-sans text-xs"
              >
                Submit USDT Deposit Order
              </button>
            </form>
          </div>
        </div>
      )}

      {/* WITHDRAWAL MODAL */}
      {isWithdrawOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase font-mono">Withdraw Funds</h3>
                <span className="text-[11px] text-cyan-400 font-mono">
                  Available: ${balanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <button onClick={() => setIsWithdrawOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 uppercase text-[10px] mb-1">Full Account Holder Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. John Doe"
                  value={withdrawForm.accountName}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, accountName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 uppercase text-[10px] mb-1">Withdrawal Amount ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  placeholder="e.g. 1000.00"
                  value={withdrawForm.amount}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 uppercase text-[10px] mb-1">Payment Method</label>
                <select 
                  value={withdrawForm.paymentMethod}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, paymentMethod: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value="Bank Transfer">Bank Wire / Local Transfer</option>
                  <option value="USDT (TRC-20)">Crypto - USDT (TRC-20)</option>
                  <option value="E-Wallet">E-Wallet / Local Provider</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 uppercase text-[10px] mb-1">
                  {withdrawForm.paymentMethod === 'Bank Transfer' ? 'Bank Name & IBAN/Account #' : 
                   withdrawForm.paymentMethod === 'USDT (TRC-20)' ? 'TRC-20 Wallet Address' : 'E-Wallet ID / Phone'}
                </label>
                <input 
                  type="text" 
                  required
                  placeholder={
                    withdrawForm.paymentMethod === 'Bank Transfer' ? 'e.g. Chase Bank, Acct: 12345678' : 
                    withdrawForm.paymentMethod === 'USDT (TRC-20)' ? 'e.g. TYa1a63P1vR8zS4mK9uLqN7xW8Y2bZ3x4C' : 'e.g. +1 234 567 890'
                  }
                  value={withdrawForm.paymentDetails}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, paymentDetails: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-extrabold rounded-xl transition font-sans text-xs"
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