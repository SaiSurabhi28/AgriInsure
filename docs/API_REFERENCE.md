# AgriInsure API Reference

## Base URL
```
http://localhost:3001/api
```

## Authentication
All API endpoints require proper blockchain authentication through MetaMask or similar wallet integration.

## Error Handling
All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "message": "Detailed error message"
}
```

## Policy Management

### Create Policy
Creates a new insurance policy for a farmer.

**Endpoint:** `POST /policies/create`

**Request Body:**
```json
{
  "farmerAddress": "string (required)",
  "premium": "number (required)",
  "threshold": "number (required)",
  "duration": "number (required)"
}
```

**Parameters:**
- `farmerAddress`: Ethereum address of the farmer
- `premium`: Premium amount in ETH (0.01 - 10)
- `threshold`: Rainfall threshold in mm (1 - 50)
- `duration`: Policy duration in seconds (minimum 1 day)

**Response:**
```json
{
  "success": true,
  "message": "Policy created successfully",
  "data": {
    "policyId": "1",
    "policyAddress": "0x...",
    "transactionHash": "0x...",
    "blockNumber": 12345
  }
}
```

### Get Policy Status
Retrieves the current status of a specific policy.

**Endpoint:** `GET /policies/{policyId}/status`

**Parameters:**
- `policyId`: Policy ID (path parameter)

**Response:**
```json
{
  "success": true,
  "data": {
    "policyId": "1",
    "policyAddress": "0x...",
    "isActive": true,
    "payoutExecuted": false,
    "timeRemaining": "2592000",
    "currentRainfall": "15",
    "payoutEligible": false
  }
}
```

### Get Farmer Policies
Retrieves all policies for a specific farmer.

**Endpoint:** `GET /farmers/{farmerAddress}/dashboard`

**Parameters:**
- `farmerAddress`: Farmer's Ethereum address (path parameter)

**Response:**
```json
{
  "success": true,
  "data": {
    "farmer": "0x...",
    "policies": [
      {
        "policyId": "1",
        "isActive": true,
        "payoutExecuted": false,
        "currentRainfall": "15",
        "payoutEligible": false
      }
    ],
    "stats": {
      "totalPolicies": 3,
      "activePolicies": 2,
      "completedPolicies": 1,
      "totalPayouts": 1,
      "averageThreshold": 22.5
    }
  }
}
```

### Execute Payout
Executes a payout for a policy when conditions are met.

**Endpoint:** `POST /policies/{policyId}/payout`

**Parameters:**
- `policyId`: Policy ID (path parameter)

**Request Body:**
```json
{
  "farmerAddress": "string (required)",
  "payoutAmount": "number (required)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payout executed successfully",
  "data": {
    "transactionHash": "0x...",
    "blockNumber": 12345,
    "gasUsed": "150000"
  }
}
```

## Oracle Management

### Send Weather Data
Sends weather data to the oracle network for consensus.

**Endpoint:** `POST /oracle/data`

**Request Body:**
```json
{
  "timestamp": "string (required)",
  "totalSensors": "number (required)",
  "data": [
    {
      "sensorId": "string (required)",
      "sensorType": "string (required)",
      "value": "number (required)",
      "location": {
        "name": "string (required)",
        "lat": "number",
        "lon": "number"
      }
    }
  ],
  "summary": {
    "rainfall": {
      "average": "number (required)",
      "min": "number (required)",
      "max": "number (required)",
      "count": "number (required)"
    },
    "temperature": {
      "average": "number",
      "min": "number",
      "max": "number",
      "count": "number"
    },
    "soil_moisture": {
      "average": "number",
      "min": "number",
      "max": "number",
      "count": "number"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Weather data processed successfully",
  "data": {
    "oracle": {
      "success": true,
      "consensus": {
        "consensusValue": 15.5,
        "participatingNodes": 5,
        "timestamp": "2024-01-01T00:00:00Z",
        "dataPoints": [15.2, 15.8, 15.1, 15.9, 15.5]
      },
      "participatingNodes": 5
    },
    "blockchain": {
      "success": true,
      "policiesUpdated": 3,
      "results": [...]
    }
  }
}
```

### Get Consensus History
Retrieves historical consensus data from the oracle network.

**Endpoint:** `GET /oracle/consensus`

**Query Parameters:**
- `limit`: Number of consensus entries to return (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "consensus": [
      {
        "consensusValue": 15.5,
        "participatingNodes": 5,
        "timestamp": "2024-01-01T00:00:00Z",
        "dataPoints": [15.2, 15.8, 15.1, 15.9, 15.5]
      }
    ],
    "totalNodes": 5,
    "activeNodes": 5
  }
}
```

### Get Oracle Nodes
Retrieves information about oracle network nodes.

**Endpoint:** `GET /oracle/nodes`

**Response:**
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "nodeId": "oracle_0",
        "reputation": 95,
        "isActive": true,
        "lastUpdate": "2024-01-01T00:00:00Z",
        "dataCount": 150
      }
    ],
    "totalNodes": 5,
    "activeNodes": 5
  }
}
```

### Check Oracle Health
Checks the health status of the oracle network.

**Endpoint:** `GET /oracle/health`

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "activeNodes": 5,
    "totalNodes": 5
  }
}
```

### Simulate Weather Event
Simulates weather events for testing purposes.

**Endpoint:** `POST /oracle/simulate`

**Request Body:**
```json
{
  "eventType": "string (required)",
  "intensity": "number (optional)"
}
```

**Parameters:**
- `eventType`: Type of weather event ("drought", "normal", "flood")
- `intensity`: Intensity level (optional, used for drought events)

**Response:**
```json
{
  "success": true,
  "message": "Weather event 'drought' simulated successfully",
  "data": {
    "oracle": { ... },
    "blockchain": { ... }
  }
}
```

### Update Blockchain with Oracle Data
Updates blockchain contracts with oracle consensus data.

**Endpoint:** `POST /oracle/update-blockchain`

**Request Body:**
```json
{
  "policyId": "number (required)",
  "rainfall": "number (required)",
  "temperature": "number (optional)",
  "soilMoisture": "number (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Blockchain updated with oracle data",
  "data": {
    "transactionHash": "0x...",
    "blockNumber": 12345,
    "gasUsed": "75000"
  }
}
```

### Get Oracle Statistics
Retrieves comprehensive statistics about the oracle network.

**Endpoint:** `GET /oracle/stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalConsensusEntries": 150,
    "activeNodes": 5,
    "totalNodes": 5,
    "oracleHealth": "healthy",
    "lastConsensus": {
      "consensusValue": 15.5,
      "participatingNodes": 5,
      "timestamp": "2024-01-01T00:00:00Z"
    }
  }
}
```

## Farmer Management

### Get Farmer Dashboard
Retrieves comprehensive dashboard data for a farmer.

**Endpoint:** `GET /farmers/{farmerAddress}/dashboard`

**Parameters:**
- `farmerAddress`: Farmer's Ethereum address (path parameter)

**Response:**
```json
{
  "success": true,
  "data": {
    "farmer": "0x...",
    "policies": [...],
    "stats": {
      "totalPolicies": 3,
      "activePolicies": 2,
      "completedPolicies": 1,
      "totalPayouts": 1,
      "averageThreshold": 22.5
    }
  }
}
```

### Get Farmer Policy History
Retrieves historical policy data for a farmer.

**Endpoint:** `GET /farmers/{farmerAddress}/history`

**Query Parameters:**
- `limit`: Number of policies to return (default: 20)
- `offset`: Number of policies to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "transactionHash": "0x...",
      "blockNumber": 12345,
      "args": {
        "policyId": "1",
        "farmer": "0x...",
        "premium": "100000000000000000",
        "threshold": "20",
        "duration": "2592000"
      }
    }
  ],
  "pagination": {
    "total": 3,
    "limit": 20,
    "offset": 0
  }
}
```

### Get Farmer Payout History
Retrieves payout history for a farmer.

**Endpoint:** `GET /farmers/{farmerAddress}/payouts`

**Parameters:**
- `farmerAddress`: Farmer's Ethereum address (path parameter)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "transactionHash": "0x...",
      "blockNumber": 12345,
      "args": {
        "policyId": "1",
        "farmer": "0x...",
        "amount": "200000000000000000"
      }
    }
  ]
}
```

### Get Farmer Weather Data
Retrieves current weather conditions for a farmer's active policies.

**Endpoint:** `GET /farmers/{farmerAddress}/weather`

**Parameters:**
- `farmerAddress`: Farmer's Ethereum address (path parameter)

**Response:**
```json
{
  "success": true,
  "data": {
    "farmer": "0x...",
    "activePolicies": 2,
    "weatherData": [
      {
        "policyId": "1",
        "currentRainfall": "15",
        "threshold": "20",
        "payoutEligible": false
      }
    ]
  }
}
```

### Get Farmer Risk Assessment
Retrieves risk assessment data for a farmer.

**Endpoint:** `GET /farmers/{farmerAddress}/risk`

**Parameters:**
- `farmerAddress`: Farmer's Ethereum address (path parameter)

**Response:**
```json
{
  "success": true,
  "data": {
    "farmer": "0x...",
    "riskMetrics": {
      "totalPolicies": 3,
      "payoutRate": 0.33,
      "averageThreshold": 22.5,
      "riskLevel": "medium"
    }
  }
}
```

## System Management

### Get Blockchain Status
Retrieves current blockchain network status.

**Endpoint:** `GET /blockchain/status`

**Response:**
```json
{
  "network": {
    "name": "sepolia",
    "chainId": "11155111"
  },
  "blockNumber": 12345678,
  "gasPrice": "0.00000002",
  "walletBalance": "1.5",
  "contracts": {
    "OracleAdapter": "0x...",
    "PayoutEscrow": "0x...",
    "PolicyFactory": "0x..."
  },
  "isConnected": true
}
```

### Get Contract Addresses
Retrieves deployed contract addresses.

**Endpoint:** `GET /contracts/addresses`

**Response:**
```json
{
  "OracleAdapter": "0x...",
  "PayoutEscrow": "0x...",
  "PolicyFactory": "0x..."
}
```

### Health Check
Checks the health status of the API service.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0.0",
  "environment": "development"
}
```

## Error Codes

### HTTP Status Codes
- `200`: Success
- `400`: Bad Request - Invalid input parameters
- `401`: Unauthorized - Authentication required
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource not found
- `500`: Internal Server Error - Server error

### Common Error Messages
- `"Invalid farmer address"`: Farmer address is not a valid Ethereum address
- `"Premium out of range"`: Premium amount is outside allowed range (0.01 - 10 ETH)
- `"Threshold out of range"`: Rainfall threshold is outside allowed range (1 - 50mm)
- `"Duration out of range"`: Policy duration is outside allowed range
- `"Not authorized insurer"`: Account is not authorized to create policies
- `"Not authorized oracle"`: Account is not authorized to update oracle data
- `"Policy not found"`: Policy with specified ID does not exist
- `"Payout already executed"`: Payout has already been executed for this policy
- `"Insufficient consensus"`: Not enough oracle nodes participated in consensus

## Rate Limiting

The API implements rate limiting to prevent abuse:
- **Rate Limit**: 100 requests per 15 minutes per IP address
- **Headers**: Rate limit information is included in response headers
- **Exceeded**: Returns HTTP 429 when rate limit is exceeded

## CORS Configuration

The API supports cross-origin requests:
- **Allowed Origins**: `http://localhost:3000` (frontend URL)
- **Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization

## WebSocket Support

Real-time updates are available via WebSocket connections:
- **Endpoint**: `ws://localhost:3001/ws`
- **Events**: Policy updates, oracle data, payout notifications
- **Authentication**: Same as REST API

## SDK and Libraries

### JavaScript/TypeScript
```javascript
import { AgriInsureAPI } from '@agriinsure/api-client';

const api = new AgriInsureAPI('http://localhost:3001/api');

// Create policy
const policy = await api.policies.create({
  farmerAddress: '0x...',
  premium: 0.1,
  threshold: 20,
  duration: 2592000
});

// Get policy status
const status = await api.policies.getStatus(policy.policyId);
```

### Python
```python
from agriinsure_api import AgriInsureClient

client = AgriInsureClient('http://localhost:3001/api')

# Create policy
policy = client.policies.create(
    farmer_address='0x...',
    premium=0.1,
    threshold=20,
    duration=2592000
)

# Get policy status
status = client.policies.get_status(policy.policy_id)
```

## Testing

### Postman Collection
A Postman collection is available for API testing:
- Import: `docs/postman/AgriInsure-API.postman_collection.json`
- Environment: `docs/postman/AgriInsure-Environment.postman_environment.json`

### cURL Examples
```bash
# Create policy
curl -X POST http://localhost:3001/api/policies/create \
  -H "Content-Type: application/json" \
  -d '{
    "farmerAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "premium": 0.1,
    "threshold": 20,
    "duration": 2592000
  }'

# Get policy status
curl http://localhost:3001/api/policies/1/status

# Send weather data
curl -X POST http://localhost:3001/api/oracle/data \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2024-01-01T00:00:00Z",
    "totalSensors": 15,
    "data": [...],
    "summary": {...}
  }'
```







