const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const moment = require('moment');
const crypto = require('crypto');
const WeatherAPIService = require('./services/weatherAPI');

class OracleNode {
  constructor(nodeId, reputation = 100) {
    this.nodeId = nodeId;
    this.reputation = reputation;
    this.isActive = true;
    this.dataHistory = [];
    this.consensusHistory = [];
    this.lastUpdate = null;
    this.totalReports = 0;
    this.accurateReports = 0;
    this.maliciousReports = 0;
    this.stakeAmount = 0; // Virtual stake (can be real in production)
    this.performanceHistory = []; // Track performance over time
    this.lastPenalty = null;
    this.isSuspended = false;
  }

  // Process incoming IoT data
  processData(iotData) {
    try {
      const processedData = {
        nodeId: this.nodeId,
        timestamp: moment().toISOString(),
        sourceData: iotData,
        processedAt: moment().toISOString(),
        dataHash: this.generateHash(iotData),
        reputation: this.reputation
      };

      // Validate data integrity
      if (this.validateData(iotData)) {
        processedData.valid = true;
        this.dataHistory.push(processedData);
        this.lastUpdate = moment().toISOString();
        return processedData;
      } else {
        processedData.valid = false;
        processedData.error = 'Data validation failed';
        return processedData;
      }
    } catch (error) {
      console.error(`Oracle ${this.nodeId} error processing data:`, error);
      return null;
    }
  }

  // Validate incoming data
  validateData(data) {
    if (!data || !data.timestamp || !data.data) {
      return false;
    }

    // Check if data is recent (within last 30 seconds)
    const dataTime = moment(data.timestamp);
    const now = moment();
    if (now.diff(dataTime, 'seconds') > 30) {
      return false;
    }

    // Validate sensor data structure
    if (!Array.isArray(data.data) || data.data.length === 0) {
      return false;
    }

    // Check for reasonable sensor values
    for (const sensorData of data.data) {
      if (!sensorData.value || typeof sensorData.value !== 'number') {
        return false;
      }
      
      // Validate ranges based on sensor type
      switch (sensorData.sensorType) {
        case 'rainfall':
          if (sensorData.value < 0 || sensorData.value > 100) return false;
          break;
        case 'temperature':
          if (sensorData.value < -10 || sensorData.value > 50) return false;
          break;
        case 'soil_moisture':
          if (sensorData.value < 0 || sensorData.value > 100) return false;
          break;
      }
    }

    return true;
  }

  // Generate hash for data integrity
  generateHash(data) {
    const dataString = JSON.stringify(data);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  // Calculate consensus value using REPUTATION-WEIGHTED median
  calculateConsensus(allNodeData) {
    const validData = allNodeData.filter(node => node.valid);
    
    if (validData.length === 0) {
      return null;
    }

    // Get rainfall values with their reputation weights
    const rainfallData = [];
    validData.forEach(node => {
      if (node.sourceData && node.sourceData.summary && node.sourceData.summary.rainfall) {
        rainfallData.push({
          value: node.sourceData.summary.rainfall.average,
          reputation: node.reputation || 100,
          nodeId: node.nodeId
        });
      }
    });

    if (rainfallData.length === 0) {
      return null;
    }

    // Use reputation-weighted calculation
    const weightedConsensus = this.calculateWeightedConsensus(rainfallData);
    
    // Also calculate traditional median for comparison
    const values = rainfallData.map(d => d.value);
    values.sort((a, b) => a - b);
    const median = values.length % 2 === 0
      ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
      : values[Math.floor(values.length / 2)];

    return {
      consensusValue: weightedConsensus, // Use weighted consensus as primary
      medianValue: median, // Traditional median for comparison
      timestamp: moment().toISOString(),
      dataPoints: rainfallData.map(d => ({
        value: d.value,
        reputation: d.reputation,
        nodeId: d.nodeId
      })),
      participatingNodes: validData.length,
      method: 'reputation_weighted'
    };
  }

  // Calculate weighted consensus based on reputation
  calculateWeightedConsensus(rainfallData) {
    // Calculate total reputation weight
    const totalWeight = rainfallData.reduce((sum, d) => sum + d.reputation, 0);
    
    if (totalWeight === 0) {
      // Fallback to simple average if all reputations are 0
      const sum = rainfallData.reduce((s, d) => s + d.value, 0);
      return sum / rainfallData.length;
    }

    // Weighted average
    const weightedSum = rainfallData.reduce((sum, d) => 
      sum + (d.value * d.reputation), 0
    );
    
    return weightedSum / totalWeight;
  }

  // Enhanced reputation update with advanced penalty system
  updateReputation(consensusResult, myData) {
    if (!consensusResult || !myData) return;

    const myRainfall = myData.sourceData?.summary?.rainfall?.average;
    if (!myRainfall) return;

    const deviation = Math.abs(myRainfall - consensusResult.consensusValue);
    const maxDeviation = 10; // Maximum acceptable deviation
    
    this.totalReports++;
    
    // Track performance
    const performance = {
      timestamp: moment().toISOString(),
      deviation: deviation,
      withinThreshold: deviation <= maxDeviation,
      consensusValue: consensusResult.consensusValue,
      myValue: myRainfall
    };
    
    this.performanceHistory.push(performance);
    // Keep only last 100 reports
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift();
    }

    // Determine accuracy
    if (deviation <= maxDeviation) {
      this.accurateReports++;
      // Reward: Reputation increase
      const reward = this.calculateReputationReward(deviation, maxDeviation);
      this.reputation = Math.min(100, this.reputation + reward);
    } else {
      this.maliciousReports++;
      // Penalty: Reputation decrease with severity
      const penalty = this.calculateReputationPenalty(deviation, maxDeviation);
      this.reputation = Math.max(0, this.reputation - penalty);
      
      // Check for severe violations
      if (deviation > maxDeviation * 3) {
        this.applySeverePenalty();
      }
      
      // Check for suspension threshold
      if (this.reputation < 30) {
        this.isSuspended = true;
        console.log(`⚠️  Node ${this.nodeId} SUSPENDED due to low reputation (${this.reputation})`);
      }
    }
  }

  // Calculate reputation reward based on accuracy
  calculateReputationReward(deviation, maxDeviation) {
    const accuracyRatio = 1 - (deviation / maxDeviation);
    // More accurate reports get higher rewards (0.5 to 1.5 reputation points)
    return Math.round((accuracyRatio * 1.5 + 0.5) * 10) / 10;
  }

  // Calculate reputation penalty based on deviation
  calculateReputationPenalty(deviation, maxDeviation) {
    const severityRatio = (deviation - maxDeviation) / maxDeviation;
    // More severe deviations get higher penalties (2 to 10 reputation points)
    const penalty = Math.min(10, 2 + (severityRatio * 3));
    return Math.round(penalty * 10) / 10;
  }

  // Apply severe penalty for malicious behavior
  applySeverePenalty() {
    this.reputation = Math.max(0, this.reputation - 15);
    this.lastPenalty = {
      timestamp: moment().toISOString(),
      reason: 'Severe deviation from consensus',
      penalty: 15
    };
    console.log(`⚠️  Node ${this.nodeId} received SEVERE PENALTY: -15 reputation`);
  }

  // Get reputation tier
  getReputationTier() {
    if (this.reputation >= 90) return { tier: 'excellent', color: 'success' };
    if (this.reputation >= 75) return { tier: 'good', color: 'info' };
    if (this.reputation >= 50) return { tier: 'fair', color: 'warning' };
    if (this.reputation >= 30) return { tier: 'poor', color: 'error' };
    return { tier: 'critical', color: 'error' };
  }

  // Get accuracy percentage
  getAccuracyPercentage() {
    if (this.totalReports === 0) return 100;
    return Math.round((this.accurateReports / this.totalReports) * 100);
  }

  // Get node statistics
  getStatistics() {
    const recentPerformance = this.performanceHistory.slice(-20); // Last 20 reports
    const avgDeviation = recentPerformance.length > 0
      ? recentPerformance.reduce((sum, p) => sum + p.deviation, 0) / recentPerformance.length
      : 0;
    
    return {
      reputation: this.reputation,
      tier: this.getReputationTier(),
      totalReports: this.totalReports,
      accurateReports: this.accurateReports,
      maliciousReports: this.maliciousReports,
      accuracy: this.getAccuracyPercentage(),
      averageDeviation: Math.round(avgDeviation * 100) / 100,
      isSuspended: this.isSuspended,
      lastPenalty: this.lastPenalty,
      stakeAmount: this.stakeAmount
    };
  }
}

class OracleNetwork {
  constructor() {
    this.nodes = [];
    this.consensusThreshold = 3; // Minimum nodes needed for consensus
    this.app = express();
    this.weatherAPI = new WeatherAPIService(); // Real weather data integration
    this.defaultLat = 20.5937; // India coordinates
    this.defaultLon = 78.9629;
    this.setupMiddleware();
    this.setupRoutes();
    this.initializeNodes();
    this.consensusData = [];
  }

  initializeNodes() {
    const nodeCount = 5;
    for (let i = 0; i < nodeCount; i++) {
      const node = new OracleNode(`oracle_${i}`, 100 - (i * 5)); // Varying reputation
      this.nodes.push(node);
    }
    console.log(`Initialized ${nodeCount} oracle nodes`);
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
  }

  setupRoutes() {
    // Receive IoT data
    this.app.post('/api/oracle/data', async (req, res) => {
      try {
        const iotData = req.body;
        console.log(`Received IoT data at ${moment().format('HH:mm:ss')}`);

        // Process data through all oracle nodes
        const nodeResults = [];
        for (const node of this.nodes) {
          if (node.isActive) {
            const result = node.processData(iotData);
            if (result) {
              nodeResults.push(result);
            }
          }
        }

        // Calculate consensus
        const consensus = this.calculateNetworkConsensus(nodeResults);
        
        if (consensus) {
          // Update node reputations
          nodeResults.forEach(nodeResult => {
            const node = this.nodes.find(n => n.nodeId === nodeResult.nodeId);
            if (node) {
              node.updateReputation(consensus, nodeResult);
            }
          });

          // Store consensus result
          this.consensusData.push(consensus);
          
          // Send to blockchain (simulated)
          await this.sendToBlockchain(consensus);

          res.json({
            success: true,
            consensus: consensus,
            participatingNodes: nodeResults.length,
            timestamp: moment().toISOString()
          });
        } else {
          res.status(400).json({
            success: false,
            error: 'Insufficient consensus',
            participatingNodes: nodeResults.length
          });
        }
      } catch (error) {
        console.error('Oracle processing error:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Get consensus history
    this.app.get('/api/oracle/consensus', (req, res) => {
      const limit = parseInt(req.query.limit) || 10;
      const recentConsensus = this.consensusData.slice(-limit);
      
      res.json({
        consensus: recentConsensus,
        totalNodes: this.nodes.length,
        activeNodes: this.nodes.filter(n => n.isActive).length
      });
    });

    // Get node status
    this.app.get('/api/oracle/nodes', (req, res) => {
      const nodeStatus = this.nodes.map(node => ({
        nodeId: node.nodeId,
        reputation: node.reputation,
        isActive: node.isActive,
        lastUpdate: node.lastUpdate,
        dataCount: node.dataHistory.length
      }));

      res.json({
        nodes: nodeStatus,
        totalNodes: this.nodes.length,
        activeNodes: this.nodes.filter(n => n.isActive).length
      });
    });

    // Health check
    this.app.get('/api/oracle/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: moment().toISOString(),
        activeNodes: this.nodes.filter(n => n.isActive).length,
        totalNodes: this.nodes.length
      });
    });

    // Weather data endpoint for frontend - NOW WITH REAL DATA!
    this.app.get('/api/oracle/weather', async (req, res) => {
      try {
        // Try to get real weather data first
        const realWeather = await this.weatherAPI.getCurrentWeather();
        
        if (realWeather.source === 'openweathermap') {
          // Transform real weather to our format
          const weatherRounds = [{
            roundId: Date.now(),
            timestamp: Math.floor(realWeather.timestamp / 1000),
            value: realWeather.rainfall.toFixed(2),
            temperature: realWeather.temperature.toFixed(2),
            humidity: realWeather.humidity,
            windSpeed: realWeather.windSpeed,
            conditions: realWeather.conditions,
            source: 'real_weather_api'
          }];
          
          res.json({
            success: true,
            data: weatherRounds,
            timestamp: moment().toISOString(),
            source: 'openweathermap',
            location: realWeather.location
          });
        } else {
          // Fallback to simulated data
          const weatherData = this.generateWeatherData();
          res.json({
            success: true,
            data: [weatherData],
            timestamp: moment().toISOString(),
            source: 'simulated',
            note: 'Using simulated data - configure OPENWEATHER_API_KEY for real data'
          });
        }
      } catch (error) {
        console.error('Error getting weather data:', error);
        // Ultimate fallback
        const weatherData = this.generateWeatherData();
        res.json({
          success: true,
          data: [weatherData],
          timestamp: moment().toISOString(),
          source: 'simulated_fallback'
        });
      }
    });

    // Forecast endpoint for multi-day weather predictions
    this.app.get('/api/oracle/forecast', async (req, res) => {
      try {
        const days = parseInt(req.query.days) || 5;
        const forecast = await this.weatherAPI.getForecast(this.defaultLat, this.defaultLon, days);
        
        res.json({
          success: true,
          forecast: forecast,
          days: days,
          source: forecast.length > 0 && forecast[0].source || 'simulated'
        });
      } catch (error) {
        console.error('Error getting forecast:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Health check with weather API status
    this.app.get('/api/oracle/health-detailed', async (req, res) => {
      try {
        const apiKeyStatus = await this.weatherAPI.validateAPIKey();
        
        res.json({
          status: 'healthy',
          timestamp: moment().toISOString(),
          nodes: {
            total: this.nodes.length,
            active: this.nodes.filter(n => n.isActive).length
          },
          weatherAPI: {
            configured: !!process.env.OPENWEATHER_API_KEY,
            status: apiKeyStatus.message,
            valid: apiKeyStatus.valid
          }
        });
      } catch (error) {
        res.json({
          status: 'degraded',
          error: error.message
        });
      }
    });

    // Get detailed reputation stats for all nodes
    this.app.get('/api/oracle/reputation', (req, res) => {
      const nodeStats = this.nodes.map(node => ({
        nodeId: node.nodeId,
        isActive: node.isActive,
        ...node.getStatistics()
      }));

      // Calculate network-wide metrics
      const activeNodes = this.nodes.filter(n => n.isActive && !n.isSuspended);
      const avgReputation = activeNodes.length > 0
        ? activeNodes.reduce((sum, n) => sum + n.reputation, 0) / activeNodes.length
        : 0;
      
      const avgAccuracy = activeNodes.length > 0
        ? activeNodes.reduce((sum, n) => sum + n.getAccuracyPercentage(), 0) / activeNodes.length
        : 0;

      res.json({
        success: true,
        timestamp: moment().toISOString(),
        networkStats: {
          totalNodes: this.nodes.length,
          activeNodes: activeNodes.length,
          suspendedNodes: this.nodes.filter(n => n.isSuspended).length,
          averageReputation: Math.round(avgReputation * 100) / 100,
          averageAccuracy: Math.round(avgAccuracy * 100) / 100
        },
        nodes: nodeStats
      });
    });

    // Get individual node statistics
    this.app.get('/api/oracle/reputation/:nodeId', (req, res) => {
      const { nodeId } = req.params;
      const node = this.nodes.find(n => n.nodeId === nodeId);
      
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
        statistics: node.getStatistics()
      });
    });
  }

  // Generate weather data for frontend (when IoT simulator is not working)
  generateWeatherData() {
    const timestamp = moment().toISOString();
    const timestampSec = Math.floor(Date.now() / 1000);
    
    // Generate realistic weather data
    const rainfall = Math.max(0, Math.random() * 50); // 0-50mm
    const temperature = 15 + Math.random() * 20; // 15-35°C
    const soilMoisture = 20 + Math.random() * 60; // 20-80%
    
    return {
      roundId: Date.now(), // Unique round ID for tracking
      timestamp: timestampSec, // Unix timestamp in seconds
      value: rainfall.toFixed(2), // Rainfall in mm (string for consistency)
      rainfall: parseFloat(rainfall.toFixed(2)), // Legacy format
      temperature: parseFloat(temperature.toFixed(2)),
      soil_moisture: parseFloat(soilMoisture.toFixed(2)),
      source: 'simulated',
      confidence: 95
    };
  }

  calculateNetworkConsensus(nodeResults) {
    if (nodeResults.length < this.consensusThreshold) {
      console.log(`Insufficient nodes for consensus: ${nodeResults.length}/${this.consensusThreshold}`);
      return null;
    }

    // Use the first active node to calculate consensus
    const activeNode = this.nodes.find(n => n.isActive);
    if (!activeNode) {
      return null;
    }

    return activeNode.calculateConsensus(nodeResults);
  }

  async sendToBlockchain(consensusData) {
    try {
      // Simulate blockchain interaction
      console.log(`Sending consensus to blockchain: ${consensusData.consensusValue.toFixed(2)}mm rainfall`);
      
      // In a real implementation, this would interact with smart contracts
      // For now, we'll store it locally
      await this.storeConsensusData(consensusData);
      
      return true;
    } catch (error) {
      console.error('Error sending to blockchain:', error);
      return false;
    }
  }

  async storeConsensusData(consensusData) {
    try {
      const filename = `./consensus/consensus_${moment().format('YYYY-MM-DD')}.json`;
      await fs.ensureDir('./consensus');
      
      let existingData = [];
      if (await fs.pathExists(filename)) {
        existingData = await fs.readJson(filename);
      }
      
      existingData.push(consensusData);
      await fs.writeJson(filename, existingData, { spaces: 2 });
    } catch (error) {
      console.error('Error storing consensus data:', error);
    }
  }

  // Simulate node failures for testing
  simulateNodeFailure() {
    const randomNode = this.nodes[Math.floor(Math.random() * this.nodes.length)];
    randomNode.isActive = false;
    console.log(`Simulated failure of node ${randomNode.nodeId}`);
    
    // Reactivate after 2 minutes
    setTimeout(() => {
      randomNode.isActive = true;
      console.log(`Node ${randomNode.nodeId} reactivated`);
    }, 120000);
  }

  start(port = 3002) {
    this.app.listen(port, () => {
      console.log(`Oracle network running on port ${port}`);
      console.log(`Consensus threshold: ${this.consensusThreshold} nodes`);
      console.log(`Active nodes: ${this.nodes.filter(n => n.isActive).length}/${this.nodes.length}`);
    });

    // Simulate occasional node failures
    setInterval(() => {
      if (Math.random() < 0.1) { // 10% chance every 5 minutes
        this.simulateNodeFailure();
      }
    }, 300000);
  }
}

// Main execution
if (require.main === module) {
  const oracleNetwork = new OracleNetwork();
  oracleNetwork.start();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down oracle network...');
    process.exit(0);
  });
}

module.exports = { OracleNode, OracleNetwork };



