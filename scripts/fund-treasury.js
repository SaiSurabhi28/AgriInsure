const hre = require("hardhat");

async function main() {
  const insuranceAccount = "0xb476606d9cefb93651684bec614e9bbe9752848e";
  const amount = hre.ethers.parseEther("8"); // Liquidity buffer for payouts

  const deployment = require("../deployments/localhost.json");
  const treasuryAddress = deployment.contracts.Treasury.address;

  console.log("🏦 Funding Treasury from insurance account\n");
  console.log("Insurance account:", insuranceAccount);
  console.log("Treasury contract:", treasuryAddress);
  console.log("Amount:", hre.ethers.formatEther(amount), "ETH\n");

  // Ensure the insurance account has funds (should have been pre-funded already)
  const insuranceBalance = await hre.ethers.provider.getBalance(insuranceAccount);
  console.log("Current insurance balance:", hre.ethers.formatEther(insuranceBalance), "ETH");
  if (insuranceBalance < amount) {
    throw new Error("Insurance account balance is too low. Fund it first.");
  }

  // Impersonate the insurance account on Hardhat network
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [insuranceAccount],
  });

  const insuranceSigner = await hre.ethers.getSigner(insuranceAccount);
  const Treasury = await hre.ethers.getContractFactory("Treasury");
  const treasury = Treasury.attach(treasuryAddress);

  console.log("Sending funds...");
  const tx = await treasury.connect(insuranceSigner).fund({ value: amount });
  console.log("Transaction:", tx.hash);
  await tx.wait();

  const newTreasuryBalance = await hre.ethers.provider.getBalance(treasuryAddress);
  console.log("\n✅ Treasury funded successfully!");
  console.log("New treasury balance:", hre.ethers.formatEther(newTreasuryBalance), "ETH");

  // Stop impersonating
  await hre.network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [insuranceAccount],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


