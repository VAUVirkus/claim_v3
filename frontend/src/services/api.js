// API Client connecting to Elysia.js backend with full offline fallback and queueing
const API_BASE = 'http://localhost:3001/api';

// Offline state simulation
let forceOffline = false;

export const setForceOffline = (val) => {
  forceOffline = Boolean(val);
  window.dispatchEvent(new CustomEvent('vau_network_status_change', { detail: { isOffline: forceOffline } }));
};

export const getForceOffline = () => forceOffline;

// Offline queue stored in localStorage (Spec 4.3)
const QUEUE_KEY = 'vau_claim_offline_queue';

export const getOfflineQueue = () => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const saveOfflineQueue = (queue) => {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent('vau_queue_updated', { detail: { count: queue.length } }));
};

export const addToOfflineQueue = (action, data) => {
  const queue = getOfflineQueue();
  const localId = `UUID-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  const item = {
    localId,
    action,
    data,
    createdAt: new Date().toISOString(),
    status: 'PENDING',
  };
  queue.push(item);
  saveOfflineQueue(queue);
  return item;
};

// Generic fetch with timeout & error handling
async function request(endpoint, options = {}) {
  if (forceOffline) {
    throw new Error('NETWORK_OFFLINE');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || errData.message || `HTTP ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// 1. Client Code Verification (Spec 2.4 F2)
export const validateClientCode = async (code) => {
  try {
    return await request('/auth/client', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  } catch (err) {
    // Local fallback for prototyping if backend is not yet started or offline
    const testDealers = {
      '1001': { code: '1001', name: 'AS Ehitusgrupp', contactPerson: 'Mati Mets', email: 'mati.mets@ehitusgrupp.ee', phone: '+372 5551 2345', address: 'Kadaka tee 42, Tallinn', country: 'EST', isTest: false },
      '2002': { code: '2002', name: 'Fenestra Bygg AB', contactPerson: 'Lars Lindqvist', email: 'lars@fenestrabygg.se', phone: '+46 8 123 4567', address: 'Kungsgatan 15, Stockholm', country: 'SWE', isTest: false },
      '3003': { code: '3003', name: 'Suomi Ovi ja Ikkuna Oy', contactPerson: 'Eero Nieminen', email: 'eero.nieminen@suomiovi.fi', phone: '+358 9 555 7890', address: 'Mannerheimintie 88, Helsinki', country: 'FIN', isTest: false },
      'TEST01': { code: 'TEST01', name: 'VAU Arendus & Testklient', contactPerson: 'Test Kasutaja', email: 'test@vau.ee', phone: '+372 5000 0000', address: 'Puidu 1, Viljandi', country: 'EST', isTest: true },
    };

    const trimmed = String(code).trim();
    const dealer = testDealers[trimmed] || (trimmed.toUpperCase().startsWith('TEST') ? {
      code: trimmed,
      name: `Testklient (${trimmed})`,
      contactPerson: 'Testija',
      email: 'test@vau.ee',
      phone: '+372 500 0000',
      address: 'Viljandi',
      country: 'EST',
      isTest: true,
    } : null);

    if (dealer) {
      return { success: true, dealer };
    }
    throw new Error('Vigane edasimüüja kood. Proovige 1001, 2002, 3003 või TEST01.');
  }
};

// 2. Fetch Master Classifiers
export const fetchCategories = async () => {
  try {
    return await request('/categories');
  } catch (err) {
    // Fallback categories
    const { CATEGORIES } = await import('../../../backend/src/data.js').catch(() => ({ CATEGORIES: [] }));
    return CATEGORIES;
  }
};

export const fetchDefectTypes = async () => {
  try {
    return await request('/defect-types');
  } catch (err) {
    const { DEFECT_TYPES } = await import('../../../backend/src/data.js').catch(() => ({ DEFECT_TYPES: [] }));
    return DEFECT_TYPES;
  }
};

export const fetchTeams = async () => {
  try {
    return await request('/teams');
  } catch (err) {
    const { SERVICE_TEAMS } = await import('../../../backend/src/data.js').catch(() => ({ SERVICE_TEAMS: [] }));
    return SERVICE_TEAMS;
  }
};

export const fetchCostAccounts = async () => {
  try {
    return await request('/cost-accounts');
  } catch (err) {
    const { COST_ACCOUNTS } = await import('../../../backend/src/data.js').catch(() => ({ COST_ACCOUNTS: [] }));
    return COST_ACCOUNTS;
  }
};

export const fetchHandlers = async () => {
  try {
    return await request('/handlers');
  } catch (err) {
    const { HANDLERS } = await import('../../../backend/src/data.js').catch(() => ({ HANDLERS: [] }));
    return HANDLERS;
  }
};

// 3. Claims Listing
export const fetchClaims = async (params = {}) => {
  try {
    const q = new URLSearchParams(params).toString();
    const res = await request(`/claims${q ? `?${q}` : ''}`);
    return res.claims || [];
  } catch (err) {
    // Local storage fallback for claims
    const cached = localStorage.getItem('vau_claims_cache');
    if (cached) {
      try {
        let list = JSON.parse(cached);
        if (params.search) {
          const s = params.search.toLowerCase();
          list = list.filter(c => c.id.toLowerCase().includes(s) || c.dealer?.name.toLowerCase().includes(s));
        }
        return list;
      } catch (e) {}
    }
    const { INITIAL_CLAIMS } = await import('../../../backend/src/data.js').catch(() => ({ INITIAL_CLAIMS: [] }));
    return INITIAL_CLAIMS;
  }
};

// 4. Single Claim Detail
export const fetchClaimDetail = async (id) => {
  try {
    return await request(`/claims/${id}`);
  } catch (err) {
    const list = await fetchClaims();
    const found = list.find(c => c.id === id);
    if (!found) throw new Error('Claim not found');
    return found;
  }
};

// 5. Submit Claim (Spec 2.4 F1, F3, F25)
export const submitClaim = async (formData) => {
  // If offline mode is active, queue claim locally with temporary UUID
  if (forceOffline) {
    const queueItem = addToOfflineQueue('CREATE_CLAIM', formData);
    return {
      success: true,
      claimId: queueItem.localId,
      isOffline: true,
      message: 'Salvestatud võrguühenduseta režiimis (UUID). Sünkroonitakse automaatselt võrgu taastumisel.',
    };
  }

  try {
    return await request('/claims', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
  } catch (err) {
    // Fallback: If network error, add to offline queue
    const queueItem = addToOfflineQueue('CREATE_CLAIM', formData);
    return {
      success: true,
      claimId: queueItem.localId,
      isOffline: true,
      message: 'Serveriga ühendus puudub. Salvestatud lokaalselt (UUID).',
    };
  }
};

// 6. Update Claim Status
export const updateClaimStatus = async (id, newStatus, reason, actor) => {
  return await request(`/claims/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ newStatus, reason, actor }),
  });
};

// 7. Add Note (4 strict note types)
export const addClaimNote = async (id, noteData) => {
  return await request(`/claims/${id}/notes`, {
    method: 'POST',
    body: JSON.stringify(noteData),
  });
};

// 8. Assign Handlers
export const assignClaimHandlers = async (id, handlerIds) => {
  return await request(`/claims/${id}/handlers`, {
    method: 'POST',
    body: JSON.stringify({ handlerIds }),
  });
};

// 9. Assign or Complete Service
export const assignClaimService = async (id, serviceData) => {
  return await request(`/claims/${id}/service`, {
    method: 'POST',
    body: JSON.stringify(serviceData),
  });
};

// 10. Cost Proposals & Approval
export const submitCostProposal = async (id, proposalData) => {
  return await request(`/claims/${id}/cost-proposals`, {
    method: 'POST',
    body: JSON.stringify(proposalData),
  });
};

export const approveCostProposal = async (id, propId, approvalData) => {
  return await request(`/claims/${id}/cost-proposals/${propId}/approve`, {
    method: 'POST',
    body: JSON.stringify(approvalData),
  });
};

// 11. Sync Offline Queue (Spec 4.3)
export const syncOfflineQueue = async () => {
  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { success: true, count: 0, message: 'Järjekord on tühi.' };
  }

  try {
    const res = await request('/sync', {
      method: 'POST',
      body: JSON.stringify({ items: queue }),
    });

    if (res.success) {
      localStorage.removeItem(QUEUE_KEY);
      window.dispatchEvent(new CustomEvent('vau_queue_updated', { detail: { count: 0 } }));
      return res;
    }
    throw new Error('Sünkroonimine ebaõnnestus.');
  } catch (err) {
    throw err;
  }
};

// 12. Clients & Sales Reps Master Data
export const fetchClients = async () => {
  return await request('/clients');
};

export const fetchSalesReps = async () => {
  return await request('/sales-reps');
};

// 13. Reports Sense Data
export const fetchSenseReports = async () => {
  return await request('/reports/sense');
};

// 14. Action Plan Update & Rejection
export const updateActionPlan = async (id, planData) => {
  return await request(`/claims/${id}/action-plan`, {
    method: 'PATCH',
    body: JSON.stringify(planData),
  });
};

// 15. Replacement Order Update
export const updateReplacementOrder = async (id, replacementOrderNumber, actor = 'Käsitleja') => {
  return await request(`/claims/${id}/replacement-order`, {
    method: 'PATCH',
    body: JSON.stringify({ replacementOrderNumber, actor }),
  });
};

// 16. Invoices
export const addClaimInvoice = async (id, invoiceData) => {
  return await request(`/claims/${id}/invoices`, {
    method: 'POST',
    body: JSON.stringify(invoiceData),
  });
};

// 17. Handler File Upload
export const addClaimFile = async (id, fileData) => {
  return await request(`/claims/${id}/files`, {
    method: 'POST',
    body: JSON.stringify(fileData),
  });
};

// 18. Email Threads
export const addClaimEmail = async (id, emailData) => {
  return await request(`/claims/${id}/emails`, {
    method: 'POST',
    body: JSON.stringify(emailData),
  });
};

// 19. Defect Type Update (Approver or Handler)
export const updateDefectType = async (id, defectTypeId, defectTypeName, actor = 'Kinnitaja') => {
  return await request(`/claims/${id}/defect-type`, {
    method: 'PATCH',
    body: JSON.stringify({ defectTypeId, defectTypeName, actor }),
  });
};

// 20. Multi-Department Cost Allocations
export const updateCostAllocations = async (id, allocations, actor = 'Käsitleja') => {
  return await request(`/claims/${id}/cost-allocations`, {
    method: 'PATCH',
    body: JSON.stringify({ allocations, actor }),
  });
};
