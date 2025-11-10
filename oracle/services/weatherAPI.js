const axios = require('axios');

/**
 * Real-World Weather Data Integration
 * 
 * Fetches actual weather data from OpenWeatherMap API
 * Falls back to simulated data if API unavailable
 */

class WeatherAPIService {
  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY || null;
    this.baseURL = 'https://api.openweathermap.org/data/2.5';
    this.lastFetchTime = null;
    this.cacheDuration = 60; // Cache for 60 seconds
    this.cachedData = null;
    
    // Default test location (can be overridden)
    this.defaultLat = 20.5937; // India coordinates
    this.defaultLon = 78.9629;
  }

  /**
   * Get current weather data from OpenWeatherMap
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<Object>} Weather data
   */
  async getCurrentWeather(lat = this.defaultLat, lon = this.defaultLon) {
    try {
      // Check cache first
      if (this.isCacheValid()) {
        console.log('📦 Using cached weather data');
        return this.cachedData;
      }

      // If no API key, return simulated data
      if (!this.apiKey) {
        console.log('⚠️ No OpenWeatherMap API key. Using simulated data.');
        return this.generateSimulatedWeatherData();
      }

      // Fetch from OpenWeatherMap
      const response = await axios.get(`${this.baseURL}/weather`, {
        params: {
          lat: lat,
          lon: lon,
          appid: this.apiKey,
          units: 'metric' // Celsius and mm
        },
        timeout: 5000 // 5 second timeout
      });

      const data = response.data;
      
      // Transform OpenWeatherMap data to our format
      const transformedData = {
        timestamp: Date.now(),
        location: {
          lat: data.coord.lat,
          lon: data.coord.lon,
          city: data.name,
          country: data.sys.country
        },
        rainfall: this.extractRainfall(data),
        temperature: data.main.temp,
        humidity: data.main.humidity,
        windSpeed: data.wind?.speed || 0,
        windDirection: data.wind?.deg || 0,
        pressure: data.main.pressure,
        conditions: data.weather[0].description,
        icon: data.weather[0].icon,
        source: 'openweathermap'
      };

      // Cache the data
      this.cachedData = transformedData;
      this.lastFetchTime = Date.now();

      console.log('✅ Fetched real weather data from OpenWeatherMap');
      return transformedData;

    } catch (error) {
      console.error('❌ Error fetching weather from OpenWeatherMap:', error.message);
      
      // Fallback to simulated data
      console.log('⚠️ Falling back to simulated weather data');
      return this.generateSimulatedWeatherData();
    }
  }

  /**
   * Get rainfall forecast for multiple days
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {number} days - Number of forecast days (max 5)
   * @returns {Promise<Array>} Forecast data
   */
  async getForecast(lat = this.defaultLat, lon = this.defaultLon, days = 5) {
    try {
      if (!this.apiKey) {
        return this.generateSimulatedForecast(days);
      }

      const response = await axios.get(`${this.baseURL}/forecast`, {
        params: {
          lat: lat,
          lon: lon,
          appid: this.apiKey,
          units: 'metric',
          cnt: days * 8 // 8 forecasts per day (3-hour intervals)
        },
        timeout: 5000
      });

      const forecasts = response.data.list.map(item => ({
        timestamp: item.dt * 1000,
        rainfall: this.extractRainfall(item),
        temperature: item.main.temp,
        humidity: item.main.humidity,
        windSpeed: item.wind?.speed || 0,
        conditions: item.weather[0].description,
        date: new Date(item.dt * 1000).toISOString()
      }));

      console.log(`✅ Fetched ${forecasts.length} forecast points from OpenWeatherMap`);
      return forecasts;

    } catch (error) {
      console.error('❌ Error fetching forecast:', error.message);
      return this.generateSimulatedForecast(days);
    }
  }

  /**
   * Extract rainfall from OpenWeatherMap data
   * Note: Free tier doesn't include detailed rainfall, so we estimate
   */
  extractRainfall(data) {
    // If rain object exists, use it
    if (data.rain) {
      return data.rain['1h'] || data.rain['3h'] || 0;
    }

    // Estimate rainfall based on weather conditions
    if (data.weather && data.weather[0]) {
      const condition = data.weather[0].main.toLowerCase();
      const description = data.weather[0].description.toLowerCase();

      if (condition === 'rain') {
        if (description.includes('heavy') || description.includes('extreme')) {
          return 15 + Math.random() * 10; // 15-25mm
        } else if (description.includes('light') || description.includes('drizzle')) {
          return 1 + Math.random() * 2; // 1-3mm
        } else {
          return 5 + Math.random() * 5; // 5-10mm
        }
      } else if (condition === 'thunderstorm') {
        return 20 + Math.random() * 15; // 20-35mm
      } else if (condition === 'snow') {
        // Convert snow to equivalent rainfall (1mm snow ≈ 0.1mm rain)
        return 0.5 + Math.random() * 1;
      }
    }

    return 0; // No rain
  }

  /**
   * Generate simulated weather data for testing
   */
  generateSimulatedWeatherData() {
    return {
      timestamp: Date.now(),
      location: {
        lat: this.defaultLat,
        lon: this.defaultLon,
        city: 'Simulated Location',
        country: 'IN'
      },
      rainfall: 10 + (Math.random() * 20 - 10), // 0-20mm
      temperature: 20 + (Math.random() * 15), // 20-35°C
      humidity: 60 + (Math.random() * 30), // 60-90%
      windSpeed: Math.random() * 10, // 0-10 m/s
      windDirection: Math.random() * 360,
      pressure: 1013 + (Math.random() * 10 - 5), // 1008-1018 hPa
      conditions: 'partly cloudy',
      icon: '02d',
      source: 'simulated'
    };
  }

  /**
   * Generate simulated forecast
   */
  generateSimulatedForecast(days) {
    const forecasts = [];
    const now = Date.now();

    for (let i = 0; i < days; i++) {
      for (let j = 0; j < 8; j++) {
        const timestamp = now + (i * 86400000) + (j * 10800000); // 3-hour intervals
        
        forecasts.push({
          timestamp: timestamp,
          rainfall: Math.random() * 15, // 0-15mm
          temperature: 20 + (Math.random() * 15),
          humidity: 60 + (Math.random() * 30),
          windSpeed: Math.random() * 10,
          conditions: 'variable',
          date: new Date(timestamp).toISOString(),
          source: 'simulated'
        });
      }
    }

    return forecasts;
  }

  /**
   * Check if cached data is still valid
   */
  isCacheValid() {
    if (!this.cachedData || !this.lastFetchTime) {
      return false;
    }

    const ageSeconds = (Date.now() - this.lastFetchTime) / 1000;
    return ageSeconds < this.cacheDuration;
  }

  /**
   * Get historical weather data (requires paid API)
   * Returns simulated data for free tier
   */
  async getHistoricalWeather(lat, lon, date) {
    // For free tier, generate simulated historical data
    return {
      timestamp: new Date(date).getTime(),
      rainfall: 5 + Math.random() * 10,
      temperature: 20 + Math.random() * 15,
      humidity: 60 + Math.random() * 30,
      source: 'simulated'
    };
  }

  /**
   * Validate API key
   */
  async validateAPIKey() {
    if (!this.apiKey) {
      return { valid: false, message: 'No API key configured' };
    }

    try {
      const response = await axios.get(`${this.baseURL}/weather`, {
        params: {
          lat: this.defaultLat,
          lon: this.defaultLon,
          appid: this.apiKey,
          units: 'metric'
        },
        timeout: 5000
      });

      return { valid: true, message: 'API key is valid' };
    } catch (error) {
      if (error.response && error.response.status === 401) {
        return { valid: false, message: 'Invalid API key' };
      }
      return { valid: false, message: `API error: ${error.message}` };
    }
  }
}

module.exports = WeatherAPIService;

