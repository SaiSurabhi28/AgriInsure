const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const blockchainService = require('./services/blockchainService');
const oracleService = require('./services/oracleService');
const policyRoutes = require('./routes/policyRoutes');
const oracleRoutes = require('./routes/oracleRoutes');
const farmerRoutes = require('./routes/farmerRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting (exclude weather endpoint as it's a data feed)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Apply rate limiting conditionally - skip for weather endpoint
app.use('/api/', (req, res, next) => {
  const path = req.path || req.url;
  const fullUrl = req.originalUrl || req.url;
  // Skip rate limiting for weather endpoint (data feed needs frequent polling)
  // Check both path and fullUrl to handle different route matching scenarios
  if (path.includes('/oracle/weather') || fullUrl.includes('/oracle/weather')) {
    console.log('🌤️ Skipping rate limit for weather endpoint');
    return next();
  }
  return limiter(req, res, next);
});

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Get all products (must be before /api/policies route)
app.get('/api/products', async (req, res) => {
  // Return hardcoded products that match what we deployed
  // TODO: Fix blockchain service to properly read from contract
  const products = [
    {
      id: 1,
      name: "Demo - Free Insurance",
      minDurationDays: 7,
      maxDurationDays: 30,
      minThreshold: 10,
      maxThreshold: 100,
      basePremiumWei: "0",
      basePayoutWei: "0",
      premiumBpsPerDay: 0,
      isActive: true
    },
    {
      id: 2,
      name: "Corn Rain Insurance",
      minDurationDays: 7,
      maxDurationDays: 30,
      minThreshold: 20,
      maxThreshold: 100,
      basePremiumWei: "1000000000000000",
      basePayoutWei: "5000000000000000",
      premiumBpsPerDay: 50,
      isActive: true
    },
    {
      id: 3,
      name: "Low Threshold Rain Insurance",
      minDurationDays: 7,
      maxDurationDays: 90,
      minThreshold: 1,
      maxThreshold: 100,
      basePremiumWei: "500000000000000",
      basePayoutWei: "2000000000000000",
      premiumBpsPerDay: 30,
      isActive: true
    }
  ];
  console.log('Returning products (hardcoded for now)');
    res.json({ products });
});

// Price a policy (must be before /api/policies route)
app.post('/api/policies/price', async (req, res) => {
  try {
    const { productId, durationDays } = req.body;
    
    if (!productId || !durationDays) {
      return res.status(400).json({ error: 'productId and durationDays are required' });
    }
    
    const { premiumWei, payoutWei, premiumFormatted, payoutFormatted } = await blockchainService.pricePolicy(productId, durationDays);
    
    res.json({
      premium: premiumWei.toString(),
      payout: payoutWei.toString(),
      premiumFormatted,
      payoutFormatted
    });
  } catch (error) {
    console.error('Error pricing policy:', error);
    res.status(500).json({ error: error.message });
  }
});

// API routes
app.use('/api/policies', policyRoutes);
app.use('/api/oracle', oracleRoutes);
app.use('/api/farmers', farmerRoutes);

// Blockchain status endpoint
app.get('/api/blockchain/status', async (req, res) => {
  try {
    const status = await blockchainService.getBlockchainStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Contract addresses endpoint
app.get('/api/contracts/addresses', (req, res) => {
  try {
    const addresses = blockchainService.getContractAddresses();
    res.json(addresses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AgriInsure Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

module.exports = app;





