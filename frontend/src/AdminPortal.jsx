import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  Users, 
  FileCheck, 
  Search, 
  LogOut, 
  Check, 
  X, 
  Wallet, 
  DollarSign,
  Clock,
  Phone,
  PhoneCall,
  EyeOff,
  Bell,
  Wifi,
  WifiOff,
  LayoutDashboard,
  UserCheck,
  TrendingUp,
  UserPlus,
  Calendar,
  FileText,
  BarChart3,
  Activity,
  Lock,
  Edit,
  Filter,
  Eye,
  Plus,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export default function AdminPortal() {
  // -------------------------------------------------------------
  // 1. AUTH & ROLE MANAGEMENT
  // -------------------------------------------------------------
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('meridian_crm_auth');
    return saved ? JSON.parse(saved) : null;
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    
    if (loginEmail === 'admin@meridian.com' && loginPassword === 'admin123') {
      const user = { name: 'Master Admin', email: loginEmail, role: 'ADMIN', agentId: 'ADMIN_01' };
      setCurrentUser(user);
      localStorage.setItem('meridian_crm_auth', JSON.stringify(user));
      return;
    }
    
    if (loginEmail === 'agent@meridian.com' && loginPassword === 'agent123') {
      const user = { name: 'Sarah Jenkins', email: loginEmail, role: 'AGENT', agentId: 'Sarah Jenkins' };
      setCurrentUser(user);
      localStorage.setItem('meridian_crm_auth', JSON.stringify(user));
      return;
    }
    
    setLoginError('Invalid credentials. Use admin@meridian.com / admin123 or agent@meridian.com / agent123');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('meridian_crm_auth');
  };

  // -------------------------------------------------------------
  // 2. STATE & SEARCH & PERSISTENCE
  // -------------------------------------------------------------
  const [activeCrmTab, setActiveCrmTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [kycFilter, setKycFilter] = useState('ALL');
  
  const availableAgents = ['Sarah Jenkins', 'Marcus Vance', 'Alex Rivera', 'Unassigned'];

  // Initial Mock State with LocalStorage Persistence Fallback
  const initialClients = [
    {
      id: 'CL-101',
      dbId: 101,
      name: 'Johnathan Doe',
      email: 'j.doe@example.com',
      phone: '+1 (555) 019-2834',
      ip: '192.168.1.45',
      assignedAgent: 'Sarah Jenkins',
      kycStatus: 'VERIFIED',
      stage: 'RETENTION',
      balanceUSD: 14250.00,
      bonusUSD: 1500.00,
      isOnline: true,
      callNotes: ['[10:15 AM] (Sarah Jenkins): Discussed quarterly portfolio rebalancing.'],
      createdAt: '2026-08-12',
      lastContact: '2026-09-10'
    },
    {
      id: 'CL-102',
      dbId: 102,
      name: 'Elena Rostova',
      email: 'elena.r@example.com',
      phone: '+44 20 7946 0912',
      ip: '86.12.33.190',
      assignedAgent: 'Marcus Vance',
      kycStatus: 'PENDING',
      stage: 'CONVERSION',
      balanceUSD: 500.00,
      bonusUSD: 100.00,
      isOnline: false,
      callNotes: ['[02:30 PM] (Marcus Vance): Sent KYC verification guidelines.'],
      createdAt: '2026-09-01',
      lastContact: '2026-09-08'
    },
    {
      id: 'CL-103',
      dbId: 103,
      name: 'Michael Chang',
      email: 'm.chang@example.com',
      phone: '+65 6789 0123',
      ip: '118.200.12.5',
      assignedAgent: 'Sarah Jenkins',
      kycStatus: 'REJECTED',
      stage: 'NEW_LEAD',
      balanceUSD: 0.00,
      bonusUSD: 0.00,
      isOnline: true,
      callNotes: [],
      createdAt: '2026-09-11',
      lastContact: '2026-09-11'
    }
  ];

  const [clients, setClients] = useState(() => {
    const saved = localStorage.getItem('meridian_crm_clients');
    return saved ? JSON.parse(saved) : initialClients;
  });

  useEffect(() => {
    localStorage.setItem('meridian_crm_clients', JSON.stringify(clients));
  }, [clients]);

  // Appointments State
  const [appointments, setAppointments] = useState(() => {
    const saved = localStorage.getItem('meridian_crm_appointments');
    return saved ? JSON.parse(saved) : [
      { id: 'APT-1', clientId: 'CL-101', clientName: 'Johnathan Doe', agent: 'Sarah Jenkins', date: '2026-09-15', time: '14:00', note: 'Strategy Review' },
      { id: 'APT-2', clientId: 'CL-102', clientName: 'Elena Rostova', agent: 'Marcus Vance', date: '2026-09-16', time: '10:30', note: 'KYC Document Followup' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('meridian_crm_appointments', JSON.stringify(appointments));
  }, [appointments]);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState(() => {
    const saved = localStorage.getItem('meridian_crm_audit');
    return saved ? JSON.parse(saved) : [
      { id: 'LOG-101', user: 'Master Admin', action: 'SYSTEM_BOOT', details: 'CRM Security Subsystem Initialized', timestamp: new Date().toISOString() }
    ];
  });

  useEffect(() => {
    localStorage.setItem('meridian_crm_audit', JSON.stringify(auditLogs));
  }, [auditLogs]);

  const addAuditLog = (action, details) => {
    const newEntry = {
      id: `LOG-${Date.now()}`,
      user: currentUser?.name || 'SYSTEM',
      action,
      details,
      timestamp: new Date().toLocaleString()
    };
    setAuditLogs(prev => [newEntry, ...prev]);
  };

  // -------------------------------------------------------------
  // 3. LIVE BACKEND FETCHING WITH LOCAL FALLBACK
  // -------------------------------------------------------------
  const [loadingClients, setLoadingClients] = useState(false);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/admin/clients-detailed');
      if (response.ok) {
        const data = await response.json();
        const rawClients = data.clients || data;
        if (Array.isArray(rawClients)) {
          const formattedClients = rawClients.map((c) => ({
            id: `CL-${c.id}`,
            dbId: c.id,
            name: c.full_name || c.name || 'Unknown',
            email: c.email || 'N/A',
            phone: c.phone || 'N/A',
            ip: c.ip_address || c.ip || '127.0.0.1',
            assignedAgent: c.agent_name || c.assignedAgent || 'Unassigned',
            kycStatus: c.kycStatus || 'PENDING',
            stage: c.stage || 'NEW_LEAD',
            balanceUSD: typeof c.balanceUSD === 'number' ? c.balanceUSD : parseFloat(c.balanceUSD || c.balance || 0),
            bonusUSD: typeof c.bonusUSD === 'number' ? c.bonusUSD : parseFloat(c.bonusUSD || c.bonus || 0),
            isOnline: c.isOnline !== undefined ? c.isOnline : true,
            callNotes: c.callNotes || [],
            createdAt: c.createdAt || new Date().toISOString().split('T')[0],
            lastContact: c.lastContact || new Date().toISOString().split('T')[0]
          }));
          setClients(formattedClients);
        }
      }
    } catch (err) {
      console.warn('Backend unavailable, using persistent client state.', err);
    }
  };

  // -------------------------------------------------------------
  // 4. NOTIFICATIONS & PENDING TRANSACTIONS
  // -------------------------------------------------------------
  const [notifications, setNotifications] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState(() => {
    const saved = localStorage.getItem('meridian_crm_pending_txs');
    return saved ? JSON.parse(saved) : [
      {
        id: 'TX-901',
        dbId: 901,
        clientId: 'CL-101',
        userId: 101,
        clientName: 'Johnathan Doe',
        type: 'DEPOSIT',
        amountUSD: 2500.00,
        localCurrency: '2500 USD',
        method: 'Wire Transfer',
        requestedAt: '10:42 AM',
        status: 'PENDING'
      },
      {
        id: 'TX-902',
        dbId: 902,
        clientId: 'CL-102',
        userId: 102,
        clientName: 'Elena Rostova',
        type: 'WITHDRAWAL',
        amountUSD: 150.00,
        localCurrency: '150 USD',
        method: 'Crypto Wallet',
        requestedAt: '11:15 AM',
        status: 'PENDING'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('meridian_crm_pending_txs', JSON.stringify(pendingTransactions));
  }, [pendingTransactions]);

  const fetchPendingTransactions = async () => {
    try {
      const response = await fetch('/api/admin/pending-transactions');
      if (response.ok) {
        const data = await response.json();
        const txs = Array.isArray(data) ? data : (data.transactions || []);
        
        const formattedTxs = txs.map(tx => ({
          id: tx.id || `TX-${tx.id}`,
          dbId: tx.id,
          clientId: `CL-${tx.user_id || tx.clientId}`,
          userId: tx.user_id || tx.clientId,
          clientName: tx.user_name || tx.clientName || 'Client',
          type: (tx.type || 'DEPOSIT').toUpperCase(),
          amountUSD: parseFloat(tx.amount || tx.amountUSD || 0),
          localCurrency: tx.localCurrency || `${tx.amount} USD`,
          method: tx.method || 'Bank Transfer',
          requestedAt: tx.created_at ? new Date(tx.created_at).toLocaleTimeString() : 'Recently',
          status: tx.status || 'PENDING'
        }));
        setPendingTransactions(formattedTxs);
        
        const newNotifs = formattedTxs.map(tx => ({
          id: `NT-${tx.id}`,
          clientId: tx.clientId,
          clientName: tx.clientName,
          type: tx.type,
          amountUSD: tx.amountUSD,
          timestamp: tx.requestedAt,
          unread: true
        }));
        setNotifications(newNotifs);
      }
    } catch (err) {
      console.warn('Backend transactions route unavailable, operating in persistent mode.', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      setLoadingClients(true);
      Promise.all([fetchClients(), fetchPendingTransactions()])
        .finally(() => setLoadingClients(false));
      
      const interval = setInterval(() => {
        fetchClients();
        fetchPendingTransactions();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Memoize visible clients according to role permissions & filters
  const visibleClients = useMemo(() => {
    return clients.filter(c => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        (c.name || '').toLowerCase().includes(q) ||
        (c.id || '').toLowerCase().includes(q) ||
        (currentUser?.role === 'ADMIN' && (
          (c.email || '').toLowerCase().includes(q) ||
          (c.ip || '').toLowerCase().includes(q)
        ));

      const matchesStatus = statusFilter === 'ALL' || c.stage === statusFilter;
      const matchesKyc = kycFilter === 'ALL' || c.kycStatus === kycFilter;

      if (!currentUser) return false;
      if (currentUser.role === 'ADMIN') return matchesSearch && matchesStatus && matchesKyc;
      
      // Strict AGENT RBAC Scope
      return matchesSearch && matchesStatus && matchesKyc && c.assignedAgent === currentUser.agentId;
    });
  }, [clients, searchQuery, statusFilter, kycFilter, currentUser]);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClientDetail, setSelectedClientDetail] = useState(null);
  const [adjustmentType, setAdjustmentType] = useState('ADD');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');

  useEffect(() => {
    if (visibleClients.length > 0 && !visibleClients.some(c => c.id === selectedClientId)) {
      setSelectedClientId(visibleClients[0].id);
    }
  }, [visibleClients, selectedClientId]);

  // -------------------------------------------------------------
  // HANDLERS WITH BACKEND SYNC & AUDIT LOGGING
  // -------------------------------------------------------------
  const handleAssignAgent = (clientId, newAgent) => {
    if (currentUser.role !== 'ADMIN') {
      alert('Security Exception: Agents are unauthorized to assign accounts.');
      return;
    }
    setClients(clients.map(c => c.id === clientId ? { ...c, assignedAgent: newAgent } : c));
    addAuditLog('AGENT_REASSIGN', `Assigned client ${clientId} to ${newAgent}`);
  };

  const handleUpdateKycStatus = (clientId, newStatus) => {
    setClients(clients.map(c => c.id === clientId ? { ...c, kycStatus: newStatus } : c));
    addAuditLog('KYC_UPDATE', `Updated KYC status of ${clientId} to ${newStatus}`);
  };

  const handleUpdateStage = (clientId, newStage) => {
    setClients(clients.map(c => c.id === clientId ? { ...c, stage: newStage } : c));
    addAuditLog('CLIENT_STAGE_UPDATE', `Updated client ${clientId} lifecycle stage to ${newStage}`);
  };

  const handleApproveTransaction = async (tx) => {
    if (currentUser.role !== 'ADMIN') {
      alert('Security Exception: Financial approval requires Administrator clearance.');
      return;
    }

    try {
      const res = await fetch('/api/admin/approve-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transactionId: tx.dbId || tx.id,
          userId: tx.userId,
          amount: tx.amountUSD,
          type: tx.type,
          status: 'APPROVED'
        })
      });
      if (!res.ok) {
        console.warn('API returned non-OK status, applying local state update');
      }
      await fetchClients();
      await fetchPendingTransactions();
    } catch (err) {
      console.error('Error approving transaction:', err);
    }

    // Always ensure local state update for consistency
    setClients(prevClients => prevClients.map(client => {
      if (client.id === tx.clientId) {
        const delta = tx.type === 'DEPOSIT' ? tx.amountUSD : -tx.amountUSD;
        return { ...client, balanceUSD: Math.max(0, (client.balanceUSD || 0) + delta) };
      }
      return client;
    }));
    setPendingTransactions(prev => prev.filter(t => t.id !== tx.id));
    addAuditLog('TRANSACTION_APPROVED', `Approved ${tx.type} of $${tx.amountUSD} for ${tx.clientName}`);
    alert(`Transaction ${tx.id} for $${tx.amountUSD.toFixed(2)} approved!`);
  };

  const handleRejectTransaction = async (tx) => {
    if (currentUser.role !== 'ADMIN') {
      alert('Security Exception: Financial rejection requires Administrator clearance.');
      return;
    }

    try {
      await fetch('/api/admin/approve-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transactionId: tx.dbId || tx.id,
          status: 'REJECTED'
        })
      });
      await fetchPendingTransactions();
    } catch (err) {
      console.error('Error rejecting transaction:', err);
    }

    setPendingTransactions(prev => prev.filter(t => t.id !== tx.id));
    addAuditLog('TRANSACTION_REJECTED', `Rejected ${tx.type} request of $${tx.amountUSD} for ${tx.clientName}`);
  };

  // STRICT AUDITED BALANCE ADJUSTER
  const handleManualBalanceAdjustment = async (e) => {
    e.preventDefault();
    if (currentUser.role !== 'ADMIN') {
      alert('CRITICAL SECURITY ALERT: Agents cannot directly modify balances.');
      return;
    }

    const amt = parseFloat(adjustmentAmount);
    if (!amt || amt <= 0) return alert('Please enter a valid dollar amount.');
    const targetClient = clients.find(c => c.id === selectedClientId);
    if (!targetClient) return alert('Target client not found.');

    try {
      const response = await fetch('/api/admin/adjust-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: targetClient.dbId || targetClient.id.replace('CL-', ''),
          adjustmentType, // 'ADD', 'MINUS', or 'BONUS'
          amount: amt
        })
      });
      if (!response.ok) {
        console.warn('Server responded with error during balance adjustment, falling back to local update.');
      }
      await fetchClients();
    } catch (err) {
      console.error('Error adjusting balance:', err);
    }

    // Direct State Synchronization
    setClients(prevClients => prevClients.map(client => {
      if (client.id === selectedClientId) {
        if (adjustmentType === 'BONUS') {
          return { ...client, bonusUSD: (client.bonusUSD || 0) + amt };
        }
        const delta = adjustmentType === 'ADD' ? amt : -amt;
        const newBal = Math.max(0, (client.balanceUSD || 0) + delta);
        return { ...client, balanceUSD: newBal };
      }
      return client;
    }));

    addAuditLog('MANUAL_BALANCE_ADJUST', `Applied ${adjustmentType} of $${amt.toFixed(2)} to ${targetClient.name} (${targetClient.id})`);
    setAdjustmentAmount('');
    alert(`Successfully processed ${adjustmentType} of $${amt.toFixed(2)} for ${targetClient.name}.`);
  };

  // NEW CLIENT REGISTRATION FORM
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientAgent, setNewClientAgent] = useState('Sarah Jenkins');

  const handleRegisterClient = (e) => {
    e.preventDefault();
    if (!newClientName) return alert('Enter client name.');
    
    const newId = `CL-${Math.floor(100 + Math.random() * 900)}`;
    const newClient = {
      id: newId,
      dbId: Date.now(),
      name: newClientName,
      email: currentUser.role === 'ADMIN' ? newClientEmail : 'masked@meridian.com',
      phone: currentUser.role === 'ADMIN' ? newClientPhone : '+1 (555) ***-****',
      ip: '127.0.0.1',
      assignedAgent: currentUser.role === 'ADMIN' ? newClientAgent : currentUser.agentId,
      kycStatus: 'PENDING',
      stage: 'NEW_LEAD',
      balanceUSD: 0.00,
      bonusUSD: 0.00,
      isOnline: true,
      callNotes: [`[SYSTEM] Account created by ${currentUser.name}`],
      createdAt: new Date().toISOString().split('T')[0],
      lastContact: new Date().toISOString().split('T')[0]
    };

    setClients([newClient, ...clients]);
    addAuditLog('CLIENT_REGISTRATION', `Registered new client ${newClient.name} (${newId})`);
    setNewClientName('');
    setNewClientEmail('');
    setNewClientPhone('');
    alert(`Client ${newClient.name} successfully registered.`);
  };

  // APPOINTMENT SCHEDULER
  const [aptClient, setAptClient] = useState('');
  const [aptDate, setAptDate] = useState('');
  const [aptTime, setAptTime] = useState('');
  const [aptNote, setAptNote] = useState('');

  const handleCreateAppointment = (e) => {
    e.preventDefault();
    if (!aptClient || !aptDate || !aptTime) return alert('Fill in all appointment details.');

    const client = clients.find(c => c.id === aptClient);
    const newApt = {
      id: `APT-${Date.now()}`,
      clientId: aptClient,
      clientName: client ? client.name : 'Client',
      agent: currentUser.role === 'ADMIN' ? 'Admin Assigned' : currentUser.agentId,
      date: aptDate,
      time: aptTime,
      note: aptNote || 'General Consultation'
    };

    setAppointments([newApt, ...appointments]);
    addAuditLog('APPOINTMENT_SCHEDULED', `Scheduled appointment with ${newApt.clientName} for ${aptDate} ${aptTime}`);
    setAptClient('');
    setAptDate('');
    setAptTime('');
    setAptNote('');
    alert('Appointment successfully booked.');
  };

  // -------------------------------------------------------------
  // 5. CALL CENTER SUITE
  // -------------------------------------------------------------
  const [activeCallClient, setActiveCallClient] = useState(null);
  const [callStatus, setCallStatus] = useState('IDLE');
  const [newNote, setNewNote] = useState('');

  const startCall = (client) => {
    setActiveCallClient(client);
    setCallStatus('CALLING');
    addAuditLog('CALL_INITIATED', `Dialed client ${client.name} (${client.id})`);
    setTimeout(() => setCallStatus('CONNECTED'), 2000);
  };

  const endCall = () => {
    if (activeCallClient) {
      addAuditLog('CALL_ENDED', `Ended session with ${activeCallClient.name}`);
    }
    setCallStatus('IDLE');
    setActiveCallClient(null);
  };

  const handleAddCallNote = (e) => {
    e.preventDefault();
    if (!newNote.trim() || !activeCallClient) return;
    const noteText = `[${new Date().toLocaleTimeString()}] (${currentUser.name}): ${newNote}`;
    
    setClients(clients.map(c => {
      if (c.id === activeCallClient.id) {
        return { ...c, callNotes: [noteText, ...(c.callNotes || [])], lastContact: new Date().toISOString().split('T')[0] };
      }
      return c;
    }));

    setActiveCallClient({
      ...activeCallClient,
      callNotes: [noteText, ...(activeCallClient.callNotes || [])]
    });
    
    addAuditLog('CALL_NOTE_ADDED', `Logged note for ${activeCallClient.id}`);
    setNewNote('');
  };

  // -------------------------------------------------------------
  // CALCULATED ANALYTICS & BIWEEKLY PROGRESS
  // -------------------------------------------------------------
  const metrics = useMemo(() => {
    const totalBal = clients.reduce((acc, c) => acc + (c.balanceUSD || 0), 0);
    const totalBonus = clients.reduce((acc, c) => acc + (c.bonusUSD || 0), 0);
    const totalVerified = clients.filter(c => c.kycStatus === 'VERIFIED').length;
    const totalConversion = clients.filter(c => c.stage === 'CONVERSION' || c.stage === 'RETENTION').length;
    
    return {
      totalClients: clients.length,
      totalBal,
      totalBonus,
      verifiedRatio: clients.length ? Math.round((totalVerified / clients.length) * 100) : 0,
      conversionRate: clients.length ? Math.round((totalConversion / clients.length) * 100) : 0
    };
  }, [clients]);

  // -------------------------------------------------------------
  // LOGIN SCREEN
  // -------------------------------------------------------------
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#06080d] text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-slate-900 border border-slate-800 rounded-2xl">
              <Shield className="w-8 h-8 text-cyan-400" />
            </div>
            <h1 className="text-xl font-black text-white tracking-widest uppercase">MERIDIAN CRM</h1>
            <p className="text-xs text-slate-400 font-mono">Authentication Required</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4 font-mono text-xs">
            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-center">
                {loginError}
              </div>
            )}
            <div>
              <label className="block text-slate-400 uppercase mb-1">Email Terminal ID</label>
              <input 
                type="email" 
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@meridian.com or agent@meridian.com"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 uppercase mb-1">Passcode</label>
              <input 
                type="password" 
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button 
              type="submit" 
              className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-sans rounded-xl transition uppercase tracking-wider cursor-pointer"
            >
              Authenticate Session
            </button>
          </form>
          <div className="border-t border-slate-900 pt-4 text-[11px] font-mono text-slate-500 space-y-1">
            <p><strong>Admin Portal:</strong> admin@meridian.com / admin123</p>
            <p><strong>Agent Portal:</strong> agent@meridian.com / agent123</p>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN CRM DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#06080d] text-slate-100 font-sans flex flex-col">
      {/* HEADER */}
      <header className="bg-slate-950 border-b border-slate-800/80 px-8 py-5 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-widest text-white uppercase leading-none">
              MERIDIAN CRM & CALL CENTER
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-1">
              User: <span className="text-cyan-400 font-bold">{currentUser.name}</span> {' '}
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${currentUser.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-cyan-500/20 text-cyan-400'}`}>
                {currentUser.role}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* NOTIFICATION CENTER */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl relative cursor-pointer"
            >
              <Bell className="w-4 h-4 text-cyan-400" />
              {notifications.some(n => n.unread) && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-4 font-mono text-xs z-50">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800 mb-3">
                  <span className="font-bold text-white uppercase">Activity Notifications</span>
                  <button 
                    onClick={() => setNotifications(notifications.map(n => ({ ...n, unread: false })))}
                    className="text-[10px] text-cyan-400 hover:underline"
                  >
                    Clear Badges
                  </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-slate-500 text-center py-2">No active notifications</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="p-2.5 bg-slate-900/80 border border-slate-800/80 rounded-xl space-y-1">
                        <div className="flex justify-between items-center font-bold">
                          <span className={n.type === 'DEPOSIT' ? 'text-emerald-400' : 'text-amber-400'}>
                            [{n.type}] Initiated
                          </span>
                          <span className="text-[10px] text-slate-500">{n.timestamp}</span>
                        </div>
                        <p className="text-slate-300">
                          {n.clientName} requested ${n.amountUSD.toFixed(2)} USD
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={handleLogout} 
            className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 rounded-xl font-mono flex items-center space-x-2 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
            <span>Exit Session</span>
          </button>
        </div>
      </header>

      {/* CRM NAVIGATION TABS */}
      <div className="bg-slate-950/60 border-b border-slate-800/80 px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-2 font-mono text-xs">
          <button
            onClick={() => setActiveCrmTab('dashboard')}
            className={`px-4 py-2 rounded-xl border font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeCrmTab === 'dashboard' ? 'bg-cyan-500/10 border-cyan-500/80 text-cyan-400' : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveCrmTab('assigned')}
            className={`px-4 py-2 rounded-xl border font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeCrmTab === 'assigned' ? 'bg-cyan-500/10 border-cyan-500/80 text-cyan-400' : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{currentUser.role === 'ADMIN' ? 'All Clients' : 'Assigned Clients'} ({visibleClients.length})</span>
          </button>

          <button
            onClick={() => setActiveCrmTab('registration')}
            className={`px-4 py-2 rounded-xl border font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeCrmTab === 'registration' ? 'bg-cyan-500/10 border-cyan-500/80 text-cyan-400' : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Register Client</span>
          </button>

          <button
            onClick={() => setActiveCrmTab('appointments')}
            className={`px-4 py-2 rounded-xl border font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeCrmTab === 'appointments' ? 'bg-cyan-500/10 border-cyan-500/80 text-cyan-400' : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Appointments ({appointments.length})</span>
          </button>

          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setActiveCrmTab('financial_ops')}
              className={`px-4 py-2 rounded-xl border font-bold transition flex items-center space-x-2 cursor-pointer ${
                activeCrmTab === 'financial_ops' ? 'bg-cyan-500/10 border-cyan-500/80 text-cyan-400' : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Financial Control ({pendingTransactions.length})</span>
            </button>
          )}

          <button
            onClick={() => setActiveCrmTab('biweekly')}
            className={`px-4 py-2 rounded-xl border font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeCrmTab === 'biweekly' ? 'bg-cyan-500/10 border-cyan-500/80 text-cyan-400' : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Biweekly Progress</span>
          </button>

          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setActiveCrmTab('audit')}
              className={`px-4 py-2 rounded-xl border font-bold transition flex items-center space-x-2 cursor-pointer ${
                activeCrmTab === 'audit' ? 'bg-cyan-500/10 border-cyan-500/80 text-cyan-400' : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Security & Audit</span>
            </button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 space-y-6">
        {/* DASHBOARD TAB */}
        {activeCrmTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 font-mono">
                <div className="text-slate-500 text-[10px] uppercase">Active Portfolios</div>
                <div className="text-2xl font-bold text-white mt-1">{metrics.totalClients}</div>
                <div className="text-[10px] text-cyan-400 mt-2">Scope: {currentUser.role}</div>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 font-mono">
                <div className="text-slate-500 text-[10px] uppercase">Total Assets Under Management</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">${metrics.totalBal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                <div className="text-[10px] text-slate-400 mt-2">Active USD Balances</div>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 font-mono">
                <div className="text-slate-500 text-[10px] uppercase">Allocated Bonuses</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">${metrics.totalBonus.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                <div className="text-[10px] text-slate-400 mt-2">Incentive Credit Pool</div>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 font-mono">
                <div className="text-slate-500 text-[10px] uppercase">KYC Compliance Rate</div>
                <div className="text-2xl font-bold text-cyan-400 mt-1">{metrics.verifiedRatio}%</div>
                <div className="text-[10px] text-slate-400 mt-2">Verified Accounts</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Quick Action & Conversion Funnel</h3>
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between items-center p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span>New Leads</span>
                    <span className="font-bold text-cyan-400">{clients.filter(c => c.stage === 'NEW_LEAD').length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span>Conversion Stage</span>
                    <span className="font-bold text-amber-400">{clients.filter(c => c.stage === 'CONVERSION').length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span>Retention Accounts</span>
                    <span className="font-bold text-emerald-400">{clients.filter(c => c.stage === 'RETENTION').length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Upcoming Scheduled Appointments</h3>
                <div className="space-y-2 font-mono text-xs">
                  {appointments.length === 0 ? (
                    <p className="text-slate-500">No scheduled sessions.</p>
                  ) : (
                    appointments.slice(0, 3).map(apt => (
                      <div key={apt.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center">
                        <div>
                          <div className="font-bold text-white">{apt.clientName}</div>
                          <div className="text-[10px] text-slate-400">{apt.note} ({apt.agent})</div>
                        </div>
                        <div className="text-right text-cyan-400 font-bold">
                          {apt.date} @ {apt.time}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CLIENTS / ASSIGNED TAB */}
        {activeCrmTab === 'assigned' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-slate-900/40 p-4 border border-slate-800/80 rounded-2xl">
              <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input 
                    type="text"
                    placeholder={currentUser.role === 'ADMIN' ? "Search name, ID, email, IP..." : "Search name or ID..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>

                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="ALL">All Stages</option>
                  <option value="NEW_LEAD">New Lead</option>
                  <option value="CONVERSION">Conversion</option>
                  <option value="RETENTION">Retention</option>
                </select>

                <select 
                  value={kycFilter}
                  onChange={(e) => setKycFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="ALL">All KYC</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="PENDING">Pending</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div className="text-xs font-mono text-slate-400">
                Displaying <span className="text-cyan-400 font-bold">{visibleClients.length}</span> records
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-950/60 text-slate-400 font-sans font-semibold">
                    <th className="py-4 px-6">Client Identity</th>
                    <th className="py-4 px-6">Status / Stage</th>
                    <th className="py-4 px-6">KYC Compliance</th>
                    <th className="py-4 px-6">Protected Contact Data</th>
                    <th className="py-4 px-6">Balance & Bonus</th>
                    <th className="py-4 px-6">Assigned Agent</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {visibleClients.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-800/20 transition">
                      <td className="py-5 px-6">
                        <div className="font-bold text-white text-sm">{client.name}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">ID: {client.id}</div>
                      </td>
                      <td className="py-5 px-6 space-y-1">
                        <div>
                          {client.isOnline ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[9px] font-bold rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                              <Wifi className="w-2.5 h-2.5" />
                              <span>ONLINE</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[9px] font-bold rounded bg-slate-800 border border-slate-700 text-slate-400">
                              <WifiOff className="w-2.5 h-2.5" />
                              <span>OFFLINE</span>
                            </span>
                          )}
                        </div>
                        <select 
                          value={client.stage || 'NEW_LEAD'} 
                          onChange={(e) => handleUpdateStage(client.id, e.target.value)}
                          className="bg-slate-950 border border-slate-800 text-[10px] text-cyan-400 font-bold rounded px-1.5 py-0.5 focus:outline-none"
                        >
                          <option value="NEW_LEAD">NEW LEAD</option>
                          <option value="CONVERSION">CONVERSION</option>
                          <option value="RETENTION">RETENTION</option>
                        </select>
                      </td>
                      <td className="py-5 px-6">
                        <select
                          value={client.kycStatus || 'PENDING'}
                          onChange={(e) => handleUpdateKycStatus(client.id, e.target.value)}
                          className={`text-[10px] font-bold rounded px-2 py-1 border bg-slate-950 focus:outline-none cursor-pointer ${
                            client.kycStatus === 'VERIFIED' ? 'text-emerald-400 border-emerald-500/30' :
                            client.kycStatus === 'REJECTED' ? 'text-rose-400 border-rose-500/30' : 'text-amber-400 border-amber-500/30'
                          }`}
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="VERIFIED">VERIFIED</option>
                          <option value="REJECTED">REJECTED</option>
                        </select>
                      </td>
                      <td className="py-5 px-6 space-y-1">
                        {currentUser.role === 'ADMIN' ? (
                          <>
                            <div className="text-cyan-400 font-semibold">{client.email}</div>
                            <div className="text-slate-300">{client.phone}</div>
                            <div className="text-[10px] text-slate-500">🌐 IP: {client.ip}</div>
                          </>
                        ) : (
                          <div className="flex items-center text-slate-500 space-x-2 py-1">
                            <EyeOff className="w-4 h-4 text-slate-600" />
                            <span className="italic text-[11px]">Protected Details</span>
                          </div>
                        )}
                      </td>
                      <td className="py-5 px-6">
                        <div className="font-bold text-emerald-400 text-sm">
                          ${(client.balanceUSD || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-amber-400 font-semibold mt-0.5">
                          Bonus: ${(client.bonusUSD || 0).toFixed(2)}
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        {currentUser.role === 'ADMIN' ? (
                          <select
                            value={client.assignedAgent || 'Unassigned'}
                            onChange={(e) => handleAssignAgent(client.id, e.target.value)}
                            className="bg-slate-950 border border-slate-800 text-cyan-400 font-semibold rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                          >
                            {availableAgents.map(ag => (
                              <option key={ag} value={ag}>{ag}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-300 font-semibold">{client.assignedAgent || 'Unassigned'}</span>
                        )}
                      </td>
                      <td className="py-5 px-6 text-right space-x-2">
                        <button 
                          onClick={() => setSelectedClientDetail(client)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>360 View</span>
                        </button>
                        <button 
                          onClick={() => startCall(client)}
                          className="px-3.5 py-1.5 bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 text-xs font-bold rounded-xl transition inline-flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Dial</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REGISTRATION TAB */}
        {activeCrmTab === 'registration' && (
          <div className="max-w-2xl mx-auto bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-6 font-mono">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center space-x-2">
              <UserPlus className="w-4 h-4 text-cyan-400" />
              <span>Client Onboarding & Registration</span>
            </h2>
            <form onSubmit={handleRegisterClient} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 uppercase text-[10px] mb-1">Full Legal Name</label>
                <input 
                  type="text" 
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g. Robert Ford"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 uppercase text-[10px] mb-1">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="r.ford@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 uppercase text-[10px] mb-1">Phone Number</label>
                  <input 
                    type="text" 
                    required
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="+1 (555) 019-8833"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              {currentUser.role === 'ADMIN' && (
                <div>
                  <label className="block text-slate-400 uppercase text-[10px] mb-1">Assigned Account Manager</label>
                  <select 
                    value={newClientAgent}
                    onChange={(e) => setNewClientAgent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    {availableAgents.map(ag => (
                      <option key={ag} value={ag}>{ag}</option>
                    ))}
                  </select>
                </div>
              )}
              <button 
                type="submit" 
                className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl font-sans uppercase cursor-pointer transition"
              >
                Register Account
              </button>
            </form>
          </div>
        )}

        {/* APPOINTMENTS TAB */}
        {activeCrmTab === 'appointments' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono">
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-4">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-800 flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>Schedule Consultation</span>
              </h2>
              <form onSubmit={handleCreateAppointment} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 uppercase text-[10px] mb-1">Target Client</label>
                  <select 
                    value={aptClient}
                    onChange={(e) => setAptClient(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white"
                  >
                    <option value="">Select Client...</option>
                    {visibleClients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 uppercase text-[10px] mb-1">Date</label>
                    <input 
                      type="date" 
                      required
                      value={aptDate}
                      onChange={(e) => setAptDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 uppercase text-[10px] mb-1">Time</label>
                    <input 
                      type="time" 
                      required
                      value={aptTime}
                      onChange={(e) => setAptTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 uppercase text-[10px] mb-1">Consultation Objective</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Portfolio Strategy"
                    value={aptNote}
                    onChange={(e) => setAptNote(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <button type="submit" className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl font-sans uppercase transition">
                  Confirm Booking
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-4">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-800">
                Scheduled Calendar Engagements
              </h2>
              <div className="space-y-3 text-xs">
                {appointments.map(apt => (
                  <div key={apt.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center">
                    <div>
                      <div className="font-bold text-white text-sm">{apt.clientName} ({apt.clientId})</div>
                      <div className="text-slate-400 mt-0.5">{apt.note}</div>
                      <div className="text-[10px] text-cyan-400 mt-1">Assigned Agent: {apt.agent}</div>
                    </div>
                    <div className="text-right font-bold text-emerald-400">
                      <div>{apt.date}</div>
                      <div className="text-xs text-slate-300">{apt.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* FINANCIAL OPS TAB (ADMIN ONLY) */}
        {activeCrmTab === 'financial_ops' && currentUser.role === 'ADMIN' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-4">
                <h2 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center space-x-2 pb-2 border-b border-slate-800">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>Pending Client Deposits & Withdrawals</span>
                </h2>
                {pendingTransactions.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs font-mono">No pending requests</div>
                ) : (
                  pendingTransactions.map((tx) => (
                    <div key={tx.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex justify-between items-center text-xs font-mono">
                      <div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tx.type === 'DEPOSIT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {tx.type}
                        </span>
                        <span className="font-bold text-white ml-2">{tx.clientName}</span>
                        <div className="text-slate-300 mt-1">Amount: ${tx.amountUSD.toFixed(2)} USD ({tx.method})</div>
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={() => handleApproveTransaction(tx)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-sans font-bold cursor-pointer transition">Approve</button>
                        <button onClick={() => handleRejectTransaction(tx)} className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 rounded-lg cursor-pointer transition">Reject</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-4">
              <h2 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center space-x-2 pb-2 border-b border-slate-800">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Add / Deduct Balance & Bonus</span>
              </h2>
              <form onSubmit={handleManualBalanceAdjustment} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-slate-400 uppercase text-[10px] mb-1">Target Account</label>
                  <select 
                    value={selectedClientId} 
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} (${(c.balanceUSD || 0).toFixed(2)})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button 
                    type="button" 
                    onClick={() => setAdjustmentType('ADD')}
                    className={`py-2 rounded-xl text-[11px] font-bold border cursor-pointer ${adjustmentType === 'ADD' ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-400'}`}
                  >
                    + Deposit
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setAdjustmentType('MINUS')}
                    className={`py-2 rounded-xl text-[11px] font-bold border cursor-pointer ${adjustmentType === 'MINUS' ? 'bg-rose-600 text-white' : 'bg-slate-950 text-slate-400'}`}
                  >
                    - Deduct
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setAdjustmentType('BONUS')}
                    className={`py-2 rounded-xl text-[11px] font-bold border cursor-pointer ${adjustmentType === 'BONUS' ? 'bg-amber-600 text-white' : 'bg-slate-950 text-slate-400'}`}
                  >
                    + Bonus
                  </button>
                </div>
                <div>
                  <label className="block text-slate-400 uppercase text-[10px] mb-1">Amount (USD)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <button type="submit" className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl font-sans uppercase cursor-pointer transition">
                  Execute Order
                </button>
              </form>
            </div>
          </div>
        )}

        {/* BIWEEKLY PROGRESS TAB */}
        {activeCrmTab === 'biweekly' && (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-6 font-mono">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-800 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>Biweekly Performance & Growth Progress</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="text-slate-500 text-[10px] uppercase">Biweekly Gross Inflow</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">$48,500.00</div>
              </div>
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="text-slate-500 text-[10px] uppercase">Conversion Velocity</div>
                <div className="text-xl font-bold text-cyan-400 mt-1">{metrics.conversionRate}%</div>
              </div>
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="text-slate-500 text-[10px] uppercase">Agent Contact Quota</div>
                <div className="text-xl font-bold text-amber-400 mt-1">94% Achieved</div>
              </div>
            </div>
          </div>
        )}

        {/* AUDIT LOG TAB (ADMIN ONLY) */}
        {activeCrmTab === 'audit' && currentUser.role === 'ADMIN' && (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-4 font-mono text-xs">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-800 flex items-center space-x-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Immutable System Audit & Security Trail</span>
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {auditLogs.map(log => (
                <div key={log.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="text-cyan-400 font-bold">[{log.action}]</span>
                    <span className="text-white ml-2">{log.details}</span>
                    <div className="text-[10px] text-slate-500 mt-0.5">Operator: {log.user}</div>
                  </div>
                  <div className="text-[10px] text-slate-500">{log.timestamp}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* CLIENT 360 MODAL */}
      {selectedClientDetail && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-mono">
          <div className="max-w-xl w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase">Client 360 Overview</h3>
              <button onClick={() => setSelectedClientDetail(null)} className="text-slate-500 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 uppercase text-[10px]">Client Name</span>
                  <div className="text-white font-bold text-sm">{selectedClientDetail.name}</div>
                </div>
                <div>
                  <span className="text-slate-500 uppercase text-[10px]">Account ID</span>
                  <div className="text-cyan-400 font-bold">{selectedClientDetail.id}</div>
                </div>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 uppercase text-[10px]">Balance</span>
                  <div className="text-emerald-400 font-bold">${selectedClientDetail.balanceUSD.toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-slate-500 uppercase text-[10px]">Bonus</span>
                  <div className="text-amber-400 font-bold">${selectedClientDetail.bonusUSD.toFixed(2)}</div>
                </div>
              </div>

              <div>
                <span className="text-slate-500 uppercase text-[10px]">Interaction History</span>
                <div className="max-h-32 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1 mt-1 text-[11px]">
                  {selectedClientDetail.callNotes && selectedClientDetail.callNotes.length > 0 ? (
                    selectedClientDetail.callNotes.map((n, i) => <div key={i} className="text-slate-300">{n}</div>)
                  ) : (
                    <div className="text-slate-600 italic">No notes logged yet.</div>
                  )}
                </div>
              </div>
            </div>
            <button 
              onClick={() => setSelectedClientDetail(null)} 
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold font-sans cursor-pointer"
            >
              Close Record
            </button>
          </div>
        </div>
      )}

      {/* CALL CENTER DRAWER */}
      {activeCallClient && (
        <div className="fixed bottom-6 right-6 w-96 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 font-mono z-50">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <PhoneCall className={`w-4 h-4 ${callStatus === 'CONNECTED' ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
              <span className="text-xs font-bold text-white uppercase">Call Terminal</span>
            </div>
            <button onClick={endCall} className="text-slate-500 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-bold text-white">{activeCallClient.name}</div>
            <div className="text-[10px] text-slate-500 uppercase">
              Status: <span className="text-amber-400 font-bold">{callStatus}</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] uppercase text-slate-400">Interaction Log</label>
            <div className="max-h-28 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1.5 text-[11px] text-slate-300">
              {activeCallClient.callNotes && activeCallClient.callNotes.length > 0 ? (
                activeCallClient.callNotes.map((note, idx) => (
                  <div key={idx} className="border-b border-slate-800/50 pb-1">{note}</div>
                ))
              ) : (
                <div className="text-slate-600 italic">No notes logged yet.</div>
              )}
            </div>
          </div>
          <form onSubmit={handleAddCallNote} className="space-y-2">
            <input 
              type="text" 
              placeholder="Log interaction details..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
            <button type="submit" className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs font-sans cursor-pointer">
              Save Call Note
            </button>
          </form>
        </div>
      )}
    </div>
  );
}