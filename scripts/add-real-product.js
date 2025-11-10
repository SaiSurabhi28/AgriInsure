const { ethers } = require('hardhat');

async function main() {
  console.log('📦 Adding Real Insurance Product...\n');
  
  // Load contract addresses
  const deployment = require('../deployments/localhost.json');
  const policyFactoryAddress = deployment.contracts.PolicyFactory.address;
  
  const [deployer] = await ethers.getSigners();
  
  const PolicyFactory = await ethers.getContractFactory('PolicyFactory');
  const policyFactory = PolicyFactory.attach(policyFactoryAddress);
  
  console.log('Creating "Corn Rain Insurance" product...');
  
  // Add a real product with actual premium and payout
  const tx = await policyFactory.addProduct(
    "Corn Rain Insurance",  // name
    7,      // minDurationDays
    30,     // maxDurationDays
    20,     // minThreshold (mm)
    100,    // maxThreshold (mm)
    ethers.parseEther("0.001"),  // basePremium (0.001 ETH)
    ethers.parseEther("0.005"),  // basePayout (0.005 ETH)
    50      // premiumBpsPerDay (0.5% per day)
  );
  
  await tx.wait();
  console.log('✅ Product created!\n');
  
  const productCount = await policyFactory.productCounter();
  console.log(`Total products: ${productCount}`);
  console.log(`\nYou can now create a policy with Product ID: ${productCount}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
