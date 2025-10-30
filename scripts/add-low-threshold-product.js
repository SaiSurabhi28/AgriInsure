const { ethers } = require('hardhat');

async function main() {
  console.log('📦 Adding Low Threshold Insurance Product...\n');
  
  // Load contract addresses
  const deployment = require('../deployments/localhost.json');
  const policyFactoryAddress = deployment.contracts.PolicyFactory.address;
  
  const [deployer] = await ethers.getSigners();
  
  const PolicyFactory = await ethers.getContractFactory('PolicyFactory');
  const policyFactory = PolicyFactory.attach(policyFactoryAddress);
  
  console.log('Creating "Low Threshold Rain Insurance" product...');
  console.log('  - Supports thresholds from 1mm to 100mm');
  console.log('  - Perfect for detecting drought conditions');
  console.log('  - Based on your weather dataset (53.9% days have 0mm, 93.4% have ≤1mm)\n');
  
  // Add a product with very low minimum threshold (1mm)
  // This allows policies to trigger on very little rainfall
  const tx = await policyFactory.addProduct(
    "Low Threshold Rain Insurance",  // name
    7,      // minDurationDays
    90,     // maxDurationDays (longer duration for drought monitoring)
    1,      // minThreshold (1 mm) - VERY LOW!
    100,    // maxThreshold (100 mm)
    ethers.parseEther("0.0005"),  // basePremium (0.0005 ETH - lower premium)
    ethers.parseEther("0.002"),   // basePayout (0.002 ETH - 4x premium)
    30      // premiumBpsPerDay (0.3% per day)
  );
  
  await tx.wait();
  console.log('✅ Product created!\n');
  
  const productCount = await policyFactory.productCounter();
  console.log(`Total products: ${productCount}`);
  console.log(`\nYou can now create a policy with Product ID: ${productCount}`);
  console.log('\nExample: Create a policy with threshold = 1mm to trigger payout');
  console.log('         if cumulative rainfall during the policy period is less than 1mm.');
  console.log('\nThis is useful for:');
  console.log('  - Drought detection');
  console.log('  - Areas with very low expected rainfall');
  console.log('  - High-precision weather monitoring');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

