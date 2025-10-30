const express = require('express');
const router = express.Router();
const blockchainService = require('../services/blockchainService');

// Create a new insurance policy
router.post('/create', async (req, res) => {
  try {
    const { farmerAddress, premium, threshold, duration } = req.body;

    // Validate input
    if (!farmerAddress || !premium || !threshold || !duration) {
      return res.status(400).json({
        error: 'Missing required fields: farmerAddress, premium, threshold, duration'
      });
    }

    if (premium <= 0 || threshold <= 0 || duration <= 0) {
      return res.status(400).json({
        error: 'Premium, threshold, and duration must be positive values'
      });
    }

    const result = await blockchainService.createPolicy(
      farmerAddress,
      premium,
      threshold,
      duration
    );

    res.json({
      success: true,
      message: 'Policy created successfully',
      data: result
    });
  } catch (error) {
    console.error('Policy creation error:', error);
    res.status(500).json({
      error: 'Failed to create policy',
      message: error.message
    });
  }
});

// Get policy status
router.get('/:policyId/status', async (req, res) => {
  try {
    const { policyId } = req.params;

    if (!policyId || isNaN(policyId)) {
      return res.status(400).json({
        error: 'Invalid policy ID'
      });
    }

    const status = await blockchainService.getPolicyStatus(policyId);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Policy status error:', error);
    res.status(500).json({
      error: 'Failed to get policy status',
      message: error.message
    });
  }
});

// Check if farmer has active policy (must be before /farmer/:farmerAddress route)
router.get('/farmer/:farmerAddress/active', async (req, res) => {
  try {
    const { farmerAddress } = req.params;

    if (!farmerAddress) {
      return res.status(400).json({
        error: 'Farmer address is required'
      });
    }

    const hasActive = await blockchainService.hasActivePolicy(farmerAddress);
    const activePolicy = hasActive ? await blockchainService.getActivePolicy(farmerAddress) : null;

    res.json({
      success: true,
      hasActivePolicy: hasActive,
      activePolicy: activePolicy
    });
  } catch (error) {
    console.error('Check active policy error:', error);
    res.status(500).json({
      error: 'Failed to check active policy',
      message: error.message
    });
  }
});

// Get farmer's policies
router.get('/farmer/:farmerAddress', async (req, res) => {
  try {
    const { farmerAddress } = req.params;

    if (!farmerAddress) {
      return res.status(400).json({
        error: 'Farmer address is required'
      });
    }

    console.log('📥 GET /farmer/:farmerAddress called with:', farmerAddress);
    const policies = await blockchainService.getFarmerPolicies(farmerAddress);
    console.log('📤 Returning policies:', policies.length);

    res.json({
      success: true,
      data: policies
    });
  } catch (error) {
    console.error('Farmer policies error:', error);
    res.status(500).json({
      error: 'Failed to get farmer policies',
      message: error.message
    });
  }
});

// Execute payout for a policy
router.post('/:policyId/payout', async (req, res) => {
  try {
    const { policyId } = req.params;
    const { farmerAddress, payoutAmount } = req.body;

    if (!policyId || !farmerAddress || !payoutAmount) {
      return res.status(400).json({
        error: 'Missing required fields: policyId, farmerAddress, payoutAmount'
      });
    }

    const result = await blockchainService.executePayout(
      policyId,
      farmerAddress,
      payoutAmount
    );

    res.json({
      success: true,
      message: 'Payout executed successfully',
      data: result
    });
  } catch (error) {
    console.error('Payout execution error:', error);
    res.status(500).json({
      error: 'Failed to execute payout',
      message: error.message
    });
  }
});

// Get policy events
router.get('/:policyId/events', async (req, res) => {
  try {
    const { policyId } = req.params;
    const { fromBlock = 0, toBlock = 'latest' } = req.query;

    const events = await blockchainService.getContractEvents(
      'PolicyFactory',
      'PolicyCreated',
      fromBlock,
      toBlock
    );

    // Filter events for this specific policy
    const policyEvents = events.filter(event => 
      event.args.policyId.toString() === policyId
    );

    res.json({
      success: true,
      data: policyEvents
    });
  } catch (error) {
    console.error('Policy events error:', error);
    res.status(500).json({
      error: 'Failed to get policy events',
      message: error.message
    });
  }
});

// Get all policies from blockchain (all active policies regardless of owner)
router.get('/all', async (req, res) => {
  try {
    console.log('📥 GET /all called - fetching all policies');
    const policies = await blockchainService.getAllPolicies();
    console.log('📤 Returning all policies:', policies.length);

    res.json({
      success: true,
      data: policies
    });
  } catch (error) {
    console.error('Get all policies error:', error);
    res.status(500).json({
      error: 'Failed to get all policies',
      message: error.message
    });
  }
});

// Get all policies (for admin - legacy endpoint)
router.get('/', async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    // Get all policy creation events
    const events = await blockchainService.getContractEvents(
      'PolicyFactory',
      'PolicyCreated',
      0,
      'latest'
    );

    // Apply pagination
    const paginatedEvents = events.slice(offset, offset + limit);

    res.json({
      success: true,
      data: paginatedEvents,
      pagination: {
        total: events.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('All policies error:', error);
    res.status(500).json({
      error: 'Failed to get policies',
      message: error.message
    });
  }
});

module.exports = router;







