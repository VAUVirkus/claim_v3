import React, { useState, useEffect } from 'react';
import { getForceOffline, setForceOffline, getOfflineQueue } from '../services/api';
import { USERS, logout } from '../services/auth';
import {
  FileText,
  LayoutDashboard,
  CheckSquare,
  Smartphone,
  Sliders,
  BarChart3,
  Wifi,
  WifiOff,
  RefreshCw,
  ShieldCheck,
  Building2,
  LogOut,
  UserCheck,
  ChevronDown,
  UserCog,
  Database,
} from 'lucide-react';

const Navigation = ({
  currentUser,
  currentView,
  onViewChange,
  onOpenSyncModal,
  onSwitchUser,
  onLogout,
}) => {
  const [isOffline, setIsOffline] = useState(getForceOffline());
  const [queueCount, setQueueCount] = useState(getOfflineQueue().length);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    const handleNetworkChange = (e) => {
      setIsOffline(e.detail.isOffline);
    };
    const handleQueueChange = (e) => {
      setQueueCount(e.detail.count);
    };

    window.addEventListener('vau_network_status_change', handleNetworkChange);
    window.addEventListener('vau_queue_updated', handleQueueChange);

    return () => {
      window.removeEventListener('vau_network_status_change', handleNetworkChange);
      window.removeEventListener('vau_queue_updated', handleQueueChange);
    };
  }, []);

  // Handle Escape key to close dropdown
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && userDropdownOpen) {
        setUserDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userDropdownOpen]);

  const toggleNetwork = () => {
    const next = !isOffline;
    setForceOffline(next);
    setIsOffline(next);
  };

  const navItems = [
    { id: 'dealer', label: 'Pretensiooni esitaja (Edasimüüja)', icon: Building2, tag: 'Portaal' },
    { id: 'distributor', label: 'Käsitleja määraja (Admin)', icon: UserCog, tag: 'Jaotaja' },
    { id: 'handler', label: 'Käsitleja töölaud', icon: LayoutDashboard, tag: 'Töölaud' },
    { id: 'approver', label: 'Kinnitaja vaade', icon: CheckSquare, tag: 'Kinnitus' },
    { id: 'mobile', label: 'Teenusmeeskond (Mobiil)', icon: Smartphone, tag: 'PWA' },
    { id: 'sysadmin', label: 'Sysadmin juhtpaneel', icon: Sliders, tag: 'Sysadmin' },
  ];

  return (
    <header className="app-nav-header">
      <div className="nav-top-banner">
        <div className="brand-group">
          <div className="brand-logo-badge">VAU</div>
          <div className="brand-meta">
            <span className="brand-title">AS Viljandi Aken ja Uks</span>
            <span className="brand-subtitle">Claim Management System v3.0</span>
          </div>
        </div>

        {/* Global Controls & Active User Profile */}
        <div className="header-status-controls">
          {/* Active User Chip & Switcher */}
          {currentUser && (
            <div className="user-profile-header-dropdown">
              <button
                className="user-profile-badge-btn"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                title="Klõpsa rolli või kasutaja vahetamiseks"
              >
                <div className="user-avatar-tiny">{currentUser.avatar || 'U'}</div>
                <div className="user-profile-meta">
                  <span className="user-profile-name">{currentUser.name}</span>
                  <span className="user-profile-role">{currentUser.roleLabel || currentUser.role}</span>
                </div>
                <ChevronDown size={14} className="text-muted" />
              </button>

              {userDropdownOpen && (
                <div className="user-dropdown-menu">
                  <div className="dropdown-menu-header">
                    <strong>Aktiivne kasutaja</strong>
                    <span className="text-xs text-muted">{currentUser.company} ({currentUser.email})</span>
                  </div>

                  <div className="dropdown-divider" />
                  <span className="dropdown-section-label">Vaheta rolli (Prototüüp):</span>

                  <div className="dropdown-users-scroll">
                    {USERS.map((u) => {
                      const isActive = u.id === currentUser.id;
                      return (
                        <button
                          key={u.id}
                          className={`dropdown-user-item ${isActive ? 'active' : ''}`}
                          onClick={() => {
                            setUserDropdownOpen(false);
                            if (onSwitchUser) onSwitchUser(u);
                          }}
                        >
                          <div className="user-avatar-tiny">{u.avatar}</div>
                          <div className="dropdown-user-text">
                            <span className="dropdown-user-name">{u.name}</span>
                            <span className="dropdown-user-role">{u.roleLabel} • {u.company}</span>
                          </div>
                          {isActive && <span className="active-dot" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="dropdown-divider" />
                  <div className="dropdown-actions">
                    <button
                      className="dropdown-action-btn"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onViewChange('login');
                      }}
                    >
                      <UserCheck size={15} />
                      <span>Sisselogimisleht</span>
                    </button>
                    <button
                      className="dropdown-action-btn text-danger"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        if (onLogout) onLogout();
                      }}
                    >
                      <LogOut size={15} />
                      <span>Logi välja</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Network offline simulation toggle */}
          <button
            className={`network-toggle-btn ${isOffline ? 'offline' : 'online'}`}
            onClick={toggleNetwork}
            title="Klõpsa võrguühenduseta (offline) režiimi simuleerimiseks"
          >
            {isOffline ? (
              <>
                <WifiOff size={16} />
                <span>Simuleeri: Võrguühenduseta (Offline)</span>
              </>
            ) : (
              <>
                <Wifi size={16} />
                <span>Võrgus (Online)</span>
              </>
            )}
          </button>

          {/* Sync badge button */}
          {queueCount > 0 && (
            <button className="sync-badge-btn" onClick={onOpenSyncModal}>
              <RefreshCw size={14} className="animate-spin-slow" />
              <span>Ootel sünkroonimine: <strong>{queueCount}</strong></span>
            </button>
          )}

          <div className="system-pill" title="Kood väljaspool veebijuurt, range tüübistus, auditeeritud">
            <ShieldCheck size={16} className="text-emerald" />
            <span>spec_v3 nõuetele vastav</span>
          </div>
        </div>
      </div>

      {/* Role Navigation Bar (Rule 6.2: One SPA for all roles) */}
      <nav className="role-navigation-bar">
        <div className="nav-role-tabs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                className={`nav-tab-btn ${active ? 'active' : ''}`}
                onClick={() => onViewChange(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                <span className="tab-spec-tag">{item.tag}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};

export default Navigation;
