import React, { useState, useEffect } from 'react';

const WeatherFeed = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('unknown');
  const [error, setError] = useState(null);

  const fetchWeatherData = async () => {
    try {
      // Fetch from backend which now uses dataset files
      // Add cache-busting query parameter to force fresh data
      const response = await fetch(`http://localhost:3001/api/oracle/weather?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        setWeatherData(data);
        setDataSource(data.source || 'oracle');
        setError(null);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Backend not available');
      }
    } catch (error) {
      console.error('Error fetching weather data:', error);
      // Check if it's a rate limit error
      if (error.message.includes('Failed to fetch') || error.message.includes('429') || error.message.includes('Too many requests')) {
        setError('Backend rate limit reached. Please wait a moment or restart the backend server.');
      } else {
        setError(error.message || 'Failed to fetch weather data');
      }
      // Don't use random data - show error instead
      setWeatherData(null);
      setDataSource('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherData();
    // Update every 30 seconds (rate limit safe - backend allows 100 requests per 15 minutes)
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

      {/* Error message */}
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
          {weatherData?.data && weatherData.data.length > 0 ? (
            <div className="weather-metrics">
              <div className="metric">
                <span className="metric-label">Latest Round</span>
                <span className="metric-value">#{weatherData.data[weatherData.data.length - 1].roundId}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Rainfall Value</span>
                <span className="metric-value">{parseFloat(weatherData.data[weatherData.data.length - 1].value).toFixed(1)}mm</span>
              </div>
              <div className="metric">
                <span className="metric-label">Last Update</span>
                <span className="metric-value">{new Date(weatherData.data[weatherData.data.length - 1].timestamp * 1000).toLocaleTimeString()}</span>
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
              <span>{weatherData?.data?.length || 0}</span>
            </div>
            <div className="info-item">
              <span>Data Points:</span>
              <span>{weatherData?.data?.length || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="sensor-data">
        <h3>📡 Recent Oracle Rounds</h3>
        <div className="sensors-grid">
          {weatherData?.data?.slice(-10).map((round, index) => (
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
          {weatherData?.data && weatherData.data.length > 0 ? (
            <div className="trend-chart">
              {weatherData.data.map((round, index) => {
                const maxValue = Math.max(...weatherData.data.map(r => parseFloat(r.value)));
                const percentage = (parseFloat(round.value) / maxValue) * 100;
                return (
                  <div key={round.roundId} className="chart-bar">
                    <div 
                      className="bar-fill" 
                      style={{ height: `${percentage}%` }}
                      title={`Round ${round.roundId}: ${parseFloat(round.value).toFixed(1)}mm`}
                    >
                      <span className="bar-value">{parseFloat(round.value).toFixed(0)}mm</span>
                    </div>
                    <div className="bar-label">R{round.roundId}</div>
                  </div>
                );
              })}
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