#!/bin/bash

echo "🧪 Testing Weather Endpoints..."
echo "================================"
echo ""

# Test 1: Health check
echo "1️⃣  Testing /health endpoint:"
curl -s "http://localhost:3001/health" | python3 -m json.tool 2>/dev/null || curl -s "http://localhost:3001/health"
echo ""
echo ""

# Test 2: Main weather endpoint
echo "2️⃣  Testing /api/oracle/weather endpoint (should use Kaggle CSV):"
curl -s "http://localhost:3001/api/oracle/weather?limit=3" | python3 -m json.tool 2>/dev/null | head -40 || curl -s "http://localhost:3001/api/oracle/weather?limit=3" | head -40
echo ""
echo ""

# Test 3: Kaggle-specific endpoint
echo "3️⃣  Testing /api/oracle/weather/kaggle endpoint:"
curl -s "http://localhost:3001/api/oracle/weather/kaggle?limit=3" | python3 -m json.tool 2>/dev/null | head -40 || curl -s "http://localhost:3001/api/oracle/weather/kaggle?limit=3" | head -40
echo ""
echo ""

echo "✅ Test complete!"
echo ""
echo "If you see JSON data with 'success: true' and 'source: kaggle_dataset', everything is working!"
echo "If you see 'Route not found', make sure you restarted the backend server."








