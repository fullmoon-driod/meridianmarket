import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  TrendingUp, 
  Lock, 
  ArrowRight, 
  UserPlus, 
  LogIn, 
  Globe, 
  BarChart2, 
  Zap, 
  X,
  CheckCircle2,
  ChevronRight,
  Mail,
  Phone,
  Award,
  DollarSign,
  Layers,
  Cpu,
  Download,
  HelpCircle
} from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+1', country: 'US / Canada' },
  { code: '+44', country: 'United Kingdom' },
  { code: '+61', country: 'Australia' },
  { code: '+49', country: 'Germany' },
  { code: '+33', country: 'France' },
  { code: '+81', country: 'Japan' },
  { code: '+86', country: 'China' },
  { code: '+91', country: 'India' },
  { code: '+971', country: 'UAE' },
  { code: '+234', country: 'Nigeria' },
  { code: '+27', country: 'South Africa' },
  { code: '+65', country: 'Singapore' },
  { code: '+63', country: 'Philippines' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('register'); // 'register' | 'login'
  const [activeTab, setActiveTab] = useState('forex');
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    countryCode: '+1',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (authMode === 'register') {
      if (formData.password !== formData.confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
      
      // Directly register user without OTP verification
      const fullPhoneNumber = `${formData.countryCode} ${formData.phone}`;
      const newClient = {
        id: `CL-${Math.floor(1000 + Math.random() * 9000)}`,
        name: formData.fullName || 'New Trader',
        email: formData.email,
        phone: fullPhoneNumber,
        ip: '192.168.1.100',
        kycStatus: 'UNVERIFIED',
        balance: 0.00,
        assignedAgent: 'Unassigned',
        registeredAt: new Date().toISOString()
      };

      try {
        const existingClients = JSON.parse(localStorage.getItem('crm_clients') || '[]');
        localStorage.setItem('crm_clients', JSON.stringify([newClient, ...existingClients]));
      } catch (err) {
        console.error('Failed to sync registered user to CRM:', err);
      }
    }

    setShowAuthModal(false);
    
    try {
      navigate('/dashboard');
    } catch (err) {
      window.location.pathname = '/dashboard';
    }
  };

  const openAuth = (mode) => {
    setAuthMode(mode);
    setErrorMsg('');
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-slate-800 font-sans flex flex-col justify-between selection:bg-amber-200 selection:text-amber-900">
      
      {/* --- TOP LIVE MARKET TICKER STRIP --- */}
      <div className="bg-amber-950 text-amber-100/80 py-1.5 px-4 text-[11px] font-mono overflow-hidden whitespace-nowrap hidden sm:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <span className="text-amber-400 font-bold flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block mr-1"></span>
              LIVE ECN SPREADS:
            </span>
            <span>EUR/USD <strong className="text-white">1.0842 / 1.0843</strong> <span className="text-emerald-400">+0.18%</span></span>
            <span>GBP/USD <strong className="text-white">1.2651 / 1.2652</strong> <span className="text-emerald-400">+0.24%</span></span>
            <span>USD/JPY <strong className="text-white">155.12 / 155.14</strong> <span className="text-rose-300">-0.12%</span></span>
            <span>XAU/USD <strong className="text-white">2,384.10 / 2,384.60</strong> <span className="text-emerald-400">+0.85%</span></span>
            <span>BTC/USD <strong className="text-white">64,210.00</strong> <span className="text-emerald-400">+2.41%</span></span>
          </div>
          <div className="text-amber-300/60">Tier-1 Liquidity Aggregated</div>
        </div>
      </div>

      {/* --- MAIN NAVIGATION BAR --- */}
      <header className="border-b border-amber-200/60 bg-white/90 backdrop-blur-md sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl shadow-sm">
              <Shield className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-wider text-slate-900 uppercase block leading-none">Meridian</span>
              <span className="text-[10px] text-amber-600 font-mono tracking-widest uppercase font-bold">Markets</span>
            </div>
          </div>
          <nav className="hidden lg:flex items-center space-x-8 text-xs font-semibold text-slate-600">
            <a href="#markets" className="hover:text-amber-600 transition">Markets</a>
            <a href="#accounts" className="hover:text-amber-600 transition">Account Types</a>
            <a href="#features" className="hover:text-amber-600 transition">Platform & Execution</a>
            <a href="#security" className="hover:text-amber-600 transition">Fund Security</a>
            <a href="#institutional" className="hover:text-amber-600 transition">Institutional Desk</a>
          </nav>
          <div className="flex items-center space-x-3">
            <button 
              type="button"
              onClick={() => openAuth('login')}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-amber-700 transition flex items-center space-x-1.5 rounded-lg hover:bg-amber-50"
            >
              <LogIn className="w-4 h-4 text-amber-600" />
              <span>Log In</span>
            </button>
            <button 
              type="button"
              onClick={() => openAuth('register')}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 transition flex items-center space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Account</span>
            </button>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="relative overflow-hidden pt-20 pb-24 border-b border-amber-200/60 bg-gradient-to-b from-amber-50/80 via-[#faf8f5] to-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10 flex flex-col justify-center items-center">
          <div className="inline-flex items-center space-x-2 bg-white border border-amber-300/80 px-4 py-1.5 rounded-full text-xs text-amber-800 font-mono mb-8 shadow-sm">
            <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
            <span>Institutional ECN Liquidity & Sub-12ms Execution</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-tight mb-6 max-w-5xl">
            Trade Forex & Global Assets with <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">Ultra-Raw Spreads</span>
          </h1>
          <p className="text-slate-600 max-w-2xl text-sm md:text-base mb-10 leading-relaxed">
            Access 120+ FX pairs, metals, indices, and crypto with up to 1:500 leverage, zero slippage infrastructure, and direct Web3/crypto wallet deposits.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 w-full max-w-md mb-16">
            <button 
              type="button"
              onClick={() => openAuth('register')}
              className="w-full sm:w-auto px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl shadow-lg shadow-amber-500/25 transition flex items-center justify-center space-x-2 text-sm"
            >
              <span>Open Live Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              type="button"
              onClick={() => openAuth('register')}
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-amber-50/50 border border-slate-300 text-slate-800 font-bold rounded-xl transition shadow-sm flex items-center justify-center space-x-2 text-sm"
            >
              <span>Start Trading</span>
            </button>
          </div>
          
          {/* STATS STRIP */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-5xl pt-10 border-t border-amber-200/60">
            <div className="p-5 bg-white rounded-2xl border border-amber-100 shadow-sm">
              <div className="text-3xl font-extrabold text-slate-900 font-mono">$4.8B+</div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider mt-1 font-semibold">Daily Trading Volume</div>
            </div>
            <div className="p-5 bg-white rounded-2xl border border-amber-100 shadow-sm">
              <div className="text-3xl font-extrabold text-amber-600 font-mono">0.0 Pips</div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider mt-1 font-semibold">Raw Spreads Available</div>
            </div>
            <div className="p-5 bg-white rounded-2xl border border-amber-100 shadow-sm">
              <div className="text-3xl font-extrabold text-slate-900 font-mono">1:500</div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider mt-1 font-semibold">Flexible Leverage</div>
            </div>
            <div className="p-5 bg-white rounded-2xl border border-amber-100 shadow-sm">
              <div className="text-3xl font-extrabold text-emerald-600 font-mono">&lt; 12ms</div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider mt-1 font-semibold">Equinix NY4 Execution</div>
            </div>
          </div>
        </div>
      </section>

      {/* --- LIVE MARKET INSTRUMENTS TABLE --- */}
      <section id="markets" className="py-20 max-w-7xl mx-auto px-6 border-b border-amber-200/60 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Institutional Market Rates</h2>
            <p className="text-xs md:text-sm text-slate-500">Direct execution prices aggregated across Tier-1 liquidity providers.</p>
          </div>
          <div className="flex bg-amber-100/60 p-1 rounded-xl border border-amber-200 mt-4 md:mt-0 text-xs font-semibold">
            {['forex', 'crypto', 'commodities'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg capitalize transition ${
                  activeTab === tab ? 'bg-amber-500 text-white font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white border border-amber-200/80 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-amber-50/50 border-b border-amber-200/60 text-slate-500 font-mono uppercase text-[10px]">
                <th className="p-4">Instrument</th>
                <th className="p-4">Bid</th>
                <th className="p-4">Ask</th>
                <th className="p-4">Spread</th>
                <th className="p-4">24h Change</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100 font-mono">
              {activeTab === 'forex' && (
                <>
                  <tr className="hover:bg-amber-50/40 transition">
                    <td className="p-4 font-sans font-bold text-slate-900 flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>EUR / USD</span>
                    </td>
                    <td className="p-4 text-slate-800">1.08420</td>
                    <td className="p-4 text-slate-800">1.08422</td>
                    <td className="p-4 text-amber-600 font-bold">0.2 pips</td>
                    <td className="p-4 text-emerald-600 font-bold">+0.18%</td>
                    <td className="p-4 text-right">
                      <button onClick={() => openAuth('register')} className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500 hover:text-white border border-amber-500/30 text-amber-700 rounded-lg font-sans font-bold transition">Trade</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-amber-50/40 transition">
                    <td className="p-4 font-sans font-bold text-slate-900 flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>GBP / USD</span>
                    </td>
                    <td className="p-4 text-slate-800">1.26510</td>
                    <td className="p-4 text-slate-800">1.26513</td>
                    <td className="p-4 text-amber-600 font-bold">0.3 pips</td>
                    <td className="p-4 text-emerald-600 font-bold">+0.24%</td>
                    <td className="p-4 text-right">
                      <button onClick={() => openAuth('register')} className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500 hover:text-white border border-amber-500/30 text-amber-700 rounded-lg font-sans font-bold transition">Trade</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-amber-50/40 transition">
                    <td className="p-4 font-sans font-bold text-slate-900 flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span>USD / JPY</span>
                    </td>
                    <td className="p-4 text-slate-800">155.120</td>
                    <td className="p-4 text-slate-800">155.124</td>
                    <td className="p-4 text-amber-600 font-bold">0.4 pips</td>
                    <td className="p-4 text-rose-600 font-bold">-0.12%</td>
                    <td className="p-4 text-right">
                      <button onClick={() => openAuth('register')} className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500 hover:text-white border border-amber-500/30 text-amber-700 rounded-lg font-sans font-bold transition">Trade</button>
                    </td>
                  </tr>
                </>
              )}
              {activeTab === 'crypto' && (
                <>
                  <tr className="hover:bg-amber-50/40 transition">
                    <td className="p-4 font-sans font-bold text-slate-900 flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>BTC / USD</span>
                    </td>
                    <td className="p-4 text-slate-800">64,210.00</td>
                    <td className="p-4 text-slate-800">64,212.50</td>
                    <td className="p-4 text-amber-600 font-bold">2.5 pips</td>
                    <td className="p-4 text-emerald-600 font-bold">+2.41%</td>
                    <td className="p-4 text-right">
                      <button onClick={() => openAuth('register')} className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500 hover:text-white border border-amber-500/30 text-amber-700 rounded-lg font-sans font-bold transition">Trade</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-amber-50/40 transition">
                    <td className="p-4 font-sans font-bold text-slate-900 flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>ETH / USD</span>
                    </td>
                    <td className="p-4 text-slate-800">3,480.10</td>
                    <td className="p-4 text-slate-800">3,480.90</td>
                    <td className="p-4 text-amber-600 font-bold">0.8 pips</td>
                    <td className="p-4 text-emerald-600 font-bold">+3.15%</td>
                    <td className="p-4 text-right">
                      <button onClick={() => openAuth('register')} className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500 hover:text-white border border-amber-500/30 text-amber-700 rounded-lg font-sans font-bold transition">Trade</button>
                    </td>
                  </tr>
                </>
              )}
              {activeTab === 'commodities' && (
                <>
                  <tr className="hover:bg-amber-50/40 transition">
                    <td className="p-4 font-sans font-bold text-slate-900 flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>XAU / USD (Gold)</span>
                    </td>
                    <td className="p-4 text-slate-800">2,384.10</td>
                    <td className="p-4 text-slate-800">2,384.30</td>
                    <td className="p-4 text-amber-600 font-bold">0.2 pips</td>
                    <td className="p-4 text-emerald-600 font-bold">+0.85%</td>
                    <td className="p-4 text-right">
                      <button onClick={() => openAuth('register')} className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500 hover:text-white border border-amber-500/30 text-amber-700 rounded-lg font-sans font-bold transition">Trade</button>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- ACCOUNT TYPES --- */}
      <section id="accounts" className="py-20 max-w-7xl mx-auto px-6 border-b border-amber-200/60 w-full">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-3">Tailored Account Tiers</h2>
          <p className="text-xs md:text-sm text-slate-500 max-w-xl mx-auto">Select the execution model that fits your volume and leverage strategy.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* STANDARD */}
          <div className="bg-white border border-amber-200/80 p-8 rounded-2xl flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="text-xs font-mono font-bold text-amber-600 uppercase tracking-widest mb-2">Retail Trader</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Standard ECN</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">Zero commission account with low spreads designed for discretionary traders.</p>
              
              <div className="text-3xl font-black text-slate-900 font-mono mb-6">$100 <span className="text-xs font-normal text-slate-400">min deposit</span></div>
              <ul className="space-y-3 text-xs text-slate-600 mb-8 border-t border-amber-100 pt-6">
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-amber-500" /> <span>Spreads from 1.0 pips</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-amber-500" /> <span>$0 Commission</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-amber-500" /> <span>1:500 Leverage</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-amber-500" /> <span>Instant Web3 Deposits</span></li>
              </ul>
            </div>
            <button 
              onClick={() => openAuth('register')}
              className="w-full py-3 bg-slate-100 hover:bg-amber-100/60 text-slate-800 font-bold text-xs rounded-xl transition border border-slate-200"
            >
              Select Standard
            </button>
          </div>
          {/* RAW SPREAD (FEATURED) */}
          <div className="bg-gradient-to-b from-amber-50/70 to-white border-2 border-amber-500 p-8 rounded-2xl flex flex-col justify-between relative shadow-xl shadow-amber-500/10">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
              Most Popular
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-amber-700 uppercase tracking-widest mb-2">Scalpers & Algorithmic</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Raw ECN Suite</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">Direct liquidity feeds with 0.0 pip spreads for high-frequency strategies.</p>
              
              <div className="text-3xl font-black text-slate-900 font-mono mb-6">$500 <span className="text-xs font-normal text-slate-400">min deposit</span></div>
              <ul className="space-y-3 text-xs text-slate-700 mb-8 border-t border-amber-200/80 pt-6">
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-amber-600" /> <span>Raw spreads from 0.0 pips</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-amber-600" /> <span>$3.50 per lot commission</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-amber-600" /> <span>Equinix NY4 Direct Server</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-amber-600" /> <span>Full EA & Algo Support</span></li>
              </ul>
            </div>
            <button 
              onClick={() => openAuth('register')}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-amber-500/20"
            >
              Open Raw ECN Account
            </button>
          </div>
          {/* INSTITUTIONAL */}
          <div className="bg-white border border-amber-200/80 p-8 rounded-2xl flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="text-xs font-mono font-bold text-amber-600 uppercase tracking-widest mb-2">High Volume Desk</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">VIP Prime</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">Custom liquidity pools, dedicated account manager, and API access.</p>
              
              <div className="text-3xl font-black text-slate-900 font-mono mb-6">$10,000 <span className="text-xs font-normal text-slate-400">min deposit</span></div>
              <ul className="space-y-3 text-xs text-slate-600 mb-8 border-t border-amber-100 pt-6">
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-amber-500" /> <span>0.0 Pip spreads + Reduced fees</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-amber-500" /> <span>FIX API Access</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-amber-500" /> <span>Dedicated VIP Account Manager</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-amber-500" /> <span>Priority Withdrawal Queue</span></li>
              </ul>
            </div>
            <button 
              onClick={() => openAuth('register')}
              className="w-full py-3 bg-slate-100 hover:bg-amber-100/60 text-slate-800 font-bold text-xs rounded-xl transition border border-slate-200"
            >
              Contact Institutional
            </button>
          </div>
        </div>
      </section>

      {/* --- PLATFORM FEATURES GRID --- */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-6 border-b border-amber-200/60 w-full">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">Institutional Infrastructure</h2>
          <p className="text-xs md:text-sm text-slate-500 max-w-xl mx-auto">Built from the ground up for active traders who require low latency and precision execution.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white border border-amber-200/70 rounded-2xl shadow-sm hover:border-amber-400 transition">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl w-fit mb-4">
              <BarChart2 className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Real-Time Terminal Execution</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Live floating PnL, margin alerts, and single-click position closure built directly into our web terminal.</p>
          </div>
          <div className="p-6 bg-white border border-amber-200/70 rounded-2xl shadow-sm hover:border-amber-400 transition">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl w-fit mb-4">
              <Globe className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Regional Wallet Integrations</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Instant deposit gateways with Coins.ph, Luno, Binance Pay, and direct USDT TRC-20 support.</p>
          </div>
          <div className="p-6 bg-white border border-amber-200/70 rounded-2xl shadow-sm hover:border-amber-400 transition">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl w-fit mb-4">
              <Lock className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Bank-Grade Segregation</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Client capital is held in segregated Tier-1 bank accounts separate from broker operating funds.</p>
          </div>
        </div>
      </section>

      {/* --- FOOTER & LEGAL --- */}
      <footer id="support" className="bg-amber-950 text-amber-100/80 pt-16 pb-12 text-xs">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-amber-400" />
              <span className="font-extrabold text-white uppercase tracking-wider text-sm">Meridian Markets</span>
            </div>
            <p className="text-[11px] text-amber-200/60 leading-relaxed">
              Global multi-asset brokerage offering raw liquidity, institutional ECN execution, and instant digital settlements.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-4">Navigation</h4>
            <ul className="space-y-2.5 text-[11px] text-amber-200/70">
              <li><a href="#markets" className="hover:text-amber-400 transition">Market Prices</a></li>
              <li><a href="#accounts" className="hover:text-amber-400 transition">Account Comparison</a></li>
              <li><a href="#features" className="hover:text-amber-400 transition">Trading Platform</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-4">Supported Gateways</h4>
            <ul className="space-y-2.5 text-[11px] text-amber-200/60">
              <li>Coins.ph Regional Gateway</li>
              <li>Luno Wallet Deep Link</li>
              <li>Binance Pay (USDT / TRC-20)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-4">Institutional Support</h4>
            <div className="space-y-2.5 text-[11px] text-amber-200/70">
              <div className="flex items-center space-x-2"><Mail className="w-3.5 h-3.5 text-amber-400" /> <span>support@meridianmarkets.com</span></div>
              <div className="flex items-center space-x-2"><Phone className="w-3.5 h-3.5 text-amber-400" /> <span>+44 20 7946 0912</span></div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-amber-900/60 text-center text-[10px] text-amber-300/50 leading-relaxed">
          Risk Warning: Trading Forex, CFDs, and digital assets involves high risk to your capital. You should only trade money you can afford to lose. © 2026 Meridian Markets Ltd.
        </div>
      </footer>

      {/* --- AUTH MODAL --- */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-amber-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {authMode === 'register' 
                    ? 'Create Live Trader Account' 
                    : 'Sign In To Terminal'}
                </h3>
                <p className="text-xs text-slate-500">
                  {authMode === 'register'
                    ? 'Register to access the Meridian trading terminal'
                    : 'Enter your credentials to continue'}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Full Legal Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. John Doe"
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      className="w-full bg-amber-50/40 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Email Address</label>
                    <input 
                      type="email" 
                      required
                      placeholder="trader@meridian.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-amber-50/40 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Phone Number</label>
                    <div className="flex space-x-2">
                      <select
                        value={formData.countryCode}
                        onChange={(e) => setFormData({...formData, countryCode: e.target.value})}
                        className="bg-amber-50/40 border border-slate-300 rounded-xl px-2 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white font-mono"
                      >
                        {COUNTRY_CODES.map((item) => (
                          <option key={item.code} value={item.code}>
                            {item.code} ({item.country})
                          </option>
                        ))}
                      </select>
                      <input 
                        type="tel" 
                        required
                        placeholder="(555) 000-0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-amber-50/40 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Password</label>
                    <input 
                      type="password" 
                      required
                      placeholder="••••••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full bg-amber-50/40 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Confirm Password</label>
                    <input 
                      type="password" 
                      required
                      placeholder="••••••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                      className="w-full bg-amber-50/40 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>
                </>
              )}
              {authMode === 'login' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Email Address</label>
                    <input 
                      type="email" 
                      required
                      placeholder="trader@meridian.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-amber-50/40 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Password</label>
                    <input 
                      type="password" 
                      required
                      placeholder="••••••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full bg-amber-50/40 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white font-mono"
                    />
                  </div>
                </>
              )}
              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl transition mt-2 shadow-md shadow-amber-500/20"
              >
                {authMode === 'register' ? 'Register & Enter Terminal' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}