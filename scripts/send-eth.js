const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deployer:', deployer.address);
  console.log('Balance:', hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), 'ETH\n');

  const insuranceAccount = '0xb476606d9cefb93651684bec614e9bbe9752848e';
  const account2 = '0xfc0b683c5449d5616085b5c45b502b4db84c2691';
  const account3 = '0x01f3d3463f5dea67f35aab3f89cc78cb09613db7';
  const account4 = '0xa11350f3a034685dd70efcc9a1a2d7a61ed2670b';
  const account5 = '0x9d3ad5fb3f82c622643790302efbef155c952f71';

  const amount = hre.ethers.parseEther('10'); // 10 ETH to each account

  console.log('Sending 10 ETH to each account...\n');

  // Send to insurance account
  const tx1 = await deployer.sendTransaction({
    to: insuranceAccount,
    value: amount
  });
  await tx1.wait();
  console.log('✓ Sent 10 ETH to Insurance Account');

  // Send to account 2
  const tx2 = await deployer.sendTransaction({
    to: account2,
    value: amount
  });
  await tx2.wait();
  console.log('✓ Sent 10 ETH to Account 2');

  // Send to account 3
  const tx3 = await deployer.sendTransaction({
    to: account3,
    value: amount
  });
  await tx3.wait();
  console.log('✓ Sent 10 ETH to Account 3');

  // Send to account 4
  const tx4 = await deployer.sendTransaction({
    to: account4,
    value: amount
  });
  await tx4.wait();
  console.log('✓ Sent 10 ETH to Account 4');

  // Send to account 5
  const tx5 = await deployer.sendTransaction({
    to: account5,
    value: amount
  });
  await tx5.wait();
  console.log('✓ Sent 10 ETH to Account 5');

  console.log('\n✅ All transactions completed!\n');

  // Verify balances
  console.log('Updated Balances:');
  console.log('Insurance:', hre.ethers.formatEther(await hre.ethers.provider.getBalance(insuranceAccount)), 'ETH');
  console.log('Account 2:', hre.ethers.formatEther(await hre.ethers.provider.getBalance(account2)), 'ETH');
  console.log('Account 3:', hre.ethers.formatEther(await hre.ethers.provider.getBalance(account3)), 'ETH');
  console.log('Account 4:', hre.ethers.formatEther(await hre.ethers.provider.getBalance(account4)), 'ETH');
  console.log('Account 5:', hre.ethers.formatEther(await hre.ethers.provider.getBalance(account5)), 'ETH');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

