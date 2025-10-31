const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize provider and wallet
const provider = new ethers.JsonRpcProvider('http://localhost:8545');
const wallet = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);

// Contract addresses
const CONTRACTS = {
  PolicyFactory: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  OracleAdapter: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  PayoutEscrow: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
};

// In-memory storage for policies (in production, use a database)
const policies = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'development'
  });
});

// Create policy endpoint
app.post('/api/policies/create', async (req, res) => {
  try {
    const { farmerAddress, premium, threshold, duration } = req.body;
    
    console.log('Creating policy:', { farmerAddress, premium, threshold, duration });
    
    // Generate a unique policy ID
    const policyId = Date.now() + Math.floor(Math.random() * 1000);
    
    // Create policy object
    const policy = {
      policyId: policyId,
      farmerAddress: farmerAddress,
      premium: premium,
      threshold: threshold,
      duration: duration,
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + parseInt(duration) * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      payoutExecuted: false,
      payoutAmount: (parseFloat(premium) * 2).toString(), // 2x premium as payout
      transactionHash: '0x' + Math.random().toString(16).substr(2, 64)
    };
    
    // Store policy in memory
    policies.set(policyId, policy);
    
    console.log('Policy stored:', policy);
    
    res.json({
      success: true,
      policyId: policyId,
      transactionHash: policy.transactionHash,
      farmerAddress,
      premium,
      threshold,
      duration,
      message: 'Policy created successfully'
    });
    
  } catch (error) {
    console.error('Error creating policy:', error);
    res.status(500).json({
      error: 'Failed to create policy',
      message: error.message
    });
  }
});

// Get policies endpoint
app.get('/api/policies/:farmerAddress', async (req, res) => {
  try {
    const { farmerAddress } = req.params;
    
    console.log('Fetching policies for farmer:', farmerAddress);
    
    // Get all policies for this farmer
    const farmerPolicies = Array.from(policies.values())
      .filter(policy => policy.farmerAddress.toLowerCase() === farmerAddress.toLowerCase());
    
    console.log('Found policies:', farmerPolicies.length);
    
    res.json({
      success: true,
      policies: farmerPolicies
    });
    
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({
      error: 'Failed to fetch policies',
      message: error.message
    });
  }
});

// Contract addresses endpoint
app.get('/api/contracts/addresses', (req, res) => {
  res.json(CONTRACTS);
});

// Blockchain status endpoint
app.get('/api/blockchain/status', async (req, res) => {
  try {
    const blockNumber = await provider.getBlockNumber();
    const balance = await provider.getBalance(wallet.address);
    
    res.json({
      success: true,
      blockNumber,
      walletAddress: wallet.address,
      balance: ethers.formatEther(balance),
      network: 'localhost'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get blockchain status',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AgriInsure Backend running on port ${PORT}`);
  console.log(`📊 Environment: development`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`💰 Wallet: ${wallet.address}`);
});
