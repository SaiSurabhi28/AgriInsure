import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import Dashboard from './components/Dashboard.js';
import CreatePolicy from './components/CreatePolicy.js';
import MyPolicies from './components/MyPolicies.js';
import WeatherFeed from './components/WeatherFeed.js';
import OracleReputation from './components/OracleReputation.js';
import CropRecommendation from './components/CropRecommendation.js';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="app-header">
          <h1>🌾 AgriInsure</h1>
          <p>Blockchain-Enabled Parametric Micro-Insurance for Farmers</p>
        </header>
        
        <nav className="app-nav">
          <a href="/">Dashboard</a>
          <a href="/create-policy">Create Policy</a>
          <a href="/my-policies">My Policies</a>
          <a href="/weather">Weather Feed</a>
          <a href="/oracle">Oracle Reputation</a>
          <a href="/crop-recommendation">Crop Recommendation</a>
        </nav>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create-policy" element={<CreatePolicy />} />
            <Route path="/my-policies" element={<MyPolicies />} />
            <Route path="/weather" element={<WeatherFeed />} />
            <Route path="/oracle" element={<OracleReputation />} />
            <Route path="/crop-recommendation" element={<CropRecommendation />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <p>&copy; 2025 AgriInsure. Built with React, Solidity, and Web3.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;