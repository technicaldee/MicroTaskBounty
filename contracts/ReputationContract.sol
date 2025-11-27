// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ReputationContract
 * @notice Tracks worker and verifier reputation scores
 */
contract ReputationContract is Ownable {
    // Enums
    enum TaskCategory {
        PHOTO_VERIFICATION,
        LOCATION_CHECK,
        SURVEY,
        PRICE_MONITORING,
        BUSINESS_HOURS
    }

    // Structs
    struct CategoryStats {
        uint256 successCount;
        uint256 totalCount;
        bool hasBadge;
    }

    struct ReputationData {
        uint256 score;
        uint256 tasksCompleted;
        uint256 tasksRejected;
        uint256 verificationsPerformed;
        uint256 accurateVerifications;
        mapping(TaskCategory => CategoryStats) categoryStats;
    }

    // Constants
    uint256 public constant INITIAL_REPUTATION = 50;
    uint256 public constant REPUTATION_INCREASE = 5;
    uint256 public constant REPUTATION_DECREASE = 5;
    uint256 public constant BADGE_TASK_THRESHOLD = 10;
    uint256 public constant BADGE_SUCCESS_RATE_THRESHOLD = 90; // 90%
    uint256 public constant REPUTATION_MULTIPLIER_PERCENTAGE = 1000; // 10% (basis points)
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant HIGH_REPUTATION_THRESHOLD = 80;
    uint256 public constant MAX_REPUTATION = 100;
    uint256 public constant MIN_REPUTATION = 0;

    // State variables
    mapping(address => ReputationData) private reputations;
    address public verificationContractAddress;
    address public taskManagerAddress;

    // Events
    event ReputationInitialized(address indexed user, uint256 initialScore);
    event WorkerReputationUpdated(address indexed worker, bool successful, uint256 newScore);
    event VerifierReputationUpdated(address indexed verifier, bool accurate, uint256 newScore);
    event CategoryBadgeAwarded(address indexed worker, TaskCategory category);
    event VerificationContractUpdated(address indexed newContract);
    event TaskManagerUpdated(address indexed newContract);

    // Custom errors
    error UnauthorizedCaller(address caller);
    error InvalidAddress(address addr);
    error ReputationAlreadyInitialized(address user);

    // Modifiers
    modifier onlyVerificationContract() {
        if (msg.sender != verificationContractAddress) {
            revert UnauthorizedCaller(msg.sender);
        }
        _;
    }

    modifier onlyTaskManager() {
        if (msg.sender != taskManagerAddress) {
            revert UnauthorizedCaller(msg.sender);
        }
        _;
    }

    modifier onlyAuthorizedContracts() {
        if (msg.sender != verificationContractAddress && msg.sender != taskManagerAddress) {
            revert UnauthorizedCaller(msg.sender);
        }
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Set the VerificationContract address
     * @param _verificationContract Address of VerificationContract
     */
    function setVerificationContract(address _verificationContract) external onlyOwner {
        if (_verificationContract == address(0)) {
            revert InvalidAddress(_verificationContract);
        }
        verificationContractAddress = _verificationContract;
        emit VerificationContractUpdated(_verificationContract);
    }

    /**
     * @notice Set the TaskManager contract address
     * @param _taskManager Address of TaskManager contract
     */
    function setTaskManager(address _taskManager) external onlyOwner {
        if (_taskManager == address(0)) {
            revert InvalidAddress(_taskManager);
        }
        taskManagerAddress = _taskManager;
        emit TaskManagerUpdated(_taskManager);
    }

    /**
     * @notice Initialize reputation for a new user
     * @param user Address of the user
     */
    function initializeReputation(address user) external {
        ReputationData storage rep = reputations[user];
        
        if (rep.score != 0) {
            revert ReputationAlreadyInitialized(user);
        }

        rep.score = INITIAL_REPUTATION;
        
        emit ReputationInitialized(user, INITIAL_REPUTATION);
    }

    /**
     * @notice Update worker reputation based on task outcome
     * @param worker Address of the worker
     * @param successful Whether the task was successful
     */
    function updateWorkerReputation(
        address worker,
        bool successful
    ) external onlyVerificationContract {
        ReputationData storage rep = reputations[worker];
        
        // Initialize if first time (check if never had any tasks)
        if (rep.score == 0 && rep.tasksCompleted == 0 && rep.tasksRejected == 0) {
            rep.score = INITIAL_REPUTATION;
        }

        if (successful) {
            // Increase reputation (capped at MAX_REPUTATION)
            if (rep.score + REPUTATION_INCREASE <= MAX_REPUTATION) {
                rep.score += REPUTATION_INCREASE;
            } else {
                rep.score = MAX_REPUTATION;
            }
            rep.tasksCompleted++;
        } else {
            // Decrease reputation (floored at MIN_REPUTATION)
            if (rep.score >= REPUTATION_DECREASE) {
                rep.score -= REPUTATION_DECREASE;
            } else {
                rep.score = MIN_REPUTATION;
            }
            rep.tasksRejected++;
        }

        emit WorkerReputationUpdated(worker, successful, rep.score);
    }

    /**
     * @notice Update worker reputation with category tracking
     * @param worker Address of the worker
     * @param category Task category
     * @param successful Whether the task was successful
     */
    function updateWorkerReputationWithCategory(
        address worker,
        TaskCategory category,
        bool successful
    ) external onlyAuthorizedContracts {
        ReputationData storage rep = reputations[worker];
        
        // Initialize if first time (check if never had any tasks)
        if (rep.score == 0 && rep.tasksCompleted == 0 && rep.tasksRejected == 0) {
            rep.score = INITIAL_REPUTATION;
        }

        // Update overall reputation
        if (successful) {
            if (rep.score + REPUTATION_INCREASE <= MAX_REPUTATION) {
                rep.score += REPUTATION_INCREASE;
            } else {
                rep.score = MAX_REPUTATION;
            }
            rep.tasksCompleted++;
        } else {
            if (rep.score >= REPUTATION_DECREASE) {
                rep.score -= REPUTATION_DECREASE;
            } else {
                rep.score = MIN_REPUTATION;
            }
            rep.tasksRejected++;
        }

        // Update category stats
        CategoryStats storage catStats = rep.categoryStats[category];
        catStats.totalCount++;
        if (successful) {
            catStats.successCount++;
        }

        // Check for badge award
        if (!catStats.hasBadge && _shouldAwardBadge(catStats)) {
            catStats.hasBadge = true;
            emit CategoryBadgeAwarded(worker, category);
        }

        emit WorkerReputationUpdated(worker, successful, rep.score);
    }

    /**
     * @notice Update verifier reputation based on vote accuracy
     * @param verifier Address of the verifier
     * @param accurateVote Whether the vote was accurate
     */
    function updateVerifierReputation(
        address verifier,
        bool accurateVote
    ) external onlyVerificationContract {
        ReputationData storage rep = reputations[verifier];
        
        // Initialize if first time (check if never performed verifications)
        if (rep.score == 0 && rep.verificationsPerformed == 0) {
            rep.score = INITIAL_REPUTATION;
        }

        rep.verificationsPerformed++;

        if (accurateVote) {
            // Increase reputation for accurate verification
            if (rep.score + REPUTATION_INCREASE <= MAX_REPUTATION) {
                rep.score += REPUTATION_INCREASE;
            } else {
                rep.score = MAX_REPUTATION;
            }
            rep.accurateVerifications++;
        } else {
            // Decrease reputation for inaccurate verification
            if (rep.score >= REPUTATION_DECREASE) {
                rep.score -= REPUTATION_DECREASE;
            } else {
                rep.score = MIN_REPUTATION;
            }
        }

        emit VerifierReputationUpdated(verifier, accurateVote, rep.score);
    }

    /**
     * @notice Check if a badge should be awarded
     * @param stats Category statistics
     * @return shouldAward True if badge should be awarded
     */
    function _shouldAwardBadge(CategoryStats storage stats) private view returns (bool) {
        if (stats.totalCount < BADGE_TASK_THRESHOLD) {
            return false;
        }
        
        uint256 successRate = (stats.successCount * 100) / stats.totalCount;
        return successRate >= BADGE_SUCCESS_RATE_THRESHOLD;
    }

    /**
     * @notice Get reputation score for a user
     * @param user Address of the user
     * @return score The reputation score
     */
    function getReputationScore(address user) external view returns (uint256) {
        ReputationData storage rep = reputations[user];
        // If score is 0 and user has never had any activity, return initial reputation
        // Otherwise return actual score (which could be 0 if they reached minimum)
        if (rep.score == 0 && rep.tasksCompleted == 0 && rep.tasksRejected == 0 && rep.verificationsPerformed == 0) {
            return INITIAL_REPUTATION;
        }
        return rep.score;
    }

    /**
     * @notice Get full reputation data for a user
     * @param user Address of the user
     * @return score Reputation score
     * @return tasksCompleted Number of completed tasks
     * @return tasksRejected Number of rejected tasks
     * @return verificationsPerformed Number of verifications performed
     * @return accurateVerifications Number of accurate verifications
     */
    function getReputationData(address user) external view returns (
        uint256 score,
        uint256 tasksCompleted,
        uint256 tasksRejected,
        uint256 verificationsPerformed,
        uint256 accurateVerifications
    ) {
        ReputationData storage rep = reputations[user];
        score = rep.score == 0 ? INITIAL_REPUTATION : rep.score;
        tasksCompleted = rep.tasksCompleted;
        tasksRejected = rep.tasksRejected;
        verificationsPerformed = rep.verificationsPerformed;
        accurateVerifications = rep.accurateVerifications;
    }

    /**
     * @notice Check if user has a category badge
     * @param user Address of the user
     * @param category Task category
     * @return hasBadge True if user has the badge
     */
    function hasCategoryBadge(address user, TaskCategory category) external view returns (bool) {
        return reputations[user].categoryStats[category].hasBadge;
    }

    /**
     * @notice Get category statistics for a user
     * @param user Address of the user
     * @param category Task category
     * @return successCount Number of successful tasks
     * @return totalCount Total number of tasks
     * @return hasBadge Whether user has badge
     * @return successRate Success rate percentage
     */
    function getCategoryStats(address user, TaskCategory category) external view returns (
        uint256 successCount,
        uint256 totalCount,
        bool hasBadge,
        uint256 successRate
    ) {
        CategoryStats storage stats = reputations[user].categoryStats[category];
        successCount = stats.successCount;
        totalCount = stats.totalCount;
        hasBadge = stats.hasBadge;
        successRate = totalCount > 0 ? (successCount * 100) / totalCount : 0;
    }

    /**
     * @notice Calculate reputation multiplier for a user
     * @param user Address of the user
     * @param category Task category
     * @return multiplier The multiplier in basis points (10000 = 100%)
     */
    function getReputationMultiplier(address user, TaskCategory category) external view returns (uint256) {
        if (reputations[user].categoryStats[category].hasBadge) {
            return BASIS_POINTS + REPUTATION_MULTIPLIER_PERCENTAGE; // 110%
        }
        return BASIS_POINTS; // 100%
    }

    /**
     * @notice Check if user has priority access (reputation >= 80)
     * @param user Address of the user
     * @return hasPriority True if user has priority access
     */
    function hasPriorityAccess(address user) external view returns (bool) {
        uint256 score = reputations[user].score;
        if (score == 0) {
            score = INITIAL_REPUTATION;
        }
        return score >= HIGH_REPUTATION_THRESHOLD;
    }

    /**
     * @notice Get success rate for a user
     * @param user Address of the user
     * @return successRate Success rate percentage
     */
    function getSuccessRate(address user) external view returns (uint256) {
        ReputationData storage rep = reputations[user];
        uint256 totalTasks = rep.tasksCompleted + rep.tasksRejected;
        
        if (totalTasks == 0) {
            return 0;
        }
        
        return (rep.tasksCompleted * 100) / totalTasks;
    }

    /**
     * @notice Get verification accuracy rate for a user
     * @param user Address of the user
     * @return accuracyRate Accuracy rate percentage
     */
    function getVerificationAccuracy(address user) external view returns (uint256) {
        ReputationData storage rep = reputations[user];
        
        if (rep.verificationsPerformed == 0) {
            return 0;
        }
        
        return (rep.accurateVerifications * 100) / rep.verificationsPerformed;
    }
}
