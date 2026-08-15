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
  LogOut 
} from 'lucide-react';

export default function AdminCrm() {
  // Navigation tab state
  const [activeTab, setActiveTab] = useState('funding'); // Defaulting to funding view

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Client Data State
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
      equity: 12500.00
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
      equity: 48210.50
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

  // Direct Balance Adjustment Modal State
  const [selectedClientForAdjust, setSelectedClientForAdjust] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState('CREDIT'); // 'CREDIT' or 'DEBIT'

  // --- Handlers ---

  // 1. Approve Funding Request (Updates user balance automatically)
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

    // Remove processed request
    setFundingRequests(prev => prev.filter(r => r.id !== request.id));
    alert(`APPROVED: ${request.type} of $${request.amount.toLocaleString()} for ${request.clientName}. Account balance updated.`);
  };

  // 2. Reject Funding Request
  const handleRejectRequest = (requestId) => {
    setFundingRequests(prev => prev.filter(r => r.id !== requestId));
  };

  // 3. Manual Direct Balance Adjustment
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

  // Filter clients by search query
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-200 font-sans p-6">
      {/* Top Header */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
            <Shield className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider text-white uppercase">Meridian CRM & KYC Suite</h1>
            <p className="text-xs text-slate-400">Agent: <span className="text-cyan-400 font-semibold">Master Admin (MASTER_ADMIN)</span></p>
          </div>
        </div>

        <button className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition">
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>

      {/* Main Controls & Search Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 bg-slate-900/80 p-1.5 border border-slate-800 rounded-xl">
          <button 
            onClick={() => setActiveTab('clients')}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'clients' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Assigned Clients ({clients.length})</span>
          </button>

          <button 
            onClick={() => setActiveTab('kyc')}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'kyc' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>KYC Verification Queue (0)</span>
          </button>

          <button 
            onClick={() => setActiveTab('funding')}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg transition relative ${
              activeTab === 'funding' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Deposit & Withdrawal Requests</span>
            {fundingRequests.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-rose-500 text-white font-bold rounded-full">
                {fundingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input 
            type="text" 
            placeholder="Search scraped IP, name, phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800 text-xs text-slate-200 pl-9 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-cyan-500 transition"
          />
        </div>
      </div>

      {/* --- TAB 1: ASSIGNED CLIENTS --- */}
      {activeTab === 'clients' && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/40 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Client Profile</th>
                  <th className="p-4">Scraped Registration Metadata</th>
                  <th className="p-4">Account Balance</th>
                  <th className="p-4">Assigned Agent</th>
                  <th className="p-4">KYC Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-800/20 transition">
                    <td className="p-4">
                      <div className="font-bold text-white text-sm">{client.name}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">ID: {client.id}</div>
                    </td>

                    <td className="p-4 space-y-0.5">
                      <div className="text-cyan-400 font-medium">{client.email}</div>
                      <div className="text-slate-400">{client.phone}</div>
                      <div className="text-[10px] text-slate-500 flex items-center space-x-1">
                        <span>🌐 IP: {client.ip}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-white font-mono text-sm">${client.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                      <div className="text-[10px] text-slate-400">Equity: ${client.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    </td>

                    <td className="p-4 font-medium text-slate-300">
                      {client.assignedAgent}
                    </td>

                    <td className="p-4">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                        client.kycStatus === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        client.kycStatus === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {client.kycStatus}
                      </span>
                    </td>

                    <td className="p-4 text-right space-x-2">
                      <button 
                        onClick={() => setSelectedClientForAdjust(client)}
                        className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600 border border-cyan-500/30 text-cyan-300 hover:text-white font-semibold rounded-lg transition text-xs inline-flex items-center space-x-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Adjust Balance</span>
                      </button>

                      <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition text-xs border border-slate-700">
                        Review Documents
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 2: KYC VERIFICATION QUEUE --- */}
      {activeTab === 'kyc' && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500">
          <CheckCircle className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-sm">The KYC Verification Queue is currently empty.</p>
        </div>
      )}

      {/* --- TAB 3: FINANCIAL DEPOSIT & WITHDRAWAL APPROVALS --- */}
      {activeTab === 'funding' && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Pending Financial Approvals</h2>
              <p className="text-xs text-slate-400">Approving a request directly updates the client's live trading account equity.</p>
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
                    <th className="p-4">Status</th>
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

                      <td className="p-4">
                        <div className="font-bold text-white font-mono text-sm">
                          ${req.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </td>

                      <td className="p-4 text-slate-300 font-medium">
                        {req.method}
                      </td>

                      <td className="p-4">
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                          PENDING APPROVAL
                        </span>
                      </td>

                      <td className="p-4 text-right space-x-2">
                        <button 
                          onClick={() => handleApproveRequest(req)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition text-xs shadow-lg shadow-emerald-600/20 inline-flex items-center space-x-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Approve & Adjust Balance</span>
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

      {/* --- DIRECT BALANCE ADJUSTMENT MODAL --- */}
      {selectedClientForAdjust && (
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