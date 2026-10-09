import React, { useState, useEffect } from 'react';
import { getOfflineQueue, syncOfflineQueue } from '../services/api';
import { RefreshCw, WifiOff, CheckCircle2, AlertTriangle, Clock, X } from 'lucide-react';

const OfflineSyncModal = ({ isOpen, onClose, onSynced }) => {
  const [queue, setQueue] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState(null);

  const loadQueue = () => {
    setQueue(getOfflineQueue());
  };

  useEffect(() => {
    if (isOpen) {
      loadQueue();
      setSyncResult(null);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await syncOfflineQueue();
      setSyncResult(res);
      loadQueue();
      if (onSynced) onSynced();
    } catch (err) {
      setError(err.message || 'Sünkroonimine ebaõnnestus.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card sync-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <WifiOff className="text-amber" size={24} />
            <div>
              <h3>Võrguühenduseta töö sünkroonimine (PWA / IndexedDB)</h3>
              <p className="modal-sub">Vastavus spetsifikatsiooni peatükile 4.3 ja 6.8</p>
            </div>
          </div>
          <button className="icon-btn-close" onClick={onClose} aria-label="Sulge">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="spec-info-box">
            <div className="spec-item">
              <Clock size={16} />
              <span><strong>Sünkroonimata töö eskalatsioon:</strong> &lt;4h tavaline | 24h hoiatus | 72h teavitus juhile | 7p blokeerib uue töö</span>
            </div>
          </div>

          {syncResult && (
            <div className="alert-success">
              <CheckCircle2 size={20} />
              <div>
                <strong>Sünkroonitud edukalt! ({syncResult.syncedCount} kirjet)</strong>
                <ul className="synced-list">
                  {syncResult.syncedResults?.map(r => (
                    <li key={r.localId}>
                      Kohalik tunnus <code>{r.localId}</code> → omistatud ametlik serverinumber <code>{r.assignedId}</code>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {error && (
            <div className="alert-error">
              <AlertTriangle size={20} />
              <span>{error}</span>
            </div>
          )}

          <div className="queue-list-header">
            <h4>Ootel tegevuste järjekord ({queue.length})</h4>
          </div>

          {queue.length === 0 ? (
            <div className="empty-queue">
              <CheckCircle2 size={36} className="text-emerald" />
              <p>Kõik kohalikud tööd on serveriga sünkroonitud. Ootel kirjeid pole.</p>
            </div>
          ) : (
            <div className="queue-items-container">
              {queue.map((item, idx) => (
                <div key={item.localId || idx} className="queue-item-card">
                  <div className="queue-item-badge">
                    <span className="badge-uuid">UUID: {item.localId}</span>
                    <span className="badge-age">&lt; 1 h tagasi</span>
                  </div>
                  <div className="queue-item-content">
                    <strong>Uus reklamatsioon: {item.data?.product?.productName || 'Nimetu toode'}</strong>
                    <div className="queue-item-meta">
                      Edasimüüja: {item.data?.dealerCode} | Defekt: {item.data?.defect?.type} | Klient: {item.data?.endCustomer?.name || 'Määramata'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Sulge</button>
          <button
            className="btn-primary"
            onClick={handleSync}
            disabled={syncing || queue.length === 0}
          >
            <RefreshCw className={syncing ? 'animate-spin' : ''} size={18} />
            {syncing ? 'Sünkroonin serveriga...' : `Sünkrooni serveriga (${queue.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfflineSyncModal;
