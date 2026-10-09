import React, { useState, useEffect } from 'react';
import { fetchClaims } from '../services/api';
import PublicClaimView from './PublicClaimView';
import {
  Building2,
  FileText,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Eye,
  RefreshCw,
  Search,
  Wrench,
  X,
  FileCheck,
  LayoutDashboard,
} from 'lucide-react';

const STATUS_CONFIG = {

  SUBMITTED: { label: 'Esitatud', color: 'badge-blue' },
  HANDLER_ASSIGNED: { label: 'Käsitleja määratud', color: 'badge-indigo' },
  IN_PROGRESS: { label: 'Töös', color: 'badge-amber' },
  ON_HOLD: { label: 'Ootel / Inaktiivne', color: 'badge-gray' },
  SERVICE_ASSIGNED: { label: 'Teenus määratud', color: 'badge-cyan' },
  SERVICE_COMPLETED: { label: 'Teenus tehtud', color: 'badge-teal' },
  COST_PROPOSED: { label: 'Menetluses', color: 'badge-purple' },
  IN_APPROVAL: { label: 'Kinnitamisel', color: 'badge-orange' },
  APPROVED: { label: 'Kinnitatud / Lahendatud', color: 'badge-emerald' },
  CLOSED: { label: 'Lõpetatud', color: 'badge-gray' },
  REJECTED: { label: 'Tagasi lükatud', color: 'badge-red' },
  REOPENED: { label: 'Uuesti avatud', color: 'badge-amber' },
};

const DealerPortalView = ({ user }) => {
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'new'
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('criticality'); // 'criticality', 'newest', 'oldest', 'status', 'id'
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  const dealerCode = user?.dealerCode || '1001';

  const loadDealerClaims = async () => {
    setLoading(true);
    try {
      const data = await fetchClaims({ dealerCode, sortBy });
      setClaims(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDealerClaims();
  }, [dealerCode, sortBy]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (previewFile) setPreviewFile(null);
        else if (selectedClaim) setSelectedClaim(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClaim, previewFile]);

  // Wide scope filtering
  const filteredClaims = claims.filter(c => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (c.id || '').toLowerCase().includes(q) ||
      (c.product?.productName || '').toLowerCase().includes(q) ||
      (c.product?.orderNumber || '').toLowerCase().includes(q) ||
      (c.product?.serialNumber || '').toLowerCase().includes(q) ||
      (c.replacementOrderNumber || '').toLowerCase().includes(q) ||
      (c.defect?.typeName || '').toLowerCase().includes(q) ||
      (c.defect?.description || '').toLowerCase().includes(q) ||
      (c.endCustomer?.name || '').toLowerCase().includes(q) ||
      (c.actionPlan?.description || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="dealer-portal-container">
      {/* Dealer Welcome Banner */}
      <div className="dealer-header-card">
        <div className="dealer-header-main-row">
          <div className="dealer-profile-info">
            <div className="dealer-avatar-badge">
              <Building2 size={28} className="text-navy" />
            </div>
            <div>
              <div className="dealer-badge-row">
                <span className="badge-dealer-code">Kood: {dealerCode}</span>
                <span className="badge-country">{user?.country || 'EST'}</span>
              </div>
              <h2 className="dealer-company-title">{user?.company || 'Edasimüüja portaal'}</h2>
              <p className="dealer-contact-sub">
                Esindaja: <strong>{user?.name}</strong> • {user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Tab navigation bar for Account mode */}
        <div className="dealer-subnav-bar">
            <div className="dealer-nav-tabs">
              <button
                className={`dealer-tab-pill ${activeTab === 'list' ? 'active' : ''}`}
                onClick={() => setActiveTab('list')}
              >
                <FileText size={16} />
                <span>Minu pretensioonid</span>
                <span className="tab-counter-badge">{claims.length}</span>
              </button>
              <button
                className={`dealer-tab-pill ${activeTab === 'new' ? 'active' : ''}`}
                onClick={() => setActiveTab('new')}
              >
                <PlusCircle size={16} />
                <span>Esita uus pretensioon</span>
              </button>
            </div>
          </div>
      </div>

      {/* TAB 1: LIST OF CLAIMS (Konto ja üldvaade) */}
      {activeTab === 'list' && (
        <div className="dealer-content-layout">
          <div className="table-controls-bar">
            <div className="search-field-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Otsi laiema skoobiga (Juhtumi ID, toode, tellimus, asendustellimus, veatüüp)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            {/* Sorteerimine (Requirement 1: Pretensiooni esitaja vaates juhtumi sorteerimine) */}
            <div className="sort-selector-wrapper">
              <label className="text-sm font-semibold">Sorteeri:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="criticality">⚠️ Tähelepanu vajavad esimesena (Tagasi lükatud)</option>
                <option value="newest">📅 Kuupäev: Uusimad eespool</option>
                <option value="oldest">📅 Kuupäev: Vanimad eespool</option>
                <option value="updatedAt">🕒 Viimaste muudatuste järgi</option>
                <option value="id">🔢 Reklamatsiooni number</option>
              </select>
            </div>

            <button className="btn-secondary btn-sm" onClick={loadDealerClaims} title="Uuenda andmeid">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>Värskenda</span>
            </button>
          </div>

          {loading ? (
            <div className="loading-state-card">
              <RefreshCw className="animate-spin text-navy" size={32} />
              <p>Laadin teie esitatud pretensioone...</p>
            </div>
          ) : filteredClaims.length === 0 ? (
            <div className="empty-state-card">
              <FileCheck size={48} className="text-muted" />
              <h3>Aktiivseid pretensioone ei leitud</h3>
              <p className="text-muted">
                {searchTerm ? 'Otsingutingimustele vastavaid juhtumeid pole.' : 'Teil ei ole hetkel pooleliolevaid reklamatsioone.'}
              </p>
              <button className="btn-primary mt-3" onClick={() => setActiveTab('new')}>
                <PlusCircle size={18} />
                <span>Esita uus pretensioon</span>
              </button>
            </div>
          ) : (
            <div className="table-responsive-wrapper">
              <table className="vau-data-table">
                <thead>
                  <tr>
                    <th>Lipuke / Protsess</th>
                    <th>Number</th>
                    <th>Toode & Tellimus</th>
                    <th>Veatüüp & Kirjeldus</th>
                    <th>Esitatud</th>
                    <th>Staatus</th>
                    <th>Toiming</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClaims.map((claim) => {
                    const cfg = STATUS_CONFIG[claim.status] || { label: claim.status, color: 'badge-gray' };
                    const isRejectedNeedsRevision = claim.isCritical || claim.progressFlag === 'REJECTED_NEEDS_REVISION' || claim.status === 'REJECTED';

                    return (
                      <tr key={claim.id} className={isRejectedNeedsRevision ? 'row-critical-highlight' : ''}>
                        <td>
                          {/* Requirement 18: Panna lipuke külge kui kaugel reklamatsioon on */}
                          {isRejectedNeedsRevision ? (
                            <span className="progress-flag-badge flag-critical" title="Kinnitamiselt tagasi saadetud ja vajab täiendamist!">
                              ⚠️ Tagasi suunatud
                            </span>
                          ) : claim.status === 'ON_HOLD' ? (
                            <span className="progress-flag-badge flag-onhold">
                              ⏸️ Ootel
                            </span>
                          ) : claim.status === 'SUBMITTED' ? (
                            <span className="progress-flag-badge flag-unassigned">
                              📥 Esitatud
                            </span>
                          ) : claim.status === 'APPROVED' || claim.status === 'CLOSED' ? (
                            <span className="progress-flag-badge flag-progress">
                              ✅ Lahendatud
                            </span>
                          ) : (
                            <span className="progress-flag-badge flag-progress">
                              🔄 Töös
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="claim-code-cell">
                            <strong>{claim.id}</strong>
                            {claim.replacementOrderNumber && (
                              <span className="replacement-code-pill" title="Asendustellimuse number">
                                Asendus: {claim.replacementOrderNumber}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div>
                            <strong>{claim.product?.productName}</strong>
                            <div className="text-xs text-muted">
                              Tellimus: {claim.product?.orderNumber || '—'}
                              {claim.product?.serialNumber && ` • SN: ${claim.product.serialNumber}`}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <span className="defect-badge-small">{claim.defect?.typeName || claim.defect?.type}</span>
                            <p className="defect-snippet-text">{claim.defect?.description}</p>
                          </div>
                        </td>
                        <td>
                          <span className="text-xs text-muted">
                            {new Date(claim.createdAt).toLocaleDateString('et-EE')}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${cfg.color}`}>{cfg.label}</span>
                        </td>
                        <td>
                          <button
                            className="btn-icon-subtle"
                            onClick={() => setSelectedClaim(claim)}
                            title="Vaata pretensiooni detaile"
                          >
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUBMIT FORM */}
      {activeTab === 'new' && (
        <div className="dealer-new-claim-wrapper">
          <PublicClaimView
            prefilledDealer={user}
            onSuccess={(newClaim) => {
              loadDealerClaims();
              setActiveTab('list');
            }}
          />
        </div>
      )}

      {/* CLAIM DETAIL MODAL FOR DEALER */}
      {selectedClaim && (
        <div className="modal-backdrop" onClick={() => setSelectedClaim(null)}>
          <div className="modal-card dealer-claim-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-with-icon">
                <FileText size={22} className="text-navy" />
                <div>
                  <h3>Reklamatsiooni ülevaade: {selectedClaim.id}</h3>
                  <span className={`status-pill ${(STATUS_CONFIG[selectedClaim.status] || {}).color || 'badge-gray'}`}>
                    {(STATUS_CONFIG[selectedClaim.status] || {}).label || selectedClaim.status}
                  </span>
                </div>
              </div>
              <button className="icon-btn-close" onClick={() => setSelectedClaim(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Product Info */}
              <div className="info-section-card">
                <h4>Toote andmed</h4>
                <div className="info-kv-grid">
                  <div><span className="kv-label">Toode:</span> <strong>{selectedClaim.product?.productName}</strong></div>
                  <div><span className="kv-label">Tellimuse nr:</span> <code>{selectedClaim.product?.orderNumber || 'Puudub'}</code></div>
                  <div><span className="kv-label">Asendustellimus:</span> <code>{selectedClaim.replacementOrderNumber || '—'}</code></div>
                  <div><span className="kv-label">Kogus:</span> {selectedClaim.product?.quantity} tk</div>
                  <div><span className="kv-label">Paigaldatud:</span> {selectedClaim.product?.isInstalled ? 'Jah' : 'Ei'}</div>
                </div>
              </div>

              {/* Defect Description */}
              <div className="info-section-card">
                <h4>Esitatud veatüüp & kirjeldus</h4>
                <div className="defect-detail-box">
                  <span className="defect-category-badge">{selectedClaim.defect?.typeName}</span>
                  <p className="defect-text">{selectedClaim.defect?.description}</p>
                </div>
              </div>

              {/* Attached Files (Requirement 28: Failide vaatamine lihtsaks) */}
              <div className="info-section-card">
                <h4>Lisatud failid & fotod ({selectedClaim.files?.length || 0})</h4>
                {selectedClaim.files && selectedClaim.files.length > 0 ? (
                  <div className="files-gallery-grid">
                    {selectedClaim.files.map((file) => (
                      <div
                        key={file.id}
                        className="file-gallery-card clickable"
                        onClick={() => setPreviewFile(file)}
                        title="Klõpsa faili vaatamiseks"
                      >
                        <FileText size={22} className="text-navy" />
                        <div className="file-card-details">
                          <span className="file-title">{file.name}</span>
                          <span className="file-tag-badge">{file.tag || 'Manus'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted text-sm">Manuseid ei lisatud.</p>
                )}
              </div>

              {/* Service Status if applicable */}
              {selectedClaim.service && (
                <div className="info-section-card">
                  <h4>Teenuse seis</h4>
                  <div className="info-kv-grid">
                    <div><span className="kv-label">Meeskond:</span> {selectedClaim.service.teamName}</div>
                    <div><span className="kv-label">Kuupäev:</span> {selectedClaim.service.scheduledDate || 'Kokkuleppel'}</div>
                    <div><span className="kv-label">Olek:</span> <strong>{selectedClaim.service.status === 'COMPLETED' ? 'Lõpetatud' : 'Broneeritud'}</strong></div>
                  </div>
                </div>
              )}

              {/* Timeline Events for Dealer */}
              <div className="info-section-card">
                <h4>Käsitluse ajajoon</h4>
                <div className="timeline-stream">
                  {(selectedClaim.timeline || []).map((t, idx) => (
                    <div key={t.id || idx} className="timeline-item">
                      <div className="timeline-dot" />
                      <div className="timeline-body">
                        <div className="timeline-top">
                          <span className="timeline-actor">{t.actor}</span>
                          <span className="timeline-time">{new Date(t.timestamp).toLocaleString('et-EE')}</span>
                        </div>
                        <p className="timeline-text">{t.event}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedClaim(null)}>Sulge</button>
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
                  <span className="text-xs text-muted">{previewFile.tag} • {previewFile.size || 'Fail'}</span>
                </div>
              </div>
              <button className="icon-btn-close" onClick={() => setPreviewFile(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body file-preview-body">
              {previewFile.name.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                <div className="preview-image-container">
                  <div className="mock-image-viewer">
                    <FileText size={64} className="text-muted mb-2" />
                    <p className="font-semibold text-navy">{previewFile.name}</p>
                    <span className="text-xs text-muted">Defekti foto eelvaade ({previewFile.size})</span>
                  </div>
                </div>
              ) : previewFile.name.match(/\.(pdf)$/i) ? (
                <div className="preview-doc-container">
                  <FileText size={56} className="text-danger mb-2" />
                  <h4>PDF Dokument: {previewFile.name}</h4>
                  <p className="text-sm text-muted">Ametlik saateleht / vastuvõtuakt / tehniline joonis</p>
                </div>
              ) : (
                <div className="preview-doc-container">
                  <FileText size={56} className="text-blue mb-2" />
                  <h4>{previewFile.name}</h4>
                  <p className="text-sm text-muted">Manustatud fail ({previewFile.tag})</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setPreviewFile(null)}>Sulge</button>
              <button className="btn-primary" onClick={() => alert(`Faili '${previewFile.name}' allalaadimine alustatud.`)}>
                Laadi alla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealerPortalView;
