# 🌍 Real-World Weather Data Integration

## Overview

AgriInsure now supports real weather data from OpenWeatherMap API, eliminating the dependency on simulated IoT data. This makes the platform production-ready and academically credible.

## Features

✅ **Real Weather Data** - Live data from OpenWeatherMap  
✅ **Smart Fallbacks** - Falls back to simulated data if API is unavailable  
✅ **Data Caching** - 60-second cache to reduce API calls  
✅ **Multi-Parameter Support** - Temperature, humidity, wind speed, pressure  
✅ **Forecast Support** - 5-day weather predictions  
✅ **Free Tier Compatible** - Works with free OpenWeatherMap account  

---

## Setup Instructions

### 1. Get OpenWeatherMap API Key

1. Visit: https://openweathermap.org/api
2. Sign up for a free account
3. Navigate to "API Keys" section
4. Copy your API key

**Free Tier Limits:**
- 60 calls/minute
- 1,000,000 calls/month
- Current weather data
- 5-day forecasts

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
OPENWEATHER_API_KEY=your_api_key_here
```

Or export in your shell:

```bash
export OPENWEATHER_API_KEY=your_api_key_here
```

### 3. Restart Oracle Service

```bash
cd oracle
npm install  # Install axios if needed
npm start
```

---

## API Endpoints

### Current Weather

**Endpoint:** `GET /api/oracle/weather`

**Example Request:**
```bash
curl http://localhost:3002/api/oracle/weather
```

**Example Response (with API key):**
```json
{
  "success": true,
  "data": [
    {
      "roundId": 1733145600000,
      "timestamp": 1733145600,
      "value": "12.34",
      "temperature": "28.5",
      "humidity": 75,
      "windSpeed": 5.2,
      "conditions": "light rain",
      "source": "real_weather_api"
    }
  ],
  "timestamp": "2024-11-02T12:00:00.000Z",
  "source": "openweathermap",
  "location": {
    "lat": 20.5937,
    "lon": 78.9629,
    "city": "New Delhi",
    "country": "IN"
  }
}
```

**Example Response (without API key - fallback):**
```json
{
  "success": true,
  "data": [{
    "timestamp": "2024-11-02T12:00:00.000Z",
    "rainfall": 15.67,
    "temperature": 25.3,
    "soil_moisture": 45.2,
    "source": "simulated",
    "confidence": 95
  }],
  "timestamp": "2024-11-02T12:00:00.000Z",
  "source": "simulated",
  "note": "Using simulated data - configure OPENWEATHER_API_KEY for real data"
}
```

### Weather Forecast

**Endpoint:** `GET /api/oracle/forecast?days=5`

**Example Request:**
```bash
curl "http://localhost:3002/api/oracle/forecast?days=5"
```

**Example Response:**
```json
{
  "success": true,
  "forecast": [
    {
      "timestamp": 1733145600000,
      "rainfall": 8.5,
      "temperature": 28.2,
      "humidity": 72,
      "windSpeed": 4.8,
      "conditions": "partly cloudy",
      "date": "2024-11-02T12:00:00.000Z"
    },
    // ... 39 more forecast points (8 per day × 5 days)
  ],
  "days": 5,
  "source": "openweathermap"
}
```

### Detailed Health Check

**Endpoint:** `GET /api/oracle/health-detailed`

**Example Request:**
```bash
curl http://localhost:3002/api/oracle/health-detailed
```

**Example Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-11-02T12:00:00.000Z",
  "nodes": {
    "total": 5,
    "active": 5
  },
  "weatherAPI": {
    "configured": true,
    "status": "API key is valid",
    "valid": true
  }
}
```

---

## Architecture

```
┌─────────────────────────┐
│   Frontend (React)      │
│   /api/oracle/weather   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Oracle Service        │
│   (Express Server)      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   WeatherAPIService     │
│   (weatherAPI.js)       │
└───────────┬─────────────┘
            │
    ┌───────┴────────┐
    │                │
    ▼                ▼
┌─────────┐    ┌──────────────┐
│ Open-   │    │ Fallback     │
│ Weather │    │ Simulated    │
│ Map API │    │ Data         │
└─────────┘    └──────────────┘
```

---

## Data Transformation

OpenWeatherMap provides weather data in metric units:
- **Temperature:** Celsius
- **Rainfall:** mm/hour (estimated from conditions)
- **Wind Speed:** m/s
- **Pressure:** hPa
- **Humidity:** % (0-100)

The `WeatherAPIService` transforms this data to match AgriInsure's internal format.

---

## Rainfall Estimation

Since OpenWeatherMap's free tier doesn't include detailed rainfall data, we use intelligent estimation:

| Weather Condition | Estimated Rainfall |
|------------------|-------------------|
| Light rain/drizzle | 1-3 mm |
| Moderate rain | 5-10 mm |
| Heavy rain | 15-25 mm |
| Thunderstorm | 20-35 mm |
| Snow | 0.5-1 mm (equivalent) |
| Clear/Cloudy | 0 mm |

---

## Caching Strategy

- **Cache Duration:** 60 seconds
- **Cache Check:** Before every API call
- **Benefits:**
  - Reduces API calls
  - Stays within free tier limits
  - Faster response times

---

## Testing

### 1. Test with API Key

```bash
export OPENWEATHER_API_KEY=your_key_here
cd oracle
npm start
```

Then check the logs:
```
✅ Fetched real weather data from OpenWeatherMap
```

### 2. Test Fallback

```bash
# Don't set API key
cd oracle
npm start
```

Check logs:
```
⚠️ No OpenWeatherMap API key. Using simulated data.
```

### 3. Verify Endpoints

```bash
# Current weather
curl http://localhost:3002/api/oracle/weather | jq .source

# Should return: "openweathermap" or "simulated"

# Health check
curl http://localhost:3002/api/oracle/health-detailed | jq .weatherAPI
```

---

## Production Considerations

### API Limits

- **Free Tier:** 60 calls/minute
- **AgriInsure:** Polls every 30 seconds
- **Usage:** 120 calls/hour per frontend user

**Recommendations:**
1. Increase cache duration to 5 minutes for production
2. Use OpenWeatherMap's "One Call API 2.0" for better data
3. Consider upgrading to "One Call API 3.0" for unlimited access

### Error Handling

The service gracefully handles:
- ✅ Network timeouts (5-second limit)
- ✅ Invalid API keys
- ✅ Missing API keys
- ✅ Rate limiting
- ✅ Server errors

All errors fall back to simulated data to ensure uptime.

---

## Future Enhancements

### Planned Improvements

1. **Chainlink Functions Integration**
   - Decentralized oracle network
   - Multi-source aggregation
   - On-chain weather data

2. **Redstone Oracle Support**
   - Additional decentralized data source
   - Cross-chain compatibility

3. **Historical Data API**
   - PAST weather data validation
   - Payout verification

4. **Multiple Locations**
   - Per-policy location tracking
   - Regional weather data

5. **Advanced Forecasting**
   - Machine learning predictions
   - Climate trend analysis

---

## Troubleshooting

### Issue: "API key is invalid"

**Solution:**
1. Verify API key at https://openweathermap.org/api_keys
2. Ensure no extra spaces in `.env` file
3. Check key is activated (may take 10 minutes after creation)

### Issue: "Too many API calls"

**Solution:**
1. Increase cache duration
2. Reduce polling frequency
3. Upgrade to paid tier

### Issue: Still getting simulated data

**Solution:**
1. Check environment variables are loaded
2. Restart oracle service
3. Check logs for error messages

---

## References

- **OpenWeatherMap API:** https://openweathermap.org/api
- **API Documentation:** https://openweathermap.org/api/one-call-api
- **Pricing:** https://openweathermap.org/price

---

## Support

For issues or questions:
- Check logs: `tail -f oracle/logs/*.log`
- Test API key: `curl "https://api.openweathermap.org/data/2.5/weather?lat=20&lon=78&appid=YOUR_KEY"`
- GitHub Issues: https://github.com/SaiSurabhi28/AgriInsure/issues

---

**Last Updated:** 2024-11-02  
**Status:** ✅ Production Ready

