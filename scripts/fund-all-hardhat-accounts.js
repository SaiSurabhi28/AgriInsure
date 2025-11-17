const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();
  const funder = signers[0]; // First account (has 10,000 ETH by default)
  
  console.log("💰 Funding ALL Hardhat test accounts...\n");
  console.log("Funder:", await funder.getAddress());
  
  const funderBalance = await hre.ethers.provider.getBalance(funder.address);
  console.log("Funder balance:", hre.ethers.formatEther(funderBalance), "ETH\n");
  
  const amount = hre.ethers.parseEther("100"); // 100 ETH to each account
  const totalNeeded = amount * BigInt(signers.length - 1); // -1 because we don't fund ourselves
  
  if (funderBalance < totalNeeded) {
    console.error("❌ Insufficient funds in funder account!");
    console.error(`Need: ${hre.ethers.formatEther(totalNeeded)} ETH`);
    console.error(`Have: ${hre.ethers.formatEther(funderBalance)} ETH`);
    process.exit(1);
  }
  
  console.log(`Funding ${signers.length - 1} accounts with 100 ETH each...\n`);
  
  for (let i = 1; i < signers.length; i++) {
    const account = signers[i];
    const address = await account.getAddress();
    const currentBalance = await hre.ethers.provider.getBalance(address);
    
    console.log(`${i}. Funding account: ${address}`);
    console.log(`   Current balance: ${hre.ethers.formatEther(currentBalance)} ETH`);
    
    try {
      const tx = await funder.sendTransaction({
        to: address,
        value: amount
      });
      
      console.log(`   Transaction: ${tx.hash}`);
      await tx.wait();
      
      const newBalance = await hre.ethers.provider.getBalance(address);
      console.log(`   New balance: ${hre.ethers.formatEther(newBalance)} ETH\n`);
    } catch (error) {
      console.error(`   ❌ Error funding account ${i}:`, error.message, "\n");
    }
  }
  
  console.log("✅ All accounts funding complete!\n");
  
  // Show summary
  console.log("📊 Summary:");
  console.log(`   Total accounts funded: ${signers.length - 1}`);
  console.log(`   Amount per account: 100 ETH`);
  console.log(`   Total distributed: ${hre.ethers.formatEther(totalNeeded)} ETH`);
  
  // Show final funder balance
  const finalFunderBalance = await hre.ethers.provider.getBalance(funder.address);
  console.log(`   Remaining funder balance: ${hre.ethers.formatEther(finalFunderBalance)} ETH`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

