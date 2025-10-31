const { ethers } = require('hardhat');

async function main() {
  console.log('Setting Insurance Account...\n');
  
  // The main insurance account address
  const insuranceAccount = '0xb476606d9cefb93651684bec614e9bbe9752848e';
  
  // Load contract addresses
  const deployment = require('../deployments/localhost.json');
  const policyFactoryAddress = deployment.contracts.PolicyFactory.address;
  
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  
  const PolicyFactory = await ethers.getContractFactory('PolicyFactory');
  const policyFactory = PolicyFactory.attach(policyFactoryAddress);
  
  console.log('Setting insurance account to:', insuranceAccount);
  const tx = await policyFactory.setInsuranceAccount(insuranceAccount);
  await tx.wait();
  
  // Verify
  const currentAccount = await policyFactory.insuranceAccount();
  console.log('\nInsurance account set to:', currentAccount);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

