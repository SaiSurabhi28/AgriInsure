const axios = require('axios');

const ORACLE_ENDPOINT = process.env.ORACLE_ENDPOINT || 'http://localhost:3002';

class OracleService {
  constructor() {
    this.baseURL = ORACLE_ENDPOINT;
    this.timeout = 5000;
  }

  async makeRequest(method, endpoint, data = null) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const config = {
        method,
        url,
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`Oracle service error (${method} ${endpoint}):`, error.message);
      
      // Return mock data if oracle is not available
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        console.warn('Oracle service unavailable, returning mock data');
        return this.getMockResponse(endpoint);
      }
      
      throw error;
    }
  }

  getMockResponse(endpoint) {
    if (endpoint.includes('/consensus')) {
      return {
        consensus: [],
        totalNodes: 5,
        activeNodes: 5
      };
    }
    
    if (endpoint.includes('/nodes')) {
      return {
        nodes: [],
        totalNodes: 5,
        activeNodes: 5
      };
    }
    
    if (endpoint.includes('/health')) {
      return {
        status: 'unavailable',
        timestamp: new Date().toISOString(),
        activeNodes: 0,
        totalNodes: 5
      };
    }
    
    return { success: false, error: 'Oracle service unavailable' };
  }

  async processWeatherData(weatherData) {
    const result = await this.makeRequest('POST', '/api/oracle/data', {
      source: 'backend',
      data: weatherData.data || weatherData,
      timestamp: new Date().toISOString()
    });
    return result;
  }

  async getConsensusHistory(limit = 10) {
    const result = await this.makeRequest('GET', `/api/oracle/consensus?limit=${limit}`);
    return result;
  }

  async getOracleNodes() {
    const result = await this.makeRequest('GET', '/api/oracle/nodes');
    return result;
  }

  async checkOracleHealth() {
    const result = await this.makeRequest('GET', '/api/oracle/health');
    return result;
  }

  async simulateWeatherEvent(eventType, intensity = 5) {
    const result = await this.makeRequest('POST', '/api/oracle/simulate', {
      eventType,
      intensity
    });
    return result;
  }

  async getWeatherData() {
    const result = await this.makeRequest('GET', '/api/oracle/weather');
    return result;
  }
}

module.exports = new OracleService();

