/**
 * Location-Based Weather Service
 * 
 * Provides location-based weather recommendations for policy creation
 * Uses historical weather data to suggest optimal trigger thresholds
 */

const moment = require('moment');
const datasetWeatherService = require('./datasetWeatherService');

class LocationWeatherService {
  constructor() {
    this.regions = [
      {
        id: 'basel',
        name: 'Basel, Switzerland',
        country: 'Switzerland',
        coordinates: { lat: 47.5596, lng: 7.5886 },
        rainfallProfile: 'Moderate rainfall with seasonal variation. Ideal for wheat and barley.',
        recommendedThresholds: { ideal: 55, conservative: 70, aggressive: 45 }
      },
      {
        id: 'budapest',
        name: 'Budapest, Hungary',
        country: 'Hungary',
        coordinates: { lat: 47.4979, lng: 19.0402 },
        rainfallProfile: 'Continental climate with rainy late spring and early summer.',
        recommendedThresholds: { ideal: 60, conservative: 80, aggressive: 47 }
      },
      {
        id: 'de',
        name: 'De Bilt, Netherlands',
        country: 'Netherlands',
        coordinates: { lat: 52.0907, lng: 5.1214 },
        rainfallProfile: 'Maritime climate; consistent rainfall year-round.',
        recommendedThresholds: { ideal: 65, conservative: 85, aggressive: 55 }
      },
      {
        id: 'dresden',
        name: 'Dresden, Germany',
        country: 'Germany',
        coordinates: { lat: 51.0504, lng: 13.7373 },
        rainfallProfile: 'Moderate continental influence with frequent showers.',
        recommendedThresholds: { ideal: 62, conservative: 80, aggressive: 50 }
      },
      {
        id: 'dusseldorf',
        name: 'Düsseldorf, Germany',
        country: 'Germany',
        coordinates: { lat: 51.2277, lng: 6.7735 },
        rainfallProfile: 'Mild maritime climate with consistent rainfall.',
        recommendedThresholds: { ideal: 68, conservative: 88, aggressive: 56 }
      },
      {
        id: 'heathrow',
        name: 'Heathrow, United Kingdom',
        country: 'United Kingdom',
        coordinates: { lat: 51.4700, lng: -0.4543 },
        rainfallProfile: 'Atlantic influence; mild temperatures and steady precipitation.',
        recommendedThresholds: { ideal: 58, conservative: 75, aggressive: 48 }
      },
      {
        id: 'kassel',
        name: 'Kassel, Germany',
        country: 'Germany',
        coordinates: { lat: 51.3127, lng: 9.4797 },
        rainfallProfile: 'Cool summers and rainy winters; suitable for cereals and rapeseed.',
        recommendedThresholds: { ideal: 66, conservative: 85, aggressive: 52 }
      },
      {
        id: 'ljubljana',
        name: 'Ljubljana, Slovenia',
        country: 'Slovenia',
        coordinates: { lat: 46.0569, lng: 14.5058 },
        rainfallProfile: 'Mediterranean and Alpine mix; higher rainfall in autumn.',
        recommendedThresholds: { ideal: 72, conservative: 90, aggressive: 60 }
      },
      {
        id: 'maastricht',
        name: 'Maastricht, Netherlands',
        country: 'Netherlands',
        coordinates: { lat: 50.8514, lng: 5.6900 },
        rainfallProfile: 'Mild maritime climate; rainy afternoons in summer months.',
        recommendedThresholds: { ideal: 62, conservative: 80, aggressive: 52 }
      },
      {
        id: 'malmo',
        name: 'Malmö, Sweden',
        country: 'Sweden',
        coordinates: { lat: 55.6050, lng: 13.0038 },
        rainfallProfile: 'Cool summers; rainfall peaks in late summer.',
        recommendedThresholds: { ideal: 50, conservative: 65, aggressive: 40 }
      },
      {
        id: 'montelimar',
        name: 'Montélimar, France',
        country: 'France',
        coordinates: { lat: 44.5580, lng: 4.7500 },
        rainfallProfile: 'Mediterranean climate with dry summers and wet autumns.',
        recommendedThresholds: { ideal: 40, conservative: 55, aggressive: 30 }
      },
      {
        id: 'muenchen',
        name: 'Munich, Germany',
        country: 'Germany',
        coordinates: { lat: 48.1351, lng: 11.5820 },
        rainfallProfile: 'Alpine foothills cause frequent summer storms.',
        recommendedThresholds: { ideal: 75, conservative: 95, aggressive: 60 }
      },
      {
        id: 'oslo',
        name: 'Oslo, Norway',
        country: 'Norway',
        coordinates: { lat: 59.9139, lng: 10.7522 },
        rainfallProfile: 'Cool, wet climate with peak rainfall in autumn.',
        recommendedThresholds: { ideal: 65, conservative: 85, aggressive: 52 }
      },
      {
        id: 'perpignan',
        name: 'Perpignan, France',
        country: 'France',
        coordinates: { lat: 42.6887, lng: 2.8948 },
        rainfallProfile: 'Mediterranean climate; drier summers, rainier autumns.',
        recommendedThresholds: { ideal: 45, conservative: 60, aggressive: 35 }
      },
      {
        id: 'roma',
        name: 'Rome, Italy',
        country: 'Italy',
        coordinates: { lat: 41.9028, lng: 12.4964 },
        rainfallProfile: 'Warm Mediterranean climate with winter rainfall concentration.',
        recommendedThresholds: { ideal: 50, conservative: 70, aggressive: 40 }
      },
      {
        id: 'sonnblick',
        name: 'Sonnblick, Austria',
        country: 'Austria',
        coordinates: { lat: 47.0550, lng: 12.9583 },
        rainfallProfile: 'High Alpine station with heavy snowfall and significant rainfall.',
        recommendedThresholds: { ideal: 90, conservative: 110, aggressive: 70 }
      },
      {
        id: 'stockholm',
        name: 'Stockholm, Sweden',
        country: 'Sweden',
        coordinates: { lat: 59.3293, lng: 18.0686 },
        rainfallProfile: 'Cool climate; rainfall peaks in July–August.',
        recommendedThresholds: { ideal: 55, conservative: 72, aggressive: 45 }
      },
      {
        id: 'tours',
        name: 'Tours, France',
        country: 'France',
        coordinates: { lat: 47.3941, lng: 0.6848 },
        rainfallProfile: 'Temperate oceanic climate with evenly distributed rainfall.',
        recommendedThresholds: { ideal: 58, conservative: 75, aggressive: 48 }
      }
    ];
  }

  /**
   * Get all available regions
   */
  getAllRegions() {
    return this.regions;
  }

  /**
   * Get a specific region by ID
   */
  getRegionById(id) {
    return this.regions.find(region => region.id === id);
  }

  /**
   * Get location-specific weather recommendations
   */
  async getLocationRecommendations(locationId, durationDays = 14) {
    const region = this.getRegionById(locationId);
    if (!region) {
      return {
        success: false,
        message: 'Region not found'
      };
    }

    const stationStats = await datasetWeatherService.getStationStats();
    const stationInfo = stationStats.find(node => node.nodeId === region.id);

    const toMillimetres = (value) => (typeof value === 'number' ? value * 10 : null);

    const rainfallSamples = stationStats
      .map(node => toMillimetres(node.averages?.rainfallMm))
      .filter(value => typeof value === 'number');
    const overallAverage = rainfallSamples.length
      ? rainfallSamples.reduce((sum, value) => sum + value, 0) / rainfallSamples.length
      : 60;

    const avgRainfall = toMillimetres(stationInfo?.averages?.rainfallMm) ?? overallAverage;
    const variability = toMillimetres(stationInfo?.averageDeviationMm) ?? 10;
    const accuracy = stationInfo?.accuracy ?? 50;

    const duration = Math.max(1, durationDays || 14);
    const expectedRainfall = avgRainfall * duration;
    const expectedVariability = variability * Math.sqrt(duration);

    const recommendations = {
      ideal: region.recommendedThresholds.ideal,
      conservative: region.recommendedThresholds.conservative,
      aggressive: region.recommendedThresholds.aggressive
    };

    const explanation = {
      ideal: `Aligns with ${expectedRainfall.toFixed(1)} mm expected over ${duration} day(s) in ${region.name}.`,
      conservative: 'Higher threshold to minimise payout triggers during wetter periods.',
      aggressive: 'Lower threshold for drought-sensitive crops or higher risk appetite.'
    };

    const analysis = {
      rainfallAverage: expectedRainfall,
      climateProfile: region.rainfallProfile,
      riskLevel: this.calculateRiskLevel(recommendations.ideal, expectedRainfall, expectedVariability),
      confidence: accuracy >= 75 ? 'High' : accuracy >= 55 ? 'Medium' : 'Low',
      suggestedCrops: this.getRecommendedCrops(locationId),
      datasetCoverage: stationInfo?.coveragePercent ?? (rainfallSamples.length ? 100 : 0)
    };

    return {
      success: true,
      region,
      recommendations,
      explanation,
      analysis,
      datasetSource: 'European Climate Assessment & Dataset (ECA&D)'
    };
  }

  /**
   * Calculate risk level for a threshold
   */
  calculateRiskLevel(threshold, avgRainfall, variability) {
    if (!avgRainfall || avgRainfall <= 0) {
      return 'Insufficient data';
    }

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
    // This method is no longer directly applicable as regions are now objects
    // Keeping it for now, but it will always return 'Low'
    return 'Low';
  }

  /**
   * Calculate drought probability
   */
  calculateDroughtProbability(threshold, avgRainfall) {
    if (!avgRainfall || avgRainfall <= 0) {
      return 'Unknown';
    }

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
    const region = this.getRegionById(locationId);
    if (!region) return [];

    const cropMapping = {
      basel: ['Wheat', 'Barley', 'Rapeseed'],
      budapest: ['Maize', 'Sunflower', 'Wheat'],
      de: ['Potatoes', 'Sugar Beet', 'Rye'],
      dresden: ['Winter Wheat', 'Barley', 'Canola'],
      dusseldorf: ['Silage Maize', 'Winter Wheat', 'Pasture grasses'],
      heathrow: ['Winter Wheat', 'Barley', 'Oilseed Rape'],
      kassel: ['Rapeseed', 'Winter Wheat', 'Forage grasses'],
      ljubljana: ['Corn', 'Vineyards', 'Barley'],
      maastricht: ['Sugar Beet', 'Barley', 'Potatoes'],
      malmo: ['Spring Barley', 'Oats', 'Rapeseed'],
      montelimar: ['Vines', 'Olives', 'Lavender'],
      muenchen: ['Maize', 'Barley', 'Hops'],
      oslo: ['Barley', 'Potatoes', 'Forage grasses'],
      perpignan: ['Vines', 'Stone Fruits', 'Vegetables'],
      roma: ['Olives', 'Grapes', 'Citrus'],
      sonnblick: ['Alpine pasture', 'Hay meadows'],
      stockholm: ['Spring Wheat', 'Oats', 'Canola'],
      tours: ['Wheat', 'Sunflower', 'Sugar Beet']
    };

    return cropMapping[locationId] || this._suggestCrops(60);
  }

  _suggestCrops(avgRainfall) {
    if (avgRainfall >= 70) {
      return ['Barley', 'Potatoes', 'Pasture grasses'];
    }
    if (avgRainfall >= 55) {
      return ['Wheat', 'Rapeseed', 'Sugar beets'];
    }
    return ['Sunflower', 'Olives', 'Grapes'];
  }
}

module.exports = LocationWeatherService;

