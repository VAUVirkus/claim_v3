import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchClientDetails, fetchCategories, submitClaim } from '../services/api';
import './Ankeet.css';
import { Upload, File, X, CheckCircle } from 'lucide-react';

const Ankeet = ({ clientCode }) => {
  const navigate = useNavigate();
  const [clientDetails, setClientDetails] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    poNumber: '',
  });
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (!clientCode) {
      navigate('/');
      return;
    }

    const loadData = async () => {
      try {
        const client = await fetchClientDetails(clientCode);
        const cats = await fetchCategories();
        setClientDetails(client);
        setCategories(cats);
      } catch (err) {
        console.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [clientCode, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category || !formData.description) {
      alert("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitClaim({
        clientCode,
        ...formData,
        files
      });
      if (result.success) {
        navigate('/success', { state: { claimId: result.claimId } });
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting claim.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading-container">Loading...</div>;
  }

  return (
    <div className="ankeet-page">
      <header className="header">
        <div className="header-logo">
          <h2>VAU Claim System</h2>
        </div>
        <div className="header-actions">
          <div className="client-container">
            Client: {clientDetails?.clientName} ({clientCode})
          </div>
        </div>
      </header>

      <main className="container">
        <h2>Submit a Claim</h2>
        <div className="form-wrapper">
          <form onSubmit={handleSubmit} className="claim-form">
            <div className="form-group">
              <label htmlFor="poNumber">PO Number / Order Reference</label>
              <input 
                type="text" 
                id="poNumber" 
                name="poNumber"
                value={formData.poNumber}
                onChange={handleInputChange}
                className="filter-input"
                placeholder="e.g. PO-12345"
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Claim Category <span className="required">*</span></label>
              <select 
                id="category" 
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="dropdown menu filter-input"
                required
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description <span className="required">*</span></label>
              <textarea 
                id="description" 
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="filter-input text-area"
                rows="6"
                placeholder="Describe the issue in detail..."
                required
              />
            </div>

            <div className="form-group file-upload-group">
              <label>Attachments (Photos, Documents)</label>
              <div className="file-upload-zone">
                <input 
                  type="file" 
                  id="file-upload" 
                  multiple 
                  onChange={handleFileChange}
                  className="file-input-hidden"
                />
                <label htmlFor="file-upload" className="file-upload-label">
                  <Upload className="upload-icon" />
                  <span>Click to select files</span>
                </label>
              </div>
              
              {files.length > 0 && (
                <div className="file-list">
                  {files.map((file, index) => (
                    <div key={index} className="file-item">
                      <File size={16} />
                      <span className="file-name">{file.name}</span>
                      <button type="button" onClick={() => removeFile(index)} className="remove-file-btn">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Claim'}
              </button>
            </div>
          </form>
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

export default Ankeet;
