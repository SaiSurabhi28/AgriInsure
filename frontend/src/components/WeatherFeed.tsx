import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

const WeatherFeed: React.FC = () => {
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/oracle/data');
        const data = await response.json();
        setWeatherData(data);
      } catch (error) {
        console.error('Error fetching weather data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeatherData();
    const interval = setInterval(fetchWeatherData, 10000); // Update every 10 seconds

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
      <h2>🌤️ Live Weather Feed</h2>
      
      <div className="weather-summary">
        <div className="weather-card">
          <h3>📊 Current Conditions</h3>
          <div className="weather-metrics">
            <div className="metric">
              <span className="metric-label">Rainfall</span>
              <span className="metric-value">{weatherData?.consensus?.rainfall?.toFixed(1) || '0.0'}mm</span>
            </div>
            <div className="metric">
              <span className="metric-label">Temperature</span>
              <span className="metric-value">{weatherData?.consensus?.temperature?.toFixed(1) || '0.0'}°C</span>
            </div>
            <div className="metric">
              <span className="metric-label">Soil Moisture</span>
              <span className="metric-value">{weatherData?.consensus?.soilMoisture?.toFixed(1) || '0.0'}%</span>
            </div>
          </div>
        </div>

        <div className="oracle-status">
          <h3>🔮 Oracle Network Status</h3>
          <div className="oracle-info">
            <div className="info-item">
              <span>Active Nodes:</span>
              <span>{weatherData?.activeNodes || 5}</span>
            </div>
            <div className="info-item">
              <span>Consensus Threshold:</span>
              <span>{weatherData?.consensusThreshold || 3}</span>
            </div>
            <div className="info-item">
              <span>Last Update:</span>
              <span>{new Date(weatherData?.timestamp || Date.now()).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="sensor-data">
        <h3>📡 Individual Sensor Readings</h3>
        <div className="sensors-grid">
          {weatherData?.sensors?.slice(0, 10).map((sensor: any, index: number) => (
            <div key={index} className="sensor-card">
              <div className="sensor-header">
                <span>Sensor #{index + 1}</span>
                <span className="farm-id">Farm {sensor.farmId}</span>
              </div>
              <div className="sensor-readings">
                <div className="reading">
                  <span>Rainfall:</span>
                  <span>{sensor.rainfall.toFixed(1)}mm</span>
                </div>
                <div className="reading">
                  <span>Temperature:</span>
                  <span>{sensor.temperature.toFixed(1)}°C</span>
                </div>
                <div className="reading">
                  <span>Soil:</span>
                  <span>{sensor.soilMoisture.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="weather-chart">
        <h3>📈 Weather Trends</h3>
        <div className="chart-placeholder">
          <p>Weather trend visualization would be displayed here</p>
          <p>📊 Chart showing rainfall patterns over time</p>
        </div>
      </div>
    </div>
  );
};

export default WeatherFeed;