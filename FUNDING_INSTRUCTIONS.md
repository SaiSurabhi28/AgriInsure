# 💰 Account Funding Instructions

## After Every Hardhat Restart

**Important**: When you restart Hardhat node, all accounts reset to 0 ETH. You need to fund them again.

## Quick Fix: Fund All Accounts

```bash
cd "/Users/saipreetham/blockchain project 1/AgriInsure-main"
npx hardhat run scripts/fund-all-test-accounts.js --network localhost
```

This funds all 4 test accounts with 10 ETH each.

## Individual Account Funding

### Fund MetaMask Account
If you need to fund your current MetaMask account:

```bash
npx hardhat run scripts/fund-quick.js --network localhost <YOUR_METAMASK_ADDRESS>
```

Replace `<YOUR_METAMASK_ADDRESS>` with your actual MetaMask address.

### Get Your MetaMask Address
1. Open MetaMask
2. Click on your account name (usually "Account 1")
3. Click "Copy" next to the address (starts with 0x...)

## Standard Test Accounts

These accounts are pre-configured for testing:

| Account | Address | Purpose |
|---------|---------|---------|
| Insurance Account | `0xb476606d9cefb93651684bec614e9bbe9752848e` | Company/Treasury |
| Account 2 | `0xfc0b683c5449d5616085b5c45b502b4db84c2691` | Policy holder test |
| Account 3 | `0x01f3d3463f5dea67f35aab3f89cc78cb09613db7` | Policy holder test |
| Account 4 | `0xa11350f3a034685dd70efcc9a1a2d7a61ed2670b` | Policy holder test |

## Check Balances

To verify account balances:

```bash
npx hardhat run scripts/check-balances.js --network localhost
```

## Gas Costs

Typical gas costs on Hardhat:
- Create policy: ~0.0001 - 0.0003 ETH
- Finalize policy: ~0.0001 - 0.0003 ETH
- Other transactions: ~0.0001 ETH

**10 ETH is more than enough for hundreds of transactions!**

## Why Accounts Need Funding

### On Production Networks
- Real ETH costs real money
- You need to buy ETH from exchanges
- Gas fees are paid to validators

### On Hardhat Local Network
- ETH is "fake" and free
- Hardhat automatically gives deployer 10,000 ETH
- All other accounts start with 0 ETH
- Need to transfer from deployer to test accounts

## Troubleshooting

### Problem: "Insufficient funds for gas"
**Solution**: Run funding script above

### Problem: "Transaction failed"
**Solution**: 
1. Check you're on correct network (Localhost 8545 in MetaMask)
2. Make sure Hardhat node is running
3. Try funding account again

### Problem: "Account not funded after running script"
**Solution**:
1. Check Hardhat node is running
2. Make sure you're using `--network localhost`
3. Check console for errors

## Workflow for Testing

1. **Start Hardhat node**:
   ```bash
   npx hardhat node
   ```

2. **Deploy contracts**:
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```

3. **Fund accounts**:
   ```bash
   npx hardhat run scripts/fund-all-test-accounts.js --network localhost
   ```

4. **Add products**:
   ```bash
   npx hardhat run scripts/add-zerocost-product.js --network localhost
   ```

5. **Push oracle data**:
   ```bash
   npx hardhat run scripts/push-oracle-data.js --network localhost
   ```

6. **Start backend**:
   ```bash
   cd backend && npm start
   ```

7. **Test in browser**:
   - Open http://localhost:3000
   - Connect MetaMask
   - Create and finalize policies!

## Important Notes

- ⚠️ **After ANY Hardhat restart, you MUST fund accounts again**
- ✅ Funding is instant and "free" on Hardhat
- ✅ All test accounts use the same addresses
- ✅ Gas fees are negligible on Hardhat (fractions of a penny)

