const hre = require("hardhat");

async function main() {
  console.log('🌧️  Pushing HIGH Rainfall Data for Testing...\n');
  
  // Load contract addresses
  const deployment = require('../deployments/localhost.json');
  const oracleAddress = deployment.contracts.OracleAdapter.address;
  
  console.log(`📡 Connecting to OracleAdapter at ${oracleAddress}`);
  
  const [deployer] = await hre.ethers.getSigners();
  console.log(`👤 Deployer account: ${deployer.address}`);
  
  const OracleAdapter = await hre.ethers.getContractFactory('OracleAdapter');
  const oracle = OracleAdapter.attach(oracleAddress);
  
  // Check if deployer is authorized
  const isAuthorized = await oracle.isReporter(deployer.address);
  console.log(`🔐 Authorized as reporter: ${isAuthorized}\n`);
  
  if (!isAuthorized) {
    console.log('❌ Deployer is not authorized as reporter!');
    console.log('Please authorize this account first.');
    return;
  }
  
  // Get current latest round
  let latestRoundId = await oracle.latestRoundId();
  console.log(`📊 Current latest round: ${latestRoundId}\n`);
  
  // Push HIGH rainfall data (to test threshold triggers)
  const roundsToPush = 5;
  const currentTime = Math.floor(Date.now() / 1000);
  
  console.log('🌧️  Pushing HIGH rainfall data (for threshold testing)...\n');
  console.log('💡 Values will be: 50mm, 100mm, 75mm, 150mm, 25mm\n');
  
  const highValues = [50, 100, 75, 150, 25]; // Higher values for testing
  
  for (let i = 0; i < roundsToPush; i++) {
    const roundId = latestRoundId + BigInt(i + 1);
    const value = highValues[i]; // Use higher values
    const timestamp = currentTime - (roundsToPush - i) * 3600; // Spread over time
    
    console.log(`📤 Pushing Round #${roundId}: ${value}mm at ${new Date(timestamp * 1000).toLocaleString()}`);
    
    try {
      const tx = await oracle.push(roundId, value, timestamp);
      await tx.wait();
      
      console.log(`   ✅ Pushed (tx: ${tx.hash})`);
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
    }
  }
  
  console.log('\n✅ HIGH rainfall data pushed successfully!');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💡 Testing Guide:');
  console.log('   If you create a policy with threshold < 50mm');
  console.log('   → Payout will trigger (rainfall 50mm > threshold)');
  console.log('   If you create a policy with threshold > 150mm');
  console.log('   → NO payout (rainfall 150mm < threshold)');
  console.log('\n💡 Example:');
  console.log('   - Policy threshold: 10mm');
  console.log('   - Latest rainfall: 50mm, 100mm, 75mm, etc.');
  console.log('   - 50mm > 10mm → ✅ Payout triggers!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

