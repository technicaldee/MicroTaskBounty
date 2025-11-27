// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AntiFraud
 * @notice Implements anti-fraud mechanisms including rate limiting, stake forfeiture, and duplicate detection
 */
contract AntiFraud is Ownable {
    // Structs
    struct SubmissionRecord {
        uint256 timestamp;
        string imageHash;
        bytes32 metadataHash;
    }

    struct DailySubmissionCount {
        uint256 date; // Day timestamp (rounded to start of day)
        uint256 count;
    }

    // Constants
    uint256 public constant MAX_SUBMISSIONS_PER_DAY = 20;
    uint256 public constant DUPLICATE_SIMILARITY_THRESHOLD = 95; // 95%
    uint256 public constant ONE_DAY = 1 days;

    // State variables
    mapping(address => DailySubmissionCount) public workerDailySubmissions;
    mapping(address => SubmissionRecord[]) public workerSubmissions;
    mapping(string => bool) public usedImageHashes;
    mapping(string => address) public imageHashToWorker;
    mapping(address => uint256) public workerStakes;
    mapping(address => bool) public blacklistedWorkers;
    
    address public verificationContractAddress;
    address public taskManagerAddress;

    // Events
    event SubmissionRecorded(
        address indexed worker,
        uint256 indexed taskId,
        string imageHash,
        uint256 timestamp
    );
    
    event RateLimitExceeded(
        address indexed worker,
        uint256 currentCount,
        uint256 maxAllowed
    );
    
    event DuplicateDetected(
        address indexed worker,
        string imageHash,
        address originalWorker
    );
    
    event StakeForfeited(
        address indexed worker,
        uint256 amount,
        string reason
    );
    
    event WorkerBlacklisted(
        address indexed worker,
        string reason
    );
    
    event WorkerUnblacklisted(
        address indexed worker
    );

    // Custom errors
    error RateLimitExceededError(address worker, uint256 currentCount);
    error DuplicateImageDetected(string imageHash, address originalWorker);
    error InvalidMetadata(string reason);
    error WorkerBlacklistedError(address worker);
    error UnauthorizedCaller(address caller);
    error InvalidAddress(address addr);
    error NoStakeToForfeit(address worker);

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

    modifier notBlacklisted(address worker) {
        if (blacklistedWorkers[worker]) {
            revert WorkerBlacklistedError(worker);
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
    }

    /**
     * @notice Check and record submission for rate limiting
     * @param worker Address of the worker
     * @param taskId ID of the task
     * @param imageHash Hash of the submitted image
     * @param metadataHash Hash of the metadata
     * @return allowed True if submission is allowed
     */
    function checkAndRecordSubmission(
        address worker,
        uint256 taskId,
        string memory imageHash,
        bytes32 metadataHash
    ) external onlyAuthorizedContracts notBlacklisted(worker) returns (bool) {
        // Check rate limit
        _checkRateLimit(worker);

        // Check for duplicate image
        _checkDuplicateImage(worker, imageHash);

        // Validate metadata
        _validateMetadata(metadataHash);

        // Record submission
        _recordSubmission(worker, taskId, imageHash, metadataHash);

        return true;
    }

    /**
     * @notice Check if worker has exceeded daily submission limit
     * @param worker Address of the worker
     */
    function _checkRateLimit(address worker) private {
        uint256 today = _getCurrentDay();
        DailySubmissionCount storage dailyCount = workerDailySubmissions[worker];

        // Reset counter if it's a new day
        if (dailyCount.date != today) {
            dailyCount.date = today;
            dailyCount.count = 0;
        }

        // Check if limit exceeded
        if (dailyCount.count >= MAX_SUBMISSIONS_PER_DAY) {
            emit RateLimitExceeded(worker, dailyCount.count, MAX_SUBMISSIONS_PER_DAY);
            revert RateLimitExceededError(worker, dailyCount.count);
        }

        // Increment counter
        dailyCount.count++;
    }

    /**
     * @notice Check for duplicate image submission
     * @param worker Address of the worker
     * @param imageHash Hash of the image
     */
    function _checkDuplicateImage(address worker, string memory imageHash) private {
        if (usedImageHashes[imageHash]) {
            address originalWorker = imageHashToWorker[imageHash];
            emit DuplicateDetected(worker, imageHash, originalWorker);
            revert DuplicateImageDetected(imageHash, originalWorker);
        }
    }

    /**
     * @notice Validate submission metadata
     * @param metadataHash Hash of the metadata
     */
    function _validateMetadata(bytes32 metadataHash) private pure {
        // Check that metadata hash is not empty
        if (metadataHash == bytes32(0)) {
            revert InvalidMetadata("Metadata hash cannot be empty");
        }

        // Additional validation logic can be added here
        // For example: timestamp validation, location validation, etc.
    }

    /**
     * @notice Record a submission
     * @param worker Address of the worker
     * @param taskId ID of the task
     * @param imageHash Hash of the image
     * @param metadataHash Hash of the metadata
     */
    function _recordSubmission(
        address worker,
        uint256 taskId,
        string memory imageHash,
        bytes32 metadataHash
    ) private {
        // Record submission
        workerSubmissions[worker].push(SubmissionRecord({
            timestamp: block.timestamp,
            imageHash: imageHash,
            metadataHash: metadataHash
        }));

        // Mark image hash as used
        usedImageHashes[imageHash] = true;
        imageHashToWorker[imageHash] = worker;

        emit SubmissionRecorded(worker, taskId, imageHash, block.timestamp);
    }

    /**
     * @notice Forfeit worker's stake on rejected submission
     * @param worker Address of the worker
     * @param reason Reason for forfeiture
     */
    function forfeitStake(
        address worker,
        string memory reason
    ) external onlyVerificationContract {
        uint256 stakeAmount = workerStakes[worker];
        
        if (stakeAmount == 0) {
            revert NoStakeToForfeit(worker);
        }

        // Reset stake
        workerStakes[worker] = 0;

        emit StakeForfeited(worker, stakeAmount, reason);

        // Consider blacklisting if multiple forfeitures
        // This is a simplified version; production should track forfeiture count
    }

    /**
     * @notice Blacklist a worker
     * @param worker Address of the worker
     * @param reason Reason for blacklisting
     */
    function blacklistWorker(address worker, string memory reason) external onlyOwner {
        blacklistedWorkers[worker] = true;
        emit WorkerBlacklisted(worker, reason);
    }

    /**
     * @notice Remove worker from blacklist
     * @param worker Address of the worker
     */
    function unblacklistWorker(address worker) external onlyOwner {
        blacklistedWorkers[worker] = false;
        emit WorkerUnblacklisted(worker);
    }

    /**
     * @notice Check if image hash is similar to existing submissions
     * @param imageHash Hash of the image to check
     * @param similarityThreshold Similarity threshold percentage
     * @return isSimilar True if similar image found
     * @return originalWorker Address of worker who submitted similar image
     */
    function checkImageSimilarity(
        string memory imageHash,
        uint256 similarityThreshold
    ) external view returns (bool isSimilar, address originalWorker) {
        // This is a simplified version
        // In production, this would use perceptual hashing or other similarity algorithms
        
        if (usedImageHashes[imageHash]) {
            return (true, imageHashToWorker[imageHash]);
        }
        
        // For now, we only check exact matches
        // Advanced similarity checking would require off-chain computation
        // and oracle integration
        
        return (false, address(0));
    }

    /**
     * @notice Get current day timestamp (rounded to start of day)
     * @return dayTimestamp Start of current day
     */
    function _getCurrentDay() private view returns (uint256) {
        return (block.timestamp / ONE_DAY) * ONE_DAY;
    }

    /**
     * @notice Get worker's submission count for today
     * @param worker Address of the worker
     * @return count Number of submissions today
     */
    function getTodaySubmissionCount(address worker) external view returns (uint256) {
        uint256 today = _getCurrentDay();
        DailySubmissionCount storage dailyCount = workerDailySubmissions[worker];
        
        if (dailyCount.date == today) {
            return dailyCount.count;
        }
        
        return 0;
    }

    /**
     * @notice Get all submissions for a worker
     * @param worker Address of the worker
     * @return submissions Array of submission records
     */
    function getWorkerSubmissions(address worker) external view returns (SubmissionRecord[] memory) {
        return workerSubmissions[worker];
    }

    /**
     * @notice Check if worker is blacklisted
     * @param worker Address of the worker
     * @return isBlacklisted True if worker is blacklisted
     */
    function isWorkerBlacklisted(address worker) external view returns (bool) {
        return blacklistedWorkers[worker];
    }

    /**
     * @notice Check if image hash has been used
     * @param imageHash Hash of the image
     * @return isUsed True if image hash has been used
     */
    function isImageHashUsed(string memory imageHash) external view returns (bool) {
        return usedImageHashes[imageHash];
    }

    /**
     * @notice Get worker who submitted a specific image hash
     * @param imageHash Hash of the image
     * @return worker Address of the worker
     */
    function getImageHashWorker(string memory imageHash) external view returns (address) {
        return imageHashToWorker[imageHash];
    }

    /**
     * @notice Validate timestamp is recent and not in future
     * @param timestamp Timestamp to validate
     * @param maxAge Maximum age in seconds
     * @return isValid True if timestamp is valid
     */
    function validateTimestamp(uint256 timestamp, uint256 maxAge) external view returns (bool) {
        // Check timestamp is not in the future
        if (timestamp > block.timestamp) {
            return false;
        }

        // Check timestamp is not too old
        if (block.timestamp - timestamp > maxAge) {
            return false;
        }

        return true;
    }
}
