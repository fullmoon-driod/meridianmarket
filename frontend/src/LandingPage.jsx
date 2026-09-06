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
  HelpCircle,
  Activity,
  ArrowUpRight,
  ArrowDownRight
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
  const [loading, setLoading] = useState(false);

  // STEP 3: CONNECT FRONTEND AUTHENTICATION TO EXPRESS BACKEND API
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    const fullPhoneNumber = `${formData.countryCode} ${formData.phone}`;

    try {
      if (authMode === 'register') {
        if (formData.password !== formData.confirmPassword) {
          setErrorMsg('Passwords do not match.');
          setLoading(false);
          return;
        }

        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: formData.fullName,
            email: formData.email,
            phone: fullPhoneNumber,
            password: formData.password
          })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Registration failed. Please try again.');
        }

        // Store active client credentials locally
        localStorage.setItem('current_user', JSON.stringify(data.client));

      } else {
        // LOGIN MODE
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Invalid email or password.');
        }

        // Store active client credentials locally
        localStorage.setItem('current_user', JSON.stringify(data.client));
      }

      setShowAuthModal(false);
      setLoading(false);

      try {
        navigate('/dashboard');
      } catch (err) {
        window.location.pathname = '/dashboard';
      }

    } catch (err) {
      setErrorMsg(err.message || 'Server network error.');
      setLoading(false);
    }
  };

  const openAuth = (mode) => {
    setAuthMode(mode);
    setErrorMsg('');
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-[#06080d] text-slate-100 font-sans flex flex-col justify-between selection:bg-amber-500 selection:text-black relative overflow-x-hidden">
      
      {/* Dynamic Background Glow Elements */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none"></div>

      {/* --- TOP LIVE MARKET TICKER STRIP --- */}
      <div className="bg-slate-950/90 border-b border-slate-800/80 text-slate-300 py-2 px-4 text-[11px] font-mono overflow-hidden whitespace-nowrap hidden sm:block backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-8 animate-pulse">
            <span className="text-amber-400 font-bold flex items-center space-x-1.5 tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block mr-1"></span>
              LIVE ECN SPREADS:
            </span>
            <span className="hover:text-amber-300 transition">EUR/USD <strong className="text-white">1.0842 / 1.0843</strong> <span className="text-emerald-400 font-bold">+0.18%</span></span>
            <span className="hover:text-amber-300 transition">GBP/USD <strong className="text-white">1.2651 / 1.2652</strong> <span className="text-emerald-400 font-bold">+0.24%</span></span>
            <span className="hover:text-amber-300 transition">USD/JPY <strong className="text-white">155.12 / 155.14</strong> <span className="text-rose-400 font-bold">-0.12%</span></span>
            <span className="hover:text-amber-300 transition">XAU/USD <strong className="text-white">2,384.10 / 2,384.60</strong> <span className="text-emerald-400 font-bold">+0.85%</span></span>
            <span className="hover:text-amber-300 transition">BTC/USD <strong className="text-white">64,210.00</strong> <span className="text-emerald-400 font-bold">+2.41%</span></span>
          </div>
          <div className="text-amber-400/80 font-semibold tracking-wider flex items-center space-x-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Tier-1 Liquidity Aggregated</span>
          </div>
        </div>
      </div>

      {/* --- MAIN NAVIGATION BAR --- */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="p-2.5 bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 rounded-2xl shadow-lg shadow-amber-500/10 group-hover:border-amber-400 transition duration-300">
              <Shield className="w-6 h-6 text-amber-400 group-hover:scale-110 transition duration-300" />
            </div>
            <div>
              <span className="text-lg font-black tracking-wider text-white uppercase block leading-none group-hover:text-amber-400 transition duration-300">Meridian</span>
              <span className="text-[10px] text-amber-400 font-mono tracking-widest uppercase font-bold">Markets</span>
            </div>
          </div>
          <nav className="hidden lg:flex items-center space-x-8 text-xs font-semibold text-slate-300">
            <a href="#markets" className="hover:text-amber-400 transition duration-200">Markets</a>
            <a href="#accounts" className="hover:text-amber-400 transition duration-200">Account Types</a>
            <a href="#features" className="hover:text-amber-400 transition duration-200">Platform & Execution</a>
            <a href="#security" className="hover:text-amber-400 transition duration-200">Fund Security</a>
            <a href="#institutional" className="hover:text-amber-400 transition duration-200">Institutional Desk</a>
          </nav>
          <div className="flex items-center space-x-4">
            <button 
              type="button"
              onClick={() => openAuth('login')}
              className="px-4 py-2 text-xs font-bold text-slate-200 hover:text-amber-400 transition flex items-center space-x-2 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800"
            >
              <LogIn className="w-4 h-4 text-amber-400" />
              <span>Log In</span>
            </button>
            <button 
              type="button"
              onClick={() => openAuth('register')}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition duration-300 transform hover:-translate-y-0.5 flex items-center space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Account</span>
            </button>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="relative overflow-hidden pt-24 pb-28 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10 flex flex-col justify-center items-center">
          <div className="inline-flex items-center space-x-2 bg-slate-900/90 border border-amber-500/40 px-4 py-2 rounded-full text-xs text-amber-300 font-mono mb-8 shadow-xl shadow-amber-500/5 backdrop-blur-md hover:border-amber-400 transition">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400 animate-bounce" />
            <span className="font-semibold">Institutional ECN Liquidity & Sub-12ms Execution</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-tight mb-8 max-w-5xl">
            Trade Forex & Global Assets with <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 animate-pulse">Ultra-Raw Spreads</span>
          </h1>
          
          <p className="text-slate-400 max-w-2xl text-base md:text-lg mb-12 leading-relaxed font-normal">
            Access 120+ FX pairs, metals, indices, and crypto with up to 1:500 leverage, zero slippage infrastructure, and direct Web3/crypto wallet deposits.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-5 w-full max-w-md mb-20">
            <button 
              type="button"
              onClick={() => openAuth('register')}
              className="w-full sm:w-auto px-9 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-xl shadow-amber-500/25 transition duration-300 transform hover:-translate-y-1 flex items-center justify-center space-x-2 text-sm tracking-wide"
            >
              <span>Open Live Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              type="button"
              onClick={() => openAuth('register')}
              className="w-full sm:w-auto px-9 py-4 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 text-white font-bold rounded-xl transition duration-300 shadow-md flex items-center justify-center space-x-2 text-sm"
            >
              <span>Start Trading</span>
            </button>
          </div>

          {/* STATS STRIP */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-5xl pt-12 border-t border-slate-800/80">
            <div className="p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-md hover:border-amber-500/40 transition duration-300 group">
              <div className="text-3xl font-black text-white font-mono group-hover:text-amber-400 transition">$4.8B+</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-widest mt-2 font-bold">Daily Trading Volume</div>
            </div>
            <div className="p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-md hover:border-amber-500/40 transition duration-300 group">
              <div className="text-3xl font-black text-amber-400 font-mono">0.0 Pips</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-widest mt-2 font-bold">Raw Spreads Available</div>
            </div>
            <div className="p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-md hover:border-amber-500/40 transition duration-300 group">
              <div className="text-3xl font-black text-white font-mono group-hover:text-amber-400 transition">1:500</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-widest mt-2 font-bold">Flexible Leverage</div>
            </div>
            <div className="p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-md hover:border-amber-500/40 transition duration-300 group">
              <div className="text-3xl font-black text-emerald-400 font-mono">&lt; 12ms</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-widest mt-2 font-bold">Equinix NY4 Execution</div>
            </div>
          </div>
        </div>
      </section>

      {/* --- LIVE MARKET INSTRUMENTS TABLE --- */}
      <section id="markets" className="py-24 max-w-7xl mx-auto px-6 border-b border-slate-800/80 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10">
          <div>
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
              <Activity className="w-4 h-4" />
              <span>Real-Time Pricing</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2 tracking-tight">Institutional Market Rates</h2>
            <p className="text-sm text-slate-400">Direct execution prices aggregated across Tier-1 liquidity providers.</p>
          </div>
          
          <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 mt-6 md:mt-0 text-xs font-semibold">
            {['forex', 'crypto', 'commodities'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-xl capitalize transition duration-300 ${
                  activeTab === tab 
                    ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px] tracking-wider">
                <th className="p-5">Instrument</th>
                <th className="p-5">Bid</th>
                <th className="p-5">Ask</th>
                <th className="p-5">Spread</th>
                <th className="p-5">24h Change</th>
                <th className="p-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {activeTab === 'forex' && (
                <>
                  <tr className="hover:bg-slate-800/40 transition duration-200">
                    <td className="p-5 font-sans font-bold text-white flex items-center space-x-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
                      <span className="text-sm">EUR / USD</span>
                    </td>
                    <td className="p-5 text-slate-200 font-bold">1.08420</td>
                    <td className="p-5 text-slate-200 font-bold">1.08422</td>
                    <td className="p-5 text-amber-400 font-bold">0.2 pips</td>
                    <td className="p-5 text-emerald-400 font-bold flex items-center space-x-1">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>+0.18%</span>
                    </td>
                    <td className="p-5 text-right">
                      <button onClick={() => openAuth('register')} className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/30 text-amber-400 rounded-xl font-sans font-extrabold transition duration-200">Trade</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800/40 transition duration-200">
                    <td className="p-5 font-sans font-bold text-white flex items-center space-x-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
                      <span className="text-sm">GBP / USD</span>
                    </td>
                    <td className="p-5 text-slate-200 font-bold">1.26510</td>
                    <td className="p-5 text-slate-200 font-bold">1.26513</td>
                    <td className="p-5 text-amber-400 font-bold">0.3 pips</td>
                    <td className="p-5 text-emerald-400 font-bold flex items-center space-x-1">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>+0.24%</span>
                    </td>
                    <td className="p-5 text-right">
                      <button onClick={() => openAuth('register')} className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/30 text-amber-400 rounded-xl font-sans font-extrabold transition duration-200">Trade</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800/40 transition duration-200">
                    <td className="p-5 font-sans font-bold text-white flex items-center space-x-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></span>
                      <span className="text-sm">USD / JPY</span>
                    </td>
                    <td className="p-5 text-slate-200 font-bold">155.120</td>
                    <td className="p-5 text-slate-200 font-bold">155.124</td>
                    <td className="p-5 text-amber-400 font-bold">0.4 pips</td>
                    <td className="p-5 text-rose-400 font-bold flex items-center space-x-1">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      <span>-0.12%</span>
                    </td>
                    <td className="p-5 text-right">
                      <button onClick={() => openAuth('register')} className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/30 text-amber-400 rounded-xl font-sans font-extrabold transition duration-200">Trade</button>
                    </td>
                  </tr>
                </>
              )}
              {activeTab === 'crypto' && (
                <>
                  <tr className="hover:bg-slate-800/40 transition duration-200">
                    <td className="p-5 font-sans font-bold text-white flex items-center space-x-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
                      <span className="text-sm">BTC / USD</span>
                    </td>
                    <td className="p-5 text-slate-200 font-bold">64,210.00</td>
                    <td className="p-5 text-slate-200 font-bold">64,212.50</td>
                    <td className="p-5 text-amber-400 font-bold">2.5 pips</td>
                    <td className="p-5 text-emerald-400 font-bold flex items-center space-x-1">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>+2.41%</span>
                    </td>
                    <td className="p-5 text-right">
                      <button onClick={() => openAuth('register')} className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/30 text-amber-400 rounded-xl font-sans font-extrabold transition duration-200">Trade</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800/40 transition duration-200">
                    <td className="p-5 font-sans font-bold text-white flex items-center space-x-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
                      <span className="text-sm">ETH / USD</span>
                    </td>
                    <td className="p-5 text-slate-200 font-bold">3,480.10</td>
                    <td className="p-5 text-slate-200 font-bold">3,480.90</td>
                    <td className="p-5 text-amber-400 font-bold">0.8 pips</td>
                    <td className="p-5 text-emerald-400 font-bold flex items-center space-x-1">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>+3.15%</span>
                    </td>
                    <td className="p-5 text-right">
                      <button onClick={() => openAuth('register')} className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/30 text-amber-400 rounded-xl font-sans font-extrabold transition duration-200">Trade</button>
                    </td>
                  </tr>
                </>
              )}
              {activeTab === 'commodities' && (
                <>
                  <tr className="hover:bg-slate-800/40 transition duration-200">
                    <td className="p-5 font-sans font-bold text-white flex items-center space-x-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
                      <span className="text-sm">XAU / USD (Gold)</span>
                    </td>
                    <td className="p-5 text-slate-200 font-bold">2,384.10</td>
                    <td className="p-5 text-slate-200 font-bold">2,384.30</td>
                    <td className="p-5 text-amber-400 font-bold">0.2 pips</td>
                    <td className="p-5 text-emerald-400 font-bold flex items-center space-x-1">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>+0.85%</span>
                    </td>
                    <td className="p-5 text-right">
                      <button onClick={() => openAuth('register')} className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/30 text-amber-400 rounded-xl font-sans font-extrabold transition duration-200">Trade</button>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- ACCOUNT TYPES --- */}
      <section id="accounts" className="py-24 max-w-7xl mx-auto px-6 border-b border-slate-800/80 w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">Tailored Account Tiers</h2>
          <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto">Select the execution model that fits your volume and leverage strategy.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* STANDARD */}
          <div className="bg-slate-900/60 border border-slate-800/80 p-8 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition duration-300 backdrop-blur-md">
            <div>
              <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest mb-3">Retail Trader</div>
              <h3 className="text-2xl font-bold text-white mb-2">Standard ECN</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">Zero commission account with low spreads designed for discretionary traders.</p>
              
              <div className="text-4xl font-black text-white font-mono mb-8">$100 <span className="text-xs font-normal text-slate-500">min deposit</span></div>
              <ul className="space-y-4 text-xs text-slate-300 mb-8 border-t border-slate-800 pt-6">
                <li className="flex items-center space-x-3"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> <span>Spreads from 1.0 pips</span></li>
                <li className="flex items-center space-x-3"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> <span>$0 Commission</span></li>
                <li className="flex items-center space-x-3"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> <span>1:500 Leverage</span></li>
                <li className="flex items-center space-x-3"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> <span>Instant Web3 Deposits</span></li>
              </ul>
            </div>
            <button 
              onClick={() => openAuth('register')}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition duration-200 border border-slate-700"
            >
              Select Standard
            </button>
          </div>

          {/* RAW SPREAD (FEATURED) */}
          <div className="bg-gradient-to-b from-amber-500/10 via-slate-900/80 to-slate-900/90 border-2 border-amber-500 p-8 rounded-2xl flex flex-col justify-between relative shadow-2xl shadow-amber-500/10 transform hover:-translate-y-1 transition duration-300">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-lg">
              Most Popular
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest mb-3">Scalpers & Algorithmic</div>
              <h3 className="text-2xl font-bold text-white mb-2">Raw ECN Suite</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-6">Direct liquidity feeds with 0.0 pip spreads for high-frequency strategies.</p>
              
              <div className="text-4xl font-black text-white font-mono mb-8">$500 <span className="text-xs font-normal text-slate-400">min deposit</span></div>
              <ul className="space-y-4 text-xs text-slate-200 mb-8 border-t border-amber-500/20 pt-6">
                <li className="flex items-center space-x-3"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> <span>Raw spreads from 0.0 pips</span></li>
                <li className="flex items-center space-x-3"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> <span>$3.50 per lot commission</span></li>
                <li className="flex items-center space-x-3"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> <span>Equinix NY4 Direct Server</span></li>
                <li className="flex items-center space-x-3"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> <span>Full EA & Algo Support</span></li>
              </ul>
            </div>
            <button 
              onClick={() => openAuth('register')}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl transition duration-200 shadow-lg shadow-amber-500/25"
            >
              Open Raw ECN Account
            </button>
          </div>

          {/* INSTITUTIONAL */}
          <div className="bg-slate-900/60 border border-slate-800/80 p-8 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition duration-300 backdrop-blur-md">
            <div>
              <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest mb-3">High Volume Desk</div>
              <h3 className="text-2xl font-bold text-white mb-2">VIP Prime</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">Custom liquidity pools, dedicated account manager, and API access.</p>
              
              <div className="text-4xl font-black text-white font-mono mb-8">$10,000 <span className="text-xs font-normal text-slate-500">min deposit</span></div>
              <ul className="space-y-4 text-xs text-slate-300 mb-8 border-t border-slate-800 pt-6">
                <li className="flex items-center space-x-3"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> <span>0.0 Pip spreads + Reduced fees</span></li>
                <li className="flex items-center space-x-3"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> <span>FIX API Access</span></li>
                <li className="flex items-center space-x-3"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> <span>Dedicated VIP Account Manager</span></li>
                <li className="flex items-center space-x-3"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> <span>Priority Withdrawal Queue</span></li>
              </ul>
            </div>
            <button 
              onClick={() => openAuth('register')}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition duration-200 border border-slate-700"
            >
              Contact Institutional
            </button>
          </div>
        </div>
      </section>

      {/* --- PLATFORM FEATURES GRID --- */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-6 border-b border-slate-800/80 w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3 tracking-tight">Institutional Infrastructure</h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">Built from the ground up for active traders who require low latency and precision execution.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-xl hover:border-amber-500/40 transition duration-300 backdrop-blur-md group">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl w-fit mb-6 group-hover:scale-110 transition duration-300">
              <BarChart2 className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-3">Real-Time Terminal Execution</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Live floating PnL, margin alerts, and single-click position closure built directly into our web terminal.</p>
          </div>

          <div className="p-8 bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-xl hover:border-amber-500/40 transition duration-300 backdrop-blur-md group">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl w-fit mb-6 group-hover:scale-110 transition duration-300">
              <Globe className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-3">Regional Wallet Integrations</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Instant deposit gateways with Coins.ph, Luno, Binance Pay, and direct USDT TRC-20 support.</p>
          </div>

          <div className="p-8 bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-xl hover:border-amber-500/40 transition duration-300 backdrop-blur-md group">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl w-fit mb-6 group-hover:scale-110 transition duration-300">
              <Lock className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-3">Bank-Grade Segregation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Client capital is held in segregated Tier-1 bank accounts separate from broker operating funds.</p>
          </div>
        </div>
      </section>

      {/* --- FOOTER & LEGAL --- */}
      <footer id="support" className="bg-slate-950 text-slate-400 pt-20 pb-12 text-xs border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Shield className="w-6 h-6 text-amber-400" />
              <span className="font-black text-white uppercase tracking-wider text-base">Meridian Markets</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Global multi-asset brokerage offering raw liquidity, institutional ECN execution, and instant digital settlements.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-5">Navigation</h4>
            <ul className="space-y-3 text-[11px] text-slate-400">
              <li><a href="#markets" className="hover:text-amber-400 transition">Market Prices</a></li>
              <li><a href="#accounts" className="hover:text-amber-400 transition">Account Comparison</a></li>
              <li><a href="#features" className="hover:text-amber-400 transition">Trading Platform</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-5">Supported Gateways</h4>
            <ul className="space-y-3 text-[11px] text-slate-400">
              <li>Coins.ph Regional Gateway</li>
              <li>Luno Wallet Deep Link</li>
              <li>Binance Pay (USDT / TRC-20)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-5">Institutional Support</h4>
            <div className="space-y-3 text-[11px] text-slate-400">
              <div className="flex items-center space-x-2.5"><Mail className="w-4 h-4 text-amber-400" /> <span>support@meridianmarkets.com</span></div>
              <div className="flex items-center space-x-2.5"><Phone className="w-4 h-4 text-amber-400" /> <span>+44 20 7946 0912</span></div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-slate-900 text-center text-[11px] text-slate-500 leading-relaxed">
          Risk Warning: Trading Forex, CFDs, and digital assets involves high risk to your capital. You should only trade money you can afford to lose. © 2026 Meridian Markets Ltd.
        </div>
      </footer>

      {/* --- AUTH MODAL --- */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-8 shadow-2xl relative">
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {authMode === 'register' 
                    ? 'Create Live Trader Account' 
                    : 'Sign In To Terminal'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {authMode === 'register'
                    ? 'Register to access the Meridian trading terminal'
                    : 'Enter your credentials to continue'}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Legal Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. John Doe"
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                    <input 
                      type="email" 
                      required
                      placeholder="trader@meridian.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Phone Number</label>
                    <div className="flex space-x-2">
                      <select
                        value={formData.countryCode}
                        onChange={(e) => setFormData({...formData, countryCode: e.target.value})}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-3 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
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
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
                    <input 
                      type="password" 
                      required
                      placeholder="••••••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Confirm Password</label>
                    <input 
                      type="password" 
                      required
                      placeholder="••••••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                </>
              )}

              {authMode === 'login' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                    <input 
                      type="email" 
                      required
                      placeholder="trader@meridian.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
                    <input 
                      type="password" 
                      required
                      placeholder="••••••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono transition"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-extrabold text-xs rounded-xl transition duration-200 mt-4 shadow-lg shadow-amber-500/20"
              >
                {loading 
                  ? 'Processing...' 
                  : authMode === 'register' 
                    ? 'Register & Enter Terminal' 
                    : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}