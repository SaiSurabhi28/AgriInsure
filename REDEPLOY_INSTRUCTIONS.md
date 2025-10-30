# 🔄 REdeploy Instructions - Apply Bug Fixes

## Critical: Your Contracts Are Outdated!

**Deployment Date**: October 29, 2025  
**Latest Fixes**: Commits `1f7caf1` and `216b965`  
**Status**: ❌ Contracts deployed BEFORE fixes

---

## Why You Need to Redeploy

Your current contracts have these bugs:
1. ❌ Wrong threshold logic (`<` instead of `>`)
2. ❌ Missing security check (anyone can finalize any policy)
3. ⚠️ Working as intended but you may not understand the behavior

**You cannot test the fixes without redeploying!**

---

## Step-by-Step Redeploy

### Step 1: Stop Everything
```bash
# Stop Hardhat node (Ctrl+C in terminal where it's running)
# Stop backend (Ctrl+C in terminal where backend is running)
```

### Step 2: Clean Old Deployments
```bash
cd "/Users/saipreetham/blockchain project 1/AgriInsure-main"
rm -f deployments/localhost.json
echo "Old deployments deleted"
```

### Step 3: Start Hardhat Node
```bash
# In a NEW terminal window:
cd "/Users/saipreetham/blockchain project 1/AgriInsure-main"
npx hardhat node
# Keep this running in the background
```

### Step 4: Deploy Contracts (in a NEW terminal)
```bash
cd "/Users/saipreetham/blockchain project 1/AgriInsure-main"
npx hardhat run scripts/deploy.js --network localhost
```

Expected output:
```
Deploying AgriInsure contracts...

Deploying OracleAdapter...
OracleAdapter deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3

Deploying Treasury...
Treasury deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

Deploy PolicyFactory...
PolicyFactory deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

Setting up contract authorizations...
PolicyFactory authorized in Treasury
Deployer authorized as reporter

Deployment completed successfully!
```

### Step 5: Add Demo Product
```bash
npx hardhat run scripts/add-zerocost-product.js --network localhost
```

Expected output:
```
✅ Demo product added!
   Product ID: 1
   Premium: 0 ETH (FREE!)
```

### Step 6: Push Initial Oracle Data
```bash
npx hardhat run scripts/push-oracle-data.js --network localhost
```

Expected output:
```
📊 Current latest round: 0
🌧️  Pushing LOW rainfall data (to trigger payout)...
📤 Pushing Round #1: 10mm
   ✅ Pushed
📤 Pushing Round #2: 10mm
   ✅ Pushed
📤 Pushing Round #3: 10mm
   ✅ Pushed
✅ Oracle data pushed successfully!
```

### Step 7: Restart Backend
```bash
cd "/Users/saipreetham/blockchain project 1/AgriInsure-main/backend"
npm start
```

Keep this running in the background.

### Step 8: Verify New Deployment
```bash
# Check that new deployment file was created
cat ../deployments/localhost.json | grep "timestamp"
```

Should show today's date/time.

---

## Test the Fixes

### Test 1: Security Check (Bug #2 Fix)
1. Connect **Account 2** in MetaMask
2. Create a policy with Account 2
3. Switch to **Account 3** in MetaMask
4. Try to finalize Account 2's policy
5. **Expected**: ❌ Error "Only policy holder can finalize"

### Test 2: Threshold Logic (Bug #1 Fix)
1. Create a policy with **threshold: 100mm**
2. Push oracle data with **20mm rainfall**:
   ```bash
   npx hardhat run scripts/push-oracle-data.js --network localhost
   ```
3. Try to finalize policy
4. **Expected**: ❌ Error "Conditions not met" (because 20mm < 100mm)
5. **But if you push data with 150mm**:
   - Should successfully finalize and payout!

---

## Oracle Data Management

### Check Current Oracle Rounds
```bash
# Use this script or similar to check oracle data
npx hardhat console --network localhost
> const Oracle = await ethers.getContractAt("OracleAdapter", "0x5FbDB2315678afecb367f032d93F642f64180aa3")
> await Oracle.latestRoundId()
```

### Push More Oracle Data
```bash
# Push LOW rainfall (e.g., 10mm)
npx hardhat run scripts/push-oracle-data.js --network localhost

# OR push HIGH rainfall by editing the script:
# Change line 40 in scripts/push-oracle-data.js from:
#   const value = 10; // 10mm rainfall (low value)
# To:
#   const value = 150; // 150mm rainfall (high value)
```

---

## Troubleshooting

### Problem: "Could not get contract factory"
**Solution**: Make sure Hardhat node is running

### Problem: "Insufficient funds"
**Solution**: You need ETH in your deployer account. Run:
```bash
npx hardhat run scripts/fund-user.js --network localhost
```

### Problem: "Backend can't connect to contracts"
**Solution**: 
1. Check `deployments/localhost.json` exists
2. Restart backend
3. Check backend console for contract addresses

### Problem: "No oracle data"
**Solution**: Run `push-oracle-data.js` to add initial data

---

## What Gets Reset

After redeploy:
- ✅ All policies deleted
- ✅ All products deleted
- ✅ All oracle rounds deleted
- ✅ Fresh start with fixed contracts

**Your old test data is gone!** But that's okay - you're testing fixes now.

---

## Quick Reference

| What | Command |
|------|---------|
| Deploy everything | `npx hardhat run scripts/deploy.js --network localhost` |
| Add demo product | `npx hardhat run scripts/add-zerocost-product.js --network localhost` |
| Push oracle data | `npx hardhat run scripts/push-oracle-data.js --network localhost` |
| Check latest round | Use hardhat console (see above) |
| Restart backend | `cd backend && npm start` |

---

## Summary

1. ✅ Fixed bugs are in the **code**
2. ⚠️ You **MUST redeploy** to apply fixes
3. ✅ Follow steps above to redeploy
4. ✅ Test with fresh contracts
5. ✅ Oracle data must be pushed manually

**YOU CANNOT TEST FIXES WITHOUT REDEPLOYING!**

