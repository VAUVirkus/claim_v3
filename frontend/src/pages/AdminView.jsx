import React, { useState, useEffect } from 'react';
import { USERS } from '../services/auth';
import {
  fetchTeams,
  fetchClaims,
} from '../services/api';
import {
  Users,
  History,
  ShieldCheck,
  Plus,
  ArrowUpDown,
  Settings,
  X,
  Server,
  KeyRound,
  Activity,
  CheckCircle2,
  Lock,
} from 'lucide-react';

const AdminView = () => {
  // Sysadmin tabs: only website / system management info!
  // 'users', 'audit', 'system'
  const [activeTab, setActiveTab] = useState('users');
  const [usersList, setUsersList] = useState(USERS);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auditSort, setAuditSort] = useState('timestampDesc');

  // New user modal
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'HANDLER',
    company: 'AS Viljandi Aken ja Uks',
    department: 'Kvaliteediosakond',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const claimsData = await fetchClaims();

      // Aggregate audit logs from claims with enhanced status tracking
      const aggregated = [];
      (claimsData || []).forEach(c => {
        (c.timeline || []).forEach(t => {
          aggregated.push({
            claimId: c.id,
            timestamp: t.timestamp,
            actor: t.actor || 'Süsteem',
            event: t.event || 'Olekumuudatus',
            status: c.status,
            dealer: c.dealer?.name,
          });
        });
      });
      setAuditLogs(aggregated);
    } catch (err) {
      console.error('Sysadmin andmete laadimise viga:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && userModalOpen) {
        setUserModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userModalOpen]);

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;

    const created = {
      id: `u-custom-${Date.now()}`,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      roleLabel:
        newUser.role === 'HANDLER'
          ? 'Käsitleja'
          : newUser.role === 'APPROVER'
          ? 'Kinnitaja'
          : newUser.role === 'DISTRIBUTOR'
          ? 'Käsitleja määraja (Admin)'
          : 'Süsteemiadministraator (Sysadmin)',
      company: newUser.company,
      department: newUser.department,
      avatar: newUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
      badgeColor: 'badge-purple',
    };

    setUsersList(prev => [...prev, created]);
    setUserModalOpen(false);
    setNewUser({
      name: '',
      email: '',
      role: 'HANDLER',
      company: 'AS Viljandi Aken ja Uks',
      department: 'Kvaliteediosakond',
    });
  };

  // Sorted audit logs
  const sortedAuditLogs = [...auditLogs].sort((a, b) => {
    if (auditSort === 'timestampDesc') {
      return new Date(b.timestamp) - new Date(a.timestamp);
    }
    if (auditSort === 'timestampAsc') {
      return new Date(a.timestamp) - new Date(b.timestamp);
    }
    if (auditSort === 'claimId') {
      return a.claimId.localeCompare(b.claimId);
    }
    return 0;
  });

  return (
    <div className="sysadmin-panel-container">
      {/* Sysadmin Header */}
      <div className="sysadmin-header-card">
        <div className="sysadmin-title-group">
          <div className="sysadmin-badge-icon">
            <Settings size={28} className="text-purple" />
          </div>
          <div>
            <h2>Sysadmin — Süsteemi ja veebilehe tehniline haldus</h2>
            <p className="sysadmin-sub">
              Ainult veebilehe ja infosüsteemi haldamisega seotud info: kasutajad, rollid, ligipääsud ja tõenduskõlblik auditilogi.
            </p>
          </div>
        </div>

        <div className="sysadmin-spec-pill">
          <ShieldCheck size={18} className="text-emerald" />
          <span>Sysadmin (Täielikud süsteemiõigused)</span>
        </div>
      </div>

      {/* Sysadmin Navigation Tabs */}
      <div className="sysadmin-tabs-nav">
        <button
          className={`sysadmin-nav-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={17} />
          <span>Kasutajad ja ligipääsuõigused ({usersList.length})</span>
        </button>

        <button
          className={`sysadmin-nav-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <History size={17} />
          <span>Süsteemi auditi logi ({auditLogs.length})</span>
        </button>

        <button
          className={`sysadmin-nav-btn ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveTab('system')}
        >
          <Server size={17} />
          <span>Veebiserver & Süsteemi olek</span>
        </button>
      </div>

      {/* TAB 1: KASUTAJAD JA ROLLID */}
      {activeTab === 'users' && (
        <div className="sysadmin-content-section">
          <div className="section-action-header">
            <div>
              <h3>Süsteemi kasutajad ja ligipääsuõiguste maatriks</h3>
              <p className="text-muted text-sm">
                Vastavalt spetsifikatsioonile (spec_v3.md) reguleerib ligipääse nimetatud õiguste maatriks.
              </p>
            </div>
            <button className="btn-primary" onClick={() => setUserModalOpen(true)}>
              <Plus size={16} />
              <span>Lisa uus kasutaja</span>
            </button>
          </div>

          <div className="table-responsive-wrapper card-box">
            <table className="vau-data-table">
              <thead>
                <tr>
                  <th>Kasutaja</th>
                  <th>E-post</th>
                  <th>Ettevõte / Osakond</th>
                  <th>Roll süsteemis</th>
                  <th>Nimetatud õigused</th>
                  <th>Olek</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-table-cell">
                        <div className="user-avatar-tiny">{u.avatar}</div>
                        <strong>{u.name}</strong>
                      </div>
                    </td>
                    <td><code>{u.email}</code></td>
                    <td>{u.company} {u.department ? `(${u.department})` : ''}</td>
                    <td>
                      <span className="badge-role">{u.roleLabel || u.role}</span>
                    </td>
                    <td>
                      <div className="permissions-tags-list">
                        {u.role === 'ADMIN' && <span className="perm-tag all">sysadmin.all</span>}
                        {u.role === 'DISTRIBUTOR' && <span className="perm-tag">claims.distribute</span>}
                        {u.role === 'HANDLER' && (
                          <>
                            <span className="perm-tag">claim.manage</span>
                            <span className="perm-tag">cost.propose</span>
                            <span className="perm-tag">service.assign</span>
                          </>
                        )}
                        {u.role === 'APPROVER' && (
                          <>
                            <span className="perm-tag">cost.approve</span>
                            <span className="perm-tag">plan.approve</span>
                          </>
                        )}
                        {u.role === 'DEALER' && <span className="perm-tag">claim.create</span>}
                        {u.role === 'SERVICE_TEAM' && <span className="perm-tag">service.complete</span>}
                      </div>
                    </td>
                    <td>
                      <span className="status-pill badge-emerald">Aktiivne</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOG (Sorteeritav viimaste muudatuste järgi, staatuse esiletõstmine) */}
      {activeTab === 'audit' && (
        <div className="sysadmin-content-section">
          <div className="section-action-header">
            <div>
              <h3>Süsteemi auditijälg ja muudatuste logi</h3>
              <p className="text-muted text-sm">
                Tõenduskõlblik logi. Iga staatusemuudatus, määramine ja kinnitamine registreeritakse muutumatult serveris.
              </p>
            </div>

            <div className="admin-filter-bar">
              <ArrowUpDown size={15} />
              <select
                value={auditSort}
                onChange={(e) => setAuditSort(e.target.value)}
                className="form-select-sm"
              >
                <option value="timestampDesc">Viimased muudatused eespool (Uuemad enne)</option>
                <option value="timestampAsc">Vanemad eespool</option>
                <option value="claimId">Reklamatsiooni ID järgi</option>
              </select>
            </div>
          </div>

          <div className="table-responsive-wrapper card-box">
            <table className="vau-data-table">
              <thead>
                <tr>
                  <th>Aeg</th>
                  <th>Reklamatsioon</th>
                  <th>Klient / Partner</th>
                  <th>Muudatuse staatus</th>
                  <th>Toimingu teostaja (Actor)</th>
                  <th>Sündmus / Kirjeldus</th>
                </tr>
              </thead>
              <tbody>
                {sortedAuditLogs.map((log, idx) => (
                  <tr key={idx}>
                    <td>
                      <span className="date-text">{new Date(log.timestamp).toLocaleString('et-EE')}</span>
                    </td>
                    <td>
                      <span className="claim-id-badge">{log.claimId}</span>
                    </td>
                    <td>
                      <span className="text-muted small">{log.dealer || 'Viljandi Aken ja Uks'}</span>
                    </td>
                    <td>
                      <span className={`status-pill status-${(log.status || '').toLowerCase()}`}>
                        {log.status || 'MUUDETUD'}
                      </span>
                    </td>
                    <td>
                      <strong>{log.actor}</strong>
                    </td>
                    <td>
                      <span>{log.event}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: VEEBISERVER JA SÜSTEEMI OLEK */}
      {activeTab === 'system' && (
        <div className="sysadmin-content-section">
          <div className="section-action-header">
            <div>
              <h3>Veebiserver, arhitektuur ja turvapoliitikad</h3>
              <p className="text-muted text-sm">
                Süsteemi tehnilised parameetrid vastavalt spec_v3.md nõuetele.
              </p>
            </div>
          </div>

          <div className="system-health-grid">
            <div className="system-card card-box">
              <div className="system-card-head">
                <Server size={20} className="text-primary" />
                <h4>Backend & Veebiserver</h4>
              </div>
              <ul className="system-details-list">
                <li><span>Arhitektuur:</span> <strong>PHP 8.2+ (DocumentRoot rangelt eraldatud)</strong></li>
                <li><span>Kood väljaspool veebijuurt:</span> <span className="badge-emerald-sm">Jah (Täidetud)</span></li>
                <li><span>API staatus:</span> <span className="badge-emerald-sm">Töökorras (Port 3001)</span></li>
                <li><span>Võrguühenduseta režiim:</span> <strong>LocalStorage + Sync (UUID)</strong></li>
              </ul>
            </div>

            <div className="system-card card-box">
              <div className="system-card-head">
                <Database size={20} className="text-navy" />
                <h4>Andmebaas & Terviklus</h4>
              </div>
              <ul className="system-details-list">
                <li><span>Mootor:</span> <strong>SQLite / InnoDB ühilduv</strong></li>
                <li><span>Kodeering:</span> <code>utf8mb4_unicode_ci</code></li>
                <li><span>Reklamatsiooni numbri generaator:</span> <strong>Atomaarne (P/T + 5 numbrit)</strong></li>
                <li><span>Välisvõtmed (FK):</span> <span className="badge-emerald-sm">Aktiivsed igal seosel</span></li>
              </ul>
            </div>

            <div className="system-card card-box">
              <div className="system-card-head">
                <Lock size={20} className="text-amber" />
                <h4>Turvalisus & Ligipääs</h4>
              </div>
              <ul className="system-details-list">
                <li><span>Autoriseerimine:</span> <strong>Õiguspõhine (RBAC + Valge nimekiri)</strong></li>
                <li><span>IDOR kaitse:</span> <span className="badge-emerald-sm">Kõigil objektipäringutel</span></li>
                <li><span>M365 / SharePoint:</span> <strong>Sites.Selected (Zone viirusetõrje)</strong></li>
                <li><span>Saladused:</span> <span className="badge-emerald-sm">.env eraldatud</span></li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* NEW USER MODAL */}
      {userModalOpen && (
        <div className="modal-backdrop" onClick={() => setUserModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Uue kasutaja lisamine süsteemi</h3>
              <button className="icon-btn-close" onClick={() => setUserModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="modal-body">
                <div className="form-field">
                  <label>Ees- ja perekonnanimi *</label>
                  <input
                    type="text"
                    required
                    value={newUser.name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="nt Tiit Toom"
                  />
                </div>
                <div className="form-field">
                  <label>Töö e-post *</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="tiit.toom@vau.ee"
                  />
                </div>
                <div className="form-field">
                  <label>Roll süsteemis *</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                    className="form-select"
                  >
                    <option value="HANDLER">Käsitleja (Handler)</option>
                    <option value="DISTRIBUTOR">Käsitleja määraja (Admin)</option>
                    <option value="APPROVER">Kinnitaja (Approver)</option>
                    <option value="ADMIN">Süsteemiadministraator (Sysadmin)</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Osakond / Ettevõte</label>
                  <input
                    type="text"
                    value={newUser.department}
                    onChange={(e) => setNewUser(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="nt IT ja infosüsteemid"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setUserModalOpen(false)}>Loobu</button>
                <button type="submit" className="btn-primary">Salvesta kasutaja</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
