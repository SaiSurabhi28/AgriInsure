const hre = require("hardhat");

async function main() {
  console.log("Deploying AgriInsure contracts...\n");

  // Get the contract factories
  const OracleAdapter = await hre.ethers.getContractFactory("OracleAdapter");
  const Treasury = await hre.ethers.getContractFactory("Treasury");
  const PolicyFactory = await hre.ethers.getContractFactory("PolicyFactory");

  // Deploy OracleAdapter first
  console.log("Deploying OracleAdapter...");
  const oracleAdapter = await OracleAdapter.deploy();
  await oracleAdapter.waitForDeployment();
  const oracleAdapterAddress = await oracleAdapter.getAddress();
  console.log("OracleAdapter deployed to:", oracleAdapterAddress);

  // Deploy Treasury
  console.log("Deploying Treasury...");
  const treasury = await Treasury.deploy();
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("Treasury deployed to:", treasuryAddress);

  // Deploy PolicyFactory
  console.log("Deploy PolicyFactory...");
  const policyFactory = await PolicyFactory.deploy(
    oracleAdapterAddress,
    treasuryAddress
  );
  await policyFactory.waitForDeployment();
  const policyFactoryAddress = await policyFactory.getAddress();
  console.log("PolicyFactory deployed to:", policyFactoryAddress);

  // Authorize contracts
  console.log("Setting up contract authorizations...");
  
  // Authorize PolicyFactory in Treasury
  await treasury.authorizeContract(policyFactoryAddress);
  console.log("PolicyFactory authorized in Treasury");

  // Authorize deployer as reporter in OracleAdapter
  const [deployer] = await hre.ethers.getSigners();
  await oracleAdapter.authorizeReporter(deployer.address);
  console.log("Deployer authorized as reporter");

  // Create deployment info
  const deploymentInfo = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      OracleAdapter: {
        address: oracleAdapterAddress,
        constructorArgs: []
      },
      Treasury: {
        address: treasuryAddress,
        constructorArgs: []
      },
      PolicyFactory: {
        address: policyFactoryAddress,
        constructorArgs: [
          oracleAdapterAddress,
          treasuryAddress
        ]
      }
    }
  };

  // Save deployment info
  const fs = require('fs');
  const path = require('path');
  
  const deploymentDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentDir, `${hre.network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\nDeployment completed successfully!");
  console.log("Deployment info saved to:", deploymentFile);
  
  // Display contract addresses
  console.log("\n" + "=".repeat(50));
  console.log("CONTRACT ADDRESSES");
  console.log("=".repeat(50));
  console.log(`OracleAdapter: ${oracleAdapterAddress}`);
  console.log(`Treasury: ${treasuryAddress}`);
  console.log(`PolicyFactory: ${policyFactoryAddress}`);
  console.log("=".repeat(50));
  
  // Verify contracts on Etherscan (if not local network)
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("\nVerifying contracts on Etherscan...");
    
    try {
      await hre.run("verify:verify", {
        address: oracleAdapterAddress,
        constructorArguments: []
      });
      console.log("OracleAdapter verified");
    } catch (error) {
      console.log("OracleAdapter verification failed:", error.message);
    }
    
    try {
      await hre.run("verify:verify", {
        address: treasuryAddress,
        constructorArguments: []
      });
      console.log("Treasury verified");
    } catch (error) {
      console.log("Treasury verification failed:", error.message);
    }
    
      try {
      await hre.run("verify:verify", {
        address: policyFactoryAddress,
        constructorArguments: [oracleAdapterAddress, treasuryAddress]
      });
      console.log("PolicyFactory verified");
    } catch (error) {
      console.log("PolicyFactory verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
