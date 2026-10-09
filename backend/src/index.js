import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { node } from '@elysiajs/node';
import {
  DEALERS,
  CATEGORIES,
  DEFECT_TYPES,
  SERVICE_TEAMS,
  COST_ACCOUNTS,
  HANDLERS,
  USERS,
  INITIAL_CLAIMS,
} from './data.js';

// In-memory data store for wireframe prototype
let claims = JSON.parse(JSON.stringify(INITIAL_CLAIMS));
let pSequence = 2542; // Next P sequence: P02542
let tSequence = 2;    // Next T sequence: T00002

// Atomic Claim Number Generator (Spec 2.1, 2.4, 3.1)
function generateClaimId(isTest = false) {
  if (isTest) {
    const id = `T${String(tSequence).padStart(5, '0')}`;
    tSequence += 1;
    return id;
  }
  const id = `P${String(pSequence).padStart(5, '0')}`;
  pSequence += 1;
  return id;
}

// Lifecycle State Machine Allowed Transitions (Spec 2.3)
const ALLOWED_TRANSITIONS = {
  SUBMITTED: ['HANDLER_ASSIGNED', 'REJECTED'],
  HANDLER_ASSIGNED: ['IN_PROGRESS', 'REJECTED'],
  IN_PROGRESS: ['SERVICE_ASSIGNED', 'COST_PROPOSED', 'REJECTED'],
  SERVICE_ASSIGNED: ['SERVICE_COMPLETED', 'IN_PROGRESS', 'REJECTED'],
  SERVICE_COMPLETED: ['COST_PROPOSED', 'IN_PROGRESS'],
  COST_PROPOSED: ['IN_APPROVAL', 'IN_PROGRESS'],
  IN_APPROVAL: ['APPROVED', 'COST_PROPOSED'], // rejection goes back to COST_PROPOSED
  APPROVED: ['CLOSED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['IN_PROGRESS'],
  REJECTED: ['REOPENED'],
};

const STATUS_LABELS = {
  SUBMITTED: 'Esitatud',
  HANDLER_ASSIGNED: 'Käsitleja määratud',
  IN_PROGRESS: 'Töös',
  SERVICE_ASSIGNED: 'Teenus määratud',
  SERVICE_COMPLETED: 'Teenus tehtud',
  COST_PROPOSED: 'Kulupakkumine esitatud',
  IN_APPROVAL: 'Kinnitamisel',
  APPROVED: 'Kinnitatud',
  CLOSED: 'Lõpetatud',
  REJECTED: 'Tagasi lükatud',
  REOPENED: 'Uuesti avatud',
};

const app = new Elysia({ adapter: node() })
  .use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))

  // Health check
  .get('/api/health', () => ({
    status: 'ok',
    version: '3.0.0-wireframe',
    timestamp: new Date().toISOString(),
  }))

  // Dealer verification (Spec 2.4 F2)
  .post('/api/auth/client', ({ body, set }) => {
    const { code } = body || {};
    if (!code) {
      set.status = 400;
      return { success: false, message: 'Client code is required' };
    }

    const dealer = DEALERS.find(d => d.code.toLowerCase() === String(code).trim().toLowerCase());
    if (!dealer) {
      set.status = 404;
      return { success: false, message: 'Kehtetu edasimüüja kood. Kontrollige sisestust.' };
    }

    return {
      success: true,
      dealer,
    };
  })

  // Classifiers & Master Data (Spec 2.4 F13, F15, F16)
  .get('/api/categories', () => CATEGORIES)
  .get('/api/defect-types', () => DEFECT_TYPES)
  .get('/api/teams', () => SERVICE_TEAMS)
  .get('/api/cost-accounts', () => COST_ACCOUNTS)
  .get('/api/handlers', () => HANDLERS)
  .get('/api/users', () => USERS)

  // Claims List with Filters (Spec 2.4 F5)
  .get('/api/claims', ({ query }) => {
    let result = [...claims];
    const { status, dealerCode, search, handlerId } = query || {};

    if (status) {
      result = result.filter(c => c.status === status);
    }
    if (dealerCode) {
      result = result.filter(c => c.dealer?.code === dealerCode);
    }
    if (handlerId) {
      result = result.filter(c => c.handlers?.some(h => h.id === handlerId));
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.id.toLowerCase().includes(q) ||
        c.dealer?.name.toLowerCase().includes(q) ||
        c.product?.productName?.toLowerCase().includes(q) ||
        c.product?.orderNumber?.toLowerCase().includes(q)
      );
    }

    // Sort newest first
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      total: result.length,
      claims: result,
    };
  })

  // Single Claim Detail (Spec 2.4 F6)
  .get('/api/claims/:id', ({ params, set }) => {
    const claim = claims.find(c => c.id === params.id);
    if (!claim) {
      set.status = 404;
      return { error: 'Claim not found' };
    }
    return claim;
  })

  // Create Claim (Public Form / Handler New Claim) (Spec 2.4 F1, F3, F24)
  .post('/api/claims', ({ body, set }) => {
    const {
      dealerCode,
      product,
      defect,
      endCustomer,
      files = [],
      language = 'et',
      offlineUuid,
    } = body || {};

    const dealer = DEALERS.find(d => d.code.toLowerCase() === String(dealerCode).trim().toLowerCase()) || {
      code: dealerCode || 'UNKNOWN',
      name: 'Määramata edasimüüja',
      country: 'EST',
    };

    const isTest = dealer.isTest || dealerCode?.toUpperCase().startsWith('TEST');
    const claimId = generateClaimId(isTest);

    const now = new Date().toISOString();
    const newClaim = {
      id: claimId,
      status: 'SUBMITTED',
      statusLabel: STATUS_LABELS['SUBMITTED'],
      isTest,
      createdAt: now,
      submittedLanguage: language,
      offlineUuid: offlineUuid || null,
      dealer: {
        ...dealer,
        ...(body.dealerOverrides || {}),
      },
      product: {
        category: product?.category || 'windows',
        subcategory: product?.subcategory || '',
        productName: product?.productName || 'Nimetu toode',
        orderNumber: product?.orderNumber || '',
        serialNumber: product?.serialNumber || '',
        quantity: Number(product?.quantity) || 1,
        dimensions: product?.dimensions || '',
        isInstalled: Boolean(product?.isInstalled),
      },
      defect: {
        type: defect?.type || 'other',
        typeName: DEFECT_TYPES.find(t => t.id === defect?.type)?.name || 'Muu defekt',
        description: defect?.description || '',
      },
      endCustomer: {
        name: endCustomer?.name || '',
        phone: endCustomer?.phone || '',
        email: endCustomer?.email || '',
        address: endCustomer?.address || '',
        onSiteInspectionNeeded: Boolean(endCustomer?.onSiteInspectionNeeded),
      },
      handlers: [],
      service: null,
      costProposals: [],
      files: files.map((f, idx) => ({
        id: `f-${Date.now()}-${idx}`,
        name: f.name || `foto-${idx + 1}.jpg`,
        size: f.size || '1.5 MB',
        tag: f.tag || 'Defekti foto',
        uploadedAt: now,
      })),
      notes: [],
      timeline: [
        {
          id: `t-${Date.now()}`,
          timestamp: now,
          actor: dealer.name,
          event: `Reklamatsioon esitatud süsteemi (${claimId})`,
        },
      ],
    };

    claims.unshift(newClaim);

    return {
      success: true,
      claimId,
      claim: newClaim,
    };
  })

  // State Machine Status Update (Spec 2.3)
  .patch('/api/claims/:id/status', ({ params, body, set }) => {
    const claim = claims.find(c => c.id === params.id);
    if (!claim) {
      set.status = 404;
      return { error: 'Claim not found' };
    }

    const { newStatus, reason, actor = 'Käsitleja' } = body || {};
    const allowed = ALLOWED_TRANSITIONS[claim.status] || [];

    if (!allowed.includes(newStatus)) {
      set.status = 400;
      return {
        error: `Keelatud olekuüleminek: '${claim.status}' -> '${newStatus}'. Lubatud üleminekud: ${allowed.join(', ')}`,
      };
    }

    // Spec: Tagasilükkamisel või uuesti avamisel on põhjus kohustuslik!
    if ((newStatus === 'REJECTED' || newStatus === 'REOPENED') && (!reason || reason.trim().length < 5)) {
      set.status = 400;
      return { error: 'Põhjus on kohustuslik (min 5 tähemärki).' };
    }

    const oldStatusLabel = claim.statusLabel;
    claim.status = newStatus;
    claim.statusLabel = STATUS_LABELS[newStatus] || newStatus;

    // Log timeline
    const now = new Date().toISOString();
    claim.timeline.push({
      id: `t-${Date.now()}`,
      timestamp: now,
      actor,
      event: `Olek muudetud: ${oldStatusLabel} → ${claim.statusLabel}${reason ? ` (Põhjus: ${reason})` : ''}`,
    });

    // If rejection reason, add as Note Type 4 (Tagasilükkamise põhjus)
    if (reason) {
      claim.notes.push({
        id: `n-${Date.now()}`,
        type: newStatus === 'REJECTED' ? 'REJECTION' : 'HANDLER',
        typeLabel: newStatus === 'REJECTED' ? 'Tagasilükkamise põhjus' : 'Käsitleja märge',
        author: actor,
        createdAt: now,
        content: reason,
      });
    }

    return { success: true, claim };
  })

  // Add Note (Spec 2.4 F8: 4 note types)
  .post('/api/claims/:id/notes', ({ params, body, set }) => {
    const claim = claims.find(c => c.id === params.id);
    if (!claim) {
      set.status = 404;
      return { error: 'Claim not found' };
    }

    const { type, content, author = 'Käsitleja' } = body || {};
    const validTypes = {
      INFO: 'Lisainfo',
      HANDLER: 'Käsitleja märge',
      SERVICE: 'Teenuse märge',
      REJECTION: 'Tagasilükkamise põhjus',
    };

    if (!validTypes[type]) {
      set.status = 400;
      return { error: `Vigane märkme tüüp. Lubatud: ${Object.keys(validTypes).join(', ')}` };
    }

    if (!content || content.trim().length === 0) {
      set.status = 400;
      return { error: 'Märkme sisu ei tohi olla tühi.' };
    }

    const now = new Date().toISOString();
    const note = {
      id: `n-${Date.now()}`,
      type,
      typeLabel: validTypes[type],
      author,
      createdAt: now,
      content,
    };

    claim.notes.push(note);
    claim.timeline.push({
      id: `t-${Date.now()}`,
      timestamp: now,
      actor: author,
      event: `Lisatud märge [${validTypes[type]}]`,
    });

    return { success: true, note, claim };
  })

  // Assign Handlers (Spec 2.4 F7)
  .post('/api/claims/:id/handlers', ({ params, body, set }) => {
    const claim = claims.find(c => c.id === params.id);
    if (!claim) {
      set.status = 404;
      return { error: 'Claim not found' };
    }

    const { handlerIds = [] } = body || {};
    const selectedHandlers = HANDLERS.filter(h => handlerIds.includes(h.id));

    if (selectedHandlers.length === 0) {
      set.status = 400;
      return { error: 'Vähemalt üks käsitleja peab olema määratud (Raudreegel 3.1).' };
    }

    claim.handlers = selectedHandlers;
    const now = new Date().toISOString();

    // Auto advance from SUBMITTED to HANDLER_ASSIGNED if needed
    if (claim.status === 'SUBMITTED') {
      claim.status = 'HANDLER_ASSIGNED';
      claim.statusLabel = STATUS_LABELS['HANDLER_ASSIGNED'];
    }

    claim.timeline.push({
      id: `t-${Date.now()}`,
      timestamp: now,
      actor: 'Süsteem',
      event: `Käsitlejateks määratud: ${selectedHandlers.map(h => h.name).join(', ')}`,
    });

    return { success: true, claim };
  })

  // Assign Service Team & Schedule (Spec 2.4 F9)
  .post('/api/claims/:id/service', ({ params, body, set }) => {
    const claim = claims.find(c => c.id === params.id);
    if (!claim) {
      set.status = 404;
      return { error: 'Claim not found' };
    }

    const { teamId, scheduledDate, notes, action } = body || {};
    const now = new Date().toISOString();

    if (action === 'COMPLETE') {
      if (!claim.service) {
        set.status = 400;
        return { error: 'Teenust pole määratud.' };
      }
      claim.service.status = 'COMPLETED';
      claim.service.completionNotes = notes || 'Töö lõpetatud.';
      claim.service.completedAt = now;
      claim.status = 'SERVICE_COMPLETED';
      claim.statusLabel = STATUS_LABELS['SERVICE_COMPLETED'];

      claim.timeline.push({
        id: `t-${Date.now()}`,
        timestamp: now,
        actor: claim.service.teamName || 'Teenusmeeskond',
        event: 'Teenustöö objektil märgitud TEHTUKS',
      });

      return { success: true, claim };
    }

    const team = SERVICE_TEAMS.find(t => t.id === teamId);
    if (!team) {
      set.status = 400;
      return { error: 'Valitud teenusmeeskonda ei leitud.' };
    }

    claim.service = {
      teamId: team.id,
      teamName: team.name,
      scheduledDate,
      status: 'SCHEDULED',
      notes: notes || '',
    };

    if (claim.status === 'IN_PROGRESS' || claim.status === 'HANDLER_ASSIGNED') {
      claim.status = 'SERVICE_ASSIGNED';
      claim.statusLabel = STATUS_LABELS['SERVICE_ASSIGNED'];
    }

    claim.timeline.push({
      id: `t-${Date.now()}`,
      timestamp: now,
      actor: 'Käsitleja',
      event: `Teenus määratud meeskonnale '${team.name}' kuupäevaks ${scheduledDate}`,
    });

    return { success: true, claim };
  })

  // Submit Cost Proposal (Spec 2.1, 2.4 F10: Split % must sum to 100)
  .post('/api/claims/:id/cost-proposals', ({ params, body, set }) => {
    const claim = claims.find(c => c.id === params.id);
    if (!claim) {
      set.status = 404;
      return { error: 'Claim not found' };
    }

    const { totalAmountEur, splits = [], proposedBy = 'Mari Maasikas' } = body || {};
    const sumPercent = splits.reduce((acc, s) => acc + Number(s.percentage || 0), 0);

    if (sumPercent !== 100) {
      set.status = 400;
      return { error: `Kulujaotuse osade summa peab olema täpselt 100%! Praegune summa: ${sumPercent}%` };
    }

    const proposal = {
      id: `cp-${Date.now()}`,
      totalAmountEur: Number(totalAmountEur) || 0,
      splits: splits.map(s => ({
        accountId: s.accountId,
        accountName: COST_ACCOUNTS.find(a => a.id === s.accountId)?.name || s.accountId,
        percentage: Number(s.percentage),
        amountEur: ((Number(totalAmountEur) || 0) * Number(s.percentage)) / 100,
      })),
      proposedBy,
      proposedAt: new Date().toISOString(),
      status: 'PENDING_APPROVAL',
    };

    claim.costProposals.push(proposal);
    claim.status = 'IN_APPROVAL';
    claim.statusLabel = STATUS_LABELS['IN_APPROVAL'];

    const now = new Date().toISOString();
    claim.timeline.push({
      id: `t-${Date.now()}`,
      timestamp: now,
      actor: proposedBy,
      event: `Esitatud kulupakkumine summas ${totalAmountEur} € (${splits.map(s => `${s.percentage}%`).join(' / ')})`,
    });

    return { success: true, proposal, claim };
  })

  // Approve / Reject Cost Proposal (Spec 2.4 F10)
  .post('/api/claims/:id/cost-proposals/:propId/approve', ({ params, body, set }) => {
    const claim = claims.find(c => c.id === params.id);
    if (!claim) {
      set.status = 404;
      return { error: 'Claim not found' };
    }

    const proposal = claim.costProposals.find(p => p.id === params.propId);
    if (!proposal) {
      set.status = 404;
      return { error: 'Cost proposal not found' };
    }

    const { approved, rejectionReason, approver = 'Tootmisjuht' } = body || {};
    const now = new Date().toISOString();

    if (approved) {
      proposal.status = 'APPROVED';
      proposal.approvedBy = approver;
      proposal.approvedAt = now;

      claim.status = 'APPROVED';
      claim.statusLabel = STATUS_LABELS['APPROVED'];

      claim.timeline.push({
        id: `t-${Date.now()}`,
        timestamp: now,
        actor: approver,
        event: `Kulupakkumine KINNITATUD (${proposal.totalAmountEur} €)`,
      });
    } else {
      if (!rejectionReason || rejectionReason.trim().length < 5) {
        set.status = 400;
        return { error: 'Kulupakkumise tagasilükkamisel on põhjendus kohustuslik!' };
      }

      proposal.status = 'REJECTED';
      proposal.rejectionReason = rejectionReason;
      proposal.rejectedBy = approver;
      proposal.rejectedAt = now;

      claim.status = 'COST_PROPOSED';
      claim.statusLabel = STATUS_LABELS['COST_PROPOSED'];

      claim.timeline.push({
        id: `t-${Date.now()}`,
        timestamp: now,
        actor: approver,
        event: `Kulupakkumine TAGASI LÜKATUD: ${rejectionReason}`,
      });

      claim.notes.push({
        id: `n-${Date.now()}`,
        type: 'REJECTION',
        typeLabel: 'Tagasilükkamise põhjus',
        author: approver,
        createdAt: now,
        content: `Kulupakkumise tagasilükkamine: ${rejectionReason}`,
      });
    }

    return { success: true, proposal, claim };
  })

  // Offline Sync Endpoint (Spec 2.4 F25, 4.3)
  // Accepts array of offline created/modified items, assigns atomic numbers and updates store
  .post('/api/sync', ({ body }) => {
    const { items = [] } = body || {};
    const syncedResults = [];

    for (const item of items) {
      if (item.action === 'CREATE_CLAIM') {
        const dealer = DEALERS.find(d => d.code === item.data.dealerCode) || {
          code: item.data.dealerCode,
          name: 'Edasimüüja (Offline)',
          country: 'EST',
        };
        const isTest = dealer.isTest || item.data.dealerCode?.toUpperCase().startsWith('TEST');
        const officialId = generateClaimId(isTest);
        const now = new Date().toISOString();

        const claim = {
          id: officialId,
          status: 'SUBMITTED',
          statusLabel: STATUS_LABELS['SUBMITTED'],
          isTest,
          createdAt: item.createdAt || now,
          submittedLanguage: item.data.language || 'et',
          offlineUuid: item.localId,
          dealer,
          product: item.data.product || {},
          defect: item.data.defect || {},
          endCustomer: item.data.endCustomer || {},
          handlers: [],
          service: null,
          costProposals: [],
          files: (item.data.files || []).map((f, i) => ({
            id: `f-off-${Date.now()}-${i}`,
            name: f.name,
            size: f.size || '1.0 MB',
            tag: f.tag || 'Foto',
            uploadedAt: now,
          })),
          notes: [],
          timeline: [
            {
              id: `t-${Date.now()}`,
              timestamp: now,
              actor: `${dealer.name} (Võrguühenduseta)`,
              event: `Loodud võrguühenduseta (UUID: ${item.localId}), sünkroonitud ametlikuks numbriks: ${officialId}`,
            },
          ],
        };

        claims.unshift(claim);
        syncedResults.push({
          localId: item.localId,
          assignedId: officialId,
          status: 'SYNCED',
        });
      }
    }

    return {
      success: true,
      syncedCount: syncedResults.length,
      syncedResults,
    };
  })

  .listen(3001);

console.log(`🦊 VAU Claim v3 Elysia API running at http://localhost:3001`);
