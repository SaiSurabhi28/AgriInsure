# AgriInsure Technical Documentation

## System Architecture Diagrams

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AgriInsure Platform                      │
├─────────────────────────────────────────────────────────────────┤
│  Frontend Layer (React + MetaMask)                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Dashboard     │  │  Policy Mgmt    │  │  Weather Feed   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Backend Layer (Node.js + Express)                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   REST API      │  │  Blockchain     │  │  Oracle Service │ │
│  │                 │  │  Integration   │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Blockchain Layer (Ethereum Smart Contracts)                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ PolicyFactory   │  │ PolicyContract  │  │ OracleAdapter   │ │
│  │                 │  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│  ┌─────────────────┐                                          │
│  │ PayoutEscrow    │                                          │
│  └─────────────────┘                                          │
├─────────────────────────────────────────────────────────────────┤
│  Oracle Layer (Decentralized Consensus)                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Oracle Node 1 │  │   Oracle Node 2 │  │   Oracle Node N │ │
│  │                 │  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  IoT Layer (Sensor Simulation)                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Rainfall       │  │  Temperature    │  │  Soil Moisture  │ │
│  │  Sensors        │  │  Sensors        │  │  Sensors        │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
IoT Sensors → Oracle Network → Blockchain → Backend API → Frontend
     │              │             │            │           │
     ▼              ▼             ▼            ▼           ▼
┌─────────┐   ┌──────────┐  ┌─────────┐  ┌─────────┐ ┌─────────┐
│ Weather │   │Consensus │  │Contract │  │  REST   │ │  User   │
│  Data   │   │Process   │  │ Update  │  │  API    │ │Interface│
└─────────┘   └──────────┘  └─────────┘  └─────────┘ └─────────┘
     │              │             │            │           │
     ▼              ▼             ▼            ▼           ▼
┌─────────┐   ┌──────────┐  ┌─────────┐  ┌─────────┐ ┌─────────┐
│JSON File│   │Median    │  │Event    │  │JSON     │ │React    │
│Storage  │   │Value    │  │Emission │  │Response │ │Component│
└─────────┘   └──────────┘  └─────────┘  └─────────┘ └─────────┘
```

### Smart Contract Interaction Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PolicyFactory │    │ PolicyContract  │    │ OracleAdapter   │
│                 │    │                 │    │                 │
│ createPolicy()  │───▶│ updateOracle()  │◄───│ updateWeather() │
│                 │    │ checkPayout()   │    │                 │
│                 │    │ executePayout() │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PayoutEscrow  │    │   Events        │    │   Validation    │
│                 │    │                 │    │                 │
│ depositPremium()│    │ PolicyCreated   │    │ Data Range      │
│ executePayout() │    │ PayoutExecuted  │    │ Check           │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## API Endpoints Documentation

### Policy Management Endpoints

#### POST /api/policies/create
Creates a new insurance policy.

**Request Body:**
```json
{
  "farmerAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "premium": 0.1,
  "threshold": 20,
  "duration": 2592000
}
```

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

#### GET /api/policies/{policyId}/status
Gets the current status of a policy.

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

#### POST /api/policies/{policyId}/payout
Executes a payout for a policy.

**Request Body:**
```json
{
  "farmerAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "payoutAmount": 0.2
}
```

### Oracle Management Endpoints

#### POST /api/oracle/data
Sends weather data to the oracle network.

**Request Body:**
```json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "totalSensors": 15,
  "data": [
    {
      "sensorId": "sensor_1",
      "sensorType": "rainfall",
      "value": 15.5,
      "location": {
        "name": "Farm A",
        "lat": 12.9716,
        "lon": 77.5946
      }
    }
  ],
  "summary": {
    "rainfall": {
      "average": 15.5,
      "min": 10.2,
      "max": 20.8,
      "count": 5
    }
  }
}
```

#### GET /api/oracle/consensus
Gets consensus history from oracle network.

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

### Farmer Dashboard Endpoints

#### GET /api/farmers/{farmerAddress}/dashboard
Gets comprehensive dashboard data for a farmer.

**Response:**
```json
{
  "success": true,
  "data": {
    "farmer": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
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

## Smart Contract Specifications

### PolicyFactory Contract

**Purpose:** Factory contract for creating and managing insurance policies.

**Key Functions:**
- `createPolicy(address farmer, uint256 premium, uint256 threshold, uint256 duration)`: Creates a new policy
- `getPolicy(uint256 policyId)`: Returns policy contract address
- `getFarmerPolicies(address farmer)`: Returns all policies for a farmer
- `authorizeInsurer(address insurer)`: Authorizes an insurer to create policies

**Events:**
- `PolicyCreated(address indexed policyAddress, address indexed farmer, uint256 policyId, uint256 premium, uint256 threshold, uint256 duration)`

### PolicyContract Contract

**Purpose:** Individual policy contract managing specific insurance terms.

**Key Functions:**
- `updateOracleData(uint256 rainfall, uint256 temperature, uint256 soilMoisture)`: Updates weather data
- `checkPayoutConditions()`: Checks if payout conditions are met
- `executePayout()`: Executes payout to farmer
- `getPolicyStatus()`: Returns current policy status

**Events:**
- `OracleDataUpdated(uint256 rainfall, uint256 timestamp)`
- `PayoutExecuted(address indexed farmer, uint256 amount, uint256 timestamp)`

### OracleAdapter Contract

**Purpose:** Receives and validates oracle data for policy contracts.

**Key Functions:**
- `updateWeatherData(uint256 policyId, uint256 rainfall, uint256 temperature, uint256 soilMoisture)`: Updates weather data for a policy
- `batchUpdateWeatherData(uint256[] policyIds, uint256[] rainfalls, uint256[] temperatures, uint256[] soilMoistures)`: Batch update for multiple policies
- `getWeatherData(uint256 policyId)`: Gets weather data for a policy
- `authorizeOracle(address oracle)`: Authorizes an oracle node

**Events:**
- `OracleDataUpdated(uint256 indexed policyId, uint256 rainfall, uint256 temperature, uint256 soilMoisture, uint256 timestamp, address indexed oracle)`

### PayoutEscrow Contract

**Purpose:** Holds premium funds and executes payouts.

**Key Functions:**
- `depositPremium(uint256 policyId, address farmer)`: Deposits premium for a policy
- `executePayout(uint256 policyId, address farmer, uint256 payoutAmount)`: Executes payout
- `getEscrowEntry(uint256 policyId)`: Gets escrow entry details
- `emergencyWithdraw()`: Emergency withdrawal function

**Events:**
- `PremiumDeposited(uint256 indexed policyId, address indexed farmer, uint256 amount, uint256 timestamp)`
- `PayoutExecuted(uint256 indexed policyId, address indexed farmer, uint256 amount, uint256 timestamp)`

## Security Considerations

### Smart Contract Security

1. **Reentrancy Protection**: All external calls are protected using OpenZeppelin's ReentrancyGuard
2. **Access Control**: Role-based access control using OpenZeppelin's Ownable and custom modifiers
3. **Input Validation**: Comprehensive validation of all input parameters
4. **Safe Math**: All arithmetic operations use SafeMath to prevent overflow/underflow
5. **Emergency Functions**: Pause functionality for emergency situations

### Oracle Security

1. **Consensus Mechanism**: Multiple oracle nodes must agree on data
2. **Reputation System**: Oracle nodes have reputation scores that affect their influence
3. **Data Validation**: Range checks and format validation for all sensor data
4. **Fault Tolerance**: System continues to function even if some oracle nodes fail

### API Security

1. **Rate Limiting**: Prevents abuse and DoS attacks
2. **Input Sanitization**: All inputs are validated and sanitized
3. **CORS Configuration**: Proper cross-origin resource sharing setup
4. **Security Headers**: Helmet.js provides security headers
5. **Error Handling**: Secure error messages without information leakage

## Testing Strategy

### Unit Tests
- Individual contract function testing
- Edge case validation
- Access control verification
- Gas optimization testing

### Integration Tests
- End-to-end workflow testing
- Cross-contract interaction testing
- API endpoint testing
- Oracle consensus testing

### Security Tests
- Reentrancy attack simulation
- Access control bypass attempts
- Input validation testing
- Emergency function testing

### Performance Tests
- Gas usage optimization
- Concurrent transaction handling
- Large dataset processing
- Load testing

## Deployment Guide

### Local Development
1. Install dependencies: `npm install`
2. Start Hardhat node: `npx hardhat node`
3. Deploy contracts: `npx hardhat run scripts/deploy.js --network localhost`
4. Start services: `./deploy.sh`

### Testnet Deployment (Sepolia)
1. Configure environment variables
2. Deploy contracts: `npx hardhat run scripts/deploy-sepolia.js --network sepolia`
3. Verify contracts: `npx hardhat verify --network sepolia <contract-address>`
4. Deploy services to cloud infrastructure

### Production Deployment
1. Security audit of smart contracts
2. Multi-signature wallet setup
3. Gradual rollout with monitoring
4. Emergency response procedures

## Monitoring and Maintenance

### Smart Contract Monitoring
- Event monitoring for policy creation and payouts
- Gas usage tracking
- Contract interaction analysis
- Security incident detection

### Oracle Network Monitoring
- Node health monitoring
- Consensus accuracy tracking
- Data quality assessment
- Performance metrics

### System Health Monitoring
- API response times
- Error rate tracking
- User activity monitoring
- Resource utilization

## Troubleshooting Guide

### Common Issues

1. **MetaMask Connection Issues**
   - Ensure MetaMask is installed and unlocked
   - Check network configuration (Sepolia testnet)
   - Verify account has sufficient ETH for gas

2. **Contract Deployment Failures**
   - Check private key configuration
   - Verify RPC URL is correct
   - Ensure sufficient ETH for deployment

3. **Oracle Data Issues**
   - Check oracle node health
   - Verify consensus threshold
   - Monitor data validation errors

4. **Payout Execution Failures**
   - Verify policy conditions are met
   - Check escrow balance
   - Ensure proper authorization

### Debug Commands

```bash
# Check contract deployment
npx hardhat run scripts/deploy.js --network localhost

# Verify contract on Etherscan
npx hardhat verify --network sepolia <contract-address>

# Run specific tests
npx hardhat test tests/unit/PolicyFactory.test.js

# Check gas usage
npx hardhat test --gas-report
```

## Performance Optimization

### Gas Optimization
- Use `view` and `pure` functions where possible
- Optimize storage operations
- Batch operations when feasible
- Use events instead of storage for historical data

### API Optimization
- Implement caching for frequently accessed data
- Use pagination for large datasets
- Optimize database queries
- Implement rate limiting

### Frontend Optimization
- Lazy load components
- Optimize bundle size
- Implement proper error boundaries
- Use React.memo for performance

## Future Enhancements

### Technical Improvements
- Layer 2 scaling solutions (Polygon, Arbitrum)
- Cross-chain compatibility
- Advanced oracle networks
- Machine learning integration

### Feature Additions
- Multi-parameter insurance
- Dynamic pricing models
- Community governance
- Mobile applications

### Business Model Evolution
- Token-based incentives
- Decentralized autonomous organization (DAO)
- Partnership integrations
- Global expansion







