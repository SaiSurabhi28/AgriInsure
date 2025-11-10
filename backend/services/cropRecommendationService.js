/**
 * Crop Recommendation Service
 * 
 * Recommends optimal crops based on environmental conditions using machine learning dataset.
 * Features: 22 crop types, considers N/P/K, temperature, humidity, pH, rainfall
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

class CropRecommendationService {
  constructor() {
    this.datasetPath = path.join(__dirname, '../../Crop_recommendation.csv');
    this.cropData = [];
    this.loaded = false;
    this.loadDataset();
  }

  /**
   * Load crop recommendation dataset from CSV
   */
  loadDataset() {
    if (this.loaded) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(this.datasetPath)
        .pipe(csv())
        .on('data', (row) => {
          // Skip the header row
          if (row.label !== 'label') {
            this.cropData.push({
              n: parseFloat(row.N),
              p: parseFloat(row.P),
              k: parseFloat(row.K),
              temperature: parseFloat(row.temperature),
              humidity: parseFloat(row.humidity),
              ph: parseFloat(row.ph),
              rainfall: parseFloat(row.rainfall),
              label: row.label
            });
          }
        })
        .on('end', () => {
          this.loaded = true;
          console.log(`✅ Loaded ${this.cropData.length} crop recommendations`);
          resolve();
        })
        .on('error', (error) => {
          console.error('Error loading crop dataset:', error);
          this.loaded = true; // Mark as loaded to prevent retry loop
          resolve(); // Resolve anyway, will return empty recommendations
        });
    });
  }

  /**
   * Calculate distance between two data points (Euclidean distance)
   */
  calculateDistance(point1, point2) {
    const nDiff = Math.pow(point1.n - point2.n, 2);
    const pDiff = Math.pow(point1.p - point2.p, 2);
    const kDiff = Math.pow(point1.k - point2.k, 2);
    const tempDiff = Math.pow(point1.temperature - point2.temperature, 2);
    const humidDiff = Math.pow(point1.humidity - point2.humidity, 2);
    const phDiff = Math.pow(point1.ph - point2.ph, 2);
    const rainDiff = Math.pow(point1.rainfall - point2.rainfall, 2);
    
    return Math.sqrt(nDiff + pDiff + kDiff + tempDiff + humidDiff + phDiff + rainDiff);
  }

  /**
   * Get crop recommendations based on environmental conditions
   * Uses K-Nearest Neighbors (KNN) algorithm
   */
  async getRecommendations(conditions, topN = 5) {
    await this.loadDataset();
    
    if (!this.loaded || this.cropData.length === 0) {
      return {
        success: false,
        error: 'Dataset not loaded'
      };
    }

    // Validate input conditions
    if (!conditions || typeof conditions !== 'object') {
      return {
        success: false,
        error: 'Invalid conditions provided'
      };
    }

    // Normalize input conditions (in case some are missing)
    const normalizedConditions = {
      n: conditions.n || 0,
      p: conditions.p || 0,
      k: conditions.k || 0,
      temperature: conditions.temperature || 0,
      humidity: conditions.humidity || 0,
      ph: conditions.ph || 7,
      rainfall: conditions.rainfall || 0
    };

    // Calculate distances from all data points
    const distances = this.cropData.map((crop, index) => ({
      index,
      label: crop.label,
      distance: this.calculateDistance(normalizedConditions, crop)
    }));

    // Sort by distance (closest first)
    distances.sort((a, b) => a.distance - b.distance);

    // Use KNN with k=10 to find most common crops among nearest neighbors
    const k = Math.min(10, distances.length);
    const nearestNeighbors = distances.slice(0, k);
    
    // Count occurrences of each crop among nearest neighbors
    const cropCounts = {};
    nearestNeighbors.forEach(neighbor => {
      cropCounts[neighbor.label] = (cropCounts[neighbor.label] || 0) + 1;
    });

    // Sort crops by frequency
    const sortedCrops = Object.entries(cropCounts)
      .map(([label, count]) => ({
        crop: label,
        confidence: (count / k * 100).toFixed(2),
        count: count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, topN);

    // Get average conditions for the recommended crop
    const recommendations = sortedCrops.map(rec => {
      const cropExamples = this.cropData.filter(c => c.label === rec.crop);
      const avg = this.calculateAverageConditions(cropExamples);
      
      return {
        crop: rec.crop,
        confidence: rec.confidence + '%',
        matchScore: rec.count,
        averageConditions: avg,
        suitability: this.calculateSuitability(normalizedConditions, avg)
      };
    });

    return {
      success: true,
      inputConditions: normalizedConditions,
      recommendations: recommendations,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate average conditions for a crop
   */
  calculateAverageConditions(cropExamples) {
    if (cropExamples.length === 0) return {};
    
    const sum = cropExamples.reduce((acc, crop) => {
      acc.n += crop.n;
      acc.p += crop.p;
      acc.k += crop.k;
      acc.temperature += crop.temperature;
      acc.humidity += crop.humidity;
      acc.ph += crop.ph;
      acc.rainfall += crop.rainfall;
      return acc;
    }, { n: 0, p: 0, k: 0, temperature: 0, humidity: 0, ph: 0, rainfall: 0 });

    const avg = {};
    Object.keys(sum).forEach(key => {
      avg[key] = (sum[key] / cropExamples.length).toFixed(2);
    });

    return avg;
  }

  /**
   * Calculate how well current conditions match recommended crop conditions
   */
  calculateSuitability(current, average) {
    const factors = ['temperature', 'humidity', 'ph', 'rainfall'];
    let totalDeviation = 0;
    let factorCount = 0;

    factors.forEach(factor => {
      if (current[factor] && average[factor]) {
        const currentVal = parseFloat(current[factor]);
        const avgVal = parseFloat(average[factor]);
        const deviation = Math.abs(currentVal - avgVal) / avgVal; // Normalized deviation
        totalDeviation += Math.min(deviation, 1); // Cap at 100%
        factorCount++;
      }
    });

    if (factorCount === 0) return 'unknown';
    
    const avgDeviation = (totalDeviation / factorCount) * 100;
    
    if (avgDeviation < 10) return 'excellent';
    if (avgDeviation < 25) return 'good';
    if (avgDeviation < 50) return 'fair';
    return 'poor';
  }

  /**
   * Get crop statistics
   */
  async getCropStats() {
    await this.loadDataset();
    
    if (!this.loaded || this.cropData.length === 0) {
      return { success: false, error: 'Dataset not loaded' };
    }

    const cropCounts = {};
    this.cropData.forEach(crop => {
      cropCounts[crop.label] = (cropCounts[crop.label] || 0) + 1;
    });

    const stats = Object.entries(cropCounts).map(([crop, count]) => ({
      crop,
      sampleCount: count,
      percentage: ((count / this.cropData.length) * 100).toFixed(2)
    }));

    return {
      success: true,
      totalSamples: this.cropData.length,
      uniqueCrops: Object.keys(cropCounts).length,
      crops: stats.sort((a, b) => b.sampleCount - a.sampleCount)
    };
  }

  /**
   * Get list of all available crops
   */
  async getAllCrops() {
    await this.loadDataset();
    
    if (!this.loaded || this.cropData.length === 0) {
      return { success: false, error: 'Dataset not loaded' };
    }

    const uniqueCrops = [...new Set(this.cropData.map(c => c.label))];
    return {
      success: true,
      totalCrops: uniqueCrops.length,
      crops: uniqueCrops.sort()
    };
  }

  async getRandomSample() {
    await this.loadDataset();
    
    if (!this.loaded || this.cropData.length === 0) {
      return null;
    }

    const sample = this.cropData[Math.floor(Math.random() * this.cropData.length)];
    return { ...sample };
  }
}

module.exports = CropRecommendationService;

