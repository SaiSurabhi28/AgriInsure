const fs = require('fs-extra');
const axios = require('axios');
const moment = require('moment');

class IoTWeatherSensor {
  constructor(sensorId, location, sensorType) {
    this.sensorId = sensorId;
    this.location = location;
    this.sensorType = sensorType;
    this.isActive = true;
    this.dataHistory = [];
  }

  // Generate realistic sensor data based on type
  generateSensorData() {
    const timestamp = moment().toISOString();
    let value;

    switch (this.sensorType) {
      case 'rainfall':
        // Rainfall in mm - realistic range 0-50mm per hour
        value = Math.max(0, Math.random() * 50);
        break;
      case 'temperature':
        // Temperature in Celsius - realistic range 15-35°C
        value = 15 + Math.random() * 20;
        break;
      case 'soil_moisture':
        // Soil moisture percentage - realistic range 20-80%
        value = 20 + Math.random() * 60;
        break;
      default:
        value = Math.random() * 100;
    }

    return {
      sensorId: this.sensorId,
      location: this.location,
      sensorType: this.sensorType,
      value: parseFloat(value.toFixed(2)),
      timestamp: timestamp,
      unit: this.getUnit()
    };
  }

  getUnit() {
    switch (this.sensorType) {
      case 'rainfall': return 'mm';
      case 'temperature': return '°C';
      case 'soil_moisture': return '%';
      default: return 'unit';
    }
  }

  // Simulate sensor malfunction (occasional false readings)
  generateFaultyData() {
    const data = this.generateSensorData();
    // 5% chance of faulty reading
    if (Math.random() < 0.05) {
      data.value = data.value * (Math.random() > 0.5 ? 2 : 0.1);
      data.faulty = true;
    }
    return data;
  }
}

class SensorNetwork {
  constructor() {
    this.sensors = [];
    this.oracleEndpoint = 'http://localhost:3002/api/oracle/data';
    this.dataStoragePath = './data';
    this.updateInterval = 10000; // 10 seconds
    this.initializeSensors();
    this.ensureDataDirectory();
  }

  initializeSensors() {
    const locations = [
      { name: 'Farm A', lat: 12.9716, lon: 77.5946 },
      { name: 'Farm B', lat: 12.9352, lon: 77.6245 },
      { name: 'Farm C', lat: 12.9141, lon: 77.6789 },
      { name: 'Farm D', lat: 12.8992, lon: 77.5934 },
      { name: 'Farm E', lat: 12.9234, lon: 77.6123 }
    ];

    const sensorTypes = ['rainfall', 'temperature', 'soil_moisture'];

    locations.forEach((location, index) => {
      sensorTypes.forEach((type, typeIndex) => {
        const sensorId = `sensor_${index}_${typeIndex}`;
        const sensor = new IoTWeatherSensor(sensorId, location, type);
        this.sensors.push(sensor);
      });
    });

    console.log(`Initialized ${this.sensors.length} sensors across ${locations.length} farms`);
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataStoragePath)) {
      fs.mkdirSync(this.dataStoragePath, { recursive: true });
    }
  }

  async collectSensorData() {
    const allData = [];
    const timestamp = moment().toISOString();

    for (const sensor of this.sensors) {
      try {
        const data = sensor.generateFaultyData();
        allData.push(data);
        
        // Store individual sensor data
        await this.storeSensorData(data);
      } catch (error) {
        console.error(`Error collecting data from sensor ${sensor.sensorId}:`, error);
      }
    }

    // Store aggregated data
    const aggregatedData = {
      timestamp: timestamp,
      totalSensors: this.sensors.length,
      data: allData,
      summary: this.generateSummary(allData)
    };

    await this.storeAggregatedData(aggregatedData);
    return aggregatedData;
  }

  generateSummary(data) {
    const summary = {};
    const types = ['rainfall', 'temperature', 'soil_moisture'];

    types.forEach(type => {
      const typeData = data.filter(d => d.sensorType === type);
      if (typeData.length > 0) {
        const values = typeData.map(d => d.value);
        summary[type] = {
          average: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      }
    });

    return summary;
  }

  async storeSensorData(data) {
    const filename = `${this.dataStoragePath}/sensor_${data.sensorId}_${moment().format('YYYY-MM-DD')}.json`;
    
    try {
      let existingData = [];
      if (fs.existsSync(filename)) {
        existingData = await fs.readJson(filename);
      }
      
      existingData.push(data);
      await fs.writeJson(filename, existingData, { spaces: 2 });
    } catch (error) {
      console.error(`Error storing sensor data:`, error);
    }
  }

  async storeAggregatedData(data) {
    const filename = `${this.dataStoragePath}/aggregated_${moment().format('YYYY-MM-DD')}.json`;
    
    try {
      let existingData = [];
      if (fs.existsSync(filename)) {
        existingData = await fs.readJson(filename);
      }
      
      existingData.push(data);
      await fs.writeJson(filename, existingData, { spaces: 2 });
    } catch (error) {
      console.error(`Error storing aggregated data:`, error);
    }
  }

  async sendToOracle(data) {
    try {
      const response = await axios.post(this.oracleEndpoint, {
        source: 'iot-sensors',
        data: data,
        timestamp: moment().toISOString()
      });
      
      console.log(`Data sent to oracle successfully: ${response.status}`);
      return response.data;
    } catch (error) {
      console.error('Error sending data to oracle:', error.message);
      return null;
    }
  }

  async startDataCollection() {
    console.log('Starting IoT sensor data collection...');
    
    const collectAndSend = async () => {
      try {
        const data = await this.collectSensorData();
        await this.sendToOracle(data);
        
        console.log(`[${moment().format('HH:mm:ss')}] Collected data from ${data.totalSensors} sensors`);
        console.log(`Rainfall avg: ${data.summary.rainfall?.average.toFixed(2)}mm, ` +
                   `Temp avg: ${data.summary.temperature?.average.toFixed(2)}°C, ` +
                   `Soil moisture avg: ${data.summary.soil_moisture?.average.toFixed(2)}%`);
      } catch (error) {
        console.error('Error in data collection cycle:', error);
      }
    };

    // Initial collection
    await collectAndSend();
    
    // Set up interval
    setInterval(collectAndSend, this.updateInterval);
  }

  // Simulate extreme weather events for testing
  simulateExtremeWeather() {
    console.log('Simulating extreme weather event...');
    
    this.sensors.forEach(sensor => {
      if (sensor.sensorType === 'rainfall') {
        // Simulate drought (very low rainfall)
        sensor.generateSensorData = function() {
          return {
            sensorId: this.sensorId,
            location: this.location,
            sensorType: this.sensorType,
            value: Math.random() * 2, // Very low rainfall
            timestamp: moment().toISOString(),
            unit: this.getUnit(),
            extreme: true
          };
        };
      }
    });
    
    setTimeout(() => {
      console.log('Extreme weather event ended, returning to normal...');
      this.sensors.forEach(sensor => {
        sensor.generateSensorData = IoTWeatherSensor.prototype.generateSensorData;
      });
    }, 60000); // 1 minute extreme weather
  }
}

// Main execution
if (require.main === module) {
  const sensorNetwork = new SensorNetwork();
  
  // Start data collection
  sensorNetwork.startDataCollection();
  
  // Simulate extreme weather every 5 minutes for testing
  setInterval(() => {
    if (Math.random() < 0.3) { // 30% chance
      sensorNetwork.simulateExtremeWeather();
    }
  }, 300000); // 5 minutes
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down IoT sensor network...');
    process.exit(0);
  });
}

module.exports = { IoTWeatherSensor, SensorNetwork };





