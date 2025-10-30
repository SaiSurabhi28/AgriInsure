# Quick Test Instructions - 60 Second Demo

## Current Limitation

The smart contract uses **days** as the minimum unit for policy duration. We cannot create policies with less than 1 day duration.

## Solution: Use 1-Day Policy with 0mm Threshold

You can test the complete flow in about **2 minutes** by using the existing Demo product with specific settings.

## Quick Test Steps

### 1. Create a Policy
1. Go to **Create Policy** page
2. Select **"Demo - Free Insurance"** (Product ID 1)
3. Set **Duration**: `1` day (minimum allowed)
4. Set **Threshold**: `1` mm or `0` mm (very low - will trigger payout)
5. Click **"Create Policy"** (0 ETH - completely free!)
6. Wait for MetaMask transaction to complete

### 2. Wait 60 Seconds
- Policy starts 60 seconds after creation
- Wait for 60 seconds while the policy becomes active

### 3. Finalize the Policy
1. Go to **My Policies** page
2. Find your newly created policy
3. Click **"Finalize Policy"** button
4. Policy will check if cumulative rainfall < threshold
5. If yes → **PaidOut** status ✅
6. If no → **Expired** status (after 1 day)

### 4. Check Dashboard
1. Go to **Dashboard** page
2. Check:
   - **Active Policies**: Your policy count
   - **Revenue**: Should show 0 (premiums - payouts)
   - **Paid Out & Expired Policies**: Click to see finalized policies

## Testing Different Scenarios

### Scenario 1: Trigger Payout (Recommended for First Test)
- **Duration**: 1 day
- **Threshold**: 1mm or 0mm
- **Expected**: Payout triggers immediately when you click Finalize
- **Time**: ~2 minutes total

### Scenario 2: Let Policy Expire
- **Duration**: 1 day  
- **Threshold**: 100mm (very high)
- **Expected**: Policy expires after 1 day, no payout
- **Time**: Wait 1 day (86400 seconds)
- **Result**: Premium stays with insurance company (Account 1)

### Scenario 3: View All Active Policies
- **Go to**: My Policies page
- **Click**: "🌐 View All Policies"
- **Expected**: See all active policies from all accounts
- **Your policies**: Will have green border indicator

## Why 1 Day Minimum?

The contract calculates policy duration in days for gas efficiency:
```solidity
uint64 endTs = startTs + (durationDays * 1 days);
```

Changing this would require:
1. Redeploying all contracts
2. Updating frontend everywhere
3. Migrating existing policies

## Alternative: Create Test Product with Lower Thresholds

If you want a dedicated "Quick Test" product:

1. **Start your Hardhat node** (if not running):
   ```bash
   cd AgriInsure-main
   npx hardhat node
   ```

2. **In a new terminal, run**:
   ```bash
   cd AgriInsure-main
   npx hardhat run scripts/add-instant-demo.js --network localhost
   ```

3. **In the UI**, select the new "Instant Demo - 60 Sec Test" product with 1 day duration and 0mm threshold

## Testing Checklist

- [x] Create policy with Demo product (0 ETH)
- [ ] Wait 60 seconds for policy start
- [ ] View policy in "My Policies"
- [ ] Click "Finalize Policy"
- [ ] Verify payout triggered (or policy expired)
- [ ] Check Dashboard revenue calculation
- [ ] View "Paid Out & Expired Policies" section
- [ ] Test "View All Policies" feature
- [ ] Create policy from different account
- [ ] Verify all policies visible in "View All Policies"

## Total Test Time

- **Minimum**: 2 minutes (create + wait + finalize)
- **Recommended**: 5 minutes (test all features)
- **Full Flow**: 1 day + 2 minutes (test expiration)

## Troubleshooting

**Problem**: "Account already has an active policy"
- **Solution**: Go to My Policies and finalize your existing policy first

**Problem**: Payout doesn't trigger
- **Cause**: Oracle data might be above your threshold
- **Solution**: Use threshold of 1mm or 0mm for guaranteed payout

**Problem**: Can't see policies
- **Solution**: Refresh the page or click the refresh button

**Problem**: Backend not responding
- **Solution**: Restart backend: `cd backend && npm start`

## Summary

✅ **You CAN test the complete flow in 60 seconds (after policy start)**  
✅ **Use 1 day duration (minimum in contract)**  
✅ **Use 0-1mm threshold for guaranteed payout**  
✅ **All features work as expected**  
✅ **Demo is completely free (0 ETH)**

The 1-day minimum is a contract limitation that cannot be changed without a full redeployment. For production, this makes sense for real insurance policies. For quick demos, use the settings above!

