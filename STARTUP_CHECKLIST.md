# 🚀 Startup Checklist for Next Session

## Before Starting Development:

### 1. Start Services (in order):
```bash
# Terminal 1: Start Hardhat node
cd "/Users/saipreetham/blockchain project 1/AgriInsure-main"
npx hardhat node

# Terminal 2: Deploy contracts (if contract was changed)
cd "/Users/saipreetham/blockchain project 1/AgriInsure-main"
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost

# Terminal 3: Start backend
cd "/Users/saipreetham/blockchain project 1/AgriInsure-main/backend"
npm start

# Terminal 4: Start frontend
cd "/Users/saipreetham/blockchain project 1/AgriInsure-main/frontend"
npm start
```

### 2. Verify Services are Running:
- ✅ Hardhat node: http://localhost:8545
- ✅ Backend: http://localhost:3001
- ✅ Frontend: http://localhost:3000

### 3. Important Configurations:
- **Rate limiting**: Weather endpoint is excluded (backend/index.js)
- **Contract validation**: Finalize reverts if conditions not met (PolicyFactory.sol)
- **Error messages**: Enhanced in MyPolicies.js with detailed policy info

## Key Features Implemented:
1. ✅ One active policy per account
2. ✅ Policy finalization with condition validation
3. ✅ Detailed error messages (conditions, threshold, dates)
4. ✅ Dashboard auto-refresh on policy events
5. ✅ Weather feed (no rate limiting)
6. ✅ Create policy with active policy check

## Files Modified This Session:
- `frontend/src/components/MyPolicies.js`
- `frontend/src/components/CreatePolicy.js`
- `frontend/src/components/Dashboard.js`
- `frontend/src/components/WeatherFeed.js`
- `backend/index.js`
- `contracts/PolicyFactory.sol`

## Notes:
- All syntax errors have been fixed
- All linter errors resolved
- Contract needs redeployment if PolicyFactory.sol was modified
- Backend needs restart if index.js was modified

