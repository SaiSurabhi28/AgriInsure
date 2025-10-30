const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const moment = require('moment');
const crypto = require('crypto');

class OracleNode {
  constructor(nodeId, reputation = 100) {
    this.nodeId = nodeId;
    this.reputation = reputation;
    this.isActive = true;
    this.dataHistory = [];
    this.consensusHistory = [];
    this.lastUpdate = null;
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

  // Calculate consensus value (median of all valid readings)
  calculateConsensus(allNodeData) {
    const validData = allNodeData.filter(node => node.valid);
    
    if (validData.length === 0) {
      return null;
    }

    // Calculate median rainfall value
    const rainfallValues = [];
    validData.forEach(node => {
      if (node.sourceData && node.sourceData.summary && node.sourceData.summary.rainfall) {
        rainfallValues.push(node.sourceData.summary.rainfall.average);
      }
    });

    if (rainfallValues.length === 0) {
      return null;
    }

    // Sort and find median
    rainfallValues.sort((a, b) => a - b);
    const median = rainfallValues.length % 2 === 0
      ? (rainfallValues[rainfallValues.length / 2 - 1] + rainfallValues[rainfallValues.length / 2]) / 2
      : rainfallValues[Math.floor(rainfallValues.length / 2)];

    return {
      consensusValue: median,
      participatingNodes: validData.length,
      timestamp: moment().toISOString(),
      dataPoints: rainfallValues
    };
  }

  // Update reputation based on consensus accuracy
  updateReputation(consensusResult, myData) {
    if (!consensusResult || !myData) return;

    const myRainfall = myData.sourceData?.summary?.rainfall?.average;
    if (!myRainfall) return;

    const deviation = Math.abs(myRainfall - consensusResult.consensusValue);
    const maxDeviation = 10; // Maximum acceptable deviation

    if (deviation <= maxDeviation) {
      this.reputation = Math.min(100, this.reputation + 1);
    } else {
      this.reputation = Math.max(0, this.reputation - 2);
    }
  }
}

class OracleNetwork {
  constructor() {
    this.nodes = [];
    this.consensusThreshold = 3; // Minimum nodes needed for consensus
    this.app = express();
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

    // Weather data endpoint for frontend
    this.app.get('/api/oracle/weather', (req, res) => {
      const weatherData = this.generateWeatherData();
      res.json({
        success: true,
        data: weatherData,
        timestamp: moment().toISOString(),
        source: 'oracle_consensus'
      });
    });
  }

  // Generate weather data for frontend (when IoT simulator is not working)
  generateWeatherData() {
    const timestamp = moment().toISOString();
    
    // Generate realistic weather data
    const rainfall = Math.max(0, Math.random() * 50); // 0-50mm
    const temperature = 15 + Math.random() * 20; // 15-35°C
    const soilMoisture = 20 + Math.random() * 60; // 20-80%
    
    return {
      timestamp: timestamp,
      rainfall: parseFloat(rainfall.toFixed(2)),
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



