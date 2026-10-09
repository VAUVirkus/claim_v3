import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import OfflineSyncModal from './components/OfflineSyncModal';
import LoginView from './pages/LoginView';
import DealerPortalView from './pages/DealerPortalView';
import HandlerDashboard from './pages/HandlerDashboard';
import ApproverView from './pages/ApproverView';
import ServiceTeamMobileView from './pages/ServiceTeamMobileView';
import AdminView from './pages/AdminView';
import ClaimDistributorView from './pages/ClaimDistributorView';
import PublicClaimView from './pages/PublicClaimView';
import { getCurrentUser, setCurrentUser as saveCurrentUser, logout as authLogout, getRoleHomeView } from './services/auth';

function App() {
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [currentView, setCurrentView] = useState(() => {
    const user = getCurrentUser();
    return user ? getRoleHomeView(user.role) : 'login';
  });
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState(null);

  useEffect(() => {
    const handleAuthChange = (e) => {
      setCurrentUser(e.detail?.user || null);
    };
    window.addEventListener('vau_auth_state_changed', handleAuthChange);
    return () => window.removeEventListener('vau_auth_state_changed', handleAuthChange);
  }, []);

  const handleLoginSuccess = (user, targetView) => {
    setCurrentUser(user);
    saveCurrentUser(user);
    setCurrentView(targetView || getRoleHomeView(user.role));
  };

  const handleSwitchUser = (user) => {
    setCurrentUser(user);
    saveCurrentUser(user);
    setCurrentView(getRoleHomeView(user.role));
  };

  const handleLogout = () => {
    authLogout();
    setCurrentUser(null);
    setCurrentView('login');
  };

  const handleNavigateToHandler = (claimId) => {
    setSelectedClaimId(claimId);
    setCurrentView('handler');
  };

  // If user is not logged in or explicitly in login view
  if (!currentUser || currentView === 'login') {
    if (currentView === 'public_claim') {
      return (
        <div className="vau-claim-app" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
          <div style={{ padding: '16px', borderBottom: '3px solid var(--vau-gold)', backgroundColor: 'var(--vau-navy)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>VAU Claim Management</div>
            <button className="btn-secondary btn-sm" onClick={() => setCurrentView('login')}>Tagasi sisselogimisele</button>
          </div>
          <div style={{ padding: '24px' }}>
             <PublicClaimView onClaimSubmitted={() => {}} />
          </div>
        </div>
      );
    }
    return (
      <div className="vau-claim-app">
        <LoginView 
          onLoginSuccess={handleLoginSuccess} 
          onOpenPublicClaim={() => setCurrentView('public_claim')} 
        />
      </div>
    );
  }

  return (
    <div className="vau-claim-app">
      <Navigation
        currentUser={currentUser}
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
          setSelectedClaimId(null);
        }}
        onOpenSyncModal={() => setSyncModalOpen(true)}
        onSwitchUser={handleSwitchUser}
        onLogout={handleLogout}
      />

      <main className="main-content-layout">
        {currentView === 'dealer' && (
          <DealerPortalView user={currentUser} />
        )}

        {currentView === 'distributor' && (
          <ClaimDistributorView onNavigateToHandler={handleNavigateToHandler} />
        )}

        {currentView === 'handler' && (
          <HandlerDashboard initialSelectedId={selectedClaimId} />
        )}

        {currentView === 'approver' && (
          <ApproverView />
        )}

        {currentView === 'mobile' && (
          <ServiceTeamMobileView />
        )}

        {(currentView === 'admin' || currentView === 'sysadmin') && (
          <AdminView />
        )}
      </main>

      {/* Offline Sync Modal */}
      <OfflineSyncModal
        isOpen={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        onSynced={() => {
          // Sync notification
        }}
      />
    </div>
  );
}

export default App;
