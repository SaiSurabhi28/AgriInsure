import React, { useEffect, useState } from 'react';
import { useWeb3 } from '../hooks/useWeb3.js';
import { useApi } from '../hooks/useApi.js';

const BUILD_ID = process.env.REACT_APP_BUILD_ID || 'dev';

const Dashboard = () => {
  const { account, connectWallet, isConnected } = useWeb3();
  const [stats, setStats] = useState({
    activePolicies: 0,
    allActivePolicies: 0,
    totalPremium: 0,
    totalPayouts: 0,
    policies: []
  });
  
  const fetchStats = async () => {
    if (!account || !isConnected) return;
    
    try {
      const res = await fetch(`http://localhost:3001/api/policies/${account}`);
      const data = await res.json();
      
        if (data.policies) {
          const active = data.policies.filter(p => p.status === 0 || p.statusString === 'Active').length;
          const totalPremium = data.policies.reduce((sum, p) => {
            const premium = p.premiumPaid ? parseFloat(p.premiumPaid) / 1e18 : 0;
            return sum + premium;
          }, 0);
          const totalPayouts = data.policies.filter(p => p.status === 1 || p.statusString === 'PaidOut').length;
          
          // Fetch all active policies across all accounts
          let allActive = 0;
          try {
            const allRes = await fetch(`http://localhost:3001/api/policies/all?limit=1000&t=${Date.now()}`);
            const allData = await allRes.json();
            if (allData.success && Array.isArray(allData.data)) {
              allActive = allData.data.filter(p => p.status === 0 || p.statusString === 'Active').length;
            }
          } catch (e) {
            console.warn('Failed to load all policies:', e);
          }
          
          setStats({
            activePolicies: active,
            allActivePolicies: allActive,
            totalPremium: totalPremium,
            totalPayouts: totalPayouts,
            policies: data.policies
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
        <h2>📊 Dashboard <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: '#666' }}>Build: {BUILD_ID}</span></h2>
        {!isConnected ? (
          <button onClick={connectWallet} className="connect-wallet-btn">
            Connect MetaMask
          </button>
        ) : (
          <div className="wallet-info">
            <span>Connected: {account?.slice(0, 6)}...{account?.slice(-4)}</span>
          </div>
        )}
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Active Policies</h3>
          <p className="stat-number">{stats.activePolicies}</p>
        </div>
        <div className="stat-card">
          <h3>All Active Policies</h3>
          <p className="stat-number">{stats.allActivePolicies}</p>
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
          <h3>Total Policies</h3>
          <p className="stat-number">{stats.policies.length}</p>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="recent-activity">
          <h3>Recent Activity</h3>
          <div className="activity-list">
            {stats.policies.length > 0 ? (
              stats.policies.slice(0, 5).map((policy, idx) => (
                <div key={policy.policyId || idx} className="activity-item">
                  <span className="activity-time">{policy.statusString || 'Active'}</span>
                  <span className="activity-text">Policy #{policy.policyId} - {policy.productName || 'Insurance'}</span>
                </div>
              ))
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
    </div>
  );
};

export default Dashboard;