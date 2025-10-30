# ❌ "Insufficient Gas" Error - Insurance Account

## Problem

Policy #15 was created by **Insurance Account** (`0xb476606D9CEFb93651684BEc614e9Bbe9752848e`), but that account is showing insufficient funds.

## Diagnosis

The check-balances script showed Insurance Account has **109.9987 ETH**, which is more than enough!

**BUT** - You're probably not connected to that account in MetaMask.

## Solution

### Step 1: Check Which Account You're Using

1. Open MetaMask
2. Look at the top left - what account is selected?
3. Is it "Account 1", "Account 2", etc.?

### Step 2A: If You're Using One of the Test Accounts

These accounts are already funded:
- **Account 2**: `0xfc0b683c5449d5616085b5c45b502b4db84c2691` → 109.99 ETH ✅
- **Account 3**: `0x01f3d3463f5dea67f35aab3f89cc78cb09613db7` → 109.99 ETH ✅
- **Account 4**: `0xa11350f3a034685dd70efcc9a1a2d7a61ed2670b` → 109.99 ETH ✅
- **Insurance Account**: `0xb476606D9CEFb93651684BEc614e9Bbe9752848e` → 109.99 ETH ✅

**Solution**: Make sure you're connected to the correct account in MetaMask!

### Step 2B: If You're Using a Different Account

If you're using a different MetaMask account:

1. **Get your address**:
   - Click on your account name in MetaMask
   - Copy the address (starts with 0x...)

2. **Fund that account**:
   ```bash
   npx hardhat run scripts/fund-quick.js --network localhost <YOUR_ADDRESS>
   ```

3. **Retry** the finalization

### Step 2C: If Insurance Account Doesn't Have Funds

Even though balance check shows funds, there might be a sync issue:

```bash
# Re-fund Insurance Account specifically
npx hardhat run scripts/fund-user.js --network localhost
```

## Quick Check: Which Account Created Policy #15?

Policy #15 holder: `0xb476606D9CEFb93651684BEc614e9Bbe9752848e`

**This is the Insurance Account!**

To finalize this policy, you **MUST** be connected to Insurance Account in MetaMask.

## How to Switch Accounts in MetaMask

1. Open MetaMask
2. Click the account dropdown (top left)
3. If Insurance Account is imported, select it
4. If not imported, click "Import Account"
5. Enter this private key (if available): [You'd need the private key for Insurance Account]

## Alternative: Create a Policy with Current Account

Instead of finalizing Policy #15:
1. Make sure you're connected to a funded account
2. Create a NEW policy with that account
3. You can finalize YOUR policies

## Why This Happens

- Each account in MetaMask has a separate balance
- You can only finalize policies YOU created
- If you're not connected to Insurance Account, you can't finalize its policies

## Quick Test

Run this to check all balances again:
```bash
npx hardhat run scripts/check-balances.js --network localhost
```

## Summary

| Issue | Solution |
|-------|----------|
| "Insufficient gas" | All test accounts funded - check you're on correct account |
| Policy #15 is Insurance Account's | Must connect to Insurance Account to finalize |
| Using different account | Fund that specific account with fund-quick.js |
| Account has funds but still failing | Try re-funding or restart MetaMask |

**Most Common Cause**: You're not connected to the correct account in MetaMask!

