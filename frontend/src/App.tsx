import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import Dashboard from './components/Dashboard';
import CreatePolicy from './components/CreatePolicy';
import MyPolicies from './components/MyPolicies';
import WeatherFeed from './components/WeatherFeed';

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
        </nav>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create-policy" element={<CreatePolicy />} />
            <Route path="/my-policies" element={<MyPolicies />} />
            <Route path="/weather" element={<WeatherFeed />} />
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