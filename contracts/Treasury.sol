// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title Treasury
 * @dev Simple treasury for holding premium funds and paying out claims
 */
contract Treasury is Ownable, ReentrancyGuard, Pausable {

    // Events
    event PayoutExecuted(
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );
    
    event Funded(
        address indexed funder,
        uint256 amount
    );

    // Access control
    mapping(address => bool) public authorizedContracts;

    constructor() Ownable(msg.sender) {
        authorizedContracts[msg.sender] = true;
    }

    /**
     * @dev Modifier to check authorization
     */
    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender], "Not authorized");
        _;
    }

    /**
     * @dev Fund the treasury (insurer tops up pool)
     */
    function fund() external payable whenNotPaused {
        require(msg.value > 0, "Must send funds");
        emit Funded(msg.sender, msg.value);
    }

    /**
     * @dev Pay out to policyholder
     * @param to Recipient address
     * @param amount Amount to pay
     */
    function payOut(address to, uint256 amount) 
        external 
        onlyAuthorized 
        nonReentrant 
        whenNotPaused 
    {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");
        require(address(this).balance >= amount, "Insufficient balance");
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "Payout failed");
        
        emit PayoutExecuted(to, amount, block.timestamp);
    }

    /**
     * @dev Get treasury balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Authorize a contract
     */
    function authorizeContract(address contractAddress) external onlyOwner {
        require(contractAddress != address(0), "Invalid address");
        authorizedContracts[contractAddress] = true;
    }

    /**
     * @dev Revoke contract authorization
     */
    function revokeContract(address contractAddress) external onlyOwner {
        authorizedContracts[contractAddress] = false;
    }

    /**
     * @dev Pause treasury operations
     */
    function pauseTreasury() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause treasury operations
     */
    function unpauseTreasury() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Fallback function to receive ETH
     */
    receive() external payable {
        emit Funded(msg.sender, msg.value);
    }
}

