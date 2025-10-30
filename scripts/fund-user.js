const hre = require("hardhat");

async function main() {
  const userAddress = "0xb476606d9cefb93651684bec614e9bbe9752848e";
  
  console.log("💰 Funding your MetaMask account...\n");
  console.log("Address:", userAddress);

  const signers = await hre.ethers.getSigners();
  const funder = signers[0]; // Account with 10,000 ETH
  
  console.log("Sending 2 ETH from:", await funder.getAddress());
  
  try {
    const tx = await funder.sendTransaction({
      to: userAddress,
      value: hre.ethers.parseEther("2") // 2 ETH should be plenty for gas
    });
    
    console.log("⏳ Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    
    const balance = await hre.ethers.provider.getBalance(userAddress);
    console.log("\n✅ Success! Your MetaMask account now has", hre.ethers.formatEther(balance), "ETH");
    console.log("You can now create policies! (Gas fees only ~0.0003 ETH per transaction)\n");
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

