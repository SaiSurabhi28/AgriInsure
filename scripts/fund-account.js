const hre = require("hardhat");

async function main() {
  console.log("Funding account with test ETH...\n");

  const targetAccount = "0xb476606D9CEFb93651684BEc614e9Bbe9752848e";
  const signers = await hre.ethers.getSigners();
  const funder = signers[0]; // Hardhat account #0
  
  console.log("Funder address:", await funder.getAddress());
  console.log("Target address:", targetAccount);
  console.log("Transferring 10 ETH...\n");
  
  const tx = await funder.sendTransaction({
    to: targetAccount,
    value: hre.ethers.parseEther("10")
  });
  
  await tx.wait();
  
  console.log("\n✅ Transaction completed!");
  console.log("Transaction hash:", tx.hash);
  console.log("\nYour account now has 10 ETH for testing!");
  console.log("Check MetaMask - your balance should show 10 ETH!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

