// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BountyPool
 * @notice Manages escrow of funds, reward distribution, and platform fees
 */
contract BountyPool is Ownable, ReentrancyGuard {
    // Constants
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 250; // 2.5% (basis points)
    uint256 public constant EXPIRED_TASK_FEE_PERCENTAGE = 500; // 5% (basis points)
    uint256 public constant BASIS_POINTS = 10000; // 100%

    // State variables
    mapping(uint256 => uint256) public taskBounties;
    uint256 public accumulatedFees;
    address public taskManagerAddress;
    address public verificationContractAddress;

    // Events
    event BountyDeposited(uint256 indexed taskId, address indexed creator, uint256 amount);
    event RewardDistributed(uint256 indexed taskId, address indexed worker, uint256 amount, uint256 fee);
    event BountyRefunded(uint256 indexed taskId, address indexed creator, uint256 amount, uint256 fee);
    event PlatformFeesWithdrawn(address indexed owner, uint256 amount);
    event TaskManagerUpdated(address indexed newTaskManager);
    event VerificationContractUpdated(address indexed newVerificationContract);

    // Custom errors
    error InsufficientBounty(uint256 taskId, uint256 required, uint256 available);
    error UnauthorizedCaller(address caller);
    error TransferFailed(address recipient, uint256 amount);
    error InvalidAddress(address addr);
    error NoFeesToWithdraw();

    // Modifiers
    modifier onlyTaskManager() {
        if (msg.sender != taskManagerAddress) {
            revert UnauthorizedCaller(msg.sender);
        }
        _;
    }

    modifier onlyVerificationContract() {
        if (msg.sender != verificationContractAddress) {
            revert UnauthorizedCaller(msg.sender);
        }
        _;
    }

    constructor() Ownable(msg.sender) {}

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
     * @notice Deposit bounty for a task
     * @param taskId The ID of the task
     */
    function depositBounty(uint256 taskId) external payable onlyTaskManager {
        taskBounties[taskId] += msg.value;
        emit BountyDeposited(taskId, tx.origin, msg.value);
    }

    /**
     * @notice Distribute reward to a worker
     * @param taskId The ID of the task
     * @param worker Address of the worker
     * @param amount Amount to distribute
     */
    function distributeReward(
        uint256 taskId,
        address worker,
        uint256 amount
    ) external nonReentrant onlyVerificationContract {
        if (taskBounties[taskId] < amount) {
            revert InsufficientBounty(taskId, amount, taskBounties[taskId]);
        }

        // Calculate platform fee (2.5%)
        uint256 platformFee = (amount * PLATFORM_FEE_PERCENTAGE) / BASIS_POINTS;
        uint256 workerReward = amount - platformFee;

        // Update bounty balance
        taskBounties[taskId] -= amount;
        
        // Accumulate platform fee
        accumulatedFees += platformFee;

        // Transfer reward to worker
        (bool success, ) = payable(worker).call{value: workerReward}("");
        if (!success) {
            revert TransferFailed(worker, workerReward);
        }

        emit RewardDistributed(taskId, worker, workerReward, platformFee);
    }

    /**
     * @notice Refund bounty for an expired task
     * @param taskId The ID of the task
     * @param creator Address of the task creator
     * @param amount Amount to refund
     */
    function refundBounty(
        uint256 taskId,
        address creator,
        uint256 amount
    ) external nonReentrant onlyTaskManager {
        if (taskBounties[taskId] < amount) {
            revert InsufficientBounty(taskId, amount, taskBounties[taskId]);
        }

        // Calculate platform fee for expired task (5%)
        uint256 platformFee = (amount * EXPIRED_TASK_FEE_PERCENTAGE) / BASIS_POINTS;
        uint256 refundAmount = amount - platformFee;

        // Update bounty balance
        taskBounties[taskId] -= amount;
        
        // Accumulate platform fee
        accumulatedFees += platformFee;

        // Transfer refund to creator
        (bool success, ) = payable(creator).call{value: refundAmount}("");
        if (!success) {
            revert TransferFailed(creator, refundAmount);
        }

        emit BountyRefunded(taskId, creator, refundAmount, platformFee);
    }

    /**
     * @notice Withdraw accumulated platform fees
     */
    function withdrawPlatformFees() external nonReentrant onlyOwner {
        uint256 amount = accumulatedFees;
        
        if (amount == 0) {
            revert NoFeesToWithdraw();
        }

        accumulatedFees = 0;

        (bool success, ) = payable(owner()).call{value: amount}("");
        if (!success) {
            revert TransferFailed(owner(), amount);
        }

        emit PlatformFeesWithdrawn(owner(), amount);
    }

    /**
     * @notice Get bounty amount for a task
     * @param taskId The ID of the task
     * @return amount The bounty amount
     */
    function getTaskBounty(uint256 taskId) external view returns (uint256) {
        return taskBounties[taskId];
    }

    /**
     * @notice Get accumulated platform fees
     * @return amount The accumulated fees
     */
    function getAccumulatedFees() external view returns (uint256) {
        return accumulatedFees;
    }

    /**
     * @notice Calculate platform fee for a given amount
     * @param amount The amount to calculate fee for
     * @return fee The platform fee
     */
    function calculatePlatformFee(uint256 amount) external pure returns (uint256) {
        return (amount * PLATFORM_FEE_PERCENTAGE) / BASIS_POINTS;
    }

    /**
     * @notice Calculate expired task fee for a given amount
     * @param amount The amount to calculate fee for
     * @return fee The expired task fee
     */
    function calculateExpiredTaskFee(uint256 amount) external pure returns (uint256) {
        return (amount * EXPIRED_TASK_FEE_PERCENTAGE) / BASIS_POINTS;
    }

    /**
     * @notice Receive function to accept ETH
     */
    receive() external payable {}
}
