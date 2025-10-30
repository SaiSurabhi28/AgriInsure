const hre = require("hardhat");

async function main() {
  console.log('💰 Quick MetaMask Funding\n');
  
  console.log('Please provide your MetaMask address to fund.');
  console.log('You can find it by:');
  console.log('1. Opening MetaMask');
  console.log('2. Clicking your account name');
  console.log('3. Copying the address (starts with 0x...)\n');
  
  // For now, we'll fund the Insurance account as it's commonly used
  const addresses = [
    { name: 'Insurance Account', address: '0xb476606d9cefb93651684bec614e9bbe9752848e' },
    { name: 'Account 2', address: '0xfc0b683c5449d5616085b5c45b502b4db84c2691' },
    { name: 'Account 3', address: '0x01f3d3463f5dea67f35aab3f89cc78cb09613db7' },
    { name: 'Account 4', address: '0xa11350f3a034685dd70efcc9a1a2d7a61ed2670b' }
  ];
  
  const [funder] = await hre.ethers.getSigners();
  const fundAmount = hre.ethers.parseEther("10");
  
  console.log(`Funder: ${await funder.getAddress()}`);
  console.log(`Funding 10 ETH to each account...\n`);
  
  for (const account of addresses) {
    try {
      const currentBalance = await hre.ethers.provider.getBalance(account.address);
      const balanceETH = parseFloat(hre.ethers.formatEther(currentBalance));
      
      // If balance is less than 1 ETH, fund it
      if (balanceETH < 1) {
        console.log(`⚠️  ${account.name} has only ${balanceETH.toFixed(4)} ETH - funding now...`);
        const tx = await funder.sendTransaction({
          to: account.address,
          value: fundAmount
        });
        await tx.wait();
        console.log(`✅ Funded ${account.name}: ${tx.hash}\n`);
      } else {
        console.log(`✅ ${account.name} already has ${balanceETH.toFixed(4)} ETH\n`);
      }
    } catch (error) {
      console.error(`❌ Error checking/funding ${account.name}:`, error.message);
    }
  }
  
  console.log("✅ All accounts checked and funded if needed!");
  console.log("\n💡 If your MetaMask uses a different address:");
  console.log("   Run: npx hardhat run scripts/fund-quick.js --network localhost <YOUR_ADDRESS>");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

