const { ethers } = require('hardhat');

async function main() {
  console.log('🔍 Checking Policy Status...\n');
  
  // Load contract addresses
  const deployment = require('../deployments/localhost.json');
  const policyFactoryAddress = deployment.contracts.PolicyFactory.address;
  const oracleAddress = deployment.contracts.OracleAdapter.address;
  
  console.log(`📡 Connecting to PolicyFactory at ${policyFactoryAddress}`);
  console.log(`📡 Connecting to OracleAdapter at ${oracleAddress}\n`);
  
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer account: ${deployer.address}\n`);
  
  const PolicyFactory = await ethers.getContractFactory('PolicyFactory');
  const policyFactory = PolicyFactory.attach(policyFactoryAddress);
  
  const OracleAdapter = await ethers.getContractFactory('OracleAdapter');
  const oracle = OracleAdapter.attach(oracleAddress);
  
  // Check policy 1
  console.log('📋 Checking Policy #1...\n');
  try {
    const policy = await policyFactory.getPolicy(1);
    
    console.log('Policy Data:');
    console.log('  Holder:', policy.holder);
    console.log('  Product ID:', policy.productId.toString());
    console.log('  Start Time:', new Date(Number(policy.startTs) * 1000).toLocaleString());
    console.log('  End Time:', new Date(Number(policy.endTs) * 1000).toLocaleString());
    console.log('  Threshold:', policy.threshold.toString(), 'mm');
    console.log('  Premium Paid:', ethers.formatEther(policy.premiumPaid), 'ETH');
    console.log('  Payout Amount:', ethers.formatEther(policy.payoutAmount), 'ETH');
    console.log('  Status:', ['Active', 'PaidOut', 'Expired'][Number(policy.status)]);
    console.log('');
    
    // Check if policy is expired
    const now = Math.floor(Date.now() / 1000);
    const isExpired = now >= Number(policy.endTs);
    const isActive = Number(policy.status) === 0;
    
    console.log('Policy Analysis:');
    console.log('  Current Time:', new Date(now * 1000).toLocaleString());
    console.log('  Is Expired:', isExpired);
    console.log('  Is Active:', isActive);
    console.log('  Can Finalize:', (isActive && isExpired) || isActive ? '✅ YES' : '❌ NO');
    console.log('');
    
    // Check oracle data
    if (isActive) {
      console.log('🔮 Checking Oracle Data...\n');
      
      const startTs = Number(policy.startTs);
      const endTs = Number(policy.endTs);
      
      console.log(`Oracle window: ${new Date(startTs * 1000).toLocaleString()} to ${new Date(endTs * 1000).toLocaleString()}`);
      
      try {
        const sumInWindow = await oracle.sumInWindow(startTs, endTs);
        console.log('📊 Total rainfall in window:', sumInWindow.toString(), 'mm');
        console.log('🎯 Threshold:', policy.threshold.toString(), 'mm');
        console.log('');
        
        const shouldPayout = sumInWindow < policy.threshold;
        console.log('💰 Payout Decision:');
        console.log(`   ${sumInWindow}mm < ${policy.threshold}mm ? ${shouldPayout ? '✅ YES - WILL PAY' : '❌ NO - NO PAYOUT'}`);
        console.log('');
      } catch (err) {
        console.log('❌ Error checking oracle data:', err.message);
        console.log('   This might be why finalization fails!');
        console.log('');
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 What This Means:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (!isActive) {
      console.log('❌ Policy is NOT active anymore.');
      console.log('   Status:', ['Active', 'PaidOut', 'Expired'][Number(policy.status)]);
      console.log('   You cannot finalize this policy again.');
    } else if (!isExpired) {
      console.log('⏳ Policy is still ACTIVE and not expired yet.');
      console.log('   You can still finalize it (early claim).');
    } else if (isExpired) {
      console.log('⏰ Policy is EXPIRED.');
      console.log('   You can finalize it now.');
    }
    console.log('');
    
  } catch (err) {
    console.log('❌ Error getting policy:', err.message);
    console.log('   Policy #1 might not exist.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
