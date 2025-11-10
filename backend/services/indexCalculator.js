/**
 * Multi-Parameter Insurance Index Calculator
 * 
 * Calculates composite risk index from multiple weather parameters:
 * - Rainfall deficit
 * - Temperature stress (heat/cold)
 * - Soil moisture deficit
 * - Wind damage risk
 */

class IndexCalculator {
  /**
   * Normalize rainfall to 0-100 scale
   * @param {number} actualRainfall - Actual rainfall in mm
   * @param {number} expectedRainfall - Expected rainfall in mm
   * @returns {number} Score (0-100)
   */
  normalizeRainfall(actualRainfall, expectedRainfall) {
    if (expectedRainfall === 0) {
      return 100; // No expected rain = no risk
    }
    
    const ratio = (actualRainfall / expectedRainfall) * 100;
    return Math.max(0, Math.min(100, ratio));
  }

  /**
   * Calculate temperature stress score
   * @param {number} temperature - Current temperature in Celsius
   * @param {number} optimalMin - Optimal minimum temperature
   * @param {number} optimalMax - Optimal maximum temperature
   * @param {number} thresholdMin - Threshold for cold stress
   * @param {number} thresholdMax - Threshold for heat stress
   * @returns {number} Score (0-100)
   */
  calculateTempStress(temperature, optimalMin, optimalMax, thresholdMin, thresholdMax) {
    // Optimal range: perfect score
    if (temperature >= optimalMin && temperature <= optimalMax) {
      return 100;
    }
    
    // Cold stress
    if (temperature < optimalMin) {
      const range = optimalMin - thresholdMin;
      if (range <= 0) return 0;
      
      const distance = optimalMin - temperature;
      const stress = ((range - distance) / range) * 100;
      return Math.max(0, stress);
    }
    
    // Heat stress
    if (temperature > optimalMax) {
      const range = thresholdMax - optimalMax;
      if (range <= 0) return 0;
      
      const distance = temperature - optimalMax;
      const stress = ((range - distance) / range) * 100;
      return Math.max(0, stress);
    }
    
    return 100;
  }

  /**
   * Calculate soil moisture score
   * @param {number} actualMoisture - Current soil moisture %
   * @param {number} optimalMoisture - Optimal moisture level
   * @param {number} criticalMoisture - Critical drought threshold
   * @returns {number} Score (0-100)
   */
  normalizeSoilMoisture(actualMoisture, optimalMoisture, criticalMoisture) {
    // Above optimal = no stress
    if (actualMoisture >= optimalMoisture) {
      return 100;
    }
    
    // Below optimal but above critical
    if (actualMoisture > criticalMoisture) {
      const range = optimalMoisture - criticalMoisture;
      if (range <= 0) return 0;
      
      const stress = ((actualMoisture - criticalMoisture) / range) * 100;
      return stress;
    }
    
    // Below critical threshold
    return 0;
  }

  /**
   * Calculate wind damage risk score
   * @param {number} windSpeed - Current wind speed in m/s
   * @param {number} damageThreshold - Wind speed causing damage
   * @returns {number} Score (0-100)
   */
  calculateWindRisk(windSpeed, damageThreshold) {
    if (windSpeed < damageThreshold) {
      return 100; // No risk below threshold
    }
    
    // Exponential risk increase beyond threshold
    const excess = windSpeed - damageThreshold;
    const risk = Math.min(100, excess * 2); // Linear risk
    return Math.max(0, 100 - risk);
  }

  /**
   * Calculate composite index from all parameters
   * @param {Object} weatherData - Current weather data
   * @param {Object} policyParams - Policy-specific parameters
   * @returns {Object} Composite index with breakdown
   */
  calculateCompositeIndex(weatherData, policyParams) {
    // Default weights (can be customized per policy)
    const weights = policyParams.weights || {
      rainfall: 0.40,
      temperature: 0.20,
      soil: 0.30,
      wind: 0.10
    };

    // Calculate individual scores
    const rainfallScore = this.normalizeRainfall(
      weatherData.rainfall || 0,
      policyParams.expectedRainfall || 75
    );

    const tempScore = this.calculateTempStress(
      weatherData.temperature || 20,
      policyParams.tempOptimalMin || 20,
      policyParams.tempOptimalMax || 28,
      policyParams.tempThresholdMin || 15,
      policyParams.tempThresholdMax || 35
    );

    const soilScore = this.normalizeSoilMoisture(
      weatherData.soilMoisture || 50,
      policyParams.optimalSoilMoisture || 60,
      policyParams.criticalSoilMoisture || 40
    );

    const windScore = this.calculateWindRisk(
      weatherData.windSpeed || 0,
      policyParams.windDamageThreshold || 25 // m/s
    );

    // Calculate weighted composite
    const compositeIndex = (
      rainfallScore * weights.rainfall +
      tempScore * weights.temperature +
      soilScore * weights.soil +
      windScore * weights.wind
    );

    return {
      compositeIndex: Math.round(compositeIndex * 100) / 100, // Round to 2 decimals
      scores: {
        rainfall: Math.round(rainfallScore * 100) / 100,
        temperature: Math.round(tempScore * 100) / 100,
        soil: Math.round(soilScore * 100) / 100,
        wind: Math.round(windScore * 100) / 100
      },
      breakdown: {
        rainfall: {
          value: weatherData.rainfall || 0,
          score: Math.round(rainfallScore * 100) / 100,
          weight: weights.rainfall,
          contribution: Math.round(rainfallScore * weights.rainfall * 100) / 100
        },
        temperature: {
          value: weatherData.temperature || 0,
          score: Math.round(tempScore * 100) / 100,
          weight: weights.temperature,
          contribution: Math.round(tempScore * weights.temperature * 100) / 100
        },
        soil: {
          value: weatherData.soilMoisture || 0,
          score: Math.round(soilScore * 100) / 100,
          weight: weights.soil,
          contribution: Math.round(soilScore * weights.soil * 100) / 100
        },
        wind: {
          value: weatherData.windSpeed || 0,
          score: Math.round(windScore * 100) / 100,
          weight: weights.wind,
          contribution: Math.round(windScore * weights.wind * 100) / 100
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        calculationMethod: 'weighted_sum',
        version: '1.0'
      }
    };
  }

  /**
   * Check if payout should be triggered
   * @param {Object} indexResult - Result from calculateCompositeIndex
   * @param {number} threshold - Threshold for payout trigger
   * @returns {Object} Payout decision
   */
  checkPayoutTrigger(indexResult, threshold) {
    const shouldPayout = indexResult.compositeIndex < threshold;
    const deficit = Math.max(0, threshold - indexResult.compositeIndex);
    
    return {
      shouldPayout,
      compositeIndex: indexResult.compositeIndex,
      threshold: threshold,
      deficit: Math.round(deficit * 100) / 100,
      severity: this.calculateSeverity(deficit, threshold)
    };
  }

  /**
   * Calculate payout severity level
   * @param {number} deficit - How far below threshold
   * @param {number} threshold - The threshold value
   * @returns {string} Severity level
   */
  calculateSeverity(deficit, threshold) {
    const percentage = (deficit / threshold) * 100;
    
    if (percentage >= 50) return 'severe';
    if (percentage >= 30) return 'moderate';
    if (percentage >= 10) return 'mild';
    return 'minimal';
  }
}

module.exports = IndexCalculator;

