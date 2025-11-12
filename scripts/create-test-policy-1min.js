const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🧪 Creating 1-Minute Test Policy\n');

  // Load deployment info
  const deploymentFile = path.join(__dirname, '..', 'deployments', 'localhost.json');
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
  
  const policyFactoryAddress = deploymentInfo.contracts.PolicyFactory.address;
  
  // Get contracts
  const PolicyFactory = await hre.ethers.getContractFactory("PolicyFactory");
  const policyFactory = PolicyFactory.attach(policyFactoryAddress);
  
  // Get signer (use account 2 as farmer)
  const signers = await hre.ethers.getSigners();
  const farmer = signers[1]; // Account 2 (0x70997970C51812dc3A010C7d01b50e0d17dc79C8)
  
  console.log('👤 Farmer:', await farmer.getAddress());
  
  // Use first product
  const productId = 1;
  const durationSeconds = 60; // 60 seconds = 1 minute
  const threshold = 50;
  
  // Get product details to find minimum duration for pricing
  const product = await policyFactory.getProduct(productId);
  const minDurationForPricing = Number(product.minDurationDays);
  
  // Get pricing (use minimum duration from product, contract will use 1 day if less than 1 day)
  const [premiumWei, payoutWei] = await policyFactory.pricePolicy(productId, minDurationForPricing);
  
  console.log('📋 Policy Details:');
  console.log('   Product ID:', productId);
  console.log('   Duration: 60 seconds (1 minute)');
  console.log('   Threshold:', threshold, 'mm');
  console.log('   Premium:', hre.ethers.formatEther(premiumWei), 'ETH');
  console.log('   Payout:', hre.ethers.formatEther(payoutWei), 'ETH');
  console.log('');
  
  console.log('📝 Creating policy...');
  console.log('   Start: Immediate (current block time)');
  console.log('   Duration: 60 seconds');
  console.log('');

  const tx = await policyFactory.connect(farmer).createTestPolicy(
    productId,
    durationSeconds,
    threshold,
    { value: premiumWei }
  );
  
  console.log('   Transaction:', tx.hash);
  const receipt = await tx.wait();
  
  // Get policy ID from event
  const events = receipt.logs;
  const policyCreatedEvent = events.find(e => e.eventName === 'PolicyCreated');
  const policyId = policyCreatedEvent?.args?.policyId || 'unknown';
  
  console.log('   ✅ Policy created successfully!\n');
  
  console.log('📊 Policy Information:');
  const policy = await policyFactory.getPolicy(policyId);
  console.log('   Policy ID:', policyId.toString());
  console.log('   Holder:', policy.holder);
  console.log('   Status:', ['Active', 'PaidOut', 'Expired'][Number(policy.status)]);
  console.log('   Start:', new Date(Number(policy.startTs) * 1000).toLocaleString());
  console.log('   End:', new Date(Number(policy.endTs) * 1000).toLocaleString());
  console.log('   Duration:', (Number(policy.endTs) - Number(policy.startTs)), 'seconds');
  console.log('   Expires in:', Math.max(0, Number(policy.endTs) - Math.floor(Date.now() / 1000)), 'seconds');
  console.log('');
  
  console.log('✅ Test policy created!');
  console.log('');
  console.log('💡 Next Steps:');
  console.log('   1. Wait 60 seconds for policy to expire');
  console.log('   2. Call finalize() to check payout conditions');
  console.log('   3. Or call expirePolicy() if conditions not met');
  console.log('');
  console.log('🔗 Quick Commands:');
  console.log('   Check status: npx hardhat run scripts/check-policy.js --network localhost');
  console.log('   Finalize: Use frontend "Finalize Policy" button');
  console.log('   Expire: curl -X POST http://localhost:3001/api/policies/' + policyId + '/expire');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

