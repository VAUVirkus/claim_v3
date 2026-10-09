import React, { useState, useEffect } from 'react';
import { fetchClaims, fetchHandlers, assignClaimHandlers } from '../services/api';
import AdminMasterDataView from './AdminMasterDataView';
import {
  UserCog,
  Users,
  Search,
  Filter,
  ArrowUpDown,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Building2,
  FileText,
  ChevronRight,
  ShieldAlert,
  PauseCircle,
  ExternalLink,
  Check,
  X,
  Sparkles,
  Inbox,
} from 'lucide-react';

const ClaimDistributorView = ({ onNavigateToHandler }) => {
  const [claims, setClaims] = useState([]);
  const [handlers, setHandlers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'updatedAt', 'oldest'
  const [filterType, setFilterType] = useState('all'); // 'all', 'unassigned', 'submitted', 'onhold'
  
  // Tabs: 'distribution', 'masterdata'
  const [activeTab, setActiveTab] = useState('distribution');

  // Assign modal
  const [assignModal, setAssignModal] = useState({ open: false, claim: null });
  const [selectedHandlerIds, setSelectedHandlerIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [claimsData, handlersData] = await Promise.all([
        fetchClaims({ search: searchTerm, sortBy }),
        fetchHandlers(),
      ]);
      setClaims(claimsData || []);
      setHandlers(handlersData || []);
    } catch (err) {
      console.error('Error loading distributor data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sortBy]);

  // Search debounce / trigger
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const openAssignModal = (claim) => {
    const currentIds = (claim.handlers || []).map(h => h.id);
    setSelectedHandlerIds(currentIds);
    setAssignModal({ open: true, claim });
  };

  const toggleHandlerSelection = (handlerId) => {
    setSelectedHandlerIds(prev =>
      prev.includes(handlerId)
        ? prev.filter(id => id !== handlerId)
        : [...prev, handlerId]
    );
  };

  const handleSaveHandlers = async () => {
    if (!assignModal.claim) return;
    setSaving(true);
    try {
      await assignClaimHandlers(assignModal.claim.id, selectedHandlerIds);
      setSuccessMessage(`Juhtumile ${assignModal.claim.id} edukalt määratud ${selectedHandlerIds.length} käsitleja(t)!`);
      setAssignModal({ open: false, claim: null });
      setTimeout(() => setSuccessMessage(''), 4000);
      loadData();
    } catch (err) {
      alert(`Määramine ebaõnnestus: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredClaims = claims.filter(c => {
    if (filterType === 'unassigned') {
      return !c.handlers || c.handlers.length === 0;
    }
    if (filterType === 'critical') {
      return c.isCritical || c.status === 'REJECTED' || c.progressFlag === 'REJECTED_NEEDS_REVISION';
    }
    if (filterType === 'submitted') {
      return c.status === 'SUBMITTED';
    }
    if (filterType === 'onhold') {
      return c.status === 'ON_HOLD';
    }
    return true;
  });

  return (
    <div className="distributor-view-container">
      {/* Top Banner */}
      <div className="distributor-header-card">
        <div className="distributor-title-col">
          <div className="distributor-icon-badge">
            <UserCog size={28} className="text-purple" />
          </div>
          <div>
            <h2>Käsitleja määraja (Admin töölaud)</h2>
            <p className="text-muted">
              Reklamatsioonide tsentraalne jaotamine, mitme käsitleja määramine ja kriitiliste juhtumite prioriseerimine.
            </p>
          </div>
        </div>

        <div className="distributor-stats-pills">
          <div className="stat-badge stat-unassigned">
            <Users size={16} />
            <span>Käsitlejata juhtumid: <strong>{claims.filter(c => !c.handlers || c.handlers.length === 0).length}</strong></span>
          </div>
          <div className="stat-badge stat-submitted">
            <Inbox size={16} />
            <span>Uued esitatud: <strong>{claims.filter(c => c.status === 'SUBMITTED').length}</strong></span>
          </div>
          <div className="stat-badge stat-total">
            <FileText size={16} />
            <span>Kokku jaotamisel: <strong>{claims.length}</strong></span>
          </div>
        </div>

        {/* View Tabs */}
        <div className="distributor-view-tabs">
          <button 
            className={`distributor-tab-btn ${activeTab === 'distribution' ? 'active' : ''}`}
            onClick={() => setActiveTab('distribution')}
          >
            Reklamatsioonide jaotamine
          </button>
          <button 
            className={`distributor-tab-btn ${activeTab === 'masterdata' ? 'active' : ''}`}
            onClick={() => setActiveTab('masterdata')}
          >
            Põhiandmed
          </button>
        </div>
      </div>

      {activeTab === 'masterdata' ? (
        <AdminMasterDataView />
      ) : (
        <>
          {successMessage && (
            <div className="alert-success-banner">
              <CheckCircle2 size={18} />
              <span>{successMessage}</span>
            </div>
          )}

      {/* Control Bar: Search, Filters & Sorting */}
      <div className="distributor-controls-card">
        <form onSubmit={handleSearchSubmit} className="distributor-search-form">
          <div className="distributor-search-input-wrap">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Otsi laiendatud skoobiga (ID, klient, tellimuse nr, toode, asendustellimus, veatüüp, arve)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="distributor-search-field"
            />
          </div>
          <button type="submit" className="btn-primary distributor-search-btn">
            <Search size={15} />
            <span>Otsi</span>
          </button>
        </form>

        <div className="distributor-filter-actions-row">
          {/* Quick filter tabs */}
          <div className="segmented-filter-bar">
            <button
              type="button"
              className={`segmented-filter-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              <span>Kõik ({claims.length})</span>
            </button>
            <button
              type="button"
              className={`segmented-filter-btn highlight-unassigned ${filterType === 'unassigned' ? 'active' : ''}`}
              onClick={() => setFilterType('unassigned')}
            >
              <Users size={14} />
              <span>Määramata ({claims.filter(c => !c.handlers || c.handlers.length === 0).length})</span>
            </button>
            <button
              type="button"
              className={`segmented-filter-btn ${filterType === 'submitted' ? 'active' : ''}`}
              onClick={() => setFilterType('submitted')}
            >
              <Inbox size={14} />
              <span>Uued esitatud ({claims.filter(c => c.status === 'SUBMITTED').length})</span>
            </button>
            <button
              type="button"
              className={`segmented-filter-btn ${filterType === 'onhold' ? 'active' : ''}`}
              onClick={() => setFilterType('onhold')}
            >
              <span>Ootel ({claims.filter(c => c.status === 'ON_HOLD').length})</span>
            </button>
          </div>

          {/* Sorter */}
          <div className="distributor-sort-wrap">
            <ArrowUpDown size={15} className="text-muted" />
            <label className="text-sm font-semibold">Sorteeri:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-select-sm"
            >
              <option value="newest">📅 Uusimad esitatud eespool</option>
              <option value="updatedAt">🕒 Viimaste muudatuste järgi</option>
              <option value="oldest">📅 Vanimad esitatud eespool</option>
              <option value="id">🔢 Reklamatsiooni numbri järgi</option>
            </select>
          </div>
        </div>
      </div>

      {/* Claims Grid / Table */}
      <div className="distributor-list-card">
        {loading ? (
          <div className="loading-state-box">
            <Clock size={32} className="animate-spin text-muted" />
            <p>Laadin reklamatsioone...</p>
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="empty-state-box">
            <p className="text-muted">Valitud filtritega ühtegi juhtumit ei leitud.</p>
          </div>
        ) : (
          <div className="table-responsive-wrapper">
            <table className="vau-data-table distributor-table">
              <thead>
                <tr>
                  <th>Lipuke / Prioriteet</th>
                  <th>Juhtumi ID</th>
                  <th>Edasimüüja & Klient</th>
                  <th>Toode & Tellimus</th>
                  <th>Veatüüp & Kirjeldus</th>
                  <th>Määratud käsitlejad</th>
                  <th>Viimane muudatus</th>
                  <th>Tegevused</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.map((claim) => {
                  const isCritical = claim.isCritical || claim.progressFlag === 'REJECTED_NEEDS_REVISION' || claim.status === 'REJECTED';
                  const isUnassigned = !claim.handlers || claim.handlers.length === 0;

                  return (
                    <tr key={claim.id} className={`distributor-table-row ${isCritical ? 'row-critical-highlight' : ''}`}>
                      {/* Lipuke / Prioriteet */}
                      <td className="col-priority">
                        {isCritical ? (
                          <span className="dist-flag-badge flag-critical" title="Kinnitamiselt tagasi saadetud või kõrgeima prioriteediga">
                            <ShieldAlert size={14} />
                            <span>Kriitiline</span>
                          </span>
                        ) : claim.status === 'ON_HOLD' ? (
                          <span className="dist-flag-badge flag-onhold">
                            <PauseCircle size={14} />
                            <span>Ootel</span>
                          </span>
                        ) : isUnassigned ? (
                          <span className="dist-flag-badge flag-unassigned">
                            <Clock size={14} />
                            <span>Uus määramata</span>
                          </span>
                        ) : (
                          <span className="dist-flag-badge flag-progress">
                            <CheckCircle2 size={14} />
                            <span>{claim.statusLabel || claim.status}</span>
                          </span>
                        )}
                      </td>

                      {/* Juhtumi ID */}
                      <td className="col-claim-id">
                        <div className="table-claim-id-box">
                          <strong className="claim-id-highlight">{claim.id}</strong>
                          {claim.replacementOrderNumber && (
                            <div className="replacement-tag">
                              <span className="replacement-prefix">Asendus:</span>
                              <code>{claim.replacementOrderNumber}</code>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Edasimüüja & Klient */}
                      <td className="col-dealer">
                        <div className="table-dealer-box">
                          <strong className="dealer-name-primary">{claim.dealer?.name}</strong>
                          {claim.endCustomer?.name ? (
                            <span className="end-customer-sub">
                              <span className="sub-label">Lõppklient:</span> {claim.endCustomer.name}
                            </span>
                          ) : (
                            <span className="country-code-pill">{claim.dealer?.country || 'EST'}</span>
                          )}
                        </div>
                      </td>

                      {/* Toode & Tellimus */}
                      <td className="col-product">
                        <div className="table-product-box">
                          <span className="product-title-bold">{claim.product?.productName}</span>
                          <div className="order-meta-line">
                            <span className="order-label">Tellimus:</span>
                            <code>{claim.product?.orderNumber || '—'}</code>
                          </div>
                        </div>
                      </td>

                      {/* Veatüüp & Kirjeldus */}
                      <td className="col-defect">
                        <div className="table-defect-box">
                          <span className="defect-type-tag">{claim.defect?.typeName || claim.defect?.type}</span>
                          <p className="defect-desc-preview" title={claim.defect?.description}>
                            {claim.defect?.description || 'Kirjeldus puudub'}
                          </p>
                        </div>
                      </td>

                      {/* Määratud käsitlejad */}
                      <td className="col-handlers">
                        <div className="table-handlers-box">
                          {claim.handlers && claim.handlers.length > 0 ? (
                            <div className="handler-chips-cluster">
                              {claim.handlers.map((h, idx) => {
                                const name = typeof h === 'object' ? (h.name || h.id) : h;
                                return (
                                  <span key={idx} className="handler-assigned-pill">
                                    {name}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="unassigned-alert-pill">
                              <AlertTriangle size={12} />
                              <span>Määramata</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Viimane muudatus */}
                      <td className="col-date">
                        <div className="table-time-box">
                          <span className="date-line">
                            {new Date(claim.updatedAt || claim.createdAt).toLocaleDateString('et-EE')}
                          </span>
                          <span className="time-line">
                            {new Date(claim.updatedAt || claim.createdAt).toLocaleTimeString('et-EE', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>

                      {/* Tegevused */}
                      <td className="col-actions">
                        <div className="table-actions-box">
                          <button
                            type="button"
                            className="btn-assign-handlers-table"
                            onClick={() => openAssignModal(claim)}
                            title="Määra või muuda käsitlejaid"
                          >
                            <Users size={14} />
                            <span>Määra käsitlejad</span>
                          </button>
                          {onNavigateToHandler && (
                            <button
                              type="button"
                              className="btn-open-detail-table"
                              onClick={() => onNavigateToHandler(claim.id)}
                              title="Ava käsitleja töölaual"
                            >
                              <ExternalLink size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MULTI-HANDLER ASSIGNMENT MODAL */}
      {assignModal.open && (
        <div className="modal-backdrop" onClick={() => setAssignModal({ open: false, claim: null })}>
          <div className="modal-card modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-with-icon">
                <UserCog size={22} className="text-purple" />
                <div>
                  <h3>Määra käsitlejad: {assignModal.claim?.id}</h3>
                  <span className="text-xs text-muted">
                    {assignModal.claim?.dealer?.name} • {assignModal.claim?.product?.productName}
                  </span>
                </div>
              </div>
              <button className="icon-btn-close" onClick={() => setAssignModal({ open: false, claim: null })}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-lead-text">
                Vali üks või mitu käsitlejat (Teenuse ja juhtumi lahendamise meeskond):
              </p>

              <div className="handlers-checklist-grid">
                {handlers.map((h) => {
                  const isSelected = selectedHandlerIds.includes(h.id);
                  return (
                    <div
                      key={h.id}
                      className={`handler-select-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleHandlerSelection(h.id)}
                    >
                      <div className="handler-select-checkbox">
                        {isSelected ? <Check size={16} className="text-white" /> : null}
                      </div>
                      <div className="handler-select-meta">
                        <strong>{h.name}</strong>
                        <span className="text-xs text-muted">{h.role || 'Käsitleja'} • {h.email}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedHandlerIds.length === 0 && (
                <p className="text-danger text-xs mt-2">
                  ⚠️ Märkus: kui käsitlejaid ei valita, jääb reklamatsioon määramata staatusesse.
                </p>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setAssignModal({ open: false, claim: null })}
              >
                Loobu
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveHandlers}
                disabled={saving}
              >
                {saving ? 'Salvestan...' : `Kinnita määramine (${selectedHandlerIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
      
        </>
      )}
    </div>
  );
};

export default ClaimDistributorView;
