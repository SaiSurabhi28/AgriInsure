const hre = require("hardhat");

async function main() {
  // Get address from command line - everything after the script name
  const args = process.argv.slice(2);
  const metamaskAddress = args[0];
  
  if (!metamaskAddress) {
    console.log("❌ Please provide your MetaMask address!");
    console.log("\nUsage:");
    console.log("  npx hardhat run scripts/fund-quick.js --network localhost <YOUR_METAMASK_ADDRESS>");
    console.log("\nTo get your MetaMask address:");
    console.log("1. Open MetaMask and click on your account name");
    console.log("2. Copy the address (starts with 0x...)\n");
    process.exit(1);
  }

  // Validate address
  if (!hre.ethers.isAddress(metamaskAddress)) {
    console.log(`❌ Invalid address: ${metamaskAddress}`);
    process.exit(1);
  }

  console.log("💰 Funding MetaMask account...\n");
  console.log("Target:", metamaskAddress);

  const signers = await hre.ethers.getSigners();
  const funder = signers[0];
  
  console.log("Funder:", await funder.getAddress());
  console.log("Sending 1 ETH...\n");
  
  try {
    const tx = await funder.sendTransaction({
      to: metamaskAddress,
      value: hre.ethers.parseEther("1")
    });
    
    console.log("⏳ Transaction:", tx.hash);
    const receipt = await tx.wait();
    const balance = await hre.ethers.provider.getBalance(metamaskAddress);
    
    console.log("\n✅ Done! Your MetaMask now has", hre.ethers.formatEther(balance), "ETH");
    console.log("You can now pay for gas fees to create policies!\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

