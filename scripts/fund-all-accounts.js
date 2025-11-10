const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  // Test account addresses
  const accounts = [
    '0xb476606d9cefb93651684bec614e9bbe9752848e', // Insurance account
    '0xfc0b683c5449d5616085b5c45b502b4db84c2691', // Account 2
    '0x01f3d3463f5dea67f35aab3f89cc78cb09613db7', // Account 3
    '0xa11350f3a034685dd70efcc9a1a2d7a61ed2670b', // Account 4
    '0x9d3ad5fb3f82c622643790302efbef155c952f71', // Account 5
  ];

  const amount = hre.ethers.parseEther('10'); // 10 ETH to each account
  
  console.log('💰 Funding all test accounts with 10 ETH each...\n');
  console.log('Funder:', await deployer.getAddress());
  
  // Check deployer balance first
  const deployerBalance = await hre.ethers.provider.getBalance(deployer.address);
  console.log('Deployer balance:', hre.ethers.formatEther(deployerBalance), 'ETH\n');
  
  if (deployerBalance < amount * BigInt(accounts.length)) {
    console.error('❌ Insufficient funds in deployer account!');
    console.error(`Need: ${hre.ethers.formatEther(amount * BigInt(accounts.length))} ETH`);
    process.exit(1);
  }

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    const currentBalance = await hre.ethers.provider.getBalance(account);
    
    console.log(`${i + 1}. Funding account:`, account);
    console.log('   Current balance:', hre.ethers.formatEther(currentBalance), 'ETH');
    
    try {
      const tx = await deployer.sendTransaction({
        to: account,
        value: amount
      });
      
      console.log('   Transaction:', tx.hash);
      await tx.wait();
      
      const newBalance = await hre.ethers.provider.getBalance(account);
      console.log('   New balance:', hre.ethers.formatEther(newBalance), 'ETH\n');
    } catch (error) {
      console.error(`   ❌ Error funding account ${i + 1}:`, error.message, '\n');
    }
  }
  
  console.log('✅ All accounts funding complete!');
  
  // Show final balances
  console.log('\n📊 Final Account Balances:');
  for (let i = 0; i < accounts.length; i++) {
    const balance = await hre.ethers.provider.getBalance(accounts[i]);
    console.log(`   Account ${i + 1}: ${hre.ethers.formatEther(balance)} ETH`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

