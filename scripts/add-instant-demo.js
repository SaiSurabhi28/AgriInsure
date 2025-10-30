const hre = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("Adding Instant Demo product for quick testing...\n");

  // Load deployment info
  const deployment = JSON.parse(
    fs.readFileSync('deployments/localhost.json', 'utf8')
  );
  
  const policyFactoryAddress = deployment.contracts.PolicyFactory.address;
  
  // Get contract
  const PolicyFactory = await hre.ethers.getContractFactory("PolicyFactory");
  const policyFactory = PolicyFactory.attach(policyFactoryAddress);
  
  const [deployer] = await hre.ethers.getSigners();
  
  console.log('Current product count:', (await policyFactory.productCounter()).toString());
  
  // Add instant demo product - 1 day min, 0mm threshold (guaranteed trigger)
  console.log("\nAdding 'Instant Demo - 60 Sec Test' product...");
  
  const tx = await policyFactory.addProduct(
    "Instant Demo - 60 Sec Test",  // name
    1,      // minDurationDays (contract minimum is 1 day)
    7,      // maxDurationDays
    0,      // minThreshold (mm) - 0 means GUARANTEED payout!
    10,     // maxThreshold (mm)
    0,      // basePremiumWei (0 ETH - free!)
    0,      // basePayoutWei (0 payout for demo)
    0       // premiumBpsPerDay (0 basis points)
  );
  
  await tx.wait();
  
  const productCount = await policyFactory.productCounter();
  
  console.log("\n✅ Instant Demo product added!");
  console.log(`   Product ID: ${productCount}`);
  console.log("   Premium: 0 ETH (FREE!)");
  console.log("   Duration: 1-7 days");
  console.log("   Threshold: 0-10mm");
  console.log("\n🚀 How to test in 60 seconds:");
  console.log(`1. Go to Create Policy page`);
  console.log(`2. Select 'Instant Demo - 60 Sec Test' (Product ID ${productCount})`);
  console.log(`3. Set duration to 1 day`);
  console.log(`4. Set threshold to 0mm (GUARANTEED TRIGGER)`);
  console.log(`5. Click 'Create Policy' (free, 0 ETH)`);
  console.log(`6. Wait 60 seconds (policy starts)`);
  console.log(`7. Go to 'My Policies' and click 'Finalize Policy'`);
  console.log(`8. Payout will trigger immediately because threshold is 0mm!`);
  console.log(`\n✅ You can test the complete flow in about 2 minutes!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

