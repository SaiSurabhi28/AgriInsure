const hre = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("Adding 60-second demo product...\n");

  // Load deployment info
  const deployment = JSON.parse(
    fs.readFileSync('deployments/localhost.json', 'utf8')
  );
  
  const policyFactoryAddress = deployment.contracts.PolicyFactory.address;
  
  // Get contract
  const PolicyFactory = await hre.ethers.getContractFactory("PolicyFactory");
  const policyFactory = PolicyFactory.attach(policyFactoryAddress);
  
  const [deployer] = await hre.ethers.getSigners();
  
  console.log('🔍 Current products:');
  const productCount = await policyFactory.productCounter();
  console.log(`   Total products: ${productCount}\n`);
  
  // Add 60-second demo product (minimum is 1 day, but we'll set it to 0.01 days = 14.4 minutes)
  // For 60 seconds, we need to use a fraction
  // 1 day = 86400 seconds
  // 60 seconds = 60/86400 = 0.0006944 days
  // Since contract uses uint64 for days, minimum is 1 day
  
  // Alternative: We'll create a product with minDurationDays = 1 but with a very low threshold
  // and users can set a high threshold to trigger quickly
  console.log("Adding 'Quick Demo - 60 Sec' product...");
  console.log("Note: Duration minimum is 1 day in the contract");
  console.log("For 60-second testing, create a policy with:");
  console.log("  - Duration: 1 day (minimum allowed)");
  console.log("  - Threshold: 1mm (very low - will likely trigger payout)\n");
  
  const tx = await policyFactory.addProduct(
    "Quick Demo - 60 Sec Test",  // name
    1,      // minDurationDays (minimum in contract)
    1,      // maxDurationDays (force 1 day only)
    1,      // minThreshold (mm) - very low, likely to trigger
    1,      // maxThreshold (mm) - only option
    0,      // basePremiumWei (0 ETH - free!)
    0,      // basePayoutWei (0 payout for demo)
    0       // premiumBpsPerDay (0 basis points = no daily fee)
  );
  
  await tx.wait();
  
  // Get the product ID
  const newProductCount = await policyFactory.productCounter();
  
  console.log("\n✅ Quick Demo product added!");
  console.log(`   Product ID: ${newProductCount}`);
  console.log("   Premium: 0 ETH (FREE!)");
  console.log("   Duration: 1 day minimum (contract limitation)");
  console.log("   Threshold: 1mm (very low - will likely trigger payout)");
  console.log("\n📝 How to test in 60 seconds:");
  console.log("1. Create a policy with this product (Product ID " + newProductCount + ")");
  console.log("2. Set duration to 1 day and threshold to 1mm");
  console.log("3. Wait 60 seconds");
  console.log("4. Click 'Finalize Policy' - it should trigger payout immediately!");
  console.log("\n💡 Tip: The oracle data might already be above 1mm, so finalization");
  console.log("   might not trigger payout. For guaranteed testing:");
  console.log("   - Set threshold to 0mm (if allowed) OR");
  console.log("   - Wait for oracle to show low values OR");
  console.log("   - Just verify that the policy expires after 1 day");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

