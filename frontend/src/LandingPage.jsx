import React, { useState, useEffect, useRef } from 'react';
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
  Layers,
  Cpu,
  HelpCircle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Menu,
  Sparkles,
  Gauge,
  Wallet,
  Users,
  Star,
  Clock
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

/* ---------------------------------------------------------------------------
   PRESENTATION ASSETS (visual only — swap these URLs for your own art anytime)
   Every <Photo> falls back to an animated gradient + chart artwork if the
   remote image is unavailable, so the layout never breaks.
--------------------------------------------------------------------------- */
const IMG = {
  terminal:  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1400&q=80',
  charts:    'https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&w=1400&q=80',
  trader:    'https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?auto=format&fit=crop&w=1200&q=80',
  desk:      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
  currency:  'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1200&q=80',
  skyline:   'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1400&q=80',
  vault:     'https://images.unsplash.com/photo-1560221328-12fe60f83ab8?auto=format&fit=crop&w=1200&q=80',
  analytics: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?auto=format&fit=crop&w=1200&q=80'
};

const TICKER = [
  { pair: 'EUR/USD', px: '1.0842 / 1.0843', chg: '+0.18%', up: true },
  { pair: 'GBP/USD', px: '1.2651 / 1.2652', chg: '+0.24%', up: true },
  { pair: 'USD/JPY', px: '155.12 / 155.14', chg: '-0.12%', up: false },
  { pair: 'XAU/USD', px: '2,384.10 / 2,384.60', chg: '+0.85%', up: true },
  { pair: 'BTC/USD', px: '64,210.00', chg: '+2.41%', up: true },
  { pair: 'AUD/USD', px: '0.6614 / 0.6615', chg: '+0.31%', up: true },
  { pair: 'USD/CHF', px: '0.9042 / 0.9044', chg: '-0.07%', up: false },
  { pair: 'ETH/USD', px: '3,480.10', chg: '+3.15%', up: true },
];

/* --------------------------- STYLES (scoped, additive) -------------------- */
function MeridianStyles() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

.mm-root{font-family:'Inter',ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased;}
.mm-display{font-family:'Sora','Inter',ui-sans-serif,system-ui,sans-serif;letter-spacing:-.025em;}
.mm-num{font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums;}

/* ---- motion ---- */
@keyframes mmFloat{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-16px,0)}}
@keyframes mmFloatSlow{0%,100%{transform:translate3d(0,0,0) rotate(0)}50%{transform:translate3d(0,-26px,0) rotate(4deg)}}
@keyframes mmDrift{0%{transform:translate3d(0,0,0) scale(1)}33%{transform:translate3d(60px,-40px,0) scale(1.12)}66%{transform:translate3d(-40px,30px,0) scale(.94)}100%{transform:translate3d(0,0,0) scale(1)}}
@keyframes mmMarquee{from{transform:translate3d(0,0,0)}to{transform:translate3d(-50%,0,0)}}
@keyframes mmSheen{from{background-position:-220% 0}to{background-position:220% 0}}
@keyframes mmDraw{from{stroke-dashoffset:1400}to{stroke-dashoffset:0}}
@keyframes mmPulseRing{0%{transform:scale(.9);opacity:.85}70%{transform:scale(2.1);opacity:0}100%{opacity:0}}
@keyframes mmGlow{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes mmScan{0%{transform:translateY(-100%)}100%{transform:translateY(900%)}}
@keyframes mmSpinSlow{to{transform:rotate(360deg)}}
@keyframes mmTick{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}

.mm-float{animation:mmFloat 6s ease-in-out infinite}
.mm-float-slow{animation:mmFloatSlow 11s ease-in-out infinite}
.mm-drift{animation:mmDrift 26s ease-in-out infinite}
.mm-spin-slow{animation:mmSpinSlow 34s linear infinite}
.mm-glow{animation:mmGlow 3.6s ease-in-out infinite}
.mm-tick{animation:mmTick 2.4s ease-in-out infinite}

/* ---- scroll reveal ---- */
.mm-reveal{opacity:0;transform:translate3d(0,26px,0);transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1)}
.mm-reveal.mm-in{opacity:1;transform:none}

/* ---- marquee ---- */
.mm-marquee{display:flex;width:max-content;animation:mmMarquee 42s linear infinite}
.mm-marquee-fast{animation-duration:26s}
.mm-marquee:hover{animation-play-state:paused}
.mm-fade-x{-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}

/* ---- surfaces ---- */
.mm-grid{background-image:linear-gradient(rgba(148,163,184,.09) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.09) 1px,transparent 1px);background-size:56px 56px;-webkit-mask-image:radial-gradient(ellipse 80% 60% at 50% 0%,#000 30%,transparent 78%);mask-image:radial-gradient(ellipse 80% 60% at 50% 0%,#000 30%,transparent 78%)}
.mm-card{background:linear-gradient(158deg,rgba(23,33,56,.86),rgba(9,14,28,.92));border:1px solid rgba(148,163,184,.14);backdrop-filter:blur(14px)}
.mm-card-hover{transition:transform .45s cubic-bezier(.16,1,.3,1),border-color .35s,box-shadow .45s}
.mm-card-hover:hover{transform:translateY(-8px);border-color:rgba(251,191,36,.55);box-shadow:0 26px 70px -28px rgba(251,191,36,.55)}
.mm-ring{box-shadow:0 0 0 1px rgba(251,191,36,.28),0 30px 90px -32px rgba(251,191,36,.5)}
.mm-sheen{background-image:linear-gradient(100deg,transparent 38%,rgba(255,255,255,.5) 50%,transparent 62%);background-size:220% 100%;animation:mmSheen 3.4s linear infinite}
.mm-gold-text{background:linear-gradient(96deg,#FDE68A 0%,#FBBF24 32%,#FCD34D 58%,#F59E0B 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.mm-cyan-text{background:linear-gradient(96deg,#67E8F9 0%,#22D3EE 50%,#38BDF8 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.mm-cta{background:linear-gradient(96deg,#FBBF24,#F59E0B 55%,#FBBF24);background-size:200% 100%;transition:background-position .6s cubic-bezier(.16,1,.3,1),transform .3s,box-shadow .3s}
.mm-cta:hover{background-position:100% 0;transform:translateY(-3px);box-shadow:0 22px 48px -18px rgba(251,191,36,.85)}
.mm-ghost{transition:transform .3s,border-color .3s,background-color .3s}
.mm-ghost:hover{transform:translateY(-3px);border-color:rgba(34,211,238,.6);background-color:rgba(8,145,178,.14)}
.mm-scanline{position:absolute;left:0;right:0;height:34%;background:linear-gradient(180deg,transparent,rgba(34,211,238,.13),transparent);animation:mmScan 5.5s linear infinite;pointer-events:none}
.mm-noise{background-image:radial-gradient(rgba(255,255,255,.05) 1px,transparent 1px);background-size:4px 4px}

/* focus + accessibility */
.mm-root a:focus-visible,.mm-root button:focus-visible,.mm-root input:focus-visible,.mm-root select:focus-visible{outline:2px solid #22D3EE;outline-offset:3px;border-radius:12px}

@media (prefers-reduced-motion: reduce){
  .mm-root *,.mm-root *::before,.mm-root *::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}
  .mm-reveal{opacity:1!important;transform:none!important}
}
`}</style>
  );
}

/* --------------------------- REVEAL ON SCROLL ----------------------------- */
function Reveal({ children, delay = 0, className = '', as: Tag = 'div', ...rest }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { setSeen(true); io.unobserve(e.target); } }),
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`mm-reveal ${seen ? 'mm-in' : ''} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* --------------------------- COUNT-UP NUMBER ------------------------------ */
function Counter({ to, prefix = '', suffix = '', decimals = 0, duration = 1600, className = '' }) {
  const ref = useRef(null);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf, start;
    const run = () => {
      const step = (t) => {
        if (!start) start = t;
        const p = Math.min((t - start) / duration, 1);
        setVal(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    if (typeof IntersectionObserver === 'undefined') { setVal(to); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { run(); io.unobserve(e.target); }
    }), { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [to, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}{val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </span>
  );
}

/* --------------------------- IMAGE WITH FALLBACK -------------------------- */
function Photo({ src, alt, className = '', imgClass = '', tint = 'from-cyan-500/25 via-indigo-500/10 to-amber-500/25' }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${tint}`} />
      <div className="absolute inset-0 mm-noise opacity-40" />
      {!failed && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className={`relative z-10 w-full h-full object-cover ${imgClass}`}
        />
      )}
      {failed && (
        <svg viewBox="0 0 400 240" className="relative z-10 w-full h-full opacity-70" aria-hidden="true">
          <polyline points="0,190 40,170 80,180 120,130 160,148 200,96 240,112 280,64 320,84 360,40 400,58"
            fill="none" stroke="#22D3EE" strokeWidth="3" />
          <polyline points="0,215 40,205 80,208 120,182 160,192 200,164 240,172 280,142 320,152 360,124 400,132"
            fill="none" stroke="#FBBF24" strokeWidth="2" strokeOpacity=".8" />
        </svg>
      )}
      <div className="absolute inset-0 z-20 bg-gradient-to-t from-[#060B18] via-[#060B18]/25 to-transparent" />
    </div>
  );
}

/* --------------------------- ANIMATED LIVE CHART -------------------------- */
function LiveChart({ height = 168 }) {
  const line = 'M0,132 L34,118 L68,126 L102,88 L136,104 L170,62 L204,80 L238,44 L272,58 L306,26 L340,38 L374,14 L408,26';
  return (
    <svg viewBox="0 0 408 150" preserveAspectRatio="none" style={{ height }} className="w-full" aria-hidden="true">
      <defs>
        <linearGradient id="mmFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="mmStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="55%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#FBBF24" />
        </linearGradient>
      </defs>
      {[30, 60, 90, 120].map((y) => (
        <line key={y} x1="0" y1={y} x2="408" y2={y} stroke="rgba(148,163,184,.14)" strokeWidth="1" />
      ))}
      <path d={`${line} L408,150 L0,150 Z`} fill="url(#mmFill)" />
      <path d={line} fill="none" stroke="url(#mmStroke)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray="1400" style={{ animation: 'mmDraw 2.6s cubic-bezier(.16,1,.3,1) forwards' }} />
      <circle cx="408" cy="26" r="4" fill="#FBBF24" className="mm-glow" />
      <circle cx="408" cy="26" r="9" fill="none" stroke="#FBBF24" strokeWidth="1.5"
        style={{ transformOrigin: '408px 26px', animation: 'mmPulseRing 2.2s ease-out infinite' }} />
    </svg>
  );
}

/* --------------------------- FLOATING FX GLYPHS --------------------------- */
function FloatingGlyphs() {
  const glyphs = [
    { s: '€', top: '12%', left: '6%',  d: '0s',   c: 'text-cyan-300/25',    size: 'text-6xl' },
    { s: '$', top: '68%', left: '9%',  d: '1.4s', c: 'text-amber-300/25',   size: 'text-5xl' },
    { s: '¥', top: '22%', right: '8%', d: '.8s',  c: 'text-emerald-300/25', size: 'text-5xl' },
    { s: '£', top: '74%', right: '12%',d: '2.1s', c: 'text-violet-300/25',  size: 'text-6xl' },
    { s: '₿', top: '44%', right: '4%', d: '1.1s', c: 'text-amber-200/20',   size: 'text-4xl' },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden="true">
      {glyphs.map((g, i) => (
        <span key={i}
          className={`absolute mm-display font-bold mm-float-slow ${g.c} ${g.size}`}
          style={{ top: g.top, left: g.left, right: g.right, animationDelay: g.d }}>
          {g.s}
        </span>
      ))}
    </div>
  );
}

/* --------------------------- AURORA BACKDROP ------------------------------ */
function Aurora() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -top-40 left-[8%] w-[620px] h-[620px] rounded-full blur-[150px] bg-amber-400/20 mm-drift" />
      <div className="absolute top-[18%] right-[2%] w-[560px] h-[560px] rounded-full blur-[150px] bg-cyan-400/20 mm-drift" style={{ animationDelay: '6s' }} />
      <div className="absolute top-[52%] left-[32%] w-[520px] h-[520px] rounded-full blur-[160px] bg-violet-500/18 mm-drift" style={{ animationDelay: '12s' }} />
      <div className="absolute top-[80%] right-[24%] w-[440px] h-[440px] rounded-full blur-[150px] bg-emerald-400/16 mm-drift" style={{ animationDelay: '18s' }} />
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('register'); // 'register' | 'login'
  const [activeTab, setActiveTab] = useState('forex');
  const [mobileNav, setMobileNav] = useState(false); // presentation only

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
    setMobileNav(false);
  };

  const navLinks = [
    { href: '#markets', label: 'Markets' },
    { href: '#accounts', label: 'Account tiers' },
    { href: '#features', label: 'Platform' },
    { href: '#security', label: 'Fund security' },
    { href: '#institutional', label: 'Institutional' },
  ];

  const tradeBtn =
    'px-4 py-2 bg-cyan-400/10 hover:bg-cyan-400 hover:text-slate-950 border border-cyan-400/40 text-cyan-300 rounded-lg font-sans font-extrabold transition duration-200 hover:shadow-lg hover:shadow-cyan-400/30';

  return (
    <div className="mm-root min-h-screen bg-[#060B18] text-slate-100 flex flex-col justify-between selection:bg-amber-400 selection:text-slate-950 relative overflow-x-hidden">
      <MeridianStyles />

      {/* ================= LIVE MARKET TICKER ================= */}
      <div className="relative z-50 bg-[#040814]/95 border-b border-white/5 backdrop-blur-xl">
        <div className="flex items-center">
          <div className="hidden sm:flex items-center gap-2 shrink-0 pl-5 pr-4 py-2.5 border-r border-white/10">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" style={{ animation: 'mmPulseRing 1.8s ease-out infinite' }} />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="mm-num text-[10px] font-bold tracking-[0.18em] text-emerald-300 uppercase">Live ECN</span>
          </div>

          <div className="mm-fade-x overflow-hidden flex-1 py-2.5">
            <div className="mm-marquee gap-8 pr-8">
              {[...TICKER, ...TICKER].map((t, i) => (
                <span key={i} className="flex items-center gap-2 text-[11px] whitespace-nowrap">
                  <span className="text-slate-400 font-semibold">{t.pair}</span>
                  <strong className="mm-num text-white">{t.px}</strong>
                  <span className={`mm-num font-bold ${t.up ? 'text-emerald-400' : 'text-rose-400'}`}>{t.chg}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 shrink-0 pl-4 pr-5 py-2.5 border-l border-white/10 text-[10px] font-bold tracking-[0.14em] text-amber-300 uppercase">
            <Shield className="w-3.5 h-3.5" />
            <span>Tier-1 liquidity</span>
          </div>
        </div>
      </div>

      {/* ================= NAVIGATION ================= */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#060B18]/80 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 py-3.5 flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 cursor-pointer group shrink-0" onClick={() => navigate('/')}>
            <div className="relative p-2.5 rounded-2xl bg-gradient-to-br from-amber-400/25 to-cyan-400/10 border border-amber-400/40 shadow-lg shadow-amber-500/20 transition duration-300 group-hover:border-amber-300 group-hover:shadow-amber-400/40">
              <Shield className="w-5 h-5 text-amber-300 transition duration-300 group-hover:scale-110" />
              <span className="absolute -inset-1 rounded-2xl bg-amber-400/20 blur-lg opacity-0 group-hover:opacity-100 transition duration-300" />
            </div>
            <div className="leading-none">
              <span className="mm-display block text-[17px] font-extrabold tracking-tight text-white transition group-hover:text-amber-300">Meridian</span>
              <span className="mm-num text-[9px] tracking-[0.34em] uppercase text-cyan-300/90 font-bold">Markets</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1 text-[13px] font-medium text-slate-300">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href}
                className="relative px-3.5 py-2 rounded-lg transition duration-200 hover:text-white hover:bg-white/5">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="mm-ghost hidden sm:flex px-4 py-2.5 text-[13px] font-semibold text-slate-200 rounded-xl border border-white/10 items-center gap-2 hover:text-white"
            >
              <LogIn className="w-4 h-4 text-cyan-300" />
              <span>Log in</span>
            </button>
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="mm-cta px-4 sm:px-5 py-2.5 text-slate-950 text-[13px] font-extrabold rounded-xl shadow-lg shadow-amber-500/25 flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden xs:inline sm:inline">Open account</span>
            </button>
            <button
              type="button"
              aria-label="Toggle menu"
              onClick={() => setMobileNav((v) => !v)}
              className="lg:hidden p-2.5 rounded-xl border border-white/10 text-slate-200 hover:bg-white/5 transition"
            >
              {mobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileNav && (
          <div className="lg:hidden border-t border-white/[0.07] bg-[#060B18]/98 backdrop-blur-2xl">
            <nav className="max-w-7xl mx-auto px-5 py-4 flex flex-col">
              {navLinks.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setMobileNav(false)}
                  className="flex items-center justify-between py-3 text-sm font-medium text-slate-300 border-b border-white/5 last:border-0 hover:text-amber-300 transition">
                  {l.label}
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </a>
              ))}
              <button type="button" onClick={() => openAuth('login')}
                className="mt-4 w-full py-3 rounded-xl border border-white/10 text-sm font-semibold text-slate-200 flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4 text-cyan-300" /> Log in
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden pt-14 sm:pt-20 pb-20 sm:pb-24">
        <Aurora />
        <div className="absolute inset-0 mm-grid pointer-events-none" />
        <FloatingGlyphs />

        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-10 items-center">

            {/* ---- copy ---- */}
            <div className="lg:col-span-6 text-center lg:text-left">
              <Reveal className="inline-flex items-center gap-2.5 rounded-full border border-cyan-400/35 bg-cyan-400/10 px-4 py-2 backdrop-blur-md">
                <Sparkles className="w-4 h-4 text-cyan-300 mm-tick" />
                <span className="text-[11px] sm:text-xs font-semibold tracking-wide text-cyan-100">
                  Institutional ECN liquidity · sub-12ms execution
                </span>
              </Reveal>

              <Reveal delay={80}>
                <h1 className="mm-display mt-7 text-[2.6rem] leading-[1.04] sm:text-6xl lg:text-[4.1rem] font-extrabold text-white">
                  Trade the world&rsquo;s currencies on
                  <span className="mm-gold-text"> raw institutional spreads</span>
                </h1>
              </Reveal>

              <Reveal delay={140}>
                <p className="mt-6 text-[15px] sm:text-lg leading-relaxed text-slate-300/90 max-w-xl mx-auto lg:mx-0">
                  120+ FX pairs, metals, indices and crypto — priced straight from Tier-1 liquidity,
                  with leverage to 1:500 and instant Web3 wallet funding.
                </p>
              </Reveal>

              <Reveal delay={200} className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 justify-center lg:justify-start">
                <button
                  type="button"
                  onClick={() => openAuth('register')}
                  className="mm-cta group px-8 py-4 rounded-2xl text-slate-950 font-extrabold text-sm shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2.5"
                >
                  <span>Open a live account</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
                <button
                  type="button"
                  onClick={() => openAuth('register')}
                  className="mm-ghost px-8 py-4 rounded-2xl border border-white/15 bg-white/[0.04] text-white font-bold text-sm backdrop-blur-md flex items-center justify-center gap-2.5"
                >
                  <BarChart2 className="w-4 h-4 text-cyan-300" />
                  <span>Start trading</span>
                </button>
              </Reveal>

              <Reveal delay={260} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 justify-center lg:justify-start text-[11px] font-semibold text-slate-400">
                <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Segregated client funds</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> No dealing desk</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Withdrawals in minutes</span>
              </Reveal>
            </div>

            {/* ---- hero terminal visual ---- */}
            <Reveal delay={180} className="lg:col-span-6">
              <div className="relative mx-auto max-w-[560px] lg:max-w-none">
                <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-tr from-amber-400/25 via-cyan-400/20 to-violet-500/25 blur-3xl mm-glow" />

                <div className="relative mm-card mm-ring rounded-3xl overflow-hidden mm-float">
                  {/* window chrome */}
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08] bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                      <span className="ml-3 mm-num text-[10px] tracking-widest text-slate-400 uppercase">Meridian terminal</span>
                    </div>
                    <span className="mm-num text-[10px] text-emerald-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mm-glow" /> streaming
                    </span>
                  </div>

                  {/* price header */}
                  <div className="px-5 pt-5 flex items-end justify-between">
                    <div>
                      <div className="text-[11px] font-semibold tracking-wide text-slate-400">EUR / USD · spot</div>
                      <div className="mm-num mt-1 text-3xl sm:text-4xl font-bold text-white">1.08422</div>
                    </div>
                    <div className="text-right">
                      <div className="mm-num inline-flex items-center gap-1 rounded-lg bg-emerald-400/12 px-2.5 py-1 text-sm font-bold text-emerald-300">
                        <ArrowUpRight className="w-4 h-4" /> +0.18%
                      </div>
                      <div className="mm-num mt-1.5 text-[10px] text-amber-300">spread 0.2 pips</div>
                    </div>
                  </div>

                  {/* chart */}
                  <div className="relative px-2 pt-3">
                    <LiveChart />
                    <div className="mm-scanline" />
                  </div>

                  {/* order tickets */}
                  <div className="grid grid-cols-2 gap-3 px-5 pb-5 pt-1">
                    <button type="button" onClick={() => openAuth('register')}
                      className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 py-3 text-left px-4 transition hover:bg-emerald-400/20 hover:border-emerald-400/60">
                      <div className="text-[10px] font-bold tracking-widest text-emerald-300 uppercase">Buy</div>
                      <div className="mm-num text-lg font-bold text-white">1.08422</div>
                    </button>
                    <button type="button" onClick={() => openAuth('register')}
                      className="rounded-xl border border-rose-400/30 bg-rose-400/10 py-3 text-left px-4 transition hover:bg-rose-400/20 hover:border-rose-400/60">
                      <div className="text-[10px] font-bold tracking-widest text-rose-300 uppercase">Sell</div>
                      <div className="mm-num text-lg font-bold text-white">1.08420</div>
                    </button>
                  </div>
                </div>

                {/* floating side cards */}
                <div className="hidden sm:block absolute -left-8 bottom-16 mm-card rounded-2xl px-4 py-3 shadow-2xl mm-float-slow" style={{ animationDelay: '1.2s' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-400/15 border border-amber-400/30">
                      <Gauge className="w-4 h-4 text-amber-300" />
                    </div>
                    <div>
                      <div className="mm-num text-sm font-bold text-white">11.4 ms</div>
                      <div className="text-[10px] text-slate-400">avg. fill time</div>
                    </div>
                  </div>
                </div>

                <div className="hidden sm:block absolute -right-6 -top-6 mm-card rounded-2xl px-4 py-3 shadow-2xl mm-float-slow" style={{ animationDelay: '2.4s' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-cyan-400/15 border border-cyan-400/30">
                      <Wallet className="w-4 h-4 text-cyan-300" />
                    </div>
                    <div>
                      <div className="mm-num text-sm font-bold text-emerald-300">+$2,418.60</div>
                      <div className="text-[10px] text-slate-400">floating P&amp;L</div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* ---- stats ---- */}
          <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {[
              { v: <Counter to={4.8} decimals={1} prefix="$" suffix="B+" />, l: 'Daily trading volume', c: 'text-white', i: TrendingUp, ic: 'text-cyan-300' },
              { v: '0.0 pips', l: 'Raw spreads from', c: 'mm-gold-text', i: Activity, ic: 'text-amber-300' },
              { v: '1:500', l: 'Flexible leverage', c: 'text-white', i: Layers, ic: 'text-violet-300' },
              { v: <><span>&lt; </span><Counter to={12} suffix="ms" /></>, l: 'Equinix NY4 execution', c: 'text-emerald-300', i: Cpu, ic: 'text-emerald-300' },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 90}
                className="mm-card mm-card-hover rounded-2xl p-5 sm:p-6 group">
                <s.i className={`w-5 h-5 mb-4 ${s.ic}`} />
                <div className={`mm-num text-2xl sm:text-[1.75rem] font-bold ${s.c}`}>{s.v}</div>
                <div className="mt-2 text-[11px] sm:text-xs font-medium text-slate-400">{s.l}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= TRUST STRIP ================= */}
      <section className="relative border-y border-white/[0.06] bg-white/[0.015] py-6">
        <div className="mm-fade-x overflow-hidden">
          <div className="mm-marquee mm-marquee-fast gap-12 pr-12 items-center">
            {[...Array(2)].map((_, r) => (
              <React.Fragment key={r}>
                {['Equinix NY4', 'LD4 London', 'TY3 Tokyo', 'Barclays LP', 'Citi Velocity', 'Jump Liquidity', 'XTX Markets', 'Segregated Tier-1 custody'].map((n, i) => (
                  <span key={`${r}-${i}`} className="flex items-center gap-2.5 whitespace-nowrap text-[13px] font-semibold text-slate-500">
                    <Award className="w-4 h-4 text-amber-400/70" />
                    {n}
                  </span>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ================= LIVE MARKET RATES ================= */}
      <section id="markets" className="relative py-20 sm:py-24 w-full overflow-hidden">
        <div className="absolute top-1/4 -left-40 w-[520px] h-[520px] rounded-full bg-cyan-500/10 blur-[150px] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-5 sm:px-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-10">
            <Reveal>
              <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold mb-3">
                <Activity className="w-4 h-4 mm-tick" />
                <span>Real-time pricing</span>
              </div>
              <h2 className="mm-display text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-white leading-tight">
                Institutional market rates
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-lg">
                Execution prices aggregated across Tier-1 providers and streamed to your terminal.
              </p>
            </Reveal>

            <Reveal delay={100} className="w-full lg:w-auto">
              <div className="flex bg-white/[0.04] p-1.5 rounded-2xl border border-white/10 text-xs font-semibold backdrop-blur-md w-full lg:w-auto">
                {['forex', 'crypto', 'commodities'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 lg:flex-none px-5 py-2.5 rounded-xl capitalize transition duration-300 ${
                      activeTab === tab
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-extrabold shadow-lg shadow-amber-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={140} className="mm-card rounded-3xl overflow-hidden shadow-2xl shadow-black/40">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/[0.03] border-b border-white/[0.08] text-slate-400 text-[10px] tracking-[0.16em] uppercase">
                    <th className="p-5 font-semibold">Instrument</th>
                    <th className="p-5 font-semibold">Bid</th>
                    <th className="p-5 font-semibold">Ask</th>
                    <th className="p-5 font-semibold">Spread</th>
                    <th className="p-5 font-semibold">24h change</th>
                    <th className="p-5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] mm-num">
                  {activeTab === 'forex' && (
                    <>
                      <tr className="hover:bg-cyan-400/[0.04] transition duration-200">
                        <td className="p-5 font-sans font-bold text-white">
                          <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,.5)]" />
                            <span className="text-sm">EUR / USD</span>
                          </div>
                        </td>
                        <td className="p-5 text-slate-200 font-bold">1.08420</td>
                        <td className="p-5 text-slate-200 font-bold">1.08422</td>
                        <td className="p-5 text-amber-300 font-bold">0.2 pips</td>
                        <td className="p-5 text-emerald-400 font-bold">
                          <div className="flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5" /><span>+0.18%</span></div>
                        </td>
                        <td className="p-5 text-right">
                          <button onClick={() => openAuth('register')} className={tradeBtn}>Trade</button>
                        </td>
                      </tr>
                      <tr className="hover:bg-cyan-400/[0.04] transition duration-200">
                        <td className="p-5 font-sans font-bold text-white">
                          <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,.5)]" />
                            <span className="text-sm">GBP / USD</span>
                          </div>
                        </td>
                        <td className="p-5 text-slate-200 font-bold">1.26510</td>
                        <td className="p-5 text-slate-200 font-bold">1.26513</td>
                        <td className="p-5 text-amber-300 font-bold">0.3 pips</td>
                        <td className="p-5 text-emerald-400 font-bold">
                          <div className="flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5" /><span>+0.24%</span></div>
                        </td>
                        <td className="p-5 text-right">
                          <button onClick={() => openAuth('register')} className={tradeBtn}>Trade</button>
                        </td>
                      </tr>
                      <tr className="hover:bg-cyan-400/[0.04] transition duration-200">
                        <td className="p-5 font-sans font-bold text-white">
                          <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_12px_2px_rgba(244,63,94,.5)]" />
                            <span className="text-sm">USD / JPY</span>
                          </div>
                        </td>
                        <td className="p-5 text-slate-200 font-bold">155.120</td>
                        <td className="p-5 text-slate-200 font-bold">155.124</td>
                        <td className="p-5 text-amber-300 font-bold">0.4 pips</td>
                        <td className="p-5 text-rose-400 font-bold">
                          <div className="flex items-center gap-1"><ArrowDownRight className="w-3.5 h-3.5" /><span>-0.12%</span></div>
                        </td>
                        <td className="p-5 text-right">
                          <button onClick={() => openAuth('register')} className={tradeBtn}>Trade</button>
                        </td>
                      </tr>
                    </>
                  )}

                  {activeTab === 'crypto' && (
                    <>
                      <tr className="hover:bg-cyan-400/[0.04] transition duration-200">
                        <td className="p-5 font-sans font-bold text-white">
                          <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,.5)]" />
                            <span className="text-sm">BTC / USD</span>
                          </div>
                        </td>
                        <td className="p-5 text-slate-200 font-bold">64,210.00</td>
                        <td className="p-5 text-slate-200 font-bold">64,212.50</td>
                        <td className="p-5 text-amber-300 font-bold">2.5 pips</td>
                        <td className="p-5 text-emerald-400 font-bold">
                          <div className="flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5" /><span>+2.41%</span></div>
                        </td>
                        <td className="p-5 text-right">
                          <button onClick={() => openAuth('register')} className={tradeBtn}>Trade</button>
                        </td>
                      </tr>
                      <tr className="hover:bg-cyan-400/[0.04] transition duration-200">
                        <td className="p-5 font-sans font-bold text-white">
                          <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,.5)]" />
                            <span className="text-sm">ETH / USD</span>
                          </div>
                        </td>
                        <td className="p-5 text-slate-200 font-bold">3,480.10</td>
                        <td className="p-5 text-slate-200 font-bold">3,480.90</td>
                        <td className="p-5 text-amber-300 font-bold">0.8 pips</td>
                        <td className="p-5 text-emerald-400 font-bold">
                          <div className="flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5" /><span>+3.15%</span></div>
                        </td>
                        <td className="p-5 text-right">
                          <button onClick={() => openAuth('register')} className={tradeBtn}>Trade</button>
                        </td>
                      </tr>
                    </>
                  )}

                  {activeTab === 'commodities' && (
                    <>
                      <tr className="hover:bg-cyan-400/[0.04] transition duration-200">
                        <td className="p-5 font-sans font-bold text-white">
                          <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,.5)]" />
                            <span className="text-sm">XAU / USD (Gold)</span>
                          </div>
                        </td>
                        <td className="p-5 text-slate-200 font-bold">2,384.10</td>
                        <td className="p-5 text-slate-200 font-bold">2,384.30</td>
                        <td className="p-5 text-amber-300 font-bold">0.2 pips</td>
                        <td className="p-5 text-emerald-400 font-bold">
                          <div className="flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5" /><span>+0.85%</span></div>
                        </td>
                        <td className="p-5 text-right">
                          <button onClick={() => openAuth('register')} className={tradeBtn}>Trade</button>
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= TERMINAL SHOWCASE ================= */}
      <section id="features" className="relative py-20 sm:py-24 overflow-hidden">
        <div className="absolute top-10 right-0 w-[560px] h-[560px] rounded-full bg-amber-500/10 blur-[160px] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 grid lg:grid-cols-2 gap-14 items-center">
          <Reveal>
            <div className="relative">
              <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-cyan-400/25 to-amber-400/25 blur-2xl" />
              <Photo
                src={IMG.terminal}
                alt="Multi-monitor forex trading terminal showing live charts"
                className="relative rounded-3xl border border-white/10 aspect-[4/3] shadow-2xl"
                imgClass="transition duration-700 hover:scale-105"
              />
              <div className="absolute z-30 bottom-5 left-5 right-5 mm-card rounded-2xl px-4 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-400/15 border border-emerald-400/30">
                    <Activity className="w-4 h-4 text-emerald-300" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-white">Open positions</div>
                    <div className="text-[10px] text-slate-400">4 running · 2 pending</div>
                  </div>
                </div>
                <div className="mm-num text-sm font-bold text-emerald-300">+3.62%</div>
              </div>
            </div>
          </Reveal>

          <div>
            <Reveal>
              <h2 className="mm-display text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold text-white leading-tight">
                A terminal built for the way you actually trade
              </h2>
              <p className="mt-5 text-[15px] sm:text-base text-slate-400 leading-relaxed max-w-lg">
                Floating P&amp;L, margin alerts and one-click position closure — all native to the browser.
                No downloads, no bridges, no lag between your decision and the market.
              </p>
            </Reveal>

            <div className="mt-9 space-y-3.5">
              {[
                { i: BarChart2, t: 'One-click execution', d: 'Market, limit and stop orders fill straight against streaming liquidity.', c: 'cyan' },
                { i: Gauge, t: 'Live risk view', d: 'Margin level, equity and exposure recalculate on every tick.', c: 'amber' },
                { i: Cpu, t: 'Algo and EA ready', d: 'Full API and expert-advisor support on the Raw ECN tier.', c: 'violet' },
              ].map((f, i) => (
                <Reveal key={i} delay={i * 110}
                  className="mm-card mm-card-hover rounded-2xl p-5 flex items-start gap-4">
                  <div className={`shrink-0 p-3 rounded-xl border ${
                    f.c === 'cyan' ? 'bg-cyan-400/12 border-cyan-400/30' :
                    f.c === 'amber' ? 'bg-amber-400/12 border-amber-400/30' :
                    'bg-violet-400/12 border-violet-400/30'}`}>
                    <f.i className={`w-5 h-5 ${
                      f.c === 'cyan' ? 'text-cyan-300' : f.c === 'amber' ? 'text-amber-300' : 'text-violet-300'}`} />
                  </div>
                  <div>
                    <h3 className="mm-display text-[15px] font-bold text-white">{f.t}</h3>
                    <p className="mt-1.5 text-[13px] text-slate-400 leading-relaxed">{f.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= INFRASTRUCTURE CARDS ================= */}
      <section className="relative py-20 sm:py-24 w-full">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <Reveal className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="mm-display text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              Institutional infrastructure, retail access
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-400">
              Built from the ground up for active traders who need low latency and precise fills.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { i: BarChart2, img: IMG.charts, t: 'Real-time terminal execution', d: 'Live floating P&L, margin alerts and single-click position closure built into the web terminal.', tint: 'from-cyan-500/40 to-blue-600/20', ring: 'border-cyan-400/30 bg-cyan-400/12', ic: 'text-cyan-300' },
              { i: Globe, img: IMG.currency, t: 'Regional wallet funding', d: 'Instant deposits via Coins.ph, Luno, Binance Pay and direct USDT TRC-20 transfers.', tint: 'from-amber-500/40 to-orange-600/20', ring: 'border-amber-400/30 bg-amber-400/12', ic: 'text-amber-300' },
              { i: Lock, img: IMG.vault, t: 'Bank-grade segregation', d: 'Client capital sits in segregated Tier-1 bank accounts, held apart from broker operating funds.', tint: 'from-violet-500/40 to-fuchsia-600/20', ring: 'border-violet-400/30 bg-violet-400/12', ic: 'text-violet-300' },
            ].map((f, i) => (
              <Reveal key={i} delay={i * 120}
                className="mm-card mm-card-hover rounded-3xl overflow-hidden group">
                <Photo src={f.img} alt={f.t} className="h-44" tint={f.tint}
                  imgClass="transition duration-700 group-hover:scale-110" />
                <div className="relative z-30 p-6 -mt-10">
                  <div className={`w-fit p-3.5 rounded-2xl border backdrop-blur-md mb-5 transition duration-300 group-hover:scale-110 ${f.ring}`}>
                    <f.i className={`w-6 h-6 ${f.ic}`} />
                  </div>
                  <h3 className="mm-display text-lg font-bold text-white">{f.t}</h3>
                  <p className="mt-2.5 text-[13px] text-slate-400 leading-relaxed">{f.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= ACCOUNT TIERS ================= */}
      <section id="accounts" className="relative py-20 sm:py-24 w-full overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[720px] h-[520px] rounded-full bg-amber-500/10 blur-[170px] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-5 sm:px-6">
          <Reveal className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="mm-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
              Pick the execution model that fits your size
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-400">
              Three tiers, one order book. Upgrade whenever your volume calls for it.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-7 items-start">

            {/* STANDARD */}
            <Reveal className="mm-card mm-card-hover rounded-3xl p-7 sm:p-8 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-cyan-300 mb-4">
                  <Users className="w-4 h-4" /><span>Retail trader</span>
                </div>
                <h3 className="mm-display text-2xl font-bold text-white">Standard ECN</h3>
                <p className="mt-2.5 text-[13px] text-slate-400 leading-relaxed">
                  Zero-commission account with low spreads, built for discretionary trading.
                </p>

                <div className="mt-7 flex items-baseline gap-2">
                  <span className="mm-num text-[2.75rem] leading-none font-bold text-white">$200</span>
                  <span className="text-xs text-slate-500">min deposit</span>
                </div>

                <ul className="mt-7 space-y-3.5 text-[13px] text-slate-300 border-t border-white/[0.08] pt-6">
                  {['Spreads from 1.0 pips', '$0 commission', '1:500 leverage', 'Instant Web3 deposits'].map((x) => (
                    <li key={x} className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" /><span>{x}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => openAuth('register')}
                className="mm-ghost mt-8 w-full py-3.5 rounded-xl border border-white/12 bg-white/[0.04] text-white font-bold text-[13px]"
              >
                Select Standard
              </button>
            </Reveal>

            {/* RAW ECN — FEATURED */}
            <Reveal delay={110} className="relative md:-mt-4">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-b from-amber-400/30 to-transparent blur-2xl mm-glow" />
              <div className="relative rounded-3xl p-7 sm:p-8 flex flex-col justify-between h-full border-2 border-amber-400/70 bg-gradient-to-b from-amber-400/[0.14] via-[#0B1224]/90 to-[#080D1B]/95 backdrop-blur-xl shadow-2xl shadow-amber-500/20">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-4 py-1.5 text-[10px] font-extrabold tracking-[0.14em] uppercase text-slate-950 shadow-lg shadow-amber-500/40">
                  Most popular
                </div>
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-amber-300 mb-4 mt-1">
                    <Zap className="w-4 h-4 fill-amber-300" /><span>Scalpers &amp; algorithmic</span>
                  </div>
                  <h3 className="mm-display text-2xl font-bold text-white">Raw ECN Suite</h3>
                  <p className="mt-2.5 text-[13px] text-slate-300 leading-relaxed">
                    Direct liquidity feeds at 0.0 pips for high-frequency and automated strategies.
                  </p>

                  <div className="mt-7 flex items-baseline gap-2">
                    <span className="mm-num text-[2.75rem] leading-none font-bold mm-gold-text">$1,000</span>
                    <span className="text-xs text-slate-400">min deposit</span>
                  </div>

                  <ul className="mt-7 space-y-3.5 text-[13px] text-slate-200 border-t border-amber-400/25 pt-6">
                    {['Raw spreads from 0.0 pips', '$3.50 per lot commission', 'Equinix NY4 direct server', 'Full EA & algo support'].map((x) => (
                      <li key={x} className="flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" /><span>{x}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => openAuth('register')}
                  className="mm-cta mt-8 w-full py-4 rounded-xl text-slate-950 font-extrabold text-[13px] shadow-lg shadow-amber-500/35"
                >
                  Open Raw ECN account
                </button>
              </div>
            </Reveal>

            {/* VIP PRIME */}
            <Reveal delay={220} id="institutional" className="mm-card mm-card-hover rounded-3xl p-7 sm:p-8 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-violet-300 mb-4">
                  <Award className="w-4 h-4" /><span>High volume desk</span>
                </div>
                <h3 className="mm-display text-2xl font-bold text-white">VIP Prime</h3>
                <p className="mt-2.5 text-[13px] text-slate-400 leading-relaxed">
                  Custom liquidity pools, a dedicated account manager and full API access.
                </p>

                <div className="mt-7 flex items-baseline gap-2">
                  <span className="mm-num text-[2.75rem] leading-none font-bold text-white">$10,000</span>
                  <span className="text-xs text-slate-500">min deposit</span>
                </div>

                <ul className="mt-7 space-y-3.5 text-[13px] text-slate-300 border-t border-white/[0.08] pt-6">
                  {['0.0 pip spreads + reduced fees', 'FIX API access', 'Dedicated VIP account manager', 'Priority withdrawal queue'].map((x) => (
                    <li key={x} className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" /><span>{x}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => openAuth('register')}
                className="mm-ghost mt-8 w-full py-3.5 rounded-xl border border-white/12 bg-white/[0.04] text-white font-bold text-[13px]"
              >
                Contact institutional desk
              </button>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ================= FUND SECURITY ================= */}
      <section id="security" className="relative py-20 sm:py-24 overflow-hidden">
        <div className="absolute bottom-0 left-0 w-[520px] h-[520px] rounded-full bg-emerald-500/10 blur-[160px] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 grid lg:grid-cols-2 gap-14 items-center">
          <div className="order-2 lg:order-1">
            <Reveal>
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold mb-4">
                <Lock className="w-4 h-4" /><span>Fund security</span>
              </div>
              <h2 className="mm-display text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold text-white leading-tight">
                Your capital never touches our balance sheet
              </h2>
              <p className="mt-5 text-[15px] sm:text-base text-slate-400 leading-relaxed max-w-lg">
                Deposits are held in segregated Tier-1 bank accounts and reconciled daily.
                Withdrawals clear through the same rail you funded with — usually within minutes.
              </p>
            </Reveal>

            <div className="mt-9 grid grid-cols-2 gap-4">
              {[
                { v: <Counter to={99.98} decimals={2} suffix="%" />, l: 'Platform uptime', c: 'text-emerald-300' },
                { v: <Counter to={186} suffix="+" />, l: 'Countries served', c: 'text-cyan-300' },
                { v: <Counter to={120} suffix="+" />, l: 'Tradable instruments', c: 'text-amber-300' },
                { v: '24 / 5', l: 'Desk coverage', c: 'text-violet-300' },
              ].map((s, i) => (
                <Reveal key={i} delay={i * 90} className="mm-card rounded-2xl p-5">
                  <div className={`mm-num text-2xl font-bold ${s.c}`}>{s.v}</div>
                  <div className="mt-1.5 text-[11px] text-slate-400 font-medium">{s.l}</div>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal delay={120} className="order-1 lg:order-2">
            <div className="relative">
              <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-tr from-emerald-400/25 to-cyan-400/25 blur-2xl" />
              <Photo
                src={IMG.skyline}
                alt="Global financial district at dusk"
                className="relative rounded-3xl border border-white/10 aspect-[5/4] shadow-2xl"
                tint="from-emerald-500/30 via-cyan-500/15 to-blue-600/25"
                imgClass="transition duration-700 hover:scale-105"
              />
              <div className="absolute z-30 top-5 right-5 mm-card rounded-2xl px-4 py-3 flex items-center gap-3 mm-float">
                <Shield className="w-5 h-5 text-emerald-300" />
                <div>
                  <div className="text-[11px] font-bold text-white">Segregated custody</div>
                  <div className="text-[10px] text-slate-400">Reconciled daily</div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= TRADERS / SOCIAL PROOF ================= */}
      <section className="relative py-20 sm:py-24 w-full">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <Reveal className="max-w-2xl mb-14">
            <h2 className="mm-display text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              Traders who moved and stayed
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-400">
              What people tell us after their first month on raw pricing.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { q: 'Slippage was eating a third of my edge on the old broker. On the Raw tier my backtest and my live curve finally look like the same strategy.', n: 'Daniel R.', r: 'Systematic FX, London', img: IMG.trader, a: 'text-amber-300' },
              { q: 'Funded with USDT at 11pm and had positions open before midnight. The deposit rail is the reason I stopped shopping around.', n: 'Amara O.', r: 'Discretionary swing, Lagos', img: IMG.desk, a: 'text-cyan-300' },
              { q: 'The margin view updates fast enough that I can size properly during news. That sounds small until you have traded without it.', n: 'Kenji T.', r: 'Intraday gold, Singapore', img: IMG.analytics, a: 'text-violet-300' },
            ].map((t, i) => (
              <Reveal key={i} delay={i * 120} className="mm-card mm-card-hover rounded-3xl overflow-hidden flex flex-col">
                <Photo src={t.img} alt={`${t.n}, trading workstation`} className="h-40"
                  imgClass="transition duration-700 hover:scale-110" />
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, s) => (
                      <Star key={s} className={`w-3.5 h-3.5 fill-current ${t.a}`} />
                    ))}
                  </div>
                  <p className="text-[13px] leading-relaxed text-slate-300 flex-1">{t.q}</p>
                  <div className="mt-6 pt-5 border-t border-white/[0.08]">
                    <div className="text-[13px] font-bold text-white">{t.n}</div>
                    <div className="text-[11px] text-slate-500">{t.r}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CLOSING CTA ================= */}
      <section className="relative py-20 sm:py-24 px-5 sm:px-6">
        <Reveal className="relative max-w-6xl mx-auto">
          <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-r from-amber-400/25 via-cyan-400/20 to-violet-500/25 blur-3xl mm-glow" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-gradient-to-br from-[#0D1730] via-[#0A1024] to-[#070C1B] px-7 sm:px-14 py-14 sm:py-16 text-center">
            <div className="absolute inset-0 mm-grid opacity-60 pointer-events-none" />
            <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-amber-400/20 blur-[110px] mm-drift" />
            <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-cyan-400/20 blur-[110px] mm-drift" style={{ animationDelay: '8s' }} />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-amber-400/10 px-4 py-2 text-[11px] font-semibold text-amber-200">
                <Clock className="w-3.5 h-3.5" /> Accounts open in under two minutes
              </div>
              <h2 className="mm-display mt-7 text-3xl sm:text-5xl font-extrabold text-white leading-[1.08] max-w-3xl mx-auto">
                Start trading on the spread you were always supposed to get
              </h2>
              <p className="mt-5 text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
                Fund with a card, a bank transfer or a crypto wallet — and take your first position today.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5">
                <button
                  type="button"
                  onClick={() => openAuth('register')}
                  className="mm-cta group px-8 py-4 rounded-2xl text-slate-950 font-extrabold text-sm shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2.5"
                >
                  <span>Open a live account</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
                <button
                  type="button"
                  onClick={() => openAuth('login')}
                  className="mm-ghost px-8 py-4 rounded-2xl border border-white/15 bg-white/[0.04] text-white font-bold text-sm flex items-center justify-center gap-2.5"
                >
                  <LogIn className="w-4 h-4 text-cyan-300" />
                  <span>Log in to terminal</span>
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ================= FOOTER ================= */}
      <footer id="support" className="relative bg-[#040814] text-slate-400 pt-16 pb-10 text-xs border-t border-white/[0.07]">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 mb-14">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-400/15 border border-amber-400/30">
                <Shield className="w-4 h-4 text-amber-300" />
              </div>
              <span className="mm-display font-extrabold text-white tracking-tight text-base">Meridian Markets</span>
            </div>
            <p className="text-[12px] text-slate-400 leading-relaxed max-w-xs">
              Global multi-asset brokerage offering raw liquidity, institutional ECN execution and instant digital settlement.
            </p>
            <div className="flex gap-2 pt-1">
              {['EUR', 'USD', 'JPY', 'GBP'].map((c) => (
                <span key={c} className="mm-num rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-slate-400">{c}</span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mm-display font-bold text-white text-[13px] mb-5">Navigation</h4>
            <ul className="space-y-3 text-[12px]">
              <li><a href="#markets" className="hover:text-amber-300 transition">Market prices</a></li>
              <li><a href="#accounts" className="hover:text-amber-300 transition">Account comparison</a></li>
              <li><a href="#features" className="hover:text-amber-300 transition">Trading platform</a></li>
              <li><a href="#security" className="hover:text-amber-300 transition">Fund security</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mm-display font-bold text-white text-[13px] mb-5">Supported gateways</h4>
            <ul className="space-y-3 text-[12px]">
              <li className="flex items-center gap-2"><Wallet className="w-3.5 h-3.5 text-cyan-400" /> Coins.ph regional gateway</li>
              <li className="flex items-center gap-2"><Wallet className="w-3.5 h-3.5 text-cyan-400" /> Luno wallet deep link</li>
              <li className="flex items-center gap-2"><Wallet className="w-3.5 h-3.5 text-cyan-400" /> Binance Pay (USDT / TRC-20)</li>
            </ul>
          </div>

          <div>
            <h4 className="mm-display font-bold text-white text-[13px] mb-5">Institutional support</h4>
            <div className="space-y-3 text-[12px]">
              <a href="mailto:support@meridianmarkets.com" className="flex items-center gap-2.5 hover:text-amber-300 transition">
                <Mail className="w-4 h-4 text-amber-400" /> <span>support@meridianmarkets.com</span>
              </a>
              <a href="tel:+442079460912" className="flex items-center gap-2.5 hover:text-amber-300 transition">
                <Phone className="w-4 h-4 text-amber-400" /> <span>+44 20 7946 0912</span>
              </a>
              <div className="flex items-center gap-2.5 text-slate-500">
                <HelpCircle className="w-4 h-4 text-amber-400" /> <span>Desk open 24/5</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-5 sm:px-6 pt-8 border-t border-white/[0.06] text-center text-[11px] text-slate-500 leading-relaxed">
          Risk warning: trading forex, CFDs and digital assets involves high risk to your capital. You should only trade money you can afford to lose. © 2026 Meridian Markets Ltd.
        </div>
      </footer>

      {/* ================= AUTH MODAL ================= */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-[#040814]/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="relative w-full max-w-md my-auto">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-amber-400/25 to-cyan-400/20 blur-2xl pointer-events-none" />
            <div className="relative rounded-3xl border border-white/12 bg-gradient-to-b from-[#0D1730] to-[#080D1B] p-7 sm:p-8 shadow-2xl">

              <div className="flex justify-between items-start mb-6 gap-4">
                <div>
                  <h3 className="mm-display text-xl font-bold text-white">
                    {authMode === 'register'
                      ? 'Create your live trading account'
                      : 'Sign in to the terminal'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5">
                    {authMode === 'register'
                      ? 'Takes about two minutes. No deposit required to look around.'
                      : 'Enter your credentials to continue.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="shrink-0 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {errorMsg && (
                <div className="mb-5 p-3.5 bg-rose-500/12 border border-rose-500/35 rounded-xl text-rose-300 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === 'register' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-2">Full legal name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. John Doe"
                        value={formData.fullName}
                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:bg-white/[0.07] transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-2">Email address</label>
                      <input
                        type="email"
                        required
                        placeholder="trader@meridian.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:bg-white/[0.07] transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-2">Phone number</label>
                      <div className="flex gap-2">
                        <select
                          value={formData.countryCode}
                          onChange={(e) => setFormData({...formData, countryCode: e.target.value})}
                          className="mm-num bg-white/[0.04] border border-white/10 rounded-xl px-2.5 py-3 text-[13px] text-white focus:outline-none focus:border-amber-400 max-w-[7.5rem]"
                        >
                          {COUNTRY_CODES.map((item) => (
                            <option key={item.code} value={item.code} className="bg-[#0D1730]">
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
                          className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:bg-white/[0.07] transition"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-2">Password</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:bg-white/[0.07] transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-2">Confirm password</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:bg-white/[0.07] transition"
                      />
                    </div>
                  </>
                )}

                {authMode === 'login' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-2">Email address</label>
                      <input
                        type="email"
                        required
                        placeholder="trader@meridian.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="mm-num w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:bg-white/[0.07] transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-2">Password</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="mm-num w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:bg-white/[0.07] transition"
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mm-cta w-full py-3.5 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-extrabold text-[13px] rounded-xl mt-5 shadow-lg shadow-amber-500/25"
                >
                  {loading
                    ? 'Processing...'
                    : authMode === 'register'
                      ? 'Register & enter terminal'
                      : 'Sign in'}
                </button>
              </form>

              <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-500">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Encrypted in transit · funds held in segregated accounts</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
