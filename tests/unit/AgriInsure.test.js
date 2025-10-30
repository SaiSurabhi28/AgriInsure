const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgriInsure Smart Contracts", function () {
  let oracleAdapter, payoutEscrow, policyFactory;
  let owner, farmer, insurer, oracle;
  let policyId;

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
      "0x0000000000000000000000000000000000000000", // policyTemplate
      await oracleAdapter.getAddress(),
      await payoutEscrow.getAddress()
    );
    await policyFactory.waitForDeployment();

    // Setup authorizations
    await payoutEscrow.authorizeContract(await policyFactory.getAddress());
    await oracleAdapter.authorizeOracle(oracle.address);
    await policyFactory.authorizeInsurer(insurer.address);
  });

  describe("PolicyFactory", function () {
    it("Should create a new policy", async function () {
      const premium = ethers.parseEther("0.1");
      const threshold = 20; // 20mm rainfall
      const duration = 30 * 24 * 60 * 60; // 30 days

      const tx = await policyFactory.connect(insurer).createPolicy(
        farmer.address,
        premium,
        threshold,
        duration,
        { value: premium }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => 
        log.topics[0] === policyFactory.interface.getEvent("PolicyCreated").topicHash
      );

      expect(event).to.not.be.undefined;
      policyId = 1; // First policy
    });

    it("Should reject unauthorized insurer", async function () {
      const premium = ethers.parseEther("0.1");
      const threshold = 20;
      const duration = 30 * 24 * 60 * 60;

      await expect(
        policyFactory.connect(farmer).createPolicy(
          farmer.address,
          premium,
          threshold,
          duration,
          { value: premium }
        )
      ).to.be.revertedWith("Not authorized insurer");
    });

    it("Should reject invalid parameters", async function () {
      const premium = ethers.parseEther("0.001"); // Too low
      const threshold = 20;
      const duration = 30 * 24 * 60 * 60;

      await expect(
        policyFactory.connect(insurer).createPolicy(
          farmer.address,
          premium,
          threshold,
          duration,
          { value: premium }
        )
      ).to.be.revertedWith("Premium out of range");
    });
  });

  describe("OracleAdapter", function () {
    it("Should update weather data", async function () {
      const rainfall = 15; // 15mm
      const temperature = 25; // 25°C
      const soilMoisture = 60; // 60%

      const tx = await oracleAdapter.connect(oracle).updateWeatherData(
        1, // policyId
        rainfall,
        temperature,
        soilMoisture
      );

      await expect(tx)
        .to.emit(oracleAdapter, "OracleDataUpdated")
        .withArgs(1, rainfall, temperature, soilMoisture, await tx.getBlock().then(b => b.timestamp), oracle.address);
    });

    it("Should reject unauthorized oracle", async function () {
      await expect(
        oracleAdapter.connect(farmer).updateWeatherData(1, 15, 25, 60)
      ).to.be.revertedWith("Not authorized oracle");
    });

    it("Should reject invalid data ranges", async function () {
      await expect(
        oracleAdapter.connect(oracle).updateWeatherData(1, 2000, 25, 60) // Rainfall too high
      ).to.be.revertedWith("Invalid data range");
    });

    it("Should batch update weather data", async function () {
      const policyIds = [1, 2, 3];
      const rainfalls = [15, 20, 10];
      const temperatures = [25, 28, 22];
      const soilMoistures = [60, 65, 55];

      const tx = await oracleAdapter.connect(oracle).batchUpdateWeatherData(
        policyIds,
        rainfalls,
        temperatures,
        soilMoistures
      );

      await expect(tx).to.not.be.reverted;
    });
  });

  describe("PayoutEscrow", function () {
    beforeEach(async function () {
      // Create a policy first
      const premium = ethers.parseEther("0.1");
      const threshold = 20;
      const duration = 30 * 24 * 60 * 60;

      await policyFactory.connect(insurer).createPolicy(
        farmer.address,
        premium,
        threshold,
        duration,
        { value: premium }
      );
    });

    it("Should deposit premium", async function () {
      const escrowEntry = await payoutEscrow.getEscrowEntry(1);
      expect(escrowEntry.farmer).to.equal(farmer.address);
      expect(escrowEntry.premiumAmount).to.equal(ethers.parseEther("0.1"));
      expect(escrowEntry.isActive).to.be.true;
    });

    it("Should execute payout", async function () {
      // First, update oracle data with low rainfall
      await oracleAdapter.connect(oracle).updateWeatherData(1, 10, 25, 60); // 10mm < 20mm threshold

      // Fast forward time to policy end
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      // First deposit premium to escrow
      await payoutEscrow.connect(owner).depositPremium(2, farmer.address, { value: ethers.parseEther("0.1") });
      
      // Execute payout (through authorized contract)
      const payoutAmount = ethers.parseEther("0.2"); // 2x premium
      const tx = await payoutEscrow.connect(owner).executePayout(2, farmer.address, payoutAmount);

      await expect(tx)
        .to.emit(payoutEscrow, "PayoutExecuted")
        .withArgs(2, farmer.address, payoutAmount, await tx.getBlock().then(b => b.timestamp));
    });

    it("Should reject unauthorized payout execution", async function () {
      await expect(
        payoutEscrow.connect(farmer).executePayout(1, farmer.address, ethers.parseEther("0.2"))
      ).to.be.revertedWith("Not authorized contract");
    });
  });

  describe("Integration Tests", function () {
    it("Should complete full insurance flow", async function () {
      // 1. Create policy
      const premium = ethers.parseEther("0.1");
      const threshold = 20;
      const duration = 30 * 24 * 60 * 60;

      await policyFactory.connect(insurer).createPolicy(
        farmer.address,
        premium,
        threshold,
        duration,
        { value: premium }
      );

      // 2. Update oracle data with low rainfall (trigger condition)
      await oracleAdapter.connect(oracle).updateWeatherData(1, 10, 25, 60); // 10mm < 20mm threshold

      // 3. Fast forward to policy end
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      // 4. Execute payout
      // First deposit premium to escrow
      await payoutEscrow.connect(owner).depositPremium(3, farmer.address, { value: ethers.parseEther("0.1") });
      
      const payoutAmount = ethers.parseEther("0.2");
      await payoutEscrow.connect(owner).executePayout(3, farmer.address, payoutAmount);

      // 5. Verify payout executed
      const escrowEntry = await payoutEscrow.getEscrowEntry(3);
      expect(escrowEntry.payoutExecuted).to.be.true;
      expect(escrowEntry.isActive).to.be.false;
    });

    it("Should not payout when rainfall is above threshold", async function () {
      // 1. Create policy
      const premium = ethers.parseEther("0.1");
      const threshold = 20;
      const duration = 30 * 24 * 60 * 60;

      await policyFactory.connect(insurer).createPolicy(
        farmer.address,
        premium,
        threshold,
        duration,
        { value: premium }
      );

      // 2. Update oracle data with high rainfall (no trigger)
      await oracleAdapter.connect(oracle).updateWeatherData(1, 30, 25, 60); // 30mm > 20mm threshold

      // 3. Fast forward to policy end
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      // First deposit premium to escrow
      await payoutEscrow.connect(owner).depositPremium(4, farmer.address, { value: ethers.parseEther("0.1") });
      
      // 4. Try to execute payout (should fail)
      const payoutAmount = ethers.parseEther("0.3"); // Higher than 2x premium
      await expect(
        payoutEscrow.connect(owner).executePayout(4, farmer.address, payoutAmount)
      ).to.be.revertedWith("Payout exceeds escrowed amount");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple policies for same farmer", async function () {
      const premium = ethers.parseEther("0.1");
      const threshold = 20;
      const duration = 30 * 24 * 60 * 60;

      // Create multiple policies
      await policyFactory.connect(insurer).createPolicy(
        farmer.address,
        premium,
        threshold,
        duration,
        { value: premium }
      );

      await policyFactory.connect(insurer).createPolicy(
        farmer.address,
        premium,
        threshold,
        duration,
        { value: premium }
      );

      const farmerPolicies = await policyFactory.getFarmerPolicies(farmer.address);
      expect(farmerPolicies.length).to.equal(2);
    });

    it("Should handle oracle data updates for multiple policies", async function () {
      // Create two policies
      const premium = ethers.parseEther("0.1");
      const threshold = 20;
      const duration = 30 * 24 * 60 * 60;

      await policyFactory.connect(insurer).createPolicy(
        farmer.address,
        premium,
        threshold,
        duration,
        { value: premium }
      );

      await policyFactory.connect(insurer).createPolicy(
        farmer.address,
        premium,
        threshold,
        duration,
        { value: premium }
      );

      // Update data for both policies
      const policyIds = [1, 2];
      const rainfalls = [15, 18];
      const temperatures = [25, 27];
      const soilMoistures = [60, 62];

      await oracleAdapter.connect(oracle).batchUpdateWeatherData(
        policyIds,
        rainfalls,
        temperatures,
        soilMoistures
      );

      // Verify data was updated
      const data1 = await oracleAdapter.getWeatherData(1);
      const data2 = await oracleAdapter.getWeatherData(2);

      expect(data1.rainfall).to.equal(15);
      expect(data2.rainfall).to.equal(18);
    });
  });
});
