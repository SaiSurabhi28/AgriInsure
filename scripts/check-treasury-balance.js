const hre = require("hardhat");
const fs = require('fs');

async function main() {
  console.log('Checking Treasury Balance...\n');
  
  // Load deployment info
  const deployment = JSON.parse(
    fs.readFileSync('deployments/localhost.json', 'utf8')
  );
  
  const treasuryAddress = deployment.contracts.Treasury.address;
  
  console.log('Treasury Contract:', treasuryAddress);
  
  // Get Treasury balance directly
  const balance = await hre.ethers.provider.getBalance(treasuryAddress);
  console.log('\n💰 Treasury Balance:', hre.ethers.formatEther(balance), 'ETH');
  
  // Also check via contract if possible
  try {
    const Treasury = await hre.ethers.getContractAt("Treasury", treasuryAddress);
    const contractBalance = await Treasury.getBalance();
    console.log('📋 Contract-reported Balance:', hre.ethers.formatEther(contractBalance), 'ETH');
  } catch (err) {
    console.log('⚠️  Could not read via contract (might be old deployment)');
  }
  
  if (balance === 0n) {
    console.log('\n❌ Treasury has NO funds!');
    console.log('This is why finalization failed.');
    console.log('\n💡 Solution: Treasury needs ETH to pay out claims.');
    console.log('Treasury balance should be > 0 when policies are created (premiums go to Treasury).');
    console.log('\n🔍 Debugging:');
    console.log('1. Were policies created with premium > 0?');
    console.log('2. Did funds transfer to Treasury on policy creation?');
    console.log('3. Check policy premium: 0 ETH means no premium collected!');
  } else {
    console.log('\n✅ Treasury has funds');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

