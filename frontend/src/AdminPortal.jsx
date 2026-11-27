import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Shield,
  Users,
  Search,
  LogOut,
  Wallet,
  Phone,
  LayoutDashboard,
  UserPlus,
  UserCheck,
  Globe,
  Mail,
  ShieldCheck,
  MessageCircle,
  PhoneCall,
  PhoneOff,
  PhoneOutgoing,
  PhoneIncoming,
  Delete,
  X,
  Check,
  Send,
  Menu,
  Clock,
  FileText,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Info,
  ChevronRight,
  Activity,
  Trash2,
  Key,
  Briefcase,
  TrendingUp,
  Bell,
  BellRing,
  Banknote,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Volume2,
  VolumeX,
  Inbox
} from 'lucide-react';

/* =====================================================================
   API ENDPOINTS
   Existing endpoints are unchanged. The "NEW" block lists the endpoints
   the KYC, WhatsApp and Fonitel dialer features expect your backend to
   expose (request/response shapes are documented next to each handler).
   ===================================================================== */
const API = {
  clients: '/api/admin/clients-detailed',
  agents: '/api/crm/agents',
  agentLogin: '/api/admin/agent-login',
  logout: '/api/auth/logout',
  assignAgent: '/api/admin/assign-agent',
  createAgent: '/api/admin/create-agent',
  adjustBalance: '/api/admin/adjust-balance',
  portfolios: '/api/admin/portfolios',
  deleteClient: (dbId) => `/api/admin/clients/${dbId}`,
  deleteAgent: (id) => `/api/admin/agents/${id}`,
  resetPassword: '/api/admin/reset-client-password',
  transactions: '/api/admin/transactions',
  reviewTransaction: '/api/admin/approve-transaction',
  // ---- KYC / messaging / dialer ----
  kycReview: '/api/crm/kyc/review',
  waMessages: '/api/crm/whatsapp/messages',
  waSend: '/api/crm/whatsapp/send',
  waCall: '/api/crm/whatsapp/call',
  dialCall: '/api/crm/dialer/call',
  dialStatus: '/api/crm/dialer/status',
  dialHangup: '/api/crm/dialer/hangup',
  dialDtmf: '/api/crm/dialer/dtmf',
  dialLogs: '/api/crm/dialer/logs'
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };
// Leave empty to use the host that served this page; set only if the API lives elsewhere (e.g. 'wss://api.example.com').
const CRM_WS_URL = '';

/* =====================================================================
   HELPERS
   ===================================================================== */
const loadJSON = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

/* ---------------------------------------------------------------------
   AUTHENTICATED API ACCESS
   Every CRM call carries the session token issued by the server at login.
   A 401 anywhere (expired session, deleted agent) signs the user out.
   --------------------------------------------------------------------- */
let AUTH_TOKEN = '';
let onAuthExpired = null;
const apiFetch = async (url, options = {}) => {
  const headers = { ...(options.headers || {}) };
  if (AUTH_TOKEN) headers.Authorization = `Bearer ${AUTH_TOKEN}`;
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 && AUTH_TOKEN && onAuthExpired) onAuthExpired();
  return res;
};
const readJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};
// <img>/<a> tags cannot send headers, so protected document URLs carry the token in the query string.
const withToken = (u) => (u && u.startsWith('/api/') && AUTH_TOKEN ? `${u}${u.includes('?') ? '&' : '?'}token=${encodeURIComponent(AUTH_TOKEN)}` : u);

const normalizeKyc = (s) => {
  const v = String(s || 'PENDING').trim().toUpperCase();
  if (v === 'VERIFIED' || v === 'APPROVED') return 'APPROVED';
  if (v === 'REJECTED' || v === 'DECLINED' || v === 'FAILED') return 'REJECTED';
  return 'PENDING';
};

const KYC_META = {
  PENDING: { label: 'Pending', badge: 'mx-b-warn', icon: Clock },
  APPROVED: { label: 'Approved', badge: 'mx-b-ok', icon: Check },
  REJECTED: { label: 'Rejected', badge: 'mx-b-bad', icon: X }
};

// Only allow http(s), same-origin paths and inline raster images as document sources.
const safeUrl = (u) => {
  if (typeof u !== 'string') return null;
  const t = u.trim();
  if (/^https?:\/\//i.test(t) || t.startsWith('/') || /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(t)) return t;
  return null;
};
const isImageUrl = (u) => /^data:image\//i.test(u) || /\.(png|jpe?g|gif|webp|avif)(\?.*)?$/i.test(u);

const normalizeDocs = (c) => {
  const raw = c.kyc_documents ?? c.kycDocuments ?? c.documents ?? [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((d, i) =>
      typeof d === 'string'
        ? { id: `doc-${i}`, type: 'Document', url: withToken(safeUrl(d)) }
        : {
            id: d.id ?? `doc-${i}`,
            type: d.type || d.doc_type || d.label || 'Document',
            name: d.name || d.filename || '',
            mime: d.mime || '',
            url: withToken(safeUrl(d.url || d.path || d.file_url)),
            uploadedAt: d.uploadedAt || d.uploaded_at || d.created_at || ''
          }
    )
    .filter((d) => d.url);
};

const digitsOnly = (p) => String(p || '').replace(/[^\d]/g, '');
const validPhone = (p) => digitsOnly(p).length >= 7;
const cleanDial = (s) => String(s || '').replace(/[^\d+*#]/g, '');

const fmtUSD = (n) =>
  '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPnl = (n) => `${(Number(n) || 0) >= 0 ? '+' : '-'}${fmtUSD(Math.abs(Number(n) || 0))}`;
const pnlTone = (n) => ((Number(n) || 0) >= 0 ? 'text-[var(--ok)]' : 'text-[var(--bad)]');
const fmtPrice = (v) => (v === null || v === undefined || v === '' ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: Number(v) < 10 ? 5 : 2 }));
const fmtDateTime = (v) => {
  const d = new Date(v);
  return isNaN(d) ? '—' : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const fmtClock = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const fmtDuration = (s) => {
  const t = Math.max(0, Math.round(s || 0));
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};
const prettyStage = (s) => {
  const t = String(s || '').replace(/_/g, ' ').toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const initials = (name) =>
  String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || '?';
const hueOf = (str) => {
  let h = 0;
  for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
};

const CALL_STATUS_META = {
  completed: { label: 'Completed', badge: 'mx-b-ok' },
  requested: { label: 'Requested', badge: 'mx-b-accent' },
  cancelled: { label: 'Cancelled', badge: 'mx-b-neutral' },
  'no-answer': { label: 'No answer', badge: 'mx-b-warn' },
  busy: { label: 'Busy', badge: 'mx-b-warn' },
  failed: { label: 'Failed', badge: 'mx-b-bad' }
};

/* =====================================================================
   STYLE SYSTEM (scoped to .mx-root)
   ===================================================================== */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
/* Full-bleed page: neutralise any framework default that narrows or centres #root (same reset the trading dashboard uses) */
html,body,#root,#__next{margin:0!important;padding:0!important;width:100%!important;max-width:none!important;min-height:100%;border:0!important;display:block!important;text-align:left!important;background:#F4F7FB}
body{overflow-x:hidden}
.mx-root{--bg:#F4F7FB;--panel:#FFFFFF;--raised:#F8FAFC;--line:#E2E8F0;--line-strong:#CBD5E1;
  --text:#0F172A;--ink:#0F172A;--muted:#64748B;--faint:#94A3B8;--accent:#2563EB;--accent-dark:#1D4ED8;--accent-soft:#EFF6FF;--accent-line:#BFDBFE;--accent-ink:#FFFFFF;
  --ok:#059669;--warn:#B45309;--bad:#E11D48;--wa:#25D366;
  width:100%;max-width:none;margin:0;border:0;
  font-family:'Inter',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:var(--text);background:var(--bg);
  -webkit-font-smoothing:antialiased}
.mx-root *{scrollbar-width:thin;scrollbar-color:rgba(100,116,139,.35) transparent}
.mx-root button{cursor:pointer}
.mx-num{font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}
.mx-card{background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:0 1px 2px rgba(15,23,42,.04),0 10px 28px -14px rgba(30,64,175,.16)}
.mx-field{width:100%;background:#fff;border:1px solid var(--line-strong);border-radius:12px;padding:.6rem .8rem;font-size:.875rem;color:var(--ink);outline:none;transition:border-color .15s,box-shadow .15s}
.mx-field::placeholder{color:#94A3B8}
.mx-field:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(37,99,235,.16)}
select.mx-field{padding-right:1.6rem}
.mx-label{display:block;font-size:.6875rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#475569;margin-bottom:.4rem}
.mx-eyebrow{font-size:.6875rem;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}
.mx-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;border-radius:12px;padding:.55rem .95rem;font-size:.8125rem;font-weight:700;border:1px solid var(--line);background:#fff;color:#334155;transition:all .15s;white-space:nowrap}
.mx-btn:hover:not(:disabled){border-color:var(--accent-line);background:var(--accent-soft);color:var(--accent-dark)}
.mx-btn:disabled{opacity:.5;cursor:not-allowed}
.mx-btn:focus-visible,.mx-icon-btn:focus-visible,.mx-nav:focus-visible,.mx-key:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.mx-btn-primary{background:linear-gradient(96deg,#2563EB,#1D4ED8);border-color:transparent;color:#fff;box-shadow:0 8px 18px -10px rgba(37,99,235,.75)}
.mx-btn-primary:hover:not(:disabled){background:linear-gradient(96deg,#2563EB,#1D4ED8);border-color:transparent;color:#fff;filter:brightness(1.08)}
.mx-btn-ok{background:#ECFDF5;border-color:#A7F3D0;color:#047857}
.mx-btn-ok:hover:not(:disabled){background:#D1FAE5;border-color:#6EE7B7;color:#065F46}
.mx-btn-bad{background:#FFF1F2;border-color:#FECDD3;color:#BE123C}
.mx-btn-bad:hover:not(:disabled){background:#FFE4E6;border-color:#FDA4AF;color:#9F1239}
.mx-btn-sm{padding:.35rem .65rem;font-size:.75rem;border-radius:10px}
.mx-icon-btn{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border-radius:10px;border:1px solid var(--line);background:#fff;color:#64748B;transition:.15s;flex-shrink:0}
.mx-icon-btn:hover:not(:disabled){color:var(--accent-dark);border-color:var(--accent-line);background:var(--accent-soft)}
.mx-icon-btn:disabled{opacity:.4;cursor:not-allowed}
.mx-icon-btn.call:hover:not(:disabled){color:#047857;border-color:#A7F3D0;background:#ECFDF5}
.mx-icon-btn.wa:hover:not(:disabled){color:#128C7E;border-color:#A7F3D0;background:#ECFDF5}
.mx-icon-btn.ok{color:#047857;border-color:#A7F3D0;background:#ECFDF5}
.mx-icon-btn.bad{color:#BE123C;border-color:#FECDD3;background:#FFF1F2}
.mx-badge{display:inline-flex;align-items:center;gap:.3rem;border-radius:999px;padding:.15rem .6rem;font-size:.6875rem;font-weight:700;border:1px solid transparent;white-space:nowrap}
.mx-b-warn{color:#B45309;background:#FFFBEB;border-color:#FDE68A}
.mx-b-ok{color:#047857;background:#ECFDF5;border-color:#A7F3D0}
.mx-b-bad{color:#BE123C;background:#FFF1F2;border-color:#FECDD3}
.mx-b-accent{color:#1D4ED8;background:#EFF6FF;border-color:#BFDBFE}
.mx-b-neutral{color:#475569;background:#F1F5F9;border-color:#E2E8F0}
.mx-nav{display:flex;align-items:center;gap:.7rem;width:100%;padding:.6rem .75rem;border-radius:12px;font-size:.875rem;font-weight:600;color:#475569;border:1px solid transparent;background:transparent;transition:.15s;text-align:left}
.mx-nav:hover{color:var(--accent-dark);background:var(--accent-soft)}
.mx-nav.active{color:#fff;background:var(--accent);box-shadow:0 8px 16px -8px rgba(37,99,235,.55);font-weight:700}
.mx-nav-count{margin-left:auto;font-size:.6875rem;font-weight:700;padding:.05rem .45rem;border-radius:999px;background:#E2E8F0;color:#475569}
.mx-nav-count.warn{background:#FEF3C7;color:#B45309}
.mx-nav.active .mx-nav-count{background:rgba(255,255,255,.25);color:#fff}
.mx-th{padding:.75rem 1.25rem;font-size:.6875rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64748B;text-align:left;white-space:nowrap}
.mx-td{padding:.9rem 1.25rem;vertical-align:middle}
.mx-row{transition:background .15s}
.mx-row:hover{background:var(--accent-soft)}
.mx-chip{border:1px solid var(--line);background:#fff;color:#475569;border-radius:999px;padding:.3rem .8rem;font-size:.75rem;font-weight:700;transition:.15s;display:inline-flex;gap:.4rem;align-items:center}
.mx-chip:hover{color:var(--accent-dark);border-color:var(--accent-line);background:var(--accent-soft)}
.mx-chip.on{background:var(--accent);border-color:var(--accent);color:#fff}
.mx-key{height:56px;border-radius:14px;background:#F8FAFC;border:1px solid var(--line);color:var(--ink);font-size:1.25rem;font-weight:500;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1;transition:.1s}
.mx-key:hover{background:var(--accent-soft);border-color:var(--accent-line)}
.mx-key:active{transform:scale(.96)}
.mx-key small{font-size:.5625rem;letter-spacing:.14em;color:var(--faint);margin-top:3px;font-weight:600;height:9px}
.mx-bubble-out{background:#DCFCE7;border:1px solid #BBF7D0;border-radius:14px 14px 4px 14px}
.mx-bubble-in{background:#F1F5F9;border:1px solid var(--line);border-radius:14px 14px 14px 4px}
.mx-divider{height:1px;background:var(--line)}
.mx-kpi{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;text-align:center}
.mx-kpi .mx-eyebrow{display:flex;align-items:center;justify-content:center;text-align:center}
@media (max-width:1699px){.mx-kpi .mx-eyebrow{min-height:2.3em}}
@keyframes mx-pulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes mx-ring{0%{box-shadow:0 0 0 0 rgba(5,150,105,.45)}100%{box-shadow:0 0 0 14px rgba(5,150,105,0)}}
@keyframes mx-bell{0%,100%{transform:rotate(0)}15%{transform:rotate(14deg)}30%{transform:rotate(-12deg)}45%{transform:rotate(8deg)}60%{transform:rotate(-6deg)}75%{transform:rotate(0)}}
@keyframes mx-in-right{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}
@keyframes mx-in-up{from{transform:translateY(10px);opacity:0}to{transform:none;opacity:1}}
@keyframes mx-flash{0%{background-color:#DBEAFE}100%{background-color:transparent}}
.mx-pulse{animation:mx-pulse 1.4s ease-in-out infinite}
.mx-ring{animation:mx-ring 1.4s ease-out infinite}
.mx-bell{animation:mx-bell .9s ease-in-out 2}
.mx-in-right{animation:mx-in-right .22s ease-out}
.mx-in-up{animation:mx-in-up .2s ease-out}
.mx-new{animation:mx-flash 2.4s ease-out}
@media (prefers-reduced-motion:reduce){.mx-pulse,.mx-ring,.mx-bell,.mx-in-right,.mx-in-up,.mx-new{animation:none}}
`;

/* =====================================================================
   SMALL PRESENTATIONAL COMPONENTS
   ===================================================================== */
function Avatar({ name, size = 36 }) {
  const h = hueOf(name);
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold shrink-0 select-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `hsl(${h} 85% 94%)`,
        color: `hsl(${h} 60% 32%)`,
        border: `1px solid hsl(${h} 70% 82%)`
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}

function KycBadge({ status }) {
  const m = KYC_META[status] || KYC_META.PENDING;
  const Icon = m.icon;
  return (
    <span className={`mx-badge ${m.badge}`}>
      <Icon className="w-3 h-3" />
      {m.label}
    </span>
  );
}

const timeAgo = (v) => {
  const t = new Date(v).getTime();
  if (!t) return '—';
  const sec = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (sec < 45) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h ago`;
  return `${Math.floor(hr / 24)} d ago`;
};
// Short two-tone chime for new cash requests (browsers only allow sound after the user has clicked the page once)
const playPing = () => {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t0 = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t0);
    osc.frequency.setValueAtTime(1175, t0 + 0.13);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.44);
    setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch {
    /* audio unavailable */
  }
};
function TxTypeBadge({ type }) {
  const dep = type === 'DEPOSIT';
  const Icon = dep ? ArrowDownLeft : ArrowUpRight;
  return (
    <span className={`mx-badge ${dep ? 'mx-b-ok' : 'mx-b-warn'}`}>
      <Icon className="w-3 h-3" />
      {dep ? 'Deposit' : 'Withdrawal'}
    </span>
  );
}
function TxStatusBadge({ status }) {
  const m = status === 'APPROVED' ? ['mx-b-ok', 'Approved'] : status === 'REJECTED' ? ['mx-b-bad', 'Rejected'] : ['mx-b-warn', 'Pending'];
  return <span className={`mx-badge ${m[0]}`}>{m[1]}</span>;
}

function StatCard({ label, value, tone = 'text-[var(--ink)]', hint, children, onClick }) {
  return (
    <div
      className={`mx-card mx-kpi p-5 w-full ${onClick ? 'cursor-pointer hover:border-[var(--accent-line)] transition' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
    >
      <div className="mx-eyebrow">{label}</div>
      <div className={`mx-num text-[1.65rem] font-extrabold mt-2 leading-none ${tone}`}>{value}</div>
      {hint && <div className="text-xs text-[var(--muted)] mt-2">{hint}</div>}
      {children && <div className="w-full">{children}</div>}
    </div>
  );
}

function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">{title}</h2>
        {subtitle && <p className="text-sm text-[var(--muted)] mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ icon: Icon = Info, title, text }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="inline-flex p-3 rounded-2xl bg-[var(--raised)] border border-[var(--line)] mb-3">
        <Icon className="w-5 h-5 text-[var(--muted)]" />
      </div>
      <div className="text-sm font-medium text-[var(--ink)]">{title}</div>
      {text && <div className="text-xs text-[var(--muted)] mt-1 max-w-xs mx-auto">{text}</div>}
    </div>
  );
}

// Click-to-call (VoIP) + WhatsApp shortcuts, used next to every client phone number.
function PhoneActions({ phone, onCall, onWhatsApp }) {
  const ok = validPhone(phone);
  return (
    <span className="inline-flex gap-1.5" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="mx-icon-btn call"
        disabled={!ok}
        onClick={onCall}
        title={ok ? 'Call with Fonitel dialer' : 'No valid phone number'}
        aria-label="Call client with dialer"
      >
        <Phone className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        className="mx-icon-btn wa"
        disabled={!ok}
        onClick={onWhatsApp}
        title={ok ? 'Open WhatsApp chat' : 'No valid phone number'}
        aria-label="Open WhatsApp chat"
      >
        <MessageCircle className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}

function CallTimer({ startedAt }) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="mx-num">{fmtDuration((Date.now() - startedAt) / 1000)}</span>;
}

/* =====================================================================
   KYC REVIEW PANEL  (used in KYC Center and client profile)
   ===================================================================== */
function KycPanel({ client, onReview, onRetry, onPreview }) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  useEffect(() => {
    setRejecting(false);
    setNote('');
  }, [client.id]);

  const docs = client.kycDocs || [];
  const status = client.kycStatus;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <KycBadge status={status} />
          {client.kycReviewedBy && (
            <span className="text-xs text-[var(--muted)]">
              Reviewed by <span className="text-[var(--ink)]">{client.kycReviewedBy}</span>
              {client.kycReviewedAt ? ` · ${fmtDateTime(client.kycReviewedAt)}` : ''}
            </span>
          )}
        </div>
        {client.kycUnsynced && (
          <button type="button" className="mx-btn mx-btn-sm" onClick={() => onRetry(client)}>
            <RefreshCw className="w-3 h-3" /> Not synced — retry
          </button>
        )}
      </div>

      {status === 'REJECTED' && client.kycNote && (
        <div className="rounded-xl border border-[rgba(251,113,133,.3)] bg-[rgba(251,113,133,.07)] p-3.5">
          <div className="mx-eyebrow !text-[var(--bad)] mb-1">Rejection note</div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{client.kycNote}</p>
        </div>
      )}

      {(client.kycFullName || client.kycIdNumber) && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4">
          <div className="mx-eyebrow mb-2">Details submitted by the client</div>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-[11px] text-[var(--muted)]">Full legal name</dt>
              <dd className="text-[var(--ink)] break-words">{client.kycFullName || '—'}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-[var(--muted)]">Document type</dt>
              <dd className="text-[var(--ink)]">{client.kycDocType || '—'}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-[var(--muted)]">Document number</dt>
              <dd className="text-[var(--ink)] mx-num break-all">{client.kycIdNumber || '—'}</dd>
            </div>
          </dl>
          {client.kycSubmittedAt && <div className="text-[11px] text-[var(--muted)] mt-2">Submitted {fmtDateTime(String(client.kycSubmittedAt).replace(' ', 'T') + 'Z')}</div>}
        </div>
      )}

      <div>
        <div className="mx-eyebrow mb-3">Submitted documents ({docs.length})</div>
        {docs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line-strong)] p-6 text-center">
            <FileText className="w-5 h-5 text-[var(--muted)] mx-auto mb-2" />
            <div className="text-sm text-[var(--ink)]">No documents attached to this record</div>
            <div className="text-xs text-[var(--muted)] mt-1">
              Documents appear here once the client uploads ID through the platform.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {docs.map((d) =>
              isImageUrl(d.url) ? (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onPreview(d)}
                  className="group text-left rounded-xl overflow-hidden border border-[var(--line)] bg-[var(--bg)] hover:border-[var(--accent)] transition"
                >
                  <div className="aspect-[4/3] bg-[var(--raised)] overflow-hidden">
                    <img src={d.url} alt={`${d.type} for ${client.name}`} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  </div>
                  <div className="px-3 py-2 text-xs font-medium text-[var(--ink)] truncate">{d.type}</div>
                </button>
              ) : (
                <a
                  key={d.id}
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-[var(--line)] bg-[var(--bg)] hover:border-[var(--accent)] transition p-4 flex flex-col items-center justify-center gap-2 text-center aspect-[4/3]"
                >
                  <FileText className="w-6 h-6 text-[var(--accent)]" />
                  <span className="text-xs font-medium text-[var(--ink)] truncate max-w-full">{d.type}</span>
                  <span className="text-[10px] text-[var(--muted)] flex items-center gap-1">
                    Open <ExternalLink className="w-3 h-3" />
                  </span>
                </a>
              )
            )}
          </div>
        )}
      </div>

      <div className="mx-divider" />

      {rejecting ? (
        <div className="space-y-3 mx-in-up">
          <label className="mx-label" htmlFor={`kyc-note-${client.id}`}>
            Rejection note <span className="normal-case tracking-normal text-[var(--faint)] font-normal">(optional)</span>
          </label>
          <textarea
            id={`kyc-note-${client.id}`}
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Passport photo is blurry — please re-upload a clear scan."
            className="mx-field resize-none"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button type="button" className="mx-btn" onClick={() => setRejecting(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="mx-btn mx-btn-bad"
              onClick={() => {
                onReview(client.id, 'REJECTED', note);
                setRejecting(false);
                setNote('');
              }}
            >
              <X className="w-4 h-4" /> Confirm rejection
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="mx-btn mx-btn-ok flex-1 min-w-[140px]"
            disabled={status === 'APPROVED'}
            onClick={() => onReview(client.id, 'APPROVED', '')}
          >
            <Check className="w-4 h-4" /> {status === 'APPROVED' ? 'Approved' : 'Approve KYC'}
          </button>
          <button
            type="button"
            className="mx-btn mx-btn-bad flex-1 min-w-[140px]"
            disabled={status === 'REJECTED'}
            onClick={() => setRejecting(true)}
          >
            <X className="w-4 h-4" /> {status === 'REJECTED' ? 'Rejected' : 'Reject KYC'}
          </button>
        </div>
      )}
    </div>
  );
}

/* =====================================================================
   WHATSAPP CHAT PANE
   ===================================================================== */
function ChatPane({ client, messages, online, agentName, onSend, onRetry, onVoice, onWaCall }) {
  const [draft, setDraft] = useState('');
  const scroller = useRef(null);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages.length, client.id]);

  const lastIn = [...messages].reverse().find((m) => m.dir === 'in');
  const windowOpen = !!lastIn && Date.now() - lastIn.ts < 24 * 3600 * 1000;
  const phoneOk = validPhone(client.phone);

  const quick = [
    `Hello ${client.name.split(' ')[0]}, this is ${agentName} from Meridian Market. How can I help today?`,
    'Please upload a clear photo of your government ID to complete verification.',
    'Thanks for your time — let me know if you have any questions.'
  ];

  const submit = () => {
    if (!draft.trim()) return;
    onSend(client, draft);
    setDraft('');
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--line)]">
        <Avatar name={client.name} size={36} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[var(--ink)] truncate">{client.name}</div>
          <div className="text-xs text-[var(--muted)] flex items-center gap-1.5">
            <span className="mx-num">{client.phone}</span>
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${online === false ? 'bg-[var(--bad)]' : online ? 'bg-[var(--wa)]' : 'bg-[var(--faint)]'}`}
            />
            <span>{online === false ? 'Gateway offline' : online ? 'Connected' : 'Connecting…'}</span>
          </div>
        </div>
        <button
          type="button"
          className="mx-icon-btn wa"
          disabled={!phoneOk}
          onClick={() => onWaCall(client)}
          title="Start WhatsApp call"
          aria-label="Start WhatsApp call"
        >
          <PhoneCall className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          className="mx-icon-btn call"
          disabled={!phoneOk}
          onClick={() => onVoice(client)}
          title="Call with Fonitel dialer"
          aria-label="Call with dialer"
        >
          <Phone className="w-3.5 h-3.5" />
        </button>
      </div>

      <div ref={scroller} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-2.5">
        {messages.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No messages yet"
            text={
              online === false
                ? 'The WhatsApp gateway is not reachable, so history could not be loaded.'
                : 'Send the first message to start the conversation.'
            }
          />
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.dir === 'out' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] px-3.5 py-2 ${m.dir === 'out' ? 'mx-bubble-out' : 'mx-bubble-in'}`}>
                <p className="text-sm text-[var(--ink)] whitespace-pre-wrap break-words">{m.text}</p>
                <div className="flex items-center justify-end gap-2 mt-1 text-[10px] text-[var(--muted)]">
                  <span>{fmtClock(m.ts)}</span>
                  {m.dir === 'out' && (
                    <span className={m.status === 'failed' ? 'text-[var(--bad)]' : ''}>
                      {m.status === 'sending' ? 'Sending…' : m.status === 'failed' ? 'Not sent' : m.status === 'read' ? '✓✓ Read' : m.status === 'delivered' ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
                {m.status === 'failed' && (
                  <div className="flex gap-3 mt-1.5 text-[11px]">
                    <button type="button" className="text-[var(--accent)] hover:underline" onClick={() => onRetry(client, m)}>
                      Retry
                    </button>
                    <a
                      className="text-[var(--accent)] hover:underline"
                      href={`https://wa.me/${digitsOnly(client.phone)}?text=${encodeURIComponent(m.text)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open in WhatsApp
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-[var(--line)] p-3 space-y-2.5">
        {!windowOpen && (
          <div className="flex gap-2 items-start text-[11px] text-[var(--muted)] bg-[rgba(245,181,61,.07)] border border-[rgba(245,181,61,.2)] rounded-lg px-3 py-2">
            <Info className="w-3.5 h-3.5 text-[var(--warn)] shrink-0 mt-px" />
            <span>
              No client message in the last 24 hours. WhatsApp only allows approved template messages to start a
              conversation — your gateway decides how this message is delivered.
            </span>
          </div>
        )}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {quick.map((q, i) => (
            <button key={i} type="button" className="mx-chip shrink-0 max-w-[220px]" onClick={() => setDraft(q)} title={q}>
              <span className="truncate">{q}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-end">
          <textarea
            rows={1}
            value={draft}
            disabled={!phoneOk}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={phoneOk ? 'Type a WhatsApp message…' : 'Client has no valid phone number'}
            aria-label="WhatsApp message"
            className="mx-field resize-none max-h-32"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim() || !phoneOk}
            className="mx-btn !bg-[var(--wa)] !border-transparent !text-[#04210f] hover:!brightness-110 !h-[42px]"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   SOFTPHONE (Fonitel dialer keypad)
   ===================================================================== */
const KEYS = [
  ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
  ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
  ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
  ['*', ''], ['0', ''], ['#', '']
];

function SoftPhone({ number, setNumber, session, onCall, onHangup, onDtmf, onClose }) {
  const live = session && session.status !== 'ended';
  const statusText = !session
    ? 'Ready'
    : session.status === 'dialing'
    ? 'Connecting…'
    : session.status === 'ringing'
    ? 'Ringing…'
    : session.status === 'connected'
    ? null
    : session.endStatus === 'failed'
    ? session.error || 'Call failed'
    : `Call ended · ${fmtDuration(session.duration)}`;

  const press = (k) => {
    if (live && session.status === 'connected') {
      onDtmf(k);
    } else if (!live) {
      setNumber((n) => (n + k).slice(0, 32));
    }
  };

  return (
    <div className="mx-card p-4 w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[rgba(52,211,153,.12)]">
            <PhoneCall className="w-4 h-4 text-[var(--ok)]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--ink)] leading-none">Fonitel Dialer</div>
            <div className="text-[11px] text-[var(--muted)] mt-1">VoIP softphone</div>
          </div>
        </div>
        {onClose && (
          <button type="button" className="mx-icon-btn" onClick={onClose} aria-label="Close dialer">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="rounded-xl bg-[var(--bg)] border border-[var(--line)] px-3 py-3 mb-3 min-h-[84px]">
        {live && session.clientName && <div className="text-xs text-[var(--muted)] truncate">{session.clientName}</div>}
        <div className="flex items-center gap-2">
          <input
            value={live ? session.number : number}
            readOnly={!!live}
            onChange={(e) => setNumber(cleanDial(e.target.value).slice(0, 32))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !live) onCall(number);
            }}
            placeholder="Enter number"
            inputMode="tel"
            aria-label="Phone number"
            className="mx-num w-full bg-transparent text-xl font-medium text-[var(--ink)] outline-none placeholder:text-[var(--faint)]"
          />
          {!live && number && (
            <button type="button" className="mx-icon-btn" onClick={() => setNumber((n) => n.slice(0, -1))} aria-label="Backspace">
              <Delete className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="text-xs mt-1 h-4 flex items-center gap-1.5">
          {live && session.status !== 'connected' && <span className="w-1.5 h-1.5 rounded-full bg-[var(--warn)] mx-pulse" />}
          {live && session.status === 'connected' ? (
            <span className="text-[var(--ok)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)] mx-pulse" />
              Connected · <CallTimer startedAt={session.startedAt} />
            </span>
          ) : (
            <span className={session?.endStatus === 'failed' ? 'text-[var(--bad)]' : 'text-[var(--muted)]'}>{statusText}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {KEYS.map(([k, sub]) => (
          <button key={k} type="button" className="mx-key" onClick={() => press(k)} aria-label={`Key ${k}`}>
            <span className="mx-num">{k}</span>
            <small>{sub}</small>
          </button>
        ))}
      </div>

      <div className="mt-3">
        {live ? (
          <button
            type="button"
            onClick={onHangup}
            className="mx-btn w-full !h-12 !bg-[var(--bad)] !border-transparent !text-white hover:!brightness-110 !text-sm"
          >
            <PhoneOff className="w-4 h-4" /> End call
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onCall(number)}
            disabled={cleanDial(number).length < 3}
            className="mx-btn w-full !h-12 !bg-[var(--ok)] !border-transparent !text-[#032416] hover:!brightness-110 !text-sm"
          >
            <PhoneCall className="w-4 h-4" /> Call
          </button>
        )}
      </div>
    </div>
  );
}

/* =====================================================================
   MAIN APPLICATION
   ===================================================================== */
export default function AdminPortal() {
  // -------------------------------------------------------------
  // 1. AUTH & ROLE MANAGEMENT
  // -------------------------------------------------------------
  // A saved session without a server-issued token (older builds) is discarded: the user signs in again.
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = loadJSON('meridian_crm_auth', null);
    AUTH_TOKEN = saved && saved.token ? saved.token : '';
    return AUTH_TOKEN ? saved : null;
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Agents state with local storage persistence & backend sync
  const [agents, setAgents] = useState(() => loadJSON('meridian_crm_agents', []));
  useEffect(() => {
    localStorage.setItem('meridian_crm_agents', JSON.stringify(agents));
  }, [agents]);

  // Fetch agents directly from database
  const fetchBackendAgents = useCallback(async () => {
    try {
      const res = await apiFetch(API.agents);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.agents)) {
          setAgents(data.agents);
        }
      }
    } catch (err) {
      console.warn('Could not fetch backend agents:', err);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchBackendAgents();
    }
  }, [currentUser, fetchBackendAgents]);

  // All credentials are verified by the server, which issues the session token every later call carries.
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    const cleanedEmail = loginEmail.trim().toLowerCase();
    try {
      const res = await fetch(API.agentLogin, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ email: cleanedEmail, password: loginPassword })
      });
      const data = await readJson(res);
      if (res.ok && data.token) {
        const a = data.agent || {};
        const isAdminRole = (data.role || a.role) === 'ADMIN';
        const user = {
          name: a.name,
          email: a.email,
          role: isAdminRole ? 'ADMIN' : 'AGENT',
          agentId: isAdminRole ? 'ADMIN_01' : String(a.name || '').trim(),
          dbAgentId: a.id,
          token: data.token
        };
        AUTH_TOKEN = data.token;
        setCurrentUser(user);
        localStorage.setItem('meridian_crm_auth', JSON.stringify(user));
        setLoginPassword('');
        return;
      }
      setLoginError(res.status === 429 ? data.error || 'Too many attempts. Please wait a few minutes.' : 'Invalid credentials. Check email and password.');
    } catch (err) {
      console.warn('Login request failed.', err);
      setLoginError('Cannot reach the server. Check your connection and try again.');
    }
  };

  const clearSession = useCallback(() => {
    AUTH_TOKEN = '';
    setCurrentUser(null);
    setClients([]);
    setPortfolio({});
    setTxData({ pending: [], history: [] });
    seenTxRef.current = null;
    setBellOpen(false);
    localStorage.removeItem('meridian_crm_auth');
    setProfileClientId('');
    setNavOpen(false);
  }, []);

  const handleLogout = () => {
    if (AUTH_TOKEN) fetch(API.logout, { method: 'POST', headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }).catch(() => {});
    clearSession();
  };

  // A 401 from any call (expired session, agent deleted) returns the user to the sign-in screen.
  useEffect(() => {
    onAuthExpired = () => {
      if (!AUTH_TOKEN) return;
      clearSession();
      setLoginError('Your session has ended. Please sign in again.');
    };
    return () => {
      onAuthExpired = null;
    };
  }, [clearSession]);


  // -------------------------------------------------------------
  // 2. STATE & SEARCH & PERSISTENCE
  // -------------------------------------------------------------
  const [activeCrmTab, setActiveCrmTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [kycFilter, setKycFilter] = useState('ALL');
  const [navOpen, setNavOpen] = useState(false);

  // The server is the single source of truth for client data. Nothing about clients (balances, KYC,
  // documents, personal details) is cached in the browser any more, so a stale copy can never win.
  const [clients, setClients] = useState([]);
  useEffect(() => {
    try {
      localStorage.removeItem('meridian_crm_clients'); // purge the old cached copy from earlier builds
    } catch {
      /* storage unavailable */
    }
  }, []);
  // clientDbId -> live account (balance, floating P&L, equity, open positions) from the server
  const [portfolio, setPortfolio] = useState({});
  const [liveLink, setLiveLink] = useState('connecting'); // 'live' | 'connecting' | 'offline'
  const [syncError, setSyncError] = useState('');

  const [auditLogs, setAuditLogs] = useState(() =>
    loadJSON('meridian_crm_audit', [
      { id: 'LOG-101', user: 'System', action: 'SYSTEM_BOOT', details: 'CRM Subsystem Initialized', timestamp: new Date().toLocaleString() }
    ])
  );
  useEffect(() => {
    localStorage.setItem('meridian_crm_audit', JSON.stringify(auditLogs));
  }, [auditLogs]);

  const addAuditLog = useCallback(
    (action, details) => {
      const newEntry = {
        id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        user: currentUser?.name || 'SYSTEM',
        action,
        details,
        timestamp: new Date().toLocaleString()
      };
      setAuditLogs((prev) => [newEntry, ...prev].slice(0, 500));
    },
    [currentUser]
  );

  // Toasts (replace blocking alert() dialogs)
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((message, tone = 'ok') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  // Form states
  const [selectedClientId, setSelectedClientId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('ADD');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentEmail, setNewAgentEmail] = useState('');
  const [newAgentPassword, setNewAgentPassword] = useState('');
  const [pfSearch, setPfSearch] = useState('');
  const [pfOnlyOpen, setPfOnlyOpen] = useState(false);
  const [pfExpanded, setPfExpanded] = useState({});

  // ---- Deposit / withdrawal requests (admin) ----
  const [txData, setTxData] = useState({ pending: [], history: [] });
  const [txView, setTxView] = useState('PENDING'); // PENDING | HISTORY
  const [txTypeFilter, setTxTypeFilter] = useState('ALL'); // ALL | DEPOSIT | WITHDRAWAL
  const [txSearch, setTxSearch] = useState('');
  const [txReview, setTxReview] = useState(null); // { tx, decision } awaiting confirmation
  const [txNote, setTxNote] = useState('');
  const [txBusy, setTxBusy] = useState(false);
  const [newTx, setNewTx] = useState({}); // id -> true while a just-arrived request is highlighted
  const [bellOpen, setBellOpen] = useState(false);
  const [bellRing, setBellRing] = useState(false);
  const [soundOn, setSoundOn] = useState(() => loadJSON('meridian_crm_sound', true));
  const soundRef = useRef(true);
  soundRef.current = soundOn;
  const bellRef = useRef(null);
  const seenTxRef = useRef(null); // ids already announced; null until the first load (so old requests don't all pop up)
  const txStampRef = useRef(0); // last time a live event changed the queue (guards against late poll responses)
  const txPending = txData.pending;
  const txStats = useMemo(() => {
    const dep = txPending.filter((t) => t.type === 'DEPOSIT');
    const wd = txPending.filter((t) => t.type === 'WITHDRAWAL');
    const sum = (a) => a.reduce((t, x) => t + (Number(x.amount) || 0), 0);
    return { count: txPending.length, deposits: dep.length, withdrawals: wd.length, depositTotal: sum(dep), withdrawalTotal: sum(wd) };
  }, [txPending]);

  // Client profile drawer / document lightbox
  const [profileClientId, setProfileClientId] = useState('');
  const [profileTab, setProfileTab] = useState('overview');
  const [docPreview, setDocPreview] = useState(null);
  const [kycSelectedId, setKycSelectedId] = useState('');

  // -------------------------------------------------------------
  // 3. LIVE BACKEND SYNC
  // The server is authoritative. Every poll and every pushed event REPLACES the local value; nothing
  // here "prefers" a stale local copy over what the database says.
  // -------------------------------------------------------------
  const eventStampRef = useRef(0); // last time a live event patched state (guards against late poll responses)
  const clientsRef = useRef([]);
  clientsRef.current = clients;

  const fetchClients = useCallback(async () => {
    const startedAt = Date.now();
    try {
      const response = await apiFetch(API.clients);
      if (!response.ok) {
        if (response.status !== 401) {
          const body = await readJson(response);
          const why = body.detail || body.reason || body.error || '';
          setSyncError(`Server returned ${response.status}${why ? `: ${why}` : ''}`);
        }
        return;
      }
      const data = await readJson(response);
      const rawClients = data.clients || data;
      if (!Array.isArray(rawClients)) return;
      // A live event landed while this request was in flight: this answer may be older than that event.
      if (eventStampRef.current > startedAt) {
        setTimeout(() => fetchClientsRef.current && fetchClientsRef.current(), 50);
        return;
      }
      setSyncError('');
      const today = new Date().toISOString().split('T')[0];
      setClients(
        rawClients.map((c) => ({
          id: `CL-${c.id}`,
          dbId: c.id,
          name: c.full_name || c.name || 'Unknown',
          email: c.email || 'N/A',
          phone: c.phone || c.phone_number || 'N/A',
          ip: c.ip_address || c.ip || '127.0.0.1',
          assignedAgent: (c.agent_name || 'Unassigned').trim(),
          agent_id: c.agent_id || null,
          kycStatus: normalizeKyc(c.kyc_status || c.kycStatus),
          kycNote: c.kyc_note || '',
          kycReviewedBy: c.kyc_reviewed_by || '',
          kycReviewedAt: c.kyc_reviewed_at || '',
          kycFullName: c.kyc_full_name || '',
          kycDocType: c.kyc_doc_type || '',
          kycIdNumber: c.kyc_id_number || '',
          kycSubmittedAt: c.kyc_submitted_at || '',
          kycUnsynced: false,
          kycDocs: normalizeDocs(c),
          stage: c.stage || 'NEW_LEAD',
          balanceUSD: parseFloat(c.balance ?? c.balanceUSD) || 0,
          bonusUSD: parseFloat(c.bonus ?? c.bonusUSD) || 0,
          equityUSD: parseFloat(c.equity ?? c.balance ?? c.balanceUSD) || 0,
          floatingPnl: parseFloat(c.floating_pnl) || 0,
          marginUsed: parseFloat(c.margin_used) || 0,
          openCount: c.open_positions || 0,
          resetRequested: !!c.reset_requested,
          mustChangePassword: !!c.must_change_password,
          isOnline: c.isOnline !== undefined ? c.isOnline : true,
          callNotes: c.callNotes || [],
          createdAt: c.created_at ? String(c.created_at).slice(0, 10) : today,
          lastContact: c.lastContact || today
        }))
      );
    } catch (err) {
      setSyncError('Cannot reach the server');
    }
  }, []);
  const fetchClientsRef = useRef(null);
  fetchClientsRef.current = fetchClients;

  // Every client's open positions + live equity in one call (also refreshed by pushed PORTFOLIO_TICKs)
  const fetchPortfolios = useCallback(async () => {
    try {
      const res = await apiFetch(API.portfolios);
      if (!res.ok) return;
      const data = await readJson(res);
      if (!Array.isArray(data.accounts)) return;
      const map = {};
      data.accounts.forEach((a) => {
        if (a.openCount > 0) map[a.clientId] = a;
      });
      setPortfolio(map);
    } catch {
      /* the next poll or pushed tick will catch up */
    }
  }, []);

  // A new deposit / withdrawal request: toast + chime + bell + highlighted row. Called from the live socket AND from
  // polling (whichever sees it first); each request is announced exactly once.
  const notifyNewTx = useCallback(
    (tx) => {
      if (!seenTxRef.current) seenTxRef.current = new Set();
      if (seenTxRef.current.has(tx.id)) return;
      seenTxRef.current.add(tx.id);
      toast(`New ${tx.type === 'DEPOSIT' ? 'deposit' : 'withdrawal'} request: ${fmtUSD(tx.amount)} from ${tx.clientName || 'a client'}`, 'warn');
      if (soundRef.current) playPing();
      setBellRing(true);
      setTimeout(() => setBellRing(false), 2000);
      setNewTx((m) => ({ ...m, [tx.id]: true }));
      setTimeout(
        () =>
          setNewTx((m) => {
            const n = { ...m };
            delete n[tx.id];
            return n;
          }),
        4000
      );
    },
    [toast]
  );
  const notifyNewTxRef = useRef(notifyNewTx);
  notifyNewTxRef.current = notifyNewTx;

  // The decided request leaves the pending queue and heads the history (used by our own action and by pushed events)
  const applyProcessed = useCallback((tx) => {
    if (!tx || !tx.id) return;
    txStampRef.current = Date.now();
    if (seenTxRef.current) seenTxRef.current.add(tx.id);
    setTxData((prev) => ({
      pending: prev.pending.filter((t) => t.id !== tx.id),
      history: [tx, ...prev.history.filter((t) => t.id !== tx.id)].slice(0, 150)
    }));
  }, []);

  const fetchTransactions = useCallback(async () => {
    const startedAt = Date.now();
    try {
      const res = await apiFetch(API.transactions);
      if (!res.ok) return;
      const d = await readJson(res);
      if (!Array.isArray(d.pending)) return;
      if (txStampRef.current > startedAt) {
        setTimeout(() => fetchTransactionsRef.current && fetchTransactionsRef.current(), 80); // answer may predate a live event
        return;
      }
      const first = seenTxRef.current === null;
      if (first) seenTxRef.current = new Set();
      d.pending.forEach((t) => {
        if (first) seenTxRef.current.add(t.id);
        else notifyNewTxRef.current(t);
      });
      if (first && d.pending.length > 0) {
        toast(`${d.pending.length} deposit / withdrawal request${d.pending.length === 1 ? ' is' : 's are'} awaiting review.`, 'warn');
      }
      setTxData({ pending: d.pending, history: Array.isArray(d.history) ? d.history : [] });
    } catch {
      /* the next poll or pushed event will catch up */
    }
  }, [toast]);
  const fetchTransactionsRef = useRef(null);
  fetchTransactionsRef.current = fetchTransactions;

  // Safety-net polling. Live updates arrive over the WebSocket below; this guarantees convergence
  // even if the socket is blocked by a proxy.
  useEffect(() => {
    if (!currentUser) return;
    const admin = currentUser.role === 'ADMIN';
    fetchClients();
    fetchPortfolios();
    if (admin) fetchTransactions();
    const interval = setInterval(() => {
      fetchClients();
      fetchPortfolios();
      if (admin) fetchTransactions();
    }, 5000);
    return () => clearInterval(interval);
  }, [currentUser, fetchClients, fetchPortfolios, fetchTransactions]);

  // Show the number of waiting requests in the browser tab title, and close the bell menu on an outside click / Escape
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'ADMIN') return undefined;
    const base = document.title.replace(/^\(\d+\)\s*/, '');
    document.title = txStats.count > 0 ? `(${txStats.count}) ${base}` : base;
    return () => {
      document.title = base;
    };
  }, [currentUser, txStats.count]);
  useEffect(() => {
    if (!bellOpen) return undefined;
    const onDown = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setBellOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [bellOpen]);
  useEffect(() => {
    try {
      localStorage.setItem('meridian_crm_sound', JSON.stringify(soundOn));
    } catch {
      /* storage unavailable */
    }
  }, [soundOn]);

  // Real-time channel: balance, KYC, documents, positions and equity are pushed the instant they change.
  useEffect(() => {
    if (!currentUser || !currentUser.token) return undefined;
    let alive = true;
    let ws = null;
    let retryTimer = null;
    let refetchTimer = null;
    let attempt = 0;
    const patchClient = (dbId, patch) => setClients((prev) => prev.map((c) => (c.dbId === dbId ? { ...c, ...patch } : c)));
    const scheduleRefetch = () => {
      clearTimeout(refetchTimer);
      refetchTimer = setTimeout(() => {
        fetchClients();
        fetchPortfolios();
        if (currentUser.role === 'ADMIN') fetchTransactionsRef.current && fetchTransactionsRef.current();
      }, 150);
    };
    const known = (dbId) => clientsRef.current.some((c) => c.dbId === dbId);

    const onMessage = (evt) => {
      let m;
      try {
        m = JSON.parse(evt.data);
      } catch {
        return;
      }
      switch (m.type) {
        case 'AUTH_OK':
          setLiveLink('live');
          break;
        case 'AUTH_ERROR':
          setLiveLink('offline');
          break;
        case 'BALANCE_UPDATE':
          eventStampRef.current = Date.now();
          patchClient(m.clientId, {
            balanceUSD: m.balance,
            bonusUSD: m.bonus,
            equityUSD: m.equity,
            floatingPnl: m.floatingPnl,
            marginUsed: m.marginUsed,
            openCount: m.openCount
          });
          break;
        case 'KYC_UPDATE':
          eventStampRef.current = Date.now();
          patchClient(m.clientId, {
            kycStatus: normalizeKyc(m.kyc_status),
            kycNote: m.kyc_note || '',
            kycReviewedBy: m.kyc_reviewed_by || '',
            kycReviewedAt: m.kyc_reviewed_at || '',
            kycFullName: m.kyc_full_name || '',
            kycDocType: m.kyc_doc_type || '',
            kycIdNumber: m.kyc_id_number || '',
            kycSubmittedAt: m.kyc_submitted_at || '',
            kycUnsynced: false
          });
          scheduleRefetch(); // pulls any newly uploaded document files
          break;
        case 'PORTFOLIO_TICK': {
          const map = {};
          (m.accounts || []).forEach((a) => {
            map[a.clientId] = a;
          });
          setPortfolio(map);
          break;
        }
        case 'POSITIONS_UPDATE':
          setPortfolio((prev) => {
            const next = { ...prev };
            if (!m.positions || m.positions.length === 0) delete next[m.clientId];
            else {
              // Derive the figures from the positions themselves so the row is correct before the next equity tick
              const floatingPnl = m.positions.reduce((t, x) => t + (Number(x.pnl) || 0), 0);
              const marginUsed = m.positions.reduce((t, x) => t + (Number(x.margin) || 0), 0);
              next[m.clientId] = { ...(prev[m.clientId] || {}), clientId: m.clientId, positions: m.positions, openCount: m.positions.length, floatingPnl, marginUsed };
            }
            return next;
          });
          break;
        case 'TRANSACTION_REQUEST':
          if (currentUser.role !== 'ADMIN' || !m.transaction) break;
          txStampRef.current = Date.now();
          setTxData((prev) => (prev.pending.some((t) => t.id === m.transaction.id) ? prev : { ...prev, pending: [...prev.pending, m.transaction] }));
          notifyNewTxRef.current(m.transaction);
          break;
        case 'TRANSACTION_PROCESSED':
          if (currentUser.role !== 'ADMIN' || !m.transaction) break;
          applyProcessed(m.transaction);
          if (m.transaction.processedBy && m.transaction.processedBy !== currentUser.name) {
            toast(`${m.transaction.processedBy} ${m.transaction.status === 'APPROVED' ? 'approved' : 'rejected'} a ${m.transaction.type.toLowerCase()} of ${fmtUSD(m.transaction.amount)} for ${m.transaction.clientName || 'a client'}.`, 'ok');
          }
          break;
        case 'TRANSACTIONS_CHANGED':
          if (currentUser.role === 'ADMIN') fetchTransactionsRef.current && fetchTransactionsRef.current();
          break;
        case 'CLIENT_EVENT':
          scheduleRefetch();
          if (m.event === 'AGENT_DELETED') fetchBackendAgents();
          if (m.event === 'DOCUMENT_UPLOADED' && known(m.clientId)) toast('A client just uploaded verification documents — see the KYC Center.', 'warn');
          if (m.event === 'PASSWORD_RESET_REQUESTED' && known(m.clientId)) toast('A client has requested a password reset.', 'warn');
          break;
        default:
          break;
      }
    };

    const connect = () => {
      if (!alive) return;
      const base = CRM_WS_URL || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;
      try {
        ws = new WebSocket(base);
      } catch {
        setLiveLink('offline');
        retryTimer = setTimeout(connect, 5000);
        return;
      }
      const socket = ws;
      socket.onopen = () => {
        if (attempt > 0) scheduleRefetch(); // we may have missed events while disconnected
        attempt = 0;
        socket.send(JSON.stringify({ action: 'AUTH', token: currentUser.token }));
      };
      socket.onmessage = onMessage;
      socket.onclose = () => {
        if (!alive || socket !== ws) return;
        setLiveLink('connecting');
        attempt += 1;
        retryTimer = setTimeout(connect, Math.min(1000 * 2 ** attempt, 15000));
      };
      socket.onerror = () => {
        try {
          socket.close();
        } catch {
          /* noop */
        }
      };
    };
    connect();
    return () => {
      alive = false;
      clearTimeout(retryTimer);
      clearTimeout(refetchTimer);
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        try {
          ws.close();
        } catch {
          /* noop */
        }
      }
      setLiveLink('connecting');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.token]);

  // Role-scoped client list (agents only ever see their own accounts)
  const scopedClients = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'ADMIN') return clients;
    const current = (currentUser.agentId || currentUser.name || '').trim().toLowerCase();
    return clients.filter((c) => (c.assignedAgent || '').trim().toLowerCase() === current);
  }, [clients, currentUser]);

  // Derived filtered client list
  const visibleClients = useMemo(() => {
    return scopedClients.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (c.name || '').toLowerCase().includes(q) ||
        (c.id || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (currentUser?.role === 'ADMIN' &&
          ((c.email || '').toLowerCase().includes(q) || (c.ip || '').toLowerCase().includes(q)));
      const matchesStatus = statusFilter === 'ALL' || c.stage === statusFilter;
      const matchesKyc = kycFilter === 'ALL' || c.kycStatus === kycFilter;
      return matchesSearch && matchesStatus && matchesKyc;
    });
  }, [scopedClients, searchQuery, statusFilter, kycFilter, currentUser]);

  useEffect(() => {
    if (visibleClients.length > 0 && !visibleClients.some((c) => c.id === selectedClientId)) {
      setSelectedClientId(visibleClients[0].id);
    }
  }, [visibleClients, selectedClientId]);

  const stageOptions = useMemo(() => [...new Set(scopedClients.map((c) => c.stage))].sort(), [scopedClients]);
  const kycCounts = useMemo(() => {
    const n = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    scopedClients.forEach((c) => {
      n[c.kycStatus] = (n[c.kycStatus] || 0) + 1;
    });
    return n;
  }, [scopedClients]);

  const profileClient = scopedClients.find((c) => c.id === profileClientId) || null;
  const openProfile = (id, tab = 'overview') => {
    setProfileClientId(id);
    setProfileTab(tab);
  };

  // -------------------------------------------------------------
  // KYC REVIEW  (Admins and Agents; agents limited to their own clients)
  // POST API.kycReview  { clientId, status: 'APPROVED'|'REJECTED', note, reviewedBy }
  // -------------------------------------------------------------
  const handleKycReview = async (clientId, status, note = '') => {
    const target = scopedClients.find((c) => c.id === clientId);
    if (!target) {
      toast('You are not authorised to review this client.', 'bad');
      return;
    }
    const cleanNote = status === 'REJECTED' ? String(note || '').trim() : '';
    try {
      const res = await apiFetch(API.kycReview, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          clientId: target.dbId || clientId.replace('CL-', ''),
          status,
          note: cleanNote,
          reviewedBy: currentUser.name
        })
      });
      const data = await readJson(res);
      if (!res.ok || !data.success) {
        if (res.status !== 401) toast(`KYC decision was NOT saved: ${data.error || `server returned ${res.status}`}.`, 'bad');
        return;
      }
      // Apply exactly what the server stored (the same event also reaches the client's dashboard live).
      setClients((prev) =>
        prev.map((c) =>
          c.id === clientId
            ? {
                ...c,
                kycStatus: normalizeKyc(data.kyc_status),
                kycNote: data.kyc_note || '',
                kycReviewedBy: data.kyc_reviewed_by || currentUser.name,
                kycReviewedAt: data.kyc_reviewed_at || new Date().toISOString(),
                kycUnsynced: false
              }
            : c
        )
      );
      eventStampRef.current = Date.now();
      toast(`KYC ${status === 'APPROVED' ? 'approved' : status === 'REJECTED' ? 'rejected' : 'reset'} for ${target.name}.`, status === 'APPROVED' ? 'ok' : 'warn');
      addAuditLog(`KYC_${status}`, `${status === 'APPROVED' ? 'Approved' : 'Rejected'} KYC for ${target.name} (${clientId})${cleanNote ? ` — ${cleanNote}` : ''}`);
    } catch (err) {
      console.warn('KYC review failed.', err);
      toast('KYC decision was NOT saved: the server could not be reached. Nothing has changed — please try again.', 'bad');
    }
  };

  // -------------------------------------------------------------
  // WHATSAPP
  // GET  API.waMessages?clientId=   -> { messages: [{ id, direction:'inbound'|'outbound', body, timestamp, status }] }
  // POST API.waSend      { clientId, to, text, agent } -> { message?: { id, status } }
  // POST API.waCall      { clientId, to, agent }
  // -------------------------------------------------------------
  const [waThreads, setWaThreads] = useState(() => loadJSON('meridian_crm_wa', {}));
  useEffect(() => {
    try {
      localStorage.setItem('meridian_crm_wa', JSON.stringify(waThreads));
    } catch {
      /* storage full or blocked */
    }
  }, [waThreads]);
  const [waOnline, setWaOnline] = useState(null);
  const [waSelectedId, setWaSelectedId] = useState('');
  const [waSearch, setWaSearch] = useState('');

  const mergeMessages = useCallback((clientId, incoming) => {
    setWaThreads((prev) => {
      const map = new Map((prev[clientId] || []).map((m) => [m.id, m]));
      incoming.forEach((m) => map.set(m.id, { ...map.get(m.id), ...m }));
      return { ...prev, [clientId]: [...map.values()].sort((a, b) => a.ts - b.ts) };
    });
  }, []);
  const removeMessage = useCallback((clientId, msgId) => {
    setWaThreads((prev) => ({ ...prev, [clientId]: (prev[clientId] || []).filter((m) => m.id !== msgId) }));
  }, []);

  const fetchWaHistory = useCallback(
    async (client) => {
      try {
        const res = await fetch(`${API.waMessages}?clientId=${encodeURIComponent(client.dbId ?? client.id)}`);
        if (!res.ok) {
          setWaOnline(false);
          return;
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.messages;
        if (Array.isArray(list)) {
          mergeMessages(
            client.id,
            list.map((m, i) => ({
              id: String(m.id ?? `srv-${m.timestamp || i}-${i}`),
              dir: ['inbound', 'in', 'incoming'].includes(String(m.direction || m.dir).toLowerCase()) ? 'in' : 'out',
              text: m.body ?? m.text ?? '',
              ts: new Date(m.timestamp || m.created_at || Date.now()).getTime(),
              status: m.status || 'sent'
            }))
          );
        }
        setWaOnline(true);
      } catch {
        setWaOnline(false);
      }
    },
    [mergeMessages]
  );

  const sendWhatsApp = async (client, text) => {
    const body = String(text || '').trim();
    if (!body) return;
    if (!validPhone(client.phone)) {
      toast('This client has no valid phone number.', 'bad');
      return;
    }
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const ts = Date.now();
    mergeMessages(client.id, [{ id: tempId, dir: 'out', text: body, ts, status: 'sending' }]);
    try {
      const res = await fetch(API.waSend, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ clientId: client.dbId ?? client.id, to: digitsOnly(client.phone), text: body, agent: currentUser.name })
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const m = data.message || {};
        removeMessage(client.id, tempId);
        mergeMessages(client.id, [{ id: String(m.id || `${tempId}-sent`), dir: 'out', text: body, ts, status: m.status || 'sent' }]);
        setWaOnline(true);
        addAuditLog('WHATSAPP_SENT', `WhatsApp message sent to ${client.name}`);
        return;
      }
    } catch (err) {
      console.warn('WhatsApp send failed.', err);
    }
    mergeMessages(client.id, [{ id: tempId, status: 'failed' }]);
    setWaOnline(false);
    toast('WhatsApp message was not sent — gateway unreachable.', 'bad');
  };

  const retryWhatsApp = (client, msg) => {
    removeMessage(client.id, msg.id);
    sendWhatsApp(client, msg.text);
  };

  const [callLogs, setCallLogs] = useState(() => loadJSON('meridian_crm_calls', []));
  useEffect(() => {
    try {
      localStorage.setItem('meridian_crm_calls', JSON.stringify(callLogs.slice(0, 500)));
    } catch {
      /* ignore */
    }
  }, [callLogs]);

  const startWhatsAppCall = async (client) => {
    if (!validPhone(client.phone)) {
      toast('This client has no valid phone number.', 'bad');
      return;
    }
    let ok = false;
    try {
      const res = await fetch(API.waCall, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ clientId: client.dbId ?? client.id, to: digitsOnly(client.phone), agent: currentUser.name })
      });
      ok = res.ok;
    } catch (err) {
      console.warn('WhatsApp call failed.', err);
    }
    setCallLogs((p) => [
      {
        id: `CALL-${Date.now()}`,
        number: client.phone,
        clientId: client.id,
        clientName: client.name,
        direction: 'outbound',
        channel: 'whatsapp',
        status: ok ? 'requested' : 'failed',
        duration: 0,
        ts: Date.now(),
        agent: currentUser.name
      },
      ...p
    ]);
    addAuditLog('WHATSAPP_CALL', `WhatsApp call ${ok ? 'requested' : 'failed'} for ${client.name}`);
    if (ok) {
      toast(`WhatsApp call to ${client.name} requested.`);
    } else {
      window.open(`https://wa.me/${digitsOnly(client.phone)}`, '_blank', 'noopener,noreferrer');
      toast('WhatsApp calling gateway unavailable — opened the chat in WhatsApp instead.', 'warn');
    }
  };

  // Which chat is currently open (for polling)
  const openChatId =
    activeCrmTab === 'whatsapp' ? waSelectedId : profileClientId && profileTab === 'whatsapp' ? profileClientId : '';
  useEffect(() => {
    if (!currentUser || !openChatId) return;
    const c = scopedClients.find((x) => x.id === openChatId);
    if (!c) return;
    fetchWaHistory(c);
    const t = setInterval(() => fetchWaHistory(c), 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openChatId, currentUser, fetchWaHistory]);

  const waList = useMemo(() => {
    const q = waSearch.toLowerCase();
    return scopedClients
      .filter((c) => validPhone(c.phone) && (!q || c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)))
      .map((c) => {
        const msgs = waThreads[c.id] || [];
        return { client: c, last: msgs[msgs.length - 1] };
      })
      .sort((a, b) => (b.last?.ts || 0) - (a.last?.ts || 0) || a.client.name.localeCompare(b.client.name));
  }, [scopedClients, waThreads, waSearch]);

  useEffect(() => {
    if (activeCrmTab === 'whatsapp' && waList.length && !waList.some((w) => w.client.id === waSelectedId)) {
      setWaSelectedId(waList[0].client.id);
    }
  }, [activeCrmTab, waList, waSelectedId]);

  // -------------------------------------------------------------
  // FONITEL DIALER
  // POST API.dialCall   { to, clientId, agent } -> { callId?, status? }
  // GET  API.dialStatus?callId=  -> { status: 'ringing'|'connected'|'ended'|'busy'|'no-answer'|'failed' }
  // POST API.dialHangup { callId }
  // POST API.dialDtmf   { callId, digit }
  // GET  API.dialLogs   -> { calls: [{ id, number, direction, status, duration, timestamp, client_id, client_name, agent_name }] }
  // -------------------------------------------------------------
  const [dialerOpen, setDialerOpen] = useState(false);
  const [dialNumber, setDialNumber] = useState('');
  const [callSession, setCallSession] = useState(null);
  const callRef = useRef(null);
  callRef.current = callSession;
  const [logFilter, setLogFilter] = useState('ALL');

  const finishCall = useCallback(
    (endStatus, error) => {
      const s = callRef.current;
      if (!s || s.status === 'ended') return;
      const duration = s.startedAt ? Math.round((Date.now() - s.startedAt) / 1000) : 0;
      const entry = {
        id: `CALL-${Date.now()}`,
        number: s.number,
        clientId: s.clientId,
        clientName: s.clientName,
        direction: 'outbound',
        channel: 'voip',
        status: endStatus,
        duration,
        ts: s.initiatedAt,
        agent: currentUser?.name
      };
      setCallLogs((p) => [entry, ...p]);
      setCallSession({ ...s, status: 'ended', endStatus, duration, error });
      addAuditLog('CALL_ENDED', `Call to ${s.clientName || s.number} ${endStatus} (${fmtDuration(duration)})`);
      setTimeout(() => setCallSession((cur) => (cur && cur.id === s.id && cur.status === 'ended' ? null : cur)), 5000);
    },
    [currentUser, addAuditLog]
  );

  const placeCall = async (rawNumber, client) => {
    const number = cleanDial(rawNumber);
    if (number.length < 3) {
      toast('Enter a valid number to call.', 'bad');
      return;
    }
    if (callRef.current && callRef.current.status !== 'ended') {
      setDialerOpen(true);
      toast('Finish the current call before placing another.', 'warn');
      return;
    }
    setDialerOpen(true);
    setDialNumber(number);
    const session = {
      id: `S-${Date.now()}`,
      callId: null,
      number,
      clientId: client?.id || null,
      clientName: client?.name || '',
      status: 'dialing',
      initiatedAt: Date.now(),
      startedAt: null
    };
    callRef.current = session;
    setCallSession(session);
    addAuditLog('CALL_PLACED', `Dialing ${client?.name || number}`);
    try {
      const res = await fetch(API.dialCall, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ to: number, clientId: client?.dbId ?? null, agent: currentUser.name })
      });
      if (!res.ok) throw new Error(`Gateway responded ${res.status}`);
      const data = await res.json().catch(() => ({}));
      const st = String(data.status || '').toLowerCase();
      setCallSession((s) => {
        if (!s || s.id !== session.id) return s;
        const connected = !data.callId || st === 'connected' || st === 'answered';
        return {
          ...s,
          callId: data.callId || null,
          status: connected ? 'connected' : 'ringing',
          startedAt: connected ? Date.now() : null
        };
      });
    } catch (err) {
      console.warn('Dialer call failed.', err);
      finishCall('failed', 'Dialer gateway unreachable');
    }
  };

  // Poll call state while a call is live and the gateway supplied a call id
  const liveCallId = callSession && callSession.status !== 'ended' ? callSession.callId : null;
  const liveSessionId = callSession?.id;
  useEffect(() => {
    if (!liveCallId) return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`${API.dialStatus}?callId=${encodeURIComponent(liveCallId)}`);
        if (!r.ok) return;
        const d = await r.json();
        const st = String(d.status || '').toLowerCase();
        if (st === 'connected' || st === 'answered') {
          setCallSession((s) => (s && s.id === liveSessionId && s.status !== 'connected' && s.status !== 'ended' ? { ...s, status: 'connected', startedAt: Date.now() } : s));
        } else if (st === 'ringing') {
          setCallSession((s) => (s && s.id === liveSessionId && s.status === 'dialing' ? { ...s, status: 'ringing' } : s));
        } else if (['ended', 'completed'].includes(st)) {
          finishCall(callRef.current?.startedAt ? 'completed' : 'no-answer');
        } else if (['busy', 'no-answer', 'failed'].includes(st)) {
          finishCall(st);
        }
      } catch {
        /* transient */
      }
    }, 2000);
    return () => clearInterval(t);
  }, [liveCallId, liveSessionId, finishCall]);

  const hangUp = async () => {
    const s = callRef.current;
    if (!s) return;
    if (s.callId) {
      try {
        await fetch(API.dialHangup, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ callId: s.callId }) });
      } catch {
        /* still end locally */
      }
    }
    finishCall(s.startedAt ? 'completed' : 'cancelled');
  };

  const sendDtmf = (digit) => {
    const s = callRef.current;
    if (!s?.callId) return;
    fetch(API.dialDtmf, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ callId: s.callId, digit }) }).catch(() => {});
  };

  const callClient = (client) => {
    if (!validPhone(client.phone)) {
      toast('This client has no valid phone number.', 'bad');
      return;
    }
    placeCall(client.phone, client);
  };

  // Merge server-side call history (if the gateway exposes it)
  const fetchCallLogs = useCallback(async () => {
    try {
      const res = await fetch(API.dialLogs);
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.calls;
      if (!Array.isArray(list)) return;
      const remote = list.map((c) => ({
        id: `SRV-${c.id}`,
        number: c.number || c.to || '',
        clientId: c.client_id != null ? `CL-${c.client_id}` : null,
        clientName: c.client_name || '',
        direction: c.direction || 'outbound',
        channel: 'voip',
        status: String(c.status || 'completed').toLowerCase(),
        duration: Number(c.duration) || 0,
        ts: new Date(c.timestamp || c.created_at || Date.now()).getTime(),
        agent: c.agent_name || ''
      }));
      setCallLogs((prev) => {
        const map = new Map(prev.map((l) => [l.id, l]));
        remote.forEach((l) => map.set(l.id, l));
        return [...map.values()].sort((a, b) => b.ts - a.ts);
      });
    } catch {
      /* optional endpoint */
    }
  }, []);
  useEffect(() => {
    if (currentUser) {
      fetchCallLogs();
      const t = setInterval(fetchCallLogs, 15000);
      return () => clearInterval(t);
    }
  }, [currentUser, fetchCallLogs]);

  const visibleLogs = useMemo(() => {
    if (!currentUser) return [];
    const mine =
      currentUser.role === 'ADMIN'
        ? callLogs
        : callLogs.filter((l) => !l.agent || l.agent === currentUser.name || scopedClients.some((c) => c.id === l.clientId));
    if (logFilter === 'ALL') return mine;
    if (logFilter === 'COMPLETED') return mine.filter((l) => l.status === 'completed' || l.status === 'requested');
    return mine.filter((l) => !['completed', 'requested'].includes(l.status));
  }, [callLogs, currentUser, scopedClients, logFilter]);

  const callStats = useMemo(() => {
    const mine = currentUser?.role === 'ADMIN' ? callLogs : callLogs.filter((l) => !l.agent || l.agent === currentUser?.name);
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const today = mine.filter((l) => l.ts >= todayStart);
    const answered = today.filter((l) => l.status === 'completed');
    return {
      today: today.length,
      talk: answered.reduce((a, l) => a + (l.duration || 0), 0),
      rate: today.length ? Math.round((answered.length / today.length) * 100) : 0
    };
  }, [callLogs, currentUser]);

  // Esc closes overlays
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (docPreview) setDocPreview(null);
      else if (profileClientId) setProfileClientId('');
      else setNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [docPreview, profileClientId]);

  // -------------------------------------------------------------
  // HANDLERS WITH BACKEND SYNC (unchanged business logic)
  // -------------------------------------------------------------
  const handleAssignAgent = async (clientId, selectedAgentValue) => {
    if (currentUser.role !== 'ADMIN') {
      toast('Security Exception: Agents are unauthorized to assign accounts.', 'bad');
      return;
    }
    const targetClient = clients.find((c) => c.id === clientId);
    try {
      const res = await apiFetch(API.assignAgent, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          clientId: targetClient?.dbId || clientId.replace('CL-', ''),
          assignedAgent: selectedAgentValue
        })
      });
      const data = await readJson(res);
      if (!res.ok) {
        if (res.status !== 401) toast(`Assignment failed: ${data.error || `server returned ${res.status}`}.`, 'bad');
      } else {
        addAuditLog('AGENT_REASSIGN', `Assigned client ${clientId} to ${selectedAgentValue}`);
        toast(`${targetClient?.name || clientId} assigned to ${selectedAgentValue}.`);
      }
    } catch (err) {
      toast('Assignment failed: the server could not be reached.', 'bad');
    }
    await fetchClients(); // always re-read the truth (this also reverts the dropdown if the save failed)
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    if (currentUser.role !== 'ADMIN') return;
    if (!newAgentName || !newAgentEmail || !newAgentPassword) {
      toast('Please fill out all agent details.', 'bad');
      return;
    }
    const agentObj = {
      name: newAgentName.trim(),
      email: newAgentEmail.trim().toLowerCase(),
      password: newAgentPassword
    };
    try {
      const res = await apiFetch(API.createAgent, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(agentObj)
      });
      const data = await readJson(res);
      if (!res.ok) {
        if (res.status !== 401) toast(`Could not create agent: ${data.error || `server returned ${res.status}`}.`, 'bad');
        return;
      }
      if (data.agents) setAgents(data.agents);
      await fetchBackendAgents();
    } catch (err) {
      toast('Could not create agent: the server could not be reached.', 'bad');
      return;
    }
    addAuditLog('AGENT_CREATED', `Created new agent ${agentObj.name} (${agentObj.email})`);
    setNewAgentName('');
    setNewAgentEmail('');
    setNewAgentPassword('');
    toast(`Agent ${agentObj.name} successfully created.`);
  };

  // Balance / bonus changes are written by the server first; the UI only ever shows what it confirmed.
  const handleManualBalanceAdjustment = async (e) => {
    e.preventDefault();
    if (currentUser.role !== 'ADMIN') {
      toast('CRITICAL SECURITY ALERT: Agents cannot directly modify balances.', 'bad');
      return;
    }
    const amt = parseFloat(adjustmentAmount);
    if (isNaN(amt) || amt <= 0) return toast('Please enter a valid dollar amount.', 'bad');

    const targetClient = clients.find((c) => c.id === selectedClientId);
    if (!targetClient) return toast('Target client not found.', 'bad');

    try {
      const res = await apiFetch(API.adjustBalance, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          clientId: targetClient.dbId || targetClient.id.replace('CL-', ''),
          adjustmentType,
          amount: amt
        })
      });
      const data = await readJson(res);
      if (!res.ok || !data.success) {
        if (res.status !== 401) toast(`Adjustment was NOT applied: ${data.error || `server returned ${res.status}`}.`, 'bad');
        return;
      }
      eventStampRef.current = Date.now();
      setClients((prev) =>
        prev.map((c) =>
          c.id === selectedClientId ? { ...c, balanceUSD: Number(data.balance), bonusUSD: Number(data.bonus), equityUSD: Number(data.equity ?? data.balance) } : c
        )
      );
      const applied = Number(data.applied ?? amt);
      addAuditLog('BALANCE_ADJUSTED', `Applied ${adjustmentType} of $${applied.toFixed(2)} to ${targetClient.name}`);
      setAdjustmentAmount('');
      toast(
        `Applied ${adjustmentType} of $${applied.toFixed(2)} to ${targetClient.name}${applied !== amt ? ` (capped at the available balance)` : ''}. New balance ${fmtUSD(data.balance)} — the client sees it now.`
      );
    } catch (err) {
      toast('Adjustment was NOT applied: the server could not be reached.', 'bad');
    }
  };

  // ---- Approve / reject a deposit or withdrawal request (admin only) --------------------
  const openTxReview = (tx, decision) => {
    setTxNote('');
    setTxReview({ tx, decision });
  };
  const confirmTxReview = async () => {
    if (!txReview || currentUser.role !== 'ADMIN' || txBusy) return;
    const { tx, decision } = txReview;
    setTxBusy(true);
    try {
      const res = await apiFetch(API.reviewTransaction, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ transactionId: tx.id, status: decision, note: txNote.trim() })
      });
      const data = await readJson(res);
      if (!res.ok || !data.success) {
        if (res.status !== 401) toast(`Not ${decision === 'APPROVED' ? 'approved' : 'rejected'}: ${data.error || `server returned ${res.status}`}`, 'bad');
        fetchTransactions(); // somebody else may have just handled it
        if (res.status === 409) setTxReview(null);
        return;
      }
      const done = data.transaction || { ...tx, status: decision, processedBy: currentUser.name, processedAt: new Date().toISOString(), note: txNote.trim() };
      applyProcessed(done);
      if (decision === 'APPROVED' && Number.isFinite(Number(data.balance))) {
        eventStampRef.current = Date.now();
        setClients((prev) => prev.map((c) => (c.dbId === tx.clientId ? { ...c, balanceUSD: Number(data.balance), equityUSD: Number(data.balance) + (c.floatingPnl || 0) } : c)));
      }
      const who = tx.clientName || `CL-${tx.clientId}`;
      addAuditLog(`${tx.type}_${decision}`, `${decision === 'APPROVED' ? 'Approved' : 'Rejected'} ${tx.type.toLowerCase()} of ${fmtUSD(tx.amount)} for ${who} (#${tx.id})`);
      toast(
        decision === 'REJECTED'
          ? `${tx.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'} of ${fmtUSD(tx.amount)} rejected. ${who}'s balance is unchanged.`
          : tx.type === 'DEPOSIT'
            ? `Deposit approved: ${fmtUSD(tx.amount)} credited to ${who}. New balance ${fmtUSD(data.balance)}.`
            : `Withdrawal approved: ${fmtUSD(tx.amount)} deducted from ${who}. New balance ${fmtUSD(data.balance)}.`
      );
      setTxReview(null);
    } catch {
      toast('The server could not be reached. Nothing was changed.', 'bad');
    } finally {
      setTxBusy(false);
    }
  };

  // ---- Permanent deletion (admin only) --------------------------------------------------
  const [deleteTarget, setDeleteTarget] = useState(null); // { kind: 'client'|'agent', id, dbId, name, extra }
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const askDelete = (target) => {
    setDeleteConfirm('');
    setDeleteTarget(target);
  };
  const confirmDelete = async () => {
    if (!deleteTarget || currentUser.role !== 'ADMIN') return;
    setDeleteBusy(true);
    try {
      const url = deleteTarget.kind === 'client' ? API.deleteClient(deleteTarget.dbId) : API.deleteAgent(deleteTarget.dbId);
      const res = await apiFetch(url, { method: 'DELETE' });
      const data = await readJson(res);
      if (!res.ok || !data.success) {
        if (res.status !== 401) toast(`Delete failed: ${data.error || `server returned ${res.status}`}${data.detail ? ` (${data.detail})` : ''}`, 'bad');
        return;
      }
      eventStampRef.current = Date.now(); // a poll already in flight still lists the deleted record: ignore it
      if (deleteTarget.kind === 'client') {
        setProfileClientId('');
        setClients((prev) => prev.filter((c) => c.dbId !== deleteTarget.dbId));
        setPortfolio((prev) => {
          const next = { ...prev };
          delete next[deleteTarget.dbId];
          return next;
        });
        addAuditLog('CLIENT_DELETED', `Permanently deleted client ${deleteTarget.name} (${deleteTarget.id}) and all related data`);
        toast(`${deleteTarget.name} and all related data were permanently deleted.`, 'warn');
      } else {
        if (data.agents) setAgents(data.agents);
        addAuditLog('AGENT_DELETED', `Deleted agent ${deleteTarget.name} (${data.unassignedClients || 0} client(s) unassigned)`);
        toast(`Agent ${deleteTarget.name} deleted. ${data.unassignedClients || 0} client(s) are now unassigned.`, 'warn');
        await fetchBackendAgents();
      }
      setDeleteTarget(null);
      await fetchClients();
    } catch (err) {
      toast('Delete failed: the server could not be reached.', 'bad');
    } finally {
      setDeleteBusy(false);
    }
  };

  // ---- Password reset (admin, or the client's own agent) ------------------------------
  const [resetBusy, setResetBusy] = useState(false);
  const [resetResult, setResetResult] = useState(null); // { clientId, password }
  const handleResetPassword = async (client) => {
    setResetBusy(true);
    try {
      const res = await apiFetch(API.resetPassword, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ clientId: client.dbId })
      });
      const data = await readJson(res);
      if (!res.ok || !data.success) {
        if (res.status !== 401) toast(`Password reset failed: ${data.error || `server returned ${res.status}`}.`, 'bad');
        return;
      }
      setResetResult({ clientId: client.id, password: data.temporaryPassword });
      addAuditLog('PASSWORD_RESET', `Reset password for ${client.name} (${client.id})`);
      toast(`Password reset for ${client.name}. They must choose a new one at next login.`);
      await fetchClients();
    } catch (err) {
      toast('Password reset failed: the server could not be reached.', 'bad');
    } finally {
      setResetBusy(false);
    }
  };

  const metrics = useMemo(() => {
    const totalBal = scopedClients.reduce((acc, c) => acc + (parseFloat(c.balanceUSD) || 0), 0);
    const totalBonus = scopedClients.reduce((acc, c) => acc + (parseFloat(c.bonusUSD) || 0), 0);
    const totalVerified = scopedClients.filter((c) => c.kycStatus === 'APPROVED').length;

    return {
      totalClients: scopedClients.length,
      totalBal,
      totalBonus,
      verifiedRatio: scopedClients.length ? Math.round((totalVerified / scopedClients.length) * 100) : 0
    };
  }, [scopedClients]);

  // -------------------------------------------------------------
  // AUTH LOGIN SCREEN
  // -------------------------------------------------------------
  if (!currentUser) {
    return (
      <div className="mx-root min-h-screen flex items-center justify-center p-4">
        <style>{STYLES}</style>
        <div className="w-full max-w-[420px] mx-in-up">
          <div className="mx-card p-8 sm:p-10 shadow-2xl shadow-slate-900/10">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 mb-5">
                <Shield className="w-7 h-7 text-[var(--accent)]" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-[var(--ink)]">Meridian Market CRM</h1>
              <p className="text-sm text-[var(--muted)] mt-1.5">Sign in to your workspace</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div role="alert" className="p-3 bg-[rgba(251,113,133,.08)] border border-[rgba(251,113,133,.3)] text-[var(--bad)] rounded-xl text-center text-sm">
                  {loginError}
                </div>
              )}
              <div>
                <label className="mx-label" htmlFor="login-email">Email address</label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="klaus@meridianmarket.net"
                  className="mx-field !py-3"
                />
              </div>
              <div>
                <label className="mx-label" htmlFor="login-pass">Passcode</label>
                <input
                  id="login-pass"
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mx-field !py-3"
                />
              </div>
              <button type="submit" className="mx-btn mx-btn-primary w-full !py-3 !text-sm !mt-2">
                Sign in
              </button>
            </form>
          </div>
          <p className="text-center text-[11px] text-[var(--faint)] mt-5">Authorised personnel only · Activity is logged</p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // LAYOUT PIECES
  // -------------------------------------------------------------
  const isAdmin = currentUser.role === 'ADMIN';

  // Portfolio view: one row per client in scope. Balance always comes from the client record (updated by
  // the server the instant it changes); floating P&L and positions come from the live portfolio feed.
  const portfolioRows = scopedClients.map((c) => {
    const live = portfolio[c.dbId];
    const positions = live && Array.isArray(live.positions) ? live.positions : [];
    const floating = live ? Number(live.floatingPnl) || 0 : 0;
    const marginUsed = live ? Number(live.marginUsed) || 0 : 0;
    const equity = (Number(c.balanceUSD) || 0) + floating;
    return { client: c, positions, openCount: positions.length, floating, marginUsed, equity, freeMargin: equity - marginUsed };
  });
  const equityOf = (c) => (Number(c.balanceUSD) || 0) + (portfolio[c.dbId] ? Number(portfolio[c.dbId].floatingPnl) || 0 : 0);
  const portfolioTotals = portfolioRows.reduce(
    (t, r) => ({
      balance: t.balance + (Number(r.client.balanceUSD) || 0),
      equity: t.equity + r.equity,
      floating: t.floating + r.floating,
      open: t.open + r.openCount,
      withPositions: t.withPositions + (r.openCount > 0 ? 1 : 0)
    }),
    { balance: 0, equity: 0, floating: 0, open: 0, withPositions: 0 }
  );
  const navGroups = [
    {
      label: 'Workspace',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'clients', label: 'Clients', icon: Users, count: scopedClients.length },
        { id: 'portfolios', label: 'Portfolios', icon: Briefcase, count: portfolioRows.filter((r) => r.openCount > 0).length },
        { id: 'kyc', label: 'KYC Center', icon: ShieldCheck, count: kycCounts.PENDING, warn: true },
        { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
        { id: 'dialer', label: 'Dialer', icon: PhoneCall }
      ]
    },
    ...(isAdmin
      ? [
          {
            label: 'Administration',
            items: [
              { id: 'transactions', label: 'Transactions', icon: Receipt, count: txStats.count, warn: true },
              { id: 'agents', label: 'Manage Agents', icon: UserCheck, count: agents.length },
              { id: 'financial_ops', label: 'Financial Adjustments', icon: Wallet }
            ]
          }
        ]
      : [])
  ];
  const pageTitles = {
    dashboard: 'Dashboard',
    clients: 'Clients',
    portfolios: 'Portfolios',
    kyc: 'KYC Center',
    whatsapp: 'WhatsApp',
    dialer: 'Dialer',
    transactions: 'Transactions',
    agents: 'Manage Agents',
    financial_ops: 'Financial Adjustments'
  };
  const goTab = (id) => {
    setActiveCrmTab(id);
    setNavOpen(false);
  };
  const liveCall = callSession && callSession.status !== 'ended' ? callSession : null;

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-5 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-blue-50 border border-blue-200">
          <Shield className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <div>
          <div className="text-[15px] font-semibold tracking-tight text-[var(--ink)] leading-none">Meridian</div>
          <div className="text-[10px] uppercase tracking-[.2em] text-[var(--muted)] mt-1.5">Client CRM</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 space-y-6 pb-4" aria-label="Primary">
        {navGroups.map((g) => (
          <div key={g.label}>
            <div className="mx-eyebrow px-3 mb-2 !text-[var(--faint)]">{g.label}</div>
            <div className="space-y-1">
              {g.items.map((it) => {
                const Icon = it.icon;
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => goTab(it.id)}
                    className={`mx-nav ${activeCrmTab === it.id ? 'active' : ''}`}
                    aria-current={activeCrmTab === it.id ? 'page' : undefined}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                    <span>{it.label}</span>
                    {it.count !== undefined && (it.count > 0 || !it.warn) && (
                      <span className={`mx-nav-count mx-num ${it.warn ? 'warn' : ''}`}>{it.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-[var(--line)]">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F8FAFC] border border-[var(--line)]">
          <Avatar name={currentUser.name} size={34} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-[var(--ink)] truncate">{currentUser.name}</div>
            <span className={`mx-badge ${isAdmin ? 'mx-b-warn' : 'mx-b-accent'} !py-0 !text-[10px]`}>{currentUser.role}</span>
          </div>
          <button type="button" className="mx-icon-btn" onClick={handleLogout} title="Sign out" aria-label="Sign out">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  const showFloatingDialer = (dialerOpen || liveCall) && activeCrmTab !== 'dialer';

  // -------------------------------------------------------------
  // MAIN DASHBOARD LAYOUT
  // -------------------------------------------------------------
  const pendingQueue = scopedClients.filter((c) => c.kycStatus === 'PENDING');
  const stageCounts = stageOptions.map((s) => ({ stage: s, n: scopedClients.filter((c) => c.stage === s).length }));
  const maxStage = Math.max(1, ...stageCounts.map((s) => s.n));
  const recentActivity = auditLogs.filter((l) => isAdmin || l.user === currentUser.name || l.user === 'System').slice(0, 6);
  const kycQueue = scopedClients.filter((c) => kycFilter === 'ALL' || c.kycStatus === kycFilter);
  const kycSelected = kycQueue.find((c) => c.id === kycSelectedId) || kycQueue[0] || null;
  const waSelected = scopedClients.find((c) => c.id === waSelectedId) || null;
  const financialTarget = clients.find((c) => c.id === selectedClientId);

  return (
    <div className="mx-root min-h-screen">
      <style>{STYLES}</style>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-white/95 backdrop-blur-xl border-r border-[var(--line)] z-30">
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      {navOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-72 max-w-[85vw] bg-[var(--panel)] border-r border-[var(--line)] mx-in-right">{sidebar}</div>
          <button type="button" aria-label="Close menu" className="flex-1 bg-slate-900/40" onClick={() => setNavOpen(false)} />
        </div>
      )}

      <div className="lg:pl-64 min-h-screen flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-4 sm:px-6 xl:px-8 h-16 flex items-center gap-3">
          <div className="lg:hidden">
            <button type="button" className="mx-icon-btn" onClick={() => setNavOpen(true)} aria-label="Open menu">
              <Menu className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-[var(--muted)] hidden sm:inline">Meridian</span>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--faint)] hidden sm:inline" />
            <span className="font-medium text-[var(--ink)] truncate">{pageTitles[activeCrmTab]}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span
              className={`mx-badge ${syncError ? 'mx-b-bad' : liveLink === 'live' ? 'mx-b-ok' : 'mx-b-warn'} !py-1 hidden sm:inline-flex`}
              title={syncError ? `Sync problem: ${syncError}` : liveLink === 'live' ? 'Receiving balance, KYC and position updates in real time' : 'Reconnecting to the live channel — data still refreshes every 5 seconds'}
            >
              <Activity className="w-3 h-3" />
              {syncError ? 'Sync issue' : liveLink === 'live' ? 'Live' : 'Reconnecting'}
            </span>
            {isAdmin && (
              <div className="relative" ref={bellRef}>
                <button
                  type="button"
                  className={`mx-icon-btn !w-9 !h-9 relative ${bellRing ? 'mx-bell' : ''} ${txStats.count > 0 ? '!border-amber-300 !bg-amber-50' : ''}`}
                  onClick={() => setBellOpen((o) => !o)}
                  aria-label={`Deposit and withdrawal requests: ${txStats.count} waiting`}
                  aria-expanded={bellOpen}
                  aria-haspopup="true"
                >
                  {txStats.count > 0 ? <BellRing className="w-4 h-4 text-[var(--warn)]" /> : <Bell className="w-4 h-4" />}
                  {txStats.count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--bad)] text-white text-[10px] font-bold flex items-center justify-center mx-num">
                      {txStats.count > 99 ? '99+' : txStats.count}
                    </span>
                  )}
                </button>
                {bellOpen && (
                  <div className="absolute right-0 mt-2 w-[min(92vw,390px)] mx-card z-50 overflow-hidden mx-in-up shadow-xl">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)]">
                      <div>
                        <div className="text-sm font-bold text-[var(--ink)]">Cash requests</div>
                        <div className="text-[11px] text-[var(--muted)]">
                          {txStats.count === 0 ? 'Nothing waiting' : `${txStats.deposits} deposit${txStats.deposits === 1 ? '' : 's'} · ${txStats.withdrawals} withdrawal${txStats.withdrawals === 1 ? '' : 's'} waiting`}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="mx-icon-btn"
                        onClick={() => setSoundOn((v) => !v)}
                        title={soundOn ? 'Sound on: click to mute' : 'Sound off: click to enable'}
                        aria-label={soundOn ? 'Mute notification sound' : 'Enable notification sound'}
                        aria-pressed={soundOn}
                      >
                        {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="max-h-[340px] overflow-y-auto">
                      {txStats.count === 0 && <EmptyState icon={Inbox} title="You're all caught up" text="New deposit and withdrawal requests appear here the moment a client submits them." />}
                      {[...txPending].reverse().slice(0, 8).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className="w-full text-left flex items-center gap-3 px-4 py-3 mx-row border-b border-[var(--line)] last:border-0"
                          onClick={() => {
                            setTxView('PENDING');
                            setBellOpen(false);
                            goTab('transactions');
                          }}
                        >
                          <span className={`p-2 rounded-xl border ${t.type === 'DEPOSIT' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                            {t.type === 'DEPOSIT' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-[var(--ink)] truncate">{t.clientName}</span>
                            <span className="block text-xs text-[var(--muted)]">
                              {t.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'} · {timeAgo(t.createdAt)}
                            </span>
                          </span>
                          <span className="mx-num text-sm font-bold text-[var(--ink)]">{fmtUSD(t.amount)}</span>
                        </button>
                      ))}
                    </div>
                    <div className="p-3 border-t border-[var(--line)] bg-[var(--raised)]">
                      <button
                        type="button"
                        className="mx-btn mx-btn-primary w-full"
                        onClick={() => {
                          setBellOpen(false);
                          goTab('transactions');
                        }}
                      >
                        <Receipt className="w-4 h-4" /> Open Transactions
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {liveCall && (
              <button
                type="button"
                onClick={() => setDialerOpen(true)}
                className="mx-badge mx-b-ok !py-1.5 !px-3 cursor-pointer"
                aria-label="Open active call"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)] mx-pulse" />
                <span className="max-w-[120px] truncate">{liveCall.clientName || liveCall.number}</span>
                {liveCall.status === 'connected' ? <CallTimer startedAt={liveCall.startedAt} /> : <span>…</span>}
              </button>
            )}
            <button
              type="button"
              className={`mx-btn !py-2 ${dialerOpen && activeCrmTab !== 'dialer' ? 'mx-btn-ok' : ''}`}
              onClick={() => (activeCrmTab === 'dialer' ? null : setDialerOpen((o) => !o))}
              disabled={activeCrmTab === 'dialer'}
              aria-pressed={dialerOpen}
            >
              <PhoneCall className="w-4 h-4" />
              <span className="hidden sm:inline">Dialer</span>
            </button>
          </div>
        </header>

        <main className="flex-1 w-full min-w-0 max-w-none p-4 sm:p-6 xl:p-8">
          {/* DASHBOARD TAB */}
          {activeCrmTab === 'dashboard' && (
            <div className="space-y-6 mx-in-up">
              <PageHeader
                title={`Welcome back, ${currentUser.name.split(' ')[0]}`}
                subtitle={isAdmin ? 'Firm-wide overview of clients, compliance and communications.' : 'Overview of the accounts assigned to you.'}
              />
              {isAdmin && txStats.count > 0 && (
                <div className="mx-card px-5 py-4 flex flex-wrap items-center justify-between gap-3 !border-amber-200 !bg-amber-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-white border border-amber-200">
                      <Banknote className="w-5 h-5 text-[var(--warn)]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[var(--ink)]">
                        {txStats.count} cash request{txStats.count === 1 ? '' : 's'} awaiting your review
                      </div>
                      <div className="text-xs text-slate-600">
                        {txStats.deposits} deposit{txStats.deposits === 1 ? '' : 's'} ({fmtUSD(txStats.depositTotal)}) · {txStats.withdrawals} withdrawal{txStats.withdrawals === 1 ? '' : 's'} ({fmtUSD(txStats.withdrawalTotal)})
                      </div>
                    </div>
                  </div>
                  <button type="button" className="mx-btn mx-btn-primary" onClick={() => goTab('transactions')}>
                    Review requests
                  </button>
                </div>
              )}
              <div className={`grid grid-cols-2 ${isAdmin ? 'xl:grid-cols-5' : 'xl:grid-cols-4'} gap-4 w-full`}>
                <StatCard label="Real Client Accounts" value={metrics.totalClients} hint={`${kycCounts.PENDING} awaiting KYC review`} />
                <StatCard label="Total Portfolio Capital" value={fmtUSD(metrics.totalBal)} tone="text-[var(--ok)]" />
                <StatCard label="Allocated Credit Bonuses" value={fmtUSD(metrics.totalBonus)} tone="text-[var(--warn)]" />
                {isAdmin && (
                  <StatCard
                    label="Pending Cash Requests"
                    value={txStats.count}
                    tone={txStats.count > 0 ? 'text-[var(--warn)]' : 'text-[var(--ink)]'}
                    hint={`${fmtUSD(txStats.depositTotal)} in · ${fmtUSD(txStats.withdrawalTotal)} out`}
                    onClick={() => goTab('transactions')}
                  />
                )}
                <StatCard label="Compliance Verification" value={`${metrics.verifiedRatio}%`} tone="text-[var(--accent)]">
                  <div className="h-1.5 rounded-full bg-[var(--raised)] mt-3 overflow-hidden">
                    <div className="h-full bg-[var(--accent)] rounded-full transition-all" style={{ width: `${metrics.verifiedRatio}%` }} />
                  </div>
                </StatCard>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="mx-card p-6 xl:col-span-2">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--ink)]">KYC queue</h3>
                      <p className="text-xs text-[var(--muted)] mt-0.5">Clients waiting for identity review</p>
                    </div>
                    <button type="button" className="mx-btn mx-btn-sm" onClick={() => { setKycFilter('PENDING'); goTab('kyc'); }}>
                      Open KYC Center
                    </button>
                  </div>
                  {scopedClients.length > 0 && (
                    <div className="mb-5">
                      <div className="flex h-2 rounded-full overflow-hidden bg-[var(--raised)]" role="img" aria-label={`KYC: ${kycCounts.APPROVED} approved, ${kycCounts.PENDING} pending, ${kycCounts.REJECTED} rejected`}>
                        <div style={{ width: `${(kycCounts.APPROVED / scopedClients.length) * 100}%`, background: 'var(--ok)' }} />
                        <div style={{ width: `${(kycCounts.PENDING / scopedClients.length) * 100}%`, background: 'var(--warn)' }} />
                        <div style={{ width: `${(kycCounts.REJECTED / scopedClients.length) * 100}%`, background: 'var(--bad)' }} />
                      </div>
                      <div className="flex gap-5 mt-2.5 text-xs text-[var(--muted)]">
                        <span><span className="inline-block w-2 h-2 rounded-full bg-[var(--ok)] mr-1.5" />Approved <b className="mx-num text-[var(--ink)]">{kycCounts.APPROVED}</b></span>
                        <span><span className="inline-block w-2 h-2 rounded-full bg-[var(--warn)] mr-1.5" />Pending <b className="mx-num text-[var(--ink)]">{kycCounts.PENDING}</b></span>
                        <span><span className="inline-block w-2 h-2 rounded-full bg-[var(--bad)] mr-1.5" />Rejected <b className="mx-num text-[var(--ink)]">{kycCounts.REJECTED}</b></span>
                      </div>
                    </div>
                  )}
                  {pendingQueue.length === 0 ? (
                    <EmptyState icon={ShieldCheck} title="Nothing waiting" text="All submitted verifications have been reviewed." />
                  ) : (
                    <div className="divide-y divide-[var(--line)]">
                      {pendingQueue.slice(0, 5).map((c) => (
                        <div key={c.id} className="flex items-center gap-3 py-3">
                          <Avatar name={c.name} size={34} />
                          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openProfile(c.id, 'kyc')}>
                            <div className="text-sm font-medium text-[var(--ink)] truncate">{c.name}</div>
                            <div className="text-xs text-[var(--muted)]">{c.kycDocs.length} document{c.kycDocs.length === 1 ? '' : 's'} submitted</div>
                          </button>
                          <button type="button" className="mx-icon-btn ok" title="Approve" aria-label={`Approve KYC for ${c.name}`} onClick={() => handleKycReview(c.id, 'APPROVED')}>
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" className="mx-btn mx-btn-sm" onClick={() => openProfile(c.id, 'kyc')}>Review</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mx-card p-6">
                  <h3 className="text-sm font-semibold text-[var(--ink)] mb-1">Pipeline stages</h3>
                  <p className="text-xs text-[var(--muted)] mb-5">Clients by current stage</p>
                  {stageCounts.length === 0 ? (
                    <EmptyState title="No clients yet" />
                  ) : (
                    <div className="space-y-3.5">
                      {stageCounts.map(({ stage, n }) => (
                        <div key={stage}>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-slate-600">{prettyStage(stage)}</span>
                            <span className="mx-num text-[var(--ink)]">{n}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[var(--raised)]">
                            <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${(n / maxStage) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="mx-card p-6">
                  <h3 className="text-sm font-semibold text-[var(--ink)] mb-1">Today's calls</h3>
                  <p className="text-xs text-[var(--muted)] mb-5">Voice activity from the Fonitel dialer</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[['Calls', callStats.today], ['Talk time', fmtDuration(callStats.talk)], ['Answered', `${callStats.rate}%`]].map(([l, v]) => (
                      <div key={l} className="rounded-xl bg-[var(--bg)] border border-[var(--line)] py-3">
                        <div className="mx-num text-lg font-semibold text-[var(--ink)]">{v}</div>
                        <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mt-1">{l}</div>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="mx-btn w-full mt-4" onClick={() => goTab('dialer')}>
                    <PhoneCall className="w-4 h-4" /> Open dialer
                  </button>
                </div>
                <div className="mx-card p-6 xl:col-span-2">
                  <h3 className="text-sm font-semibold text-[var(--ink)] mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[var(--accent)]" /> Recent activity
                  </h3>
                  <div className="divide-y divide-[var(--line)]">
                    {recentActivity.map((l) => (
                      <div key={l.id} className="py-2.5 flex items-start gap-3">
                        <span className="mx-badge mx-b-neutral mx-num !text-[10px] mt-0.5">{l.action}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-slate-700 truncate">{l.details}</div>
                          <div className="text-[11px] text-[var(--muted)]">{l.user} · {l.timestamp}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CLIENTS TAB */}
          {activeCrmTab === 'clients' && (
            <div className="space-y-4 mx-in-up">
              <PageHeader title="Clients" subtitle={`Displaying ${visibleClients.length} real accounts`} />
              <div className="mx-card p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="relative lg:w-80">
                  <Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search client records..."
                    aria-label="Search client records"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="mx-field !pl-9"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((k) => (
                    <button key={k} type="button" className={`mx-chip ${kycFilter === k ? 'on' : ''}`} onClick={() => setKycFilter(k)}>
                      {k === 'ALL' ? 'All KYC' : KYC_META[k].label}
                      {k !== 'ALL' && <span className="mx-num opacity-70">{kycCounts[k]}</span>}
                    </button>
                  ))}
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter by stage"
                  className="mx-field lg:ml-auto lg:w-48"
                >
                  <option value="ALL">All stages</option>
                  {stageOptions.map((s) => (
                    <option key={s} value={s}>{prettyStage(s)}</option>
                  ))}
                </select>
              </div>

              <div className="mx-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[980px]">
                    <thead>
                      <tr className="border-b border-[var(--line)] bg-[#F8FAFC]">
                        <th className="mx-th">Client Details</th>
                        <th className="mx-th">Phone / IP</th>
                        <th className="mx-th">Stage</th>
                        <th className="mx-th">KYC</th>
                        <th className="mx-th">Balance & Bonus</th>
                        <th className="mx-th">Assigned Agent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--line)]">
                      {visibleClients.length === 0 ? (
                        <tr>
                          <td colSpan="6">
                            <EmptyState icon={Users} title="No real clients found" text={scopedClients.length ? 'Try clearing your search or filters.' : 'No real clients registered yet.'} />
                          </td>
                        </tr>
                      ) : (
                        visibleClients.map((client) => (
                          <tr
                            key={client.id}
                            className="mx-row cursor-pointer"
                            onClick={() => openProfile(client.id)}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.target === e.currentTarget) openProfile(client.id);
                            }}
                          >
                            <td className="mx-td">
                              <div className="flex items-center gap-3">
                                <Avatar name={client.name} />
                                <div className="min-w-0">
                                  <div className="font-semibold text-[var(--ink)] flex items-center gap-2 flex-wrap">
                                    {client.name}
                                    {client.resetRequested && <span className="mx-badge mx-b-warn !py-0 !text-[10px]">Reset requested</span>}
                                  </div>
                                  <div className="text-xs text-[var(--muted)]">{client.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="mx-td">
                              <div className="flex items-center gap-2.5">
                                <div>
                                  <div className="mx-num text-[var(--ink)] text-[13px]">{client.phone}</div>
                                  <div className="text-[11px] text-[var(--muted)] flex items-center gap-1 mt-0.5 mx-num">
                                    <Globe className="w-3 h-3" />
                                    {client.ip}
                                  </div>
                                </div>
                                <PhoneActions phone={client.phone} onCall={() => callClient(client)} onWhatsApp={() => openProfile(client.id, 'whatsapp')} />
                              </div>
                            </td>
                            <td className="mx-td">
                              <span className="mx-badge mx-b-accent">{prettyStage(client.stage)}</span>
                            </td>
                            <td className="mx-td">
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <KycBadge status={client.kycStatus} />
                                {client.kycStatus === 'PENDING' && (
                                  <>
                                    <button type="button" className="mx-icon-btn ok" title="Approve KYC" aria-label={`Approve KYC for ${client.name}`} onClick={() => handleKycReview(client.id, 'APPROVED')}>
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button type="button" className="mx-icon-btn bad" title="Review & reject" aria-label={`Reject KYC for ${client.name}`} onClick={() => openProfile(client.id, 'kyc')}>
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="mx-td">
                              <div className="mx-num text-[var(--ok)] font-semibold">{fmtUSD(client.balanceUSD)}</div>
                              <div className="mx-num text-[var(--warn)] text-[11px]">Bonus: {fmtUSD(client.bonusUSD)}</div>
                              {portfolio[client.dbId] && (
                                <div className="mx-num text-[11px] text-[var(--muted)]">
                                  Equity: <span className="text-[var(--ink)]">{fmtUSD(equityOf(client))}</span>
                                </div>
                              )}
                            </td>
                            <td className="mx-td" onClick={(e) => e.stopPropagation()}>
                              {isAdmin ? (
                                <select
                                  value={client.assignedAgent || 'Unassigned'}
                                  onChange={(e) => handleAssignAgent(client.id, e.target.value)}
                                  aria-label={`Assigned agent for ${client.name}`}
                                  className="mx-field !py-1.5 !w-auto min-w-[140px]"
                                >
                                  <option value="Unassigned">Unassigned</option>
                                  {agents.map((ag) => (
                                    <option key={ag.id} value={ag.name}>{ag.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-slate-600">{client.assignedAgent || 'Unassigned'}</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* PORTFOLIOS */}
          {activeCrmTab === 'portfolios' && (() => {
            const q = pfSearch.trim().toLowerCase();
            const rows = portfolioRows
              .filter((r) => (!pfOnlyOpen || r.openCount > 0) && (!q || `${r.client.name} ${r.client.email} ${r.client.id}`.toLowerCase().includes(q)))
              .sort((a, b) => b.openCount - a.openCount || b.equity - a.equity);
            return (
              <div className="space-y-4 mx-in-up">
                <PageHeader
                  title="Client Portfolios"
                  subtitle={`Balance, floating P&L, equity and open positions for ${isAdmin ? 'every client' : 'your clients'} — straight from the trading engine, updated live.`}
                />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Total balance" value={fmtUSD(portfolioTotals.balance)} tone="text-[var(--ok)]" hint={`${portfolioRows.length} account${portfolioRows.length === 1 ? '' : 's'}`} />
                  <StatCard label="Total equity" value={fmtUSD(portfolioTotals.equity)} hint="Balance + floating P&L" />
                  <StatCard label="Floating P&L" value={fmtPnl(portfolioTotals.floating)} tone={pnlTone(portfolioTotals.floating)} hint="Across all open positions" />
                  <StatCard label="Open positions" value={portfolioTotals.open} hint={`${portfolioTotals.withPositions} account${portfolioTotals.withPositions === 1 ? '' : 's'} trading now`} />
                </div>
                <div className="mx-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="relative sm:w-80">
                    <Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" placeholder="Search by name, email or ID..." aria-label="Search portfolios" value={pfSearch} onChange={(e) => setPfSearch(e.target.value)} className="mx-field !pl-9" />
                  </div>
                  <div className="flex gap-1.5">
                    <button type="button" className={`mx-chip ${!pfOnlyOpen ? 'on' : ''}`} onClick={() => setPfOnlyOpen(false)}>All accounts</button>
                    <button type="button" className={`mx-chip ${pfOnlyOpen ? 'on' : ''}`} onClick={() => setPfOnlyOpen(true)}>
                      With open positions <span className="mx-num opacity-70">{portfolioTotals.withPositions}</span>
                    </button>
                  </div>
                </div>
                <div className="mx-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[900px]">
                      <thead>
                        <tr className="border-b border-[var(--line)] bg-[#F8FAFC]">
                          <th className="mx-th">Client</th>
                          <th className="mx-th !text-right">Balance</th>
                          <th className="mx-th !text-right">Floating P&amp;L</th>
                          <th className="mx-th !text-right">Equity</th>
                          <th className="mx-th !text-right">Margin used</th>
                          <th className="mx-th !text-right">Positions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--line)]">
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan="6">
                              <EmptyState icon={Briefcase} title="No portfolios to show" text={pfOnlyOpen ? 'No client has an open position right now.' : 'No clients match your search.'} />
                            </td>
                          </tr>
                        ) : (
                          rows.map((r) => {
                            const open = !!pfExpanded[r.client.id];
                            return (
                              <React.Fragment key={r.client.id}>
                                <tr
                                  className="mx-row cursor-pointer"
                                  onClick={() => setPfExpanded((p) => ({ ...p, [r.client.id]: !p[r.client.id] }))}
                                  tabIndex={0}
                                  aria-expanded={open}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.target === e.currentTarget) setPfExpanded((p) => ({ ...p, [r.client.id]: !p[r.client.id] }));
                                  }}
                                >
                                  <td className="mx-td">
                                    <div className="flex items-center gap-3">
                                      <ChevronRight className={`w-4 h-4 text-[var(--muted)] transition ${open ? 'rotate-90' : ''}`} />
                                      <Avatar name={r.client.name} />
                                      <div className="min-w-0">
                                        <div className="font-semibold text-[var(--ink)]">{r.client.name}</div>
                                        <div className="text-xs text-[var(--muted)]">{r.client.id}{isAdmin ? ` · ${r.client.assignedAgent || 'Unassigned'}` : ''}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="mx-td text-right mx-num text-[var(--ink)]">{fmtUSD(r.client.balanceUSD)}</td>
                                  <td className={`mx-td text-right mx-num font-medium ${r.openCount ? pnlTone(r.floating) : 'text-[var(--muted)]'}`}>{r.openCount ? fmtPnl(r.floating) : '—'}</td>
                                  <td className="mx-td text-right mx-num font-semibold text-[var(--ink)]">{fmtUSD(r.equity)}</td>
                                  <td className="mx-td text-right mx-num text-[var(--muted)]">{r.openCount ? fmtUSD(r.marginUsed) : '—'}</td>
                                  <td className="mx-td text-right">
                                    <span className={`mx-badge ${r.openCount ? 'mx-b-accent' : 'mx-b-neutral'}`}>{r.openCount} open</span>
                                  </td>
                                </tr>
                                {open && (
                                  <tr>
                                    <td colSpan="6" className="!p-0 bg-[#F8FAFC]">
                                      <div className="px-6 py-4">
                                        {r.positions.length === 0 ? (
                                          <div className="text-xs text-[var(--muted)]">No open positions. Equity equals balance.</div>
                                        ) : (
                                          <table className="w-full text-xs min-w-[640px]">
                                            <thead>
                                              <tr className="text-[var(--muted)] text-left">
                                                <th className="py-1.5 font-medium">Symbol</th>
                                                <th className="py-1.5 font-medium">Side</th>
                                                <th className="py-1.5 font-medium text-right">Lots</th>
                                                <th className="py-1.5 font-medium text-right">Open price</th>
                                                <th className="py-1.5 font-medium text-right">Current</th>
                                                <th className="py-1.5 font-medium text-right">Margin</th>
                                                <th className="py-1.5 font-medium text-right">P&amp;L</th>
                                                <th className="py-1.5 font-medium text-right">Opened</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--line)]">
                                              {r.positions.map((p) => (
                                                <tr key={p.id}>
                                                  <td className="py-2 text-[var(--ink)] font-medium">{p.symbol}</td>
                                                  <td className="py-2">
                                                    <span className={`mx-badge ${p.side === 'BUY' ? 'mx-b-ok' : 'mx-b-bad'} !py-0`}>{p.side}</span>
                                                  </td>
                                                  <td className="py-2 text-right mx-num text-[var(--ink)]">{p.volume}</td>
                                                  <td className="py-2 text-right mx-num">{fmtPrice(p.openPrice)}</td>
                                                  <td className="py-2 text-right mx-num">{fmtPrice(p.currentPrice)}</td>
                                                  <td className="py-2 text-right mx-num text-[var(--muted)]">{fmtUSD(p.margin)}</td>
                                                  <td className={`py-2 text-right mx-num font-semibold ${pnlTone(p.pnl)}`}>{fmtPnl(p.pnl)}</td>
                                                  <td className="py-2 text-right text-[var(--muted)]">{fmtDateTime(p.openedAt)}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        )}
                                        <div className="mt-3">
                                          <button type="button" className="mx-btn mx-btn-sm" onClick={(e) => { e.stopPropagation(); openProfile(r.client.id); }}>
                                            Open client profile
                                          </button>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* KYC CENTER */}
          {activeCrmTab === 'kyc' && (
            <div className="mx-in-up">
              <PageHeader title="KYC Center" subtitle="Review submitted identification documents and approve or reject verification requests.">
                <div className="flex flex-wrap gap-1.5">
                  {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((k) => (
                    <button key={k} type="button" className={`mx-chip ${kycFilter === k ? 'on' : ''}`} onClick={() => setKycFilter(k)}>
                      {k === 'ALL' ? 'All' : KYC_META[k].label}
                      <span className="mx-num opacity-70">{k === 'ALL' ? scopedClients.length : kycCounts[k]}</span>
                    </button>
                  ))}
                </div>
              </PageHeader>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="mx-card lg:col-span-2 overflow-hidden self-start">
                  {kycQueue.length === 0 ? (
                    <EmptyState icon={ShieldCheck} title="No requests in this view" text="Change the filter to see other verification statuses." />
                  ) : (
                    <ul className="divide-y divide-[var(--line)] max-h-[70vh] overflow-y-auto">
                      {kycQueue.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => setKycSelectedId(c.id)}
                            className={`w-full text-left flex items-center gap-3 px-4 py-3.5 mx-row ${kycSelected?.id === c.id ? 'bg-[var(--accent-soft)]' : ''}`}
                            aria-current={kycSelected?.id === c.id}
                          >
                            <Avatar name={c.name} size={38} />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-[var(--ink)] truncate">{c.name}</div>
                              <div className="text-xs text-[var(--muted)]">{c.kycDocs.length} doc{c.kycDocs.length === 1 ? '' : 's'} · {c.assignedAgent || 'Unassigned'}</div>
                            </div>
                            <KycBadge status={c.kycStatus} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="mx-card lg:col-span-3 p-6">
                  {kycSelected ? (
                    <>
                      <div className="flex items-center gap-3 mb-5">
                        <Avatar name={kycSelected.name} size={44} />
                        <div className="min-w-0 flex-1">
                          <div className="text-base font-semibold text-[var(--ink)] truncate">{kycSelected.name}</div>
                          <div className="text-xs text-[var(--muted)] flex items-center gap-2 mx-num">{kycSelected.phone}</div>
                        </div>
                        <PhoneActions phone={kycSelected.phone} onCall={() => callClient(kycSelected)} onWhatsApp={() => openProfile(kycSelected.id, 'whatsapp')} />
                        <button type="button" className="mx-btn mx-btn-sm" onClick={() => openProfile(kycSelected.id)}>Profile</button>
                      </div>
                      <KycPanel client={kycSelected} onReview={handleKycReview} onRetry={(c) => handleKycReview(c.id, c.kycStatus, c.kycNote)} onPreview={setDocPreview} />
                    </>
                  ) : (
                    <EmptyState icon={ShieldCheck} title="Select a client" text="Choose a verification request on the left to inspect their documents." />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* WHATSAPP */}
          {activeCrmTab === 'whatsapp' && (
            <div className="mx-in-up">
              <PageHeader title="WhatsApp" subtitle="Message and call your clients without leaving the CRM." />
              <div className="mx-card overflow-hidden grid grid-cols-1 md:grid-cols-[320px_1fr] h-[calc(100vh-230px)] min-h-[520px]">
                <div className="border-b md:border-b-0 md:border-r border-[var(--line)] flex flex-col min-h-0 max-h-[240px] md:max-h-none">
                  <div className="p-3 border-b border-[var(--line)] relative">
                    <Search className="w-4 h-4 text-[var(--muted)] absolute left-6 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={waSearch}
                      onChange={(e) => setWaSearch(e.target.value)}
                      placeholder="Search conversations"
                      aria-label="Search conversations"
                      className="mx-field !pl-9"
                    />
                  </div>
                  <ul className="flex-1 overflow-y-auto divide-y divide-[var(--line)]">
                    {waList.length === 0 && <EmptyState icon={MessageCircle} title="No contactable clients" text="Clients need a valid phone number." />}
                    {waList.map(({ client: c, last }) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setWaSelectedId(c.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left mx-row ${waSelectedId === c.id ? 'bg-[rgba(37,211,102,.08)]' : ''}`}
                        >
                          <Avatar name={c.name} size={40} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-sm font-medium text-[var(--ink)] truncate">{c.name}</span>
                              {last && <span className="text-[10px] text-[var(--muted)] shrink-0">{fmtClock(last.ts)}</span>}
                            </div>
                            <div className="text-xs text-[var(--muted)] truncate">
                              {last ? `${last.dir === 'out' ? 'You: ' : ''}${last.text}` : c.phone}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="min-h-0 min-w-0">
                  {waSelected ? (
                    <ChatPane
                      key={waSelected.id}
                      client={waSelected}
                      messages={waThreads[waSelected.id] || []}
                      online={waOnline}
                      agentName={currentUser.name}
                      onSend={sendWhatsApp}
                      onRetry={retryWhatsApp}
                      onVoice={callClient}
                      onWaCall={startWhatsAppCall}
                    />
                  ) : (
                    <EmptyState icon={MessageCircle} title="Select a conversation" text="Pick a client to view chat history and reply." />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DIALER */}
          {activeCrmTab === 'dialer' && (
            <div className="mx-in-up">
              <PageHeader title="Dialer" subtitle="Fonitel VoIP softphone with call history across your accounts." />
              <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
                <SoftPhone number={dialNumber} setNumber={setDialNumber} session={callSession} onCall={(n) => placeCall(n, null)} onHangup={hangUp} onDtmf={sendDtmf} />
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <StatCard label="Calls today" value={callStats.today} />
                    <StatCard label="Talk time" value={fmtDuration(callStats.talk)} tone="text-[var(--ok)]" />
                    <StatCard label="Answer rate" value={`${callStats.rate}%`} tone="text-[var(--accent)]" />
                  </div>
                  <div className="mx-card overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-[var(--line)]">
                      <h3 className="text-sm font-semibold text-[var(--ink)]">Call logs</h3>
                      <div className="flex gap-1.5">
                        {[['ALL', 'All'], ['COMPLETED', 'Connected'], ['MISSED', 'Unanswered / failed']].map(([k, l]) => (
                          <button key={k} type="button" className={`mx-chip ${logFilter === k ? 'on' : ''}`} onClick={() => setLogFilter(k)}>{l}</button>
                        ))}
                      </div>
                    </div>
                    {visibleLogs.length === 0 ? (
                      <EmptyState icon={Phone} title="No calls yet" text="Calls you place from the keypad or a client's phone number appear here." />
                    ) : (
                      <div className="overflow-x-auto max-h-[52vh] overflow-y-auto">
                        <table className="w-full text-sm min-w-[640px]">
                          <thead className="sticky top-0 bg-[var(--panel)]">
                            <tr className="border-b border-[var(--line)]">
                              <th className="mx-th">Contact</th>
                              <th className="mx-th">Channel</th>
                              <th className="mx-th">Status</th>
                              <th className="mx-th">Duration</th>
                              <th className="mx-th">Time</th>
                              <th className="mx-th" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--line)]">
                            {visibleLogs.slice(0, 100).map((l) => {
                              const m = CALL_STATUS_META[l.status] || { label: l.status, badge: 'mx-b-neutral' };
                              const DirIcon = l.direction === 'inbound' ? PhoneIncoming : PhoneOutgoing;
                              const logClient = scopedClients.find((c) => c.id === l.clientId);
                              return (
                                <tr key={l.id} className="mx-row">
                                  <td className="mx-td">
                                    <div className="flex items-center gap-2.5">
                                      <DirIcon className="w-4 h-4 text-[var(--muted)] shrink-0" />
                                      <div>
                                        <div className="text-[var(--ink)] font-medium">{l.clientName || l.number}</div>
                                        {l.clientName && <div className="mx-num text-[11px] text-[var(--muted)]">{l.number}</div>}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="mx-td">
                                    <span className={`mx-badge ${l.channel === 'whatsapp' ? 'mx-b-ok' : 'mx-b-neutral'}`}>{l.channel === 'whatsapp' ? 'WhatsApp' : 'VoIP'}</span>
                                  </td>
                                  <td className="mx-td"><span className={`mx-badge ${m.badge}`}>{m.label}</span></td>
                                  <td className="mx-td mx-num text-slate-600">{l.channel === 'whatsapp' ? '—' : fmtDuration(l.duration)}</td>
                                  <td className="mx-td text-xs text-[var(--muted)] whitespace-nowrap">{fmtDateTime(l.ts)}</td>
                                  <td className="mx-td text-right">
                                    <button
                                      type="button"
                                      className="mx-icon-btn call"
                                      aria-label={`Call ${l.clientName || l.number} back`}
                                      title="Call back"
                                      onClick={() => placeCall(l.number, logClient || (l.clientName ? { id: l.clientId, name: l.clientName } : null))}
                                    >
                                      <Phone className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AGENTS MANAGEMENT TAB */}
          {/* TRANSACTIONS TAB: deposit / withdrawal approval workflow */}
          {activeCrmTab === 'transactions' && isAdmin && (() => {
            const q = txSearch.trim().toLowerCase();
            const matches = (t) =>
              (txTypeFilter === 'ALL' || t.type === txTypeFilter) &&
              (!q || `${t.clientName || ''} ${t.clientEmail || ''} CL-${t.clientId} ${t.reference || ''} ${t.method || ''} ${t.details || ''}`.toLowerCase().includes(q));
            const rows = (txView === 'PENDING' ? [...txData.pending].reverse() : txData.history).filter(matches);
            const net = txStats.depositTotal - txStats.withdrawalTotal;
            const balanceOf = (t) => {
              const c = clients.find((x) => x.dbId === t.clientId);
              return c ? Number(c.balanceUSD) || 0 : null;
            };
            return (
              <div className="space-y-6 mx-in-up">
                <PageHeader
                  title="Transactions"
                  subtitle="Deposit and withdrawal requests from clients. Approving a deposit credits the client's balance; approving a withdrawal deducts it."
                >
                  <button type="button" className="mx-btn" onClick={fetchTransactions}>
                    <RefreshCw className="w-4 h-4" /> Refresh
                  </button>
                </PageHeader>

                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 w-full">
                  <StatCard
                    label="Awaiting review"
                    value={txStats.count}
                    tone={txStats.count > 0 ? 'text-[var(--warn)]' : 'text-[var(--ink)]'}
                    hint={`${txStats.deposits} deposit${txStats.deposits === 1 ? '' : 's'} · ${txStats.withdrawals} withdrawal${txStats.withdrawals === 1 ? '' : 's'}`}
                  />
                  <StatCard label="Pending deposits" value={fmtUSD(txStats.depositTotal)} tone="text-[var(--ok)]" hint="Will be credited when approved" />
                  <StatCard label="Pending withdrawals" value={fmtUSD(txStats.withdrawalTotal)} tone="text-[var(--warn)]" hint="Will be deducted when approved" />
                  <StatCard label="Net pending flow" value={`${net >= 0 ? '+' : '-'}${fmtUSD(Math.abs(net))}`} tone={net >= 0 ? 'text-[var(--ok)]' : 'text-[var(--bad)]'} hint="Deposits minus withdrawals" />
                </div>

                <div className="mx-card overflow-hidden">
                  <div className="p-4 sm:p-5 flex flex-wrap items-center gap-3 border-b border-[var(--line)]">
                    <div className="flex gap-2" role="tablist" aria-label="Request list">
                      <button type="button" role="tab" aria-selected={txView === 'PENDING'} className={`mx-chip ${txView === 'PENDING' ? 'on' : ''}`} onClick={() => setTxView('PENDING')}>
                        Pending <span className="mx-num">{txData.pending.length}</span>
                      </button>
                      <button type="button" role="tab" aria-selected={txView === 'HISTORY'} className={`mx-chip ${txView === 'HISTORY' ? 'on' : ''}`} onClick={() => setTxView('HISTORY')}>
                        History <span className="mx-num">{txData.history.length}</span>
                      </button>
                    </div>
                    <span className="hidden sm:block w-px h-6 bg-[var(--line-strong)]" aria-hidden="true" />
                    <div className="flex gap-2">
                      {[
                        ['ALL', 'All'],
                        ['DEPOSIT', 'Deposits'],
                        ['WITHDRAWAL', 'Withdrawals']
                      ].map(([k, label]) => (
                        <button key={k} type="button" className={`mx-chip ${txTypeFilter === k ? 'on' : ''}`} onClick={() => setTxTypeFilter(k)}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="relative ml-auto w-full sm:w-72">
                      <Search className="w-4 h-4 text-[var(--faint)] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input className="mx-field !pl-9" placeholder="Search client, email, reference…" value={txSearch} onChange={(e) => setTxSearch(e.target.value)} aria-label="Search requests" />
                    </div>
                  </div>

                  {rows.length === 0 ? (
                    <EmptyState
                      icon={txView === 'PENDING' ? Inbox : Receipt}
                      title={txView === 'PENDING' ? (txData.pending.length ? 'No requests match your filters' : 'No requests waiting') : txData.history.length ? 'No history matches your filters' : 'Nothing has been processed yet'}
                      text={txView === 'PENDING' && !txData.pending.length ? 'New deposit and withdrawal requests show up here instantly, with a notification.' : undefined}
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[920px]">
                        <thead>
                          <tr className="border-b border-[var(--line)] bg-[#F8FAFC]">
                            <th className="mx-th">Client</th>
                            <th className="mx-th">Request</th>
                            <th className="mx-th text-right">Amount</th>
                            <th className="mx-th">Method &amp; details</th>
                            {txView === 'PENDING' ? (
                              <>
                                <th className="mx-th">Requested</th>
                                <th className="mx-th">Balance if approved</th>
                                <th className="mx-th text-right">Decision</th>
                              </>
                            ) : (
                              <>
                                <th className="mx-th">Result</th>
                                <th className="mx-th">Reviewed</th>
                                <th className="mx-th">Note</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((t) => {
                            const bal = balanceOf(t);
                            const after = bal === null ? null : t.type === 'DEPOSIT' ? bal + t.amount : bal - t.amount;
                            const short = txView === 'PENDING' && t.type === 'WITHDRAWAL' && after !== null && after < -0.004;
                            return (
                              <tr key={t.id} className={`border-b border-[var(--line)] last:border-0 mx-row ${newTx[t.id] ? 'mx-new' : ''}`}>
                                <td className="mx-td min-w-[190px]">
                                  <div className="font-semibold text-[var(--ink)]">{t.clientName || `CL-${t.clientId}`}</div>
                                  <div className="text-xs text-[var(--muted)] truncate max-w-[220px]">{t.clientEmail}</div>
                                  <div className="text-[11px] text-[var(--faint)] mx-num whitespace-nowrap">
                                    CL-{t.clientId} · {t.agentName || 'Unassigned'}
                                  </div>
                                </td>
                                <td className="mx-td">
                                  <TxTypeBadge type={t.type} />
                                  <div className="text-[11px] text-[var(--faint)] mx-num mt-1">#{t.id}</div>
                                </td>
                                <td className="mx-td text-right mx-num font-extrabold text-[var(--ink)]">{fmtUSD(t.amount)}</td>
                                <td className="mx-td text-xs text-[var(--muted)] max-w-[280px]">
                                  <div className="text-[var(--ink)] font-semibold">{t.method || '—'}</div>
                                  {t.reference && <div className="mx-num break-all">Ref: {t.reference}</div>}
                                  {t.details && <div className="break-words">{t.details}</div>}
                                </td>
                                {txView === 'PENDING' ? (
                                  <>
                                    <td className="mx-td text-xs whitespace-nowrap">
                                      <div className="text-[var(--ink)] font-medium">{timeAgo(t.createdAt)}</div>
                                      <div className="text-[var(--faint)]">{fmtDateTime(t.createdAt)}</div>
                                    </td>
                                    <td className="mx-td text-xs mx-num">
                                      {bal === null ? (
                                        '—'
                                      ) : (
                                        <>
                                          <div className="text-[var(--muted)]">{fmtUSD(bal)} →</div>
                                          <div className={`font-bold ${short ? 'text-[var(--bad)]' : 'text-[var(--ink)]'}`}>{fmtUSD(after)}</div>
                                          {short && <div className="text-[10px] text-[var(--bad)] font-sans font-semibold">Balance too low</div>}
                                        </>
                                      )}
                                    </td>
                                    <td className="mx-td">
                                      <div className="flex gap-2 justify-end">
                                        <button type="button" className="mx-btn mx-btn-sm mx-btn-ok" onClick={() => openTxReview(t, 'APPROVED')} disabled={short}>
                                          <Check className="w-3.5 h-3.5" /> Approve
                                        </button>
                                        <button type="button" className="mx-btn mx-btn-sm mx-btn-bad" onClick={() => openTxReview(t, 'REJECTED')}>
                                          <X className="w-3.5 h-3.5" /> Reject
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="mx-td">
                                      <TxStatusBadge status={t.status} />
                                    </td>
                                    <td className="mx-td text-xs whitespace-nowrap">
                                      <div className="text-[var(--ink)] font-medium">{t.processedBy || '—'}</div>
                                      <div className="text-[var(--faint)]">{fmtDateTime(t.processedAt)}</div>
                                    </td>
                                    <td className="mx-td text-xs text-[var(--muted)] max-w-[220px] break-words">{t.note || '—'}</td>
                                  </>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {activeCrmTab === 'agents' && isAdmin && (
            <div className="mx-in-up">
              <PageHeader title="Manage Agents" subtitle="Create agent logins, see who is on your team, and remove agents who have left." />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Create Agent Form */}
                <div className="mx-card p-6 self-start">
                  <h3 className="text-sm font-semibold text-[var(--ink)] pb-4 mb-4 border-b border-[var(--line)] flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-[var(--accent)]" />
                    Create New Agent
                  </h3>
                  <form onSubmit={handleCreateAgent} className="space-y-4">
                    <div>
                      <label className="mx-label" htmlFor="ag-name">Agent Name</label>
                      <input id="ag-name" type="text" required value={newAgentName} onChange={(e) => setNewAgentName(e.target.value)} placeholder="Daniel Mz" className="mx-field" />
                    </div>
                    <div>
                      <label className="mx-label" htmlFor="ag-email">Agent Email</label>
                      <input id="ag-email" type="email" required value={newAgentEmail} onChange={(e) => setNewAgentEmail(e.target.value)} placeholder="daniel@meridianmarket.net" className="mx-field" />
                    </div>
                    <div>
                      <label className="mx-label" htmlFor="ag-pass">Password</label>
                      <input id="ag-pass" type="password" required value={newAgentPassword} onChange={(e) => setNewAgentPassword(e.target.value)} placeholder="••••••••" className="mx-field" />
                    </div>
                    <button type="submit" className="mx-btn mx-btn-primary w-full !py-3">Create Agent</button>
                  </form>
                </div>

                {/* Existing Agents List */}
                <div className="lg:col-span-2 mx-card p-6">
                  <h3 className="text-sm font-semibold text-[var(--ink)] pb-4 mb-4 border-b border-[var(--line)]">Registered Agents ({agents.length})</h3>
                  {agents.length === 0 ? (
                    <EmptyState icon={UserCheck} title="No custom agents created yet" />
                  ) : (
                    <div className="space-y-3">
                      {agents.map((ag) => (
                        <div key={ag.id} className="flex items-center gap-3 p-3.5 bg-[var(--bg)] border border-[var(--line)] rounded-xl">
                          <Avatar name={ag.name} />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-[var(--ink)]">{ag.name}</div>
                            <div className="text-xs text-[var(--muted)] flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3 h-3" />
                              {ag.email}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="mx-num text-sm text-[var(--ink)]">{clients.filter((c) => (c.assignedAgent || '').trim().toLowerCase() === (ag.name || '').trim().toLowerCase()).length}</div>
                            <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">clients</div>
                          </div>
                          <span className="mx-num text-[11px] text-[var(--faint)] hidden sm:block">ID: {ag.id}</span>
                          <button
                            type="button"
                            className="mx-icon-btn bad"
                            title={`Delete agent ${ag.name}`}
                            aria-label={`Delete agent ${ag.name}`}
                            onClick={() =>
                              askDelete({
                                kind: 'agent',
                                id: ag.id,
                                dbId: ag.id,
                                name: ag.name,
                                extra: clients.filter((c) => (c.assignedAgent || '').trim().toLowerCase() === (ag.name || '').trim().toLowerCase()).length
                              })
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* FINANCIAL OPS TAB */}
          {activeCrmTab === 'financial_ops' && isAdmin && (
            <div className="mx-in-up">
              <PageHeader title="Financial Adjustments" subtitle="Manually credit, deduct or grant bonus funds. All changes are written to the audit log." />
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="mx-card p-6 lg:col-span-3">
                  <h3 className="text-sm font-semibold text-[var(--ink)] pb-4 mb-4 border-b border-[var(--line)]">Manual Balance Adjustment</h3>
                  <form onSubmit={handleManualBalanceAdjustment} className="space-y-5">
                    <div>
                      <label className="mx-label" htmlFor="fin-acct">Select Account</label>
                      <select id="fin-acct" value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="mx-field">
                        <option value="">Select account...</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>{c.name} (Bal: ${parseFloat(c.balanceUSD || 0).toFixed(2)})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className="mx-label">Adjustment type</span>
                      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Adjustment type">
                        {[
                          ['ADD', '+ Add', 'bg-emerald-50 border-emerald-300 text-emerald-700'],
                          ['MINUS', '- Deduct', 'bg-rose-50 border-rose-300 text-rose-700'],
                          ['BONUS', '+ Bonus', 'bg-amber-50 border-amber-300 text-amber-700']
                        ].map(([k, l, on]) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => setAdjustmentType(k)}
                            aria-pressed={adjustmentType === k}
                            className={`py-2.5 rounded-xl text-sm font-semibold border transition ${adjustmentType === k ? on : 'bg-[var(--bg)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'}`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mx-label" htmlFor="fin-amt">Amount (USD)</label>
                      <input id="fin-amt" type="number" step="0.01" required value={adjustmentAmount} onChange={(e) => setAdjustmentAmount(e.target.value)} placeholder="0.00" className="mx-field mx-num" />
                    </div>
                    <button type="submit" className="mx-btn mx-btn-primary w-full !py-3">Execute Adjustment</button>
                  </form>
                </div>
                <div className="mx-card p-6 lg:col-span-2 self-start">
                  <div className="mx-eyebrow mb-4">Selected account</div>
                  {financialTarget ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={financialTarget.name} size={44} />
                        <div className="min-w-0">
                          <div className="font-semibold text-[var(--ink)] truncate">{financialTarget.name}</div>
                          <div className="text-xs text-[var(--muted)]">{financialTarget.id}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-[var(--bg)] border border-[var(--line)] p-3.5">
                          <div className="mx-eyebrow">Balance</div>
                          <div className="mx-num text-lg font-semibold text-[var(--ok)] mt-1.5">{fmtUSD(financialTarget.balanceUSD)}</div>
                        </div>
                        <div className="rounded-xl bg-[var(--bg)] border border-[var(--line)] p-3.5">
                          <div className="mx-eyebrow">Bonus</div>
                          <div className="mx-num text-lg font-semibold text-[var(--warn)] mt-1.5">{fmtUSD(financialTarget.bonusUSD)}</div>
                        </div>
                      </div>
                      {portfolio[financialTarget.dbId] && (
                        <div className="text-xs text-[var(--muted)] mx-num">
                          Live equity <span className="text-[var(--ink)]">{fmtUSD(equityOf(financialTarget))}</span> · {portfolio[financialTarget.dbId].openCount || 0} open position(s)
                        </div>
                      )}
                      <KycBadge status={financialTarget.kycStatus} />
                    </div>
                  ) : (
                    <EmptyState icon={Wallet} title="No account selected" />
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* FLOATING DIALER */}
      {showFloatingDialer && (
        <div className="fixed z-[70] bottom-4 left-4 lg:left-[17rem] w-[calc(100vw-2rem)] max-w-[340px] mx-in-up shadow-2xl shadow-slate-900/10">
          <SoftPhone
            number={dialNumber}
            setNumber={setDialNumber}
            session={callSession}
            onCall={(n) => placeCall(n, null)}
            onHangup={hangUp}
            onDtmf={sendDtmf}
            onClose={() => setDialerOpen(false)}
          />
        </div>
      )}

      {/* CLIENT PROFILE DRAWER */}
      {profileClient && (
        <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label={`${profileClient.name} profile`}>
          <button type="button" aria-label="Close profile" className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setProfileClientId('')} />
          <div className="relative w-full max-w-xl bg-[var(--panel)] border-l border-[var(--line-strong)] flex flex-col mx-in-right shadow-2xl">
            <div className="p-5 border-b border-[var(--line)]">
              <div className="flex items-start gap-3">
                <Avatar name={profileClient.name} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-semibold text-[var(--ink)] truncate">{profileClient.name}</div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="mx-num text-xs text-[var(--muted)]">{profileClient.id}</span>
                    <span className="mx-badge mx-b-accent">{prettyStage(profileClient.stage)}</span>
                    <KycBadge status={profileClient.kycStatus} />
                  </div>
                </div>
                <button type="button" className="mx-icon-btn" onClick={() => setProfileClientId('')} aria-label="Close profile">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <button type="button" className="mx-btn mx-btn-ok mx-btn-sm" onClick={() => callClient(profileClient)} disabled={!validPhone(profileClient.phone)}>
                  <Phone className="w-3.5 h-3.5" /> Call
                </button>
                <button type="button" className="mx-btn mx-btn-sm" onClick={() => setProfileTab('whatsapp')} disabled={!validPhone(profileClient.phone)}>
                  <MessageCircle className="w-3.5 h-3.5 text-[var(--wa)]" /> WhatsApp
                </button>
                <button type="button" className="mx-btn mx-btn-sm" disabled={resetBusy} onClick={() => handleResetPassword(profileClient)} title="Reset to the temporary password; the client must choose a new one at next login">
                  <Key className="w-3.5 h-3.5" /> {resetBusy ? 'Resetting…' : 'Reset password'}
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    className="mx-btn mx-btn-bad mx-btn-sm"
                    onClick={() => askDelete({ kind: 'client', id: profileClient.id, dbId: profileClient.dbId, name: profileClient.name, extra: profileClient.openCount })}
                    title="Permanently delete this client and all related data"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}
                {profileClient.kycStatus === 'PENDING' && (
                  <>
                    <button type="button" className="mx-btn mx-btn-ok mx-btn-sm ml-auto" onClick={() => handleKycReview(profileClient.id, 'APPROVED')}>
                      <Check className="w-3.5 h-3.5" /> Approve KYC
                    </button>
                    <button type="button" className="mx-btn mx-btn-bad mx-btn-sm" onClick={() => setProfileTab('kyc')}>
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </>
                )}
              </div>
              <div className="flex gap-1 mt-4 -mb-5" role="tablist">
                {[['overview', 'Overview'], ['kyc', 'KYC'], ['whatsapp', 'WhatsApp'], ['calls', 'Calls']].map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={profileTab === k}
                    onClick={() => setProfileTab(k)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${profileTab === k ? 'border-[var(--accent)] text-[var(--ink)]' : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {profileTab === 'overview' && (
                <div className="p-5 space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[var(--bg)] border border-[var(--line)] p-4">
                      <div className="mx-eyebrow">Balance</div>
                      <div className="mx-num text-xl font-semibold text-[var(--ok)] mt-1.5">{fmtUSD(profileClient.balanceUSD)}</div>
                    </div>
                    <div className="rounded-xl bg-[var(--bg)] border border-[var(--line)] p-4">
                      <div className="mx-eyebrow">Bonus</div>
                      <div className="mx-num text-xl font-semibold text-[var(--warn)] mt-1.5">{fmtUSD(profileClient.bonusUSD)}</div>
                    </div>
                  </div>
                  {(() => {
                    const live = portfolio[profileClient.dbId];
                    const pos = live && Array.isArray(live.positions) ? live.positions : [];
                    const floating = live ? Number(live.floatingPnl) || 0 : 0;
                    return (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-[var(--bg)] border border-[var(--line)] p-4">
                            <div className="mx-eyebrow">Equity (live)</div>
                            <div className="mx-num text-xl font-semibold text-[var(--ink)] mt-1.5">{fmtUSD(equityOf(profileClient))}</div>
                          </div>
                          <div className="rounded-xl bg-[var(--bg)] border border-[var(--line)] p-4">
                            <div className="mx-eyebrow">Floating P&amp;L</div>
                            <div className={`mx-num text-xl font-semibold mt-1.5 ${pos.length ? pnlTone(floating) : 'text-[var(--muted)]'}`}>{pos.length ? fmtPnl(floating) : '—'}</div>
                          </div>
                        </div>
                        <div>
                          <div className="mx-eyebrow mb-2 flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5" /> Open positions ({pos.length})</div>
                          {pos.length === 0 ? (
                            <div className="text-xs text-[var(--muted)] rounded-xl border border-dashed border-[var(--line-strong)] p-3 text-center">No open positions</div>
                          ) : (
                            <ul className="divide-y divide-[var(--line)] rounded-xl border border-[var(--line)] bg-[var(--bg)]">
                              {pos.map((p) => (
                                <li key={p.id} className="flex items-center gap-3 px-3 py-2.5 text-xs">
                                  <span className={`mx-badge ${p.side === 'BUY' ? 'mx-b-ok' : 'mx-b-bad'} !py-0`}>{p.side}</span>
                                  <span className="text-[var(--ink)] font-medium">{p.symbol}</span>
                                  <span className="text-[var(--muted)] mx-num">{p.volume} lots @ {fmtPrice(p.openPrice)}</span>
                                  <span className={`ml-auto mx-num font-semibold ${pnlTone(p.pnl)}`}>{fmtPnl(p.pnl)}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </>
                    );
                  })()}
                  {profileClient.resetRequested && (
                    <div className="rounded-xl border border-[rgba(245,181,61,.4)] bg-[rgba(245,181,61,.07)] p-3.5 text-sm text-slate-700">
                      This client asked to reset their password. Verify who you are speaking to, then use <b>Reset password</b>.
                    </div>
                  )}
                  {resetResult && resetResult.clientId === profileClient.id && (
                    <div className="rounded-xl border border-[rgba(52,211,153,.4)] bg-[rgba(52,211,153,.07)] p-3.5 text-sm text-slate-700">
                      <div className="mx-eyebrow !text-[var(--ok)] mb-1">Password reset</div>
                      Temporary password: <span className="mx-num font-semibold text-[var(--ink)] select-all">{resetResult.password}</span>
                      <div className="text-xs text-[var(--muted)] mt-1">Give it to the client. They are asked to choose a new password the next time they sign in.</div>
                    </div>
                  )}
                  <dl className="divide-y divide-[var(--line)] text-sm">
                    {[
                      ['Email', profileClient.email],
                      ['Phone', <span key="p" className="inline-flex items-center gap-2"><span className="mx-num">{profileClient.phone}</span><PhoneActions phone={profileClient.phone} onCall={() => callClient(profileClient)} onWhatsApp={() => setProfileTab('whatsapp')} /></span>],
                      ['IP address', <span key="i" className="mx-num">{profileClient.ip}</span>],
                      ['Created', profileClient.createdAt],
                      ['Last contact', profileClient.lastContact]
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-4 py-3">
                        <dt className="text-[var(--muted)]">{k}</dt>
                        <dd className="text-[var(--ink)] text-right break-all">{v}</dd>
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-[var(--muted)]">Assigned agent</dt>
                      <dd>
                        {isAdmin ? (
                          <select
                            value={profileClient.assignedAgent || 'Unassigned'}
                            onChange={(e) => handleAssignAgent(profileClient.id, e.target.value)}
                            className="mx-field !py-1.5 !w-auto min-w-[150px]"
                            aria-label="Assigned agent"
                          >
                            <option value="Unassigned">Unassigned</option>
                            {agents.map((ag) => (
                              <option key={ag.id} value={ag.name}>{ag.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[var(--ink)]">{profileClient.assignedAgent || 'Unassigned'}</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}

              {profileTab === 'kyc' && (
                <div className="p-5">
                  <KycPanel client={profileClient} onReview={handleKycReview} onRetry={(c) => handleKycReview(c.id, c.kycStatus, c.kycNote)} onPreview={setDocPreview} />
                </div>
              )}

              {profileTab === 'whatsapp' && (
                <div className="h-full min-h-[480px]">
                  <ChatPane
                    key={profileClient.id}
                    client={profileClient}
                    messages={waThreads[profileClient.id] || []}
                    online={waOnline}
                    agentName={currentUser.name}
                    onSend={sendWhatsApp}
                    onRetry={retryWhatsApp}
                    onVoice={callClient}
                    onWaCall={startWhatsAppCall}
                  />
                </div>
              )}

              {profileTab === 'calls' && (
                <div className="p-5">
                  {(() => {
                    const logs = callLogs.filter((l) => l.clientId === profileClient.id);
                    return logs.length === 0 ? (
                      <EmptyState icon={Phone} title="No calls with this client yet" text="Use the Call button to start one from the dialer." />
                    ) : (
                      <ul className="divide-y divide-[var(--line)]">
                        {logs.map((l) => {
                          const m = CALL_STATUS_META[l.status] || { label: l.status, badge: 'mx-b-neutral' };
                          return (
                            <li key={l.id} className="py-3 flex items-center gap-3">
                              <PhoneOutgoing className="w-4 h-4 text-[var(--muted)]" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-[var(--ink)]">{l.channel === 'whatsapp' ? 'WhatsApp call' : 'VoIP call'} · <span className="mx-num">{l.channel === 'whatsapp' ? '—' : fmtDuration(l.duration)}</span></div>
                                <div className="text-xs text-[var(--muted)]">{fmtDateTime(l.ts)}{l.agent ? ` · ${l.agent}` : ''}</div>
                              </div>
                              <span className={`mx-badge ${m.badge}`}>{m.label}</span>
                            </li>
                          );
                        })}
                      </ul>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {/* Approve / reject confirmation: spells out exactly what happens to the balance */}
      {txReview && (() => {
        const { tx, decision } = txReview;
        const approve = decision === 'APPROVED';
        const live = clients.find((c) => c.dbId === tx.clientId);
        const bal = live ? Number(live.balanceUSD) || 0 : null;
        const after = bal === null ? null : tx.type === 'DEPOSIT' ? bal + tx.amount : bal - tx.amount;
        const blocked = approve && tx.type === 'WITHDRAWAL' && after !== null && after < -0.004;
        const dep = tx.type === 'DEPOSIT';
        return (
          <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-slate-900/50" role="alertdialog" aria-modal="true" aria-label={`${approve ? 'Approve' : 'Reject'} ${dep ? 'deposit' : 'withdrawal'}`}>
            <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={() => !txBusy && setTxReview(null)} />
            <div className="relative mx-card p-6 w-full max-w-md mx-in-up">
              <div className="flex items-start gap-3 mb-4">
                <div className={`p-2.5 rounded-xl border ${approve ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                  {approve ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--ink)]">
                    {approve ? 'Approve' : 'Reject'} {dep ? 'deposit' : 'withdrawal'} of {fmtUSD(tx.amount)}?
                  </h3>
                  <p className="text-sm text-[var(--muted)] mt-0.5">
                    {tx.clientName || `CL-${tx.clientId}`} · {tx.method || '—'}
                  </p>
                </div>
              </div>

              <div className={`rounded-xl border p-3.5 text-sm ${blocked ? 'border-rose-200 bg-rose-50' : approve ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                {approve ? (
                  <>
                    <div className="font-semibold text-[var(--ink)]">{dep ? `Credits ${fmtUSD(tx.amount)} to the client's balance` : `Deducts ${fmtUSD(tx.amount)} from the client's balance`}</div>
                    {bal !== null && (
                      <div className="mx-num mt-1.5 text-[13px]">
                        {fmtUSD(bal)} → <span className={`font-bold ${blocked ? 'text-[var(--bad)]' : 'text-[var(--ink)]'}`}>{fmtUSD(after)}</span>
                      </div>
                    )}
                    {blocked && <div className="text-xs text-[var(--bad)] font-semibold mt-1.5">The client's balance is lower than this withdrawal, so it cannot be approved. Reject it, or adjust the balance first.</div>}
                  </>
                ) : (
                  <div className="font-semibold text-[var(--ink)]">The balance stays unchanged and the client is told the request was rejected.</div>
                )}
              </div>

              {(tx.reference || tx.details) && (
                <dl className="mt-3 text-xs text-[var(--muted)] space-y-1">
                  {tx.reference && (
                    <div className="flex gap-2">
                      <dt className="shrink-0">Reference:</dt>
                      <dd className="mx-num break-all text-[var(--ink)]">{tx.reference}</dd>
                    </div>
                  )}
                  {tx.details && (
                    <div className="flex gap-2">
                      <dt className="shrink-0">Payout:</dt>
                      <dd className="break-words text-[var(--ink)]">{tx.details}</dd>
                    </div>
                  )}
                </dl>
              )}

              <label className="mx-label mt-4" htmlFor="tx-note">
                {approve ? 'Internal note (optional)' : 'Reason shown to the client (optional)'}
              </label>
              <input id="tx-note" className="mx-field" maxLength={300} placeholder={approve ? 'e.g. Payment confirmed on-chain' : 'e.g. Payment not received'} value={txNote} onChange={(e) => setTxNote(e.target.value)} />

              <div className="flex justify-end gap-2 mt-5">
                <button type="button" className="mx-btn" onClick={() => setTxReview(null)} disabled={txBusy}>
                  Cancel
                </button>
                <button type="button" className={`mx-btn ${approve ? 'mx-btn-primary' : 'mx-btn-bad'}`} onClick={confirmTxReview} disabled={txBusy || blocked}>
                  {txBusy ? 'Working…' : approve ? (dep ? 'Approve & credit' : 'Approve & deduct') : 'Reject request'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {deleteTarget && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-slate-900/50" role="alertdialog" aria-modal="true" aria-label="Confirm permanent deletion">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Cancel" onClick={() => !deleteBusy && setDeleteTarget(null)} />
          <div className="relative mx-card p-6 w-full max-w-md mx-in-up shadow-2xl shadow-slate-900/10">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[rgba(251,113,133,.12)] border border-[rgba(251,113,133,.35)]">
                <Trash2 className="w-5 h-5 text-[var(--bad)]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-[var(--ink)]">Permanently delete {deleteTarget.kind === 'client' ? 'client' : 'agent'}?</h3>
                <p className="text-sm text-[var(--muted)] mt-1">
                  <span className="text-[var(--ink)] font-medium">{deleteTarget.name}</span> will be removed for good. This cannot be undone.
                </p>
              </div>
            </div>
            <ul className="text-xs text-slate-600 mt-4 space-y-1.5 list-disc pl-5">
              {deleteTarget.kind === 'client' ? (
                <>
                  <li>Profile, login, balance and transaction history are erased.</li>
                  <li>KYC details and uploaded documents are erased from the server.</li>
                  <li>{deleteTarget.extra > 0 ? `${deleteTarget.extra} open position(s) are discarded without being settled.` : 'Open positions (if any) are discarded.'}</li>
                  <li>If they are signed in, they are logged out immediately.</li>
                </>
              ) : (
                <>
                  <li>The agent can no longer sign in and any active session ends.</li>
                  <li>{deleteTarget.extra > 0 ? `${deleteTarget.extra} assigned client(s) are kept and become Unassigned.` : 'No clients are assigned to this agent.'}</li>
                </>
              )}
            </ul>
            <label className="mx-label mt-5" htmlFor="del-confirm">Type <span className="text-[var(--ink)]">DELETE</span> to confirm</label>
            <input id="del-confirm" type="text" autoFocus autoComplete="off" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} className="mx-field" placeholder="DELETE" />
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" className="mx-btn" disabled={deleteBusy} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button type="button" className="mx-btn mx-btn-bad" disabled={deleteBusy || deleteConfirm.trim() !== 'DELETE'} onClick={confirmDelete}>
                <Trash2 className="w-4 h-4" /> {deleteBusy ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT LIGHTBOX */}
      {docPreview && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-10 bg-slate-900/70" role="dialog" aria-modal="true" aria-label="Document preview">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Close preview" onClick={() => setDocPreview(null)} />
          <div className="relative max-w-4xl w-full max-h-full flex flex-col mx-in-up">
            <div className="flex items-center justify-between mb-3 text-sm">
              <span className="text-white font-semibold drop-shadow">{docPreview.type}</span>
              <div className="flex gap-2">
                <a href={docPreview.url} target="_blank" rel="noopener noreferrer" className="mx-btn mx-btn-sm">
                  <ExternalLink className="w-3.5 h-3.5" /> Open original
                </a>
                <button type="button" className="mx-icon-btn" onClick={() => setDocPreview(null)} aria-label="Close preview">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <img src={docPreview.url} alt={docPreview.type} className="max-h-[78vh] w-auto mx-auto rounded-xl border border-[var(--line-strong)] object-contain bg-white" />
          </div>
        </div>
      )}

      {/* TOASTS */}
      <div className="fixed z-[90] top-[4.5rem] right-4 flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`mx-in-right flex gap-2.5 items-start rounded-xl border px-4 py-3 text-sm shadow-xl shadow-slate-900/10 backdrop-blur bg-white ${
              t.tone === 'bad' ? 'border-[rgba(251,113,133,.45)]' : t.tone === 'warn' ? 'border-[rgba(245,181,61,.45)]' : 'border-[rgba(52,211,153,.4)]'
            }`}
          >
            {t.tone === 'ok' ? <Check className="w-4 h-4 text-[var(--ok)] mt-0.5 shrink-0" /> : <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${t.tone === 'bad' ? 'text-[var(--bad)]' : 'text-[var(--warn)]'}`} />}
            <span className="text-[var(--ink)]">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
