const fs = require('fs');
const path = require('path');
const hre = require('hardhat');

const ITERATIONS = parseInt(process.env.PERF_ITERATIONS || '500', 10);
const POLICY_DURATION_SECONDS = 60;
const POLICY_THRESHOLD_MM = 80;
const DATASET_BASELINE_MM = parseFloat(process.env.ORACLE_DATASET_BASELINE_MM || '80');
const OUTPUT_PATH = path.join(__dirname, '..', 'perf-results.csv');

async function measureTx(label, operation, txPromise) {
  const start = process.hrtime.bigint();
  const tx = await txPromise;
  const receipt = await tx.wait();
  const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
  return {
    label,
    operation,
    gas_used: receipt.gasUsed.toString(),
    duration_ms: durationMs.toFixed(3)
  };
}

async function main() {
  console.log(`Running performance evaluation with ${ITERATIONS} iterations...`);

  const [signer] = await hre.ethers.getSigners();
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
  await oracle.authorizeReporter(signer.address);
  await treasury.fund({ value: hre.ethers.parseEther('5') });

  const records = [];

  const addProductMetrics = await measureTx(
    'addProduct',
    'addProduct',
    factory.addProduct(
      'Demo Rain Shield',
      7,
      30,
      10,
      120,
      hre.ethers.parseEther('0.00000001'),
      hre.ethers.parseEther('0.00000004'),
      0
    )
  );
  records.push({ iteration: 0, ...addProductMetrics, policy_id: '', outcome: '' });

  const productId = 1;
  const [premiumWei] = await factory.pricePolicy(productId, 7);

  let nextRoundId = 1n;

  for (let i = 0; i < ITERATIONS; i++) {
    const iteration = i + 1;

    const createMetrics = await measureTx(
      `createTestPolicy_${iteration}`,
      'createTestPolicy',
      factory.createTestPolicy(
        productId,
        POLICY_DURATION_SECONDS,
        POLICY_THRESHOLD_MM,
        { value: premiumWei }
      )
    );

    const policyCounter = await factory.policyCounter();
    const policyId = policyCounter.toString();
    const policy = await factory.getPolicy(policyId);
    const startTs = Number(policy.startTs);

    // Scale rainfall using dataset baseline so some policies trigger payouts
    const rainfallRaw = (iteration % 4 === 0) ? DATASET_BASELINE_MM * 0.4 : DATASET_BASELINE_MM * 1.4;
    const rainfallScaled = Math.max(0, Math.round(rainfallRaw));
    await oracle.push(
      nextRoundId,
      BigInt(rainfallScaled),
      BigInt(startTs + 1)
    );
    nextRoundId += 1n;

    // Fast-forward chain time to after policy end
    const targetTimestamp = startTs + POLICY_DURATION_SECONDS + 1;
    await hre.network.provider.send('evm_setNextBlockTimestamp', [targetTimestamp]);
    await hre.network.provider.send('evm_mine');

    records.push({ iteration, ...createMetrics, policy_id: policyId, outcome: '' });

    if (iteration % 2 === 0) {
      const finalizeMetrics = await measureTx(
        `finalize_${policyId}`,
        'finalize',
        factory.finalize(policyId)
      );
      const finalizedPolicy = await factory.getPolicy(policyId);
      const status = Number(finalizedPolicy.status);
      const outcome = status === 1 ? 'payout' : 'no_payout';
      records.push({ iteration, ...finalizeMetrics, policy_id: policyId, outcome });
    } else {
      const expireMetrics = await measureTx(
        `expirePolicy_${policyId}`,
        'expirePolicy',
        factory.expirePolicy(policyId)
      );
      records.push({ iteration, ...expireMetrics, policy_id: policyId, outcome: 'expired' });
    }
  }

  const headers = ['iteration', 'label', 'operation', 'gas_used', 'duration_ms', 'policy_id', 'outcome'];
  const csvLines = [headers.join(',')];
  for (const row of records) {
    const line = headers.map((key) => row[key] ?? '').join(',');
    csvLines.push(line);
  }
  fs.writeFileSync(OUTPUT_PATH, csvLines.join('\n'));

  console.log(`Performance data written to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
