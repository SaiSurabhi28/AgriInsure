const axios = require('axios');
const { expect } = require('chai');

describe("AgriInsure Backend API Tests", function () {
  const baseURL = 'http://localhost:3001/api';
  const testFarmerAddress = '0x1234567890123456789012345678901234567890';

  describe("Policy API Tests", function () {
    it("Should create a new policy", async function () {
      const policyData = {
        farmerAddress: testFarmerAddress,
        premium: 0.1,
        threshold: 20,
        duration: 30 * 24 * 60 * 60
      };

      const response = await axios.post(`${baseURL}/policies/create`, policyData);
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data.policyId).to.not.be.undefined;
    });

    it("Should reject invalid policy data", async function () {
      const invalidPolicyData = {
        farmerAddress: testFarmerAddress,
        premium: 0.001, // Too low
        threshold: 20,
        duration: 30 * 24 * 60 * 60
      };

      try {
        await axios.post(`${baseURL}/policies/create`, invalidPolicyData);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.response.status).to.equal(500);
        expect(error.response.data.error).to.not.be.undefined;
      }
    });

    it("Should get policy status", async function () {
      // First create a policy
      const policyData = {
        farmerAddress: testFarmerAddress,
        premium: 0.1,
        threshold: 20,
        duration: 30 * 24 * 60 * 60
      };

      const createResponse = await axios.post(`${baseURL}/policies/create`, policyData);
      const policyId = createResponse.data.data.policyId;

      // Get policy status
      const statusResponse = await axios.get(`${baseURL}/policies/${policyId}/status`);
      expect(statusResponse.status).to.equal(200);
      expect(statusResponse.data.success).to.be.true;
      expect(statusResponse.data.data.policyId).to.equal(policyId);
    });

    it("Should get farmer policies", async function () {
      const response = await axios.get(`${baseURL}/farmers/${testFarmerAddress}/dashboard`);
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data.farmer).to.equal(testFarmerAddress);
    });

    it("Should execute payout", async function () {
      // Create policy first
      const policyData = {
        farmerAddress: testFarmerAddress,
        premium: 0.1,
        threshold: 20,
        duration: 30 * 24 * 60 * 60
      };

      const createResponse = await axios.post(`${baseURL}/policies/create`, policyData);
      const policyId = createResponse.data.data.policyId;

      // Execute payout
      const payoutData = {
        farmerAddress: testFarmerAddress,
        payoutAmount: 0.2
      };

      const payoutResponse = await axios.post(`${baseURL}/policies/${policyId}/payout`, payoutData);
      expect(payoutResponse.status).to.equal(200);
      expect(payoutResponse.data.success).to.be.true;
    });
  });

  describe("Oracle API Tests", function () {
    it("Should process weather data", async function () {
      const weatherData = {
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

      const response = await axios.post(`${baseURL}/oracle/data`, weatherData);
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
    });

    it("Should get consensus history", async function () {
      const response = await axios.get(`${baseURL}/oracle/consensus?limit=10`);
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.not.be.undefined;
    });

    it("Should get oracle nodes", async function () {
      const response = await axios.get(`${baseURL}/oracle/nodes`);
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data.nodes).to.be.an('array');
    });

    it("Should check oracle health", async function () {
      const response = await axios.get(`${baseURL}/oracle/health`);
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data.status).to.equal('healthy');
    });

    it("Should simulate weather events", async function () {
      const simulationData = {
        eventType: 'drought',
        intensity: 5
      };

      const response = await axios.post(`${baseURL}/oracle/simulate`, simulationData);
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
    });

    it("Should update blockchain with oracle data", async function () {
      const updateData = {
        policyId: 1,
        rainfall: 15,
        temperature: 25,
        soilMoisture: 60
      };

      const response = await axios.post(`${baseURL}/oracle/update-blockchain`, updateData);
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
    });

    it("Should get oracle statistics", async function () {
      const response = await axios.get(`${baseURL}/oracle/stats`);
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.not.be.undefined;
    });
  });

  describe("Farmer API Tests", function () {
    it("Should get farmer dashboard", async function () {
      const response = await axios.get(`${baseURL}/farmers/${testFarmerAddress}/dashboard`);
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data.farmer).to.equal(testFarmerAddress);
    });

    it("Should get farmer policy history", async function () {
      const response = await axios.get(`${baseURL}/farmers/${testFarmerAddress}/history`);
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.be.an('array');
    });

    it("Should get farmer payout history", async function () {
      const response = await axios.get(`${baseURL}/farmers/${testFarmerAddress}/payouts`);
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.be.an('array');
    });

    it("Should get farmer weather data", async function () {
      const response = await axios.get(`${baseURL}/farmers/${testFarmerAddress}/weather`);
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data.farmer).to.equal(testFarmerAddress);
    });

    it("Should get farmer risk assessment", async function () {
      const response = await axios.get(`${baseURL}/farmers/${testFarmerAddress}/risk`);
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data.farmer).to.equal(testFarmerAddress);
    });
  });

  describe("System API Tests", function () {
    it("Should get blockchain status", async function () {
      const response = await axios.get(`${baseURL}/blockchain/status`);
      expect(response.status).to.equal(200);
      expect(response.data).to.not.be.undefined;
    });

    it("Should get contract addresses", async function () {
      const response = await axios.get(`${baseURL}/contracts/addresses`);
      expect(response.status).to.equal(200);
      expect(response.data.OracleAdapter).to.not.be.undefined;
      expect(response.data.PayoutEscrow).to.not.be.undefined;
      expect(response.data.PolicyFactory).to.not.be.undefined;
    });
  });

  describe("Error Handling Tests", function () {
    it("Should handle 404 for non-existent routes", async function () {
      try {
        await axios.get(`${baseURL}/non-existent-route`);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.response.status).to.equal(404);
      }
    });

    it("Should handle invalid JSON in request body", async function () {
      try {
        await axios.post(`${baseURL}/policies/create`, 'invalid json');
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.response.status).to.equal(400);
      }
    });

    it("Should handle missing required fields", async function () {
      const incompleteData = {
        farmerAddress: testFarmerAddress
        // Missing premium, threshold, duration
      };

      try {
        await axios.post(`${baseURL}/policies/create`, incompleteData);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.response.status).to.equal(400);
      }
    });
  });

  describe("Rate Limiting Tests", function () {
    it("Should handle rate limiting", async function () {
      const requests = [];
      
      // Make multiple requests quickly
      for (let i = 0; i < 10; i++) {
        requests.push(axios.get(`${baseURL}/oracle/health`));
      }

      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect(response.status).to.equal(200);
      });
    });
  });

  describe("CORS Tests", function () {
    it("Should include CORS headers", async function () {
      const response = await axios.get(`${baseURL}/oracle/health`);
      expect(response.headers['access-control-allow-origin']).to.not.be.undefined;
    });
  });
});







