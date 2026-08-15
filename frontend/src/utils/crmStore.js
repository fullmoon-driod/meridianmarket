// src/utils/crmStore.js

const CLIENTS_STORAGE_KEY = 'meridian_crm_clients';

// Default initial seed data if localStorage is empty
const INITIAL_CLIENTS = [
  {
    id: 'CL-8821',
    fullName: 'Alex Vance',
    email: 'alex.vance@gmail.com',
    phone: '+1 (555) 234-5678',
    ipAddress: '192.168.1.45',
    country: 'United States',
    city: 'New York',
    userAgent: 'Chrome / Windows',
    assignedAgentId: 'agent-1',
    assignedAgentName: 'Sarah Jenkins',
    balance: 12500.00,
    equity: 12500.00,
    kycStatus: 'PENDING', // PENDING, VERIFIED, REJECTED, UNSUBMITTED
    kycDocs: {
      idCardUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
      proofOfAddressUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      submittedAt: '2026-08-08 14:22',
      rejectionReason: ''
    },
    registeredAt: '2026-08-08 14:10'
  },
  {
    id: 'CL-4109',
    fullName: 'David Miller',
    email: 'david.m@yahoo.com',
    phone: '+44 20 7946 0912',
    ipAddress: '82.165.197.1',
    country: 'United Kingdom',
    city: 'London',
    userAgent: 'Safari / macOS',
    assignedAgentId: 'agent-2',
    assignedAgentName: 'Marcus Vance',
    balance: 5000.00,
    equity: 5000.00,
    kycStatus: 'VERIFIED',
    kycDocs: {
      idCardUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
      proofOfAddressUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      submittedAt: '2026-08-05 09:15',
      rejectionReason: ''
    },
    registeredAt: '2026-08-05 09:00'
  }
];

// Load clients from localStorage or initialize defaults
export const getStoredClients = () => {
  const stored = localStorage.getItem(CLIENTS_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(INITIAL_CLIENTS));
    return INITIAL_CLIENTS;
  }
  return JSON.parse(stored);
};

// Save clients back to localStorage
export const saveClients = (clients) => {
  localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
};

// Scraping Helper: Fetch IP & Location details automatically
export const fetchClientMetadata = async () => {
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) throw new Error('API limit or network block');
    const data = await res.json();
    return {
      ipAddress: data.ip || '127.0.0.1',
      country: data.country_name || 'Unknown Location',
      city: data.city || 'Unknown City',
      userAgent: navigator.userAgent.includes('Windows') ? 'Windows Device' : 'Mobile / Web'
    };
  } catch (err) {
    // Fallback metadata if IP API is blocked locally
    return {
      ipAddress: '197.210.44.' + Math.floor(Math.random() * 200 + 10),
      country: 'United States',
      city: 'Dallas',
      userAgent: 'Chrome / Desktop'
    };
  }
};

// Register new client with automatic metadata scraping & agent assignment
export const registerNewClient = async (formData) => {
  const scrapedMeta = await fetchClientMetadata();
  const clients = getStoredClients();

  // Simple round-robin agent assignment
  const agents = [
    { id: 'agent-1', name: 'Sarah Jenkins' },
    { id: 'agent-2', name: 'Marcus Vance' }
  ];
  const assignedAgent = agents[clients.length % agents.length];

  const newClient = {
    id: `CL-${Math.floor(1000 + Math.random() * 9000)}`,
    fullName: formData.fullName,
    email: formData.email,
    phone: formData.phone || '+1 (555) 000-0000',
    ipAddress: scrapedMeta.ipAddress,
    country: scrapedMeta.country,
    city: scrapedMeta.city,
    userAgent: scrapedMeta.userAgent,
    assignedAgentId: assignedAgent.id,
    assignedAgentName: assignedAgent.name,
    balance: 0.00,
    equity: 0.00,
    kycStatus: 'UNSUBMITTED',
    kycDocs: null,
    registeredAt: new Date().toLocaleString()
  };

  const updatedClients = [newClient, ...clients];
  saveClients(updatedClients);
  return newClient;
};