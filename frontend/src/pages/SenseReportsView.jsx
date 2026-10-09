import React, { useState, useEffect } from 'react';
import { fetchSenseReports, fetchClaims } from '../services/api';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Clock,
  Download,
  ExternalLink,
  ShieldCheck,
  Building2,
  PieChart,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

const SenseReportsView = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('2026-YTD');

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await fetchSenseReports();
      setReportData(data);
    } catch (err) {
      console.error('Error loading Sense report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleExportCSV = async () => {
    try {
      const claims = await fetchClaims();
      const headers = ['ID', 'Staatus', 'Esitaja', 'Tellimus', 'Toode', 'Veatüüp', 'Kulud_EUR', 'Arved_EUR', 'Loodud'];
      const rows = claims.map(c => [
        c.id,
        c.statusLabel || c.status,
        `"${c.dealer?.name || ''}"`,
        c.product?.orderNumber || '',
        `"${c.product?.productName || ''}"`,
        `"${c.defect?.typeName || ''}"`,
        (c.costAllocations || []).reduce((sum, a) => sum + (parseFloat(a.amountEur) || 0), 0),
        (c.invoices || []).reduce((sum, i) => sum + (parseFloat(i.amountEur) || 0), 0),
        c.createdAt,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `VAU_Claims_Sense_Export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert('CSV eksport ebaõnnestus: ' + e.message);
    }
  };

  return (
    <div className="sense-reports-container">
      {/* Top Banner */}
      <div className="sense-header-card">
        <div className="sense-title-col">
          <div className="sense-icon-badge">
            <BarChart3 size={28} className="text-emerald" />
          </div>
          <div>
            <h2>Aruanded Sense (Qlik Sense integratsioon)</h2>
            <p className="text-muted">
              AS Viljandi Aken ja Uks juhtimisaruandlus, osakondade kulude jaotus ja veatüüpide analüütika.
            </p>
          </div>
        </div>

        <div className="sense-actions-group">
          <button className="btn-secondary btn-sm" onClick={loadReport} title="Värskenda andmed">
            <RefreshCw size={15} />
            <span>Värskenda</span>
          </button>
          <button className="btn-secondary btn-sm" onClick={handleExportCSV}>
            <Download size={15} />
            <span>Ekspordi Sense CSV</span>
          </button>
          <a
            href={reportData?.senseExportUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary btn-sm"
          >
            <ExternalLink size={15} />
            <span>Ava Qlik Sense Hub</span>
          </a>
        </div>
      </div>

      {loading || !reportData ? (
        <div className="loading-state-box">
          <Clock size={32} className="animate-spin text-muted" />
          <p>Laadin Sense juhtimisaruannet...</p>
        </div>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <div className="sense-kpi-grid">
            <div className="kpi-metric-card">
              <div className="kpi-header">
                <span className="kpi-label">Reklamatsioone kokku</span>
                <Layers size={20} className="text-blue" />
              </div>
              <div className="kpi-value">{reportData.totalClaims}</div>
              <span className="kpi-subtext">Aktiivses andmebaasis</span>
            </div>

            <div className="kpi-metric-card">
              <div className="kpi-header">
                <span className="kpi-label">Eraldatud kulud</span>
                <DollarSign size={20} className="text-amber" />
              </div>
              <div className="kpi-value">{reportData.totalAllocatedCostEur?.toLocaleString('et-EE')} €</div>
              <span className="kpi-subtext">Osakondadele jaotatud vastutus</span>
            </div>

            <div className="kpi-metric-card">
              <div className="kpi-header">
                <span className="kpi-label">Arvete summa</span>
                <FileSpreadsheet size={20} className="text-emerald" />
              </div>
              <div className="kpi-value">{reportData.totalInvoicesSumEur?.toLocaleString('et-EE')} €</div>
              <span className="kpi-subtext">{reportData.totalInvoicesCount} arvet seotud</span>
            </div>

            <div className="kpi-metric-card">
              <div className="kpi-header">
                <span className="kpi-label">Keskmine lahendusaeg</span>
                <Clock size={20} className="text-purple" />
              </div>
              <div className="kpi-value">{reportData.averageResolutionDays} päeva</div>
              <span className="kpi-subtext">Sihttase &lt; 5.0 tööpäeva</span>
            </div>
          </div>

          {/* Breakdown Charts Grid */}
          <div className="sense-breakdown-grid">
            {/* Department Cost Allocation */}
            <div className="sense-card">
              <div className="card-header">
                <PieChart size={18} className="text-navy" />
                <h3>Kulude jaotus osakondade kaupa (Sense kulukontod)</h3>
              </div>
              <div className="card-body">
                <div className="breakdown-list">
                  {Object.entries(reportData.byDepartmentCost || {}).map(([dept, sum]) => {
                    const pct = reportData.totalAllocatedCostEur > 0
                      ? Math.round((sum / reportData.totalAllocatedCostEur) * 100)
                      : 0;
                    return (
                      <div key={dept} className="breakdown-item">
                        <div className="item-label-row">
                          <span className="item-title">{dept}</span>
                          <span className="item-sum">{sum.toLocaleString('et-EE')} € ({pct}%)</span>
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill bg-emerald" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Defect Type Distribution */}
            <div className="sense-card">
              <div className="card-header">
                <TrendingUp size={18} className="text-navy" />
                <h3>Veatüüpide sagedus (Kvaliteedianalüüs)</h3>
              </div>
              <div className="card-body">
                <div className="breakdown-list">
                  {Object.entries(reportData.byDefect || {}).map(([defect, count]) => {
                    const pct = reportData.totalClaims > 0
                      ? Math.round((count / reportData.totalClaims) * 100)
                      : 0;
                    return (
                      <div key={defect} className="breakdown-item">
                        <div className="item-label-row">
                          <span className="item-title">{defect}</span>
                          <span className="item-sum">{count} juhtumit ({pct}%)</span>
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill bg-blue" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="sense-card">
              <div className="card-header">
                <Layers size={18} className="text-navy" />
                <h3>Juhtumite olekud protsessis</h3>
              </div>
              <div className="card-body">
                <div className="status-chips-wrap">
                  {Object.entries(reportData.byStatus || {}).map(([st, cnt]) => (
                    <div key={st} className="status-stat-pill">
                      <span className="status-stat-name">{st}</span>
                      <strong className="status-stat-count">{cnt}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Dealers */}
            <div className="sense-card">
              <div className="card-header">
                <Building2 size={18} className="text-navy" />
                <h3>Edasimüüjate jaotus</h3>
              </div>
              <div className="card-body">
                <div className="dealers-summary-list">
                  {Object.entries(reportData.byDealer || {}).map(([dealer, cnt]) => (
                    <div key={dealer} className="dealer-stat-row">
                      <span>{dealer}</span>
                      <span className="badge-dealer-count">{cnt} tk</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SenseReportsView;
