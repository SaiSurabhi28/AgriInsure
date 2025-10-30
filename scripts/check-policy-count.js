const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const deployment = JSON.parse(
    fs.readFileSync('deployments/localhost.json', 'utf8')
  );
  
  const PolicyFactory = await hre.ethers.getContractAt(
    "PolicyFactory",
    deployment.contracts.PolicyFactory.address
  );

  const policyCount = await PolicyFactory.policyCounter();
  console.log('📊 Total policies in contract:', policyCount.toString());
  
  if (policyCount > 0) {
    console.log('\n🔍 Fetching latest 5 policies...\n');
    const start = Math.max(1, policyCount.toNumber() - 4);
    const end = policyCount.toNumber();
    
    for (let i = end; i >= start; i--) {
      try {
        const policy = await PolicyFactory.getPolicy(i);
        const product = await PolicyFactory.getProduct(policy.productId);
        const statuses = ['Active', 'PaidOut', 'Expired'];
        const status = statuses[policy.status];
        
        console.log(`Policy #${i}:`);
        console.log(`  Holder: ${policy.holder}`);
        console.log(`  Product: ${product.name}`);
        console.log(`  Status: ${status}`);
        console.log(`  Threshold: ${policy.threshold}mm`);
        console.log(`  Start: ${new Date(Number(policy.startTs) * 1000).toLocaleString()}`);
        console.log(`  End: ${new Date(Number(policy.endTs) * 1000).toLocaleString()}`);
        console.log();
      } catch (error) {
        console.log(`Policy #${i}: Error - ${error.message}`);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

