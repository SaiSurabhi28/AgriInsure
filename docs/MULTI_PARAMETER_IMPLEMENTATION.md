# Multi-Parameter Insurance Index - Implementation Plan

## Overview

Extend AgriInsure from single-parameter (rainfall) to multi-parameter insurance index including:
- **Rainfall deficit**
- **Temperature stress** (heat/cold)
- **Soil moisture deficit**
- **Wind damage** risk

## Phase 1: Backend Calculation (Current Priority)

Since smart contract changes are gas-intensive and risky, we'll implement multi-parameter calculations **in the backend** first, then optionally move critical logic on-chain.

### Current Single-Parameter Flow

```
Rainfall < Threshold → Payout
```

### New Multi-Parameter Flow

```
Composite Index = f(Rainfall, Temperature, Soil, Wind)
Composite Index < Threshold → Payout
```

## Index Calculation Formula

### Option 1: Weighted Sum
```
Index = 
  (Rainfall_Weight × Rainfall_Score) +
  (Temperature_Weight × Temperature_Score) +
  (Soil_Weight × Soil_Score) +
  (Wind_Weight × Wind_Score)
```

### Option 2: Geometric Mean (Better for interdependent factors)
```
Index = (Rainfall^w1 × Temp^w2 × Soil^w3 × Wind^w4)^(1/(w1+w2+w3+w4))
```

### Recommended: Weighted Sum with Normalized Scores

```javascript
// Normalize each parameter to 0-100 scale
const rainfallScore = (actualRainfall / expectedRainfall) * 100;
const tempScore = calculateHeatStress(temperature, cropOptimalRange);
const soilScore = (soilMoisture / optimalMoisture) * 100;
const windScore = calculateWindDamage(windSpeed, threshold);

// Weighted composite
const compositeIndex = (
  rainfallScore * 0.40 +  // 40% weight
  tempScore * 0.20 +      // 20% weight
  soilScore * 0.30 +      // 30% weight
  windScore * 0.10        // 10% weight
);

// Payout trigger
if (compositeIndex < policyThreshold) {
  executePayout();
}
```

## Implementation Steps

### Step 1: Backend Calculator Service

Create `backend/services/indexCalculator.js`:

```javascript
class IndexCalculator {
  // Normalize rainfall (0-100 scale)
  normalizeRainfall(actual, expected) {
    const ratio = (actual / expected) * 100;
    return Math.max(0, Math.min(100, ratio));
  }
  
  // Calculate temperature stress
  calculateTempStress(temp, optimalMin, optimalMax, thresholdMin, thresholdMax) {
    if (temp >= optimalMin && temp <= optimalMax) {
      return 100; // No stress
    } else if (temp < optimalMin) {
      // Cold stress
      const stress = ((temp - thresholdMin) / (optimalMin - thresholdMin)) * 100;
      return Math.max(0, stress);
    } else {
      // Heat stress
      const stress = ((thresholdMax - temp) / (thresholdMax - optimalMax)) * 100;
      return Math.max(0, stress);
    }
  }
  
  // Calculate soil moisture score
  normalizeSoilMoisture(actual, optimal, critical) {
    if (actual >= optimal) {
      return 100;
    }
    return (actual / critical) * 100;
  }
  
  // Calculate wind damage risk
  calculateWindRisk(windSpeed, damageThreshold) {
    if (windSpeed < damageThreshold) {
      return 100; // No risk
    }
    // Exponential risk increase
    const excess = windSpeed - damageThreshold;
    const risk = Math.min(100, excess * 10); // 10x multiplier
    return Math.max(0, 100 - risk);
  }
  
  // Calculate composite index
  calculateCompositeIndex(weatherData, policyParams) {
    const weights = policyParams.weights || {
      rainfall: 0.4,
      temperature: 0.2,
      soil: 0.3,
      wind: 0.1
    };
    
    const scores = {
      rainfall: this.normalizeRainfall(
        weatherData.rainfall,
        policyParams.expectedRainfall
      ),
      temperature: this.calculateTempStress(
        weatherData.temperature,
        policyParams.tempOptimalMin,
        policyParams.tempOptimalMax,
        policyParams.tempThresholdMin,
        policyParams.tempThresholdMax
      ),
      soil: this.normalizeSoilMoisture(
        weatherData.soilMoisture,
        policyParams.optimalSoilMoisture,
        policyParams.criticalSoilMoisture
      ),
      wind: this.calculateWindRisk(
        weatherData.windSpeed,
        policyParams.windDamageThreshold
      )
    };
    
    const composite = (
      scores.rainfall * weights.rainfall +
      scores.temperature * weights.temperature +
      scores.soil * weights.soil +
      scores.wind * weights.wind
    );
    
    return {
      compositeIndex: composite,
      scores: scores,
      breakdown: {
        rainfall: { value: weatherData.rainfall, score: scores.rainfall, weight: weights.rainfall },
        temperature: { value: weatherData.temperature, score: scores.temperature, weight: weights.temperature },
        soil: { value: weatherData.soilMoisture, score: scores.soil, weight: weights.soil },
        wind: { value: weatherData.windSpeed, score: scores.wind, weight: weights.wind }
      }
    };
  }
}
```

### Step 2: Policy Extension

Extend policy structure to include multi-parameter config:

```javascript
// In policy creation
{
  id: policyId,
  holder: farmerAddress,
  productId: productId,
  // Single-parameter (legacy)
  threshold: 50, // rainfall mm
  // Multi-parameter (new)
  compositeThreshold: 60, // composite index
  weights: {
    rainfall: 0.4,
    temperature: 0.2,
    soil: 0.3,
    wind: 0.1
  },
  parameters: {
    expectedRainfall: 75,
    tempOptimalRange: [20, 28],
    tempThresholdRange: [15, 35],
    optimalSoilMoisture: 60,
    criticalSoilMoisture: 40,
    windDamageThreshold: 25 // km/h
  }
}
```

### Step 3: API Endpoint

```javascript
// backend/routes/policyRoutes.js
router.post('/check-payout/:policyId', async (req, res) => {
  try {
    const { policyId } = req.params;
    const policy = await getPolicy(policyId);
    
    // Get current weather data
    const weather = await getWeatherData(policy.location);
    
    // Calculate composite index
    const calculator = new IndexCalculator();
    const result = calculator.calculateCompositeIndex(weather, policy);
    
    // Check payout eligibility
    const shouldPayout = result.compositeIndex < policy.compositeThreshold;
    
    res.json({
      shouldPayout,
      compositeIndex: result.compositeIndex,
      threshold: policy.compositeThreshold,
      breakdown: result.breakdown
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Step 4: Frontend Display

Update frontend to show:
- Composite index gauge
- Individual parameter breakdowns
- Visual trend charts
- Risk assessment dashboard

## Phase 2: Smart Contract Integration (Optional)

Once backend logic is proven, consider moving critical calculations on-chain:

### Gas-Optimized Version

```solidity
struct MultiParamPolicy {
    // Core
    address holder;
    uint256 productId;
    uint64 startTs;
    uint64 endTs;
    
    // Single threshold (kept for backward compatibility)
    uint64 threshold;
    
    // Multi-parameter weights (stored as percentages to avoid decimals)
    uint16 rainfallWeight;    // 0-100 (40% = 40)
    uint16 temperatureWeight;
    uint16 soilWeight;
    uint16 windWeight;
    
    // Thresholds
    uint64 compositeThreshold; // 0-100
    uint64 expectedRainfall;
    int16 tempOptimalMin;
    int16 tempOptimalMax;
    
    Status status;
}

// Oracle needs to return composite index
function finalize(uint256 policyId) external {
    Policy storage policy = policies[policyId];
    
    // Get composite index from oracle
    uint64 compositeIndex = oracle.getCompositeIndex(
        policy.startTs,
        policy.endTs
    );
    
    // Check payout
    if (compositeIndex < policy.compositeThreshold) {
        executePayout(policyId);
    }
}
```

## Testing

### Unit Tests

```javascript
describe('IndexCalculator', () => {
  it('should calculate composite index correctly', () => {
    const calc = new IndexCalculator();
    const weather = {
      rainfall: 30,
      temperature: 25,
      soilMoisture: 50,
      windSpeed: 15
    };
    const params = {
      expectedRainfall: 75,
      tempOptimalRange: [20, 28],
      tempThresholdRange: [15, 35],
      optimalSoilMoisture: 60,
      criticalSoilMoisture: 40,
      windDamageThreshold: 25
    };
    
    const result = calc.calculateCompositeIndex(weather, params);
    expect(result.compositeIndex).toBeGreaterThan(0);
    expect(result.compositeIndex).toBeLessThan(100);
  });
});
```

### Integration Tests

1. Create policy with multi-parameter config
2. Simulate various weather scenarios
3. Verify payout triggers correctly
4. Test edge cases (extreme weather)

## Migration Strategy

### For Existing Policies

Keep backward compatibility:
- Old policies: Use single-parameter (rainfall threshold)
- New policies: Use multi-parameter composite index
- Detect policy type and route to appropriate calculator

## Benefits

1. **More Accurate Risk Assessment**
   - Accounts for multiple weather factors
   - Reduces false positives/negatives

2. **Better Coverage**
   - Covers heat stress, cold damage, drought, storms
   - Comprehensive protection

3. **Academic Innovation**
   - Novel multi-parameter approach
   - Research contribution

4. **Real-World Applicability**
   - Closer to actual agricultural risk
   - Industry-ready solution

## References

- FAO Climatic Risk Assessment
- IPCC Agricultural Impact Models
- Insurance actuarial science
- Precision agriculture research

---

**Status:** Design Complete, Ready for Implementation  
**Next:** Create `indexCalculator.js` service  
**Priority:** High

