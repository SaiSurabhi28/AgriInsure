import React from 'react';
import { useWeb3 } from './hooks/useWeb3';
import { useApi } from './hooks/useApi';

const Dashboard: React.FC = () => {
  const { account, connectWallet, isConnected } = useWeb3();
  const { data: policies, loading } = useApi('/api/policies');

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
          </div>
        )}
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Active Policies</h3>
          <p className="stat-number">{loading ? '...' : policies?.length || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Total Premium</h3>
          <p className="stat-number">0.0 ETH</p>
        </div>
        <div className="stat-card">
          <h3>Payouts Made</h3>
          <p className="stat-number">0</p>
        </div>
        <div className="stat-card">
          <h3>Oracle Nodes</h3>
          <p className="stat-number">5</p>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="recent-activity">
          <h3>Recent Activity</h3>
          <div className="activity-list">
            <div className="activity-item">
              <span className="activity-time">Just now</span>
              <span className="activity-text">System initialized successfully</span>
            </div>
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