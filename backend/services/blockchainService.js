const { ethers } = require('ethers');
const fs = require('fs-extra');
const path = require('path');

class BlockchainService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.contracts = {};
    this.contractAddresses = {};
    this.initializeProvider();
    this.loadContractAddresses();
  }

  initializeProvider() {
    try {
      // Initialize provider based on environment
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        // Local development - use Hardhat network
        this.provider = new ethers.JsonRpcProvider('http://localhost:8545');
      } else {
        // Production - use Sepolia testnet
        this.provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
      }

      // Initialize wallet if private key is provided
      if (process.env.PRIVATE_KEY) {
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
        console.log('Wallet initialized:', this.wallet.address);
      }

      console.log('Blockchain provider initialized');
    } catch (error) {
      console.error('Failed to initialize blockchain provider:', error);
      throw error;
    }
  }

  loadContractAddresses() {
    try {
      // Try backend deployments first, then root deployments
      let deploymentFile = path.join(__dirname, '..', 'deployments', `${process.env.NODE_ENV || 'localhost'}.json`);
      if (!fs.existsSync(deploymentFile)) {
        deploymentFile = path.join(__dirname, '..', '..', 'deployments', `${process.env.NODE_ENV || 'localhost'}.json`);
      }
      
      if (fs.existsSync(deploymentFile)) {
        const deployment = fs.readJsonSync(deploymentFile);
        this.contractAddresses = {
          OracleAdapter: deployment.contracts.OracleAdapter.address,
          Treasury: deployment.contracts.Treasury.address,
          PolicyFactory: deployment.contracts.PolicyFactory.address
        };
        console.log('Contract addresses loaded:', this.contractAddresses);
      } else {
        console.warn('No deployment file found, using default addresses');
        // Default addresses for local development
        this.contractAddresses = {
          OracleAdapter: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          Treasury: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
          PolicyFactory: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
        };
      }
    } catch (error) {
      console.error('Failed to load contract addresses:', error);
    }
  }

  async initializeContracts() {
    try {
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }

      // Load contract ABIs
      const contractABIs = await this.loadContractABIs();

      // Use wallet for write operations, provider for read operations
      const signer = this.wallet || this.provider;

      // Initialize contract instances
      this.contracts.OracleAdapter = new ethers.Contract(
        this.contractAddresses.OracleAdapter,
        contractABIs.OracleAdapter,
        signer
      );

      this.contracts.Treasury = new ethers.Contract(
        this.contractAddresses.Treasury,
        contractABIs.Treasury,
        signer
      );

      this.contracts.PolicyFactory = new ethers.Contract(
        this.contractAddresses.PolicyFactory,
        contractABIs.PolicyFactory,
        signer
      );

      console.log('Contracts initialized successfully');
      console.log('PolicyFactory address:', this.contractAddresses.PolicyFactory);
      console.log('PolicyFactory ABI functions:', contractABIs.PolicyFactory.filter(f => f.type === 'function').length, 'functions');
      
      // Verify the contract instance
      const contractAddress = this.contracts.PolicyFactory.target;
      console.log('Contract instance address:', contractAddress);
      if (contractAddress.toLowerCase() !== this.contractAddresses.PolicyFactory.toLowerCase()) {
        throw new Error(`Contract address mismatch! Expected ${this.contractAddresses.PolicyFactory}, got ${contractAddress}`);
      }
    } catch (error) {
      console.error('Failed to initialize contracts:', error);
      throw error;
    }
  }

  async loadContractABIs() {
    try {
      // Try backend/../artifacts first (parent dir artifacts), then root artifacts
      let artifactsPath = path.join(__dirname, '..', 'artifacts', 'contracts');
      if (!fs.existsSync(artifactsPath)) {
        artifactsPath = path.join(__dirname, '..', '..', 'artifacts', 'contracts');
      }
      
      console.log('Loading ABIs from:', artifactsPath);
      const oracleAdapterABI = await fs.readJson(path.join(artifactsPath, 'OracleAdapter.sol', 'OracleAdapter.json'));
      const treasuryABI = await fs.readJson(path.join(artifactsPath, 'Treasury.sol', 'Treasury.json'));
      const policyFactoryABI = await fs.readJson(path.join(artifactsPath, 'PolicyFactory.sol', 'PolicyFactory.json'));

      const abis = {
        OracleAdapter: oracleAdapterABI.abi,
        Treasury: treasuryABI.abi,
        PolicyFactory: policyFactoryABI.abi
      };
      
      console.log('ABIs loaded. PolicyFactory functions:', abis.PolicyFactory.filter(f => f.type === 'function').length);
      console.log('Has productCounter:', abis.PolicyFactory.some(f => f.name === 'productCounter'));
      
      return abis;
    } catch (error) {
      console.error('Failed to load contract ABIs:', error);
      console.error('Error details:', error.message, error.stack);
      // Return empty ABIs as fallback
      return {
        OracleAdapter: [],
        Treasury: [],
        PolicyFactory: []
      };
    }
  }

  async createPolicy(farmerAddress, premium, threshold, duration) {
    try {
      if (!this.contracts.PolicyFactory) {
        await this.initializeContracts();
      }

      const tx = await this.contracts.PolicyFactory.createPolicy(
        farmerAddress,
        ethers.parseEther(premium.toString()),
        threshold,
        duration,
        { value: ethers.parseEther(premium.toString()) }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => 
        log.topics[0] === this.contracts.PolicyFactory.interface.getEvent("PolicyCreated").topicHash
      );

      if (event) {
        const decodedEvent = this.contracts.PolicyFactory.interface.parseLog(event);
        return {
          success: true,
          policyId: decodedEvent.args.policyId.toString(),
          policyAddress: decodedEvent.args.policyAddress,
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber
        };
      }

      throw new Error('Policy creation event not found');
    } catch (error) {
      console.error('Failed to create policy:', error);
      throw error;
    }
  }

  async updateOracleData(policyId, rainfall, temperature, soilMoisture) {
    try {
      if (!this.contracts.OracleAdapter) {
        await this.initializeContracts();
      }

      const tx = await this.contracts.OracleAdapter.updateWeatherData(
        policyId,
        rainfall,
        temperature,
        soilMoisture
      );

      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Failed to update oracle data:', error);
      throw error;
    }
  }

  async executePayout(policyId, farmerAddress, payoutAmount) {
    try {
      if (!this.contracts.Treasury) {
        await this.initializeContracts();
      }

      const tx = await this.contracts.Treasury.executePayout(
        farmerAddress,
        ethers.parseEther(payoutAmount.toString())
      );

      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Failed to execute payout:', error);
      throw error;
    }
  }

  async getPolicyStatus(policyId) {
    try {
      if (!this.contracts.PolicyFactory) {
        await this.initializeContracts();
      }

      // Get policy data directly from PolicyFactory
      const policy = await this.contracts.PolicyFactory.getPolicy(policyId);
      
      // Check if policy exists (holder will be zero address if not found)
      if (policy.holder === ethers.ZeroAddress) {
        throw new Error('Policy not found');
      }

      // Get product info
      const product = await this.contracts.PolicyFactory.getProduct(policy.productId);

      return {
        policyId: policyId.toString(),
        holder: policy.holder,
        productId: policy.productId.toString(),
        productName: product.name,
        startTs: Number(policy.startTs),
        endTs: Number(policy.endTs),
        threshold: Number(policy.threshold),
        premiumPaid: policy.premiumPaid.toString(),
        payoutAmount: policy.payoutAmount.toString(),
        status: Number(policy.status), // 0=Active, 1=PaidOut, 2=Expired
        statusString: ['Active', 'PaidOut', 'Expired'][Number(policy.status)]
      };
    } catch (error) {
      console.error('Failed to get policy status:', error);
      throw error;
    }
  }

  async getFarmerPolicies(farmerAddress) {
    try {
      if (!this.contracts.PolicyFactory) {
        await this.initializeContracts();
      }

      const policyIds = await this.contracts.PolicyFactory.getHolderPolicies(farmerAddress);
      
      const policies = [];
      for (const policyId of policyIds) {
        try {
          const status = await this.getPolicyStatus(policyId.toString());
          policies.push(status);
        } catch (error) {
          console.error(`Failed to get status for policy ${policyId}:`, error);
        }
      }

      return policies;
    } catch (error) {
      console.error('Failed to get farmer policies:', error);
      throw error;
    }
  }

  async getBlockchainStatus() {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      const gasPrice = await this.provider.getGasPrice();
      const balance = this.wallet ? await this.wallet.getBalance() : ethers.parseEther('0');

      return {
        network: {
          name: network.name,
          chainId: network.chainId.toString()
        },
        blockNumber,
        gasPrice: ethers.formatEther(gasPrice),
        walletBalance: ethers.formatEther(balance),
        contracts: this.contractAddresses,
        isConnected: true
      };
    } catch (error) {
      console.error('Failed to get blockchain status:', error);
      return {
        isConnected: false,
        error: error.message
      };
    }
  }

  getContractAddresses() {
    return this.contractAddresses;
  }

  async getProducts() {
    try {
      // Always reinitialize to ensure fresh contract instances
        await this.initializeContracts();

      // Verify contract exists at address
      const code = await this.provider.getCode(this.contractAddresses.PolicyFactory);
      if (!code || code === '0x') {
        throw new Error(`No contract found at address ${this.contractAddresses.PolicyFactory}`);
      }

      const productCount = await this.contracts.PolicyFactory.productCounter();
      const products = [];
      
      for (let i = 1; i <= productCount; i++) {
        try {
          const product = await this.contracts.PolicyFactory.getProduct(i);
          products.push({
            id: i,
            name: product.name,
            minDurationDays: Number(product.minDurationDays),
            maxDurationDays: Number(product.maxDurationDays),
            minThreshold: Number(product.minThreshold),
            maxThreshold: Number(product.maxThreshold),
            basePremiumWei: product.basePremiumWei.toString(),
            basePayoutWei: product.basePayoutWei.toString(),
            premiumBpsPerDay: Number(product.premiumBpsPerDay),
            isActive: product.isActive
          });
        } catch (err) {
          // Skip if product doesn't exist
        }
      }
      
      return products;
    } catch (error) {
      console.error('Failed to get products:', error);
      throw error;
    }
  }

  async pricePolicy(productId, durationDays) {
    try {
      if (!this.contracts.PolicyFactory) {
        await this.initializeContracts();
      }

      const [premiumWei, payoutWei] = await this.contracts.PolicyFactory.pricePolicy(productId, durationDays);
      
      return {
        premiumWei,
        payoutWei,
        premiumFormatted: ethers.formatEther(premiumWei),
        payoutFormatted: ethers.formatEther(payoutWei)
      };
    } catch (error) {
      console.error('Failed to price policy:', error);
      throw error;
    }
  }

  async getContractEvents(contractName, eventName, fromBlock = 0, toBlock = 'latest') {
    try {
      if (!this.contracts[contractName]) {
        await this.initializeContracts();
      }

      const filter = this.contracts[contractName].filters[eventName]();
      const events = await this.contracts[contractName].queryFilter(filter, fromBlock, toBlock);
      
      return events.map(event => ({
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        args: event.args
      }));
    } catch (error) {
      console.error(`Failed to get ${eventName} events:`, error);
      throw error;
    }
  }

  async hasActivePolicy(farmerAddress) {
    try {
      if (!this.contracts.PolicyFactory) {
        await this.initializeContracts();
      }

      // Try to use the contract function first
      try {
        const hasActive = await this.contracts.PolicyFactory.hasActivePolicy(farmerAddress);
        return hasActive;
      } catch (abiError) {
        // Fallback: check policies manually if ABI doesn't have the function
        console.warn('hasActivePolicy function not available, checking policies manually:', abiError.message);
        const policies = await this.getFarmerPolicies(farmerAddress);
        const activePolicy = policies.find(p => p.status === 'Active');
        return activePolicy !== undefined;
      }
    } catch (error) {
      console.error('Failed to check active policy:', error);
      throw error;
    }
  }

  async getActivePolicy(farmerAddress) {
    try {
      const policies = await this.getFarmerPolicies(farmerAddress);
      const activePolicy = policies.find(p => p.status === 'Active');
      return activePolicy || null;
    } catch (error) {
      console.error('Failed to get active policy:', error);
      throw error;
    }
  }
}

module.exports = new BlockchainService();





