const express = require('express');
const router = express.Router();
const blockchainService = require('../services/blockchainService');
const IndexCalculator = require('../services/indexCalculator');
const LocationWeatherService = require('../services/locationWeatherService');
const datasetWeatherService = require('../services/datasetWeatherService');

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

// Get location-based recommendations (MUST BE BEFORE /:policyId routes)
router.get('/locations/all', (req, res) => {
  const locationService = new LocationWeatherService();
  const regions = locationService.getAllRegions();
  
  res.json({
    success: true,
    regions: regions,
    total: regions.length
  });
});

// Get recommendations for a specific location
router.get('/locations/:locationId/recommendations', async (req, res) => {
  try {
    const { locationId } = req.params;
    const { durationDays } = req.query;
    
    const locationService = new LocationWeatherService();
    const recommendations = await locationService.getLocationRecommendations(
      locationId,
      durationDays ? parseInt(durationDays) : 14
    );
    
    if (recommendations.success) {
      res.json(recommendations);
    } else {
      res.status(404).json(recommendations);
    }
  } catch (error) {
    console.error('Location recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get location recommendations',
      message: error.message
    });
  }
});

// Get recommended crops for a location
router.get('/locations/:locationId/crops', (req, res) => {
  try {
    const { locationId } = req.params;
    
    const locationService = new LocationWeatherService();
    const crops = locationService.getRecommendedCrops(locationId);
    
    res.json({
      success: true,
      locationId,
      recommendedCrops: crops
    });
  } catch (error) {
    console.error('Location crops error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommended crops',
      message: error.message
    });
  }
});

// Get count of expirable policies (MUST BE BEFORE /:policyId routes)
router.get('/expirable/count', async (req, res) => {
  try {
    const { startId = 1, endId = 1000 } = req.query;

    const result = await blockchainService.getExpirablePolicyCount(
      parseInt(startId),
      parseInt(endId)
    );
    
    res.json(result);
  } catch (error) {
    console.error('Get expirable count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get expirable policy count',
      message: error.message
    });
  }
});

// Check composite index for policy payout (Multi-Parameter) - MUST BE BEFORE /:policyId/status
router.get('/:policyId/composite-index', async (req, res) => {
  try {
    const { policyId } = req.params;

    if (!policyId || isNaN(policyId)) {
      return res.status(400).json({
        error: 'Invalid policy ID'
      });
    }

    // Get policy details from blockchain
    const policyStatus = await blockchainService.getPolicyStatus(policyId);
    
    // Pull latest weather metrics from historical dataset
    let latestWeather = datasetWeatherService.getCurrentWeatherSample();
    if (!latestWeather) {
      latestWeather = await datasetWeatherService.getNextWeatherSample();
    }
    if (!latestWeather) {
      return res.status(503).json({
        error: 'Weather dataset is unavailable'
      });
    }

    const weatherData = {
      rainfall: latestWeather.rainfall ?? 0,
      temperature: latestWeather.temperature ?? 20,
      soilMoisture: typeof latestWeather.humidity === 'number'
        ? Math.max(0, Math.min(100, latestWeather.humidity))
        : 55,
      windSpeed: latestWeather.windSpeed ?? 0,
      humidity: latestWeather.humidity ?? null,
      timestamp: latestWeather.isoDate,
      source: 'dataset'
    };

    // Initialize calculator
    const calculator = new IndexCalculator();

    // Define policy-specific parameters (customize per crop/product)
    const policyParams = {
      expectedRainfall: 75, // mm - can be customized per policy
      weights: {
        rainfall: 0.40,
        temperature: 0.20,
        soil: 0.30,
        wind: 0.10
      },
      tempOptimalMin: 20, // Celsius - crop dependent
      tempOptimalMax: 28,
      tempThresholdMin: 15,
      tempThresholdMax: 35,
      optimalSoilMoisture: 60, // %
      criticalSoilMoisture: 40,
      windDamageThreshold: 25 // m/s
    };

    // Calculate composite index
    const indexResult = calculator.calculateCompositeIndex(weatherData, policyParams);

    // Check payout trigger (using 60 as default composite threshold)
    const payoutThreshold = Number(req.query.threshold || 60);
    const payoutDecision = calculator.checkPayoutTrigger(
      indexResult,
      payoutThreshold
    );

    res.json({
      success: true,
      policyId: policyId,
      payoutDecision: payoutDecision,
      compositeIndex: indexResult,
      currentWeather: weatherData,
      policyThreshold: payoutThreshold
    });

  } catch (error) {
    console.error('Composite index error:', error);
    res.status(500).json({
      error: 'Failed to calculate composite index',
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

    try {
      await blockchainService.expireDuePolicies();
    } catch (expireError) {
      console.warn('Auto-expire during farmer fetch failed:', expireError.message || expireError);
    }

    const policies = await blockchainService.getFarmerPolicies(farmerAddress);

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

// Manually expire a policy (after end time) so the premium stays with the treasury
router.post('/:policyId/expire', async (req, res) => {
  try {
    const { policyId } = req.params;

    if (!policyId || isNaN(policyId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid policy ID'
      });
    }

    const result = await blockchainService.expirePolicy(Number(policyId));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Expire policy error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to expire policy',
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

// Get all policies with details (for admin/overview)
router.get('/all', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    // Fetch all PolicyCreated events
    const events = await blockchainService.getContractEvents(
      'PolicyFactory',
      'PolicyCreated',
      0,
      'latest'
    );

    // Extract unique policyIds in creation order
    const seen = new Set();
    const policyIds = [];
    for (const ev of events) {
      const id = ev.args?.policyId?.toString?.() || ev.args?.policyId;
      if (id && !seen.has(id)) {
        seen.add(id);
        policyIds.push(id);
      }
    }

    // Fetch detailed status for each policyId
    const details = [];
    for (const id of policyIds) {
      try {
        const status = await blockchainService.getPolicyStatus(id);
        details.push(status);
      } catch (e) {
        // Skip policies that cannot be fetched
      }
    }

    // Apply pagination on detailed list
    const start = Math.max(0, parseInt(offset) || 0);
    const end = start + (parseInt(limit) || 100);
    const page = details.slice(start, end);

    res.json({
      success: true,
      data: page,
      pagination: {
        total: details.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('All policies (detailed) error:', error);
    res.status(500).json({
      error: 'Failed to get all policies',
      message: error.message
    });
  }
});

// Get all policies (for admin)
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

// Expire a single policy
router.post('/:policyId/expire', async (req, res) => {
  try {
    const { policyId } = req.params;

    if (!policyId || isNaN(policyId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid policy ID'
      });
    }

    const result = await blockchainService.expirePolicy(parseInt(policyId));
    
    res.json({
      success: true,
      message: 'Policy expired successfully',
      data: result
    });
  } catch (error) {
    console.error('Policy expiration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to expire policy',
      message: error.message
    });
  }
});

// Batch expire policies
router.post('/batch-expire', async (req, res) => {
  try {
    const { policyIds } = req.body;

    if (!Array.isArray(policyIds) || policyIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid policy IDs array'
      });
    }

    const result = await blockchainService.batchExpirePolicies(policyIds);
    
    res.json({
      success: true,
      message: 'Policies expired successfully',
      data: result
    });
  } catch (error) {
    console.error('Batch expiration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to expire policies',
      message: error.message
    });
  }
});

module.exports = router;







