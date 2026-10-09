import React, { useState, useEffect } from 'react';
import { fetchClaims, assignClaimService } from '../services/api';
import {
  Smartphone,
  MapPin,
  Phone,
  Calendar,
  CheckCircle2,
  Clock,
  Camera,
  FileText,
  Send,
  AlertCircle,
  X,
  Wrench,
} from 'lucide-react';

const ServiceTeamMobileView = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completeModal, setCompleteModal] = useState({ open: false, claim: null });
  const [completionNotes, setCompletionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  const loadJobs = async () => {
    setLoading(true);
    try {
      const all = await fetchClaims();
      // Show claims that have a service scheduled or in progress
      const serviceJobs = all.filter(c => c.service || c.status === 'SERVICE_ASSIGNED');
      setClaims(serviceJobs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && completeModal.open) {
        e.stopPropagation();
        setCompleteModal({ open: false, claim: null });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [completeModal.open]);

  const handleComplete = async (e) => {
    e.preventDefault();
    if (!completionNotes.trim()) {
      alert('Palun lisage tehtud töö kirjeldus.');
      return;
    }

    setSubmitting(true);
    try {
      await assignClaimService(completeModal.claim.id, {
        action: 'COMPLETE',
        notes: completionNotes,
      });
      setSuccessToast(`Töö juhtumil ${completeModal.claim.id} märgitud tehtuks!`);
      setTimeout(() => setSuccessToast(''), 4000);
      setCompleteModal({ open: false, claim: null });
      setCompletionNotes('');
      loadJobs();
    } catch (err) {
      alert(`Viga: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mobile-view-wrapper">
      <div className="mobile-view-instruction">
        <Smartphone size={20} className="text-navy" />
        <div>
          <h4>Mobiili-esmane teenusmeeskonna vaade (PWA / Ekipaaž)</h4>
          <p>
            Vastab spec 4.3 ja 4.9 nõuetele (360px+ laius, puutesihtmärgid &gt;= 44px, võrguühenduseta töö tugi).
          </p>
        </div>
      </div>

      {successToast && (
        <div className="alert-success mobile-toast">
          <CheckCircle2 size={18} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Simulated Smartphone Screen Container */}
      <div className="phone-mockup-frame">
        <div className="phone-screen-header">
          <div className="phone-status-bar">
            <span>09:41</span>
            <div className="phone-network-indicators">
              <span>5G</span>
              <div className="battery-icon" />
            </div>
          </div>
          <div className="phone-app-bar">
            <span className="team-badge">Ekipaaž 2 (Viljandi & Tartu)</span>
            <span className="jobs-count">{claims.length} tööd</span>
          </div>
        </div>

        <div className="phone-screen-body">
          {loading ? (
            <div className="phone-loading">Laadin määratud töid...</div>
          ) : claims.length === 0 ? (
            <div className="phone-empty">
              <CheckCircle2 size={40} className="text-emerald" />
              <p>Tänaseks määratud väljasõite pole!</p>
            </div>
          ) : (
            claims.map((claim) => {
              const isDone = claim.service?.status === 'COMPLETED' || claim.status === 'SERVICE_COMPLETED';

              return (
                <div key={claim.id} className={`phone-job-card ${isDone ? 'job-completed' : ''}`}>
                  <div className="job-card-header">
                    <span className="job-id-pill">{claim.id}</span>
                    <span className={`job-status-pill ${isDone ? 'done' : 'pending'}`}>
                      {isDone ? '✓ Tehtud' : 'Ootel'}
                    </span>
                  </div>

                  <h4 className="job-product-title">{claim.product?.productName}</h4>
                  <div className="job-defect-tag">{claim.defect?.typeName || claim.defect?.type}</div>

                  <div className="job-address-box">
                    <MapPin size={16} className="text-navy" />
                    <span>{claim.endCustomer?.address || claim.dealer?.address || 'Objekti aadress määramata'}</span>
                  </div>

                  <div className="job-contact-row">
                    <div className="contact-person">
                      <strong>{claim.endCustomer?.name || claim.dealer?.contactPerson}</strong>
                    </div>
                    {claim.endCustomer?.phone && (
                      <a href={`tel:${claim.endCustomer.phone}`} className="btn-call-customer">
                        <Phone size={14} />
                        Helista
                      </a>
                    )}
                  </div>

                  <div className="job-date-row">
                    <Calendar size={14} className="text-muted" />
                    <span>Kavandatud: <strong>{claim.service?.scheduledDate || 'Täna'}</strong></span>
                  </div>

                  {claim.service?.notes && (
                    <div className="job-instructions">
                      <small>Käsitleja juhis:</small>
                      <p>{claim.service.notes}</p>
                    </div>
                  )}

                  {isDone ? (
                    <div className="job-done-report">
                      <CheckCircle2 size={16} className="text-emerald" />
                      <span>{claim.service?.completionNotes || 'Töö lõpetatud'}</span>
                    </div>
                  ) : (
                    <button
                      className="btn-complete-job"
                      onClick={() => setCompleteModal({ open: true, claim })}
                    >
                      <Wrench size={16} />
                      Märgi teenus tehtuks
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Complete Job Modal */}
      {completeModal.open && (
        <div className="modal-backdrop" onClick={() => setCompleteModal({ open: false, claim: null })}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Teosta teenus ({completeModal.claim?.id})</h3>
              <button className="icon-btn-close" onClick={() => setCompleteModal({ open: false, claim: null })}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleComplete}>
              <div className="modal-body">
                <div className="form-field">
                  <label>Tehtud töö raport (Märkme tüüp 3: Teenus) *</label>
                  <textarea
                    rows={4}
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder="nt Vahetatud klaaspakett, reguleeritud hinged, klient allkirjastas akti..."
                    required
                    autoFocus
                  />
                </div>

                <div className="mock-camera-zone">
                  <Camera size={24} className="text-navy" />
                  <span>Tee foto valminud tööst / allkirjastatud aktist</span>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => alert('Foto lisatud seadmest!')}>
                    Ava kaamera
                  </button>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setCompleteModal({ open: false, claim: null })}>
                  Loobu
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Salvestan...' : 'Kinnita töö tehtuks'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceTeamMobileView;
