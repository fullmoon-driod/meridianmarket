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
  EyeOff
} from 'lucide-react';

export default function AdminPortal() {
  // -------------------------------------------------------------
  // 1. AUTH & ROLE MANAGEMENT
  // -------------------------------------------------------------
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('crm_current_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
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
      localStorage.setItem('crm_current_user', JSON.stringify(user));
      return;
    }

    if (loginEmail === 'agent@meridian.com' && loginPassword === 'agent123') {
      const user = { name: 'Sarah Jenkins', email: loginEmail, role: 'AGENT', agentId: 'Sarah Jenkins' };
      setCurrentUser(user);
      localStorage.setItem('crm_current_user', JSON.stringify(user));
      return;
    }

    setLoginError('Invalid credentials. Use admin@meridian.com / admin123 or agent@meridian.com / agent123');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('crm_current_user');
  };

  // -------------------------------------------------------------
  // 2. STATE & SEARCH
  // -------------------------------------------------------------
  const [activeCrmTab, setActiveCrmTab] = useState('assigned');
  const [searchQuery, setSearchQuery] = useState('');
  const availableAgents = ['Sarah Jenkins', 'Marcus Vance', 'Alex Rivera', 'Unassigned'];

  // -------------------------------------------------------------
  // 3. CLIENTS DATA (Safe LocalStorage Parsing)
  // -------------------------------------------------------------
  const [clients, setClients] = useState(() => {
    const savedClients = localStorage.getItem('crm_clients');
    if (savedClients) {
      try {
        return JSON.parse(savedClients);
      } catch (e) {
        console.error("Error parsing stored clients:", e);
      }
    }
    return [
      {
        id: 'CL-8821',
        name: 'Alex Vance',
        email: 'alex.vance@gmail.com',
        phone: '+1 (555) 234-5678',
        ip: '192.168.1.45 (New York, US)',
        assignedAgent: 'Sarah Jenkins',
        kycStatus: 'REJECTED',
        balanceUSD: 500.00,
        bonusUSD: 0.00,
        callNotes: ['Called on 10/08: Expressed interest in crypto trading.']
      },
      {
        id: 'CL-4109',
        name: 'David Miller',
        email: 'david.m@yahoo.com',
        phone: '+44 20 7946 0912',
        ip: '82.165.197.1 (London, UK)',
        assignedAgent: 'Marcus Vance',
        kycStatus: 'VERIFIED',
        balanceUSD: 10480.20,
        bonusUSD: 250.00,
        callNotes: ['Awaiting follow-up regarding foreign exchange leverage options.']
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('crm_clients', JSON.stringify(clients));
  }, [clients]);

  // Memoize visible clients to prevent infinite re-render loop
  const visibleClients = useMemo(() => {
    return clients.filter(c => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        (c.name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.id || '').toLowerCase().includes(q) ||
        (c.ip || '').toLowerCase().includes(q);

      if (!currentUser) return false;
      if (currentUser.role === 'ADMIN') return matchesSearch;
      
      return matchesSearch && c.assignedAgent === currentUser.agentId;
    });
  }, [clients, searchQuery, currentUser]);

  // -------------------------------------------------------------
  // 4. KYC & FINANCIAL QUEUES
  // -------------------------------------------------------------
  const [kycQueue, setKycQueue] = useState([
    {
      id: 'CL-9012',
      name: 'Elena Rostova',
      email: 'elena.r@outmail.com',
      docType: 'Passport',
      docId: 'P-8820192',
      submittedAt: '10:14 AM Today',
      ip: '103.22.201.4 (Manila, Philippines)'
    }
  ]);

  const [pendingTransactions, setPendingTransactions] = useState([
    {
      id: 'TX-9901',
      clientId: 'CL-4109',
      clientName: 'David Miller',
      type: 'DEPOSIT',
      amountUSD: 2500.00,
      localCurrency: '500.00 GBP',
      method: 'UK Bank Wire (HSBC)',
      requestedAt: '11:05 AM Today',
      status: 'PENDING'
    }
  ]);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('ADD');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('Manual Credit Adjustment');

  useEffect(() => {
    if (visibleClients.length > 0 && !visibleClients.some(c => c.id === selectedClientId)) {
      setSelectedClientId(visibleClients[0].id);
    }
  }, [visibleClients, selectedClientId]);

  // Handlers
  const handleAssignAgent = (clientId, newAgent) => {
    setClients(clients.map(c => c.id === clientId ? { ...c, assignedAgent: newAgent } : c));
  };

  const handleApproveKyc = (item) => {
    const newClient = {
      id: item.id,
      name: item.name,
      email: item.email,
      phone: '+63 917 555 0192',
      ip: item.ip,
      assignedAgent: 'Unassigned',
      kycStatus: 'VERIFIED',
      balanceUSD: 0.00,
      bonusUSD: 0.00,
      callNotes: []
    };
    setClients([newClient, ...clients]);
    setKycQueue(kycQueue.filter(k => k.id !== item.id));
  };

  const handleRejectKyc = (id) => {
    setKycQueue(kycQueue.filter(k => k.id !== id));
  };

  const handleApproveTransaction = (tx) => {
    setClients(clients.map(client => {
      if (client.id === tx.clientId) {
        const delta = tx.type === 'DEPOSIT' ? tx.amountUSD : -tx.amountUSD;
        return { ...client, balanceUSD: Math.max(0, (client.balanceUSD || 0) + delta) };
      }
      return client;
    }));

    setPendingTransactions(pendingTransactions.filter(t => t.id !== tx.id));
  };

  const handleRejectTransaction = (tx) => {
    setPendingTransactions(pendingTransactions.filter(t => t.id !== tx.id));
  };

  const handleManualBalanceAdjustment = (e) => {
    e.preventDefault();
    const amt = parseFloat(adjustmentAmount);
    if (!amt || amt <= 0) return alert('Please enter a valid dollar amount.');

    setClients(clients.map(client => {
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

    const targetClient = clients.find(c => c.id === selectedClientId);
    setAdjustmentAmount('');
    alert(`Successfully processed ${adjustmentType} of $${amt.toFixed(2)} for ${targetClient?.name || 'Client'}.`);
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
    setTimeout(() => setCallStatus('CONNECTED'), 2000);
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

  const maskEmail = (email = '') => {
    if (currentUser?.role === 'ADMIN') return email;
    const parts = email.split('@');
    if (parts.length < 2) return '***@***';
    return `${parts[0].substring(0, 2)}***@${parts[1]}`;
  };

  const maskPhone = (phone = '') => {
    if (currentUser?.role === 'ADMIN') return phone;
    return phone.replace(/(\+\d{1,3}\s?)\d+(\d{4})/, '$1*** *** $2');
  };

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
            <p className="text-xs text-slate-400 font-mono">Back-Office Security Authentication</p>
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
            <p><strong>Admin Demo:</strong> admin@meridian.com / admin123</p>
            <p><strong>Agent Demo:</strong> agent@meridian.com / agent123</p>
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
      <header className="bg-slate-950 border-b border-slate-800/80 px-8 py-5 flex justify-between items-center">
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

        <button 
          onClick={handleLogout} 
          className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 rounded-xl font-mono flex items-center space-x-2 transition cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 text-slate-400" />
          <span>Exit Session</span>
        </button>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <div className="flex items-center space-x-3 font-mono">
            <button
              onClick={() => setActiveCrmTab('assigned')}
              className={`px-5 py-2.5 rounded-xl border text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                activeCrmTab === 'assigned'
                  ? 'bg-cyan-500/10 border-cyan-500/80 text-cyan-400'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{currentUser.role === 'ADMIN' ? 'All Clients' : 'My Clients'} ({visibleClients.length})</span>
            </button>

            {currentUser.role === 'ADMIN' && (
              <>
                <button
                  onClick={() => setActiveCrmTab('kyc_queue')}
                  className={`px-5 py-2.5 rounded-xl border text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                    activeCrmTab === 'kyc_queue'
                      ? 'bg-cyan-500/10 border-cyan-500/80 text-cyan-400'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <FileCheck className="w-4 h-4" />
                  <span>KYC Queue ({kycQueue.length})</span>
                </button>

                <button
                  onClick={() => setActiveCrmTab('financial_ops')}
                  className={`px-5 py-2.5 rounded-xl border text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                    activeCrmTab === 'financial_ops'
                      ? 'bg-cyan-500/10 border-cyan-500/80 text-cyan-400'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span>Financial Control ({pendingTransactions.length})</span>
                </button>
              </>
            )}
          </div>

          <div className="relative min-w-[320px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input 
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>
        </div>

        {activeCrmTab === 'assigned' && (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/60 text-slate-400 font-sans font-semibold">
                  <th className="py-4 px-6">Client Details</th>
                  <th className="py-4 px-6">Protected Contact</th>
                  <th className="py-4 px-6">Balance & Bonus</th>
                  <th className="py-4 px-6">Assigned Agent</th>
                  <th className="py-4 px-6">KYC Status</th>
                  <th className="py-4 px-6 text-right">Call Center</th>
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
                      <div className="text-cyan-400 font-semibold flex items-center space-x-1">
                        <span>{maskEmail(client.email)}</span>
                        {currentUser.role !== 'ADMIN' && <EyeOff className="w-3 h-3 text-slate-600 ml-1" />}
                      </div>
                      <div className="text-slate-300">{maskPhone(client.phone)}</div>
                      <div className="text-[10px] text-slate-500">🌐 IP: {client.ip}</div>
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
                          className="bg-slate-950 border border-slate-800 text-cyan-400 font-semibold rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500"
                        >
                          {availableAgents.map(ag => (
                            <option key={ag} value={ag}>{ag}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-slate-300 font-semibold">{client.assignedAgent || 'Unassigned'}</span>
                      )}
                    </td>

                    <td className="py-5 px-6">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                        client.kycStatus === 'VERIFIED' ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400' :
                        client.kycStatus === 'REJECTED' ? 'bg-slate-800 border border-slate-700 text-slate-400' :
                        'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                      }`}>
                        {client.kycStatus || 'PENDING'}
                      </span>
                    </td>

                    <td className="py-5 px-6 text-right">
                      <button 
                        onClick={() => startCall(client)}
                        className="px-3.5 py-1.5 bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 ml-auto cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Dial Client</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeCrmTab === 'kyc_queue' && currentUser.role === 'ADMIN' && (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-4">
            {kycQueue.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl">
                No pending identity verification submissions.
              </div>
            ) : (
              kycQueue.map((item) => (
                <div key={item.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 flex flex-wrap justify-between items-center gap-4 text-xs font-mono">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">{item.name}</span>
                      <span className="text-slate-500">({item.id})</span>
                    </div>
                    <div className="text-slate-400">
                      Email: <span className="text-white">{item.email}</span> | Document: <span className="text-white">{item.docType} ({item.docId})</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handleApproveKyc(item)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition flex items-center space-x-1 font-sans text-xs cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve & Register</span>
                    </button>
                    <button 
                      onClick={() => handleRejectKyc(item.id)}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 rounded-xl transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeCrmTab === 'financial_ops' && currentUser.role === 'ADMIN' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-4">
                <h2 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center space-x-2 pb-2 border-b border-slate-800">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>Pending Client Deposits & Withdrawals</span>
                </h2>

                {pendingTransactions.map((tx) => (
                  <div key={tx.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex justify-between items-center text-xs font-mono">
                    <div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tx.type === 'DEPOSIT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {tx.type}
                      </span>
                      <span className="font-bold text-white ml-2">{tx.clientName}</span>
                      <div className="text-slate-300 mt-1">Amount: ${tx.amountUSD.toFixed(2)} USD</div>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => handleApproveTransaction(tx)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-sans font-bold cursor-pointer">Approve</button>
                      <button onClick={() => handleRejectTransaction(tx)} className="px-3 py-1.5 bg-slate-900 text-slate-400 border border-slate-800 rounded-lg cursor-pointer">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-4">
              <h2 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center space-x-2 pb-2 border-b border-slate-800">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Balance & Bonus Credit</span>
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

                <button type="submit" className="w-full py-3 bg-cyan-500 text-slate-950 font-bold rounded-xl font-sans uppercase cursor-pointer">
                  Execute Order
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

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
            <div className="text-xs text-cyan-400">{maskPhone(activeCallClient.phone)}</div>
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