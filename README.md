# AgriInsure: Blockchain-Enabled Parametric Micro-Insurance for Farmers

![AgriInsure Logo](https://img.shields.io/badge/AgriInsure-Blockchain%20Insurance-green?style=for-the-badge&logo=ethereum)

## 📋 Table of Contents

- [Abstract](#abstract)
- [Problem Statement](#problem-statement)
- [Literature Review](#literature-review)
- [System Architecture](#system-architecture)
- [Smart Contract Architecture](#smart-contract-architecture)
- [Workflow Diagram](#workflow-diagram)
- [Installation & Setup](#installation--setup)
- [Usage Guide](#usage-guide)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security Considerations](#security-considerations)
- [Future Work](#future-work)
- [Contributing](#contributing)
- [License](#license)

## 🌾 Abstract

AgriInsure is a decentralized parametric micro-insurance platform that automatically pays farmers when environmental parameters (rainfall, temperature, soil moisture) cross predefined thresholds. Built on Ethereum blockchain with IoT sensors and decentralized oracles, the system eliminates traditional insurance intermediaries, reduces costs, and provides transparent, automated payouts based on verifiable weather data.

**Key Features:**
- ✅ Automated parametric insurance payouts
- ✅ Decentralized oracle consensus mechanism
- ✅ IoT sensor data integration
- ✅ Smart contract-based policy management
- ✅ Real-time weather monitoring
- ✅ Transparent and immutable records

## 🎯 Problem Statement

Traditional agricultural insurance faces several critical challenges:

1. **High Administrative Costs**: Manual claim processing and verification
2. **Fraud Risk**: Difficult to verify weather-related damage claims
3. **Delayed Payouts**: Lengthy claim settlement processes
4. **Limited Access**: High barriers for small-scale farmers
5. **Lack of Transparency**: Opaque pricing and payout mechanisms

AgriInsure addresses these issues by leveraging blockchain technology, IoT sensors, and smart contracts to create a transparent, automated, and cost-effective insurance solution.

## 📚 Literature Review

### Recent Research (2023-2024)

1. **Makkithaya, S. et al.** (2024). "Blockchain Oracles for Decentralized Agricultural Insurance Using Trusted IoT Data." *Frontiers in Blockchain*. This study demonstrates the effectiveness of blockchain oracles in agricultural insurance, showing 40% reduction in administrative costs.

2. **Chen, Y. et al.** (2023). "Privacy-Preserving Parametric Insurance Using Remote Sensing and IoT." *arXiv preprint*. Presents privacy-preserving techniques for parametric insurance using zero-knowledge proofs.

3. **Lin, C. et al.** (2024). "AgriInsureDON: A Secure Blockchain-Enabled IoT Framework for Agriculture." *Frontiers in Blockchain*. Introduces a comprehensive framework for agricultural insurance with enhanced security measures.

4. **Georgetown Law Tech Review** (2023). "Smart After All: Blockchain Smart Contracts, Parametric Insurance and Smart Energy Grids." Discusses the legal and regulatory implications of blockchain-based insurance.

### Key Findings
- Parametric insurance reduces claim processing time by 80%
- Blockchain implementation increases transparency and trust
- IoT integration improves data accuracy and reduces fraud
- Decentralized oracles provide reliable weather data verification

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   IoT Sensors   │    │  Oracle Network │    │   Blockchain    │
│                 │    │                 │    │                 │
│ • Rainfall      │───▶│ • Consensus     │───▶│ • Smart         │
│ • Temperature   │    │ • Validation    │    │   Contracts     │
│ • Soil Moisture │    │ • Aggregation  │    │ • Policy Mgmt   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Data Storage  │    │   Backend API   │    │   Frontend      │
│                 │    │                 │    │                 │
│ • JSON Files    │    │ • REST API      │    │ • React App     │
│ • Historical    │    │ • Blockchain    │    │ • MetaMask      │
│   Data          │    │   Integration   │    │   Integration  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Overview

1. **IoT Layer**: Simulates weather sensors collecting rainfall, temperature, and soil moisture data
2. **Oracle Layer**: Decentralized network of nodes that validate and aggregate sensor data
3. **Blockchain Layer**: Smart contracts managing policies, payouts, and data storage
4. **Backend Layer**: REST API connecting frontend to blockchain and oracle services
5. **Frontend Layer**: React application with MetaMask integration for user interaction

## 🔗 Smart Contract Architecture

```
PolicyFactory
├── Creates new insurance policies
├── Manages policy parameters
└── Handles premium collection

PolicyContract
├── Individual policy management
├── Payout condition checking
└── Status tracking

OracleAdapter
├── Receives oracle data
├── Validates weather information
└── Updates policy contracts

PayoutEscrow
├── Holds premium funds
├── Executes automatic payouts
└── Manages fund distribution
```

### Contract Relationships

- **PolicyFactory** deploys **PolicyContract** instances
- **OracleAdapter** updates weather data for all policies
- **PayoutEscrow** holds funds and executes payouts
- All contracts use OpenZeppelin libraries for security

## 🔄 Workflow Diagram

```
Farmer Registration
        │
        ▼
Create Policy (Premium Payment)
        │
        ▼
IoT Sensors Collect Data
        │
        ▼
Oracle Network Consensus
        │
        ▼
Blockchain Data Update
        │
        ▼
Policy Evaluation
        │
        ▼
┌─────────────────┐
│ Payout Trigger? │
└─────────────────┘
        │
    ┌───┴───┐
    │       │
   Yes     No
    │       │
    ▼       ▼
Execute   Continue
Payout    Monitoring
```

## 🚀 Installation & Setup

### Prerequisites

- Node.js 16+ and npm
- MetaMask browser extension
- Git
- Docker (optional)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/SaiSurabhi28/AgriInsure.git
   cd AgriInsure
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Deploy and start services**
   ```bash
   ./deploy.sh
   ```

### Manual Setup

1. **Install root dependencies**
   ```bash
   npm install
   ```

2. **Install service dependencies**
   ```bash
   cd backend && npm install && cd ..
   cd frontend && npm install && cd ..
   cd oracle && npm install && cd ..
   cd iot-sim && npm install && cd ..
   ```

3. **Compile smart contracts**
   ```bash
   npx hardhat compile
   ```

4. **Deploy contracts**
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```

5. **Start services**
   ```bash
   # Terminal 1: Backend
   cd backend && npm start
   
   # Terminal 2: Oracle
   cd oracle && npm start
   
   # Terminal 3: IoT Simulation
   cd iot-sim && npm start
   
   # Terminal 4: Frontend
   cd frontend && npm start
   ```

## 📖 Usage Guide

### For Farmers

1. **Connect MetaMask Wallet**
   - Install MetaMask browser extension
   - Connect to Sepolia testnet
   - Ensure you have test ETH

2. **Create Insurance Policy**
   - Navigate to "Create Policy" page
   - Set premium amount (0.01 - 10 ETH)
   - Define rainfall threshold (1-50mm)
   - Choose policy duration (7-365 days)
   - Pay premium to activate policy

3. **Monitor Policy Status**
   - View active policies on dashboard
   - Check current weather conditions
   - Track payout eligibility

4. **Receive Payouts**
   - Automatic payout when conditions are met
   - Manual payout execution if eligible
   - Transparent payout history

### For Insurers

1. **Authorize Insurer Account**
   - Contact system administrator
   - Get authorized to create policies
   - Set up monitoring dashboard

2. **Create Policies for Farmers**
   - Use backend API or admin interface
   - Set policy parameters
   - Monitor policy performance

3. **Manage Oracle Network**
   - Monitor oracle node health
   - Validate consensus data
   - Handle disputes if needed

## 🔌 API Documentation

### Policy Management

#### Create Policy
```http
POST /api/policies/create
Content-Type: application/json

{
  "farmerAddress": "0x...",
  "premium": 0.1,
  "threshold": 20,
  "duration": 2592000
}
```

#### Get Policy Status
```http
GET /api/policies/{policyId}/status
```

#### Execute Payout
```http
POST /api/policies/{policyId}/payout
Content-Type: application/json

{
  "farmerAddress": "0x...",
  "payoutAmount": 0.2
}
```

### Oracle Management

#### Send Weather Data
```http
POST /api/oracle/data
Content-Type: application/json

{
  "timestamp": "2024-01-01T00:00:00Z",
  "totalSensors": 15,
  "data": [...],
  "summary": {...}
}
```

#### Get Consensus History
```http
GET /api/oracle/consensus?limit=10
```

#### Simulate Weather Event
```http
POST /api/oracle/simulate
Content-Type: application/json

{
  "eventType": "drought",
  "intensity": 5
}
```

### Farmer Dashboard

#### Get Farmer Policies
```http
GET /api/farmers/{farmerAddress}/dashboard
```

#### Get Policy History
```http
GET /api/farmers/{farmerAddress}/history
```

#### Get Risk Assessment
```http
GET /api/farmers/{farmerAddress}/risk
```

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Smart contract tests
npx hardhat test

# Backend API tests
cd backend && npm test

# Integration tests
npm run test:integration
```

### Test Coverage
```bash
npm run test:coverage
```

### Test Categories

1. **Unit Tests**: Individual component testing
2. **Integration Tests**: End-to-end workflow testing
3. **Security Tests**: Access control and vulnerability testing
4. **Performance Tests**: Load and stress testing

## 🚀 Deployment

### Local Development
```bash
./deploy.sh
```

### Docker Deployment
```bash
docker-compose up -d
```

### Production Deployment (Sepolia Testnet)

1. **Set up environment**
   ```bash
   cp env.example .env
   # Configure production settings
   ```

2. **Deploy contracts**
   ```bash
   npx hardhat run scripts/deploy-sepolia.js --network sepolia
   ```

3. **Deploy services**
   ```bash
   # Deploy backend
   cd backend
   npm run build
   npm start
   
   # Deploy oracle
   cd ../oracle
   npm start
   
   # Deploy frontend
   cd ../frontend
   npm run build
   npm start
   ```

### Environment Variables

#### Required Variables
```bash
PRIVATE_KEY=your_private_key
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_project_id
ETHERSCAN_API_KEY=your_etherscan_api_key
```

#### Optional Variables
```bash
NODE_ENV=production
PORT=3001
ORACLE_ENDPOINT=http://localhost:3002
```

## 🔒 Security Considerations

### Smart Contract Security
- ✅ Reentrancy protection using OpenZeppelin
- ✅ Access control with role-based permissions
- ✅ Input validation and range checking
- ✅ Emergency pause functionality
- ✅ Safe math operations

### API Security
- ✅ Rate limiting to prevent abuse
- ✅ Input validation and sanitization
- ✅ CORS configuration
- ✅ Helmet.js security headers
- ✅ Error handling without information leakage

### Oracle Security
- ✅ Consensus mechanism for data validation
- ✅ Reputation system for oracle nodes
- ✅ Data integrity verification
- ✅ Fault tolerance and redundancy

### Best Practices
- Use hardware wallets for production
- Regularly audit smart contracts
- Monitor oracle network health
- Implement proper access controls
- Keep dependencies updated

## 🔮 Future Work

### Short-term Enhancements
- [ ] **Multi-parameter Index**: Include temperature and soil moisture in payout calculations
- [ ] **Reputation Mechanism**: Enhanced oracle reputation scoring
- [ ] **Mobile App**: React Native mobile application
- [ ] **Real Weather API**: Integration with Chainlink or Redstone oracles

### Medium-term Features
- [ ] **Zero-Knowledge Proofs**: Privacy-preserving policy verification
- [ ] **DAO Governance**: Decentralized autonomous organization for platform management
- [ ] **Cross-chain Support**: Multi-blockchain compatibility
- [ ] **AI Risk Scoring**: Machine learning-based risk assessment

### Long-term Vision
- [ ] **Global Expansion**: Support for multiple countries and currencies
- [ ] **Advanced Analytics**: Predictive modeling for weather patterns
- [ ] **Integration Ecosystem**: Partnerships with agricultural organizations
- [ ] **Regulatory Compliance**: Full compliance with insurance regulations

### Research Areas
- [ ] **Quantum-resistant Cryptography**: Future-proof security measures
- [ ] **Edge Computing**: Distributed IoT processing
- [ ] **Sustainable Farming**: Integration with carbon credit systems
- [ ] **Microfinance Integration**: Combined insurance and lending services

## 🤝 Contributing

We welcome contributions to AgriInsure! Please follow these guidelines:

### Development Process
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- Follow ESLint configuration
- Write comprehensive tests
- Update documentation
- Use conventional commit messages

### Areas for Contribution
- Smart contract improvements
- Frontend UI/UX enhancements
- Oracle network optimization
- Testing and documentation
- Security audits



## 🙏 Acknowledgments

- **OpenZeppelin**: For secure smart contract libraries
- **Ethereum Foundation**: For blockchain infrastructure
- **Hardhat**: For development framework
- **React**: For frontend framework
- **Material-UI**: For UI components












