// src/data/mockCrmData.js

export const INITIAL_AGENTS = [
  { id: 'agent-1', name: 'Sarah Jenkins', email: 'sarah@meridian.com', activeClients: 12 },
  { id: 'agent-2', name: 'Marcus Vance', email: 'marcus@meridian.com', activeClients: 8 },
];

export const INITIAL_CLIENTS = [
  {
    id: 'usr-101',
    fullName: 'Alex Vance',
    email: 'alex.vance@example.com',
    phone: '+1 (555) 234-5678',
    country: 'United States',
    ipAddress: '192.168.1.45',
    registrationDate: '2026-08-01 14:22',
    kycStatus: 'PENDING',
    kycDocUrl: 'https://via.placeholder.com/400x250?text=Passport+Front',
    assignedAgentId: 'agent-1',
    assignedAgentName: 'Sarah Jenkins',
    balance: 10000.00,
    equity: 10450.20,
    status: 'Active',
  },
  {
    id: 'usr-102',
    fullName: 'David Miller',
    email: 'david.m@example.com',
    phone: '+44 20 7946 0912',
    country: 'United Kingdom',
    ipAddress: '82.132.210.12',
    registrationDate: '2026-08-05 09:15',
    kycStatus: 'UNVERIFIED',
    kycDocUrl: null,
    assignedAgentId: 'UNASSIGNED',
    assignedAgentName: 'Unassigned',
    balance: 2500.00,
    equity: 2500.00,
    status: 'Lead',
  },
];

export const INITIAL_DEPOSITS = [
  {
    id: 'dep-9901',
    clientId: 'usr-101',
    clientName: 'Alex Vance',
    amount: 5000,
    asset: 'USDT (TRC20)',
    txHash: '0x8f3b...91c2',
    status: 'PENDING',
    date: '2026-08-08 18:30',
  },
];