const hre = require("hardhat");

async function main() {
  console.log("🌾 AgriInsure Demo - Complete Workflow\n");

  // Load deployment info
  const fs = require('fs');
  const deploymentFile = './deployments/localhost.json';
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));

  const oracleAdapterAddress = deploymentInfo.contracts.OracleAdapter.address;
  const treasuryAddress = deploymentInfo.contracts.Treasury.address;
  const policyFactoryAddress = deploymentInfo.contracts.PolicyFactory.address;

  const [deployer, farmer] = await hre.ethers.getSigners();

  // Get contract instances
  const PolicyFactory = await hre.ethers.getContractFactory("PolicyFactory");
  const policyFactory = PolicyFactory.attach(policyFactoryAddress);

  const OracleAdapter = await hre.ethers.getContractFactory("OracleAdapter");
  const oracleAdapter = OracleAdapter.attach(oracleAdapterAddress);

  const Treasury = await hre.ethers.getContractFactory("Treasury");
  const treasury = Treasury.attach(treasuryAddress);

  console.log("Deployer:", deployer.address);
  console.log("Farmer:", farmer.address);
  console.log("\n" + "=".repeat(60) + "\n");

  // Step 1: Fund Treasury
  console.log("📦 Step 1: Fund Treasury");
  await treasury.fund({ value: hre.ethers.parseEther("1.0") });
  const balance = await treasury.getBalance();
  console.log("✓ Treasury balance:", hre.ethers.formatEther(balance), "ETH");
  console.log("");

  // Step 2: Create Product
  console.log("🏷️  Step 2: Create Insurance Product");
  const tx = await policyFactory.addProduct(
    "Rain Insurance - Corn",
    7,      // minDurationDays
    30,     // maxDurationDays
    10,     // minThreshold (mm)
    100,    // maxThreshold (mm)
    hre.ethers.parseEther("0.01"),  // basePremiumWei
    hre.ethers.parseEther("0.05"),  // basePayoutWei
    20      // premiumBpsPerDay (0.2%)
  );
  await tx.wait();
  console.log("✓ Product #1 created: Rain Insurance - Corn");
  console.log("  - Duration: 7-30 days");
  console.log("  - Threshold: 10-100 mm");
  console.log("  - Base Premium: 0.01 ETH");
  console.log("");

  // Step 3: Price a Policy
  console.log("💰 Step 3: Price a Policy (14 days)");
  const [premium, payout] = await policyFactory.pricePolicy(1, 14);
  console.log("✓ Policy pricing:");
  console.log("  - Premium:", hre.ethers.formatEther(premium), "ETH");
  console.log("  - Payout:", hre.ethers.formatEther(payout), "ETH");
  console.log("  - Duration: 14 days");
  console.log("");

  // Step 4: Farmer Buys Policy
  console.log("🌱 Step 4: Farmer Buys Policy");
  const startTime = Math.floor(Date.now() / 1000) + 60; // Start 1 min from now
  const durationDays = 14;
  const threshold = 50; // 50mm threshold
  
  const policyTx = await policyFactory.connect(farmer).createPolicy(
    1,           // productId
    startTime,   // startTs
    durationDays,
    threshold,
    { value: premium }
  );
  const receipt = await policyTx.wait();
  const policyId = 1;
  
  console.log("✓ Policy #1 created by", farmer.address);
  console.log("  - Start:", new Date(startTime * 1000).toLocaleString());
  console.log("  - End:", new Date((startTime + durationDays * 86400) * 1000).toLocaleString());
  console.log("  - Threshold:", threshold, "mm");
  console.log("  - Premium paid:", hre.ethers.formatEther(premium), "ETH");
  console.log("");

  // Step 5: Oracle Reports Data
  console.log("📊 Step 5: Oracle Reports Data (During Policy Window)");
  
  // Simulate 3 oracle reports
  for (let i = 1; i <= 3; i++) {
    const roundValue = 5 * i; // 5mm, 10mm, 15mm
    const roundTime = startTime + (i * 2);
    
    await oracleAdapter.push(
      100 + i,      // roundId (offset to avoid conflicts)
      roundValue,
      roundTime
    );
    console.log(`  - Round #${100 + i}: ${roundValue}mm at ${new Date(roundTime * 1000).toLocaleTimeString()}`);
  }
  
  // Calculate total
  const totalRainfall = await oracleAdapter.sumInWindow(startTime, startTime + (durationDays * 86400));
  console.log("\n✓ Total rainfall in window:", totalRainfall.toString(), "mm");
  console.log("  (Below threshold of 50mm - payout will trigger!)");
  console.log("");

  // Step 6: Finalize Policy (Skip for demo, would need to wait)
  console.log("⏭️  Step 6: Finalize Policy");
  console.log("  (Would wait until end time, then call policyFactory.finalize(1))");
  console.log("  - Contract checks: oracle.sumInWindow() < threshold");
  console.log("  - Result: 30mm < 50mm → Status = PaidOut");
  console.log("  - Payout: 0.09 ETH sent to farmer");
  console.log("");

  console.log("=".repeat(60));
  console.log("✅ Demo Complete!");
  console.log("=".repeat(60));
  console.log("\nSummary:");
  console.log("- OracleAdapter:", oracleAdapterAddress);
  console.log("- Treasury:", treasuryAddress);
  console.log("- PolicyFactory:", policyFactoryAddress);
  console.log("- Policy #1:", "Active (would finalize to PaidOut)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

