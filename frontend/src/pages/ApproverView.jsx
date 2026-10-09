import React, { useState, useEffect } from 'react';
import {
  fetchClaims,
  approveCostProposal,
  updateClaimStatus,
  updateDefectType,
  fetchDefectTypes,
} from '../services/api';
import {
  CheckCircle,
  XCircle,
  DollarSign,
  AlertTriangle,
  Building,
  User,
  X,
  FileText,
  ShieldCheck,
  Flag,
  ArrowUpDown,
  Calendar,
  Layers,
  Receipt,
  FileCheck,
  Send,
} from 'lucide-react';

const ApproverView = () => {
  const [claims, setClaims] = useState([]);
  const [defectTypes, setDefectTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('criticality');
  const [statusFilter, setStatusFilter] = useState('ALL_RELEVANT');
  
  // Rejection modal state (handles both cost proposal & action plan rejection)
  const [rejectModal, setRejectModal] = useState({
    open: false,
    claimId: null,
    propId: null,
    type: 'COST_PROPOSAL', // 'COST_PROPOSAL' | 'ACTION_PLAN'
  });
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  
  // Inline defect editing state per claim
  const [selectedDefects, setSelectedDefects] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [allClaims, dTypes] = await Promise.all([
        fetchClaims('', '', sortBy),
        fetchDefectTypes().catch(() => []),
      ]);
      
      setDefectTypes(dTypes);

      // Approver cares about claims in approval, rejected claims needing attention, or open claims
      let relevant = allClaims.filter(c => {
        if (statusFilter === 'ALL_RELEVANT') {
          return (
            c.status === 'IN_APPROVAL' ||
            c.status === 'REJECTED' ||
            c.status === 'SERVICE_IN_PROGRESS' ||
            c.status === 'IN_PROGRESS' ||
            c.costProposals?.some(p => p.status === 'PENDING_APPROVAL')
          );
        }
        if (statusFilter === 'IN_APPROVAL') return c.status === 'IN_APPROVAL';
        if (statusFilter === 'REJECTED') return c.status === 'REJECTED';
        if (statusFilter === 'APPROVED') return c.status === 'APPROVED' || c.status === 'RESOLVED';
        return true;
      });

      // Sort in frontend if needed
      if (sortBy === 'criticality') {
        relevant.sort((a, b) => {
          if (a.status === 'REJECTED' && b.status !== 'REJECTED') return -1;
          if (b.status === 'REJECTED' && a.status !== 'REJECTED') return 1;
          if (a.status === 'IN_APPROVAL' && b.status !== 'IN_APPROVAL') return -1;
          if (b.status === 'IN_APPROVAL' && a.status !== 'IN_APPROVAL') return 1;
          return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
        });
      }

      setClaims(relevant);
      
      // Initialize selected defect types mapping
      const mapping = {};
      relevant.forEach(c => {
        mapping[c.id] = c.defect?.type || '';
      });
      setSelectedDefects(mapping);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sortBy, statusFilter]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && rejectModal.open) {
        e.stopPropagation();
        setRejectModal({ open: false, claimId: null, propId: null, type: 'COST_PROPOSAL' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rejectModal.open]);

  // Helper for status progress flag
  const getProgressFlag = (claim) => {
    if (claim.status === 'REJECTED') {
      return {
        label: 'Tagasi lükatud käsitlejale (Kriitiline)',
        className: 'flag-rejected',
        color: '#ef4444',
      };
    }
    if (claim.status === 'IN_APPROVAL') {
      return {
        label: 'Ootab kinnitamist',
        className: 'flag-approval',
        color: '#f59e0b',
      };
    }
    if (claim.status === 'APPROVED') {
      return {
        label: 'Kinnitatud (Ootab arveid / lahendamist)',
        className: 'flag-approved',
        color: '#10b981',
      };
    }
    if (claim.status === 'SERVICE_IN_PROGRESS') {
      return {
        label: 'Teenus töös (Enne kulukandja ettepanekut)',
        className: 'flag-service',
        color: '#3b82f6',
      };
    }
    if (claim.status === 'ON_HOLD') {
      return {
        label: 'Ootel / Inaktiivne',
        className: 'flag-hold',
        color: '#6b7280',
      };
    }
    return {
      label: 'Menetluses / Pooleli',
      className: 'flag-progress',
      color: '#6366f1',
    };
  };

  const handleDefectChange = async (claimId, newTypeId) => {
    setSelectedDefects(prev => ({ ...prev, [claimId]: newTypeId }));
    try {
      await updateDefectType(claimId, newTypeId, 'Kinnitaja tasemel määratud/korrigeeritud veatüüp');
      setActionSuccess(`Reklamatsiooni ${claimId} veatüüp edukalt uuendatud!`);
      setTimeout(() => setActionSuccess(''), 3500);
      loadData();
    } catch (err) {
      alert(`Veatüübi salvestamine ebaõnnestus: ${err.message}`);
    }
  };

  // Direct approve (e.g., approve claim / action plan before cost proposal or final approval)
  const handleDirectApproveClaim = async (claimId) => {
    try {
      await updateClaimStatus(claimId, 'APPROVED', {
        comment: 'Kinnitatud kinnitaja tasemel (tegevuskava aksepteeritud, arved võivad tekkida hiljem)',
        updatedBy: 'Tootmisjuht (Kinnitaja)',
      });
      setActionSuccess(`Juhtum ${claimId} ja selle tegevusplaan edukalt kinnitatud!`);
      setTimeout(() => setActionSuccess(''), 4000);
      loadData();
    } catch (err) {
      alert(`Kinnitamine ebaõnnestus: ${err.message}`);
    }
  };

  const handleApproveCostProposal = async (claimId, propId) => {
    try {
      await approveCostProposal(claimId, propId, {
        approved: true,
        approver: 'Tootmisjuht (Kinnitaja)',
      });
      setActionSuccess(`Kulukandja ettepanek juhtumile ${claimId} edukalt kinnitatud!`);
      setTimeout(() => setActionSuccess(''), 4000);
      loadData();
    } catch (err) {
      alert(`Kinnitamine ebaõnnestus: ${err.message}`);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim() || rejectionReason.trim().length < 5) {
      alert('Põhjus on kohustuslik (min 5 tähemärki)!');
      return;
    }

    try {
      if (rejectModal.type === 'COST_PROPOSAL' && rejectModal.propId) {
        await approveCostProposal(rejectModal.claimId, rejectModal.propId, {
          approved: false,
          rejectionReason,
          approver: 'Tootmisjuht (Kinnitaja)',
        });
      } else {
        // Action plan or direct claim rejection
        await updateClaimStatus(rejectModal.claimId, 'REJECTED', {
          comment: `Kinnitaja lükkas tagasi tegevusplaani/kinnituse: ${rejectionReason}`,
          updatedBy: 'Tootmisjuht (Kinnitaja)',
        });
      }

      setRejectModal({ open: false, claimId: null, propId: null, type: 'COST_PROPOSAL' });
      setActionSuccess(`Juhtum lükatud tagasi käsitlejale põhjendusega.`);
      setTimeout(() => setActionSuccess(''), 4000);
      loadData();
    } catch (err) {
      alert(`Tagasilükkamine ebaõnnestus: ${err.message}`);
    }
  };

  return (
    <div className="approver-view-page">
      {/* Header Banner */}
      <div className="approver-header-banner">
        <div className="banner-text">
          <h2>Kinnitaja töölaud — Tegevusplaanid ja Kulukandmise ettepanekud</h2>
          <p>
            Vastavalt raudreeglitele kinnitab kinnitaja veatüübi, tegevusplaani ja kulu jaotuse. Kinnitada saab ka enne kulukandja ettepanekut (kuna tööarve võib tekkida oluliselt hiljem). Tagasilükkamisel on põhjendus kohustuslik.
          </p>
        </div>
        <div className="role-pill">
          <ShieldCheck size={18} className="text-emerald" />
          <span>Aktiivne roll: <strong>Kinnitaja (Tootmisjuht)</strong></span>
        </div>
      </div>

      {/* Control bar: Sorting & Filtering */}
      <div className="approver-controls-bar card-box mb-3">
        <div className="filters-group">
          <label><ArrowUpDown size={16} /> Sorteeri:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="form-select-sm">
            <option value="criticality">Kriitilisus (Tagasi lükatud esimesena)</option>
            <option value="updatedAt">Viimati muudetud</option>
            <option value="createdAt">Loomiskuupäev</option>
          </select>

          <label className="ml-3">Filtreeri staatust:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-select-sm">
            <option value="ALL_RELEVANT">Kõik aktiivsed (Kinnitamisel, Töös, Tagasi lükatud)</option>
            <option value="IN_APPROVAL">Ainult kinnitamist ootavad</option>
            <option value="REJECTED">Ainult tagasi lükatud (Kriitilised)</option>
            <option value="APPROVED">Kinnitatud juhtumid</option>
          </select>
        </div>

        <div className="count-badge">
          Kokku töölaual: <strong>{claims.length}</strong> juhtumit
        </div>
      </div>

      {actionSuccess && (
        <div className="alert-success">
          <CheckCircle size={20} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {loading ? (
        <div className="loading-state">Laadin kinnitamist ootavaid juhtumeid...</div>
      ) : claims.length === 0 ? (
        <div className="empty-state card-box">
          <CheckCircle size={48} className="text-emerald" />
          <h3>Kõik tegevusplaanid ja ettepanekud on menetletud!</h3>
          <p className="text-muted">Ühtegi kinnitamist ootavat juhtumit valitud filtri järgi praegu laual pole.</p>
        </div>
      ) : (
        <div className="approvals-grid">
          {claims.map((claim) => {
            const flag = getProgressFlag(claim);
            const pendingProposal =
              claim.costProposals?.find(p => p.status === 'PENDING_APPROVAL') ||
              claim.costProposals?.[0];
            const hasMultipleDepts = claim.costAllocations && claim.costAllocations.length > 1;

            return (
              <div key={claim.id} className={`approval-card ${claim.status === 'REJECTED' ? 'card-border-danger' : ''}`}>
                {/* Top Bar with Status Flag */}
                <div className="approval-card-top">
                  <div className="approval-claim-info">
                    <div className="flex-align-center gap-2">
                      <span className="claim-id-big">{claim.id}</span>
                      <span
                        className="progress-flag-badge"
                        style={{ backgroundColor: `${flag.color}18`, color: flag.color, borderColor: `${flag.color}50` }}
                      >
                        <Flag size={12} />
                        {flag.label}
                      </span>
                    </div>
                    <span className="dealer-sub">
                      {claim.dealer?.name} ({claim.dealer?.country}) • Tellimus: <code>{claim.product?.orderNumber || 'Puudub'}</code>
                    </span>
                  </div>

                  <div className="amount-badge">
                    <span className="amount-val">
                      {pendingProposal?.totalAmountEur || claim.serviceCostEstimate || claim.actualCostEur || 0} €
                    </span>
                    <span className="amount-lbl">
                      {pendingProposal ? 'Ettepaneku summa' : 'Prognoositav kulu'}
                    </span>
                  </div>
                </div>

                <div className="approval-card-body">
                  {/* Product & Defect Summary */}
                  <div className="product-summary-box">
                    <div className="product-head-row">
                      <strong>Toode: {claim.product?.productName}</strong>
                      {claim.replacementOrderNumber && (
                        <span className="badge-replacement">
                          Asendustellimus: #{claim.replacementOrderNumber}
                        </span>
                      )}
                    </div>

                    {/* Defect Type Selection at Approver Level */}
                    <div className="approver-defect-selector">
                      <label>
                        <FileCheck size={14} className="text-primary" />
                        <strong>Veatüüp (Kinnitaja tasemel sisestamine / kinnitamine):</strong>
                      </label>
                      <div className="defect-select-row">
                        <select
                          className="form-select-sm"
                          value={selectedDefects[claim.id] || claim.defect?.type || ''}
                          onChange={(e) => handleDefectChange(claim.id, e.target.value)}
                        >
                          <option value="">-- Vali / täpsusta veatüüp --</option>
                          {defectTypes.map((dt) => (
                            <option key={dt.id} value={dt.id}>
                              {dt.name} ({dt.department})
                            </option>
                          ))}
                        </select>
                        <span className="text-muted small">
                          Vaikimisi veatüüp kulu jaotuse arvestuseks
                        </span>
                      </div>
                    </div>

                    <p className="defect-snippet mt-1">
                      <em>Kirjeldus:</em> {claim.defect?.description || 'Puudub'}
                    </p>
                  </div>

                  {/* Action Plan Section */}
                  <div className="approver-action-plan-box">
                    <div className="section-subtitle">
                      <Calendar size={15} />
                      <h4>Tegevusplaan (Kinnitamiseks):</h4>
                    </div>

                    {claim.actionPlan?.text ? (
                      <div className="action-plan-content">
                        <p className="action-plan-text">{claim.actionPlan.text}</p>
                        {claim.actionPlan.deadline && (
                          <div className="action-plan-meta">
                            <span>Tähtaeg: <strong>{claim.actionPlan.deadline}</strong></span>
                            {claim.actionPlan.assignedTo && (
                              <span>Vastutaja: <strong>{claim.actionPlan.assignedTo}</strong></span>
                            )}
                          </div>
                        )}
                        {claim.actionPlan.steps && claim.actionPlan.steps.length > 0 && (
                          <ul className="action-plan-steps">
                            {claim.actionPlan.steps.map((step, idx) => (
                              <li key={idx} className={step.done ? 'step-done' : ''}>
                                <span>{step.title || step}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : (
                      <div className="empty-subnote">
                        Käsitleja ei ole veel eraldi tegevuskava teksti koostanud (kinnitatakse standardse menetlusena).
                      </div>
                    )}
                  </div>

                  {/* Multi-department Cost Allocation / Splits */}
                  <div className="splits-review-table">
                    <div className="section-subtitle">
                      <Layers size={15} />
                      <h4>
                        Kulukandja ettepanek ja jaotus (Koostöös teenusega)
                        {hasMultipleDepts && <span className="badge-multidept">Kahe/mitme osakonna viga</span>}
                      </h4>
                    </div>

                    {claim.costAllocations && claim.costAllocations.length > 0 ? (
                      <table>
                        <thead>
                          <tr>
                            <th>Kulukonto / Osakond</th>
                            <th>Vaike-veatüüp</th>
                            <th>Osa (%)</th>
                            <th>Summa (€)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {claim.costAllocations.map((alloc, idx) => (
                            <tr key={idx}>
                              <td>
                                <div className="account-cell">
                                  <Building size={14} className="text-muted" />
                                  <span>{alloc.department} ({alloc.accountCode})</span>
                                </div>
                              </td>
                              <td>
                                <span className="badge-defect-sub">
                                  {alloc.defectType || claim.defect?.typeName || 'Vaike-viga'}
                                </span>
                              </td>
                              <td><strong>{alloc.percentage}%</strong></td>
                              <td>{alloc.amountEur} €</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : pendingProposal?.splits ? (
                      <table>
                        <thead>
                          <tr>
                            <th>Kulukonto / Osakond</th>
                            <th>Vaike-veatüüp</th>
                            <th>Osa (%)</th>
                            <th>Summa (€)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingProposal.splits.map((s, idx) => (
                            <tr key={idx}>
                              <td>
                                <div className="account-cell">
                                  <Building size={14} className="text-muted" />
                                  <span>{s.accountName}</span>
                                </div>
                              </td>
                              <td>
                                <span className="badge-defect-sub">
                                  {claim.defect?.typeName || 'Tootmisviga'}
                                </span>
                              </td>
                              <td><strong>{s.percentage}%</strong></td>
                              <td>{s.amountEur} €</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="empty-subnote">
                        Kulukandja ettepanekut pole veel koostatud. <em>Kinnitaja saab juhtumi ja tegevusplaani kinnitada ka enne kulukandja ettepanekut!</em>
                      </div>
                    )}
                  </div>

                  {/* Invoices list if any already attached */}
                  {claim.invoices && claim.invoices.length > 0 && (
                    <div className="approver-invoices-summary">
                      <div className="section-subtitle">
                        <Receipt size={14} />
                        <h5>Seotud arved ({claim.invoices.length} tk):</h5>
                      </div>
                      <div className="invoices-chip-list">
                        {claim.invoices.map((inv, idx) => (
                          <div key={idx} className="invoice-chip">
                            <strong>{inv.invoiceNumber}</strong>: {inv.amountEur} € ({inv.partnerName})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Proposer note */}
                  <div className="proposal-proposer-meta">
                    <User size={14} className="text-muted" />
                    <span>
                      Juhtumi käsitleja: <strong>{claim.handler || 'Määramata'}</strong>
                      {claim.handlers && claim.handlers.length > 1 && (
                        <span> (+ kaasatud: {claim.handlers.slice(1).join(', ')})</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Approver Action Buttons */}
                <div className="approval-card-actions">
                  {/* Reject action plan or proposal with mandatory reason */}
                  <button
                    className="btn-danger"
                    onClick={() => {
                      setRejectModal({
                        open: true,
                        claimId: claim.id,
                        propId: pendingProposal?.id || null,
                        type: pendingProposal ? 'COST_PROPOSAL' : 'ACTION_PLAN',
                      });
                      setRejectionReason('');
                    }}
                  >
                    <XCircle size={18} />
                    Lükka tagasi (Põhjendusega)
                  </button>

                  {/* Direct approval of claim & plan before proposal */}
                  {claim.status !== 'APPROVED' && (
                    <button
                      className="btn-outline-primary"
                      onClick={() => handleDirectApproveClaim(claim.id)}
                      title="Kinnita tegevusplaan koheselt, tööarve lisatakse hiljem"
                    >
                      <FileCheck size={18} />
                      Kinnita tegevusplaan
                    </button>
                  )}

                  {/* Approve cost proposal if proposal exists */}
                  {pendingProposal && pendingProposal.status === 'PENDING_APPROVAL' && (
                    <button
                      className="btn-success"
                      onClick={() => handleApproveCostProposal(claim.id, pendingProposal.id)}
                    >
                      <CheckCircle size={18} />
                      Kinnita kulukandja ettepanek (100%)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mandatory Rejection Reason Modal */}
      {rejectModal.open && (
        <div className="modal-backdrop" onClick={() => setRejectModal({ open: false, claimId: null, propId: null, type: 'COST_PROPOSAL' })}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {rejectModal.type === 'COST_PROPOSAL'
                  ? `Kulukandja ettepaneku tagasilükkamine (${rejectModal.claimId})`
                  : `Tegevusplaani tagasilükkamine (${rejectModal.claimId})`}
              </h3>
              <button
                className="icon-btn-close"
                onClick={() => setRejectModal({ open: false, claimId: null, propId: null, type: 'COST_PROPOSAL' })}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="alert-warning mb-2">
                <AlertTriangle size={18} />
                <span>
                  Raudreegel: Tagasilükkamisel on põhjendus rangelt kohustuslik. Juhtum märgitakse käsitlejale staatusesse <strong>TAGASI LÜKATUD (REJECTED)</strong>, mille käsitleja saab uuesti ette võtta.
                </span>
              </div>
              <div className="form-field">
                <label>Tagasilükkamise kohustuslik põhjendus *</label>
                <textarea
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Miks te ei nõustu tegevusplaani või kulujaotusega? (nt: Tehase viga puudub, paigaldaja rikkus serva; või: Kulu tuleks jaotada 50% Tootmine ja 50% Transport...)"
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setRejectModal({ open: false, claimId: null, propId: null, type: 'COST_PROPOSAL' })}
              >
                Loobu
              </button>
              <button className="btn-danger" onClick={handleRejectSubmit}>
                Kinnita tagasilükkamine
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApproverView;
