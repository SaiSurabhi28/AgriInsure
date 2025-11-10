const express = require('express');
const router = express.Router();
const blockchainService = require('../services/blockchainService');
const datasetWeatherService = require('../services/datasetWeatherService');

// Dataset-only mode: streaming ingestion is disabled
router.post('/data', (req, res) => {
  res.status(410).json({
    success: false,
    error: 'Simulation disabled in dataset-only mode',
    message: 'This deployment relies entirely on historical datasets and does not accept live sensor payloads.'
  });
});

// Consensus history derived from dataset averages
router.get('/consensus', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const consensus = await datasetWeatherService.getConsensus(limit);

    res.json({
      success: true,
      data: consensus,
      source: 'dataset'
    });
  } catch (error) {
    console.error('Consensus history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to build consensus from dataset',
      message: error.message
    });
  }
});

// Station list derived from dataset columns
router.get('/nodes', async (req, res) => {
  try {
    const [nodes, dataset] = await Promise.all([
      datasetWeatherService.getStationStats(),
      datasetWeatherService.getDatasetInfo()
    ]);
    const activeNodes = nodes.filter(node => node.isActive).length;

    res.json({
      success: true,
      data: nodes,
      totalNodes: nodes.length,
      activeNodes,
      dataset
    });
  } catch (error) {
    console.error('Oracle nodes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load station statistics',
      message: error.message
    });
  }
});

// Health indicator for dataset-backed oracle
router.get('/health', async (req, res) => {
  try {
    const info = await datasetWeatherService.getDatasetInfo();
    res.json({
      success: true,
      data: {
        status: 'dataset_only',
        dataset: info,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Oracle health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read dataset metadata',
      message: error.message
    });
  }
});

// Simulation endpoints are disabled
router.post('/simulate', (req, res) => {
  res.status(410).json({
    success: false,
    error: 'Simulation disabled in dataset-only mode',
    message: 'Historical datasets are used instead of synthetic oracle events.'
  });
});

// Update blockchain with dataset-derived weather sample
router.post('/update-blockchain', async (req, res) => {
  try {
    const { policyId, rainfall, temperature, soilMoisture } = req.body;

    if (!policyId || rainfall === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Policy ID and rainfall are required'
      });
    }

    const result = await blockchainService.updateOracleData(
      policyId,
      rainfall,
      temperature ?? 20,
      soilMoisture ?? 60
    );

    res.json({
      success: true,
      message: 'Blockchain updated with dataset weather sample',
      data: result
    });
  } catch (error) {
    console.error('Blockchain update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update blockchain',
      message: error.message
    });
  }
});

// High-level statistics sourced from dataset
router.get('/stats', async (req, res) => {
  try {
    const [consensus, nodes, info] = await Promise.all([
      datasetWeatherService.getConsensus(50),
      datasetWeatherService.getStationStats(),
      datasetWeatherService.getDatasetInfo()
    ]);

    const activeNodes = nodes.filter(node => node.isActive).length;

    res.json({
      success: true,
      data: {
        totalConsensusEntries: consensus.length,
        activeNodes,
        totalNodes: nodes.length,
        oracleHealth: 'dataset_only',
        dataset: info,
        lastConsensus: consensus.length ? consensus[consensus.length - 1] : null
      }
    });
  } catch (error) {
    console.error('Oracle stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to build oracle statistics',
      message: error.message
    });
  }
});

// Weather feed built from historical dataset
router.get('/weather', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 365;
    const rounds = await datasetWeatherService.getRainfallRounds(limit);
    const info = await datasetWeatherService.getDatasetInfo();

    res.json({
      success: true,
      data: rounds,
      source: 'dataset',
      dataset: info,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Weather data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load weather data from dataset',
      message: error.message
    });
  }
});

router.get('/weather/live', async (req, res) => {
  try {
    const sample = await datasetWeatherService.getRandomWeatherSample();
    if (!sample) {
      return res.status(404).json({
        success: false,
        error: 'No weather samples available'
      });
    }

    res.json({
      success: true,
      data: sample,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Live weather error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get live weather sample',
      message: error.message
    });
  }
});

router.get('/weather/kaggle', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 365;
    const rounds = await datasetWeatherService.getRainfallRounds(limit);
    const info = await datasetWeatherService.getDatasetInfo();

    res.json({
      success: true,
      data: rounds,
      source: 'dataset',
      dataset: info,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Kaggle weather error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load Kaggle dataset',
      message: error.message
    });
  }
});

router.get('/health-detailed', async (req, res) => {
  try {
    const [nodes, info] = await Promise.all([
      datasetWeatherService.getStationStats(),
      datasetWeatherService.getDatasetInfo()
    ]);

    res.json({
      success: true,
      data: {
        status: 'dataset_only',
        dataset: info,
        nodes: {
          total: nodes.length,
          active: nodes.filter(node => node.isActive).length
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Detailed health error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to build detailed health information',
      message: error.message
    });
  }
});

router.get('/reputation', async (req, res) => {
  try {
    const [nodes, dataset] = await Promise.all([
      datasetWeatherService.getStationStats(),
      datasetWeatherService.getDatasetInfo()
    ]);
    const totalNodes = nodes.length;
    const activeNodes = nodes.filter(node => node.isActive).length;
    const suspendedNodes = totalNodes - activeNodes;

    const averageReputation = totalNodes
      ? nodes.reduce((sum, node) => sum + node.reputation, 0) / totalNodes
      : 0;

    const averageAccuracy = totalNodes
      ? nodes.reduce((sum, node) => sum + node.accuracy, 0) / totalNodes
      : 0;

    const averageCoverage = totalNodes
      ? nodes.reduce((sum, node) => sum + node.coveragePercent, 0) / totalNodes
      : 0;

    const averageDeviation = totalNodes
      ? nodes.reduce((sum, node) => sum + node.averageDeviationMm, 0) / totalNodes
      : 0;

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      networkStats: {
        totalNodes,
        activeNodes,
        suspendedNodes,
        averageReputation,
        averageAccuracy,
        averageCoverage,
        averageDeviation,
        dataset
      },
      nodes
    });
  } catch (error) {
    console.error('Reputation stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to build reputation data from dataset',
      message: error.message
    });
  }
});

router.get('/reputation/:nodeId', async (req, res) => {
  try {
    const nodes = await datasetWeatherService.getStationStats();
    const node = nodes.find(n => n.nodeId === req.params.nodeId.toLowerCase());

    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }

    res.json({
      success: true,
      nodeId: node.nodeId,
      isActive: node.isActive,
      statistics: node
    });
  } catch (error) {
    console.error('Node reputation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to build node reputation',
      message: error.message
    });
  }
});

module.exports = router;
