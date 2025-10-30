import React, { useState } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { useApi } from '../hooks/useApi';

const CreatePolicy: React.FC = () => {
  const { account, isConnected } = useWeb3();
  const { createPolicy } = useApi('/api/policies');
  const [formData, setFormData] = useState({
    premium: '',
    threshold: '',
    duration: '30'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      await createPolicy({
        farmer: account,
        premium: parseFloat(formData.premium),
        threshold: parseFloat(formData.threshold),
        duration: parseInt(formData.duration)
      });
      alert('Policy created successfully!');
      setFormData({ premium: '', threshold: '', duration: '30' });
    } catch (error) {
      alert('Error creating policy: ' + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-policy">
      <h2>🌱 Create New Insurance Policy</h2>
      
      {!isConnected ? (
        <div className="connect-prompt">
          <p>Please connect your MetaMask wallet to create a policy.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="policy-form">
          <div className="form-group">
            <label htmlFor="premium">Premium Amount (ETH)</label>
            <input
              type="number"
              id="premium"
              step="0.01"
              min="0.01"
              value={formData.premium}
              onChange={(e) => setFormData({ ...formData, premium: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="threshold">Rainfall Threshold (mm)</label>
            <input
              type="number"
              id="threshold"
              step="0.1"
              min="1"
              max="50"
              value={formData.threshold}
              onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
              required
            />
            <small>Payout triggered if rainfall falls below this threshold</small>
          </div>

          <div className="form-group">
            <label htmlFor="duration">Policy Duration (days)</label>
            <select
              id="duration"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            >
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
              <option value="180">180 days</option>
              <option value="365">365 days</option>
            </select>
          </div>

          <div className="form-summary">
            <h3>Policy Summary</h3>
            <div className="summary-item">
              <span>Premium:</span>
              <span>{formData.premium || '0'} ETH</span>
            </div>
            <div className="summary-item">
              <span>Payout:</span>
              <span>{formData.premium ? (parseFloat(formData.premium) * 2).toFixed(2) : '0'} ETH</span>
            </div>
            <div className="summary-item">
              <span>Duration:</span>
              <span>{formData.duration} days</span>
            </div>
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Creating...' : 'Create Policy'}
          </button>
        </form>
      )}
    </div>
  );
};

export default CreatePolicy;