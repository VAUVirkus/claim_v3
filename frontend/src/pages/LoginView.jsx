import React, { useState } from 'react';
import { USERS, setCurrentUser, getRoleHomeView } from '../services/auth';
import {
  ShieldCheck,
  Building2,
  ClipboardList,
  CheckCircle,
  Smartphone,
  Sliders,
  BarChart3,
  ArrowRight,
  LogIn,
  UserCheck,
  Sparkles,
} from 'lucide-react';

const ROLE_GROUPS = [
  {
    role: 'DEALER',
    title: 'Pretensiooni esitaja',
    subtitle: 'Edasimüüja portaal',
    icon: Building2,
    color: '#0284c7',
    bg: '#f0f9ff',
    border: '#bae6fd',
    desc: 'Esitab uusi reklamatsioone (veebivorm F1) ja jälgib oma esitatud juhtumite seisu.',
    users: USERS.filter(u => u.role === 'DEALER'),
  },
  {
    role: 'HANDLER',
    title: 'Käsitleja',
    subtitle: 'Töölaud & Menetlus',
    icon: ClipboardList,
    color: '#4f46e5',
    bg: '#eef2ff',
    border: '#c7d2fe',
    desc: 'Menetleb kõiki juhtumeid, määrab teenuseid, koostab kulupakkumisi ja juhib olekumasinat.',
    users: USERS.filter(u => u.role === 'HANDLER'),
  },
  {
    role: 'APPROVER',
    title: 'Kinnitaja',
    subtitle: 'Kulupakkumised',
    icon: CheckCircle,
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    desc: 'Vaatab läbi ja kinnitab või lükkab tagasi kulupakkumisi (Raudreegel 2.1: põhjendus kohustuslik).',
    users: USERS.filter(u => u.role === 'APPROVER'),
  },
  {
    role: 'SERVICE_TEAM',
    title: 'Teenusmeeskond',
    subtitle: 'Välitööd (Mobiil/PWA)',
    icon: Smartphone,
    color: '#0891b2',
    bg: '#ecfeff',
    border: '#a5f3fc',
    desc: 'Objektil töö teostamine: saabub väljakutsele, märgib töö tehtuks, lisab fotod ja allkirjastatud akti.',
    users: USERS.filter(u => u.role === 'SERVICE_TEAM'),
  },
  {
    role: 'ADMIN',
    title: 'Administraator',
    subtitle: 'Süsteemihaldus',
    icon: Sliders,
    color: '#7c3aed',
    bg: '#faf5ff',
    border: '#ddd6fe',
    desc: 'Haldab kasutajaid, rolle, kategooriate puud, defektitüüpe, kulukontosid ja süsteemi auditilogi.',
    users: USERS.filter(u => u.role === 'ADMIN'),
  },
  {
    role: 'OBSERVER_FINANCE',
    title: 'Finants / ERP',
    subtitle: 'Aruandlus ja vaatleja',
    icon: BarChart3,
    color: '#059669',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    desc: 'Kulude jaotus osakondade vahel, eelarve analüüs ilma lõppkliendi privaatsete andmeteta (GDPR).',
    users: USERS.filter(u => u.role === 'OBSERVER_FINANCE'),
  },
];

const LoginView = ({ onLoginSuccess, onOpenPublicClaim }) => {
  const [selectedUserId, setSelectedUserId] = useState(USERS[0].id);
  const [password, setPassword] = useState('demo123');
  const [activeTab, setActiveTab] = useState('personas'); // 'personas' or 'form'

  const handleSelectUserAndLogin = (user) => {
    setCurrentUser(user);
    if (onLoginSuccess) {
      onLoginSuccess(user, getRoleHomeView(user.role));
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const user = USERS.find(u => u.id === selectedUserId);
    if (user) {
      handleSelectUserAndLogin(user);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-hero-card">
        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="brand-logo-large">VAU</div>
          <div className="brand-header-text">
            <h2>AS Viljandi Aken ja Uks</h2>
            <p className="login-system-title">Claim Management System v3.0</p>
          </div>
        </div>

        <div className="login-intro-box">
          <div className="login-intro-left">
            <h3>Vali roll või sisene prototüüpi</h3>
            <p className="text-muted">
              Süsteem toetab kõiki standardseid rolle vastavalt spetsifikatsioonile (Spec 2.2). Vali allpool soovitud roll, et testida süsteemi selle kasutaja vaatenurgast.
            </p>
          </div>
          <div className="login-intro-spec-pill">
            <ShieldCheck size={18} className="text-emerald" />
            <span>spec_v3 nõuetele vastav rollipõhine liides</span>
          </div>
        </div>

        {/* Tab switcher: Personas vs Credentials */}
        <div className="login-tabs-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className={`login-tab-btn ${activeTab === 'personas' ? 'active' : ''}`}
            onClick={() => setActiveTab('personas')}
          >
            <Sparkles size={16} />
            <span>Kiirvalik rollide järgi (Prototüüp)</span>
          </button>
          <button
            className={`login-tab-btn ${activeTab === 'form' ? 'active' : ''}`}
            onClick={() => setActiveTab('form')}
          >
            <UserCheck size={16} />
            <span>Klassikaline sisselogimisvorm</span>
          </button>
          
          <div style={{ flex: 1 }}></div>
          
          {/* Public Claim Button */}
          <button
            className="btn-primary"
            style={{ backgroundColor: 'var(--color-emerald)' }}
            onClick={onOpenPublicClaim}
          >
            <ClipboardList size={16} />
            <span>Esita üksik pretensioon (Külalisena)</span>
          </button>
        </div>

        {/* Option 1: Persona Cards Grid */}
        {activeTab === 'personas' && (
          <div className="login-personas-grid">
            {ROLE_GROUPS.map((group) => {
              const Icon = group.icon;
              return (
                <div
                  key={group.role}
                  className="role-group-card"
                  style={{ borderColor: group.border }}
                >
                  <div className="role-group-header" style={{ backgroundColor: group.bg }}>
                    <div className="role-icon-badge" style={{ color: group.color, backgroundColor: '#ffffff' }}>
                      <Icon size={22} />
                    </div>
                    <div>
                      <h4 className="role-group-title">{group.title}</h4>
                      <span className="role-group-subtitle">{group.subtitle}</span>
                    </div>
                  </div>

                  <p className="role-group-desc">{group.desc}</p>

                  <div className="role-users-list">
                    <span className="users-list-label">Kasutajad:</span>
                    {group.users.map((user) => (
                      <button
                        key={user.id}
                        className="user-login-chip-btn"
                        onClick={() => handleSelectUserAndLogin(user)}
                        title={`Sisene kui ${user.name} (${user.company})`}
                      >
                        <div className="user-avatar-tiny">{user.avatar}</div>
                        <div className="user-chip-meta">
                          <span className="user-chip-name">{user.name}</span>
                          <span className="user-chip-company">{user.company}</span>
                        </div>
                        <ArrowRight size={14} className="user-chip-arrow" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Option 2: Classic Login Form */}
        {activeTab === 'form' && (
          <div className="login-form-wrapper">
            <form onSubmit={handleFormSubmit} className="login-classic-form">
              <div className="form-field">
                <label>Vali kasutaja / roll:</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="form-select"
                >
                  {USERS.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {u.roleLabel} ({u.company})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Parool (demo):</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="demo123"
                  required
                />
              </div>

              {(() => {
                const current = USERS.find(u => u.id === selectedUserId);
                if (!current) return null;
                return (
                  <div className="selected-user-preview-box">
                    <div className="user-preview-avatar">{current.avatar}</div>
                    <div>
                      <strong>{current.name}</strong>
                      <p className="text-muted text-sm">{current.roleLabel} • {current.company}</p>
                      <p className="text-xs text-muted">{current.description}</p>
                    </div>
                  </div>
                );
              })()}

              <button type="submit" className="btn-primary btn-block btn-lg">
                <LogIn size={18} />
                <span>Sisene süsteemi valitud rollis</span>
              </button>
            </form>
          </div>
        )}

        {/* Security & Footer info */}
        <div className="login-footer-info">
          <span>🔒 Krüpteeritud seanss</span>
          <span>•</span>
          <span>Vastavus GDPR ja ettevõtte turvastandarditele</span>
          <span>•</span>
          <span>AS Viljandi Aken ja Uks © 2026</span>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
