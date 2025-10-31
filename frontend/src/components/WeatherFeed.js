import React, { useState, useEffect } from 'react';

const WeatherFeed = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [lastSevenRounds, setLastSevenRounds] = useState([]);
  const [historyRounds, setHistoryRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('unknown');
  const [error, setError] = useState(null);

  const fetchWeatherData = async () => {
    try {
      // Fetch from backend (cache-busted)
      const response = await fetch(`http://localhost:3001/api/oracle/weather?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        setWeatherData(data);
        const rounds = Array.isArray(data?.data) ? data.data : [];
        setDataSource(data.source || 'oracle');
        // Merge into history (dedupe by roundId)
        setHistoryRounds(prev => {
          const byId = new Map(prev.map(r => [r.roundId, r]));
          rounds.forEach(r => {
            if (r && r.roundId !== undefined) byId.set(r.roundId, r);
          });
          const merged = Array.from(byId.values()).sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
          const capped = merged.slice(Math.max(0, merged.length - 100));
          setLastSevenRounds(capped.slice(Math.max(0, capped.length - 7)));
          return capped;
        });
        setError(null);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Backend not available');
      }
    } catch (error) {
      console.error('Error fetching weather data:', error);
      if (error.message.includes('Failed to fetch') || error.message.includes('429') || error.message.includes('Too many requests')) {
        setError('Backend rate limit reached. Please wait a moment or restart the backend server.');
      } else {
        setError(error.message || 'Failed to fetch weather data');
      }
      setWeatherData(null);
      setDataSource('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherData();
    const interval = setInterval(fetchWeatherData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="weather-feed">
        <h2>🌤️ Live Weather Feed</h2>
        <div className="loading">Loading weather data...</div>
      </div>
    );
  }

  const latestRound = historyRounds.length > 0 ? historyRounds[historyRounds.length - 1] : null;
  const recentTen = historyRounds.slice(Math.max(0, historyRounds.length - 10));

  return (
    <div className="weather-feed">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>🌤️ Live Weather Feed</h2>
        <button 
          onClick={() => { setLoading(true); fetchWeatherData(); }}
          style={{
            background: '#2196F3',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          disabled={loading}
        >
          {loading ? '⏳ Refreshing...' : '🔄 Refresh Data'}
        </button>
      </div>

      {error && (
        <div style={{ 
          padding: '12px', 
          marginBottom: '15px', 
          borderRadius: '4px',
          backgroundColor: '#ffebee',
          color: '#c62828'
        }}>
          ⚠️ Error loading weather data: {error}
        </div>
      )}
      
      <div className="weather-summary">
        <div className="weather-card">
          <h3>📊 Latest Oracle Data</h3>
          {latestRound ? (
            <div className="weather-metrics">
              <div className="metric">
                <span className="metric-label">Latest Round</span>
                <span className="metric-value">#{latestRound.roundId}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Rainfall Value</span>
                <span className="metric-value">{parseFloat(latestRound.value).toFixed(1)}mm</span>
              </div>
              <div className="metric">
                <span className="metric-label">Last Update</span>
                <span className="metric-value">{new Date(latestRound.timestamp * 1000).toLocaleTimeString()}</span>
              </div>
            </div>
          ) : (
            <p>No weather data available</p>
          )}
        </div>

        <div className="oracle-status">
          <h3>🔮 Oracle Rounds</h3>
          <div className="oracle-info">
            <div className="info-item">
              <span>Total Rounds:</span>
              <span>{historyRounds.length}</span>
            </div>
            <div className="info-item">
              <span>Data Points:</span>
              <span>{historyRounds.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="sensor-data">
        <h3>📡 Recent Oracle Rounds</h3>
        <div className="sensors-grid">
          {recentTen.map((round) => (
            <div key={round.roundId} className="sensor-card">
              <div className="sensor-header">
                <span>Round #{round.roundId}</span>
                <span className="farm-id">{new Date(round.timestamp * 1000).toLocaleString()}</span>
              </div>
              <div className="sensor-readings">
                <div className="reading">
                  <span>Value:</span>
                  <span>{parseFloat(round.value).toFixed(1)}mm</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="weather-chart">
        <h3>📈 Weather Trends (Rainfall Over Time)</h3>
        <div className="chart-container">
          {lastSevenRounds.length > 0 ? (
            <div className="trend-chart">
              {(() => {
                const values = lastSevenRounds.map(r => parseFloat(r.value));
                const maxValue = Math.max(1, ...values);
                return lastSevenRounds.map((r) => {
                  const val = parseFloat(r.value) || 0;
                  const percentage = (val / maxValue) * 100;
                  return (
                    <div key={r.roundId} className="chart-bar">
                      <div 
                        className="bar-fill" 
                        style={{ height: `${percentage}%` }}
                        title={`Round ${r.roundId}: ${val.toFixed(1)}mm`}
                      >
                        <span className="bar-value">{val.toFixed(0)}mm</span>
                      </div>
                      <div className="bar-label">R{r.roundId}</div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <p>No data available for chart</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeatherFeed;