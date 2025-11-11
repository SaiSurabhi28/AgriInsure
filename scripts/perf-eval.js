const hre = require('hardhat');

async function main() {
  const results = {
    transactions: []
  };

  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  const farmers = signers.slice(1, 4);
  const OracleAdapter = await hre.ethers.getContractFactory('OracleAdapter');
  const Treasury = await hre.ethers.getContractFactory('Treasury');
  const PolicyFactory = await hre.ethers.getContractFactory('PolicyFactory');

  const oracle = await OracleAdapter.deploy();
  await oracle.waitForDeployment();
  const treasury = await Treasury.deploy();
  await treasury.waitForDeployment();
  const factory = await PolicyFactory.deploy(
    await oracle.getAddress(),
    await treasury.getAddress()
  );
  await factory.waitForDeployment();

  await treasury.authorizeContract(await factory.getAddress());
  await oracle.authorizeReporter(deployer.address);

  const addProductTx = await factory.addProduct(
    'Demo Rain Shield',
    7,
    30,
    10,
    100,
    hre.ethers.parseEther('0.00000001'),
    hre.ethers.parseEther('0.00000004'),
    0
  );
  const addProductReceipt = await addProductTx.wait();
  results.transactions.push({
    label: 'addProduct',
    gasUsed: addProductReceipt.gasUsed.toString(),
    cumulativeGasUsed: addProductReceipt.cumulativeGasUsed.toString()
  });

  const productId = 1;

  const createdPolicies = [];
  for (let i = 0; i < farmers.length; i++) {
    const farmer = farmers[i];
    const startTs = Math.floor(Date.now() / 1000) + 30 + i * 10;
    const createTx = await factory.connect(farmer).createTestPolicy(
      productId,
      startTs,
      60,
      40,
      { value: hre.ethers.parseEther('0.00000001') }
    );
    const createReceipt = await createTx.wait();
    const policyId = (await factory.activePolicyId(farmer.address)).toString();
    createdPolicies.push({ policyId, farmer: farmer.address });
    results.transactions.push({
      label: `createTestPolicy_${i + 1}`,
      gasUsed: createReceipt.gasUsed.toString(),
      cumulativeGasUsed: createReceipt.cumulativeGasUsed.toString()
    });
  }

  await hre.network.provider.send('evm_increaseTime', [120]);
  await hre.network.provider.send('evm_mine');

  for (const { policyId } of createdPolicies) {
    try {
      const expireTx = await factory.expirePolicy(policyId);
      const receipt = await expireTx.wait();
      results.transactions.push({
        label: `expirePolicy_${policyId}`,
        gasUsed: receipt.gasUsed.toString(),
        cumulativeGasUsed: receipt.cumulativeGasUsed.toString()
      });
    } catch (err) {
      results.transactions.push({
        label: `expirePolicy_${policyId}`,
        error: err.message
      });
    }
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
