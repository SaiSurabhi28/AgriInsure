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
  console.log("Adding 'Demo - Micro Premium Insurance' product...");
  
  const tx = await policyFactory.addProduct(
    "Demo - Micro Premium Insurance",  // name
    7,
    30,
    10,
    100,
    hre.ethers.parseEther("0.00000001"),  // base premium: 0.00000001 ETH
    hre.ethers.parseEther("0.00000004"),  // payout: 4x premium
    0
  );
  
  await tx.wait();
  
  // Get the product ID
  const productCount = await policyFactory.productCounter();
  
  console.log("\n✅ Demo product added!");
  console.log(`   Product ID: ${productCount}`);
  console.log("   Premium: 0.00000001 ETH");
  console.log("   Payout:  0.00000004 ETH");
  console.log("   Minimal cost demo product for testing revenue flow\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

