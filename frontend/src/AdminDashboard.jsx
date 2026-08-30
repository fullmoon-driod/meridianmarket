import React, { useState } from 'react';
import { 
  Shield, 
  Users, 
  FileText, 
  DollarSign, 
  Search, 
  CheckCircle, 
  XCircle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Edit3,
  LogOut,
  Bell,
  Lock,
  UserCheck,
  UserX,
  Circle
} from 'lucide-react';

export default function AdminCrm() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null); // 'admin' | 'agent'
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedRoleOption, setSelectedRoleOption] = useState('admin');

  // Navigation tab state
  const [activeTab, setActiveTab] = useState('clients');
  const [searchQuery, setSearchQuery] = useState('');

  // Agents List State
  const [availableAgents] = useState(['Sarah Jenkins', 'Marcus Vance', 'Unassigned']);

  // Client Data State (includes online status)
  const [clients, setClients] = useState([
    {
      id: 'CL-8821',
      name: 'Alex Vance',
      email: 'alex.vance@gmail.com',
      phone: '+1 (555) 234-5678',
      ip: '192.168.1.45 (New York, United States)',
      assignedAgent: 'Sarah Jenkins',
      kycStatus: 'REJECTED',
      balance: 12500.00,
      equity: 12500.00,
      isOnline: true
    },
    {
      id: 'CL-4109',
      name: 'David Miller',
      email: 'david.m@yahoo.com',
      phone: '+44 20 7946 0912',
      ip: '82.165.197.1 (London, United Kingdom)',
      assignedAgent: 'Marcus Vance',
      kycStatus: 'VERIFIED',
      balance: 45000.00,
      equity: 48210.50,
      isOnline: false
    }
  ]);

  // Pending Deposit / Withdrawal Requests State
  const [fundingRequests, setFundingRequests] = useState([
    {
      id: 'REQ-101',
      clientId: 'CL-4109',
      clientName: 'David Miller',
      type: 'DEPOSIT',
      amount: 5000.00,
      method: 'Crypto (USDT-TRC20)',
      date: '2026-08-09 08:30 AM',
      status: 'PENDING'
    },
    {
      id: 'REQ-102',
      clientId: 'CL-8821',
      clientName: 'Alex Vance',
      type: 'WITHDRAWAL',
      amount: 1200.00,
      method: 'Bank Wire',
      date: '2026-08-09 07:15 AM',
      status: 'PENDING'
    }
  ]);

  // Notifications State (visible to both Admin & Agents)
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'David Miller initiated a DEPOSIT request of $5,000.00', time: '08:30 AM', unread: true },
    { id: 2, message: 'Alex Vance initiated a WITHDRAWAL request of $1,200.00', time: '07:15 AM', unread: true }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Direct Balance Adjustment Modal State
  const [selectedClientForAdjust, setSelectedClientForAdjust] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState('CREDIT');

  // --- Login Handler ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (!usernameInput || !passwordInput) {
      alert("Please enter both username and password.");
      return;
    }
    // Simple demo authentication logic
    setUserRole(selectedRoleOption);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setUsernameInput('');
    setPasswordInput('');
  };

  // --- Handlers ---
  const handleApproveRequest = (request) => {
    setClients(prevClients =>
      prevClients.map(client => {
        if (client.id === request.clientId) {
          const delta = request.type === 'DEPOSIT' ? request.amount : -request.amount;
          return {
            ...client,
            balance: client.balance + delta,
            equity: client.equity + delta
          };
        }
        return client;
      })
    );
    setFundingRequests(prev => prev.filter(r => r.id !== request.id));
    alert(`APPROVED: ${request.type} of $${request.amount.toLocaleString()} for ${request.clientName}. Account balance updated.`);
  };

  const handleRejectRequest = (requestId) => {
    setFundingRequests(prev => prev.filter(r => r.id !== requestId));
  };

  const handleDirectBalanceAdjust = (e) => {
    e.preventDefault();
    if (!adjustAmount || isNaN(adjustAmount) || Number(adjustAmount) <= 0) {
      alert("Please enter a valid positive amount.");
      return;
    }
    const val = parseFloat(adjustAmount);
    const delta = adjustType === 'CREDIT' ? val : -val;
    setClients(prevClients =>
      prevClients.map(client => {
        if (client.id === selectedClientForAdjust.id) {
          return {
            ...client,
            balance: client.balance + delta,
            equity: client.equity + delta
          };
        }
        return client;
      })
    );
    alert(`Successfully ${adjustType === 'CREDIT' ? 'credited' : 'debited'} $${val.toLocaleString()} to ${selectedClientForAdjust.name}'s account.`);
    setSelectedClientForAdjust(null);
    setAdjustAmount('');
  };

  const handleAssignAgent = (clientId, newAgent) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, assignedAgent: newAgent } : c));
  };

  // Filter clients by search query
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- 1. LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center p-4 font-sans text-slate-200">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
              <Shield className="w-8 h-8 text-cyan-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-center text-white uppercase tracking-wider mb-1">CRM Portal Login</h2>
          <p className="text-xs text-slate-400 text-center mb-6">Select your portal role to authenticate</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Login As</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRoleOption('admin')}
                  className={`py-2 text-xs font-bold rounded-lg border transition ${
                    selectedRoleOption === 'admin' 
                      ? 'bg-cyan-600/20 text-cyan-400 border-cyan-500' 
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  Administrator
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRoleOption('agent')}
                  className={`py-2 text-xs font-bold rounded-lg border transition ${
                    selectedRoleOption === 'agent' 
                      ? 'bg-cyan-600/20 text-cyan-400 border-cyan-500' 
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  Agent
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Username</label>
              <input 
                type="text" 
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder={selectedRoleOption === 'admin' ? 'admin' : 'agent_sarah'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Password</label>
              <input 
                type="password" 
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-cyan-600/30 mt-4"
            >
              Sign In to {selectedRoleOption === 'admin' ? 'Admin Suite' : 'Agent Portal'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- 2. CRM MAIN PORTAL ---
  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-200 font-sans p-6">
      {/* Top Header */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
            <Shield className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider text-white uppercase">Meridian CRM Suite</h1>
            <p className="text-xs text-slate-400">
              Active Role: <span className="text-cyan-400 font-semibold capitalize">{userRole === 'admin' ? 'Master Admin' : 'Agent Access'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 hover:text-white"
            >
              <Bell className="w-5 h-5" />
              {notifications.some(n => n.unread) && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-4">
                <h3 className="text-xs font-bold text-white uppercase mb-3 flex items-center justify-between">
                  <span>Activity Feed</span>
                  <span className="text-[10px] text-cyan-400 font-mono">{notifications.length} New</span>
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {notifications.map(n => (
                    <div key={n.id} className="p-2 bg-slate-950 rounded-lg border border-slate-800/80 text-xs">
                      <p className="text-slate-300">{n.message}</p>
                      <span className="text-[10px] text-slate-500">{n.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={handleLogout}
            className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-2 bg-slate-900/80 p-1.5 border border-slate-800 rounded-xl">
          <button 
            onClick={() => setActiveTab('clients')}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'clients' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clients ({clients.length})</span>
          </button>

          {userRole === 'admin' && (
            <>
              <button 
                onClick={() => setActiveTab('kyc')}
                className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg transition ${
                  activeTab === 'kyc' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>KYC Queue (0)</span>
              </button>

              <button 
                onClick={() => setActiveTab('funding')}
                className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg transition relative ${
                  activeTab === 'funding' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>Financial Approvals</span>
                {fundingRequests.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-rose-500 text-white font-bold rounded-full">
                    {fundingRequests.length}
                  </span>
                )}
              </button>
            </>
          )}
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input 
            type="text" 
            placeholder={userRole === 'admin' ? "Search IP, name, phone..." : "Search client name or ID..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800 text-xs text-slate-200 pl-9 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-cyan-500 transition"
          />
        </div>
      </div>

      {/* --- TAB 1: CLIENTS TABLE --- */}
      {activeTab === 'clients' && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/40 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Status & Client</th>
                  <th className="p-4">
                    {userRole === 'admin' ? 'Contact & IP Details (Admin Only)' : 'Restricted Info'}
                  </th>
                  <th className="p-4">Account Balance</th>
                  <th className="p-4">Assigned Agent</th>
                  <th className="p-4">KYC Status</th>
                  {userRole === 'admin' && <th className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-800/20 transition">
                    {/* Client Name + Online Status Indicator */}
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <Circle 
                          className={`w-2.5 h-2.5 fill-current ${
                            client.isOnline ? 'text-emerald-400' : 'text-slate-600'
                          }`} 
                        />
                        <span className="font-bold text-white text-sm">{client.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono ml-4">
                        ID: {client.id} • {client.isOnline ? 'ONLINE NOW' : 'OFFLINE'}
                      </div>
                    </td>

                    {/* Sensitive Data Logic: Only Admin sees IP, Email, Phone */}
                    <td className="p-4 space-y-0.5">
                      {userRole === 'admin' ? (
                        <>
                          <div className="text-cyan-400 font-medium">{client.email}</div>
                          <div className="text-slate-400">{client.phone}</div>
                          <div className="text-[10px] text-slate-500">🌐 IP: {client.ip}</div>
                        </>
                      ) : (
                        <div className="flex items-center space-x-1 text-slate-500 font-mono text-[11px]">
                          <Lock className="w-3 h-3 text-slate-600" />
                          <span>[Hidden - Admin Privilege]</span>
                        </div>
                      )}
                    </td>

                    {/* Financial Data */}
                    <td className="p-4">
                      <div className="font-bold text-white font-mono text-sm">
                        ${client.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Equity: ${client.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </td>

                    {/* Assign Agent Control */}
                    <td className="p-4">
                      {userRole === 'admin' ? (
                        <select 
                          value={client.assignedAgent} 
                          onChange={(e) => handleAssignAgent(client.id, e.target.value)}
                          className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-2 py-1 focus:border-cyan-500"
                        >
                          {availableAgents.map(ag => (
                            <option key={ag} value={ag}>{ag}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-medium text-slate-300">{client.assignedAgent}</span>
                      )}
                    </td>

                    {/* KYC Status */}
                    <td className="p-4">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                        client.kycStatus === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        client.kycStatus === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {client.kycStatus}
                      </span>
                    </td>

                    {/* Actions: Admin Only */}
                    {userRole === 'admin' && (
                      <td className="p-4 text-right space-x-2">
                        <button 
                          onClick={() => setSelectedClientForAdjust(client)}
                          className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600 border border-cyan-500/30 text-cyan-300 hover:text-white font-semibold rounded-lg transition text-xs inline-flex items-center space-x-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Adjust Balance</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 2: KYC QUEUE (ADMIN) --- */}
      {activeTab === 'kyc' && userRole === 'admin' && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500">
          <CheckCircle className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-sm">The KYC Verification Queue is currently empty.</p>
        </div>
      )}

      {/* --- TAB 3: FINANCIAL DEPOSIT & WITHDRAWAL APPROVALS (ADMIN) --- */}
      {activeTab === 'funding' && userRole === 'admin' && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Pending Financial Approvals</h2>
              <p className="text-xs text-slate-400">Approving a request directly updates the client's live trading account balance.</p>
            </div>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-lg">
              Admin Privilege Locked
            </span>
          </div>

          {fundingRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <CheckCircle className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-sm">No pending deposit or withdrawal requests.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/40 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Request ID & Date</th>
                    <th className="p-4">Client</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Payment Method</th>
                    <th className="p-4 text-right">Admin Authorization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {fundingRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-800/20 transition">
                      <td className="p-4">
                        <div className="font-bold text-white font-mono">{req.id}</div>
                        <div className="text-[10px] text-slate-500">{req.date}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-white">{req.clientName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">ID: {req.clientId}</div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          req.type === 'DEPOSIT' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {req.type === 'DEPOSIT' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          <span>{req.type}</span>
                        </span>
                      </td>
                      <td className="p-4 font-bold text-white font-mono text-sm">
                        ${req.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-slate-300 font-medium">
                        {req.method}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button 
                          onClick={() => handleApproveRequest(req)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition text-xs shadow-lg shadow-emerald-600/20 inline-flex items-center space-x-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Approve & Add Balance</span>
                        </button>
                        <button 
                          onClick={() => handleRejectRequest(req.id)}
                          className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 font-semibold rounded-lg transition text-xs inline-flex items-center space-x-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- DIRECT BALANCE ADJUSTMENT MODAL (ADMIN) --- */}
      {selectedClientForAdjust && userRole === 'admin' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-1">Direct Balance Adjustment</h3>
            <p className="text-xs text-slate-400 mb-4">
              Adjusting balance for client: <span className="text-cyan-400 font-bold">{selectedClientForAdjust.name}</span> ({selectedClientForAdjust.id})
            </p>
            <form onSubmit={handleDirectBalanceAdjust} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('CREDIT')}
                    className={`py-2 text-xs font-bold rounded-lg border transition ${
                      adjustType === 'CREDIT' 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    + Credit (Add Funds)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('DEBIT')}
                    className={`py-2 text-xs font-bold rounded-lg border transition ${
                      adjustType === 'DEBIT' 
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    - Debit (Deduct Funds)
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Amount ($ USD)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="e.g. 5000.00"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedClientForAdjust(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition shadow-lg shadow-cyan-600/30"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}