import React, { useState, useEffect } from 'react';
import {
  fetchCategories,
  fetchDefectTypes,
  fetchCostAccounts,
  fetchClients,
  fetchSalesReps,
} from '../services/api';
import {
  Building2,
  Briefcase,
  AlertTriangle,
  CreditCard,
  FolderTree,
  Search,
  ArrowUpDown,
  Mail,
  Phone,
  MapPin,
  Languages,
  Database,
  RefreshCw,
} from 'lucide-react';

const AdminMasterDataView = () => {
  // Tabs: 'clients', 'salesreps', 'defects', 'accounts', 'categories'
  const [activeTab, setActiveTab] = useState('clients');
  const [categories, setCategories] = useState([]);
  const [defectTypes, setDefectTypes] = useState([]);
  const [costAccounts, setCostAccounts] = useState([]);
  const [clients, setClients] = useState([]);
  const [salesReps, setSalesReps] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sorting & search states
  const [clientSearch, setClientSearch] = useState('');
  const [clientSort, setClientSort] = useState('name');
  const [defectSearch, setDefectSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, defects, accounts, clientsData, repsData] = await Promise.all([
        fetchCategories(),
        fetchDefectTypes(),
        fetchCostAccounts(),
        fetchClients(),
        fetchSalesReps(),
      ]);

      setCategories(cats || []);
      setDefectTypes(defects || []);
      setCostAccounts(accounts || []);
      setClients(clientsData || []);
      setSalesReps(repsData || []);
    } catch (err) {
      console.error('Põhiandmete laadimise viga:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered and sorted clients
  const filteredClients = clients
    .filter(c => {
      const q = clientSearch.toLowerCase();
      return (
        c.salesClientName?.toLowerCase().includes(q) ||
        c.salesClientId?.toLowerCase().includes(q) ||
        c.payerClientId?.toLowerCase().includes(q) ||
        c.country?.toLowerCase().includes(q) ||
        c.salesRep?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (clientSort === 'name') return (a.salesClientName || '').localeCompare(b.salesClientName || '');
      if (clientSort === 'salesId') return (a.salesClientId || '').localeCompare(b.salesClientId || '');
      if (clientSort === 'payerId') return (a.payerClientId || '').localeCompare(b.payerClientId || '');
      if (clientSort === 'country') return (a.country || '').localeCompare(b.country || '');
      return 0;
    });

  // Filtered defects
  const filteredDefects = defectTypes.filter(d =>
    d.name?.toLowerCase().includes(defectSearch.toLowerCase()) ||
    d.id?.toLowerCase().includes(defectSearch.toLowerCase()) ||
    d.department?.toLowerCase().includes(defectSearch.toLowerCase())
  );

  return (
    <div className="admin-masterdata-container">
      {/* Header Banner */}
      <div className="masterdata-header-card">
        <div className="masterdata-title-group">
          <div className="masterdata-icon-badge">
            <Database size={26} className="text-navy" />
          </div>
          <div>
            <h2>Põhiandmed ja klassifikaatorid (Admin)</h2>
            <p className="masterdata-sub">
              Klientide ülevaade, müügiesindajad, veatüübid, ERP kulukontod ja tootekategooriad.
            </p>
          </div>
        </div>

        <div className="masterdata-header-actions">
          <button className="btn-secondary btn-sm" onClick={loadData} title="Uuenda põhiandmeid">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Värskenda</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="masterdata-tabs-nav">
        <button
          className={`masterdata-nav-btn ${activeTab === 'clients' ? 'active' : ''}`}
          onClick={() => setActiveTab('clients')}
        >
          <Building2 size={17} />
          <span>Klientide ülevaade ({clients.length})</span>
        </button>

        <button
          className={`masterdata-nav-btn ${activeTab === 'salesreps' ? 'active' : ''}`}
          onClick={() => setActiveTab('salesreps')}
        >
          <Briefcase size={17} />
          <span>Müügiesindajad ({salesReps.length})</span>
        </button>

        <button
          className={`masterdata-nav-btn ${activeTab === 'defects' ? 'active' : ''}`}
          onClick={() => setActiveTab('defects')}
        >
          <AlertTriangle size={17} />
          <span>Veatüübid ({defectTypes.length})</span>
        </button>

        <button
          className={`masterdata-nav-btn ${activeTab === 'accounts' ? 'active' : ''}`}
          onClick={() => setActiveTab('accounts')}
        >
          <CreditCard size={17} />
          <span>Kulukontod ({costAccounts.length})</span>
        </button>

        <button
          className={`masterdata-nav-btn ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          <FolderTree size={17} />
          <span>Tootekategooriad ({categories.length})</span>
        </button>
      </div>

      {/* TAB 1: KLIENTIDE ÜLEVAADE (7 nõutud välja) */}
      {activeTab === 'clients' && (
        <div className="masterdata-content-section">
          <div className="section-action-header">
            <div>
              <h3>Klientide ülevaade (ERP andmebaas)</h3>
              <p className="text-muted text-sm">
                Müügikliendi ID, Maksekliendi ID, Müügikliendi nimi, Riik, Aadress, Telefon, E-mail ja vastutav Müügiesindaja.
              </p>
            </div>

            <div className="table-search-sort-bar">
              <div className="search-input-wrap">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Otsi klienti, ID-d, riiki või esindajat..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                />
              </div>

              <div className="sort-input-wrap">
                <ArrowUpDown size={15} />
                <select
                  value={clientSort}
                  onChange={(e) => setClientSort(e.target.value)}
                  className="form-select-sm"
                >
                  <option value="name">Nimi (A-Z)</option>
                  <option value="salesId">Müügikliendi ID</option>
                  <option value="payerId">Maksekliendi ID</option>
                  <option value="country">Riik</option>
                </select>
              </div>
            </div>
          </div>

          <div className="table-responsive-wrapper card-box">
            <table className="vau-data-table">
              <thead>
                <tr>
                  <th>Müügikliendi ID</th>
                  <th>Maksekliendi ID</th>
                  <th>Müügikliendi nimi</th>
                  <th>Riik</th>
                  <th>Aadress</th>
                  <th>Telefon</th>
                  <th>E-mail</th>
                  <th>Müügiesindaja (Sales rep)</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((c, idx) => (
                  <tr key={idx}>
                    <td>
                      <code className="text-primary font-bold">{c.salesClientId}</code>
                    </td>
                    <td>
                      <code>{c.payerClientId}</code>
                    </td>
                    <td>
                      <strong>{c.salesClientName}</strong>
                    </td>
                    <td>
                      <span className="badge-country">{c.country}</span>
                    </td>
                    <td>
                      <span className="text-muted small flex-align-center gap-1">
                        <MapPin size={12} /> {c.address}
                      </span>
                    </td>
                    <td>
                      <span className="flex-align-center gap-1 small">
                        <Phone size={12} className="text-muted" /> {c.salesClientPhone || c.phone}
                      </span>
                    </td>
                    <td>
                      <span className="flex-align-center gap-1 small">
                        <Mail size={12} className="text-muted" /> {c.salesClientEmail || c.email}
                      </span>
                    </td>
                    <td>
                      <span className="badge-rep">{c.salesRepName || c.salesRep}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: MÜÜGIESINDAJAD */}
      {activeTab === 'salesreps' && (
        <div className="masterdata-content-section">
          <div className="section-action-header">
            <div>
              <h3>Müügiesindajate (Sales reps) nimekiri ja vastutusalad</h3>
              <p className="text-muted text-sm">
                AS Viljandi Aken ja Uks müügiesindajate kontaktid, regioonid ja hallatavad maksekliendid.
              </p>
            </div>
          </div>

          <div className="salesreps-grid">
            {salesReps.map((rep) => (
              <div key={rep.id} className="salesrep-card card-box">
                <div className="salesrep-head">
                  <div className="user-avatar-tiny bg-primary">{rep.name.substring(0, 2)}</div>
                  <div>
                    <h4>{rep.name}</h4>
                    <span className="text-muted small flex-align-center gap-1">
                      <Mail size={12} /> {rep.email} • <Phone size={12} /> {rep.phone}
                    </span>
                  </div>
                </div>

                <div className="salesrep-region-badge">
                  <span>Piirkond: <strong>{rep.region}</strong></span>
                </div>

                <div className="salesrep-clients-list">
                  <h5>Seotud maksekliendid ({rep.assignedPayerClients?.length || 0}):</h5>
                  <ul>
                    {rep.assignedPayerClients?.map((payer, idx) => (
                      <li key={idx}>
                        <code>{payer.payerId}</code> — {payer.name}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: VEATÜÜBID */}
      {activeTab === 'defects' && (
        <div className="masterdata-content-section">
          <div className="section-action-header">
            <div>
              <h3>Veatüübid (Reklamatsioonide klassifikaatorid)</h3>
              <p className="text-muted text-sm">
                Kvaliteediklassifikaatorid ankeedi, tegevusplaani ja kulujaotuse jaoks osakondade lõikes.
              </p>
            </div>

            <div className="search-input-wrap">
              <Search size={16} />
              <input
                type="text"
                placeholder="Otsi veatüüpi või osakonda..."
                value={defectSearch}
                onChange={(e) => setDefectSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="defect-types-grid">
            {filteredDefects.map((def) => (
              <div key={def.id} className="defect-type-card card-box">
                <div className="defect-type-header">
                  <AlertTriangle size={18} className="text-amber" />
                  <strong>{def.name}</strong>
                </div>
                <div className="defect-type-details mt-2">
                  <div className="text-muted small">Kood: <code>{def.id}</code></div>
                  <div className="text-muted small">Vastutav osakond: <strong>{def.department || 'Tootmine'}</strong></div>
                  <div className="text-muted small">Vaike-konto: {def.defaultAccount || '4410'}</div>
                </div>
                <div className="defect-type-meta mt-2">
                  <span className="status-pill badge-emerald">Aktiivne veatüüp</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: KULUKONTOD */}
      {activeTab === 'accounts' && (
        <div className="masterdata-content-section">
          <div className="section-action-header">
            <div>
              <h3>ERP Kulukontod ja osakondade eelarved</h3>
              <p className="text-muted text-sm">
                Kulukandja ettepanekute osakondade kontod, vastutavad juhid ja jooksvad eelarved.
              </p>
            </div>
          </div>

          <div className="accounts-list-grid">
            {costAccounts.map((acc) => (
              <div key={acc.id} className="account-card card-box">
                <div className="account-card-header">
                  <CreditCard size={20} className="text-primary" />
                  <div>
                    <h4>{acc.name}</h4>
                    <code>Konto kood: {acc.id}</code>
                  </div>
                </div>
                <div className="account-card-body-details mt-3">
                  <div className="detail-row">
                    <span className="text-muted">Vastutav juht:</span>
                    <strong>{acc.manager || 'Määramata'}</strong>
                  </div>
                  <div className="detail-row">
                    <span className="text-muted">Osakond:</span>
                    <span>{acc.department || 'Tootmine'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="text-muted">Jooksva aasta eelarve:</span>
                    <span className="badge-budget">{acc.annualBudgetEur ? `${acc.annualBudgetEur.toLocaleString('et-EE')} €` : '50 000 €'}</span>
                  </div>
                </div>
                <div className="account-card-footer mt-3">
                  <span className="status-pill badge-blue">ERP sünkroniseeritud</span>
                  <span className="small text-muted">Automaatne broneering</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: TOOTEKATEGOORIAD */}
      {activeTab === 'categories' && (
        <div className="masterdata-content-section">
          <div className="section-action-header">
            <div>
              <h3>Tootekategooriad (2-astmeline puu ja 6 keele tugi)</h3>
              <p className="text-muted text-sm">Peakategooriad ja alamkategooriad koos mitmekeelse klassifikaatoriga.</p>
            </div>
            <div className="languages-badge-group">
              <Languages size={16} />
              <span>Keeled: ET, EN, FI, SV, NO, DA</span>
            </div>
          </div>

          <div className="categories-tree-list">
            {categories.map((cat) => (
              <div key={cat.id} className="category-group-card card-box">
                <div className="category-group-header">
                  <div className="cat-header-title">
                    <FolderTree size={20} className="text-navy" />
                    <h4>{cat.names?.et} / {cat.names?.en}</h4>
                    <span className="cat-id-tag">ID: {cat.id}</span>
                  </div>
                  <div className="cat-translations-row">
                    <span title="Soome">FI: {cat.names?.fi}</span>
                    <span title="Rootsi">SV: {cat.names?.sv}</span>
                    <span title="Norra">NO: {cat.names?.no}</span>
                    <span title="Taani">DA: {cat.names?.da}</span>
                  </div>
                </div>

                <div className="subcategories-grid mt-3">
                  {(cat.subcategories || []).map((sub) => (
                    <div key={sub.id} className="subcategory-chip-card">
                      <div className="subcat-title-row">
                        <strong>{sub.names?.et}</strong>
                        <code>{sub.id}</code>
                      </div>
                      <span className="subcat-en-name">{sub.names?.en}</span>
                      <div className="subcat-mini-langs">
                        <span>FI: {sub.names?.fi}</span> • <span>SV: {sub.names?.sv}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMasterDataView;
