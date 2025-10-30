const hre = require("hardhat");

async function main() {
  console.log("💰 Funding all test accounts...\n");
  
  // Test accounts
  const accounts = [
    { name: 'Insurance Account (Company)', address: '0xb476606d9cefb93651684bec614e9bbe9752848e' },
    { name: 'Account 2', address: '0xfc0b683c5449d5616085b5c45b502b4db84c2691' },
    { name: 'Account 3', address: '0x01f3d3463f5dea67f35aab3f89cc78cb09613db7' },
    { name: 'Account 4', address: '0xa11350f3a034685dd70efcc9a1a2d7a61ed2670b' }
  ];
  
  const [funder] = await hre.ethers.getSigners();
  const fundAmount = hre.ethers.parseEther("10"); // 10 ETH each
  
  console.log(`Funder: ${await funder.getAddress()}`);
  console.log(`Amount: 10 ETH per account\n`);
  
  for (const account of accounts) {
    try {
      console.log(`Funding ${account.name}...`);
      console.log(`Address: ${account.address}`);
      
      const tx = await funder.sendTransaction({
        to: account.address,
        value: fundAmount
      });
      
      const receipt = await tx.wait();
      const balance = await hre.ethers.provider.getBalance(account.address);
      
      console.log(`✅ ${account.name} now has ${hre.ethers.formatEther(balance)} ETH`);
      console.log(`   Transaction: ${tx.hash}\n`);
    } catch (error) {
      console.error(`❌ Error funding ${account.name}:`, error.message);
    }
  }
  
  console.log("\n✅ All accounts funded!");
  console.log("You can now create policies and finalize them!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

