const hre = require("hardhat");
const fs = require('fs');

async function main() {
  console.log('Setting up Company Account (Account 1) as Treasury owner...\n');
  
  // Load deployment info
  const deployment = JSON.parse(
    fs.readFileSync('deployments/localhost.json', 'utf8')
  );
  
  const insuranceAccount = '0xb476606d9cefb93651684bec614e9bbe9752848e';
  
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deployer (current owner):', deployer.address);
  
  // Get Treasury contract
  const Treasury = await hre.ethers.getContractAt(
    "Treasury",
    deployment.contracts.Treasury.address
  );
  
  console.log('\n📋 Treasury Contract:', deployment.contracts.Treasury.address);
  console.log('🏢 Insurance Account (Account 1):', insuranceAccount);
  
  // Check current owner
  const currentOwner = await Treasury.owner();
  console.log('\nCurrent Treasury Owner:', currentOwner);
  
  // Transfer ownership to insurance account
  if (currentOwner.toLowerCase() === insuranceAccount.toLowerCase()) {
    console.log('✅ Treasury already owned by Insurance Account');
  } else {
    console.log('\nTransferring Treasury ownership to Insurance Account...');
    const tx = await Treasury.transferOwnership(insuranceAccount);
    console.log('Transaction hash:', tx.hash);
    await tx.wait();
    console.log('✅ Treasury ownership transferred to Insurance Account');
  }
  
  // Verify new owner
  const newOwner = await Treasury.owner();
  console.log('\nNew Treasury Owner:', newOwner);
  
  // Also set insuranceAccount in PolicyFactory
  console.log('\n📋 Setting insuranceAccount in PolicyFactory...');
  const PolicyFactory = await hre.ethers.getContractAt(
    "PolicyFactory",
    deployment.contracts.PolicyFactory.address
  );
  
  const currentInsuranceAccount = await PolicyFactory.insuranceAccount();
  console.log('Current insuranceAccount in PolicyFactory:', currentInsuranceAccount);
  
  if (currentInsuranceAccount.toLowerCase() === insuranceAccount.toLowerCase()) {
    console.log('✅ insuranceAccount already set correctly');
  } else {
    console.log('\nSetting insuranceAccount in PolicyFactory...');
    const tx2 = await PolicyFactory.setInsuranceAccount(insuranceAccount);
    console.log('Transaction hash:', tx2.hash);
    await tx2.wait();
    console.log('✅ insuranceAccount set in PolicyFactory');
  }
  
  // Verify
  const updatedInsuranceAccount = await PolicyFactory.insuranceAccount();
  console.log('\nUpdated insuranceAccount in PolicyFactory:', updatedInsuranceAccount);
  
  // Show Treasury balance
  const treasuryBalance = await Treasury.getBalance();
  console.log('\n💰 Treasury Balance:', hre.ethers.formatEther(treasuryBalance), 'ETH');
  
  console.log('\n✅ Company Account setup complete!');
  console.log('\nSummary:');
  console.log('- Treasury owner: Insurance Account (Account 1)');
  console.log('- PolicyFactory insuranceAccount: Insurance Account (Account 1)');
  console.log('- All premium payments go to Treasury (Account 1 pool)');
  console.log('- All payouts are deducted from Treasury');
  console.log('- Expired/Unclaimed policies: Premium stays in Treasury');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

