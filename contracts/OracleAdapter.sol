// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title OracleAdapter
 * @dev Stores trusted index readings from oracle reporters with cumulative sum calculation
 * @dev Supports period-based values that are summed over policy windows
 */
contract OracleAdapter is Ownable, ReentrancyGuard, Pausable {

    // Events
    event OraclePushed(
        uint64 indexed roundId,
        uint64 value,
        uint64 ts,
        address indexed reporter
    );
    
    event ReporterAuthorized(address indexed reporter);
    event ReporterRevoked(address indexed reporter);

    // Round structure for storing data
    struct Round {
        uint64 ts;
        uint64 value;    // e.g., rainfall mm for this period
    }

    // State variables
    mapping(uint64 => Round) public rounds;   // roundId -> Round
    uint64 public latestRoundId;
    
    mapping(address => bool) public isReporter;
    
    // Optional: store prefix sums for O(1) range queries
    uint64 public sumAllRounds;

    constructor() Ownable(msg.sender) {
        isReporter[msg.sender] = true;
    }

    /**
     * @dev Modifier to check reporter authorization
     */
    modifier onlyReporter() {
        require(isReporter[msg.sender], "Not authorized reporter");
        _;
    }

    /**
     * @dev Push a new oracle round (period-based value)
     * @param roundId Round ID (must be monotonic)
     * @param value Value for this period (e.g., daily rainfall in mm)
     * @param ts Timestamp
     */
    function push(uint64 roundId, uint64 value, uint64 ts) 
        external 
        onlyReporter 
        whenNotPaused 
        nonReentrant 
    {
        require(roundId > latestRoundId, "Round ID must be greater than latest");
        require(ts <= uint64(block.timestamp) + 5 minutes, "Timestamp too far in future");
        
        // Update latest round
        latestRoundId = roundId;
        rounds[roundId] = Round({
            ts: ts,
            value: value
        });
        
        sumAllRounds = sumAllRounds + value;
        
        emit OraclePushed(roundId, value, ts, msg.sender);
    }

    /**
     * @dev Sum values in a time window (cumulative sum)
     * @param startTs Start timestamp
     * @param endTs End timestamp
     * @return Sum of values in the time window
     */
    function sumInWindow(uint64 startTs, uint64 endTs) 
        external 
        view 
        returns (uint64) 
    {
        require(endTs >= startTs, "Invalid time window");
        
        uint64 sum = 0;
        uint64 currentRoundId = latestRoundId;
        
        // Iterate backwards from latest round
        while (currentRoundId > 0 && rounds[currentRoundId].ts > startTs) {
            Round memory round = rounds[currentRoundId];
            
            // Include round if within window
            if (round.ts >= startTs && round.ts <= endTs) {
                sum = sum + round.value;
            }
            
            currentRoundId--;
        }
        
        return sum;
    }

    /**
     * @dev Get latest round
     */
    function getLatestRound() external view returns (Round memory) {
        return rounds[latestRoundId];
    }

    /**
     * @dev Get round by ID
     */
    function getRound(uint64 roundId) external view returns (Round memory) {
        return rounds[roundId];
    }

    /**
     * @dev Authorize a new reporter
     */
    function authorizeReporter(address reporter) external onlyOwner {
        require(reporter != address(0), "Invalid reporter address");
        isReporter[reporter] = true;
        emit ReporterAuthorized(reporter);
    }

    /**
     * @dev Revoke reporter authorization
     */
    function revokeReporter(address reporter) external onlyOwner {
        isReporter[reporter] = false;
        emit ReporterRevoked(reporter);
    }

    /**
     * @dev Pause oracle operations
     */
    function pauseOracle() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause oracle operations
     */
    function unpauseOracle() external onlyOwner {
        _unpause();
    }
}
