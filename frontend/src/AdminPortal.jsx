import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  Users, 
  Search, 
  LogOut, 
  Wallet, 
  DollarSign,
  Clock,
  Phone,
  PhoneCall,
  Bell,
  Wifi,
  WifiOff,
  LayoutDashboard,
  UserPlus,
  Calendar,
  BarChart3,
  Lock,
  Eye,
  X,
  UserCheck,
  Plus
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

  // Agents state with local storage persistence
  const [agents, setAgents] = useState(() => {
    const saved = localStorage.getItem('meridian_crm_agents');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('meridian_crm_agents', JSON.stringify(agents));
  }, [agents]);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    
    // Updated Primary Master Admin Credentials
    if (loginEmail === 'klaus@meridianmarket.net' && loginPassword === 'Wizzy01@') {
      const user = { name: 'Klaus Admin', email: loginEmail, role: 'ADMIN', agentId: 'ADMIN_01' };
      setCurrentUser(user);
      localStorage.setItem('meridian_crm_auth', JSON.stringify(user));
      return;
    }
    
    // Agent Authentication Strategy
    const matchedAgent = agents.find(ag => ag.email === loginEmail && ag.password === loginPassword);
    if (matchedAgent) {
      const user = { name: matchedAgent.name, email: matchedAgent.email, role: 'AGENT', agentId: matchedAgent.name };
      setCurrentUser(user);
      localStorage.setItem('meridian_crm_auth', JSON.stringify(user));
      return;
    }
    
    setLoginError('Invalid credentials. Check email and password.');
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
  
  // Real clients stored in state (Demo clients removed)
  const [clients, setClients] = useState(() => {
    const saved = localStorage.getItem('meridian_crm_clients');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('meridian_crm_clients', JSON.stringify(clients));
  }, [clients]);

  // Appointments State
  const [appointments, setAppointments] = useState(() => {
    const saved = localStorage.getItem('meridian_crm_appointments');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('meridian_crm_appointments', JSON.stringify(appointments));
  }, [appointments]);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState(() => {
    const saved = localStorage.getItem('meridian_crm_audit');
    return saved ? JSON.parse(saved) : [
      { id: 'LOG-101', user: 'System', action: 'SYSTEM_BOOT', details: 'CRM Subsystem Initialized', timestamp: new Date().toLocaleString() }
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
    return saved ? JSON.parse(saved) : [];
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

  // AGENT CREATION BY ADMIN
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentEmail, setNewAgentEmail] = useState('');
  const [newAgentPassword, setNewAgentPassword] = useState('');

  const handleCreateAgent = (e) => {
    e.preventDefault();
    if (currentUser.role !== 'ADMIN') return;
    if (!newAgentName || !newAgentEmail || !newAgentPassword) {
      alert('Please fill out all agent details.');
      return;
    }
    const agentObj = {
      id: `AG-${Date.now()}`,
      name: newAgentName,
      email: newAgentEmail,
      password: newAgentPassword,
      createdAt: new Date().toLocaleDateString()
    };
    setAgents([...agents, agentObj]);
    addAuditLog('AGENT_CREATED', `Created new agent ${newAgentName} (${newAgentEmail})`);
    setNewAgentName('');
    setNewAgentEmail('');
    setNewAgentPassword('');
    alert(`Agent ${newAgentName} successfully created.`);
  };

  // FIXED AUDITED BALANCE ADJUSTER
  const handleManualBalanceAdjustment = async (e) => {
    e.preventDefault();
    if (currentUser.role !== 'ADMIN') {
      alert('CRITICAL SECURITY ALERT: Agents cannot directly modify balances.');
      return;
    }
    const amt = parseFloat(adjustmentAmount);
    if (isNaN(amt) || amt <= 0) return alert('Please enter a valid dollar amount.');
    const targetClient = clients.find(c => c.id === selectedClientId);
    if (!targetClient) return alert('Target client not found.');

    try {
      await fetch('/api/admin/adjust-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: targetClient.dbId || targetClient.id.replace('CL-', ''),
          adjustmentType,
          amount: amt
        })
      });
    } catch (err) {
      console.warn('Server sync unavailable, performing direct state balance adjustment.', err);
    }

    // Direct State Balance Sync
    setClients(prevClients => prevClients.map(client => {
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
    }));

    addAuditLog('BALANCE_ADJUSTED', `Applied ${adjustmentType} of $${amt.toFixed(2)} to ${targetClient.name}`);
    setAdjustmentAmount('');
    alert(`Successfully applied ${adjustmentType} of $${amt.toFixed(2)} to ${targetClient.name}.`);
  };

  // REGISTER CLIENT FORM
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientAgent, setNewClientAgent] = useState('Unassigned');

  const handleRegisterClient = (e) => {
    e.preventDefault();
    if (!newClientName) return alert('Enter client name.');
    
    const newId = `CL-${Math.floor(1000 + Math.random() * 9000)}`;
    const newClient = {
      id: newId,
      dbId: Date.now(),
      name: newClientName,
      email: newClientEmail,
      phone: newClientPhone,
      ip: '127.0.0.1',
      assignedAgent: newClientAgent,
      kycStatus: 'PENDING',
      stage: 'NEW_LEAD',
      balanceUSD: 0.00,
      bonusUSD: 0.00,
      isOnline: true,
      callNotes: [`[SYSTEM] Account registered by ${currentUser.name}`],
      createdAt: new Date().toISOString().split('T')[0],
      lastContact: new Date().toISOString().split('T')[0]
    };

    setClients([newClient, ...clients]);
    addAuditLog('CLIENT_REGISTERED', `Registered new client ${newClient.name} (${newId})`);
    setNewClientName('');
    setNewClientEmail('');
    setNewClientPhone('');
    alert(`Client ${newClient.name} registered successfully.`);
  };

  // APPOINTMENTS
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
      agent: currentUser.name,
      date: aptDate,
      time: aptTime,
      note: aptNote || 'Consultation'
    };
    setAppointments([newApt, ...appointments]);
    addAuditLog('APPOINTMENT_CREATED', `Booked session for ${newApt.clientName} on ${aptDate}`);
    setAptClient('');
    setAptDate('');
    setAptTime('');
    setAptNote('');
    alert('Appointment booked successfully.');
  };

  // CALL CENTER
  const [activeCallClient, setActiveCallClient] = useState(null);
  const [callStatus, setCallStatus] = useState('IDLE');
  const [newNote, setNewNote] = useState('');

  const startCall = (client) => {
    setActiveCallClient(client);
    setCallStatus('CALLING');
    addAuditLog('CALL_INITIATED', `Dialed ${client.name}`);
    setTimeout(() => setCallStatus('CONNECTED'), 1500);
  };

  const endCall = () => {
    setCallStatus('IDLE');
    setActiveCallClient(null);
  };

  const handleAddCallNote = (e) => {
    e.preventDefault();
    if (!newNote.trim() || !activeCallClient) return;
    const noteText = `[${new Date().toLocaleTimeString()}] (${currentUser.name}): ${newNote}`;
    
    setClients(clients.map(c => {
      if (c.id === activeCallClient.id) {
        return { ...c, callNotes: [noteText, ...(c.callNotes || [])] };
      }
      return c;
    }));
    setActiveCallClient({
      ...activeCallClient,
      callNotes: [noteText, ...(activeCallClient.callNotes || [])]
    });
    setNewNote('');
  };

  const metrics = useMemo(() => {
    const totalBal = clients.reduce((acc, c) => acc + (parseFloat(c.balanceUSD) || 0), 0);
    const totalBonus = clients.reduce((acc, c) => acc + (parseFloat(c.bonusUSD) || 0), 0);
    const totalVerified = clients.filter(c => c.kycStatus === 'VERIFIED').length;
    
    return {
      totalClients: clients.length,
      totalBal,
      totalBonus,
      verifiedRatio: clients.length ? Math.round((totalVerified / clients.length) * 100) : 0
    };
  }, [clients]);

  // LOGIN SCREEN
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#06080d] text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-slate-900 border border-slate-800 rounded-2xl">
              <Shield className="w-8 h-8 text-cyan-400" />
            </div>
            <h1 className="text-xl font-black text-white tracking-widest uppercase">MERIDIAN MARKET CRM</h1>
            <p className="text-xs text-slate-400 font-mono">Authentication Terminal</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4 font-mono text-xs">
            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-center">
                {loginError}
              </div>
            )}
            <div>
              <label className="block text-slate-400 uppercase mb-1">Email Address</label>
              <input 
                type="email" 
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="klaus@meridianmarket.net"
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
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // MAIN CRM WORKSPACE
  return (
    <div className="min-h-screen bg-[#06080d] text-slate-100 font-sans flex flex-col">
      {/* HEADER */}
      <header className="bg-slate-950 border-b border-slate-800 px-8 py-5 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-widest text-white uppercase leading-none">
              MERIDIAN CRM
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
          <button 
            onClick={handleLogout} 
            className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 rounded-xl font-mono flex items-center space-x-2 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* TABS */}
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
            onClick={() => setActiveCrmTab('clients')}
            className={`px-4 py-2 rounded-xl border font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeCrmTab === 'clients' ? 'bg-cyan-500/10 border-cyan-500/80 text-cyan-400' : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clients ({visibleClients.length})</span>
          </button>

          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setActiveCrmTab('agents')}
              className={`px-4 py-2 rounded-xl border font-bold transition flex items-center space-x-2 cursor-pointer ${
                activeCrmTab === 'agents' ? 'bg-cyan-500/10 border-cyan-500/80 text-cyan-400' : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4 text-cyan-400" />
              <span>Manage Agents ({agents.length})</span>
            </button>
          )}

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
              <span>Financial Adjustments</span>
            </button>
          )}

          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setActiveCrmTab('audit')}
              className={`px-4 py-2 rounded-xl border font-bold transition flex items-center space-x-2 cursor-pointer ${
                activeCrmTab === 'audit' ? 'bg-cyan-500/10 border-cyan-500/80 text-cyan-400' : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Audit Log</span>
            </button>
          )}
        </div>
      </div>

      {/* CONTENT WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 space-y-6">
        {/* DASHBOARD */}
        {activeCrmTab === 'dashboard' && (
          <div className="space-y-6 font-mono">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
                <div className="text-slate-500 text-[10px] uppercase">Real Client Accounts</div>
                <div className="text-2xl font-bold text-white mt-1">{metrics.totalClients}</div>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
                <div className="text-slate-500 text-[10px] uppercase">Total Portfolio Capital</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">${metrics.totalBal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
                <div className="text-slate-500 text-[10px] uppercase">Allocated Credit Bonuses</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">${metrics.totalBonus.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
                <div className="text-slate-500 text-[10px] uppercase">Compliance Verification</div>
                <div className="text-2xl font-bold text-cyan-400 mt-1">{metrics.verifiedRatio}%</div>
              </div>
            </div>
          </div>
        )}

        {/* CLIENTS TAB */}
        {activeCrmTab === 'clients' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/40 p-4 border border-slate-800 rounded-2xl font-mono text-xs">
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input 
                  type="text"
                  placeholder="Search client records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>Displaying {visibleClients.length} real accounts</div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden font-mono text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                    <th className="py-4 px-6">Client</th>
                    <th className="py-4 px-6">Stage</th>
                    <th className="py-4 px-6">KYC</th>
                    <th className="py-4 px-6">Balance & Bonus</th>
                    <th className="py-4 px-6">Assigned Agent</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {visibleClients.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-slate-500">No real clients registered yet.</td>
                    </tr>
                  ) : (
                    visibleClients.map((client) => (
                      <tr key={client.id} className="hover:bg-slate-800/20">
                        <td className="py-4 px-6">
                          <div className="font-bold text-white">{client.name}</div>
                          <div className="text-[10px] text-slate-500">{client.email}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-cyan-400 font-bold">{client.stage}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold ${client.kycStatus === 'VERIFIED' ? 'text-emerald-400 border border-emerald-500/30' : 'text-amber-400 border border-amber-500/30'}`}>
                            {client.kycStatus}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-emerald-400 font-bold">${parseFloat(client.balanceUSD || 0).toFixed(2)}</div>
                          <div className="text-amber-400 text-[10px]">Bonus: ${parseFloat(client.bonusUSD || 0).toFixed(2)}</div>
                        </td>
                        <td className="py-4 px-6">
                          {currentUser.role === 'ADMIN' ? (
                            <select
                              value={client.assignedAgent || 'Unassigned'}
                              onChange={(e) => handleAssignAgent(client.id, e.target.value)}
                              className="bg-slate-950 border border-slate-800 text-cyan-400 rounded px-2 py-1"
                            >
                              <option value="Unassigned">Unassigned</option>
                              {agents.map(ag => (
                                <option key={ag.id} value={ag.name}>{ag.name}</option>
                              ))}
                            </select>
                          ) : (
                            <span>{client.assignedAgent || 'Unassigned'}</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                          <button onClick={() => setSelectedClientDetail(client)} className="px-3 py-1 bg-slate-800 text-white rounded-lg">View</button>
                          <button onClick={() => startCall(client)} className="px-3 py-1 bg-emerald-600/20 text-emerald-400 rounded-lg">Dial</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AGENTS MANAGEMENT TAB (ADMIN ONLY) */}
        {activeCrmTab === 'agents' && currentUser.role === 'ADMIN' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs">
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-2 flex items-center space-x-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Create New Agent</span>
              </h2>
              <form onSubmit={handleCreateAgent} className="space-y-4">
                <div>
                  <label className="block text-slate-400 mb-1">Agent Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Agent Email</label>
                  <input 
                    type="email" 
                    required
                    value={newAgentEmail}
                    onChange={(e) => setNewAgentEmail(e.target.value)}
                    placeholder="sarah@meridianmarket.net"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Password</label>
                  <input 
                    type="password" 
                    required
                    value={newAgentPassword}
                    onChange={(e) => setNewAgentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <button type="submit" className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl uppercase">
                  Add Agent
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-2">Active Agents List</h2>
              {agents.length === 0 ? (
                <div className="text-slate-500 py-4">No custom agents added yet.</div>
              ) : (
                <div className="space-y-2">
                  {agents.map(ag => (
                    <div key={ag.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center">
                      <div>
                        <div className="font-bold text-white">{ag.name}</div>
                        <div className="text-slate-400">{ag.email}</div>
                      </div>
                      <div className="text-cyan-400 text-[10px]">Added: {ag.createdAt}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* REGISTER CLIENT TAB */}
        {activeCrmTab === 'registration' && (
          <div className="max-w-md mx-auto bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4 font-mono text-xs">
            <h2 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-2">Register Real Client</h2>
            <form onSubmit={handleRegisterClient} className="space-y-4">
              <div>
                <label className="block text-slate-400 mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Email</label>
                <input 
                  type="email" 
                  required
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Phone</label>
                <input 
                  type="text" 
                  required
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              {currentUser.role === 'ADMIN' && (
                <div>
                  <label className="block text-slate-400 mb-1">Assign Agent</label>
                  <select 
                    value={newClientAgent} 
                    onChange={(e) => setNewClientAgent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Unassigned">Unassigned</option>
                    {agents.map(ag => <option key={ag.id} value={ag.name}>{ag.name}</option>)}
                  </select>
                </div>
              )}
              <button type="submit" className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl uppercase">
                Save Client
              </button>
            </form>
          </div>
        )}

        {/* FINANCIAL OPS TAB (FIXED BALANCE ADJUSTMENT) */}
        {activeCrmTab === 'financial_ops' && currentUser.role === 'ADMIN' && (
          <div className="max-w-md mx-auto bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4 font-mono text-xs">
            <h2 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-2">Manual Balance Adjustment</h2>
            <form onSubmit={handleManualBalanceAdjustment} className="space-y-4">
              <div>
                <label className="block text-slate-400 mb-1">Select Account</label>
                <select 
                  value={selectedClientId} 
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="">Select account...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} (Bal: ${parseFloat(c.balanceUSD || 0).toFixed(2)})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  type="button" 
                  onClick={() => setAdjustmentType('ADD')}
                  className={`py-2 rounded-xl font-bold border ${adjustmentType === 'ADD' ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-400'}`}
                >
                  + Add
                </button>
                <button 
                  type="button" 
                  onClick={() => setAdjustmentType('MINUS')}
                  className={`py-2 rounded-xl font-bold border ${adjustmentType === 'MINUS' ? 'bg-rose-600 text-white' : 'bg-slate-950 text-slate-400'}`}
                >
                  - Deduct
                </button>
                <button 
                  type="button" 
                  onClick={() => setAdjustmentType('BONUS')}
                  className={`py-2 rounded-xl font-bold border ${adjustmentType === 'BONUS' ? 'bg-amber-600 text-white' : 'bg-slate-950 text-slate-400'}`}
                >
                  + Bonus
                </button>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Amount (USD)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <button type="submit" className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl uppercase">
                Execute Adjustment
              </button>
            </form>
          </div>
        )}

        {/* AUDIT LOG TAB */}
        {activeCrmTab === 'audit' && currentUser.role === 'ADMIN' && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4 font-mono text-xs">
            <h2 className="text-xs font-bold text-white uppercase border-b border-slate-800 pb-2">Audit Logs</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {auditLogs.map(log => (
                <div key={log.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between">
                  <div>
                    <span className="text-cyan-400 font-bold">[{log.action}]</span>
                    <span className="text-white ml-2">{log.details}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">{log.timestamp}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}