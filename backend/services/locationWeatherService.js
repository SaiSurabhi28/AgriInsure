/**
 * Location-Based Weather Service
 * 
 * Provides location-based weather recommendations for policy creation
 * Uses historical weather data to suggest optimal trigger thresholds
 */

const moment = require('moment');

class LocationWeatherService {
  constructor() {
    // Major agricultural regions in India with average weather data
    this.regions = {
      'andhra-pradesh': {
        name: 'Andhra Pradesh',
        avgRainfall: 125,
        avgSoilMoisture: 65,
        avgTemperature: 28,
        rainfallVariability: 35,
        season: 'June-September'
      },
      'karnataka': {
        name: 'Karnataka',
        avgRainfall: 120,
        avgSoilMoisture: 60,
        avgTemperature: 27,
        rainfallVariability: 40,
        season: 'June-September'
      },
      'tamil-nadu': {
        name: 'Tamil Nadu',
        avgRainfall: 95,
        avgSoilMoisture: 55,
        avgTemperature: 30,
        rainfallVariability: 30,
        season: 'October-December'
      },
      'maharashtra': {
        name: 'Maharashtra',
        avgRainfall: 140,
        avgSoilMoisture: 70,
        avgTemperature: 29,
        rainfallVariability: 45,
        season: 'June-September'
      },
      'uttar-pradesh': {
        name: 'Uttar Pradesh',
        avgRainfall: 110,
        avgSoilMoisture: 62,
        avgTemperature: 26,
        rainfallVariability: 40,
        season: 'July-September'
      },
      'punjab': {
        name: 'Punjab',
        avgRainfall: 70,
        avgSoilMoisture: 50,
        avgTemperature: 24,
        rainfallVariability: 30,
        season: 'July-August'
      },
      'haryana': {
        name: 'Haryana',
        avgRainfall: 65,
        avgSoilMoisture: 45,
        avgTemperature: 25,
        rainfallVariability: 25,
        season: 'July-September'
      },
      'rajasthan': {
        name: 'Rajasthan',
        avgRainfall: 45,
        avgSoilMoisture: 35,
        avgTemperature: 32,
        rainfallVariability: 20,
        season: 'July-September'
      },
      'gujarat': {
        name: 'Gujarat',
        avgRainfall: 80,
        avgSoilMoisture: 48,
        avgTemperature: 31,
        rainfallVariability: 35,
        season: 'June-September'
      },
      'west-bengal': {
        name: 'West Bengal',
        avgRainfall: 175,
        avgSoilMoisture: 80,
        avgTemperature: 28,
        rainfallVariability: 50,
        season: 'June-September'
      },
      'bihar': {
        name: 'Bihar',
        avgRainfall: 135,
        avgSoilMoisture: 72,
        avgTemperature: 28,
        rainfallVariability: 45,
        season: 'June-September'
      },
      'odisha': {
        name: 'Odisha',
        avgRainfall: 155,
        avgSoilMoisture: 75,
        avgTemperature: 29,
        rainfallVariability: 50,
        season: 'June-September'
      },
      'kerela': {
        name: 'Kerela',
        avgRainfall: 230,
        avgSoilMoisture: 85,
        avgTemperature: 28,
        rainfallVariability: 60,
        season: 'June-November'
      },
      'telangana': {
        name: 'Telangana',
        avgRainfall: 115,
        avgSoilMoisture: 58,
        avgTemperature: 29,
        rainfallVariability: 35,
        season: 'June-September'
      },
      'madhya-pradesh': {
        name: 'Madhya Pradesh',
        avgRainfall: 130,
        avgSoilMoisture: 65,
        avgTemperature: 27,
        rainfallVariability: 40,
        season: 'June-September'
      },
      'other': {
        name: 'Other Region',
        avgRainfall: 100,
        avgSoilMoisture: 60,
        avgTemperature: 28,
        rainfallVariability: 35,
        season: 'June-September'
      }
    };
  }

  /**
   * Get all available regions
   */
  getAllRegions() {
    return Object.entries(this.regions).map(([key, data]) => ({
      id: key,
      ...data
    }));
  }

  /**
   * Get location-specific weather recommendations
   */
  getLocationRecommendations(locationId, durationDays = 14) {
    const region = this.regions[locationId];
    
    if (!region) {
      return {
        success: false,
        error: 'Location not found'
      };
    }

    // Calculate recommended threshold based on location and duration
    const avgRainfall = region.avgRainfall;
    const variability = region.rainfallVariability;
    
    // Conservative recommendation: 30% below average for dry conditions
    const conservativeThreshold = Math.round(avgRainfall * 0.7);
    
    // Moderate recommendation: 40% below average (balanced risk)
    const moderateThreshold = Math.round(avgRainfall * 0.6);
    
    // Aggressive recommendation: 50% below average (higher risk, lower premium)
    const aggressiveThreshold = Math.round(avgRainfall * 0.5);

    // Adjust for policy duration (longer policies need higher thresholds)
    const durationFactor = durationDays / 14; // Normalize to 14 days
    const adjustedConservative = Math.round(conservativeThreshold * durationFactor);
    const adjustedModerate = Math.round(moderateThreshold * durationFactor);
    const adjustedAggressive = Math.round(aggressiveThreshold * durationFactor);

    // Calculate ideal threshold (recommended)
    const idealThreshold = adjustedModerate;

    return {
      success: true,
      region: {
        name: region.name,
        season: region.season
      },
      weatherData: {
        averageRainfall: avgRainfall,
        averageSoilMoisture: region.avgSoilMoisture,
        averageTemperature: region.avgTemperature,
        rainfallVariability: variability
      },
      recommendations: {
        ideal: idealThreshold,
        conservative: adjustedConservative,
        moderate: adjustedModerate,
        aggressive: adjustedAggressive
      },
      analysis: {
        riskLevel: this.calculateRiskLevel(idealThreshold, avgRainfall, variability),
        confidence: this.calculateConfidence(locationId),
        droughtProbability: this.calculateDroughtProbability(idealThreshold, avgRainfall),
        suggestedProducts: this.suggestProducts(region, durationDays)
      },
      explanation: {
        ideal: `Set at ${idealThreshold}mm based on ${avgRainfall}mm average rainfall for ${durationDays} days. Good balance between protection and premium cost.`,
        conservative: `Set at ${adjustedConservative}mm for maximum protection. Higher premium but lower risk.`,
        aggressive: `Set at ${adjustedAggressive}mm for lower premium. Higher risk threshold.`
      }
    };
  }

  /**
   * Calculate risk level for a threshold
   */
  calculateRiskLevel(threshold, avgRainfall, variability) {
    const percentOfAverage = (threshold / avgRainfall) * 100;
    
    if (percentOfAverage > 80) return 'High Risk';
    if (percentOfAverage > 60) return 'Medium Risk';
    if (percentOfAverage > 40) return 'Low Risk';
    return 'Very Low Risk';
  }

  /**
   * Calculate confidence level
   */
  calculateConfidence(locationId) {
    if (this.regions[locationId].rainfallVariability < 30) return 'Very High';
    if (this.regions[locationId].rainfallVariability < 40) return 'High';
    if (this.regions[locationId].rainfallVariability < 50) return 'Medium';
    return 'Low';
  }

  /**
   * Calculate drought probability
   */
  calculateDroughtProbability(threshold, avgRainfall) {
    const deficit = avgRainfall - threshold;
    const percentDeficit = (deficit / avgRainfall) * 100;
    
    if (percentDeficit > 40) return 'Low (15-20%)';
    if (percentDeficit > 30) return 'Medium (25-30%)';
    if (percentDeficit > 20) return 'Medium-High (30-40%)';
    return 'High (40%+)';
  }

  /**
   * Suggest suitable insurance products
   */
  suggestProducts(region, durationDays) {
    const suggestions = [];
    
    // Based on rainfall patterns
    if (region.avgRainfall > 150) {
      suggestions.push('High rainfall region - Consider longer duration policies');
    } else if (region.avgRainfall < 80) {
      suggestions.push('Lower rainfall region - Lower thresholds work well');
    }
    
    // Based on variability
    if (region.rainfallVariability > 45) {
      suggestions.push('High variability - Conservative threshold recommended');
    }
    
    // Based on duration
    if (durationDays > 30) {
      suggestions.push('Long duration policy - Higher threshold balances premium');
    }
    
    return suggestions;
  }

  /**
   * Get recommended crop types for a region
   */
  getRecommendedCrops(locationId) {
    const region = this.regions[locationId];
    if (!region) return [];

    const cropMapping = {
      'andhra-pradesh': ['rice', 'cotton', 'sugarcane', 'chickpea'],
      'karnataka': ['jowar', 'maize', 'cotton', 'coffee'],
      'tamil-nadu': ['rice', 'sugarcane', 'cotton', 'coconut'],
      'maharashtra': ['wheat', 'cotton', 'sugarcane', 'mungbean'],
      'uttar-pradesh': ['wheat', 'rice', 'sugarcane', 'pigeonpeas'],
      'punjab': ['wheat', 'rice', 'cotton', 'maize'],
      'haryana': ['wheat', 'rice', 'cotton', 'maize'],
      'rajasthan': ['wheat', 'millet', 'chickpea', 'mustard'],
      'gujarat': ['cotton', 'groundnut', 'wheat', 'tobacco'],
      'west-bengal': ['rice', 'jute', 'potato', 'pulses'],
      'bihar': ['wheat', 'rice', 'maize', 'pulses'],
      'odisha': ['rice', 'pulses', 'oilseeds', 'maize'],
      'kerela': ['coconut', 'rubber', 'tea', 'coffee'],
      'telangana': ['cotton', 'rice', 'maize', 'pulses'],
      'madhya-pradesh': ['wheat', 'rice', 'soybean', 'pulses'],
      'other': ['wheat', 'rice', 'maize', 'cotton']
    };

    return cropMapping[locationId] || cropMapping['other'];
  }
}

module.exports = LocationWeatherService;

