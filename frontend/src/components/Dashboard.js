import React, { useEffect, useState } from 'react';
import { useWeb3 } from '../hooks/useWeb3.js';
import { useApi } from '../hooks/useApi.js';

const Dashboard = () => {
  const { account, connectWallet, isConnected } = useWeb3();
  const [stats, setStats] = useState({
    activePolicies: 0,
    totalPremium: 0,
    totalPayouts: 0,
    revenue: 0,
    policies: []
  });
  const [showFinalized, setShowFinalized] = useState(false);
  
  const fetchStats = async () => {
    if (!account || !isConnected) return;
    
    try {
      const res = await fetch(`http://localhost:3001/api/policies/farmer/${account}`);
      const data = await res.json();
      
      if (data.success && data.data) {
        const policies = data.data; // Backend returns data.data
        console.log('📊 Dashboard - Received policies:', policies.length);
        console.log('📊 Dashboard - All policies:', policies.map(p => ({ id: p.policyId, status: p.statusString, statusCode: p.status })));
        
        const active = policies.filter(p => p.status === 0 || p.statusString === 'Active').length;
        console.log('📊 Dashboard - Active policies:', active);
        const totalPremium = policies.reduce((sum, p) => {
          const premium = p.premiumPaid ? parseFloat(p.premiumPaid) / 1e18 : 0;
          return sum + premium;
        }, 0);
        const totalPayouts = policies.filter(p => p.status === 1 || p.statusString === 'PaidOut').length;
        
        // Calculate revenue: Total Premium - Total Payouts Made
        const totalPayoutAmount = policies
          .filter(p => p.status === 1 || p.statusString === 'PaidOut')
          .reduce((sum, p) => {
            const payout = p.payoutAmount ? parseFloat(p.payoutAmount) / 1e18 : 0;
            return sum + payout;
          }, 0);
        
        const revenue = totalPremium - totalPayoutAmount;
        
        setStats({
          activePolicies: active,
          totalPremium: totalPremium,
          totalPayouts: totalPayouts,
          revenue: revenue,
          policies: policies
        });
      }
    } catch (err) {
      console.error('Error loading policies:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Listen for policy creation and finalization events
    const handlePolicyEvent = async () => {
      console.log('Policy event received, refreshing dashboard...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      fetchStats();
    };
    
    window.addEventListener('policyCreated', handlePolicyEvent);
    window.addEventListener('policyFinalized', handlePolicyEvent);
    
    return () => {
      window.removeEventListener('policyCreated', handlePolicyEvent);
      window.removeEventListener('policyFinalized', handlePolicyEvent);
    };
  }, [account, isConnected]);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>📊 Dashboard</h2>
        {!isConnected ? (
          <button onClick={connectWallet} className="connect-wallet-btn">
            Connect MetaMask
          </button>
        ) : (
          <div className="wallet-info">
            <span>Connected: {account?.slice(0, 6)}...{account?.slice(-4)}</span>
            <button style={{ marginLeft: '12px' }} className="refresh-btn" onClick={fetchStats}>🔄 Refresh</button>
          </div>
        )}
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Active Policies</h3>
          <p className="stat-number">{stats.activePolicies}</p>
        </div>
        <div className="stat-card">
          <h3>Total Premium</h3>
          <p className="stat-number">{stats.totalPremium.toFixed(4)} ETH</p>
        </div>
        <div className="stat-card">
          <h3>Payouts Made</h3>
          <p className="stat-number">{stats.totalPayouts}</p>
        </div>
        <div className="stat-card">
          <h3>Revenue</h3>
          <p className="stat-number" style={{ color: stats.revenue >= 0 ? '#28a745' : '#dc3545' }}>
            {stats.revenue.toFixed(4)} ETH
          </p>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="recent-activity">
          <h3>Recent Activity (Active Policies)</h3>
          <div className="activity-list">
            {stats.policies.length > 0 ? (
              (() => {
                const activePolicies = stats.policies
                  .filter(p => p.status === 0 || p.statusString === 'Active')
                  .sort((a, b) => b.policyId - a.policyId)
                  .slice(0, 5);
                
                if (activePolicies.length === 0) {
                  return (
                    <div className="activity-item">
                      <span className="activity-time">No active policies</span>
                      <span className="activity-text">Create your first policy to get started!</span>
                    </div>
                  );
                }
                
                return activePolicies.map((policy, idx) => (
                  <div key={policy.policyId || idx} className="activity-item">
                    <span className="activity-time">{policy.statusString || 'Active'}</span>
                    <span className="activity-text">Policy #{policy.policyId} - {policy.productName || 'Insurance'}</span>
                  </div>
                ));
              })()
            ) : (
              <div className="activity-item">
                <span className="activity-time">No policies yet</span>
                <span className="activity-text">Create your first policy to get started!</span>
              </div>
            )}
          </div>
        </div>

        <div className="weather-summary">
          <h3>Current Weather</h3>
          <div className="weather-data">
            <div className="weather-item">
              <span>Rainfall:</span>
              <span>20.2mm</span>
            </div>
            <div className="weather-item">
              <span>Temperature:</span>
              <span>27.3°C</span>
            </div>
            <div className="weather-item">
              <span>Soil Moisture:</span>
              <span>41.4%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="finalized-policies-section">
        <div className="section-header">
          <h3>✅ Paid Out & Expired Policies</h3>
          <button 
            className="toggle-btn" 
            onClick={() => setShowFinalized(!showFinalized)}
          >
            {showFinalized ? '▼ Hide' : '▶ Show'} ({stats.policies.filter(p => p.status !== 0 && p.statusString !== 'Active').length})
          </button>
        </div>
        
        {showFinalized && (
          <div className="finalized-policies-list">
            {stats.policies.filter(p => p.status !== 0 && p.statusString !== 'Active').length > 0 ? (
              stats.policies
                .filter(p => p.status !== 0 && p.statusString !== 'Active')
                .sort((a, b) => b.policyId - a.policyId) // Sort by policy ID descending (most recent first)
                .map((policy, idx) => (
                  <div key={policy.policyId || idx} className="finalized-policy-card">
                    <div className="finalized-policy-header">
                      <h4>Policy #{policy.policyId}</h4>
                      <span className={`status-badge ${policy.statusString === 'PaidOut' ? 'paid-out' : 'expired'}`}>
                        {policy.statusString}
                      </span>
                    </div>
                    <div className="finalized-policy-details">
                      <div className="detail-item">
                        <span>Product:</span>
                        <span>{policy.productName || 'N/A'}</span>
                      </div>
                      <div className="detail-item">
                        <span>Premium:</span>
                        <span>{(parseFloat(policy.premiumPaid) / 1e18).toFixed(4)} ETH</span>
                      </div>
                      <div className="detail-item">
                        <span>Payout:</span>
                        <span>{(parseFloat(policy.payoutAmount) / 1e18).toFixed(4)} ETH</span>
                      </div>
                      <div className="detail-item">
                        <span>Created:</span>
                        <span>{policy.startTs ? new Date(policy.startTs * 1000).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="detail-item">
                        <span>Expired:</span>
                        <span>{policy.endTs ? new Date(policy.endTs * 1000).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="no-finalized-policies">
                <p>No finalized policies yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;