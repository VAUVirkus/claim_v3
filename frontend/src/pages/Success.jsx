import React, { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import './Success.css';

const Success = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const claimId = location.state?.claimId;

  useEffect(() => {
    if (!claimId) {
      navigate('/');
    }
  }, [claimId, navigate]);

  if (!claimId) return null;

  return (
    <div className="success-page">
      <header className="header">
        <div className="header-logo">
          <h2>VAU Claim System</h2>
        </div>
      </header>

      <main className="container success-container">
        <div className="success-card">
          <CheckCircle className="success-icon" size={64} />
          <h1>Claim Submitted Successfully!</h1>
          <p>Your claim has been received and is being processed.</p>
          
          <div className="claim-id-box">
            <span>Claim ID:</span>
            <strong>{claimId}</strong>
          </div>
          
          <p className="success-info">
            Please keep this ID for your records. A confirmation email has been sent to your registered address.
          </p>

          <Link to="/" className="home-link">
            Return to Home
          </Link>
        </div>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Support</h3>
            <p className="contact-info">If you have any questions, contact us at <span>support@vau.ee</span></p>
          </div>
        </div>
        <div className="footer-bottom">
          &copy; {new Date().getFullYear()} AS Viljandi Aken ja Uks
        </div>
      </footer>
    </div>
  );
};

export default Success;
