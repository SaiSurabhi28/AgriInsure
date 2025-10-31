const hre = require("hardhat");

async function main() {
  const insuranceAccount = '0xb476606d9cefb93651684bec614e9bbe9752848e';
  const account2 = '0xfc0b683c5449d5616085b5c45b502b4db84c2691';
  const account3 = '0x01f3d3463f5dea67f35aab3f89cc78cb09613db7';
  const account4 = '0xa11350f3a034685dd70efcc9a1a2d7a61ed2670b';

  console.log('=== Account Balances ===\n');
  console.log('1. Insurance Account (Company):');
  console.log('   ', insuranceAccount);
  console.log('   Balance:', hre.ethers.formatEther(await hre.ethers.provider.getBalance(insuranceAccount)), 'ETH\n');

  console.log('2. Policy Account 2:');
  console.log('   ', account2);
  console.log('   Balance:', hre.ethers.formatEther(await hre.ethers.provider.getBalance(account2)), 'ETH\n');

  console.log('3. Policy Account 3:');
  console.log('   ', account3);
  console.log('   Balance:', hre.ethers.formatEther(await hre.ethers.provider.getBalance(account3)), 'ETH\n');

  console.log('4. Policy Account 4:');
  console.log('   ', account4);
  console.log('   Balance:', hre.ethers.formatEther(await hre.ethers.provider.getBalance(account4)), 'ETH\n');

  console.log('✅ All accounts funded and ready!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

