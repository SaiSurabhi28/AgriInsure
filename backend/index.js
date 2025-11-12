const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const http = require('http');
const WebSocket = require('ws');
require('dotenv').config();

const blockchainService = require('./services/blockchainService');
const NotificationService = require('./services/notificationService');
const policyRoutes = require('./routes/policyRoutes');
const oracleRoutes = require('./routes/oracleRoutes');
const farmerRoutes = require('./routes/farmerRoutes');
const cropRoutes = require('./routes/cropRoutes');

const app = express();
const PORT = process.env.PORT || 3001;
const AUTO_EXPIRE_ENABLED = (process.env.AUTO_EXPIRE_ENABLED || 'true') !== 'false';
const AUTO_EXPIRE_INTERVAL_MS = parseInt(process.env.AUTO_EXPIRE_INTERVAL_MS || '15000', 10);
const ORACLE_FEED_ENABLED = (process.env.ORACLE_DATASET_FEED_ENABLED || 'true') !== 'false';
const ORACLE_FEED_INTERVAL_MS = parseInt(process.env.ORACLE_DATASET_FEED_INTERVAL_MS || '10000', 10);
let autoExpireTimer = null;
let oracleFeedTimer = null;

// Create HTTP server for WebSocket
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocket.Server({ server });

// Initialize notification service
const notificationService = new NotificationService();

// Security middleware
app.use(helmet());
app.use(compression());

const enableRateLimit = process.env.ENABLE_RATE_LIMIT === 'true' || process.env.NODE_ENV === 'production';

if (enableRateLimit) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
  });

  app.use('/api/', (req, res, next) => {
    const originalUrl = req.originalUrl || '';
    const path = req.path || req.url || '';
    if (
      originalUrl.includes('/api/oracle/weather') ||
      path.startsWith('/oracle/weather')
    ) {
      return next();
    }
    return limiter(req, res, next);
  });
} else {
  console.log('⚙️  Rate limiting disabled (development mode)');
}

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3021',
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
      name: "Demo - Micro Premium Insurance",
      minDurationDays: 7,
      maxDurationDays: 30,
      minThreshold: 10,
      maxThreshold: 100,
      basePremiumWei: "10000000000", // 0.00000001 ETH
      basePayoutWei: "40000000000",  // 0.00000004 ETH
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

app.get('/api/treasury/ledger', async (req, res) => {
  try {
    const ledger = await blockchainService.getTreasuryLedger();
    res.json({
      success: true,
      ...ledger
    });
  } catch (error) {
    console.error('Treasury ledger error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load treasury ledger',
      message: error.message
    });
  }
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
app.use('/api/crops', cropRoutes);

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

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log('🔌 New WebSocket connection');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'subscribe' && data.farmerAddress) {
        // Register farmer for notifications
        notificationService.registerConnection(data.farmerAddress, ws);
        ws.send(JSON.stringify({
          type: 'subscribed',
          farmerAddress: data.farmerAddress,
          message: 'Successfully subscribed to notifications'
        }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    console.log('🔌 WebSocket connection closed');
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server (with WebSocket support)
server.listen(PORT, () => {
  console.log(`🚀 AgriInsure Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket server ready for real-time notifications`);

  if (AUTO_EXPIRE_ENABLED && AUTO_EXPIRE_INTERVAL_MS > 0) {
    if (autoExpireTimer) {
      clearInterval(autoExpireTimer);
    }
    autoExpireTimer = setInterval(async () => {
      try {
        await blockchainService.expireDuePolicies();
      } catch (error) {
        console.error('Auto-expire job failed:', error.message || error);
      }
    }, AUTO_EXPIRE_INTERVAL_MS);

    console.log(`🕒 Auto-expire scheduler active (every ${AUTO_EXPIRE_INTERVAL_MS / 1000}s)`);
  } else {
    console.log('🕒 Auto-expire scheduler disabled');
  }

  if (ORACLE_FEED_ENABLED && ORACLE_FEED_INTERVAL_MS > 0) {
    if (oracleFeedTimer) {
      clearInterval(oracleFeedTimer);
    }
    oracleFeedTimer = setInterval(async () => {
      try {
        await blockchainService.seedOracleFromDataset();
      } catch (error) {
        console.error('Oracle dataset feed failed:', error.message || error);
      }
    }, ORACLE_FEED_INTERVAL_MS);

    console.log(`🌧️ Oracle dataset feed active (every ${ORACLE_FEED_INTERVAL_MS / 1000}s)`);
  } else {
    console.log('🌧️ Oracle dataset feed disabled');
  }
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





