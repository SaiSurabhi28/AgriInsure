const express = require('express');
const router = express.Router();
const blockchainService = require('../services/blockchainService');

// Get farmer dashboard data
router.get('/:farmerAddress/dashboard', async (req, res) => {
  try {
    const { farmerAddress } = req.params;

    if (!farmerAddress) {
      return res.status(400).json({
        error: 'Farmer address is required'
      });
    }

    // Get farmer's policies
    const policies = await blockchainService.getFarmerPolicies(farmerAddress);

    // Calculate dashboard statistics
    const stats = {
      totalPolicies: policies.length,
      activePolicies: policies.filter(p => p.isActive).length,
      completedPolicies: policies.filter(p => p.payoutExecuted).length,
      totalPayouts: policies.filter(p => p.payoutExecuted).length,
      averageThreshold: policies.length > 0 
        ? policies.reduce((sum, p) => sum + (p.threshold || 0), 0) / policies.length 
        : 0
    };

    res.json({
      success: true,
      data: {
        farmer: farmerAddress,
        policies,
        stats
      }
    });
  } catch (error) {
    console.error('Farmer dashboard error:', error);
    res.status(500).json({
      error: 'Failed to get farmer dashboard',
      message: error.message
    });
  }
});

// Get farmer's policy history
router.get('/:farmerAddress/history', async (req, res) => {
  try {
    const { farmerAddress } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    if (!farmerAddress) {
      return res.status(400).json({
        error: 'Farmer address is required'
      });
    }

    // Get policy creation events for this farmer
    const events = await blockchainService.getContractEvents(
      'PolicyFactory',
      'PolicyCreated',
      0,
      'latest'
    );

    // Filter events for this farmer
    const farmerEvents = events.filter(event => 
      event.args.farmer.toLowerCase() === farmerAddress.toLowerCase()
    );

    // Apply pagination
    const paginatedEvents = farmerEvents.slice(offset, offset + limit);

    res.json({
      success: true,
      data: paginatedEvents,
      pagination: {
        total: farmerEvents.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Farmer history error:', error);
    res.status(500).json({
      error: 'Failed to get farmer history',
      message: error.message
    });
  }
});

// Get farmer's payout history
router.get('/:farmerAddress/payouts', async (req, res) => {
  try {
    const { farmerAddress } = req.params;

    if (!farmerAddress) {
      return res.status(400).json({
        error: 'Farmer address is required'
      });
    }

    // Get payout events for this farmer
    const events = await blockchainService.getContractEvents(
      'PayoutEscrow',
      'PayoutExecuted',
      0,
      'latest'
    );

    // Filter events for this farmer
    const payoutEvents = events.filter(event => 
      event.args.farmer.toLowerCase() === farmerAddress.toLowerCase()
    );

    res.json({
      success: true,
      data: payoutEvents
    });
  } catch (error) {
    console.error('Farmer payouts error:', error);
    res.status(500).json({
      error: 'Failed to get farmer payouts',
      message: error.message
    });
  }
});

// Get farmer's current weather conditions
router.get('/:farmerAddress/weather', async (req, res) => {
  try {
    const { farmerAddress } = req.params;

    if (!farmerAddress) {
      return res.status(400).json({
        error: 'Farmer address is required'
      });
    }

    // Get farmer's active policies
    const policies = await blockchainService.getFarmerPolicies(farmerAddress);
    const activePolicies = policies.filter(p => p.isActive);

    // Get weather data for each active policy
    const weatherData = [];
    for (const policy of activePolicies) {
      try {
        const status = await blockchainService.getPolicyStatus(policy.policyId);
        weatherData.push({
          policyId: policy.policyId,
          currentRainfall: status.currentRainfall,
          threshold: policy.threshold,
          payoutEligible: status.payoutEligible
        });
      } catch (error) {
        console.error(`Failed to get weather for policy ${policy.policyId}:`, error);
      }
    }

    res.json({
      success: true,
      data: {
        farmer: farmerAddress,
        activePolicies: activePolicies.length,
        weatherData
      }
    });
  } catch (error) {
    console.error('Farmer weather error:', error);
    res.status(500).json({
      error: 'Failed to get farmer weather data',
      message: error.message
    });
  }
});

// Get farmer's risk assessment
router.get('/:farmerAddress/risk', async (req, res) => {
  try {
    const { farmerAddress } = req.params;

    if (!farmerAddress) {
      return res.status(400).json({
        error: 'Farmer address is required'
      });
    }

    // Get farmer's policies
    const policies = await blockchainService.getFarmerPolicies(farmerAddress);

    // Calculate risk metrics
    const riskMetrics = {
      totalPolicies: policies.length,
      payoutRate: policies.length > 0 
        ? policies.filter(p => p.payoutExecuted).length / policies.length 
        : 0,
      averageThreshold: policies.length > 0 
        ? policies.reduce((sum, p) => sum + (p.threshold || 0), 0) / policies.length 
        : 0,
      riskLevel: 'medium' // This would be calculated based on historical data
    };

    // Determine risk level based on payout rate
    if (riskMetrics.payoutRate > 0.7) {
      riskMetrics.riskLevel = 'high';
    } else if (riskMetrics.payoutRate < 0.3) {
      riskMetrics.riskLevel = 'low';
    }

    res.json({
      success: true,
      data: {
        farmer: farmerAddress,
        riskMetrics
      }
    });
  } catch (error) {
    console.error('Farmer risk assessment error:', error);
    res.status(500).json({
      error: 'Failed to get farmer risk assessment',
      message: error.message
    });
  }
});

module.exports = router;







