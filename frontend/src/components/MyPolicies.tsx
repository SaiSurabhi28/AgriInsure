import React from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { useApi } from '../hooks/useApi';

const MyPolicies: React.FC = () => {
  const { account, isConnected } = useWeb3();
  const { data: policies, loading } = useApi('/api/policies');

  if (!isConnected) {
    return (
      <div className="my-policies">
        <h2>📋 My Policies</h2>
        <p>Please connect your wallet to view your policies.</p>
      </div>
    );
  }

  return (
    <div className="my-policies">
      <h2>📋 My Policies</h2>
      
      {loading ? (
        <div className="loading">Loading policies...</div>
      ) : policies && policies.length > 0 ? (
        <div className="policies-list">
          {policies.map((policy: any, index: number) => (
            <div key={index} className="policy-card">
              <div className="policy-header">
                <h3>Policy #{policy.id || index + 1}</h3>
                <span className={`status ${policy.isActive ? 'active' : 'inactive'}`}>
                  {policy.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className="policy-details">
                <div className="detail-row">
                  <span>Premium:</span>
                  <span>{policy.premium || '0.1'} ETH</span>
                </div>
                <div className="detail-row">
                  <span>Payout:</span>
                  <span>{policy.payoutAmount || '0.2'} ETH</span>
                </div>
                <div className="detail-row">
                  <span>Threshold:</span>
                  <span>{policy.threshold || '20'}mm</span>
                </div>
                <div className="detail-row">
                  <span>Duration:</span>
                  <span>{policy.duration || '30'} days</span>
                </div>
                <div className="detail-row">
                  <span>Created:</span>
                  <span>{new Date(policy.startTime * 1000).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="policy-actions">
                <button className="action-btn">View Details</button>
                <button className="action-btn">Check Payout</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-policies">
          <p>No policies found. Create your first policy to get started!</p>
        </div>
      )}
    </div>
  );
};

export default MyPolicies;