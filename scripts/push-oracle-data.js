const { ethers } = require('hardhat');

async function main() {
  console.log('🔮 Pushing Oracle Data...\n');
  
  // Load contract addresses
  const deployment = require('../deployments/localhost.json');
  const oracleAddress = deployment.contracts.OracleAdapter.address;
  
  console.log(`📡 Connecting to OracleAdapter at ${oracleAddress}`);
  
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer account: ${deployer.address}`);
  
  const OracleAdapter = await ethers.getContractFactory('OracleAdapter');
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
  
  // Push some oracle data (simulate LOW rainfall for payout trigger)
  const roundsToPush = 3;
  const currentTime = Math.floor(Date.now() / 1000);
  
  console.log('🌧️  Pushing LOW rainfall data (to trigger payout)...\n');
  
  for (let i = 1; i <= roundsToPush; i++) {
    const roundId = latestRoundId + BigInt(i);
    const value = 10; // 10mm rainfall (low value)
    const timestamp = currentTime - (roundsToPush - i) * 3600; // Spread over time
    
    console.log(`📤 Pushing Round #${roundId}: ${value}mm at ${new Date(timestamp * 1000).toLocaleString()}`);
    
    const tx = await oracle.push(roundId, value, timestamp);
    await tx.wait();
    
    console.log(`   ✅ Pushed (tx: ${tx.hash})`);
  }
  
  console.log('\n✅ Oracle data pushed successfully!');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💡 Now you can:');
  console.log('1. Go to http://localhost:3000');
  console.log('2. Click "Finalize Policy" on one of your policies');
  console.log('3. Get paid if conditions are met! 💰');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
