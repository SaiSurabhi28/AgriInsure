const { expect } = require("chai");
const { ethers } = require("hardhat");
const axios = require('axios');

describe("AgriInsure Integration Tests", function () {
  let oracleAdapter, payoutEscrow, policyFactory;
  let owner, farmer, insurer, oracle;
  let backendUrl = 'http://localhost:3001';
  let oracleUrl = 'http://localhost:3002';

  beforeEach(async function () {
    [owner, farmer, insurer, oracle] = await ethers.getSigners();

    // Deploy contracts
    const OracleAdapter = await ethers.getContractFactory("OracleAdapter");
    oracleAdapter = await OracleAdapter.deploy();
    await oracleAdapter.waitForDeployment();

    const PayoutEscrow = await ethers.getContractFactory("PayoutEscrow");
    payoutEscrow = await PayoutEscrow.deploy();
    await payoutEscrow.waitForDeployment();

    const PolicyFactory = await ethers.getContractFactory("PolicyFactory");
    policyFactory = await PolicyFactory.deploy(
      await oracleAdapter.getAddress(),
      await payoutEscrow.getAddress()
    );
    await policyFactory.waitForDeployment();

    // Setup authorizations
    await payoutEscrow.authorizeContract(await policyFactory.getAddress());
    await oracleAdapter.authorizeOracle(oracle.address);
    await policyFactory.authorizeInsurer(insurer.address);
  });

  describe("End-to-End Insurance Flow", function () {
    it("Should complete full insurance lifecycle", async function () {
      console.log("Starting end-to-end insurance flow test...");

      // Step 1: Create policy via backend API
      console.log("Step 1: Creating policy...");
      const policyData = {
        farmerAddress: farmer.address,
        premium: 0.1,
        threshold: 20,
        duration: 30 * 24 * 60 * 60 // 30 days in seconds
      };

      const createResponse = await axios.post(`${backendUrl}/api/policies/create`, policyData);
      expect(createResponse.data.success).to.be.true;
      
      const policyId = createResponse.data.data.policyId;
      console.log(`Policy created with ID: ${policyId}`);

      // Step 2: Send IoT data to oracle
      console.log("Step 2: Sending IoT data to oracle...");
      const iotData = {
        timestamp: new Date().toISOString(),
        totalSensors: 15,
        data: [
          { sensorId: 'test_1', sensorType: 'rainfall', value: 15, location: { name: 'Test Farm' } },
          { sensorId: 'test_2', sensorType: 'temperature', value: 25, location: { name: 'Test Farm' } },
          { sensorId: 'test_3', sensorType: 'soil_moisture', value: 60, location: { name: 'Test Farm' } }
        ],
        summary: {
          rainfall: { average: 15, min: 10, max: 20, count: 5 },
          temperature: { average: 25, min: 22, max: 28, count: 5 },
          soil_moisture: { average: 60, min: 55, max: 65, count: 5 }
        }
      };

      const oracleResponse = await axios.post(`${oracleUrl}/api/oracle/data`, iotData);
      expect(oracleResponse.data.success).to.be.true;
      console.log(`Oracle consensus: ${oracleResponse.data.consensus.consensusValue}mm`);

      // Step 3: Update blockchain with oracle data
      console.log("Step 3: Updating blockchain with oracle data...");
      const blockchainUpdateResponse = await axios.post(`${backendUrl}/api/oracle/update-blockchain`, {
        policyId: policyId,
        rainfall: oracleResponse.data.consensus.consensusValue,
        temperature: 25,
        soilMoisture: 60
      });
      expect(blockchainUpdateResponse.data.success).to.be.true;

      // Step 4: Check policy status
      console.log("Step 4: Checking policy status...");
      const statusResponse = await axios.get(`${backendUrl}/api/policies/${policyId}/status`);
      expect(statusResponse.data.success).to.be.true;
      
      const policyStatus = statusResponse.data.data;
      console.log(`Policy status - Active: ${policyStatus.isActive}, Payout Eligible: ${policyStatus.payoutEligible}`);

      // Step 5: Fast forward time to policy end
      console.log("Step 5: Fast forwarding time to policy end...");
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      // Step 6: Execute payout
      console.log("Step 6: Executing payout...");
      const payoutResponse = await axios.post(`${backendUrl}/api/policies/${policyId}/payout`, {
        farmerAddress: farmer.address,
        payoutAmount: 0.2 // 2x premium
      });
      expect(payoutResponse.data.success).to.be.true;
      console.log("Payout executed successfully");

      // Step 7: Verify final policy status
      console.log("Step 7: Verifying final policy status...");
      const finalStatusResponse = await axios.get(`${backendUrl}/api/policies/${policyId}/status`);
      expect(finalStatusResponse.data.success).to.be.true;
      
      const finalStatus = finalStatusResponse.data.data;
      expect(finalStatus.payoutExecuted).to.be.true;
      expect(finalStatus.isActive).to.be.false;

      console.log("✅ End-to-end insurance flow completed successfully!");
    });

    it("Should handle multiple policies for same farmer", async function () {
      console.log("Testing multiple policies for same farmer...");

      // Create multiple policies
      const policies = [];
      for (let i = 0; i < 3; i++) {
        const policyData = {
          farmerAddress: farmer.address,
          premium: 0.1,
          threshold: 20 + i * 5, // Different thresholds
          duration: 30 * 24 * 60 * 60
        };

        const response = await axios.post(`${backendUrl}/api/policies/create`, policyData);
        expect(response.data.success).to.be.true;
        policies.push(response.data.data.policyId);
      }

      // Get farmer's policies
      const farmerPoliciesResponse = await axios.get(`${backendUrl}/api/farmers/${farmer.address}/dashboard`);
      expect(farmerPoliciesResponse.data.success).to.be.true;
      expect(farmerPoliciesResponse.data.data.policies.length).to.equal(3);

      console.log(`✅ Created ${policies.length} policies for farmer`);
    });

    it("Should handle oracle network failures gracefully", async function () {
      console.log("Testing oracle network failure handling...");

      // Create a policy
      const policyData = {
        farmerAddress: farmer.address,
        premium: 0.1,
        threshold: 20,
        duration: 30 * 24 * 60 * 60
      };

      const createResponse = await axios.post(`${backendUrl}/api/policies/create`, policyData);
      expect(createResponse.data.success).to.be.true;
      const policyId = createResponse.data.data.policyId;

      // Send data with insufficient oracle participation
      const iotData = {
        timestamp: new Date().toISOString(),
        totalSensors: 5,
        data: [
          { sensorId: 'test_1', sensorType: 'rainfall', value: 15, location: { name: 'Test Farm' } }
        ],
        summary: {
          rainfall: { average: 15, min: 10, max: 20, count: 1 }
        }
      };

      // This should fail due to insufficient consensus
      try {
        await axios.post(`${oracleUrl}/api/oracle/data`, iotData);
      } catch (error) {
        expect(error.response.data.success).to.be.false;
        console.log("✅ Oracle consensus failure handled correctly");
      }
    });
  });

  describe("API Integration Tests", function () {
    it("Should handle backend API health check", async function () {
      const response = await axios.get(`${backendUrl}/health`);
      expect(response.data.status).to.equal('healthy');
      console.log("✅ Backend health check passed");
    });

    it("Should handle oracle API health check", async function () {
      const response = await axios.get(`${oracleUrl}/api/oracle/health`);
      expect(response.data.status).to.equal('healthy');
      console.log("✅ Oracle health check passed");
    });

    it("Should get blockchain status", async function () {
      const response = await axios.get(`${backendUrl}/api/blockchain/status`);
      expect(response.data.isConnected).to.be.true;
      console.log("✅ Blockchain status check passed");
    });

    it("Should get contract addresses", async function () {
      const response = await axios.get(`${backendUrl}/api/contracts/addresses`);
      expect(response.data.OracleAdapter).to.not.be.undefined;
      expect(response.data.PayoutEscrow).to.not.be.undefined;
      expect(response.data.PolicyFactory).to.not.be.undefined;
      console.log("✅ Contract addresses retrieved");
    });
  });

  describe("Error Handling Tests", function () {
    it("Should handle invalid policy creation", async function () {
      const invalidPolicyData = {
        farmerAddress: farmer.address,
        premium: 0.001, // Too low
        threshold: 20,
        duration: 30 * 24 * 60 * 60
      };

      try {
        await axios.post(`${backendUrl}/api/policies/create`, invalidPolicyData);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.response.status).to.equal(500);
        console.log("✅ Invalid policy creation handled correctly");
      }
    });

    it("Should handle non-existent policy queries", async function () {
      try {
        await axios.get(`${backendUrl}/api/policies/999/status`);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.response.status).to.equal(500);
        console.log("✅ Non-existent policy query handled correctly");
      }
    });

    it("Should handle unauthorized oracle data", async function () {
      const iotData = {
        timestamp: new Date().toISOString(),
        totalSensors: 15,
        data: [
          { sensorId: 'test_1', sensorType: 'rainfall', value: 2000, location: { name: 'Test Farm' } } // Invalid value
        ],
        summary: {
          rainfall: { average: 2000, min: 1500, max: 2500, count: 5 }
        }
      };

      try {
        await axios.post(`${oracleUrl}/api/oracle/data`, iotData);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.response.status).to.equal(500);
        console.log("✅ Invalid oracle data handled correctly");
      }
    });
  });

  describe("Performance Tests", function () {
    it("Should handle concurrent policy creation", async function () {
      console.log("Testing concurrent policy creation...");
      
      const promises = [];
      for (let i = 0; i < 5; i++) {
        const policyData = {
          farmerAddress: farmer.address,
          premium: 0.1,
          threshold: 20 + i,
          duration: 30 * 24 * 60 * 60
        };
        
        promises.push(axios.post(`${backendUrl}/api/policies/create`, policyData));
      }

      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result.data.success).to.be.true;
      });

      console.log("✅ Concurrent policy creation handled successfully");
    });

    it("Should handle batch oracle data updates", async function () {
      console.log("Testing batch oracle data updates...");
      
      const batchData = {
        policyIds: [1, 2, 3],
        rainfalls: [15, 18, 12],
        temperatures: [25, 27, 23],
        soilMoistures: [60, 62, 58]
      };

      const response = await axios.post(`${backendUrl}/api/oracle/update-blockchain`, batchData);
      expect(response.data.success).to.be.true;
      
      console.log("✅ Batch oracle data updates handled successfully");
    });
  });
});







