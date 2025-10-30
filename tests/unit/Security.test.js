const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgriInsure Smart Contract Security Tests", function () {
  let oracleAdapter, payoutEscrow, policyFactory;
  let owner, farmer, insurer, oracle, attacker;

  beforeEach(async function () {
    [owner, farmer, insurer, oracle, attacker] = await ethers.getSigners();

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

  describe("Access Control Tests", function () {
    it("Should prevent unauthorized policy creation", async function () {
      const premium = ethers.parseEther("0.1");
      const threshold = 20;
      const duration = 30 * 24 * 60 * 60;

      await expect(
        policyFactory.connect(attacker).createPolicy(
          farmer.address,
          premium,
          threshold,
          duration,
          { value: premium }
        )
      ).to.be.revertedWith("Not authorized insurer");
    });

    it("Should prevent unauthorized oracle data updates", async function () {
      await expect(
        oracleAdapter.connect(attacker).updateWeatherData(1, 15, 25, 60)
      ).to.be.revertedWith("Not authorized oracle");
    });

    it("Should prevent unauthorized payout execution", async function () {
      await expect(
        payoutEscrow.connect(attacker).executePayout(1, farmer.address, ethers.parseEther("0.2"))
      ).to.be.revertedWith("Not authorized contract");
    });

    it("Should allow owner to authorize new insurers", async function () {
      await policyFactory.connect(owner).authorizeInsurer(attacker.address);
      expect(await policyFactory.authorizedInsurers(attacker.address)).to.be.true;
    });

    it("Should allow owner to revoke insurer authorization", async function () {
      await policyFactory.connect(owner).revokeInsurer(insurer.address);
      expect(await policyFactory.authorizedInsurers(insurer.address)).to.be.false;
    });
  });

  describe("Reentrancy Protection Tests", function () {
    it("Should prevent reentrancy attacks on payout execution", async function () {
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

      // Update oracle data
      await oracleAdapter.connect(oracle).updateWeatherData(1, 10, 25, 60);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      // Execute payout (should be protected against reentrancy)
      const payoutAmount = ethers.parseEther("0.2");
      await expect(
        payoutEscrow.connect(insurer).executePayout(1, farmer.address, payoutAmount)
      ).to.not.be.reverted;
    });
  });

  describe("Input Validation Tests", function () {
    it("Should reject zero address for farmer", async function () {
      const premium = ethers.parseEther("0.1");
      const threshold = 20;
      const duration = 30 * 24 * 60 * 60;

      await expect(
        policyFactory.connect(insurer).createPolicy(
          ethers.ZeroAddress,
          premium,
          threshold,
          duration,
          { value: premium }
        )
      ).to.be.revertedWith("Invalid farmer address");
    });

    it("Should reject invalid premium amounts", async function () {
      const threshold = 20;
      const duration = 30 * 24 * 60 * 60;

      // Too low premium
      await expect(
        policyFactory.connect(insurer).createPolicy(
          farmer.address,
          ethers.parseEther("0.001"),
          threshold,
          duration,
          { value: ethers.parseEther("0.001") }
        )
      ).to.be.revertedWith("Premium out of range");

      // Too high premium
      await expect(
        policyFactory.connect(insurer).createPolicy(
          farmer.address,
          ethers.parseEther("20"),
          threshold,
          duration,
          { value: ethers.parseEther("20") }
        )
      ).to.be.revertedWith("Premium out of range");
    });

    it("Should reject invalid threshold values", async function () {
      const premium = ethers.parseEther("0.1");
      const duration = 30 * 24 * 60 * 60;

      // Too low threshold
      await expect(
        policyFactory.connect(insurer).createPolicy(
          farmer.address,
          premium,
          0,
          duration,
          { value: premium }
        )
      ).to.be.revertedWith("Threshold out of range");

      // Too high threshold
      await expect(
        policyFactory.connect(insurer).createPolicy(
          farmer.address,
          premium,
          100,
          duration,
          { value: premium }
        )
      ).to.be.revertedWith("Threshold out of range");
    });

    it("Should reject invalid duration values", async function () {
      const premium = ethers.parseEther("0.1");
      const threshold = 20;

      // Too short duration
      await expect(
        policyFactory.connect(insurer).createPolicy(
          farmer.address,
          premium,
          threshold,
          1 * 24 * 60 * 60 - 1, // Just under 1 day
          { value: premium }
        )
      ).to.be.revertedWith("Duration out of range");

      // Too long duration
      await expect(
        policyFactory.connect(insurer).createPolicy(
          farmer.address,
          premium,
          threshold,
          400 * 24 * 60 * 60, // Over 1 year
          { value: premium }
        )
      ).to.be.revertedWith("Duration out of range");
    });

    it("Should reject invalid oracle data ranges", async function () {
      // Invalid rainfall (too high)
      await expect(
        oracleAdapter.connect(oracle).updateWeatherData(1, 2000, 25, 60)
      ).to.be.revertedWith("Invalid data range");

      // Invalid temperature (too low)
      await expect(
        oracleAdapter.connect(oracle).updateWeatherData(1, 15, -100, 60)
      ).to.be.revertedWith("Invalid data range");

      // Invalid soil moisture (too high)
      await expect(
        oracleAdapter.connect(oracle).updateWeatherData(1, 15, 25, 150)
      ).to.be.revertedWith("Invalid data range");
    });
  });

  describe("State Management Tests", function () {
    it("Should correctly track policy state transitions", async function () {
      // Create policy
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

      // Check initial state
      const escrowEntry = await payoutEscrow.getEscrowEntry(1);
      expect(escrowEntry.isActive).to.be.true;
      expect(escrowEntry.payoutExecuted).to.be.false;

      // Update oracle data
      await oracleAdapter.connect(oracle).updateWeatherData(1, 10, 25, 60);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      // Execute payout
      const payoutAmount = ethers.parseEther("0.2");
      await payoutEscrow.connect(insurer).executePayout(1, farmer.address, payoutAmount);

      // Check final state
      const finalEscrowEntry = await payoutEscrow.getEscrowEntry(1);
      expect(finalEscrowEntry.isActive).to.be.false;
      expect(finalEscrowEntry.payoutExecuted).to.be.true;
    });

    it("Should prevent double payout execution", async function () {
      // Create policy and execute payout
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

      await oracleAdapter.connect(oracle).updateWeatherData(1, 10, 25, 60);

      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      const payoutAmount = ethers.parseEther("0.2");
      await payoutEscrow.connect(insurer).executePayout(1, farmer.address, payoutAmount);

      // Try to execute payout again
      await expect(
        payoutEscrow.connect(insurer).executePayout(1, farmer.address, payoutAmount)
      ).to.be.revertedWith("Payout already executed");
    });
  });

  describe("Emergency Functions Tests", function () {
    it("Should allow owner to pause contracts", async function () {
      await policyFactory.connect(owner).pauseFactory();
      expect(await policyFactory.paused()).to.be.true;

      await oracleAdapter.connect(owner).pauseAdapter();
      expect(await oracleAdapter.paused()).to.be.true;

      await payoutEscrow.connect(owner).pauseEscrow();
      expect(await payoutEscrow.paused()).to.be.true;
    });

    it("Should prevent operations when paused", async function () {
      await policyFactory.connect(owner).pauseFactory();

      const premium = ethers.parseEther("0.1");
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
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should allow owner to unpause contracts", async function () {
      await policyFactory.connect(owner).pauseFactory();
      await policyFactory.connect(owner).unpauseFactory();
      expect(await policyFactory.paused()).to.be.false;
    });

    it("Should allow emergency withdrawal in emergency mode", async function () {
      // Enable emergency mode
      await payoutEscrow.connect(owner).enableEmergencyMode();
      expect(await payoutEscrow.emergencyMode()).to.be.true;

      // Fast forward emergency withdrawal delay
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      // Execute emergency withdrawal
      await expect(
        payoutEscrow.connect(owner).emergencyWithdraw()
      ).to.not.be.reverted;
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should use reasonable gas for policy creation", async function () {
      const premium = ethers.parseEther("0.1");
      const threshold = 20;
      const duration = 30 * 24 * 60 * 60;

      const tx = await policyFactory.connect(insurer).createPolicy(
        farmer.address,
        premium,
        threshold,
        duration,
        { value: premium }
      );

      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.be.lessThan(500000); // Should use less than 500k gas
    });

    it("Should use reasonable gas for oracle updates", async function () {
      const tx = await oracleAdapter.connect(oracle).updateWeatherData(1, 15, 25, 60);
      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.be.lessThan(100000); // Should use less than 100k gas
    });

    it("Should use reasonable gas for batch oracle updates", async function () {
      const policyIds = [1, 2, 3];
      const rainfalls = [15, 18, 12];
      const temperatures = [25, 27, 23];
      const soilMoistures = [60, 62, 58];

      const tx = await oracleAdapter.connect(oracle).batchUpdateWeatherData(
        policyIds,
        rainfalls,
        temperatures,
        soilMoistures
      );

      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.be.lessThan(200000); // Should use less than 200k gas
    });
  });
});







