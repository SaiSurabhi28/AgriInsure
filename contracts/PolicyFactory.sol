// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title IOracleAdapter
 * @dev Interface for OracleAdapter contract
 */
interface IOracleAdapter {
    function sumInWindow(uint64 startTs, uint64 endTs) external view returns (uint64);
}

/**
 * @title ITreasury
 * @dev Interface for Treasury contract
 */
interface ITreasury {
    function payOut(address to, uint256 amount) external;
}

/**
 * @title PolicyFactory
 * @dev Factory for parametric micro-insurance policies with automated payouts
 * @dev Based on academic research in parametric insurance
 */
contract PolicyFactory is Ownable, ReentrancyGuard, Pausable {

    // Events
    event PolicyCreated(
        uint256 indexed policyId,
        address indexed holder,
        uint256 indexed productId,
        uint64 startTs,
        uint64 endTs,
        uint64 threshold,
        uint256 premiumPaid,
        uint256 payoutAmount
    );
    
    event PolicyFinalized(
        uint256 indexed policyId,
        address indexed holder,
        uint64 indexValue,
        bool payoutExecuted,
        uint256 payoutAmount
    );
    
    event ProductAdded(
        uint256 indexed productId,
        string name,
        uint64 minDurationDays,
        uint64 maxDurationDays,
        uint64 minThreshold,
        uint64 maxThreshold
    );

    // Enums
    enum Status { Active, PaidOut, Expired }

    // Policy structure (optimized with uint64 for gas efficiency)
    struct Policy {
        address holder;
        uint256 productId;
        uint64 startTs;
        uint64 endTs;
        uint64 threshold;      // e.g., 50 mm
        uint256 premiumPaid;   // in wei
        uint256 payoutAmount;  // in wei
        Status status;
    }

    // Product structure for configuration
    struct Product {
        uint256 id;
        string name;
        uint64 minDurationDays;
        uint64 maxDurationDays;
        uint64 minThreshold;      // mm
        uint64 maxThreshold;      // mm
        uint256 basePremiumWei;
        uint256 basePayoutWei;
        uint16 premiumBpsPerDay;  // basis points per day (e.g., 20 = 0.2% per day)
        bool isActive;
    }

    // State variables
    uint256 public policyCounter;
    uint256 public productCounter;
    
    IOracleAdapter public oracle;
    ITreasury public treasury;
    address public insuranceAccount;  // Main insurance company account
    
    // Policy registry
    mapping(uint256 => Policy) public policies;
    mapping(address => uint256[]) public holderPolicies;
    mapping(uint256 => Product) public products;
    mapping(address => uint256) public activePolicyId;  // Track active policy per address (0 = no active policy)

    constructor(address _oracleAdapter, address _treasury) Ownable(msg.sender) {
        oracle = IOracleAdapter(_oracleAdapter);
        treasury = ITreasury(_treasury);
        insuranceAccount = msg.sender;  // Default to deployer, can be updated
    }
    
    /**
     * @dev Set the main insurance account
     */
    function setInsuranceAccount(address _insuranceAccount) external onlyOwner {
        require(_insuranceAccount != address(0), "Invalid address");
        insuranceAccount = _insuranceAccount;
    }
    
    /**
     * @dev Check if address has an active policy
     */
    function hasActivePolicy(address holder) public view returns (bool) {
        uint256 policyId = activePolicyId[holder];
        if (policyId == 0) return false;
        Policy memory policy = policies[policyId];
        return policy.status == Status.Active;
    }

    /**
     * @dev Add a new insurance product
     * @param name Product name (e.g., "Rain Insurance - Corn")
     * @param minDurationDays Minimum policy duration in days
     * @param maxDurationDays Maximum policy duration in days
     * @param minThreshold Minimum threshold (mm)
     * @param maxThreshold Maximum threshold (mm)
     * @param basePremiumWei Base premium in wei
     * @param basePayoutWei Base payout in wei
     * @param premiumBpsPerDay Premium basis points per day (e.g., 20 = 0.2%)
     */
    function addProduct(
        string memory name,
        uint64 minDurationDays,
        uint64 maxDurationDays,
        uint64 minThreshold,
        uint64 maxThreshold,
        uint256 basePremiumWei,
        uint256 basePayoutWei,
        uint16 premiumBpsPerDay
    ) external onlyOwner returns (uint256) {
        productCounter++;
        
        products[productCounter] = Product({
            id: productCounter,
            name: name,
            minDurationDays: minDurationDays,
            maxDurationDays: maxDurationDays,
            minThreshold: minThreshold,
            maxThreshold: maxThreshold,
            basePremiumWei: basePremiumWei,
            basePayoutWei: basePayoutWei,
            premiumBpsPerDay: premiumBpsPerDay,
            isActive: true
        });
        
        emit ProductAdded(productCounter, name, minDurationDays, maxDurationDays, minThreshold, maxThreshold);
        return productCounter;
    }

    /**
     * @dev Price a policy to show premium and payout (external for UI)
     * @param productId Product ID
     * @param durationDays Policy duration in days
     * @return premiumWei Premium in wei
     * @return payoutWei Payout in wei
     */
    function pricePolicy(uint256 productId, uint64 durationDays) 
        external 
        view 
        returns (uint256 premiumWei, uint256 payoutWei) 
    {
        return _pricePolicy(productId, durationDays);
    }

    /**
     * @dev Internal pricing logic
     */
    function _pricePolicy(uint256 productId, uint64 durationDays) 
        internal 
        view 
        returns (uint256 premiumWei, uint256 payoutWei) 
    {
        Product memory product = products[productId];
        require(product.isActive, "Product not active");
        require(durationDays >= product.minDurationDays && durationDays <= product.maxDurationDays, "Invalid duration");
        
        // Premium calculation: base + (days * basis points)
        premiumWei = product.basePremiumWei;
        if (durationDays > 0 && product.premiumBpsPerDay > 0) {
            uint256 dailyIncrement = (premiumWei * uint256(product.premiumBpsPerDay) * uint256(durationDays)) / 10000;
            premiumWei = premiumWei + dailyIncrement;
        }
        
        // Payout is calculated proportionally to premium
        payoutWei = product.basePayoutWei + (premiumWei * 4); // 4x premium as payout
        
        return (premiumWei, payoutWei);
    }

    /**
     * @dev Create a new insurance policy
     * @param productId Product ID
     * @param startTs Start timestamp (must be >= block.timestamp)
     * @param durationDays Duration in days
     * @param threshold Threshold value (mm)
     * @return policyId Created policy ID
     */
    function createPolicy(
        uint256 productId,
        uint64 startTs,
        uint64 durationDays,
        uint64 threshold
    ) external payable nonReentrant whenNotPaused returns (uint256) {
        // Check if user already has an active policy
        require(!hasActivePolicy(msg.sender), "Account already has an active policy");
        
        Product memory product = products[productId];
        require(product.isActive, "Product not active");
        require(startTs >= uint64(block.timestamp), "Start time must be in the future");
        require(durationDays >= product.minDurationDays && durationDays <= product.maxDurationDays, "Invalid duration");
        require(threshold >= product.minThreshold && threshold <= product.maxThreshold, "Invalid threshold");
        
        // Calculate premium and payout
        uint64 endTs = startTs + (durationDays * 1 days);
        (uint256 premiumWei, uint256 payoutWei) = _pricePolicy(productId, durationDays);
        require(msg.value == premiumWei, "Incorrect premium amount");
        
        // Transfer premium to Treasury (insurance company account)
        (bool success, ) = address(treasury).call{value: msg.value}("");
        require(success, "Premium transfer to Treasury failed");
        
        policyCounter++;
        uint256 policyId = policyCounter;
        
        // Create policy
        policies[policyId] = Policy({
            holder: msg.sender,
            productId: productId,
            startTs: startTs,
            endTs: endTs,
            threshold: threshold,
            premiumPaid: msg.value,
            payoutAmount: payoutWei,
            status: Status.Active
        });
        
        holderPolicies[msg.sender].push(policyId);
        activePolicyId[msg.sender] = policyId;  // Track active policy
        
        emit PolicyCreated(policyId, msg.sender, productId, startTs, endTs, threshold, msg.value, payoutWei);
        
        return policyId;
    }

    /**
     * @dev Finalize a policy and check payout conditions
     * @param policyId Policy ID to finalize
     * @dev Allows early finalization - you can claim payout anytime if conditions are met
     */
    function finalize(uint256 policyId) external nonReentrant whenNotPaused {
        Policy storage policy = policies[policyId];
        require(policy.status == Status.Active, "Policy not active");
        
        // Require that policy has started
        require(block.timestamp >= policy.startTs, "Policy has not started yet");
        
        // Allow finalization even before expiry (early claim)
        // Use current time as end time if not expired yet
        uint64 endTime = block.timestamp >= policy.endTs ? policy.endTs : uint64(block.timestamp);
        
        // Ensure endTime is at least startTime (required by oracle)
        if (endTime < policy.startTs) {
            endTime = policy.startTs;
        }
        
        // Read cumulative index from OracleAdapter for the active period
        uint64 indexValue = oracle.sumInWindow(policy.startTs, endTime);
        
        // Parametric trigger: if index < threshold → payout
        bool shouldPayout = (indexValue < policy.threshold);
        
        if (shouldPayout) {
            policy.status = Status.PaidOut;
            // Clear active policy tracking
            activePolicyId[policy.holder] = 0;
            // Only call payOut if payout amount is greater than 0
            if (policy.payoutAmount > 0) {
                treasury.payOut(policy.holder, policy.payoutAmount);
            }
            emit PolicyFinalized(policyId, policy.holder, indexValue, true, policy.payoutAmount);
        } else {
            // Conditions not mixed - only allow finalization if policy has expired
            if (block.timestamp >= policy.endTs) {
                // Policy expired - mark as expired (no payout, premium stays in Treasury)
                policy.status = Status.Expired;
                // Clear active policy tracking - premium stays in Treasury (insurance company)
                activePolicyId[policy.holder] = 0;
                emit PolicyFinalized(policyId, policy.holder, indexValue, false, 0);
            } else {
                // Policy still active and conditions not met - reject finalization
                revert("Conditions not met: cumulative rainfall is above threshold and policy has not expired yet");
            }
        }
    }

    /**
     * @dev Get policy by ID
     */
    function getPolicy(uint256 policyId) external view returns (Policy memory) {
        return policies[policyId];
    }

    /**
     * @dev Get product by ID
     */
    function getProduct(uint256 productId) external view returns (Product memory) {
        return products[productId];
    }

    /**
     * @dev Get holder's policies
     */
    function getHolderPolicies(address holder) external view returns (uint256[] memory) {
        return holderPolicies[holder];
    }
    
    /**
     * @dev Pause factory operations
     */
    function pauseFactory() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause factory operations
     */
    function unpauseFactory() external onlyOwner {
        _unpause();
    }
}
