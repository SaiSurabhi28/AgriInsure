const express = require('express');
const router = express.Router();
const CropRecommendationService = require('../services/cropRecommendationService');
const datasetWeatherService = require('../services/datasetWeatherService');

// Initialize crop recommendation service
const cropService = new CropRecommendationService();

/**
 * GET /api/crops/recommendations
 * Get crop recommendations based on environmental conditions
 * 
 * Query parameters:
 * - n: Nitrogen level (optional)
 * - p: Phosphorus level (optional)
 * - k: Potassium level (optional)
 * - temperature: Temperature in Celsius (optional)
 * - humidity: Humidity percentage (optional)
 * - ph: pH level (optional)
 * - rainfall: Rainfall in mm (optional)
 * - topN: Number of recommendations to return (default: 5)
 */
router.get('/recommendations', async (req, res) => {
  try {
    const conditions = {
      n: req.query.n ? parseFloat(req.query.n) : undefined,
      p: req.query.p ? parseFloat(req.query.p) : undefined,
      k: req.query.k ? parseFloat(req.query.k) : undefined,
      temperature: req.query.temperature ? parseFloat(req.query.temperature) : undefined,
      humidity: req.query.humidity ? parseFloat(req.query.humidity) : undefined,
      ph: req.query.ph ? parseFloat(req.query.ph) : undefined,
      rainfall: req.query.rainfall ? parseFloat(req.query.rainfall) : undefined
    };

    const topN = parseInt(req.query.topN) || 5;

    const result = await cropService.getRecommendations(conditions, topN);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Crop recommendation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get crop recommendations',
      message: error.message
    });
  }
});

/**
 * GET /api/crops/all
 * Get list of all available crops in the dataset
 */
router.get('/all', async (req, res) => {
  try {
    const result = await cropService.getAllCrops();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get all crops error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get crops',
      message: error.message
    });
  }
});

/**
 * GET /api/crops/stats
 * Get statistics about the crop dataset
 */
router.get('/stats', async (req, res) => {
  try {
    const result = await cropService.getCropStats();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Crop stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get crop statistics',
      message: error.message
    });
  }
});

/**
 * POST /api/crops/recommendations/smart
 * Get intelligent crop recommendations using current weather data
 * Automatically fetches weather data from oracle and makes recommendations
 */
router.post('/recommendations/smart', async (req, res) => {
  try {
    const weatherSnapshot = await datasetWeatherService.getNextWeatherSample();
    const nutrientSample = await cropService.getRandomSample();

    if (!weatherSnapshot) {
      return res.status(503).json({
        success: false,
        error: 'Weather dataset unavailable'
      });
    }

    const conditions = {
      n: nutrientSample?.n ?? 70,
      p: nutrientSample?.p ?? 50,
      k: nutrientSample?.k ?? 40,
      ph: nutrientSample?.ph ?? 6.5,
      temperature: typeof weatherSnapshot.temperature === 'number'
        ? weatherSnapshot.temperature
        : nutrientSample?.temperature ?? undefined,
      humidity: typeof weatherSnapshot.humidity === 'number'
        ? weatherSnapshot.humidity
        : nutrientSample?.humidity ?? undefined,
      rainfall: typeof weatherSnapshot.rainfall === 'number'
        ? weatherSnapshot.rainfall
        : nutrientSample?.rainfall ?? undefined
    };

    const topN = parseInt(req.query.topN, 10) || 5;
    const result = await cropService.getRecommendations(conditions, topN);
    
    if (result.success) {
      res.json({
        ...result,
        weatherSource: 'dataset',
        weatherTimestamp: weatherSnapshot.isoDate,
        weatherSample: weatherSnapshot
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Smart crop recommendation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get intelligent crop recommendations',
      message: error.message
    });
  }
});

module.exports = router;

