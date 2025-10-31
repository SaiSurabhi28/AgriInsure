const hre = require("hardhat");

async function main() {
  // Get the MetaMask address from command line argument
  const metamaskAddress = process.argv[2];
  
  if (!metamaskAddress) {
    console.log("❌ Please provide your MetaMask address!");
    console.log("\nUsage: npx hardhat run scripts/fund-metamask.js --network localhost <YOUR_METAMASK_ADDRESS>");
    console.log("\nExample: npx hardhat run scripts/fund-metamask.js --network localhost 0x1234567890123456789012345678901234567890");
    console.log("\nTo get your MetaMask address:");
    console.log("1. Open MetaMask");
    console.log("2. Click on your account name/icon");
    console.log("3. Copy the address (it looks like 0x...)\n");
    process.exit(1);
  }

  // Validate address format
  if (!hre.ethers.isAddress(metamaskAddress)) {
    console.log(`❌ Invalid address format: ${metamaskAddress}`);
    console.log("Address should start with 0x and be 42 characters long");
    process.exit(1);
  }

  console.log("💰 Funding MetaMask account with test ETH...\n");
  console.log("Hardhat Network: localhost");
  console.log("Target address:", metamaskAddress);

  const signers = await hre.ethers.getSigners();
  const funder = signers[0]; // Hardhat account #0 (has 10000 ETH)
  
  const funderAddress = await funder.getAddress();
  const targetBalance = await hre.ethers.provider.getBalance(metamaskAddress);
  
  console.log("Funder address:", funderAddress);
  console.log("Current balance:", ethers.formatEther(targetBalance), "ETH");
  console.log("\nTransferring 100 ETH...\n");
  
  try {
    const tx = await funder.sendTransaction({
      to: metamaskAddress,
      value: hre.ethers.parseEther("100")
    });
    
    console.log("⏳ Transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    
    const newBalance = await hre.ethers.provider.getBalance(metamaskAddress);
    
    console.log("\n✅ Transaction completed!");
    console.log("Transaction hash:", receipt.hash);
    console.log("Gas used:", receipt.gasUsed.toString());
    console.log("\n💰 Your MetaMask account now has", hre.ethers.formatEther(newBalance), "ETH!");
    console.log("\n📝 Next steps:");
    console.log("1. Check MetaMask - refresh if needed");
    console.log("2. Make sure you're connected to the Hardhat Local network");
    console.log("3. You can now create insurance policies!");
  } catch (error) {
    console.error("❌ Error funding account:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

