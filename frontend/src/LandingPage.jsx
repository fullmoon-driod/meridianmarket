import React, { useState, useEffect } from 'react';
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

export default function LandingPage() {
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('register'); // 'register' | 'login'
  const [activeTab, setActiveTab] = useState('forex');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: ''
  });

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    
    // Sync newly registered user to shared CRM storage if registering
    if (authMode === 'register') {
      const newClient = {
        id: `CL-${Math.floor(1000 + Math.random() * 9000)}`,
        name: formData.fullName || 'New Trader',
        email: formData.email,
        phone: formData.phone || '',
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
    
    // Attempt React Router navigation first, fallback to hard path set if router state stuck
    try {
      navigate('/dashboard');
    } catch (err) {
      window.location.pathname = '/dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans flex flex-col justify-between selection:bg-cyan-500 selection:text-black">
      
      {/* --- TOP LIVE MARKET TICKER STRIP --- */}
      <div className="bg-slate-950 border-b border-slate-800/60 py-1.5 px-4 text-[11px] font-mono text-slate-400 overflow-hidden whitespace-nowrap hidden sm:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <span className="text-cyan-400 font-bold flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block mr-1"></span>
              LIVE ECN SPREADS:
            </span>
            <span>EUR/USD <strong className="text-white">1.0842 / 1.0843</strong> <span className="text-emerald-400">+0.18%</span></span>
            <span>GBP/USD <strong className="text-white">1.2651 / 1.2652</strong> <span className="text-emerald-400">+0.24%</span></span>
            <span>USD/JPY <strong className="text-white">155.12 / 155.14</strong> <span className="text-rose-400">-0.12%</span></span>
            <span>XAU/USD <strong className="text-white">2,384.10 / 2,384.60</strong> <span className="text-emerald-400">+0.85%</span></span>
            <span>BTC/USD <strong className="text-white">64,210.00</strong> <span className="text-emerald-400">+2.41%</span></span>
          </div>
          <div className="text-slate-500">Tier-1 Liquidity Aggregated</div>
        </div>
      </div>

      {/* --- MAIN NAVIGATION BAR --- */}
      <header className="border-b border-slate-800/80 bg-[#0b0e14]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl shadow-lg shadow-cyan-500/10">
              <Shield className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-wider text-white uppercase block leading-none">Meridian</span>
              <span className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase">Markets</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center space-x-8 text-xs font-semibold text-slate-300">
            <a href="#markets" className="hover:text-cyan-400 transition">Markets</a>
            <a href="#accounts" className="hover:text-cyan-400 transition">Account Types</a>
            <a href="#features" className="hover:text-cyan-400 transition">Platform & Execution</a>
            <a href="#security" className="hover:text-cyan-400 transition">Fund Security</a>
            <a href="#institutional" className="hover:text-cyan-400 transition">Institutional Desk</a>
          </nav>

          <div className="flex items-center space-x-3">
            <button 
              type="button"
              onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center space-x-1.5 rounded-lg hover:bg-slate-800/50"
            >
              <LogIn className="w-4 h-4 text-cyan-400" />
              <span>Log In</span>
            </button>

            <button 
              type="button"
              onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-600/25 transition flex items-center space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Account</span>
            </button>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="relative overflow-hidden pt-20 pb-24 border-b border-slate-800/60 bg-gradient-to-b from-slate-950 via-[#07090e] to-[#07090e]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10 flex flex-col justify-center items-center">
          <div className="inline-flex items-center space-x-2 bg-slate-900/90 border border-cyan-500/30 px-4 py-1.5 rounded-full text-xs text-cyan-400 font-mono mb-8 shadow-inner">
            <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
            <span>Institutional ECN Liquidity & Sub-12ms Execution</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tight leading-tight mb-6 max-w-5xl">
            Trade Forex & Global Assets with <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Ultra-Raw Spreads</span>
          </h1>

          <p className="text-slate-400 max-w-2xl text-sm md:text-base mb-10 leading-relaxed">
            Access 120+ FX pairs, metals, indices, and crypto with up to 1:500 leverage, zero slippage infrastructure, and direct Web3/crypto wallet deposits.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 w-full max-w-md mb-16">
            <button 
              type="button"
              onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}
              className="w-full sm:w-auto px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold rounded-xl shadow-xl shadow-cyan-500/20 transition flex items-center justify-center space-x-2 text-sm"
            >
              <span>Open Live Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button 
              type="button"
              onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold rounded-xl transition flex items-center justify-center space-x-2 text-sm"
            >
              <span>Start Trading</span>
            </button>
          </div>

          {/* STATS STRIP */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-5xl pt-10 border-t border-slate-800/60">
            <div className="p-5 bg-slate-900/40 rounded-2xl border border-slate-800/60 backdrop-blur-sm">
              <div className="text-3xl font-extrabold text-white font-mono">$4.8B+</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-1 font-semibold">Daily Trading Volume</div>
            </div>
            <div className="p-5 bg-slate-900/40 rounded-2xl border border-slate-800/60 backdrop-blur-sm">
              <div className="text-3xl font-extrabold text-cyan-400 font-mono">0.0 Pips</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-1 font-semibold">Raw Spreads Available</div>
            </div>
            <div className="p-5 bg-slate-900/40 rounded-2xl border border-slate-800/60 backdrop-blur-sm">
              <div className="text-3xl font-extrabold text-white font-mono">1:500</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-1 font-semibold">Flexible Leverage</div>
            </div>
            <div className="p-5 bg-slate-900/40 rounded-2xl border border-slate-800/60 backdrop-blur-sm">
              <div className="text-3xl font-extrabold text-emerald-400 font-mono">&lt; 12ms</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-1 font-semibold">Equinix NY4 Execution</div>
            </div>
          </div>
        </div>
      </section>

      {/* --- LIVE MARKET INSTRUMENTS TABLE --- */}
      <section id="markets" className="py-20 max-w-7xl mx-auto px-6 border-b border-slate-800/60 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2">Institutional Market Rates</h2>
            <p className="text-xs md:text-sm text-slate-400">Direct execution prices aggregated across Tier-1 liquidity providers.</p>
          </div>

          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 mt-4 md:mt-0 text-xs font-semibold">
            {['forex', 'crypto', 'commodities'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg capitalize transition ${
                  activeTab === tab ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                <th className="p-4">Instrument</th>
                <th className="p-4">Bid</th>
                <th className="p-4">Ask</th>
                <th className="p-4">Spread</th>
                <th className="p-4">24h Change</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {activeTab === 'forex' && (
                <>
                  <tr className="hover:bg-slate-800/30 transition">
                    <td className="p-4 font-sans font-bold text-white flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>EUR / USD</span>
                    </td>
                    <td className="p-4 text-white">1.08420</td>
                    <td className="p-4 text-white">1.08422</td>
                    <td className="p-4 text-cyan-400 font-bold">0.2 pips</td>
                    <td className="p-4 text-emerald-400 font-bold">+0.18%</td>
                    <td className="p-4 text-right">
                      <button onClick={() => { setAuthMode('register'); setShowAuthModal(true); }} className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500 hover:text-black border border-cyan-500/30 text-cyan-400 rounded-lg font-sans font-bold transition">Trade</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800/30 transition">
                    <td className="p-4 font-sans font-bold text-white flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>GBP / USD</span>
                    </td>
                    <td className="p-4 text-white">1.26510</td>
                    <td className="p-4 text-white">1.26513</td>
                    <td className="p-4 text-cyan-400 font-bold">0.3 pips</td>
                    <td className="p-4 text-emerald-400 font-bold">+0.24%</td>
                    <td className="p-4 text-right">
                      <button onClick={() => { setAuthMode('register'); setShowAuthModal(true); }} className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500 hover:text-black border border-cyan-500/30 text-cyan-400 rounded-lg font-sans font-bold transition">Trade</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800/30 transition">
                    <td className="p-4 font-sans font-bold text-white flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                      <span>USD / JPY</span>
                    </td>
                    <td className="p-4 text-white">155.120</td>
                    <td className="p-4 text-white">155.124</td>
                    <td className="p-4 text-cyan-400 font-bold">0.4 pips</td>
                    <td className="p-4 text-rose-400 font-bold">-0.12%</td>
                    <td className="p-4 text-right">
                      <button onClick={() => { setAuthMode('register'); setShowAuthModal(true); }} className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500 hover:text-black border border-cyan-500/30 text-cyan-400 rounded-lg font-sans font-bold transition">Trade</button>
                    </td>
                  </tr>
                </>
              )}

              {activeTab === 'crypto' && (
                <>
                  <tr className="hover:bg-slate-800/30 transition">
                    <td className="p-4 font-sans font-bold text-white flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>BTC / USD</span>
                    </td>
                    <td className="p-4 text-white">64,210.00</td>
                    <td className="p-4 text-white">64,212.50</td>
                    <td className="p-4 text-cyan-400 font-bold">2.5 pips</td>
                    <td className="p-4 text-emerald-400 font-bold">+2.41%</td>
                    <td className="p-4 text-right">
                      <button onClick={() => { setAuthMode('register'); setShowAuthModal(true); }} className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500 hover:text-black border border-cyan-500/30 text-cyan-400 rounded-lg font-sans font-bold transition">Trade</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800/30 transition">
                    <td className="p-4 font-sans font-bold text-white flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>ETH / USD</span>
                    </td>
                    <td className="p-4 text-white">3,480.10</td>
                    <td className="p-4 text-white">3,480.90</td>
                    <td className="p-4 text-cyan-400 font-bold">0.8 pips</td>
                    <td className="p-4 text-emerald-400 font-bold">+3.15%</td>
                    <td className="p-4 text-right">
                      <button onClick={() => { setAuthMode('register'); setShowAuthModal(true); }} className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500 hover:text-black border border-cyan-500/30 text-cyan-400 rounded-lg font-sans font-bold transition">Trade</button>
                    </td>
                  </tr>
                </>
              )}

              {activeTab === 'commodities' && (
                <>
                  <tr className="hover:bg-slate-800/30 transition">
                    <td className="p-4 font-sans font-bold text-white flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>XAU / USD (Gold)</span>
                    </td>
                    <td className="p-4 text-white">2,384.10</td>
                    <td className="p-4 text-white">2,384.30</td>
                    <td className="p-4 text-cyan-400 font-bold">0.2 pips</td>
                    <td className="p-4 text-emerald-400 font-bold">+0.85%</td>
                    <td className="p-4 text-right">
                      <button onClick={() => { setAuthMode('register'); setShowAuthModal(true); }} className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500 hover:text-black border border-cyan-500/30 text-cyan-400 rounded-lg font-sans font-bold transition">Trade</button>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- ACCOUNT TYPES --- */}
      <section id="accounts" className="py-20 max-w-7xl mx-auto px-6 border-b border-slate-800/60 w-full">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-3">Tailored Account Tiers</h2>
          <p className="text-xs md:text-sm text-slate-400 max-w-xl mx-auto">Select the execution model that fits your volume and leverage strategy.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* STANDARD */}
          <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition">
            <div>
              <div className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest mb-2">Retail Trader</div>
              <h3 className="text-2xl font-bold text-white mb-2">Standard ECN</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">Zero commission account with low spreads designed for discretionary traders.</p>
              
              <div className="text-3xl font-black text-white font-mono mb-6">$100 <span className="text-xs font-normal text-slate-500">min deposit</span></div>

              <ul className="space-y-3 text-xs text-slate-300 mb-8 border-t border-slate-800/80 pt-6">
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> <span>Spreads from 1.0 pips</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> <span>$0 Commission</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> <span>1:500 Leverage</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> <span>Instant Web3 Deposits</span></li>
              </ul>
            </div>

            <button 
              onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition"
            >
              Select Standard
            </button>
          </div>

          {/* RAW SPREAD (FEATURED) */}
          <div className="bg-gradient-to-b from-slate-900 to-[#0c121d] border-2 border-cyan-500 p-8 rounded-2xl flex flex-col justify-between relative shadow-2xl shadow-cyan-500/10">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-cyan-500 text-slate-950 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
              Most Popular
            </div>

            <div>
              <div className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest mb-2">Scalpers & Algorithmic</div>
              <h3 className="text-2xl font-bold text-white mb-2">Raw ECN Suite</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">Direct liquidity feeds with 0.0 pip spreads for high-frequency strategies.</p>
              
              <div className="text-3xl font-black text-white font-mono mb-6">$500 <span className="text-xs font-normal text-slate-500">min deposit</span></div>

              <ul className="space-y-3 text-xs text-slate-300 mb-8 border-t border-slate-800/80 pt-6">
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> <span>Raw spreads from 0.0 pips</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> <span>$3.50 per lot commission</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> <span>Equinix NY4 Direct Server</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> <span>Full EA & Algo Support</span></li>
              </ul>
            </div>

            <button 
              onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}
              className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs rounded-xl transition shadow-lg shadow-cyan-500/20"
            >
              Open Raw ECN Account
            </button>
          </div>

          {/* INSTITUTIONAL */}
          <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition">
            <div>
              <div className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest mb-2">High Volume Desk</div>
              <h3 className="text-2xl font-bold text-white mb-2">VIP Prime</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">Custom liquidity pools, dedicated account manager, and API access.</p>
              
              <div className="text-3xl font-black text-white font-mono mb-6">$10,000 <span className="text-xs font-normal text-slate-500">min deposit</span></div>

              <ul className="space-y-3 text-xs text-slate-300 mb-8 border-t border-slate-800/80 pt-6">
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> <span>0.0 Pip spreads + Reduced fees</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> <span>FIX API Access</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> <span>Dedicated VIP Account Manager</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> <span>Priority Withdrawal Queue</span></li>
              </ul>
            </div>

            <button 
              onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition"
            >
              Contact Institutional
            </button>
          </div>
        </div>
      </section>

      {/* --- PLATFORM FEATURES GRID --- */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-6 border-b border-slate-800/60 w-full">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">Institutional Infrastructure</h2>
          <p className="text-xs md:text-sm text-slate-400 max-w-xl mx-auto">Built from the ground up for active traders who require low latency and precision execution.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl hover:border-cyan-500/40 transition">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl w-fit mb-4">
              <BarChart2 className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Real-Time Terminal Execution</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">Live floating PnL, margin alerts, and single-click position closure built directly into our web terminal.</p>
          </div>

          <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl hover:border-cyan-500/40 transition">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl w-fit mb-4">
              <Globe className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Regional Wallet Integrations</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">Instant deposit gateways with Coins.ph, Luno, Binance Pay, and direct USDT TRC-20 support.</p>
          </div>

          <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl hover:border-cyan-500/40 transition">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl w-fit mb-4">
              <Lock className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Bank-Grade Segregation</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">Client capital is held in segregated Tier-1 bank accounts separate from broker operating funds.</p>
          </div>
        </div>
      </section>

      {/* --- FOOTER & LEGAL --- */}
      <footer id="support" className="bg-slate-950 border-t border-slate-800/80 pt-16 pb-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              <span className="font-extrabold text-white uppercase tracking-wider text-sm">Meridian Markets</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Global multi-asset brokerage offering raw liquidity, institutional ECN execution, and instant digital settlements.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-4">Navigation</h4>
            <ul className="space-y-2.5 text-[11px]">
              <li><a href="#markets" className="hover:text-cyan-400 transition">Market Prices</a></li>
              <li><a href="#accounts" className="hover:text-cyan-400 transition">Account Comparison</a></li>
              <li><a href="#features" className="hover:text-cyan-400 transition">Trading Platform</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-4">Supported Gateways</h4>
            <ul className="space-y-2.5 text-[11px] text-slate-500">
              <li>Coins.ph Regional Gateway</li>
              <li>Luno Wallet Deep Link</li>
              <li>Binance Pay (USDT / TRC-20)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-4">Institutional Support</h4>
            <div className="space-y-2.5 text-[11px]">
              <div className="flex items-center space-x-2"><Mail className="w-3.5 h-3.5 text-cyan-400" /> <span>support@meridianmarkets.com</span></div>
              <div className="flex items-center space-x-2"><Phone className="w-3.5 h-3.5 text-cyan-400" /> <span>+44 20 7946 0912</span></div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-slate-900 text-center text-[10px] text-slate-600 leading-relaxed">
          Risk Warning: Trading Forex, CFDs, and digital assets involves high risk to your capital. You should only trade money you can afford to lose. © 2026 Meridian Markets Ltd.
        </div>
      </footer>

      {/* --- AUTH MODAL --- */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {authMode === 'register' ? 'Create Live Trader Account' : 'Sign In To Terminal'}
                </h3>
                <p className="text-xs text-slate-400">
                  {authMode === 'register' ? 'Register to access the Meridian trading terminal' : 'Enter your credentials to continue'}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Full Legal Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. John Doe"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="trader@meridian.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {authMode === 'register' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Phone Number</label>
                  <input 
                    type="tel" 
                    required
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs rounded-xl transition mt-2 shadow-lg shadow-cyan-500/20"
              >
                {authMode === 'register' ? 'Register Account' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}