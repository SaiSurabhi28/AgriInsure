const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize provider
const provider = new ethers.JsonRpcProvider('http://localhost:8545');

// Load deployment info
const deploymentFile = path.join(__dirname, '..', 'deployments', 'localhost.json');
const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));

// Contract addresses
const CONTRACTS = {
  PolicyFactory: deploymentInfo.contracts.PolicyFactory.address,
  OracleAdapter: deploymentInfo.contracts.OracleAdapter.address,
  Treasury: deploymentInfo.contracts.Treasury.address
};

console.log('📦 Contract Addresses:');
console.log('PolicyFactory:', CONTRACTS.PolicyFactory);
console.log('OracleAdapter:', CONTRACTS.OracleAdapter);
console.log('Treasury:', CONTRACTS.Treasury);

// Load contract ABIs
const policyFactoryAbi = require('../artifacts/contracts/PolicyFactory.sol/PolicyFactory.json').abi;
const oracleAdapterAbi = require('../artifacts/contracts/OracleAdapter.sol/OracleAdapter.json').abi;

// Initialize contracts
const policyFactory = new ethers.Contract(CONTRACTS.PolicyFactory, policyFactoryAbi, provider);
const oracleAdapter = new ethers.Contract(CONTRACTS.OracleAdapter, oracleAdapterAbi, provider);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    network: 'localhost',
    contracts: CONTRACTS
  });
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const productCount = await policyFactory.productCounter();
    const products = [];
    
    for (let i = 1; i <= productCount; i++) {
      try {
        const product = await policyFactory.getProduct(i);
        products.push({
          id: i,
          name: product.name,
          minDurationDays: Number(product.minDurationDays),
          maxDurationDays: Number(product.maxDurationDays),
          minThreshold: Number(product.minThreshold),
          maxThreshold: Number(product.maxThreshold),
          basePremiumWei: product.basePremiumWei.toString(),
          basePayoutWei: product.basePayoutWei.toString(),
          premiumBpsPerDay: Number(product.premiumBpsPerDay),
          isActive: product.isActive
        });
      } catch (err) {
        // Skip if product doesn't exist
      }
    }
    
    res.json({ products });
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Price a policy
app.post('/api/policies/price', async (req, res) => {
  try {
    const { productId, durationDays } = req.body;
    
    const [premium, payout] = await policyFactory.pricePolicy(productId, durationDays);
    
    res.json({
      premium: premium.toString(),
      payout: payout.toString(),
      premiumFormatted: ethers.formatEther(premium),
      payoutFormatted: ethers.formatEther(payout)
    });
  } catch (error) {
    console.error('Error pricing policy:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get policies for a holder
app.get('/api/policies/:holderAddress', async (req, res) => {
  try {
    const { holderAddress } = req.params;
    
    const policyIds = await policyFactory.getHolderPolicies(holderAddress);
    
    const policies = [];
    for (const policyId of policyIds) {
      try {
        const policy = await policyFactory.getPolicy(policyId);
        
        // Get product info
        const product = await policyFactory.getProduct(policy.productId);
        
        policies.push({
          policyId: policyId.toString(),
          holder: policy.holder,
          productId: policy.productId.toString(),
          productName: product.name,
          startTs: Number(policy.startTs),
          endTs: Number(policy.endTs),
          threshold: Number(policy.threshold),
          premiumPaid: policy.premiumPaid.toString(),
          payoutAmount: policy.payoutAmount.toString(),
          status: Number(policy.status), // 0=Active, 1=PaidOut, 2=Expired
          statusString: ['Active', 'PaidOut', 'Expired'][Number(policy.status)]
        });
      } catch (err) {
        console.error('Error getting policy:', err);
      }
    }
    
    res.json({ policies });
  } catch (error) {
    console.error('Error getting policies:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single policy
app.get('/api/policy/:policyId', async (req, res) => {
  try {
    const { policyId } = req.params;
    
    const policy = await policyFactory.getPolicy(policyId);
    const product = await policyFactory.getProduct(policy.productId);
    
    res.json({
      policyId: policyId.toString(),
      holder: policy.holder,
      productId: policy.productId.toString(),
      productName: product.name,
      startTs: Number(policy.startTs),
      endTs: Number(policy.endTs),
      threshold: Number(policy.threshold),
      premiumPaid: policy.premiumPaid.toString(),
      payoutAmount: policy.payoutAmount.toString(),
      status: Number(policy.status),
      statusString: ['Active', 'PaidOut', 'Expired'][Number(policy.status)]
    });
  } catch (error) {
    console.error('Error getting policy:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get latest oracle data
app.get('/api/oracle/latest', async (req, res) => {
  try {
    const latestRound = await oracleAdapter.getLatestRound();
    
    res.json({
      roundId: latestRound.roundId.toString(),
      value: latestRound.value.toString(),
      ts: latestRound.ts.toString()
    });
  } catch (error) {
    console.error('Error getting oracle data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate weather data for display
app.get('/api/oracle/weather', (req, res) => {
  try {
    // Simulate weather data
    const data = [];
    const now = Math.floor(Date.now() / 1000);
    
    for (let i = 0; i < 10; i++) {
      data.push({
        roundId: 100 + i,
        value: 5 + Math.random() * 15, // Random value between 5-20mm
        timestamp: now - (10 - i) * 3600, // Last 10 hours
        time: new Date((now - (10 - i) * 3600) * 1000).toISOString()
      });
    }
    
    res.json({ data });
  } catch (error) {
    console.error('Error generating weather data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📡 Connected to Hardhat node at http://localhost:8545\n`);
});

