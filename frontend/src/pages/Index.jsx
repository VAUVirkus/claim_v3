import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { validateClientCode } from '../services/api';
import './Index.css';

const Index = ({ setClientCode }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (code.length >= 15) {
      setError('Invalid code: length must be less than 15.');
      return;
    }
    
    if (!code) {
      setError('Please enter a client code.');
      return;
    }

    setLoading(true);
    try {
      await validateClientCode(code);
      setClientCode(code);
      navigate('/ankeet');
    } catch (err) {
      setError('Invalid client code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>VAU Claim System</h1>
          <p>Please enter your client code to proceed.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="clientCode">Client Code</label>
            <input
              type="text"
              id="clientCode"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter client code"
              autoComplete="off"
            />
          </div>
          {error && <div id="error-message">{error}</div>}
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Index;
