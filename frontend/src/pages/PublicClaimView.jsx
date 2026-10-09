import React, { useState, useEffect } from 'react';
import { LANGUAGES, TRANSLATIONS } from '../services/i18n';
import {
  validateClientCode,
  fetchCategories,
  fetchDefectTypes,
  submitClaim,
  getForceOffline,
} from '../services/api';
import {
  CheckCircle,
  AlertCircle,
  Upload,
  FileText,
  X,
  Shield,
  Smartphone,
  Info,
  ArrowRight,
  RotateCcw,
  Check,
  Copy,
} from 'lucide-react';

const COUNTRIES = [
  { code: 'EST', label: 'Eesti' },
  { code: 'FIN', label: 'Soome (Finland)' },
  { code: 'SWE', label: 'Rootsi (Sverige)' },
  { code: 'NOR', label: 'Norra (Norge)' },
  { code: 'DNK', label: 'Taani (Danmark)' },
  { code: 'LAT', label: 'Läti (Latvija)' },
  { code: 'LTU', label: 'Leedu (Lietuva)' },
];

const PublicClaimView = ({ onNavigateToHandler, initialDealerCode, onClaimSubmitted }) => {
  const [lang, setLang] = useState('et');
  const t = TRANSLATIONS[lang] || TRANSLATIONS.et;

  // Step state: 1: Auth/Code, 2: Form, 3: Success
  const [step, setStep] = useState(1);
  const [clientCode, setClientCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [authError, setAuthError] = useState('');
  const [dealer, setDealer] = useState(null);

  // Classifiers
  const [categories, setCategories] = useState([]);
  const [defectTypes, setDefectTypes] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    dealerName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    country: 'EST',
    // Product
    category: '',
    subcategory: '',
    productName: '',
    orderNumber: '',
    serialNumber: '',
    quantity: 1,
    dimensions: '',
    isInstalled: true,
    // Defect
    defectType: '',
    description: '',
    // End customer
    customerName: '',
    customerAddress: '',
    customerPhone: '',
    customerEmail: '',
    onSiteInspection: false,
  });

  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [draftSavedTime, setDraftSavedTime] = useState(null);
  const [copied, setCopied] = useState(false);

  // Load classifiers
  useEffect(() => {
    fetchCategories().then(setCategories).catch(console.error);
    fetchDefectTypes().then(setDefectTypes).catch(console.error);

    // Check saved draft
    const saved = localStorage.getItem('vau_claim_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.dealer && parsed.formData) {
          setDealer(parsed.dealer);
          setClientCode(parsed.dealer.code);
          setFormData(parsed.formData);
          setStep(2);
          setDraftSavedTime('Taastatud kohalikust mustandist');
        }
      } catch (e) {}
    }
  }, []);

  // Auto-validate if initialDealerCode provided
  useEffect(() => {
    if (initialDealerCode && !dealer) {
      validateClientCode(initialDealerCode).then(res => {
        if (res && (res.dealer || res.success)) {
          const d = res.dealer || { code: initialDealerCode, name: 'Edasimüüja' };
          setDealer(d);
          setClientCode(d.code);
          setFormData(prev => ({
            ...prev,
            dealerName: d.name || '',
            contactPerson: d.contactPerson || '',
            email: d.email || '',
            phone: d.phone || '',
            address: d.address || '',
            country: d.country || 'EST',
          }));
          setStep(2);
        }
      }).catch(console.error);
    }
  }, [initialDealerCode]);

  // Autosave draft on form change (Spec 4.9: Katkestuskindlus)
  useEffect(() => {
    if (step === 2 && dealer) {
      localStorage.setItem('vau_claim_draft', JSON.stringify({ dealer, formData }));
      setDraftSavedTime(new Date().toLocaleTimeString());
    }
  }, [formData, step, dealer]);

  const handleVerifyCode = async (codeToVerify) => {
    const targetCode = (codeToVerify || clientCode).trim();
    if (!targetCode) {
      setAuthError('Sisestage edasimüüja kood.');
      return;
    }

    setValidating(true);
    setAuthError('');
    try {
      const res = await validateClientCode(targetCode);
      if (res.success && res.dealer) {
        setDealer(res.dealer);
        setClientCode(res.dealer.code);
        setFormData(prev => ({
          ...prev,
          dealerName: res.dealer.name,
          contactPerson: res.dealer.contactPerson,
          email: res.dealer.email,
          phone: res.dealer.phone,
          address: res.dealer.address,
          country: res.dealer.country || 'EST',
        }));
        setStep(2);
      }
    } catch (err) {
      setAuthError(err.message || t.errorInvalidCode);
    } finally {
      setValidating(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFileUpload = (e) => {
    if (!e.target.files) return;
    const uploaded = Array.from(e.target.files).map((f) => ({
      id: `f-${Math.random().toString(36).substr(2, 9)}`,
      name: f.name,
      size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
      tag: 'Defekti foto',
    }));
    setFiles(prev => [...prev, ...uploaded]);
  };

  const updateFileTag = (id, newTag) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, tag: newTag } : f));
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category || !formData.description) {
      alert('Palun täitke kohustuslikud väljad (Kategooria ja Vea kirjeldus).');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        dealerCode: dealer.code,
        language: lang,
        dealerOverrides: {
          name: formData.dealerName,
          contactPerson: formData.contactPerson,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          country: formData.country,
        },
        product: {
          category: formData.category,
          subcategory: formData.subcategory,
          productName: formData.productName || 'VAU Aken/Uks',
          orderNumber: formData.orderNumber,
          serialNumber: formData.serialNumber,
          quantity: formData.quantity,
          dimensions: formData.dimensions,
          isInstalled: formData.isInstalled,
        },
        defect: {
          type: formData.defectType,
          description: formData.description,
        },
        endCustomer: {
          name: formData.customerName,
          address: formData.customerAddress,
          phone: formData.customerPhone,
          email: formData.customerEmail,
          onSiteInspectionNeeded: formData.onSiteInspection,
        },
        files,
      };

      const result = await submitClaim(payload);
      setSubmissionResult(result);
      if (onClaimSubmitted) onClaimSubmitted(result);
      // Clear draft
      localStorage.removeItem('vau_claim_draft');
      setStep(3);
    } catch (err) {
      alert(`Viga esitamisel: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const copyClaimId = () => {
    if (submissionResult?.claimId) {
      navigator.clipboard.writeText(submissionResult.claimId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Selected category subcategories
  const currentCategoryObj = categories.find(c => c.id === formData.category);
  const subcategories = currentCategoryObj?.subcategories || [];

  return (
    <div className="public-claim-container">
      {/* Language Switcher Bar */}
      <div className="lang-bar-container">
        <span className="lang-label">Keel / Language:</span>
        <div className="lang-buttons-group">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              className={`lang-chip ${lang === l.code ? 'active' : ''}`}
              onClick={() => setLang(l.code)}
            >
              <span className="flag">{l.flag}</span>
              <span className="lang-name">{l.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* STEP 1: Client Code Authentication */}
      {step === 1 && (
        <div className="card-box auth-step-box">
          <div className="auth-header">
            <Shield className="text-navy" size={40} />
            <h2>{t.dealerLogin}</h2>
            <p>{t.enterCodePrompt}</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleVerifyCode(); }} className="auth-form">
            <div className="form-field-group">
              <label htmlFor="clientCodeInput">{t.clientCode}</label>
              <input
                id="clientCodeInput"
                type="text"
                value={clientCode}
                onChange={(e) => setClientCode(e.target.value)}
                placeholder="nt 1001, 2002 või TEST01"
                className="input-text-large"
                autoFocus
              />
            </div>

            {authError && (
              <div className="alert-error">
                <AlertCircle size={18} />
                <span>{authError}</span>
              </div>
            )}

            <button type="submit" className="btn-primary btn-block" disabled={validating}>
              {validating ? 'Kontrollin...' : t.verifyCode}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="quick-test-dealers">
            <span className="quick-title">{t.quickTestCodes}</span>
            <div className="quick-chips">
              <button className="chip" onClick={() => handleVerifyCode('1001')}>
                🇪🇪 1001 - AS Ehitusgrupp
              </button>
              <button className="chip" onClick={() => handleVerifyCode('2002')}>
                🇸🇪 2002 - Fenestra Bygg AB
              </button>
              <button className="chip" onClick={() => handleVerifyCode('3003')}>
                🇫🇮 3003 - Suomi Ovi Oy
              </button>
              <button className="chip chip-test" onClick={() => handleVerifyCode('TEST01')}>
                🧪 TEST01 - VAU Testikonto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Main Claim Form */}
      {step === 2 && dealer && (
        <form onSubmit={handleSubmit} className="claim-main-form">
          {/* Header summary & autosave indicator */}
          <div className="form-top-meta">
            <div className="dealer-badge-header">
              <span className="dealer-tag">Edasimüüja:</span>
              <strong>{dealer.name}</strong>
              <span className="dealer-code">({dealer.code})</span>
              {dealer.isTest && <span className="test-badge">TESTKONTO</span>}
            </div>

            <div className="draft-autosave-badge">
              <CheckCircle size={14} className="text-emerald" />
              <span>{draftSavedTime ? `Mustand salvestatud (${draftSavedTime})` : t.draftSaved}</span>
            </div>
          </div>

          {/* Section 1: Dealer Details */}
          <div className="form-card-section">
            <div className="section-title">
              <h3>1. {t.dealerInfo}</h3>
            </div>
            <div className="grid-2-cols">
              <div className="form-field">
                <label>{t.dealerName}</label>
                <input
                  type="text"
                  name="dealerName"
                  value={formData.dealerName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-field">
                <label>{t.contactPerson}</label>
                <input
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-field">
                <label>{t.email}</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-field">
                <label>{t.phone}</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-field">
                <label>{t.address}</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-field">
                <label>{t.country}</label>
                <select name="country" value={formData.country} onChange={handleInputChange}>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Product Information (2-tier category tree) */}
          <div className="form-card-section">
            <div className="section-title">
              <h3>2. {t.productDetails}</h3>
            </div>
            <div className="grid-2-cols">
              <div className="form-field">
                <label>{t.category} *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={(e) => {
                    handleInputChange(e);
                    setFormData(prev => ({ ...prev, subcategory: '' }));
                  }}
                  required
                >
                  <option value="">-- Valige kategooria --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.names?.[lang] || cat.names?.et || cat.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>{t.subcategory}</label>
                <select
                  name="subcategory"
                  value={formData.subcategory}
                  onChange={handleInputChange}
                  disabled={!formData.category}
                >
                  <option value="">-- Valige alamkategooria --</option>
                  {subcategories.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.names?.[lang] || sub.names?.et || sub.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>{t.productName}</label>
                <input
                  type="text"
                  name="productName"
                  value={formData.productName}
                  onChange={handleInputChange}
                  placeholder="nt Klassik puitaken või Viljandi siseuks"
                />
              </div>

              <div className="form-field">
                <label>{t.orderNumber}</label>
                <input
                  type="text"
                  name="orderNumber"
                  value={formData.orderNumber}
                  onChange={handleInputChange}
                  placeholder="nt ORD-12345"
                />
              </div>

              <div className="form-field">
                <label>{t.serialNumber}</label>
                <input
                  type="text"
                  name="serialNumber"
                  value={formData.serialNumber}
                  onChange={handleInputChange}
                  placeholder="Leiad tootesildilt"
                />
              </div>

              <div className="form-field">
                <label>{t.quantity}</label>
                <input
                  type="number"
                  name="quantity"
                  min="1"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-field">
                <label>{t.dimensions}</label>
                <input
                  type="text"
                  name="dimensions"
                  value={formData.dimensions}
                  onChange={handleInputChange}
                  placeholder="nt 1400 x 1200 mm"
                />
              </div>

              <div className="form-field form-checkbox-field">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    name="isInstalled"
                    checked={formData.isInstalled}
                    onChange={handleInputChange}
                  />
                  <span>{t.isInstalled}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Defect & Attachments */}
          <div className="form-card-section">
            <div className="section-title">
              <h3>3. {t.defectDetails}</h3>
            </div>

            <div className="form-field">
              <label>{t.defectType} *</label>
              <select
                name="defectType"
                value={formData.defectType}
                onChange={handleInputChange}
                required
              >
                <option value="">-- Valige defekti liik --</option>
                {defectTypes.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <div className="label-with-counter">
                <label>{t.description} *</label>
                <span className="char-counter">
                  {formData.description.length} / 6000+ tähemärki
                </span>
              </div>
              <textarea
                name="description"
                rows={5}
                value={formData.description}
                onChange={handleInputChange}
                placeholder={t.descriptionPlaceholder}
                required
              />
            </div>

            {/* File Upload Zone with Tagging */}
            <div className="form-field upload-field">
              <label>{t.attachments}</label>
              <div className="dropzone-box">
                <Upload size={32} className="text-muted" />
                <p>{t.dragDropText}</p>
                <span className="dropzone-hint">{t.recommendedPhotos}</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="file-input-hidden"
                  id="claimFileInput"
                />
                <label htmlFor="claimFileInput" className="btn-secondary btn-sm">
                  Vali failid seadmest
                </label>
              </div>

              {files.length > 0 && (
                <div className="uploaded-files-list">
                  {files.map(f => (
                    <div key={f.id} className="file-chip-card">
                      <FileText size={18} className="text-navy" />
                      <div className="file-info-col">
                        <span className="file-name">{f.name}</span>
                        <span className="file-size">{f.size}</span>
                      </div>
                      <div className="file-tag-select">
                        <select
                          value={f.tag}
                          onChange={(e) => updateFileTag(f.id, e.target.value)}
                        >
                          <option value="Defekti foto">Defekti lähivõte</option>
                          <option value="Tootesilt / Label">Tootesilt / Label</option>
                          <option value="Üldvaade / Overview">Üldvaade / Paigaldus</option>
                          <option value="Saateleht / Akt">Saateleht / Akt</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(f.id)}
                        className="btn-icon-danger"
                        title="Eemalda fail"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 4: End Customer Details */}
          <div className="form-card-section">
            <div className="section-title">
              <h3>4. {t.endCustomerDetails}</h3>
              <p className="section-subtitle">{t.endCustomerPrompt}</p>
            </div>
            <div className="grid-2-cols">
              <div className="form-field">
                <label>{t.customerName}</label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  placeholder="Lõppkliendi nimi"
                />
              </div>

              <div className="form-field">
                <label>{t.customerPhone}</label>
                <input
                  type="text"
                  name="customerPhone"
                  value={formData.customerPhone}
                  onChange={handleInputChange}
                  placeholder="+372 ..."
                />
              </div>

              <div className="form-field">
                <label>{t.customerEmail}</label>
                <input
                  type="email"
                  name="customerEmail"
                  value={formData.customerEmail}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-field">
                <label>{t.customerAddress}</label>
                <input
                  type="text"
                  name="customerAddress"
                  value={formData.customerAddress}
                  onChange={handleInputChange}
                  placeholder="Tänav, maja, linn/maakond"
                />
              </div>

              <div className="form-field form-checkbox-field col-span-2">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    name="onSiteInspection"
                    checked={formData.onSiteInspection}
                    onChange={handleInputChange}
                  />
                  <span>{t.onSiteInspection}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions-bar">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                if (confirm('Kas soovite andmed lähtestada?')) {
                  localStorage.removeItem('vau_claim_draft');
                  setStep(1);
                }
              }}
            >
              <RotateCcw size={16} />
              Vaheta edasimüüjat
            </button>

            <button type="submit" className="btn-primary btn-large" disabled={submitting}>
              {submitting ? t.submitting : t.submitClaim}
              <ArrowRight size={20} />
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: Submission Success View */}
      {step === 3 && submissionResult && (
        <div className="card-box success-step-box">
          <div className="success-icon-badge">
            <CheckCircle size={56} className="text-emerald" />
          </div>

          <h2>{t.claimSubmittedTitle}</h2>
          <p className="success-prompt">{t.claimNumberIs}</p>

          <div className="claim-id-display-card">
            <span className="claim-id-big">{submissionResult.claimId}</span>
            <button
              className="btn-copy-id"
              onClick={copyClaimId}
              title="Kopeeri reklamatsiooninumber"
            >
              {copied ? <Check size={18} className="text-emerald" /> : <Copy size={18} />}
              <span>{copied ? 'Kopeeritud!' : 'Kopeeri'}</span>
            </button>
          </div>

          {submissionResult.isOffline && (
            <div className="alert-warning">
              <Info size={20} />
              <div>
                <strong>Salvestatud seadmesse ajutise tunnusega (UUID)</strong>
                <p>
                  Kuna seade on võrguühenduseta, genereerib server lõpliku P/T-numbri automaatselt sünkroonimisel.
                </p>
              </div>
            </div>
          )}

          <p className="tracking-text">{t.trackingNote}</p>

          <div className="success-actions-row">
            <button
              className="btn-secondary"
              onClick={() => {
                setFormData({
                  dealerName: dealer?.name || '',
                  contactPerson: dealer?.contactPerson || '',
                  email: dealer?.email || '',
                  phone: dealer?.phone || '',
                  address: dealer?.address || '',
                  country: dealer?.country || 'EST',
                  category: '',
                  subcategory: '',
                  productName: '',
                  orderNumber: '',
                  serialNumber: '',
                  quantity: 1,
                  dimensions: '',
                  isInstalled: true,
                  defectType: '',
                  description: '',
                  customerName: '',
                  customerAddress: '',
                  customerPhone: '',
                  customerEmail: '',
                  onSiteInspection: false,
                });
                setFiles([]);
                setStep(2);
              }}
            >
              {t.submitAnother}
            </button>

            {onNavigateToHandler && (
              <button
                className="btn-primary"
                onClick={() => onNavigateToHandler(submissionResult.claimId)}
              >
                Ava juhtum käsitleja töölaual
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicClaimView;
