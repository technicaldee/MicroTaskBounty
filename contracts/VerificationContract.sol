// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IBountyPool {
    function distributeReward(uint256 taskId, address worker, uint256 amount) external;
}

interface IReputationContract {
    function updateWorkerReputation(address worker, bool successful) external;
    function updateVerifierReputation(address verifier, bool accurateVote) external;
}

interface IAntiFraud {
    function forfeitStake(address worker, string memory reason) external;
}

/**
 * @title VerificationContract
 * @notice Implements peer verification consensus mechanism
 */
contract VerificationContract is Ownable, ReentrancyGuard {
    // Enums
    enum VerificationStatus {
        PENDING,
        VERIFIED,
        REJECTED,
        DISPUTED
    }

    // Structs
    struct Location {
        int256 latitude;
        int256 longitude;
        uint256 radius;
    }

    struct Submission {
        uint256 id;
        uint256 taskId;
        address worker;
        string ipfsHash;
        uint256 timestamp;
        Location location;
        VerificationStatus status;
        uint256 approvalCount;
        uint256 rejectionCount;
        uint256 totalVotes;
        uint256 bountyAmount;
        bool rewardDistributed;
    }

    struct Vote {
        bool hasVoted;
        bool approved;
        uint256 timestamp;
        uint256 stake;
    }

    // Constants
    uint256 public constant VERIFICATION_STAKE = 0.1 ether; // 0.1 cUSD
    uint256 public constant CONSENSUS_THRESHOLD = 3;
    uint256 public constant MAX_VERIFIERS = 7;
    uint256 public constant VERIFICATION_REWARD_PERCENTAGE = 1000; // 10% (basis points)
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant REWARD_DISTRIBUTION_DELAY = 5 minutes;

    // State variables
    uint256 private submissionIdCounter;
    mapping(uint256 => Submission) public submissions;
    mapping(uint256 => mapping(address => Vote)) public verificationVotes;
    mapping(uint256 => address[]) public submissionVerifiers;
    mapping(uint256 => uint256) public consensusReachedAt;
    
    address public bountyPoolAddress;
    address public reputationContractAddress;
    address public taskManagerAddress;
    address public antiFraudAddress;

    // Events
    event SubmissionCreated(
        uint256 indexed submissionId,
        uint256 indexed taskId,
        address indexed worker,
        string ipfsHash
    );
    
    event VerificationStaked(
        uint256 indexed submissionId,
        address indexed verifier,
        uint256 amount
    );
    
    event VoteSubmitted(
        uint256 indexed submissionId,
        address indexed verifier,
        bool approved
    );
    
    event ConsensusReached(
        uint256 indexed submissionId,
        VerificationStatus status,
        uint256 timestamp
    );
    
    event RewardDistributed(
        uint256 indexed submissionId,
        address indexed worker,
        uint256 amount
    );
    
    event VerificationRewardsDistributed(
        uint256 indexed submissionId,
        uint256 totalReward
    );
    
    event DisputeEscalated(
        uint256 indexed submissionId,
        uint256 currentVotes
    );

    // Custom errors
    error InsufficientStake(uint256 provided, uint256 required);
    error AlreadyVoted(address verifier, uint256 submissionId);
    error SubmissionNotFound(uint256 submissionId);
    error AlreadyVerified(uint256 submissionId);
    error ConsensusNotReached(uint256 submissionId);
    error MaxVerifiersReached(uint256 submissionId);
    error RewardAlreadyDistributed(uint256 submissionId);
    error RewardDistributionTooEarly(uint256 submissionId, uint256 timeRemaining);
    error UnauthorizedCaller(address caller);
    error InvalidAddress(address addr);
    error WorkerCannotVerifyOwnSubmission(address worker);

    // Modifiers
    modifier onlyTaskManager() {
        if (msg.sender != taskManagerAddress) {
            revert UnauthorizedCaller(msg.sender);
        }
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Set the BountyPool contract address
     * @param _bountyPool Address of BountyPool contract
     */
    function setBountyPool(address _bountyPool) external onlyOwner {
        if (_bountyPool == address(0)) {
            revert InvalidAddress(_bountyPool);
        }
        bountyPoolAddress = _bountyPool;
    }

    /**
     * @notice Set the ReputationContract address
     * @param _reputationContract Address of ReputationContract
     */
    function setReputationContract(address _reputationContract) external onlyOwner {
        if (_reputationContract == address(0)) {
            revert InvalidAddress(_reputationContract);
        }
        reputationContractAddress = _reputationContract;
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
     * @notice Set the AntiFraud contract address
     * @param _antiFraud Address of AntiFraud contract
     */
    function setAntiFraud(address _antiFraud) external onlyOwner {
        if (_antiFraud == address(0)) {
            revert InvalidAddress(_antiFraud);
        }
        antiFraudAddress = _antiFraud;
    }

    /**
     * @notice Create a new submission
     * @param taskId The ID of the task
     * @param worker Address of the worker
     * @param ipfsHash IPFS hash of submission data
     * @param location Location of submission
     * @param bountyAmount Bounty amount for the task
     * @return submissionId The ID of the created submission
     */
    function createSubmission(
        uint256 taskId,
        address worker,
        string memory ipfsHash,
        Location memory location,
        uint256 bountyAmount
    ) external onlyTaskManager returns (uint256) {
        uint256 submissionId = submissionIdCounter++;

        submissions[submissionId] = Submission({
            id: submissionId,
            taskId: taskId,
            worker: worker,
            ipfsHash: ipfsHash,
            timestamp: block.timestamp,
            location: location,
            status: VerificationStatus.PENDING,
            approvalCount: 0,
            rejectionCount: 0,
            totalVotes: 0,
            bountyAmount: bountyAmount,
            rewardDistributed: false
        });

        emit SubmissionCreated(submissionId, taskId, worker, ipfsHash);

        return submissionId;
    }

    /**
     * @notice Stake for verification
     * @param submissionId The ID of the submission to verify
     */
    function stakeForVerification(uint256 submissionId) external payable nonReentrant {
        Submission storage submission = submissions[submissionId];
        
        if (submission.id != submissionId) {
            revert SubmissionNotFound(submissionId);
        }
        
        if (submission.status != VerificationStatus.PENDING && submission.status != VerificationStatus.DISPUTED) {
            revert AlreadyVerified(submissionId);
        }
        
        if (verificationVotes[submissionId][msg.sender].hasVoted) {
            revert AlreadyVoted(msg.sender, submissionId);
        }
        
        if (submissionVerifiers[submissionId].length >= MAX_VERIFIERS) {
            revert MaxVerifiersReached(submissionId);
        }
        
        if (msg.sender == submission.worker) {
            revert WorkerCannotVerifyOwnSubmission(msg.sender);
        }
        
        if (msg.value < VERIFICATION_STAKE) {
            revert InsufficientStake(msg.value, VERIFICATION_STAKE);
        }

        // Record stake
        verificationVotes[submissionId][msg.sender].stake = msg.value;
        submissionVerifiers[submissionId].push(msg.sender);

        emit VerificationStaked(submissionId, msg.sender, msg.value);
    }

    /**
     * @notice Submit verification vote
     * @param submissionId The ID of the submission
     * @param approved Whether the submission is approved
     * @param feedback Optional feedback string
     */
    function submitVerification(
        uint256 submissionId,
        bool approved,
        string memory feedback
    ) external nonReentrant {
        Submission storage submission = submissions[submissionId];
        Vote storage vote = verificationVotes[submissionId][msg.sender];
        
        if (submission.id != submissionId) {
            revert SubmissionNotFound(submissionId);
        }
        
        if (vote.stake == 0) {
            revert InsufficientStake(0, VERIFICATION_STAKE);
        }
        
        if (vote.hasVoted) {
            revert AlreadyVoted(msg.sender, submissionId);
        }

        // Record vote
        vote.hasVoted = true;
        vote.approved = approved;
        vote.timestamp = block.timestamp;

        // Update counts
        submission.totalVotes++;
        if (approved) {
            submission.approvalCount++;
        } else {
            submission.rejectionCount++;
        }

        emit VoteSubmitted(submissionId, msg.sender, approved);

        // Check for consensus
        _checkConsensus(submissionId);
    }

    /**
     * @notice Check if consensus has been reached
     * @param submissionId The ID of the submission
     */
    function _checkConsensus(uint256 submissionId) private {
        Submission storage submission = submissions[submissionId];

        // Check if consensus threshold reached
        if (submission.approvalCount >= CONSENSUS_THRESHOLD) {
            submission.status = VerificationStatus.VERIFIED;
            consensusReachedAt[submissionId] = block.timestamp;
            emit ConsensusReached(submissionId, VerificationStatus.VERIFIED, block.timestamp);
            
            // Update worker reputation
            if (reputationContractAddress != address(0)) {
                IReputationContract(reputationContractAddress).updateWorkerReputation(
                    submission.worker,
                    true
                );
            }
        } else if (submission.rejectionCount >= CONSENSUS_THRESHOLD) {
            submission.status = VerificationStatus.REJECTED;
            consensusReachedAt[submissionId] = block.timestamp;
            emit ConsensusReached(submissionId, VerificationStatus.REJECTED, block.timestamp);
            
            // Update worker reputation
            if (reputationContractAddress != address(0)) {
                IReputationContract(reputationContractAddress).updateWorkerReputation(
                    submission.worker,
                    false
                );
            }
            
            // Forfeit worker stake on rejected submission
            if (antiFraudAddress != address(0)) {
                IAntiFraud(antiFraudAddress).forfeitStake(
                    submission.worker,
                    "Submission rejected by consensus"
                );
            }
        } else if (submission.totalVotes >= MAX_VERIFIERS) {
            // Escalation: max verifiers reached without consensus
            submission.status = VerificationStatus.DISPUTED;
            emit DisputeEscalated(submissionId, submission.totalVotes);
        }
    }

    /**
     * @notice Distribute rewards after consensus
     * @param submissionId The ID of the submission
     */
    function distributeVerificationRewards(uint256 submissionId) external nonReentrant {
        Submission storage submission = submissions[submissionId];
        
        if (submission.id != submissionId) {
            revert SubmissionNotFound(submissionId);
        }
        
        if (submission.status != VerificationStatus.VERIFIED && submission.status != VerificationStatus.REJECTED) {
            revert ConsensusNotReached(submissionId);
        }
        
        if (submission.rewardDistributed) {
            revert RewardAlreadyDistributed(submissionId);
        }
        
        uint256 timeSinceConsensus = block.timestamp - consensusReachedAt[submissionId];
        if (timeSinceConsensus < REWARD_DISTRIBUTION_DELAY) {
            revert RewardDistributionTooEarly(submissionId, REWARD_DISTRIBUTION_DELAY - timeSinceConsensus);
        }

        submission.rewardDistributed = true;

        // Distribute worker reward if verified
        if (submission.status == VerificationStatus.VERIFIED && bountyPoolAddress != address(0)) {
            IBountyPool(bountyPoolAddress).distributeReward(
                submission.taskId,
                submission.worker,
                submission.bountyAmount
            );
            emit RewardDistributed(submissionId, submission.worker, submission.bountyAmount);
        }

        // Distribute verification rewards
        _distributeVerifierRewards(submissionId);
    }

    /**
     * @notice Distribute rewards to verifiers
     * @param submissionId The ID of the submission
     */
    function _distributeVerifierRewards(uint256 submissionId) private {
        Submission storage submission = submissions[submissionId];
        address[] memory verifiers = submissionVerifiers[submissionId];
        
        uint256 totalReward = 0;
        bool consensusApproved = submission.status == VerificationStatus.VERIFIED;

        for (uint256 i = 0; i < verifiers.length; i++) {
            address verifier = verifiers[i];
            Vote storage vote = verificationVotes[submissionId][verifier];
            
            if (!vote.hasVoted) continue;

            // Reward verifiers who voted with consensus
            bool votedWithConsensus = vote.approved == consensusApproved;
            
            if (votedWithConsensus) {
                // Return stake + 10% reward
                uint256 reward = vote.stake + (vote.stake * VERIFICATION_REWARD_PERCENTAGE / BASIS_POINTS);
                totalReward += reward;
                
                (bool success, ) = payable(verifier).call{value: reward}("");
                require(success, "Verifier reward transfer failed");
                
                // Update verifier reputation
                if (reputationContractAddress != address(0)) {
                    IReputationContract(reputationContractAddress).updateVerifierReputation(
                        verifier,
                        true
                    );
                }
            } else {
                // Forfeit stake for incorrect vote
                // Stake remains in contract as penalty
                
                // Update verifier reputation
                if (reputationContractAddress != address(0)) {
                    IReputationContract(reputationContractAddress).updateVerifierReputation(
                        verifier,
                        false
                    );
                }
            }
        }

        emit VerificationRewardsDistributed(submissionId, totalReward);
    }

    /**
     * @notice Get submission details
     * @param submissionId The ID of the submission
     * @return submission The submission details
     */
    function getSubmission(uint256 submissionId) external view returns (Submission memory) {
        return submissions[submissionId];
    }

    /**
     * @notice Get verifiers for a submission
     * @param submissionId The ID of the submission
     * @return verifiers Array of verifier addresses
     */
    function getSubmissionVerifiers(uint256 submissionId) external view returns (address[] memory) {
        return submissionVerifiers[submissionId];
    }

    /**
     * @notice Get vote details for a verifier
     * @param submissionId The ID of the submission
     * @param verifier Address of the verifier
     * @return vote The vote details
     */
    function getVote(uint256 submissionId, address verifier) external view returns (Vote memory) {
        return verificationVotes[submissionId][verifier];
    }

    /**
     * @notice Check if consensus has been reached
     * @param submissionId The ID of the submission
     * @return reached True if consensus reached
     */
    function hasConsensus(uint256 submissionId) external view returns (bool) {
        Submission memory submission = submissions[submissionId];
        return submission.status == VerificationStatus.VERIFIED || 
               submission.status == VerificationStatus.REJECTED;
    }

    /**
     * @notice Receive function to accept ETH
     */
    receive() external payable {}
}
