const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  // Load deployment info
  const deploymentFile = path.join(__dirname, '..', 'deployments', 'localhost.json');
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
  
  const policyFactoryAddress = deploymentInfo.contracts.PolicyFactory.address;
  const treasuryAddress = deploymentInfo.contracts.Treasury.address;
  
  const [deployer, farmer] = await hre.ethers.getSigners();
  
  // Get contracts
  const PolicyFactory = await hre.ethers.getContractFactory("PolicyFactory");
  const policyFactory = PolicyFactory.attach(policyFactoryAddress);
  
  const Treasury = await hre.ethers.getContractFactory("Treasury");
  const treasury = Treasury.attach(treasuryAddress);
  
  console.log("Setting up demo...\n");
  
  // Fund treasury
  console.log("1. Funding Treasury...");
  await treasury.fund({ value: hre.ethers.parseEther("1.0") });
  console.log("   ✓ Treasury funded\n");
  
  // Create products
  console.log("2. Creating Products...");
  const tx1 = await policyFactory.addProduct(
    "Rain Insurance - Corn",
    7, 30, 10, 100,
    hre.ethers.parseEther("0.01"),
    hre.ethers.parseEther("0.05"),
    20
  );
  await tx1.wait();
  console.log("   ✓ Product #1: Rain Insurance - Corn");
  
  const tx2 = await policyFactory.addProduct(
    "Demo - Free Insurance",
    7, 30, 10, 100,
    0,
    0,
    0
  );
  await tx2.wait();
  console.log("   ✓ Product #2: Demo - Free Insurance\n");
  
  console.log("✅ Demo setup complete!");
  console.log("\nNew PolicyFactory:", policyFactoryAddress);
  console.log("New Treasury:", treasuryAddress);
}

main().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
