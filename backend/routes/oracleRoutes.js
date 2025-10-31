const express = require('express');
const router = express.Router();
const oracleService = require('../services/oracleService');
const blockchainService = require('../services/blockchainService');
const fs = require('fs-extra');
const path = require('path');

// Send weather data to oracle
router.post('/data', async (req, res) => {
  try {
    const weatherData = req.body;

    if (!weatherData || !weatherData.data) {
      return res.status(400).json({
        error: 'Invalid weather data format'
      });
    }

    const result = await oracleService.processWeatherData(weatherData);

    res.json({
      success: true,
      message: 'Weather data processed successfully',
      data: result
    });
  } catch (error) {
    console.error('Oracle data processing error:', error);
    res.status(500).json({
      error: 'Failed to process weather data',
      message: error.message
    });
  }
});

// Get consensus history
router.get('/consensus', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const consensus = await oracleService.getConsensusHistory(parseInt(limit));

    res.json({
      success: true,
      data: consensus
    });
  } catch (error) {
    console.error('Consensus history error:', error);
    res.status(500).json({
      error: 'Failed to get consensus history',
      message: error.message
    });
  }
});

// Get oracle nodes status
router.get('/nodes', async (req, res) => {
  try {
    const nodes = await oracleService.getOracleNodes();

    res.json({
      success: true,
      data: nodes
    });
  } catch (error) {
    console.error('Oracle nodes error:', error);
    res.status(500).json({
      error: 'Failed to get oracle nodes',
      message: error.message
    });
  }
});

// Check oracle health
router.get('/health', async (req, res) => {
  try {
    const health = await oracleService.checkOracleHealth();

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Oracle health check error:', error);
    res.status(500).json({
      error: 'Failed to check oracle health',
      message: error.message
    });
  }
});

// Simulate weather event
router.post('/simulate', async (req, res) => {
  try {
    const { eventType, intensity } = req.body;

    if (!eventType) {
      return res.status(400).json({
        error: 'Event type is required'
      });
    }

    const result = await oracleService.simulateWeatherEvent(eventType, intensity);

    res.json({
      success: true,
      message: `Weather event '${eventType}' simulated successfully`,
      data: result
    });
  } catch (error) {
    console.error('Weather simulation error:', error);
    res.status(500).json({
      error: 'Failed to simulate weather event',
      message: error.message
    });
  }
});

// Update blockchain with oracle data
router.post('/update-blockchain', async (req, res) => {
  try {
    const { policyId, rainfall, temperature, soilMoisture } = req.body;

    if (!policyId || rainfall === undefined) {
      return res.status(400).json({
        error: 'Policy ID and rainfall are required'
      });
    }

    const result = await blockchainService.updateOracleData(
      policyId,
      rainfall,
      temperature || 25,
      soilMoisture || 60
    );

    res.json({
      success: true,
      message: 'Blockchain updated with oracle data',
      data: result
    });
  } catch (error) {
    console.error('Blockchain update error:', error);
    res.status(500).json({
      error: 'Failed to update blockchain',
      message: error.message
    });
  }
});

// Get oracle statistics
router.get('/stats', async (req, res) => {
  try {
    const [consensus, nodes, health] = await Promise.all([
      oracleService.getConsensusHistory(50),
      oracleService.getOracleNodes(),
      oracleService.checkOracleHealth()
    ]);

    const stats = {
      totalConsensusEntries: consensus.consensus ? consensus.consensus.length : 0,
      activeNodes: nodes.activeNodes || 0,
      totalNodes: nodes.totalNodes || 0,
      oracleHealth: health.status || 'unknown',
      lastConsensus: consensus.consensus && consensus.consensus.length > 0 
        ? consensus.consensus[consensus.consensus.length - 1] 
        : null
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Oracle stats error:', error);
    res.status(500).json({
      error: 'Failed to get oracle statistics',
      message: error.message
    });
  }
});

// Get weather data from dataset files
router.get('/weather', async (req, res) => {
  try {
    // Prefer IoT simulation data (updates live via simulator)
    const dataPath = path.join(__dirname, '..', '..', 'iot-sim', 'data');
    
    // Check if IoT data directory exists
    let files = [];
    try {
      files = await fs.readdir(dataPath);
    } catch (dirError) {
      // Directory doesn't exist, skip to final fallback
    }
    
    const aggregatedFiles = files.filter(f => f.startsWith('aggregated_') && f.endsWith('.json'))
      .sort()
      .reverse();
    
    if (aggregatedFiles.length > 0) {
      // Read the most recent aggregated file
      const mostRecentFile = aggregatedFiles[0];
      const filePath = path.join(dataPath, mostRecentFile);
      const rawData = await fs.readJson(filePath);
      
      // Transform dataset to match WeatherFeed component format
      const weatherRounds = [];
      let roundId = 1;
      const dataByTimestamp = {};
      rawData.forEach(entry => {
        const timestamp = entry.timestamp;
        if (!dataByTimestamp[timestamp]) {
          dataByTimestamp[timestamp] = [];
        }
        dataByTimestamp[timestamp].push(entry);
      });
      
      Object.keys(dataByTimestamp).sort().forEach((timestamp) => {
        const entries = dataByTimestamp[timestamp];
        const rainfallEntries = entries.filter(e => e.sensorType === 'rainfall');
        if (rainfallEntries.length > 0) {
          const avgRainfall = rainfallEntries.reduce((sum, e) => sum + e.value, 0) / rainfallEntries.length;
          const ts = new Date(timestamp).getTime() / 1000;
          weatherRounds.push({
            roundId: roundId++,
            value: avgRainfall.toFixed(2),
            timestamp: Math.floor(ts),
            time: timestamp
          });
        }
      });
      
      if (weatherRounds.length > 0) {
        return res.json({
          success: true,
          data: weatherRounds,
          source: 'dataset',
          file: mostRecentFile,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Fallback: Try Kaggle CSV dataset if available
    const kaggleFile = process.env.KAGGLE_DATA_FILE || path.join(__dirname, '..', '..', 'archive (1) 2', 'weather_prediction_dataset.csv');
    if (await fs.pathExists(kaggleFile)) {
      try {
        console.log('Loading weather data from Kaggle CSV:', kaggleFile);
        const csvText = await fs.readFile(kaggleFile, 'utf8');
        const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length >= 2) {
          const header = lines[0].split(',').map(h => h.trim());
          const dateIdx = header.findIndex(h => h.toUpperCase() === 'DATE');
          const precipCols = header.map((col, idx) => col.toLowerCase().includes('precipitation') ? { name: col, index: idx } : null).filter(Boolean);
          const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 500, 1000));
          const dataRows = lines.slice(1);
          const weatherRounds = [];
          let roundId = 1;
          const start = Math.max(0, dataRows.length - limit);
          for (let i = start; i < dataRows.length; i++) {
            const cols = dataRows[i].split(',');
            let totalPrecip = 0;
            let precipCount = 0;
            precipCols.forEach(col => {
              const val = parseFloat((cols[col.index] || '').trim());
              if (!Number.isNaN(val) && val >= 0) { totalPrecip += val; precipCount++; }
            });
            if (precipCount === 0) continue;
            const avgPrecip = totalPrecip / precipCount;
            let timestamp = Math.floor(Date.now() / 1000) - (dataRows.length - i) * 86400;
            let isoDate = new Date(timestamp * 1000).toISOString();
            if (dateIdx !== -1 && cols[dateIdx] && cols[dateIdx].trim().length === 8) {
              const dateStr = cols[dateIdx].trim();
              const year = parseInt(dateStr.substring(0, 4));
              const month = parseInt(dateStr.substring(4, 6)) - 1;
              const day = parseInt(dateStr.substring(6, 8));
              const parsedDate = new Date(Date.UTC(year, month, day));
              if (!Number.isNaN(parsedDate.getTime())) { timestamp = Math.floor(parsedDate.getTime() / 1000); isoDate = parsedDate.toISOString(); }
            }
            weatherRounds.push({ roundId: roundId++, value: avgPrecip.toFixed(2), timestamp, time: isoDate });
          }
          if (weatherRounds.length > 0) {
            return res.json({ success: true, data: weatherRounds, source: 'kaggle_dataset', file: kaggleFile, timestamp: new Date().toISOString(), citiesAveraged: precipCols.length });
          }
        }
      } catch (kaggleError) {
        console.warn('Failed to load Kaggle CSV, falling back to oracle service:', kaggleError.message);
      }
    }

    // Final fallback: proxy to oracle service (simulated dynamic data)
    try {
      const result = await oracleService.getWeatherData();
      // Normalize oracle response to rounds array for the frontend
      if (result && result.data && !Array.isArray(result.data)) {
        const nowTs = Math.floor(Date.now() / 1000);
        const value = typeof result.data.rainfall === 'number' ? result.data.rainfall : 0;
        return res.json({
          success: true,
          data: [{ roundId: nowTs, value: value.toFixed(2), timestamp: nowTs, time: new Date(nowTs * 1000).toISOString() }],
          source: result.source || 'oracle_consensus',
          timestamp: new Date().toISOString()
        });
      }
      return res.json(result);
    } catch (error) {
      return res.status(404).json({ success: false, error: 'No weather data available' });
    }
    
    // Read the most recent aggregated file
    const mostRecentFile = aggregatedFiles[0];
    const filePath = path.join(dataPath, mostRecentFile);
    const rawData = await fs.readJson(filePath);
    
    // Transform dataset to match WeatherFeed component format
    // Extract rainfall data and group by timestamp
    const weatherRounds = [];
    let roundId = 1;
    
    // Group data by timestamp to create rounds
    const dataByTimestamp = {};
    rawData.forEach(entry => {
      const timestamp = entry.timestamp;
      if (!dataByTimestamp[timestamp]) {
        dataByTimestamp[timestamp] = [];
      }
      dataByTimestamp[timestamp].push(entry);
    });
    
    // Process each timestamp group
    Object.keys(dataByTimestamp).sort().forEach((timestamp, index) => {
      const entries = dataByTimestamp[timestamp];
      
      // Extract rainfall values (filter for rainfall sensor type)
      const rainfallEntries = entries.filter(e => e.sensorType === 'rainfall');
      if (rainfallEntries.length > 0) {
        // Calculate average rainfall for this round
        const avgRainfall = rainfallEntries.reduce((sum, e) => sum + e.value, 0) / rainfallEntries.length;
        
        // Parse timestamp
        const ts = new Date(timestamp).getTime() / 1000;
        
        weatherRounds.push({
          roundId: roundId++,
          value: avgRainfall.toFixed(2),
          timestamp: Math.floor(ts),
          time: timestamp
        });
      }
    });
    
    // If we have data, return it; otherwise try oracle service fallback
    if (weatherRounds.length > 0) {
      res.json({
        success: true,
        data: weatherRounds,
        source: 'dataset',
        file: mostRecentFile,
        timestamp: new Date().toISOString()
      });
    } else {
      // Fallback to oracle service
      try {
        const result = await oracleService.getWeatherData();
        return res.json(result);
      } catch (error) {
        res.status(404).json({
          success: false,
          error: 'No valid weather data found in dataset',
          message: 'Dataset file exists but contains no valid rainfall data'
        });
      }
    }
  } catch (error) {
    console.error('Weather data error:', error);
    
    // Fallback: try oracle service
    try {
      const result = await oracleService.getWeatherData();
      return res.json(result);
    } catch (fallbackError) {
      res.status(500).json({
        success: false,
        error: 'Failed to get weather data',
        message: error.message
      });
    }
  }
});

// Get weather data from a Kaggle CSV dataset
router.get('/weather/kaggle', async (req, res) => {
  try {
    // Resolve CSV file path: env or default to ../datasets/weather.csv
    const defaultFile = path.join(__dirname, '..', '..', 'datasets', 'weather.csv');
    const filePath = process.env.KAGGLE_DATA_FILE || defaultFile;

    if (!(await fs.pathExists(filePath))) {
      return res.status(404).json({
        success: false,
        error: 'Kaggle data file not found',
        message: `Set KAGGLE_DATA_FILE to a valid CSV. Tried: ${filePath}`
      });
    }

    const csvText = await fs.readFile(filePath, 'utf8');
    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) {
      return res.status(400).json({ success: false, error: 'CSV has no data rows' });
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim());

    // Column mapping: allow env override, otherwise try common names
    const dateColName = (process.env.KAGGLE_DATE_COLUMN || 'date').toLowerCase();
    const rainColName = (process.env.KAGGLE_RAINFALL_COLUMN || 'precipitation').toLowerCase();

    const findColIndex = (candidates) => {
      for (const candidate of candidates) {
        const idx = header.findIndex(h => h.toLowerCase() === candidate);
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const dateIdx = findColIndex([
      dateColName, 'datetime', 'timestamp', 'date_time', 'time', 'Date', 'DATE'.toLowerCase()
    ]);
    const rainIdx = findColIndex([
      rainColName, 'rain', 'rainfall', 'rainfall_mm', 'precipitation_mm', 'precipitation(in)', 'precipitation (mm)', 'Rainfall(mm)'.toLowerCase()
    ]);

    if (rainIdx === -1) {
      return res.status(400).json({
        success: false,
        error: 'Could not find rainfall/precipitation column',
        message: `Header columns: ${header.join(', ')}`
      });
    }

    // Parse rows -> rounds (limit optional via ?limit=)
    const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 100, 1000));
    const dataRows = lines.slice(1);

    const rounds = [];
    let roundId = 1;
    const start = Math.max(0, dataRows.length - limit);
    for (let i = start; i < dataRows.length; i++) {
      const raw = dataRows[i];
      // Simple CSV split (no quoted fields support). Works for this dataset shape.
      const cols = raw.split(',');
      const rainValStr = (cols[rainIdx] || '').trim();
      const rainVal = parseFloat(rainValStr);
      if (Number.isNaN(rainVal)) continue;

      let ts = Math.floor(Date.now() / 1000) - (dataRows.length - i) * 60;
      let iso = new Date(ts * 1000).toISOString();
      if (dateIdx !== -1 && cols[dateIdx] && cols[dateIdx].trim().length > 0) {
        const parsed = Date.parse(cols[dateIdx]);
        if (!Number.isNaN(parsed)) {
          ts = Math.floor(parsed / 1000);
          iso = new Date(parsed).toISOString();
        }
      }

      rounds.push({
        roundId: roundId++,
        value: rainVal.toFixed(2),
        timestamp: ts,
        time: iso
      });
    }

    if (rounds.length === 0) {
      return res.status(404).json({ success: false, error: 'No valid rows parsed from CSV' });
    }

    return res.json({
      success: true,
      data: rounds,
      source: 'kaggle_csv',
      file: filePath,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Kaggle weather error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;








