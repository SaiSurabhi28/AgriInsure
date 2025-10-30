const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("Adding zero-cost demo product...\n");

  // Load deployment info
  const deploymentFile = path.join(__dirname, '..', 'deployments', 'localhost.json');
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
  
  const policyFactoryAddress = deploymentInfo.contracts.PolicyFactory.address;
  
  // Get contract
  const PolicyFactory = await hre.ethers.getContractFactory("PolicyFactory");
  const policyFactory = PolicyFactory.attach(policyFactoryAddress);
  
  const [deployer] = await hre.ethers.getSigners();
  
  // Add zero-cost demo product
  console.log("Adding 'Demo - Free Insurance' product...");
  
  const tx = await policyFactory.addProduct(
    "Demo - Free Insurance",  // name
    7,     // minDurationDays
    30,    // maxDurationDays
    10,    // minThreshold (mm)
    100,   // maxThreshold (mm)
    0,      // basePremiumWei (0 ETH - free!)
    0,      // basePayoutWei (0 payout for demo)
    0       // premiumBpsPerDay (0 basis points = no daily fee)
  );
  
  await tx.wait();
  
  // Get the product ID
  const productCount = await policyFactory.productCounter();
  
  console.log("\n✅ Demo product added!");
  console.log(`   Product ID: ${productCount}`);
  console.log("   Premium: 0 ETH (FREE!)");
  console.log("   You can test the entire flow without spending ETH");
  console.log("   Transaction will show as 0.00 ETH in MetaMask\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

