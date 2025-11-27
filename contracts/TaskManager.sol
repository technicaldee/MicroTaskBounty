// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IAntiFraud {
    function checkAndRecordSubmission(
        address worker,
        uint256 taskId,
        string memory imageHash,
        bytes32 metadataHash
    ) external returns (bool);
}

/**
 * @title TaskManager
 * @notice Manages task lifecycle, creation, assignment, and completion
 */
contract TaskManager is Ownable, ReentrancyGuard {
    // Enums
    enum TaskCategory {
        PHOTO_VERIFICATION,
        LOCATION_CHECK,
        SURVEY,
        PRICE_MONITORING,
        BUSINESS_HOURS
    }

    enum TaskStatus {
        ACTIVE,
        IN_PROGRESS,
        COMPLETED,
        EXPIRED,
        CANCELLED
    }

    // Structs
    struct Location {
        int256 latitude;  // Scaled by 1e6
        int256 longitude; // Scaled by 1e6
        uint256 radius;   // In meters
    }

    struct TaskRequirements {
        uint8 photoCount;
        bool requiresLocation;
        uint256 minReputation;
        TaskCategory requiredBadge;
    }

    struct Task {
        uint256 id;
        address creator;
        string description;
        TaskCategory category;
        uint256 bountyAmount;
        uint256 maxWorkers;
        Location location;
        uint256 deadline;
        TaskStatus status;
        TaskRequirements requirements;
        uint256 submissionCount;
        uint256 verifiedCount;
        uint256 createdAt;
    }

    struct TaskClaim {
        address worker;
        uint256 claimedAt;
        bool completed;
    }

    // Constants
    uint256 public constant MINIMUM_BOUNTY = 0.5 ether; // 0.5 cUSD
    uint256 public constant MAX_ACTIVE_TASKS_PER_WORKER = 3;
    uint256 public constant TASK_COMPLETION_TIMEOUT = 24 hours;

    // State variables
    uint256 private taskIdCounter;
    mapping(uint256 => Task) public tasks;
    mapping(address => uint256[]) public workerActiveTasks;
    mapping(uint256 => mapping(address => TaskClaim)) public taskClaims;
    mapping(uint256 => address[]) public taskWorkers;
    
    address public antiFraudAddress;

    // Events
    event TaskCreated(
        uint256 indexed taskId,
        address indexed creator,
        TaskCategory category,
        uint256 bountyAmount,
        uint256 deadline
    );
    
    event TaskClaimed(
        uint256 indexed taskId,
        address indexed worker,
        uint256 claimedAt
    );
    
    event TaskSubmitted(
        uint256 indexed taskId,
        address indexed worker,
        string ipfsHash,
        uint256 submittedAt
    );
    
    event TaskExpired(
        uint256 indexed taskId,
        uint256 expiredAt
    );

    // Custom errors
    error InsufficientBounty(uint256 provided, uint256 required);
    error TaskNotActive(uint256 taskId);
    error WorkerAlreadyClaimed(address worker, uint256 taskId);
    error MaxActiveTasksReached(address worker);
    error OutsideLocationRadius(int256 requiredLat, int256 requiredLon, int256 providedLat, int256 providedLon);
    error DeadlineExpired(uint256 taskId, uint256 deadline);
    error UnauthorizedAccess(address caller);
    error InvalidTaskId(uint256 taskId);
    error TaskNotClaimed(address worker, uint256 taskId);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Set the AntiFraud contract address
     * @param _antiFraud Address of AntiFraud contract
     */
    function setAntiFraud(address _antiFraud) external onlyOwner {
        require(_antiFraud != address(0), "Invalid address");
        antiFraudAddress = _antiFraud;
    }

    /**
     * @notice Create a new task
     * @param description Task description
     * @param category Task category
     * @param bountyAmount Reward amount in wei
     * @param maxWorkers Maximum number of workers
     * @param location Task location with radius
     * @param deadline Task deadline timestamp
     * @param requirements Task requirements
     * @return taskId The ID of the created task
     */
    function createTask(
        string memory description,
        TaskCategory category,
        uint256 bountyAmount,
        uint256 maxWorkers,
        Location memory location,
        uint256 deadline,
        TaskRequirements memory requirements
    ) external payable returns (uint256) {
        if (bountyAmount < MINIMUM_BOUNTY) {
            revert InsufficientBounty(bountyAmount, MINIMUM_BOUNTY);
        }
        
        if (deadline <= block.timestamp) {
            revert DeadlineExpired(0, deadline);
        }

        uint256 taskId = taskIdCounter++;

        tasks[taskId] = Task({
            id: taskId,
            creator: msg.sender,
            description: description,
            category: category,
            bountyAmount: bountyAmount,
            maxWorkers: maxWorkers,
            location: location,
            deadline: deadline,
            status: TaskStatus.ACTIVE,
            requirements: requirements,
            submissionCount: 0,
            verifiedCount: 0,
            createdAt: block.timestamp
        });

        emit TaskCreated(taskId, msg.sender, category, bountyAmount, deadline);

        return taskId;
    }

    /**
     * @notice Claim a task
     * @param taskId The ID of the task to claim
     * @return success True if claim was successful
     */
    function claimTask(uint256 taskId) external nonReentrant returns (bool) {
        Task storage task = tasks[taskId];
        
        if (task.id != taskId) {
            revert InvalidTaskId(taskId);
        }
        
        if (task.status != TaskStatus.ACTIVE) {
            revert TaskNotActive(taskId);
        }
        
        if (block.timestamp > task.deadline) {
            revert DeadlineExpired(taskId, task.deadline);
        }
        
        if (taskClaims[taskId][msg.sender].worker != address(0)) {
            revert WorkerAlreadyClaimed(msg.sender, taskId);
        }
        
        if (workerActiveTasks[msg.sender].length >= MAX_ACTIVE_TASKS_PER_WORKER) {
            revert MaxActiveTasksReached(msg.sender);
        }

        // Check if max workers reached
        if (taskWorkers[taskId].length >= task.maxWorkers) {
            revert TaskNotActive(taskId);
        }

        // Create claim
        taskClaims[taskId][msg.sender] = TaskClaim({
            worker: msg.sender,
            claimedAt: block.timestamp,
            completed: false
        });

        // Add to worker's active tasks
        workerActiveTasks[msg.sender].push(taskId);
        
        // Add to task workers
        taskWorkers[taskId].push(msg.sender);

        // Update task status if first claim
        if (task.status == TaskStatus.ACTIVE && taskWorkers[taskId].length > 0) {
            task.status = TaskStatus.IN_PROGRESS;
        }

        emit TaskClaimed(taskId, msg.sender, block.timestamp);

        return true;
    }

    /**
     * @notice Submit task completion
     * @param taskId The ID of the task
     * @param ipfsHash IPFS hash of submission data
     * @param submissionLocation Location where task was completed
     * @return submissionId The ID of the submission
     */
    function submitTaskCompletion(
        uint256 taskId,
        string memory ipfsHash,
        Location memory submissionLocation
    ) external nonReentrant returns (uint256) {
        Task storage task = tasks[taskId];
        
        if (task.id != taskId) {
            revert InvalidTaskId(taskId);
        }
        
        if (taskClaims[taskId][msg.sender].worker == address(0)) {
            revert TaskNotClaimed(msg.sender, taskId);
        }
        
        if (block.timestamp > task.deadline) {
            revert DeadlineExpired(taskId, task.deadline);
        }

        // Check if claim has expired (24 hours)
        TaskClaim storage claim = taskClaims[taskId][msg.sender];
        if (block.timestamp > claim.claimedAt + TASK_COMPLETION_TIMEOUT) {
            revert DeadlineExpired(taskId, claim.claimedAt + TASK_COMPLETION_TIMEOUT);
        }

        // Validate location if required
        if (task.requirements.requiresLocation) {
            if (!_isWithinRadius(task.location, submissionLocation)) {
                revert OutsideLocationRadius(
                    task.location.latitude,
                    task.location.longitude,
                    submissionLocation.latitude,
                    submissionLocation.longitude
                );
            }
        }

        // Anti-fraud checks: rate limiting, duplicate detection, metadata validation
        if (antiFraudAddress != address(0)) {
            bytes32 metadataHash = keccak256(abi.encodePacked(
                taskId,
                msg.sender,
                ipfsHash,
                block.timestamp,
                submissionLocation.latitude,
                submissionLocation.longitude
            ));
            
            IAntiFraud(antiFraudAddress).checkAndRecordSubmission(
                msg.sender,
                taskId,
                ipfsHash,
                metadataHash
            );
        }

        // Mark claim as completed
        claim.completed = true;

        // Remove from worker's active tasks
        _removeActiveTask(msg.sender, taskId);

        // Increment submission count
        task.submissionCount++;

        uint256 submissionId = task.submissionCount;

        emit TaskSubmitted(taskId, msg.sender, ipfsHash, block.timestamp);

        return submissionId;
    }

    /**
     * @notice Expire a task that has passed its deadline
     * @param taskId The ID of the task to expire
     * @return success True if expiration was successful
     */
    function expireTask(uint256 taskId) external returns (bool) {
        Task storage task = tasks[taskId];
        
        if (task.id != taskId) {
            revert InvalidTaskId(taskId);
        }
        
        if (block.timestamp <= task.deadline) {
            revert DeadlineExpired(taskId, task.deadline);
        }
        
        if (task.status == TaskStatus.EXPIRED || task.status == TaskStatus.COMPLETED) {
            return false;
        }

        task.status = TaskStatus.EXPIRED;

        emit TaskExpired(taskId, block.timestamp);

        return true;
    }

    /**
     * @notice Check if a location is within the required radius
     * @param required Required location
     * @param provided Provided location
     * @return isWithin True if within radius
     */
    function _isWithinRadius(
        Location memory required,
        Location memory provided
    ) private pure returns (bool) {
        // Simple distance calculation (Haversine would be more accurate but more expensive)
        int256 latDiff = required.latitude - provided.latitude;
        int256 lonDiff = required.longitude - provided.longitude;
        
        // Calculate squared distance (avoiding sqrt for gas efficiency)
        uint256 distanceSquared = uint256(latDiff * latDiff + lonDiff * lonDiff);
        uint256 radiusSquared = required.radius * required.radius;
        
        // Scale factor for lat/lon (1e6)
        uint256 scaleFactor = 1e12; // 1e6 * 1e6
        
        // Approximate: 1 degree ≈ 111km, so we scale accordingly
        // This is a simplified check; production should use proper geospatial calculation
        return distanceSquared <= (radiusSquared * scaleFactor) / (111000 * 111000);
    }

    /**
     * @notice Remove a task from worker's active tasks
     * @param worker Worker address
     * @param taskId Task ID to remove
     */
    function _removeActiveTask(address worker, uint256 taskId) private {
        uint256[] storage activeTasks = workerActiveTasks[worker];
        for (uint256 i = 0; i < activeTasks.length; i++) {
            if (activeTasks[i] == taskId) {
                activeTasks[i] = activeTasks[activeTasks.length - 1];
                activeTasks.pop();
                break;
            }
        }
    }

    /**
     * @notice Get task details
     * @param taskId The ID of the task
     * @return task The task details
     */
    function getTask(uint256 taskId) external view returns (Task memory) {
        return tasks[taskId];
    }

    /**
     * @notice Get worker's active tasks
     * @param worker Worker address
     * @return taskIds Array of active task IDs
     */
    function getWorkerActiveTasks(address worker) external view returns (uint256[] memory) {
        return workerActiveTasks[worker];
    }

    /**
     * @notice Get workers for a task
     * @param taskId Task ID
     * @return workers Array of worker addresses
     */
    function getTaskWorkers(uint256 taskId) external view returns (address[] memory) {
        return taskWorkers[taskId];
    }

    /**
     * @notice Check if worker has claimed a task
     * @param taskId Task ID
     * @param worker Worker address
     * @return claimed True if worker has claimed the task
     */
    function hasWorkerClaimed(uint256 taskId, address worker) external view returns (bool) {
        return taskClaims[taskId][worker].worker != address(0);
    }
}
