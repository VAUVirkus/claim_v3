import React, { useState, useEffect } from 'react';
import { fetchClaims, fetchCostAccounts } from '../services/api';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Download,
  ShieldAlert,
  FileSpreadsheet,
  Building,
  CheckCircle2,
  Clock,
  RefreshCw,
} from 'lucide-react';

const FinanceObserverView = () => {
  const [claims, setClaims] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFinanceData = async () => {
      setLoading(true);
      try {
        const [claimsData, accountsData] = await Promise.all([
          fetchClaims(),
          fetchCostAccounts(),
        ]);
        setClaims(claimsData || []);
        setAccounts(accountsData || []);
      } catch (err) {
        console.error('Error loading finance data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadFinanceData();
  }, []);

  // Compute metrics
  let totalApprovedAmount = 0;
  let totalPendingAmount = 0;
  const accountTotals = {};

  (accounts || []).forEach(a => {
    accountTotals[a.id] = { name: a.name, amount: 0, count: 0 };
  });

  const financeRows = [];

  claims.forEach(c => {
    (c.costProposals || []).forEach(p => {
      const isApproved = p.status === 'APPROVED';
      const isPending = p.status === 'PENDING_APPROVAL';

      if (isApproved) totalApprovedAmount += (p.totalAmountEur || 0);
      if (isPending) totalPendingAmount += (p.totalAmountEur || 0);

      (p.splits || []).forEach(s => {
        if (!accountTotals[s.accountId]) {
          accountTotals[s.accountId] = { name: s.accountName || s.accountId, amount: 0, count: 0 };
        }
        if (isApproved) {
          accountTotals[s.accountId].amount += (s.amountEur || 0);
          accountTotals[s.accountId].count += 1;
        }

        financeRows.push({
          claimId: c.id,
          date: p.proposedAt || c.createdAt,
          dealer: c.dealer?.name || 'Määramata',
          product: c.product?.productName,
          accountId: s.accountId,
          accountName: s.accountName || accountTotals[s.accountId]?.name || s.accountId,
          percentage: s.percentage,
          amountEur: s.amountEur,
          status: p.status,
          approver: p.approvedBy || p.rejectedBy || 'Ootel',
        });
      });
    });
  });

  const exportCsv = () => {
    const headers = ['Juhtum', 'Kuupäev', 'Edasimüüja', 'Toode', 'Kulukonto', 'Osa %', 'Summa EUR', 'Staatus', 'Kinnitaja'];
    const rows = financeRows.map(r => [
      r.claimId,
      new Date(r.date).toLocaleDateString('et-EE'),
      `"${r.dealer}"`,
      `"${r.product}"`,
      `"${r.accountName}"`,
      `${r.percentage}%`,
      r.amountEur.toFixed(2),
      r.status,
      `"${r.approver}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vau_claim_finance_export_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="finance-observer-container">
      {/* Header Banner */}
      <div className="finance-header-card">
        <div className="finance-header-left">
          <div className="finance-badge-icon">
            <BarChart3 size={28} className="text-emerald" />
          </div>
          <div>
            <h2>Finants ja ERP Vaatleja töölaud</h2>
            <p className="finance-sub">
              Kinnitatud ja ootel kulude koondanalüüs osakondade kaupa (Spec 2.2)
            </p>
          </div>
        </div>

        <div className="finance-gdpr-banner">
          <ShieldAlert size={18} className="text-amber" />
          <div>
            <strong>GDPR & Ärisaladuse piirang:</strong>
            <span> Lõppkliendi privaatsed kontaktandmed ja fotod on vaatlejarollis peidetud.</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="finance-kpi-grid">
        <div className="kpi-card approved">
          <div className="kpi-icon-box">
            <CheckCircle2 size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Kinnitatud kulud kokku</span>
            <h3 className="kpi-value">{totalApprovedAmount.toLocaleString('et-EE')} €</h3>
            <span className="kpi-hint">Kulukontodele kantud summad</span>
          </div>
        </div>

        <div className="kpi-card pending">
          <div className="kpi-icon-box">
            <Clock size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Kinnitamisel ootel</span>
            <h3 className="kpi-value">{totalPendingAmount.toLocaleString('et-EE')} €</h3>
            <span className="kpi-hint">Ootab osakonnajuhtide heakskiitu</span>
          </div>
        </div>

        <div className="kpi-card total">
          <div className="kpi-icon-box">
            <TrendingUp size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Finantskandega juhtumid</span>
            <h3 className="kpi-value">{financeRows.length} rida</h3>
            <span className="kpi-hint">Eelarvestatud kulujaotused</span>
          </div>
        </div>
      </div>

      {/* Department Breakdown */}
      <div className="finance-section-card">
        <div className="section-title-between">
          <h4>Kinnitatud kulude jaotus kulukontode vahel</h4>
          <span className="text-muted text-sm">ERP Kontode koondarvestus</span>
        </div>

        <div className="department-breakdown-grid">
          {Object.entries(accountTotals).map(([accId, data]) => {
            const pctOfTotal = totalApprovedAmount > 0 ? (data.amount / totalApprovedAmount) * 100 : 0;
            return (
              <div key={accId} className="account-breakdown-card">
                <div className="acc-breakdown-header">
                  <strong>{data.name}</strong>
                  <span className="acc-amount">{data.amount.toLocaleString('et-EE')} €</span>
                </div>
                <div className="progress-track">
                  <div className="progress-bar" style={{ width: `${Math.min(pctOfTotal, 100)}%` }} />
                </div>
                <div className="acc-breakdown-footer">
                  <span>{pctOfTotal.toFixed(1)}% kogukuludest</span>
                  <span>{data.count} juhtumit</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Ledger Table */}
      <div className="finance-section-card">
        <div className="section-title-between">
          <h4>Kulukannete pearaamat / Detailne aruanne</h4>
          <button className="btn-secondary btn-sm" onClick={exportCsv}>
            <Download size={15} />
            <span>Ekspordi CSV (ERP)</span>
          </button>
        </div>

        <div className="table-responsive-wrapper">
          <table className="vau-data-table">
            <thead>
              <tr>
                <th>Juhtumi nr</th>
                <th>Kuupäev</th>
                <th>Edasimüüja (Ettevõte)</th>
                <th>Toote nimetus</th>
                <th>Kulukonto</th>
                <th>Osa %</th>
                <th>Summa (€)</th>
                <th>Olek</th>
                <th>Kinnitaja</th>
              </tr>
            </thead>
            <tbody>
              {financeRows.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center text-muted p-4">
                    Kulupakkumisi ei leitud.
                  </td>
                </tr>
              ) : (
                financeRows.map((r, idx) => (
                  <tr key={idx}>
                    <td><span className="claim-id-badge">{r.claimId}</span></td>
                    <td>{new Date(r.date).toLocaleDateString('et-EE')}</td>
                    <td><strong>{r.dealer}</strong></td>
                    <td>{r.product}</td>
                    <td><code>{r.accountName}</code></td>
                    <td><strong>{r.percentage}%</strong></td>
                    <td><strong>{r.amountEur?.toFixed(2)} €</strong></td>
                    <td>
                      <span className={`status-pill ${r.status === 'APPROVED' ? 'badge-emerald' : r.status === 'PENDING_APPROVAL' ? 'badge-orange' : 'badge-red'}`}>
                        {r.status === 'APPROVED' ? 'Kinnitatud' : r.status === 'PENDING_APPROVAL' ? 'Kinnitamisel' : 'Tagasi lükatud'}
                      </span>
                    </td>
                    <td>{r.approver}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinanceObserverView;
