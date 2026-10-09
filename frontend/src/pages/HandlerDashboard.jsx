import React, { useState, useEffect } from 'react';
import {
  fetchClaims,
  fetchClaimDetail,
  updateClaimStatus,
  addClaimNote,
  assignClaimHandlers,
  assignClaimService,
  submitCostProposal,
  fetchTeams,
  fetchCostAccounts,
  fetchHandlers,
  fetchDefectTypes,
  updateActionPlan,
  updateReplacementOrder,
  addClaimInvoice,
  addClaimFile,
  addClaimEmail,
  updateCostAllocations,
} from '../services/api';
import {
  Search,
  Filter,
  AlertCircle,
  Clock,
  UserCheck,
  CheckCircle,
  XCircle,
  FileText,
  Wrench,
  DollarSign,
  History,
  MessageSquare,
  Users,
  ChevronRight,
  X,
  Plus,
  Send,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpDown,
  Mail,
  Receipt,
  FileSpreadsheet,
  Upload,
  Eye,
  Check,
  PauseCircle,
  ShieldAlert,
  ClipboardList,
} from 'lucide-react';

const STATUS_CONFIG = {
  SUBMITTED: { label: 'Esitatud', color: 'badge-blue', next: ['HANDLER_ASSIGNED', 'IN_PROGRESS', 'REJECTED'] },
  HANDLER_ASSIGNED: { label: 'Käsitleja määratud', color: 'badge-indigo', next: ['IN_PROGRESS', 'ON_HOLD', 'REJECTED'] },
  IN_PROGRESS: { label: 'Töös', color: 'badge-amber', next: ['SERVICE_ASSIGNED', 'COST_PROPOSED', 'APPROVED', 'ON_HOLD', 'REJECTED'] },
  ON_HOLD: { label: 'Ootel / Inaktiivne', color: 'badge-gray', next: ['IN_PROGRESS', 'REJECTED'] },
  SERVICE_ASSIGNED: { label: 'Teenus määratud', color: 'badge-purple', next: ['SERVICE_COMPLETED', 'IN_PROGRESS', 'ON_HOLD', 'REJECTED'] },
  SERVICE_COMPLETED: { label: 'Teenus tehtud', color: 'badge-teal', next: ['COST_PROPOSED', 'APPROVED', 'IN_PROGRESS', 'ON_HOLD'] },
  COST_PROPOSED: { label: 'Kulukandja ettepanek', color: 'badge-orange', next: ['IN_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'ON_HOLD'] },
  IN_APPROVAL: { label: 'Kinnitamisel', color: 'badge-warning', next: ['APPROVED', 'COST_PROPOSED', 'IN_PROGRESS', 'REJECTED'] },
  APPROVED: { label: 'Kinnitatud', color: 'badge-emerald', next: ['CLOSED', 'IN_PROGRESS'] },
  CLOSED: { label: 'Lõpetatud', color: 'badge-gray', next: ['REOPENED'] },
  REJECTED: { label: 'Tagasi lükatud', color: 'badge-red', next: ['REOPENED'] },
  REOPENED: { label: 'Uuesti avatud', color: 'badge-blue', next: ['IN_PROGRESS'] },
};

const NOTE_TYPES = [
  { id: 'INFO', label: '1. Lisainfo (Avalik/Klient)' },
  { id: 'HANDLER', label: '2. Käsitleja märkus (Sisemine)' },
  { id: 'SERVICE', label: '3. Teenuse märkus (Objektil)' },
  { id: 'REJECTION', label: '4. Tagasilükkamise põhjus' },
];

const HandlerDashboard = ({ initialSelectedId }) => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('criticality'); // 'criticality', 'updatedAt', 'newest', 'oldest'
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'notes', 'plan', 'service', 'cost', 'invoices', 'emails', 'timeline'

  // Master data
  const [teams, setTeams] = useState([]);
  const [costAccounts, setCostAccounts] = useState([]);
  const [allHandlers, setAllHandlers] = useState([]);
  const [defectTypes, setDefectTypes] = useState([]);

  // Note form state (Requirement 8: Märkused)
  const [noteType, setNoteType] = useState('HANDLER');
  const [noteContent, setNoteContent] = useState('');

  // Service form state
  const [selectedTeam, setSelectedTeam] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [serviceNotes, setServiceNotes] = useState('');
  const [serviceMembers, setServiceMembers] = useState('');

  // Cost proposal & Multi-Department Allocation state (Requirement 11, 12, 15)
  const [costTotal, setCostTotal] = useState('');
  const [costSplits, setCostSplits] = useState([
    { accountId: 'dept-100', percentage: 50, defectTypeId: 'geometry', comment: '' },
    { accountId: 'dept-200', percentage: 50, defectTypeId: 'paint-surface', comment: '' },
  ]);

  // Action plan form state (Requirement 7, 14)
  const [planDescription, setPlanDescription] = useState('');
  const [planDeadline, setPlanDeadline] = useState('');
  const [planAssignee, setPlanAssignee] = useState('');

  // Replacement order form state (Requirement 9)
  const [replOrderInput, setReplOrderInput] = useState('');
  const [savingReplOrder, setSavingReplOrder] = useState(false);

  // Invoice form state (Requirement 10, 16)
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceType, setInvoiceType] = useState('Töö arve');
  const [invoiceFile, setInvoiceFile] = useState('');

  // Email form state (Requirement 30)
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // Handler File Upload state (Requirement 23)
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileTag, setUploadFileTag] = useState('Defekti lähivõte');

  // Preview file lightbox modal (Requirement 28)
  const [previewFile, setPreviewFile] = useState(null);

  // Transition reason dialog
  const [reasonModal, setReasonModal] = useState({ open: false, targetStatus: null });
  const [transitionReason, setTransitionReason] = useState('');

  // Multi-handler selection modal (Requirement 5)
  const [handlerModalOpen, setHandlerModalOpen] = useState(false);
  const [selectedHandlerIds, setSelectedHandlerIds] = useState([]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const data = await fetchClaims({ search, status: statusFilter, sortBy });
      setClaims(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    fetchTeams().then(setTeams).catch(console.error);
    fetchCostAccounts().then(setCostAccounts).catch(console.error);
    fetchHandlers().then(setAllHandlers).catch(console.error);
    fetchDefectTypes().then(setDefectTypes).catch(console.error);
  }, [statusFilter, sortBy]);

  useEffect(() => {
    if (initialSelectedId) {
      handleOpenDetail(initialSelectedId);
    }
  }, [initialSelectedId]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (previewFile) setPreviewFile(null);
        else if (reasonModal.open) setReasonModal({ open: false, targetStatus: null });
        else if (handlerModalOpen) setHandlerModalOpen(false);
        else if (selectedClaim) setSelectedClaim(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewFile, reasonModal.open, handlerModalOpen, selectedClaim]);

  const handleOpenDetail = async (id) => {
    try {
      const detail = await fetchClaimDetail(id);
      setSelectedClaim(detail);
      setReplOrderInput(detail.replacementOrderNumber || '');
      setSelectedHandlerIds((detail.handlers || []).map(h => h.id));
      if (detail.actionPlan) {
        setPlanDescription(detail.actionPlan.description || '');
        setPlanDeadline(detail.actionPlan.deadline || '');
        setPlanAssignee(detail.actionPlan.assignee || '');
      } else {
        setPlanDescription('');
        setPlanDeadline('');
        setPlanAssignee(detail.handlers?.[0]?.name || 'Monika Koort');
      }
      setEmailTo(detail.dealer?.email || '');
      setEmailSubject(`[${detail.id}] Reklamatsioon - ${detail.product?.productName || ''}`);

      // Initialize cost splits with default defect type (Requirement 15)
      const primaryDefect = detail.defect?.type || 'other';
      if (detail.costAllocations && detail.costAllocations.length > 0) {
        setCostSplits(detail.costAllocations.map(ca => ({
          accountId: ca.departmentId,
          percentage: ca.percentage,
          defectTypeId: ca.defectTypeId || primaryDefect,
          comment: ca.comment || '',
        })));
        const total = detail.costAllocations.reduce((sum, ca) => sum + (parseFloat(ca.amountEur) || 0), 0);
        setCostTotal(total > 0 ? String(total) : '');
      } else {
        setCostSplits([
          { accountId: 'dept-100', percentage: 50, defectTypeId: primaryDefect, comment: '' },
          { accountId: 'dept-200', percentage: 50, defectTypeId: primaryDefect, comment: '' },
        ]);
      }
    } catch (err) {
      alert(`Juhtumi laadimine ebaõnnestus: ${err.message}`);
    }
  };

  const refreshSelectedClaim = async () => {
    if (!selectedClaim) return;
    try {
      const updated = await fetchClaimDetail(selectedClaim.id);
      setSelectedClaim(updated);
      loadAll();
    } catch (e) {}
  };

  const handleStatusChange = (newStatus) => {
    if (newStatus === 'REJECTED' || newStatus === 'REOPENED') {
      setReasonModal({ open: true, targetStatus: newStatus });
      setTransitionReason('');
      return;
    }
    executeStatusTransition(newStatus);
  };

  const executeStatusTransition = async (newStatus, reason = '') => {
    try {
      await updateClaimStatus(selectedClaim.id, newStatus, reason, 'Monika Koort (Käsitleja)');
      setReasonModal({ open: false, targetStatus: null });
      await refreshSelectedClaim();
    } catch (err) {
      alert(`Oleku muutmine ebaõnnestus: ${err.message}`);
    }
  };

  const confirmReasonTransition = () => {
    if (!transitionReason.trim()) {
      alert('Põhjendus on kohustuslik!');
      return;
    }
    executeStatusTransition(reasonModal.targetStatus, transitionReason);
  };

  const handleSaveReplacementOrder = async (e) => {
    e.preventDefault();
    setSavingReplOrder(true);
    try {
      await updateReplacementOrder(selectedClaim.id, replOrderInput, 'Monika Koort (Käsitleja)');
      await refreshSelectedClaim();
    } catch (err) {
      alert(`Asendustellimuse salvestamine ebaõnnestus: ${err.message}`);
    } finally {
      setSavingReplOrder(false);
    }
  };

  const handleSaveActionPlan = async (e) => {
    e.preventDefault();
    if (!planDescription.trim()) {
      alert('Tegevusplaani kirjeldus on kohustuslik!');
      return;
    }
    try {
      await updateActionPlan(selectedClaim.id, {
        description: planDescription,
        deadline: planDeadline,
        assignee: planAssignee,
        status: 'IN_PROGRESS',
        actor: 'Monika Koort (Käsitleja)',
      });
      alert('Tegevusplaan edukalt salvestatud!');
      await refreshSelectedClaim();
    } catch (err) {
      alert(`Tegevusplaani salvestamine ebaõnnestus: ${err.message}`);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    try {
      await addClaimNote(selectedClaim.id, {
        type: noteType,
        content: noteContent,
        author: 'Monika Koort (Käsitleja)',
      });
      setNoteContent('');
      await refreshSelectedClaim();
    } catch (err) {
      alert(`Märkuse lisamine ebaõnnestus: ${err.message}`);
    }
  };

  const handleAssignService = async (e) => {
    e.preventDefault();
    if (!selectedTeam || !scheduledDate) return;
    const team = teams.find(t => t.id === selectedTeam);
    try {
      await assignClaimService(selectedClaim.id, {
        teamId: selectedTeam,
        teamName: team?.name || selectedTeam,
        scheduledDate,
        notes: serviceNotes,
        serviceMembers: serviceMembers ? serviceMembers.split(',').map(s => s.trim()) : [],
      });
      alert('Teenus edukalt määratud!');
      await refreshSelectedClaim();
    } catch (err) {
      alert(`Teenuse määramine ebaõnnestus: ${err.message}`);
    }
  };

  const handleSubmitProposal = async (e) => {
    e.preventDefault();
    const sumPct = costSplits.reduce((acc, s) => acc + Number(s.percentage || 0), 0);
    if (sumPct !== 100) {
      alert(`Kulukandjate osade summa peab olema täpselt 100%! Praegune summa: ${sumPct}%`);
      return;
    }
    const totalAmount = parseFloat(costTotal) || 0;
    if (totalAmount <= 0) {
      alert('Sisestage kehtiv eeldatav kogukulu summa!');
      return;
    }

    try {
      // Save multi-department cost allocations
      const accountsMap = Object.fromEntries(costAccounts.map(ca => [ca.id, ca.name]));
      const defectsMap = Object.fromEntries(defectTypes.map(dt => [dt.id, dt.name]));
      const allocations = costSplits.map(s => ({
        departmentId: s.accountId,
        departmentName: accountsMap[s.accountId] || s.accountId,
        defectTypeId: s.defectTypeId,
        defectTypeName: defectsMap[s.defectTypeId] || s.defectTypeId,
        percentage: Number(s.percentage),
        amountEur: Math.round((totalAmount * Number(s.percentage)) / 100 * 100) / 100,
        comment: s.comment,
      }));

      await updateCostAllocations(selectedClaim.id, allocations, 'Monika Koort (Käsitleja)');

      // Submit cost proposal
      await submitCostProposal(selectedClaim.id, {
        totalAmountEur: totalAmount,
        splits: costSplits.map(s => ({ accountId: s.accountId, percentage: Number(s.percentage) })),
        proposedBy: 'Monika Koort (Käsitleja)',
      });

      alert('Kulukandja ettepanek edukalt esitatud kinnitamisele!');
      await refreshSelectedClaim();
    } catch (err) {
      alert(`Ettepaneku esitamine ebaõnnestus: ${err.message}`);
    }
  };

  const handleAddInvoice = async (e) => {
    e.preventDefault();
    if (!invoiceNumber.trim() || !invoiceAmount) return;
    try {
      await addClaimInvoice(selectedClaim.id, {
        number: invoiceNumber,
        date: invoiceDate,
        amountEur: parseFloat(invoiceAmount),
        type: invoiceType,
        fileName: invoiceFile || `${invoiceNumber}.pdf`,
        actor: 'Monika Koort (Käsitleja)',
      });
      setInvoiceNumber('');
      setInvoiceAmount('');
      setInvoiceFile('');
      alert('Arve edukalt lisatud reklamatsioonile!');
      await refreshSelectedClaim();
    } catch (err) {
      alert(`Arve lisamine ebaõnnestus: ${err.message}`);
    }
  };

  const handleAddFile = async (e) => {
    e.preventDefault();
    if (!uploadFileName.trim()) return;
    try {
      const isImg = uploadFileName.match(/\.(jpg|jpeg|png|webp|gif)$/i);
      await addClaimFile(selectedClaim.id, {
        name: uploadFileName,
        size: '2.1 MB',
        type: isImg ? 'image' : 'document',
        tag: uploadFileTag,
        actor: 'Monika Koort (Käsitleja)',
      });
      setUploadFileName('');
      alert('Fail edukalt lisatud!');
      await refreshSelectedClaim();
    } catch (err) {
      alert(`Faili lisamine ebaõnnestus: ${err.message}`);
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailSubject.trim() || !emailBody.trim()) return;
    try {
      await addClaimEmail(selectedClaim.id, {
        from: 'Monika Koort <Monika.Koort@vau.ee>',
        to: emailTo,
        subject: emailSubject,
        body: emailBody,
        actor: 'Monika Koort (Käsitleja)',
      });
      setEmailBody('');
      alert('E-kiri edukalt saadetud ja seotud reklamatsiooniga!');
      await refreshSelectedClaim();
    } catch (err) {
      alert(`Kirja saatmine ebaõnnestus: ${err.message}`);
    }
  };

  const handleSaveHandlers = async () => {
    try {
      await assignClaimHandlers(selectedClaim.id, selectedHandlerIds);
      setHandlerModalOpen(false);
      await refreshSelectedClaim();
    } catch (err) {
      alert(`Käsitlejate salvestamine ebaõnnestus: ${err.message}`);
    }
  };

  const rejectedClaims = claims.filter(c => c.status === 'REJECTED' || c.progressFlag === 'REJECTED_NEEDS_REVISION');
    const inProgressCount = claims.filter(c => c.status === 'IN_PROGRESS' || c.status === 'SERVICE_IN_PROGRESS' || c.status === 'SERVICE_ASSIGNED').length;
    const inApprovalCount = claims.filter(c => c.status === 'IN_APPROVAL' || c.status === 'COST_PROPOSED').length;
    const onHoldCount = claims.filter(c => c.status === 'ON_HOLD').length;

    return (
      <div className="handler-dashboard-page">
        {/* Critical Rejected Alert Banner for Handler */}
        {rejectedClaims.length > 0 && (
          <div className="handler-rejected-alert-banner">
            <div className="alert-text-group">
              <ShieldAlert size={22} className="alert-icon-danger" />
              <div>
                <h4>Kriitiline: {rejectedClaims.length} reklamatsioon on kinnitajalt tagasi lükatud!</h4>
                <p>
                  Kinnitaja lisas kohustusliku tagasilükkamise põhjenduse. Juhtum vajab tegevusplaani, veatüübi või kulukandja ettepaneku ülevaatamist.
                </p>
              </div>
            </div>
            <button
              type="button"
              className={`btn-danger-banner ${statusFilter === 'REJECTED' ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'REJECTED' ? '' : 'REJECTED')}
            >
              {statusFilter === 'REJECTED' ? 'Näita kõiki juhtumeid' : `Ava tagasi lükatud (${rejectedClaims.length})`}
            </button>
          </div>
        )}

        {/* Control Bar: Search, Filters & Sorting */}
        <div className="dashboard-control-bar">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Otsi laiema skoobiga (Juhtumi ID, klient, toode, tellimus, asendustellimus, arved, veatüüp)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadAll()}
            />
          </div>

          {/* Quick Segmented Status Filters */}
          <div className="handler-status-chips">
            <button
              type="button"
              className={`handler-chip-btn ${statusFilter === '' ? 'active' : ''}`}
              onClick={() => setStatusFilter('')}
            >
              Kõik ({claims.length})
            </button>
            {rejectedClaims.length > 0 && (
              <button
                type="button"
                className={`handler-chip-btn chip-rejected-alert ${statusFilter === 'REJECTED' ? 'active' : ''}`}
                onClick={() => setStatusFilter(statusFilter === 'REJECTED' ? '' : 'REJECTED')}
              >
                <ShieldAlert size={14} />
                <span>Tagasi lükatud ({rejectedClaims.length})</span>
              </button>
            )}
            <button
              type="button"
              className={`handler-chip-btn ${statusFilter === 'IN_PROGRESS' ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'IN_PROGRESS' ? '' : 'IN_PROGRESS')}
            >
              Töös ({inProgressCount})
            </button>
            <button
              type="button"
              className={`handler-chip-btn ${statusFilter === 'IN_APPROVAL' ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'IN_APPROVAL' ? '' : 'IN_APPROVAL')}
            >
              Kinnitamisel ({inApprovalCount})
            </button>
            <button
              type="button"
              className={`handler-chip-btn ${statusFilter === 'ON_HOLD' ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'ON_HOLD' ? '' : 'ON_HOLD')}
            >
              Ootel ({onHoldCount})
            </button>
          </div>

          {/* Sorting Dropdown (Requirement 17, 22) */}
          <div className="sort-group">
            <ArrowUpDown size={15} className="text-muted" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="form-select-sm">
              <option value="criticality">⚠️ Kriitilisuse järgi (Tagasi lükatud esimesena)</option>
              <option value="updatedAt">🕒 Viimaste muudatuste järgi</option>
              <option value="newest">📅 Kuupäev: Uusimad esimesena</option>
              <option value="oldest">📅 Kuupäev: Vanimad esimesena</option>
              <option value="id">🔢 Juhtumi numbri järgi</option>
            </select>
          </div>

          <button className="btn-secondary btn-sm" onClick={loadAll}>
            Värskenda
          </button>
        </div>

      {/* Main Table View */}
      <div className="dashboard-content-card">
        {loading ? (
          <div className="loading-state">
            <Clock size={32} className="animate-spin text-muted" />
            <p>Laadin töölaua juhtumeid...</p>
          </div>
        ) : claims.length === 0 ? (
          <div className="empty-state">
            <FileText size={40} className="text-muted" />
            <p>Filtrile vastavaid reklamatsioone ei leitud.</p>
          </div>
        ) : (
          <table className="claims-table">
            <thead>
              <tr>
                <th>Lipuke</th>
                <th>Juhtumi Nr</th>
                <th>Staatus</th>
                <th>Edasimüüja</th>
                <th>Toode / Tellimus</th>
                <th>Veatüüp</th>
                <th>Käsitlejad</th>
                <th>Viimane muudatus</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => {
                const statusCfg = STATUS_CONFIG[c.status] || { label: c.status, color: 'badge-gray' };
                const isCritical = c.isCritical || c.progressFlag === 'REJECTED_NEEDS_REVISION' || c.status === 'REJECTED';

                return (
                  <tr
                    key={c.id}
                    className={`claim-row ${selectedClaim?.id === c.id ? 'row-selected' : ''} ${isCritical ? 'row-critical-highlight' : ''}`}
                    onClick={() => handleOpenDetail(c.id)}
                  >
                    <td>
                      {/* Requirement 18: Lipuke külge kui kaugel reklamatsioon on */}
                      {isCritical ? (
                        <span className="progress-flag-badge flag-critical" title="Kinnitamiselt tagasi saadetud või kriitiline!">
                          <ShieldAlert size={13} />
                          <span>Kriitiline</span>
                        </span>
                      ) : c.status === 'ON_HOLD' ? (
                        <span className="progress-flag-badge flag-onhold">
                          <PauseCircle size={13} />
                          <span>Ootel</span>
                        </span>
                      ) : (
                        <span className="progress-flag-badge flag-progress">
                          <span>{statusCfg.label}</span>
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="claim-id-cell">
                        <span className="claim-id-badge">
                          {c.id}
                          {c.isTest && <span className="test-flag">TEST</span>}
                        </span>
                        {c.replacementOrderNumber && (
                          <span className="replacement-code-pill" title="Asendustellimuse number">
                            Asendus: {c.replacementOrderNumber}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td>
                      <div className="dealer-cell">
                        <strong>{c.dealer?.name}</strong>
                        <span className="dealer-country">({c.dealer?.country})</span>
                      </div>
                    </td>
                    <td>
                      <div className="product-cell">
                        <span>{c.product?.productName}</span>
                        <code className="order-no">{c.product?.orderNumber || 'Tellimuseta'}</code>
                      </div>
                    </td>
                    <td>
                      <span className="defect-name">{c.defect?.typeName || c.defect?.type}</span>
                    </td>
                    <td>
                      {c.handlers && c.handlers.length > 0 ? (
                        <div className="handlers-badges">
                          {c.handlers.map(h => (
                            <span key={h.id} className="handler-avatar-chip" title={h.email}>
                              {h.name.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="unassigned-text">⚠️ Määramata</span>
                      )}
                    </td>
                    <td>
                      <span className="text-xs text-muted">
                        {new Date(c.updatedAt || c.createdAt).toLocaleString('et-EE', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </td>
                    <td>
                      <button className="btn-table-action" onClick={(e) => { e.stopPropagation(); handleOpenDetail(c.id); }}>
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* DETAIL MODAL CENTERED (Requirement 6: Konkreetse rekl. manamine rohkem keskele) */}
      {selectedClaim && (
        <div className="claim-centered-modal-backdrop" onClick={() => setSelectedClaim(null)}>
          <div className="claim-centered-modal-container" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="drawer-header">
              <div className="drawer-title-group">
                <span className="drawer-claim-id">{selectedClaim.id}</span>
                <span className={`status-pill ${STATUS_CONFIG[selectedClaim.status]?.color || 'badge-gray'}`}>
                  {STATUS_CONFIG[selectedClaim.status]?.label || selectedClaim.status}
                </span>
                {selectedClaim.isCritical && (
                  <span className="progress-flag-badge flag-critical">⚠️ Vajab tähelepanu</span>
                )}
                {selectedClaim.isTest && <span className="test-badge">TESTKONTO</span>}
              </div>
              <button className="btn-close-drawer" onClick={() => setSelectedClaim(null)} title="Sulge">
                <X size={20} />
              </button>
            </div>

            {/* Replacement Order Quick Form (Requirement 9) */}
            <div className="replacement-order-banner">
              <form onSubmit={handleSaveReplacementOrder} className="repl-order-form">
                <label>Asendustellimuse number:</label>
                <input
                  type="text"
                  placeholder="nt ORD-REPL-98231"
                  value={replOrderInput}
                  onChange={(e) => setReplOrderInput(e.target.value)}
                />
                <button type="submit" className="btn-secondary btn-sm" disabled={savingReplOrder}>
                  {savingReplOrder ? 'Salvestan...' : 'Salvesta'}
                </button>
              </form>
            </div>

            {/* Lifecycle State Machine Action Bar (Rule 2.3 & Requirement 16 & 29) */}
            <div className="state-machine-action-bar">
              <span className="state-action-label">Muuda staatust:</span>
              <div className="state-action-buttons">
                {(STATUS_CONFIG[selectedClaim.status]?.next || []).map((nextStatus) => {
                  const targetCfg = STATUS_CONFIG[nextStatus] || { label: nextStatus };
                  const isReject = nextStatus === 'REJECTED';
                  const isHold = nextStatus === 'ON_HOLD';
                  return (
                    <button
                      key={nextStatus}
                      className={isReject ? 'btn-state-reject' : isHold ? 'btn-state-hold' : 'btn-state-advance'}
                      onClick={() => handleStatusChange(nextStatus)}
                    >
                      {isReject ? <XCircle size={15} /> : isHold ? <PauseCircle size={15} /> : <CheckCircle size={15} />}
                      <span>{targetCfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Handlers Bar (Requirement 5: Mitme käsitleja määramine) */}
            <div className="handlers-bar">
              <div className="handlers-summary">
                <Users size={16} className="text-navy" />
                <span>Määratud käsitlejad:</span>
                <strong>
                  {selectedClaim.handlers?.length > 0
                    ? selectedClaim.handlers.map(h => h.name).join(', ')
                    : 'Määramata (Vaikimisi kvaliteediosakonnale)'}
                </strong>
              </div>
              <button className="btn-secondary btn-sm" onClick={() => setHandlerModalOpen(true)}>
                Muuda käsitlejaid ({selectedClaim.handlers?.length || 0})
              </button>
            </div>

            {/* Modal Navigation Tabs (Requirement 7 & 8 & 10 & 30) */}
            <div className="drawer-tabs">
              <button
                className={`drawer-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <FileText size={16} />
                Ülevaade & Failid
              </button>
              <button
                className={`drawer-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
                onClick={() => setActiveTab('notes')}
              >
                <MessageSquare size={16} />
                Märkused ({selectedClaim.notes?.length || 0})
              </button>
              {/* Requirement 7: Tegevusplaani lahter juurde märkuste ja teenuste vahele */}
              <button
                className={`drawer-tab-btn ${activeTab === 'plan' ? 'active' : ''}`}
                onClick={() => setActiveTab('plan')}
              >
                <ClipboardList size={16} />
                Tegevusplaan {selectedClaim.actionPlan?.status === 'REJECTED' ? '⚠️' : ''}
              </button>
              <button
                className={`drawer-tab-btn ${activeTab === 'service' ? 'active' : ''}`}
                onClick={() => setActiveTab('service')}
              >
                <Wrench size={16} />
                Teenus {selectedClaim.service ? '✓' : ''}
              </button>
              <button
                className={`drawer-tab-btn ${activeTab === 'cost' ? 'active' : ''}`}
                onClick={() => setActiveTab('cost')}
              >
                <DollarSign size={16} />
                Kulukandja ettepanek
              </button>
              <button
                className={`drawer-tab-btn ${activeTab === 'invoices' ? 'active' : ''}`}
                onClick={() => setActiveTab('invoices')}
              >
                <Receipt size={16} />
                Arved ({selectedClaim.invoices?.length || 0})
              </button>
              <button
                className={`drawer-tab-btn ${activeTab === 'emails' ? 'active' : ''}`}
                onClick={() => setActiveTab('emails')}
              >
                <Mail size={16} />
                Meilivestlus ({selectedClaim.emails?.length || 0})
              </button>
              <button
                className={`drawer-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
                onClick={() => setActiveTab('timeline')}
              >
                <History size={16} />
                Ajajoon ({selectedClaim.timeline?.length || 0})
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="drawer-body">
              {/* TAB 1: OVERVIEW & FILES */}
              {activeTab === 'overview' && (
                <div className="overview-tab-content">
                  <div className="info-section-card">
                    <h4>Edasimüüja info</h4>
                    <div className="info-kv-grid">
                      <div><span className="kv-label">Edasimüüja:</span> {selectedClaim.dealer?.name} ({selectedClaim.dealer?.code})</div>
                      <div><span className="kv-label">Kontakt:</span> {selectedClaim.dealer?.contactPerson}</div>
                      <div><span className="kv-label">E-post:</span> {selectedClaim.dealer?.email}</div>
                      <div><span className="kv-label">Telefon:</span> {selectedClaim.dealer?.phone}</div>
                      <div><span className="kv-label">Riik:</span> {selectedClaim.dealer?.country}</div>
                      <div><span className="kv-label">Aadress:</span> {selectedClaim.dealer?.address}</div>
                    </div>
                  </div>

                  <div className="info-section-card">
                    <h4>Toote andmed</h4>
                    <div className="info-kv-grid">
                      <div><span className="kv-label">Toode:</span> <strong>{selectedClaim.product?.productName}</strong></div>
                      <div><span className="kv-label">ERP Tellimuse nr:</span> <code>{selectedClaim.product?.orderNumber || 'Puudub'}</code></div>
                      <div><span className="kv-label">Asendustellimuse nr:</span> <code>{selectedClaim.replacementOrderNumber || 'Määramata'}</code></div>
                      <div><span className="kv-label">Seerianumber:</span> <code>{selectedClaim.product?.serialNumber || 'Puudub'}</code></div>
                      <div><span className="kv-label">Kogus:</span> {selectedClaim.product?.quantity} tk</div>
                      <div><span className="kv-label">Paigaldatud:</span> {selectedClaim.product?.isInstalled ? 'Jah, paigaldatud' : 'Ei, pakendis'}</div>
                    </div>
                  </div>

                  <div className="info-section-card">
                    <h4>Veatüüp ja kirjeldus</h4>
                    <div className="defect-detail-box">
                      <span className="defect-category-badge">{selectedClaim.defect?.typeName || selectedClaim.defect?.type}</span>
                      <p className="defect-text">{selectedClaim.defect?.description}</p>
                    </div>
                  </div>

                  {selectedClaim.endCustomer?.name && (
                    <div className="info-section-card">
                      <h4>Lõppklient & Objekt</h4>
                      <div className="info-kv-grid">
                        <div><span className="kv-label">Nimi:</span> {selectedClaim.endCustomer?.name}</div>
                        <div><span className="kv-label">Telefon:</span> {selectedClaim.endCustomer?.phone}</div>
                        <div><span className="kv-label">Aadress:</span> {selectedClaim.endCustomer?.address}</div>
                        <div><span className="kv-label">Kohapealne ülevaatus:</span> {selectedClaim.endCustomer?.onSiteInspectionNeeded ? 'Vajalik' : 'Ei'}</div>
                      </div>
                    </div>
                  )}

                  {/* Attached Files & Handler Upload (Requirement 23 & 28) */}
                  <div className="info-section-card">
                    <div className="section-header-flex">
                      <h4>Lisatud fotod ja dokumendid ({selectedClaim.files?.length || 0})</h4>
                    </div>

                    {selectedClaim.files && selectedClaim.files.length > 0 ? (
                      <div className="files-gallery-grid">
                        {selectedClaim.files.map(f => (
                          <div
                            key={f.id}
                            className="file-gallery-card clickable"
                            onClick={() => setPreviewFile(f)}
                            title="Klõpsa vaatamiseks"
                          >
                            <FileText size={24} className="text-navy" />
                            <div className="file-card-details">
                              <span className="file-title">{f.name}</span>
                              <span className="file-tag-badge">{f.tag || 'Foto'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted text-sm">Manuseid ei lisatud.</p>
                    )}

                    {/* Handler File Upload Form (Requirement 23: Käsitleja peaks saama rekl. pilte/faile lisada) */}
                    <form onSubmit={handleAddFile} className="add-file-form mt-3">
                      <h5>Laadi käsitlejana juurde foto või fail:</h5>
                      <div className="add-file-inputs-row">
                        <input
                          type="text"
                          placeholder="Faili nimi (nt kontrollakt_2026.pdf või foto_uks.jpg)"
                          value={uploadFileName}
                          onChange={(e) => setUploadFileName(e.target.value)}
                          required
                        />
                        <select
                          value={uploadFileTag}
                          onChange={(e) => setUploadFileTag(e.target.value)}
                        >
                          <option value="Defekti lähivõte">Defekti lähivõte</option>
                          <option value="Tootesilt / Label">Tootesilt / Label</option>
                          <option value="Üldvaade / Paigaldus">Üldvaade / Paigaldus</option>
                          <option value="Saateleht / Akt">Saateleht / Akt</option>
                          <option value="Ekspertiisi akt">Ekspertiisi akt</option>
                        </select>
                        <button type="submit" className="btn-secondary btn-sm">
                          <Upload size={14} />
                          <span>Lisa manus</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 2: MÄRKUSED (Requirement 8: Märkmed ümber nimetada märkused) */}
              {activeTab === 'notes' && (
                <div className="notes-tab-content">
                  <div className="spec-note-banner">
                    <span><strong>Neli ranget märkusetüüpi:</strong> 1. Lisainfo | 2. Käsitleja märkus | 3. Teenuse märkus | 4. Tagasilükkamise põhjus</span>
                  </div>

                  <div className="notes-stream">
                    {selectedClaim.notes && selectedClaim.notes.length > 0 ? (
                      selectedClaim.notes.map(n => (
                        <div key={n.id} className={`note-card note-type-${n.type?.toLowerCase()}`}>
                          <div className="note-header">
                            <span className="note-author">{n.author}</span>
                            <span className="note-type-badge">{n.typeLabel || n.type}</span>
                            <span className="note-date">{new Date(n.createdAt).toLocaleString('et-EE')}</span>
                          </div>
                          <div className="note-content">{n.content}</div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted">Märkusi pole veel lisatud.</p>
                    )}
                  </div>

                  <form onSubmit={handleAddNote} className="add-note-form">
                    <div className="note-type-selector">
                      <label>Märkuse liik:</label>
                      <select value={noteType} onChange={(e) => setNoteType(e.target.value)}>
                        {NOTE_TYPES.map(nt => (
                          <option key={nt.id} value={nt.id}>{nt.label}</option>
                        ))}
                      </select>
                    </div>

                    <textarea
                      rows={3}
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Sisestage märkuse sisu..."
                      required
                    />

                    <button type="submit" className="btn-primary btn-sm">
                      <Send size={16} />
                      Lisa märkus
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 3: TEGEVUSPLAAN (Requirement 7: Tegevusplaani lahter märkuste ja teenuste vahele) */}
              {activeTab === 'plan' && (
                <div className="action-plan-tab-content">
                  <div className="spec-note-banner">
                    <span><strong>Tegevusplaan:</strong> Määrab lahenduse etapid enne ja pärast teenindustöid. Kinnitaja saab tegevuskava tagasi lükata põhjendusega.</span>
                  </div>

                  {selectedClaim.actionPlan?.rejectionReason && (
                    <div className="alert-error-banner mb-3">
                      <AlertCircle size={18} />
                      <div>
                        <strong>Kinnitaja poolt tagasi lükatud tegevuskava!</strong>
                        <p>{selectedClaim.actionPlan.rejectionReason}</p>
                      </div>
                    </div>
                  )}

                  <div className="action-plan-editor-card">
                    <h4>Tegevusplaani koostamine / muutmine</h4>
                    <form onSubmit={handleSaveActionPlan}>
                      <div className="form-field">
                        <label>Tegevuskava sammud & kirjeldus *</label>
                        <textarea
                          rows={5}
                          value={planDescription}
                          onChange={(e) => setPlanDescription(e.target.value)}
                          placeholder="1. Tellida asendusosa tehase laost&#10;2. Teostada paigaldus meeskonnaga&#10;3. Tagastada defektne toode kvaliteedikontrolli..."
                          required
                        />
                      </div>

                      <div className="form-grid-2col">
                        <div className="form-field">
                          <label>Tähtaeg</label>
                          <input
                            type="date"
                            value={planDeadline}
                            onChange={(e) => setPlanDeadline(e.target.value)}
                          />
                        </div>
                        <div className="form-field">
                          <label>Vastutaja</label>
                          <input
                            type="text"
                            value={planAssignee}
                            onChange={(e) => setPlanAssignee(e.target.value)}
                            placeholder="nt Monika Koort"
                          />
                        </div>
                      </div>

                      <div className="plan-status-row">
                        <span>Plaani hetkeseis: </span>
                        <strong>{selectedClaim.actionPlan?.status === 'REJECTED' ? '⚠️ Tagasi lükatud' : selectedClaim.actionPlan?.status === 'APPROVED' ? '✅ Kinnitatud' : '🔄 Töös'}</strong>
                      </div>

                      <button type="submit" className="btn-primary mt-3">
                        Salvesta tegevusplaan
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 4: SERVICE MANAGEMENT */}
              {activeTab === 'service' && (
                <div className="service-tab-content">
                  {selectedClaim.service ? (
                    <div className="service-status-card">
                      <div className="service-header">
                        <h4>Määratud teenustöö</h4>
                        <span className={`status-pill ${selectedClaim.service.status === 'COMPLETED' ? 'badge-teal' : 'badge-purple'}`}>
                          {selectedClaim.service.status === 'COMPLETED' ? 'Tehtud' : 'Graafikus'}
                        </span>
                      </div>
                      <div className="info-kv-grid">
                        <div><span className="kv-label">Meeskond:</span> <strong>{selectedClaim.service.teamName}</strong></div>
                        <div><span className="kv-label">Kuupäev:</span> <strong>{selectedClaim.service.scheduledDate}</strong></div>
                        {selectedClaim.service.serviceMembers && (
                          <div className="col-span-2">
                            <span className="kv-label">Tehnikud / liikmed:</span> {selectedClaim.service.serviceMembers.join(', ')}
                          </div>
                        )}
                        <div className="col-span-2"><span className="kv-label">Tööjuhis:</span> {selectedClaim.service.notes || 'Spetsiaalseid juhiseid pole.'}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="assign-service-box">
                      <h4>Määra teenusmeeskond ja tehnikud</h4>
                      <form onSubmit={handleAssignService} className="service-form">
                        <div className="form-field">
                          <label>Teenusmeeskond *</label>
                          <select
                            value={selectedTeam}
                            onChange={(e) => setSelectedTeam(e.target.value)}
                            required
                          >
                            <option value="">-- Vali brigaad --</option>
                            {teams.map(t => (
                              <option key={t.id} value={t.id}>{t.name} ({t.contact})</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-field">
                          <label>Kavandatud kuupäev *</label>
                          <input
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            required
                          />
                        </div>

                        <div className="form-field">
                          <label>Määra mitu tehnikut / meeskonna liiget (komadega):</label>
                          <input
                            type="text"
                            placeholder="nt Jaan Tamm, Peeter Kuusk"
                            value={serviceMembers}
                            onChange={(e) => setServiceMembers(e.target.value)}
                          />
                        </div>

                        <div className="form-field">
                          <label>Tööülesande kirjeldus</label>
                          <textarea
                            rows={3}
                            value={serviceNotes}
                            onChange={(e) => setServiceNotes(e.target.value)}
                            placeholder="nt Vahetada klaaspakett kohapeal..."
                          />
                        </div>

                        <button type="submit" className="btn-primary">
                          Kinnita teenuse määramine
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: KULUKANDJA ETTEPANEK & MITME OSAKONNA VEAD (Requirement 11, 12, 15) */}
              {activeTab === 'cost' && (
                <div className="cost-tab-content">
                  <div className="spec-note-banner">
                    <span><strong>Kulukandja ettepanek (koostöös teenusega):</strong> Reklamatsioon võib tekkida kahe või enama osakonna veast (nt 50% Viimistlus + 50% Puidutootmine). Igal jaotusel kuvatakse vaikimisi veatüüp. Summa kokku peab olema 100%.</span>
                  </div>

                  {/* Active Allocations Display */}
                  {selectedClaim.costAllocations && selectedClaim.costAllocations.length > 0 && (
                    <div className="existing-allocations-card mb-3">
                      <h4>Kehtivad kulukandjate jaotused ({selectedClaim.costAllocations.length} osakonda)</h4>
                      <table className="splits-table">
                        <thead>
                          <tr>
                            <th>Kulukonto / Osakond</th>
                            <th>Veatüüp (Vaikimisi)</th>
                            <th>Protsent (%)</th>
                            <th>Summa (€)</th>
                            <th>Põhjendus</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedClaim.costAllocations.map((ca, idx) => (
                            <tr key={idx}>
                              <td><strong>{ca.departmentName}</strong></td>
                              <td><span className="defect-badge-small">{ca.defectTypeName}</span></td>
                              <td><strong>{ca.percentage}%</strong></td>
                              <td>{ca.amountEur} €</td>
                              <td>{ca.comment || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Multi-Department Allocation Builder */}
                  <div className="new-proposal-form-card">
                    <h4>Koosta kulukandja ettepanek (Kahe või enama osakonna jaotus)</h4>
                    <form onSubmit={handleSubmitProposal}>
                      <div className="form-field">
                        <label>Eeldatav kogukulu (€) *</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="nt 680.00"
                          value={costTotal}
                          onChange={(e) => setCostTotal(e.target.value)}
                          required
                        />
                      </div>

                      <div className="splits-builder">
                        <label>Osakondade jaotus ja veatüübid (Summa peab olema 100%):</label>
                        {costSplits.map((split, i) => (
                          <div key={i} className="split-row-multi">
                            <div className="split-account-col">
                              <label className="text-xs">Kulukonto:</label>
                              <select
                                value={split.accountId}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCostSplits(prev => prev.map((s, idx) => idx === i ? { ...s, accountId: val } : s));
                                }}
                              >
                                {costAccounts.map(ca => (
                                  <option key={ca.id} value={ca.id}>{ca.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="split-defect-col">
                              <label className="text-xs">Veatüüp sellele osakonnale:</label>
                              <select
                                value={split.defectTypeId}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCostSplits(prev => prev.map((s, idx) => idx === i ? { ...s, defectTypeId: val } : s));
                                }}
                              >
                                {defectTypes.map(dt => (
                                  <option key={dt.id} value={dt.id}>{dt.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="split-pct-col">
                              <label className="text-xs">Osa (%):</label>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={split.percentage}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setCostSplits(prev => prev.map((s, idx) => idx === i ? { ...s, percentage: val } : s));
                                }}
                              />
                            </div>

                            {costSplits.length > 1 && (
                              <button
                                type="button"
                                className="btn-icon-danger"
                                onClick={() => setCostSplits(prev => prev.filter((_, idx) => idx !== i))}
                                title="Eemalda osakond"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        ))}

                        <button
                          type="button"
                          className="btn-secondary btn-sm mt-2"
                          onClick={() => setCostSplits(prev => [...prev, {
                            accountId: 'dept-300',
                            percentage: 0,
                            defectTypeId: selectedClaim.defect?.type || 'other',
                            comment: '',
                          }])}
                        >
                          <Plus size={14} />
                          Lisa teine vastutav osakond
                        </button>

                        <div className="splits-sum-row mt-2">
                          Koguprotsent: <strong>{costSplits.reduce((a, s) => a + Number(s.percentage || 0), 0)}%</strong> (Nõutud: täpselt 100%)
                        </div>
                      </div>

                      <button type="submit" className="btn-primary mt-3">
                        Esita kulukandja ettepanek kinnitamiseks
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 6: ARVED (Requirement 10 & 16: Arved rekl. juurde, töö arve võib tekkida oluliselt hiljem) */}
              {activeTab === 'invoices' && (
                <div className="invoices-tab-content">
                  <div className="spec-note-banner">
                    <span><strong>Arved:</strong> Töö-, materjali- ja partneriarveid saab lisada mistahes etapis, sh oluliselt hiljem pärast tööde teostamist või kinnitamist.</span>
                  </div>

                  <div className="invoices-list-section">
                    <h4>Reklamatsiooniga seotud arved ({selectedClaim.invoices?.length || 0})</h4>
                    {selectedClaim.invoices && selectedClaim.invoices.length > 0 ? (
                      <table className="vau-data-table">
                        <thead>
                          <tr>
                            <th>Arve number</th>
                            <th>Kuupäev</th>
                            <th>Liik / Kirjeldus</th>
                            <th>Summa (€)</th>
                            <th>Fail</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedClaim.invoices.map((inv) => (
                            <tr key={inv.id}>
                              <td><strong>{inv.number}</strong></td>
                              <td>{inv.date}</td>
                              <td>{inv.type}</td>
                              <td><strong>{inv.amountEur} €</strong></td>
                              <td>
                                {inv.fileName ? (
                                  <span className="file-chip-small">
                                    <FileText size={14} />
                                    <span>{inv.fileName}</span>
                                  </span>
                                ) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-muted text-sm">Ühtegi arvet pole veel lisatud.</p>
                    )}
                  </div>

                  {/* Add Invoice Form */}
                  <div className="add-invoice-card mt-3">
                    <h4>Lisa uus arve</h4>
                    <form onSubmit={handleAddInvoice} className="invoice-form">
                      <div className="form-grid-2col">
                        <div className="form-field">
                          <label>Arve number *</label>
                          <input
                            type="text"
                            placeholder="nt ARV-2026-9921"
                            value={invoiceNumber}
                            onChange={(e) => setInvoiceNumber(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-field">
                          <label>Arve kuupäev *</label>
                          <input
                            type="date"
                            value={invoiceDate}
                            onChange={(e) => setInvoiceDate(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="form-grid-2col">
                        <div className="form-field">
                          <label>Summa (€) *</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="nt 340.00"
                            value={invoiceAmount}
                            onChange={(e) => setInvoiceAmount(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-field">
                          <label>Arve liik</label>
                          <select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)}>
                            <option value="Töö arve (Välitööd / Paigaldus)">Töö arve (Välitööd / Paigaldus)</option>
                            <option value="Materjali arve (Asendusdetailid)">Materjali arve (Asendusdetailid)</option>
                            <option value="Transpordi / logistika arve">Transpordi / logistika arve</option>
                            <option value="Tarnija garantiikrediit">Tarnija garantiikrediit</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-field">
                        <label>Arve faili nimi</label>
                        <input
                          type="text"
                          placeholder="nt arve_arv-2026-9921.pdf"
                          value={invoiceFile}
                          onChange={(e) => setInvoiceFile(e.target.value)}
                        />
                      </div>

                      <button type="submit" className="btn-primary mt-2">
                        Kinnita arve lisamine
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 7: MEILIVESTLUS (Requirement 30: rekl. seotud meilivestlus nähtavaks) */}
              {activeTab === 'emails' && (
                <div className="emails-tab-content">
                  <div className="spec-note-banner">
                    <span><strong>Meilivestlus:</strong> Reklamatsiooniga seotud kirjavahetus edasimüüja ja kliendiga. Kirjad seotakse automaatselt juhtumi numbriga.</span>
                  </div>

                  <div className="emails-stream">
                    {selectedClaim.emails && selectedClaim.emails.length > 0 ? (
                      selectedClaim.emails.map(em => (
                        <div key={em.id} className="email-message-card">
                          <div className="email-header">
                            <div>
                              <strong>{em.subject}</strong>
                              <div className="email-meta-text">
                                Saatja: {em.from} → Saaja: {em.to}
                              </div>
                            </div>
                            <span className="email-date">{new Date(em.date).toLocaleString('et-EE')}</span>
                          </div>
                          <div className="email-body-text">{em.body}</div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted text-sm">Meilivestlust pole veel alustatud.</p>
                    )}
                  </div>

                  {/* Send Email Form */}
                  <div className="compose-email-card mt-3">
                    <h4>Saada e-kiri / vasta edasimüüjale</h4>
                    <form onSubmit={handleSendEmail}>
                      <div className="form-field">
                        <label>Saaja e-post:</label>
                        <input
                          type="email"
                          value={emailTo}
                          onChange={(e) => setEmailTo(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-field">
                        <label>Teema:</label>
                        <input
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-field">
                        <label>Kirja sisu:</label>
                        <textarea
                          rows={4}
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          placeholder="Kirjuta teade edasimüüjale..."
                          required
                        />
                      </div>
                      <button type="submit" className="btn-primary">
                        <Send size={15} />
                        <span>Saada e-kiri</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 8: AUDIT TIMELINE (Requirement 19: Logis ära märkida muudatuse staatus) */}
              {activeTab === 'timeline' && (
                <div className="timeline-tab-content">
                  <div className="timeline-flow">
                    {selectedClaim.timeline && selectedClaim.timeline.length > 0 ? (
                      selectedClaim.timeline.map((item, idx) => (
                        <div key={item.id || idx} className="timeline-item">
                          <div className="timeline-dot" />
                          <div className="timeline-card">
                            <div className="timeline-card-header">
                              <span className="timeline-actor">{item.actor}</span>
                              <span className="timeline-timestamp">{new Date(item.timestamp).toLocaleString('et-EE')}</span>
                            </div>
                            <div className="timeline-event-text">
                              {/* Highlight status change if event mentions Staatus */}
                              {item.event.includes('Staatus') ? (
                                <span className="status-change-highlight">
                                  {item.event}
                                </span>
                              ) : (
                                item.event
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted">Ajajoon on tühi.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FILE PREVIEW LIGHTBOX (Requirement 28: Iga failitüübi vaatamine lihtsaks) */}
      {previewFile && (
        <div className="modal-backdrop file-preview-backdrop" onClick={() => setPreviewFile(null)}>
          <div className="modal-card file-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-with-icon">
                <FileText size={20} className="text-navy" />
                <div>
                  <h4>{previewFile.name}</h4>
                  <span className="text-xs text-muted">{previewFile.tag} • {previewFile.size}</span>
                </div>
              </div>
              <button className="icon-btn-close" onClick={() => setPreviewFile(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body file-preview-body">
              <div className="preview-doc-container">
                <FileText size={64} className="text-navy mb-2" />
                <h4>{previewFile.name}</h4>
                <p className="text-sm text-muted">Faili eelvaade ({previewFile.tag} • {previewFile.size})</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setPreviewFile(null)}>Sulge</button>
              <button className="btn-primary" onClick={() => alert(`Faili '${previewFile.name}' allalaadimine käivitatud.`)}>
                Laadi alla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Reason Modal for Rejection/Reopening */}
      {reasonModal.open && (
        <div className="modal-backdrop" onClick={() => setReasonModal({ open: false, targetStatus: null })}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {reasonModal.targetStatus === 'REJECTED'
                  ? 'Reklamatsiooni tagasilükkamine'
                  : 'Reklamatsiooni uuesti avamine'}
              </h3>
              <button className="icon-btn-close" onClick={() => setReasonModal({ open: false, targetStatus: null })}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="text-muted">
                Vastavalt äriloogika raudreeglitele (Spec 2.3) on põhjenduse sisestamine kohustuslik.
              </p>
              <div className="form-field">
                <label>Põhjendus *</label>
                <textarea
                  rows={4}
                  value={transitionReason}
                  onChange={(e) => setTransitionReason(e.target.value)}
                  placeholder="Kirjuta detailne põhjendus..."
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setReasonModal({ open: false, targetStatus: null })}>
                Loobu
              </button>
              <button className="btn-primary" onClick={confirmReasonTransition}>
                Kinnita muudatus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handlers Assignment Modal (Requirement 5) */}
      {handlerModalOpen && (
        <div className="modal-backdrop" onClick={() => setHandlerModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Määra käsitlejad ({selectedClaim?.id})</h3>
              <button className="icon-btn-close" onClick={() => setHandlerModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="text-muted">Määra üks või mitu vastutavat käsitlejat:</p>
              <div className="handlers-checklist">
                {allHandlers.map(h => (
                  <label key={h.id} className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={selectedHandlerIds.includes(h.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedHandlerIds(prev => [...prev, h.id]);
                        } else {
                          setSelectedHandlerIds(prev => prev.filter(id => id !== h.id));
                        }
                      }}
                    />
                    <span>{h.name} — {h.role} ({h.email})</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setHandlerModalOpen(false)}>Loobu</button>
              <button className="btn-primary" onClick={handleSaveHandlers}>Salvesta käsitlejad</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HandlerDashboard;
