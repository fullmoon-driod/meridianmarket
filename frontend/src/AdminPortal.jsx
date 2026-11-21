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
  Activity
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
  assignAgent: '/api/admin/assign-agent',
  createAgent: '/api/admin/create-agent',
  adjustBalance: '/api/admin/adjust-balance',
  // ---- NEW ----
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
        ? { id: `doc-${i}`, type: 'Document', url: safeUrl(d) }
        : {
            id: d.id ?? `doc-${i}`,
            type: d.type || d.doc_type || d.label || 'Document',
            name: d.name || d.filename || '',
            url: safeUrl(d.url || d.path || d.file_url),
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
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap');
.mx-root{--bg:#070a11;--panel:#0d121c;--raised:#131a27;--line:rgba(148,163,184,.12);--line-strong:rgba(148,163,184,.24);
  --text:#e8ecf4;--muted:#8d97ab;--faint:#5d6779;--accent:#7c9cff;--accent-ink:#0a1020;--ok:#34d399;--warn:#f5b53d;--bad:#fb7185;--wa:#25d366;
  font-family:'Geist',ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--text);
  background:radial-gradient(1100px 520px at 85% -8%,rgba(124,156,255,.09),transparent 60%),radial-gradient(800px 400px at -5% 110%,rgba(52,211,153,.05),transparent 60%),var(--bg);
  -webkit-font-smoothing:antialiased}
.mx-root *{scrollbar-width:thin;scrollbar-color:#263149 transparent}
.mx-root button{cursor:pointer}
.mx-num{font-family:'Geist Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}
.mx-card{background:linear-gradient(180deg,rgba(255,255,255,.028),rgba(255,255,255,.008)),var(--panel);border:1px solid var(--line);border-radius:16px}
.mx-field{width:100%;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:.6rem .8rem;font-size:.875rem;color:var(--text);outline:none;transition:border-color .15s,box-shadow .15s}
.mx-field::placeholder{color:var(--faint)}
.mx-field:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(124,156,255,.18)}
select.mx-field{padding-right:1.6rem}
.mx-label{display:block;font-size:.6875rem;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-bottom:.4rem}
.mx-eyebrow{font-size:.6875rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.mx-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;border-radius:10px;padding:.55rem .95rem;font-size:.8125rem;font-weight:600;border:1px solid var(--line-strong);background:var(--raised);color:var(--text);transition:all .15s;white-space:nowrap}
.mx-btn:hover:not(:disabled){border-color:rgba(148,163,184,.45);background:#19233a}
.mx-btn:disabled{opacity:.45;cursor:not-allowed}
.mx-btn:focus-visible,.mx-icon-btn:focus-visible,.mx-nav:focus-visible,.mx-key:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.mx-btn-primary{background:var(--accent);border-color:transparent;color:var(--accent-ink)}
.mx-btn-primary:hover:not(:disabled){background:#a0b7ff}
.mx-btn-ok{background:rgba(52,211,153,.14);border-color:rgba(52,211,153,.4);color:#6ee7b7}
.mx-btn-ok:hover:not(:disabled){background:rgba(52,211,153,.24);border-color:rgba(52,211,153,.6)}
.mx-btn-bad{background:rgba(251,113,133,.12);border-color:rgba(251,113,133,.4);color:#fda4af}
.mx-btn-bad:hover:not(:disabled){background:rgba(251,113,133,.22);border-color:rgba(251,113,133,.6)}
.mx-btn-sm{padding:.35rem .65rem;font-size:.75rem;border-radius:8px}
.mx-icon-btn{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border-radius:9px;border:1px solid var(--line);background:var(--raised);color:var(--muted);transition:.15s;flex-shrink:0}
.mx-icon-btn:hover:not(:disabled){color:var(--text);border-color:var(--line-strong)}
.mx-icon-btn:disabled{opacity:.35;cursor:not-allowed}
.mx-icon-btn.call:hover:not(:disabled){color:var(--ok);border-color:rgba(52,211,153,.45);background:rgba(52,211,153,.1)}
.mx-icon-btn.wa:hover:not(:disabled){color:var(--wa);border-color:rgba(37,211,102,.45);background:rgba(37,211,102,.1)}
.mx-icon-btn.ok{color:var(--ok);border-color:rgba(52,211,153,.35)}
.mx-icon-btn.bad{color:var(--bad);border-color:rgba(251,113,133,.35)}
.mx-badge{display:inline-flex;align-items:center;gap:.3rem;border-radius:999px;padding:.15rem .6rem;font-size:.6875rem;font-weight:600;border:1px solid transparent;white-space:nowrap}
.mx-b-warn{color:var(--warn);background:rgba(245,181,61,.1);border-color:rgba(245,181,61,.28)}
.mx-b-ok{color:var(--ok);background:rgba(52,211,153,.1);border-color:rgba(52,211,153,.28)}
.mx-b-bad{color:var(--bad);background:rgba(251,113,133,.1);border-color:rgba(251,113,133,.28)}
.mx-b-accent{color:#b3c4ff;background:rgba(124,156,255,.12);border-color:rgba(124,156,255,.3)}
.mx-b-neutral{color:var(--muted);background:rgba(148,163,184,.08);border-color:var(--line)}
.mx-nav{display:flex;align-items:center;gap:.7rem;width:100%;padding:.6rem .75rem;border-radius:10px;font-size:.875rem;font-weight:500;color:var(--muted);border:1px solid transparent;background:transparent;transition:.15s;text-align:left}
.mx-nav:hover{color:var(--text);background:rgba(255,255,255,.04)}
.mx-nav.active{color:#d4deff;background:rgba(124,156,255,.12);border-color:rgba(124,156,255,.22)}
.mx-nav-count{margin-left:auto;font-size:.6875rem;font-weight:600;padding:.05rem .45rem;border-radius:999px;background:rgba(148,163,184,.12);color:var(--muted)}
.mx-nav-count.warn{background:rgba(245,181,61,.16);color:var(--warn)}
.mx-th{padding:.75rem 1.25rem;font-size:.6875rem;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);text-align:left;white-space:nowrap}
.mx-td{padding:.9rem 1.25rem;vertical-align:middle}
.mx-row{transition:background .12s}
.mx-row:hover{background:rgba(255,255,255,.028)}
.mx-chip{border:1px solid var(--line);background:transparent;color:var(--muted);border-radius:999px;padding:.3rem .8rem;font-size:.75rem;font-weight:600;transition:.15s;display:inline-flex;gap:.4rem;align-items:center}
.mx-chip:hover{color:var(--text);border-color:var(--line-strong)}
.mx-chip.on{background:rgba(124,156,255,.14);border-color:rgba(124,156,255,.4);color:#cbd8ff}
.mx-key{height:56px;border-radius:14px;background:var(--raised);border:1px solid var(--line);color:var(--text);font-size:1.25rem;font-weight:500;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1;transition:.1s}
.mx-key:hover{background:#1b2640;border-color:var(--line-strong)}
.mx-key:active{transform:scale(.96)}
.mx-key small{font-size:.5625rem;letter-spacing:.14em;color:var(--faint);margin-top:3px;font-weight:600;height:9px}
.mx-bubble-out{background:rgba(37,211,102,.14);border:1px solid rgba(37,211,102,.28);border-radius:14px 14px 4px 14px}
.mx-bubble-in{background:var(--raised);border:1px solid var(--line);border-radius:14px 14px 14px 4px}
.mx-divider{height:1px;background:var(--line)}
@keyframes mx-pulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes mx-ring{0%{box-shadow:0 0 0 0 rgba(52,211,153,.5)}100%{box-shadow:0 0 0 14px rgba(52,211,153,0)}}
@keyframes mx-in-right{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}
@keyframes mx-in-up{from{transform:translateY(10px);opacity:0}to{transform:none;opacity:1}}
.mx-pulse{animation:mx-pulse 1.4s ease-in-out infinite}
.mx-ring{animation:mx-ring 1.4s ease-out infinite}
.mx-in-right{animation:mx-in-right .22s ease-out}
.mx-in-up{animation:mx-in-up .2s ease-out}
@media (prefers-reduced-motion:reduce){.mx-pulse,.mx-ring,.mx-in-right,.mx-in-up{animation:none}}
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
        background: `hsl(${h} 38% 22%)`,
        color: `hsl(${h} 75% 82%)`,
        border: `1px solid hsl(${h} 40% 34%)`
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

function StatCard({ label, value, tone = 'text-white', hint, children }) {
  return (
    <div className="mx-card p-5">
      <div className="mx-eyebrow">{label}</div>
      <div className={`mx-num text-[1.65rem] font-semibold mt-2 leading-none ${tone}`}>{value}</div>
      {hint && <div className="text-xs text-[var(--muted)] mt-2">{hint}</div>}
      {children}
    </div>
  );
}

function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
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
      <div className="text-sm font-medium text-white">{title}</div>
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
              Reviewed by <span className="text-white">{client.kycReviewedBy}</span>
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
          <p className="text-sm text-slate-200 whitespace-pre-wrap">{client.kycNote}</p>
        </div>
      )}

      <div>
        <div className="mx-eyebrow mb-3">Submitted documents ({docs.length})</div>
        {docs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line-strong)] p-6 text-center">
            <FileText className="w-5 h-5 text-[var(--muted)] mx-auto mb-2" />
            <div className="text-sm text-white">No documents attached to this record</div>
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
                  <div className="px-3 py-2 text-xs font-medium text-white truncate">{d.type}</div>
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
                  <span className="text-xs font-medium text-white truncate max-w-full">{d.type}</span>
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
          <div className="text-sm font-semibold text-white truncate">{client.name}</div>
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
                <p className="text-sm text-slate-100 whitespace-pre-wrap break-words">{m.text}</p>
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
            <div className="text-sm font-semibold text-white leading-none">Fonitel Dialer</div>
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
            className="mx-num w-full bg-transparent text-xl font-medium text-white outline-none placeholder:text-[var(--faint)]"
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
  const [currentUser, setCurrentUser] = useState(() => loadJSON('meridian_crm_auth', null));
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
      const res = await fetch(API.agents);
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    const cleanedEmail = loginEmail.trim().toLowerCase();

    // Primary Master Admin Credentials
    if (cleanedEmail === 'klaus@meridianmarket.net' && loginPassword === 'Wizzy01@') {
      const user = { name: 'Klaus Admin', email: cleanedEmail, role: 'ADMIN', agentId: 'ADMIN_01' };
      setCurrentUser(user);
      localStorage.setItem('meridian_crm_auth', JSON.stringify(user));
      return;
    }

    // Check local agents (Fallback)
    const matchedAgent = agents.find(
      (ag) => ag.email && ag.email.trim().toLowerCase() === cleanedEmail && ag.password === loginPassword
    );
    if (matchedAgent) {
      const user = { name: matchedAgent.name, email: matchedAgent.email, role: 'AGENT', agentId: matchedAgent.name.trim() };
      setCurrentUser(user);
      localStorage.setItem('meridian_crm_auth', JSON.stringify(user));
      return;
    }

    // Backend Agent Authentication Check
    try {
      const res = await fetch(API.agentLogin, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ email: cleanedEmail, password: loginPassword })
      });
      if (res.ok) {
        const data = await res.json();
        const agentData = data.agent || data;
        const user = { name: agentData.name, email: agentData.email, role: 'AGENT', agentId: agentData.name.trim() };
        setCurrentUser(user);
        localStorage.setItem('meridian_crm_auth', JSON.stringify(user));
        return;
      }
    } catch (err) {
      console.warn('Backend authentication failed, checking local credentials.', err);
    }

    setLoginError('Invalid credentials. Check email and password.');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('meridian_crm_auth');
    setProfileClientId('');
    setNavOpen(false);
  };

  // -------------------------------------------------------------
  // 2. STATE & SEARCH & PERSISTENCE
  // -------------------------------------------------------------
  const [activeCrmTab, setActiveCrmTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [kycFilter, setKycFilter] = useState('ALL');
  const [navOpen, setNavOpen] = useState(false);

  const [clients, setClients] = useState(() => {
    const saved = loadJSON('meridian_crm_clients', []);
    // Normalise legacy persisted records (VERIFIED → APPROVED)
    return Array.isArray(saved) ? saved.map((c) => ({ ...c, kycStatus: normalizeKyc(c.kycStatus), kycDocs: c.kycDocs || [] })) : [];
  });
  useEffect(() => {
    localStorage.setItem('meridian_crm_clients', JSON.stringify(clients));
  }, [clients]);

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

  // Client profile drawer / document lightbox
  const [profileClientId, setProfileClientId] = useState('');
  const [profileTab, setProfileTab] = useState('overview');
  const [docPreview, setDocPreview] = useState(null);
  const [kycSelectedId, setKycSelectedId] = useState('');

  // -------------------------------------------------------------
  // 3. LIVE BACKEND FETCHING (MERGED TO PREVENT OVERWRITE)
  // -------------------------------------------------------------
  const fetchClients = useCallback(async () => {
    try {
      const response = await fetch(API.clients);
      if (response.ok) {
        const data = await response.json();
        const rawClients = data.clients || data;
        if (Array.isArray(rawClients)) {
          setClients((prevClients) => {
            const prevClientMap = new Map(prevClients.map((c) => [c.id, c]));
            return rawClients.map((c) => {
              const formattedId = `CL-${c.id}`;
              const existing = prevClientMap.get(formattedId);
              const resolvedAgent = (c.agent_name || 'Unassigned').trim();
              const fromServer = {
                kycStatus: normalizeKyc(c.kycStatus || c.kyc_status),
                kycNote: c.kyc_note || c.kycNote || c.kyc_rejection_note || '',
                kycReviewedBy: c.kyc_reviewed_by || c.kycReviewedBy || '',
                kycReviewedAt: c.kyc_reviewed_at || c.kycReviewedAt || '',
                kycUnsynced: false
              };
              // A review the server has not confirmed yet is kept until it syncs.
              const kycState = existing?.kycUnsynced
                ? {
                    kycStatus: existing.kycStatus,
                    kycNote: existing.kycNote,
                    kycReviewedBy: existing.kycReviewedBy,
                    kycReviewedAt: existing.kycReviewedAt,
                    kycUnsynced: true
                  }
                : fromServer;
              return {
                id: formattedId,
                dbId: c.id,
                name: c.full_name || c.name || 'Unknown',
                email: c.email || 'N/A',
                phone: c.phone || c.phone_number || 'N/A',
                ip: c.ip_address || c.ip || '127.0.0.1',
                assignedAgent: resolvedAgent,
                agent_id: c.agent_id || null,
                ...kycState,
                kycDocs: normalizeDocs(c),
                stage: c.stage || 'NEW_LEAD',
                balanceUSD: existing?.balanceUSD ?? (typeof c.balanceUSD === 'number' ? c.balanceUSD : parseFloat(c.balanceUSD || c.balance || 0)),
                bonusUSD: existing?.bonusUSD ?? (typeof c.bonusUSD === 'number' ? c.bonusUSD : parseFloat(c.bonusUSD || c.bonus || 0)),
                isOnline: c.isOnline !== undefined ? c.isOnline : true,
                callNotes: c.callNotes || [],
                createdAt: c.createdAt || new Date().toISOString().split('T')[0],
                lastContact: c.lastContact || new Date().toISOString().split('T')[0]
              };
            });
          });
        }
      }
    } catch (err) {
      console.warn('Backend unavailable, using persistent client state.', err);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchClients();
      const interval = setInterval(() => {
        fetchClients();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [currentUser, fetchClients]);

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
    const review = {
      kycStatus: status,
      kycNote: cleanNote,
      kycReviewedBy: currentUser.name,
      kycReviewedAt: new Date().toISOString()
    };
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, ...review, kycUnsynced: true } : c)));

    let synced = false;
    try {
      const res = await fetch(API.kycReview, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          clientId: target.dbId || clientId.replace('CL-', ''),
          status,
          note: cleanNote,
          reviewedBy: currentUser.name
        })
      });
      synced = res.ok;
    } catch (err) {
      console.warn('KYC review sync failed.', err);
    }

    if (synced) {
      setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, kycUnsynced: false } : c)));
      await fetchClients();
      toast(`KYC ${status === 'APPROVED' ? 'approved' : 'rejected'} for ${target.name}.`, status === 'APPROVED' ? 'ok' : 'warn');
    } else {
      toast('Decision saved in this session, but the server did not confirm it. Use “retry” to sync.', 'warn');
    }
    addAuditLog(`KYC_${status}`, `${status === 'APPROVED' ? 'Approved' : 'Rejected'} KYC for ${target.name} (${clientId})${cleanNote ? ` — ${cleanNote}` : ''}`);
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

    // Optimistic UI update
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, assignedAgent: selectedAgentValue } : c)));

    try {
      const res = await fetch(API.assignAgent, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          clientId: targetClient?.dbId || clientId.replace('CL-', ''),
          assignedAgent: selectedAgentValue
        })
      });
      if (res.ok) {
        await fetchClients();
      } else {
        console.error('Assignment error from server');
      }
    } catch (err) {
      console.warn('Backend sync failed for agent assignment.', err);
    }
    addAuditLog('AGENT_REASSIGN', `Assigned client ${clientId} to ${selectedAgentValue}`);
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
      const res = await fetch(API.createAgent, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(agentObj)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.agents) setAgents(data.agents);
        await fetchBackendAgents();
      }
    } catch (err) {
      console.warn('Backend sync unavailable for agent creation.', err);
    }
    addAuditLog('AGENT_CREATED', `Created new agent ${newAgentName} (${newAgentEmail})`);
    setNewAgentName('');
    setNewAgentEmail('');
    setNewAgentPassword('');
    toast(`Agent ${agentObj.name} successfully created.`);
  };

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

    setClients((prevClients) =>
      prevClients.map((client) => {
        if (client.id === selectedClientId) {
          const currentBal = parseFloat(client.balanceUSD || 0);
          const currentBonus = parseFloat(client.bonusUSD || 0);

          if (adjustmentType === 'BONUS') {
            return { ...client, bonusUSD: currentBonus + amt };
          } else if (adjustmentType === 'ADD') {
            return { ...client, balanceUSD: currentBal + amt };
          } else if (adjustmentType === 'MINUS') {
            return { ...client, balanceUSD: Math.max(0, currentBal - amt) };
          }
        }
        return client;
      })
    );

    try {
      await fetch(API.adjustBalance, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          clientId: targetClient.dbId || targetClient.id.replace('CL-', ''),
          adjustmentType,
          amount: amt
        })
      });
      await fetchClients();
    } catch (err) {
      console.warn('Server sync unavailable, performing direct state balance adjustment.', err);
    }
    addAuditLog('BALANCE_ADJUSTED', `Applied ${adjustmentType} of $${amt.toFixed(2)} to ${targetClient.name}`);
    setAdjustmentAmount('');
    toast(`Successfully applied ${adjustmentType} of $${amt.toFixed(2)} to ${targetClient.name}.`);
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
          <div className="mx-card p-8 sm:p-10 shadow-2xl shadow-black/50">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="p-3.5 rounded-2xl bg-[rgba(124,156,255,.12)] border border-[rgba(124,156,255,.3)] mb-5">
                <Shield className="w-7 h-7 text-[var(--accent)]" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-white">Meridian Market CRM</h1>
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
  const navGroups = [
    {
      label: 'Workspace',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'clients', label: 'Clients', icon: Users, count: scopedClients.length },
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
    kyc: 'KYC Center',
    whatsapp: 'WhatsApp',
    dialer: 'Dialer',
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
        <div className="p-2 rounded-xl bg-[rgba(124,156,255,.12)] border border-[rgba(124,156,255,.3)]">
          <Shield className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <div>
          <div className="text-[15px] font-semibold tracking-tight text-white leading-none">Meridian</div>
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
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[rgba(255,255,255,.025)] border border-[var(--line)]">
          <Avatar name={currentUser.name} size={34} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-white truncate">{currentUser.name}</div>
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
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-[rgba(7,10,17,.7)] backdrop-blur border-r border-[var(--line)] z-30">
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      {navOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-72 max-w-[85vw] bg-[var(--panel)] border-r border-[var(--line)] mx-in-right">{sidebar}</div>
          <button type="button" aria-label="Close menu" className="flex-1 bg-black/60" onClick={() => setNavOpen(false)} />
        </div>
      )}

      <div className="lg:pl-64 min-h-screen flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-[rgba(7,10,17,.8)] backdrop-blur border-b border-[var(--line)] px-4 sm:px-8 h-16 flex items-center gap-3">
          <div className="lg:hidden">
            <button type="button" className="mx-icon-btn" onClick={() => setNavOpen(true)} aria-label="Open menu">
              <Menu className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-[var(--muted)] hidden sm:inline">Meridian</span>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--faint)] hidden sm:inline" />
            <span className="font-medium text-white truncate">{pageTitles[activeCrmTab]}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
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

        <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 sm:p-8">
          {/* DASHBOARD TAB */}
          {activeCrmTab === 'dashboard' && (
            <div className="space-y-6 mx-in-up">
              <PageHeader
                title={`Welcome back, ${currentUser.name.split(' ')[0]}`}
                subtitle={isAdmin ? 'Firm-wide overview of clients, compliance and communications.' : 'Overview of the accounts assigned to you.'}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard label="Real Client Accounts" value={metrics.totalClients} hint={`${kycCounts.PENDING} awaiting KYC review`} />
                <StatCard label="Total Portfolio Capital" value={fmtUSD(metrics.totalBal)} tone="text-[var(--ok)]" />
                <StatCard label="Allocated Credit Bonuses" value={fmtUSD(metrics.totalBonus)} tone="text-[var(--warn)]" />
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
                      <h3 className="text-sm font-semibold text-white">KYC queue</h3>
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
                        <span><span className="inline-block w-2 h-2 rounded-full bg-[var(--ok)] mr-1.5" />Approved <b className="mx-num text-white">{kycCounts.APPROVED}</b></span>
                        <span><span className="inline-block w-2 h-2 rounded-full bg-[var(--warn)] mr-1.5" />Pending <b className="mx-num text-white">{kycCounts.PENDING}</b></span>
                        <span><span className="inline-block w-2 h-2 rounded-full bg-[var(--bad)] mr-1.5" />Rejected <b className="mx-num text-white">{kycCounts.REJECTED}</b></span>
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
                            <div className="text-sm font-medium text-white truncate">{c.name}</div>
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
                  <h3 className="text-sm font-semibold text-white mb-1">Pipeline stages</h3>
                  <p className="text-xs text-[var(--muted)] mb-5">Clients by current stage</p>
                  {stageCounts.length === 0 ? (
                    <EmptyState title="No clients yet" />
                  ) : (
                    <div className="space-y-3.5">
                      {stageCounts.map(({ stage, n }) => (
                        <div key={stage}>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-slate-300">{prettyStage(stage)}</span>
                            <span className="mx-num text-white">{n}</span>
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
                  <h3 className="text-sm font-semibold text-white mb-1">Today's calls</h3>
                  <p className="text-xs text-[var(--muted)] mb-5">Voice activity from the Fonitel dialer</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[['Calls', callStats.today], ['Talk time', fmtDuration(callStats.talk)], ['Answered', `${callStats.rate}%`]].map(([l, v]) => (
                      <div key={l} className="rounded-xl bg-[var(--bg)] border border-[var(--line)] py-3">
                        <div className="mx-num text-lg font-semibold text-white">{v}</div>
                        <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mt-1">{l}</div>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="mx-btn w-full mt-4" onClick={() => goTab('dialer')}>
                    <PhoneCall className="w-4 h-4" /> Open dialer
                  </button>
                </div>
                <div className="mx-card p-6 xl:col-span-2">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[var(--accent)]" /> Recent activity
                  </h3>
                  <div className="divide-y divide-[var(--line)]">
                    {recentActivity.map((l) => (
                      <div key={l.id} className="py-2.5 flex items-start gap-3">
                        <span className="mx-badge mx-b-neutral mx-num !text-[10px] mt-0.5">{l.action}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-slate-200 truncate">{l.details}</div>
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
                      <tr className="border-b border-[var(--line)] bg-[rgba(255,255,255,.02)]">
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
                                  <div className="font-semibold text-white">{client.name}</div>
                                  <div className="text-xs text-[var(--muted)]">{client.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="mx-td">
                              <div className="flex items-center gap-2.5">
                                <div>
                                  <div className="mx-num text-white text-[13px]">{client.phone}</div>
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
                                <span className="text-slate-300">{client.assignedAgent || 'Unassigned'}</span>
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
                            className={`w-full text-left flex items-center gap-3 px-4 py-3.5 mx-row ${kycSelected?.id === c.id ? 'bg-[rgba(124,156,255,.09)]' : ''}`}
                            aria-current={kycSelected?.id === c.id}
                          >
                            <Avatar name={c.name} size={38} />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-white truncate">{c.name}</div>
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
                          <div className="text-base font-semibold text-white truncate">{kycSelected.name}</div>
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
                              <span className="text-sm font-medium text-white truncate">{c.name}</span>
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
                      <h3 className="text-sm font-semibold text-white">Call logs</h3>
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
                                        <div className="text-white font-medium">{l.clientName || l.number}</div>
                                        {l.clientName && <div className="mx-num text-[11px] text-[var(--muted)]">{l.number}</div>}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="mx-td">
                                    <span className={`mx-badge ${l.channel === 'whatsapp' ? 'mx-b-ok' : 'mx-b-neutral'}`}>{l.channel === 'whatsapp' ? 'WhatsApp' : 'VoIP'}</span>
                                  </td>
                                  <td className="mx-td"><span className={`mx-badge ${m.badge}`}>{m.label}</span></td>
                                  <td className="mx-td mx-num text-slate-300">{l.channel === 'whatsapp' ? '—' : fmtDuration(l.duration)}</td>
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
          {activeCrmTab === 'agents' && isAdmin && (
            <div className="mx-in-up">
              <PageHeader title="Manage Agents" subtitle="Create agent logins and see who is on your team." />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Create Agent Form */}
                <div className="mx-card p-6 self-start">
                  <h3 className="text-sm font-semibold text-white pb-4 mb-4 border-b border-[var(--line)] flex items-center gap-2">
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
                  <h3 className="text-sm font-semibold text-white pb-4 mb-4 border-b border-[var(--line)]">Registered Agents ({agents.length})</h3>
                  {agents.length === 0 ? (
                    <EmptyState icon={UserCheck} title="No custom agents created yet" />
                  ) : (
                    <div className="space-y-3">
                      {agents.map((ag) => (
                        <div key={ag.id} className="flex items-center gap-3 p-3.5 bg-[var(--bg)] border border-[var(--line)] rounded-xl">
                          <Avatar name={ag.name} />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-white">{ag.name}</div>
                            <div className="text-xs text-[var(--muted)] flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3 h-3" />
                              {ag.email}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="mx-num text-sm text-white">{clients.filter((c) => (c.assignedAgent || '').trim().toLowerCase() === (ag.name || '').trim().toLowerCase()).length}</div>
                            <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">clients</div>
                          </div>
                          <span className="mx-num text-[11px] text-[var(--faint)] hidden sm:block">ID: {ag.id}</span>
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
                  <h3 className="text-sm font-semibold text-white pb-4 mb-4 border-b border-[var(--line)]">Manual Balance Adjustment</h3>
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
                          ['ADD', '+ Add', 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300'],
                          ['MINUS', '- Deduct', 'bg-rose-500/15 border-rose-500/60 text-rose-300'],
                          ['BONUS', '+ Bonus', 'bg-amber-500/15 border-amber-500/60 text-amber-300']
                        ].map(([k, l, on]) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => setAdjustmentType(k)}
                            aria-pressed={adjustmentType === k}
                            className={`py-2.5 rounded-xl text-sm font-semibold border transition ${adjustmentType === k ? on : 'bg-[var(--bg)] border-[var(--line)] text-[var(--muted)] hover:text-white'}`}
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
                          <div className="font-semibold text-white truncate">{financialTarget.name}</div>
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
        <div className="fixed z-[70] bottom-4 left-4 lg:left-[17rem] w-[calc(100vw-2rem)] max-w-[340px] mx-in-up shadow-2xl shadow-black/60">
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
          <button type="button" aria-label="Close profile" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={() => setProfileClientId('')} />
          <div className="relative w-full max-w-xl bg-[var(--panel)] border-l border-[var(--line-strong)] flex flex-col mx-in-right shadow-2xl">
            <div className="p-5 border-b border-[var(--line)]">
              <div className="flex items-start gap-3">
                <Avatar name={profileClient.name} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-semibold text-white truncate">{profileClient.name}</div>
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
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${profileTab === k ? 'border-[var(--accent)] text-white' : 'border-transparent text-[var(--muted)] hover:text-white'}`}
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
                        <dd className="text-white text-right break-all">{v}</dd>
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
                          <span className="text-white">{profileClient.assignedAgent || 'Unassigned'}</span>
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
                                <div className="text-sm text-white">{l.channel === 'whatsapp' ? 'WhatsApp call' : 'VoIP call'} · <span className="mx-num">{l.channel === 'whatsapp' ? '—' : fmtDuration(l.duration)}</span></div>
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

      {/* DOCUMENT LIGHTBOX */}
      {docPreview && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-10 bg-black/85" role="dialog" aria-modal="true" aria-label="Document preview">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Close preview" onClick={() => setDocPreview(null)} />
          <div className="relative max-w-4xl w-full max-h-full flex flex-col mx-in-up">
            <div className="flex items-center justify-between mb-3 text-sm">
              <span className="text-white font-medium">{docPreview.type}</span>
              <div className="flex gap-2">
                <a href={docPreview.url} target="_blank" rel="noopener noreferrer" className="mx-btn mx-btn-sm">
                  <ExternalLink className="w-3.5 h-3.5" /> Open original
                </a>
                <button type="button" className="mx-icon-btn" onClick={() => setDocPreview(null)} aria-label="Close preview">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <img src={docPreview.url} alt={docPreview.type} className="max-h-[78vh] w-auto mx-auto rounded-xl border border-[var(--line-strong)] object-contain bg-black" />
          </div>
        </div>
      )}

      {/* TOASTS */}
      <div className="fixed z-[90] top-4 right-4 flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`mx-in-right flex gap-2.5 items-start rounded-xl border px-4 py-3 text-sm shadow-xl shadow-black/40 backdrop-blur bg-[rgba(13,18,28,.95)] ${
              t.tone === 'bad' ? 'border-[rgba(251,113,133,.45)]' : t.tone === 'warn' ? 'border-[rgba(245,181,61,.45)]' : 'border-[rgba(52,211,153,.4)]'
            }`}
          >
            {t.tone === 'ok' ? <Check className="w-4 h-4 text-[var(--ok)] mt-0.5 shrink-0" /> : <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${t.tone === 'bad' ? 'text-[var(--bad)]' : 'text-[var(--warn)]'}`} />}
            <span className="text-slate-100">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
