const hre = require("hardhat");

async function main() {
  console.log("Quick Demo Test - Creating a 1-day policy for testing...\n");

  // Load deployment info
  const deployment = require('./deployments/localhost.json');
  const policyFactoryAddress = deployment.contracts.PolicyFactory.address;
  
  // Get contract
  const PolicyFactory = await hre.ethers.getContractFactory("PolicyFactory");
  const policyFactory = PolicyFactory.attach(policyFactoryAddress);
  
  // Use Account 2 for testing
  const [deployer] = await hre.ethers.getSigners();
  console.log('Using account:', deployer.address);
  
  // Get product 1 (Demo - Free Insurance)
  const product = await policyFactory.getProduct(1);
  console.log('Using Product:', product.name);
  console.log('Min Duration:', product.minDurationDays, 'days');
  console.log('Max Duration:', product.maxDurationDays, 'days\n');
  
  // Check if user has active policy
  const hasActive = await policyFactory.hasActivePolicy(deployer.address);
  if (hasActive) {
    console.log('❌ User already has an active policy');
    console.log('Please finalize or wait for current policy to expire');
    return;
  }
  
  // Calculate timestamps
  const now = Math.floor(Date.now() / 1000);
  const startTs = now + 60; // Start in 60 seconds
  const durationDays = 1; // Minimum 1 day (86400 seconds)
  
  // Price the policy
  const [premiumWei, payoutWei] = await policyFactory.pricePolicy(1, durationDays);
  console.log('Premium:', hre.ethers.formatEther(premiumWei), 'ETH');
  console.log('Payout:', hre.ethers.formatEther(payoutWei), 'ETH\n');
  
  console.log('Creating policy...');
  console.log('Start:', new Date(startTs * 1000).toLocaleString());
  console.log('Duration:', durationDays, 'day(s)');
  console.log('End:', new Date((startTs + durationDays * 86400) * 1000).toLocaleString());
  console.log('Threshold: 1mm\n');
  
  // Create policy
  const tx = await policyFactory.createPolicy(
    1,           // productId
    startTs,     // startTs
    durationDays, // durationDays
    1            // threshold (1mm - very low, should trigger payout)
  );
  
  console.log('Transaction sent:', tx.hash);
  const receipt = await tx.wait();
  console.log('✅ Policy created!\n');
  
  // Get policy ID from event
  const event = receipt.logs.find(log => {
    try {
      const parsed = policyFactory.interface.parseLog(log);
      return parsed.name === 'PolicyCreated';
    } catch (e) {
      return false;
    }
  });
  
  let policyId;
  if (event) {
    const parsed = policyFactory.interface.parseLog(event);
    policyId = parsed.args.policyId.toString();
    console.log('Policy ID:', policyId);
  }
  
  console.log('\n📋 Next Steps:');
  console.log('1. Wait 60 seconds (policy starts)');
  console.log('2. Go to "My Policies" page');
  console.log('3. Click "Finalize Policy"');
  console.log('4. Check if payout was triggered (should be yes for 1mm threshold)');
  console.log('\n💡 Note: If oracle data is already above 1mm, payout won\'t trigger');
  console.log('   But you can still test the finalization flow');
  console.log('   Policy will expire after 1 day if conditions not met');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

