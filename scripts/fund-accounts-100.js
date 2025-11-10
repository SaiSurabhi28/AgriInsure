const hre = require("hardhat");

async function main() {
  const [funder] = await hre.ethers.getSigners();

  const accounts = [
    "0xb476606d9cefb93651684bec614e9bbe9752848e", // insurance company
    "0xfc0b683c5449d5616085b5c45b502b4db84c2691",
    "0x01f3d3463f5dea67f35aab3f89cc78cb09613db7",
    "0xa11350f3a034685dd70efcc9a1a2d7a61ed2670b",
    "0x9d3ad5fb3f82c622643790302efbef155c952f71"
  ];

  const amount = hre.ethers.parseEther("100");

  console.log("💸 Funding target accounts with 100 ETH each...\n");
  console.log("Funder:", funder.address);

  for (const account of accounts) {
    const tx = await funder.sendTransaction({
      to: account,
      value: amount
    });
    await tx.wait();
    const newBalance = await hre.ethers.provider.getBalance(account);
    console.log(`✓ Sent 100 ETH to ${account}`);
    console.log(`  New balance: ${hre.ethers.formatEther(newBalance)} ETH\n`);
  }

  console.log("✅ Funding complete.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


