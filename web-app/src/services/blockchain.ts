import { ethers } from 'ethers';
import { TaskManager } from '../../typechain-types/contracts/TaskManager';
import { TaskManager__factory } from '../../typechain-types/factories/contracts/TaskManager__factory';
import { BountyPool } from '../../typechain-types/contracts/BountyPool';
import { BountyPool__factory } from '../../typechain-types/factories/contracts/BountyPool__factory';
import { ReputationContract } from '../../typechain-types/contracts/ReputationContract';
import { ReputationContract__factory } from '../../typechain-types/factories/contracts/ReputationContract__factory';
import { VerificationContract } from '../../typechain-types/contracts/VerificationContract.sol/VerificationContract';
import { VerificationContract__factory } from '../../typechain-types/factories/contracts/VerificationContract.sol/VerificationContract__factory';
import { minipayService } from './minipay';

const ALFAJORES_RPC = 'https://alfajores-forno.celo-testnet.org';
const CELO_RPC = 'https://forno.celo.org';

export interface ContractAddresses {
  taskManager: string;
  bountyPool: string;
  reputationContract: string;
  verificationContract: string;
}

class BlockchainService {
  private provider: ethers.JsonRpcProvider | ethers.BrowserProvider | null = null;
  private signer: ethers.Wallet | ethers.JsonRpcSigner | null = null;
  private addresses: ContractAddresses | null = null;
  private taskManager: TaskManager | null = null;
  private bountyPool: BountyPool | null = null;
  private reputationContract: ReputationContract | null = null;
  private verificationContract: VerificationContract | null = null;

  async initialize(rpcUrl?: string, addresses?: ContractAddresses) {
    // If no RPC URL provided, we'll detect it from deployments.json in loadContracts
    if (rpcUrl) {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
    }
    
    if (addresses) {
      this.addresses = addresses;
    }
    
    // Always try to load contracts (will load from deployments.json if addresses not set)
    await this.loadContracts();
  }

  async connectWallet(privateKey?: string) {
    if (privateKey) {
      if (!this.provider) {
        throw new Error('Blockchain service not initialized');
      }
      this.signer = new ethers.Wallet(privateKey, this.provider);
      await this.loadContracts();
    } else {
      // For web, use MiniPay/MetaMask
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const ethereum = (window as any).ethereum;
        const provider = new ethers.BrowserProvider(ethereum);
        
        // Check if already connected
        try {
          const accounts = await ethereum.request({ method: 'eth_accounts' });
          if (accounts.length === 0) {
            // Request connection (MiniPay will auto-approve or prompt)
            await ethereum.request({ method: 'eth_requestAccounts' });
          }
        } catch (error) {
          // User rejected or not available
          throw new Error('Wallet connection rejected or not available');
        }
        
        this.signer = (await provider.getSigner()) as ethers.JsonRpcSigner;
        this.provider = provider;
        await this.loadContracts();
      } else {
        throw new Error('Please install MiniPay or MetaMask');
      }
    }
  }
  
  // Check if MiniPay/MetaMask is available
  isWalletAvailable(): boolean {
    return typeof window !== 'undefined' && !!(window as any).ethereum;
  }

  // Check if we're in MiniPay specifically
  isMiniPay(): boolean {
    if (typeof window === 'undefined') return false;
    const ethereum = (window as any).ethereum;
    return !!ethereum && ethereum.isMiniPay === true;
  }

  async loadContracts() {
    // Try to load from deployments.json if addresses not set
    if (!this.addresses) {
      try {
        const response = await fetch('/deployments.json');
        if (response.ok) {
          const deployment = await response.json();
          this.addresses = {
            taskManager: deployment.contracts.TaskManager,
            bountyPool: deployment.contracts.BountyPool,
            reputationContract: deployment.contracts.ReputationContract,
            verificationContract: deployment.contracts.VerificationContract,
          };
          
          // Set the correct RPC based on the deployment network
          const chainId = deployment.chainId ? parseInt(deployment.chainId) : null;
          if (chainId === 42220) {
            // Celo mainnet
            this.provider = new ethers.JsonRpcProvider(CELO_RPC);
          } else if (chainId === 44787) {
            // Alfajores testnet
            this.provider = new ethers.JsonRpcProvider(ALFAJORES_RPC);
          }
        }
      } catch (error) {
        console.warn('Could not load deployments.json:', error);
      }
    }
    
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }
    
    if (!this.addresses) {
      throw new Error('Contract addresses not set. Please deploy contracts and set addresses.');
    }

    // Use signer if available, otherwise use provider
    const contractSigner = this.signer || this.provider;

    this.taskManager = TaskManager__factory.connect(
      this.addresses.taskManager,
      contractSigner
    );

    this.bountyPool = BountyPool__factory.connect(
      this.addresses.bountyPool,
      contractSigner
    );

    this.reputationContract = ReputationContract__factory.connect(
      this.addresses.reputationContract,
      contractSigner
    );

    this.verificationContract = VerificationContract__factory.connect(
      this.addresses.verificationContract,
      contractSigner
    );
  }

  setAddresses(addresses: ContractAddresses) {
    this.addresses = addresses;
    if (this.provider) {
      this.loadContracts().catch(console.error);
    }
  }

  getTaskManager(): TaskManager {
    if (!this.taskManager) {
      throw new Error('TaskManager contract not loaded. Please set contract addresses first.');
    }
    return this.taskManager;
  }

  async getAllTasks(): Promise<any[]> {
    const taskManager = this.getTaskManager();
    
    // Query TaskCreated events to get all task IDs
    const filter = taskManager.filters.TaskCreated();
    const events = await taskManager.queryFilter(filter);
    
    // Fetch task details for each task ID
    const tasks = await Promise.all(
      events.map(async (event) => {
        const taskId = Number(event.args[0]);
        try {
          const task = await taskManager.getTask(taskId);
          return {
            id: taskId,
            creator: task.creator,
            description: task.description,
            category: Number(task.category),
            bountyAmount: task.bountyAmount.toString(),
            maxWorkers: Number(task.maxWorkers),
            location: {
              latitude: Number(task.location.latitude) / 1e6,
              longitude: Number(task.location.longitude) / 1e6,
              radius: Number(task.location.radius),
            },
            deadline: Number(task.deadline),
            status: Number(task.status),
            submissionCount: Number(task.submissionCount),
            verifiedCount: Number(task.verifiedCount),
            createdAt: Number(task.createdAt),
          };
        } catch (error) {
          console.error(`Failed to fetch task ${taskId}:`, error);
          return null;
        }
      })
    );
    
    // Filter out nulls and expired tasks
    return tasks
      .filter((task) => task !== null)
      .filter((task) => task!.status === 0 || task!.status === 1) // ACTIVE or IN_PROGRESS
      .sort((a, b) => Number(b!.deadline) - Number(a!.deadline)); // Sort by deadline descending
  }

  async getWorkerActiveTasks(workerAddress: string): Promise<number[]> {
    try {
      if (!workerAddress || !ethers.isAddress(workerAddress)) {
        return [];
      }
      
      const taskManager = this.getTaskManager();
      
      // Try to call the method - handle case where it might not exist or return empty
      try {
        const activeTasks = await taskManager.getWorkerActiveTasks(workerAddress);
        if (!activeTasks || activeTasks.length === 0) {
          return [];
        }
        return activeTasks.map((id) => Number(id));
      } catch (error: any) {
        // If method doesn't exist or returns empty data, return empty array
        if (error.code === 'BAD_DATA' || error.message?.includes('could not decode')) {
          console.warn('getWorkerActiveTasks returned empty data for address:', workerAddress);
          return [];
        }
        throw error;
      }
    } catch (error) {
      console.error('Failed to get worker active tasks:', error);
      return [];
    }
  }

  async createTask(
    description: string,
    category: number,
    bountyAmount: bigint,
    currency: 'CELO' | 'cUSD',
    maxWorkers: number,
    location: { latitude: bigint; longitude: bigint; radius: bigint },
    deadline: number,
    requirements: { photoCount: number; requiresLocation: boolean; minReputation: number; requiredBadge: number }
  ): Promise<bigint> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    const address = await this.signer.getAddress();
    const taskManager = this.getTaskManager();
    const bountyPool = this.getBountyPool();
    const bountyPoolAddress = await bountyPool.getAddress();
    
    // Handle cUSD payments
    if (currency === 'cUSD') {
      // Check cUSD balance
      if (!minipayService.isAvailable()) {
        throw new Error('MiniPay not available. cUSD payments require MiniPay or MetaMask.');
      }
      
      await minipayService.initialize();
      const cusdBalance = await minipayService.getTokenBalance('cUSD');
      const bountyAmountFormatted = ethers.formatEther(bountyAmount);
      
      if (parseFloat(cusdBalance) < parseFloat(bountyAmountFormatted)) {
        throw new Error(
          `Insufficient cUSD. You need ${bountyAmountFormatted} cUSD but you only have ${cusdBalance} cUSD. Please add more cUSD to your wallet.`
        );
      }
      
      // Transfer cUSD to BountyPool contract
      const cusdTx = await minipayService.transferToken('cUSD', bountyPoolAddress, bountyAmountFormatted);
      await cusdTx.wait();
      
      // Check CELO balance for gas
      const celoBalance = await this.provider!.getBalance(address);
      const estimatedGas = BigInt(500000);
      const feeData = await this.provider!.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(0);
      const estimatedGasCost = estimatedGas * gasPrice;
      
      if (celoBalance < estimatedGasCost) {
        const balanceFormatted = ethers.formatEther(celoBalance);
        const neededFormatted = ethers.formatEther(estimatedGasCost);
        throw new Error(
          `Insufficient CELO for gas. You need ${neededFormatted} CELO for gas fees, but you only have ${balanceFormatted} CELO. Please add CELO to your wallet.`
        );
      }
      
      // Create task with 0 value since cUSD was already transferred
      // Note: This assumes the contract can handle 0 value when cUSD is already in the pool
      // You may need to modify the contract to support this, or use a different approach
      try {
        const tx = await taskManager.createTask(
          description,
          category,
          bountyAmount, // Still pass the amount for validation
          maxWorkers,
          location,
          deadline,
          requirements,
          { value: 0 } // No native currency sent
        );
        const receipt = await tx.wait();
        
        // Extract task ID from event
        const taskCreatedEvent = receipt?.logs.find((log: any) => {
          try {
            const parsed = taskManager.interface.parseLog(log);
            return parsed?.name === 'TaskCreated';
          } catch {
            return false;
          }
        });
        
        if (taskCreatedEvent) {
          const parsed = taskManager.interface.parseLog(taskCreatedEvent);
          return parsed?.args[0] as bigint;
        }
        
        throw new Error('Task created but could not extract task ID');
      } catch (error: any) {
        // If contract rejects 0 value, we need to handle it differently
        if (error.message?.includes('InsufficientBounty') || error.message?.includes('value')) {
          throw new Error('Contract does not support cUSD payments with 0 value. Please use CELO or update the contract.');
        }
        throw error;
      }
    }
    
    // Handle CELO payments (original flow)
    // Check balance before attempting transaction
    const balance = await this.provider!.getBalance(address);
    const estimatedGas = BigInt(500000); // Rough estimate for gas
    const feeData = await this.provider!.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(0);
    const estimatedGasCost = estimatedGas * gasPrice;
    const totalNeeded = bountyAmount + estimatedGasCost;

    if (balance < totalNeeded) {
      const balanceFormatted = ethers.formatEther(balance);
      const neededFormatted = ethers.formatEther(totalNeeded);
      const bountyFormatted = ethers.formatEther(bountyAmount);
      throw new Error(
        `Insufficient funds. You need ${neededFormatted} CELO (${bountyFormatted} for bounty + gas fees), but you only have ${balanceFormatted} CELO. Please add more funds to your wallet.`
      );
    }
    
    try {
      const tx = await taskManager.createTask(
        description,
        category,
        bountyAmount,
        maxWorkers,
        location,
        deadline,
        requirements,
        { value: bountyAmount }
      );
      const receipt = await tx.wait();
      
      // Extract task ID from event
      const taskCreatedEvent = receipt?.logs.find((log: any) => {
        try {
          const parsed = taskManager.interface.parseLog(log);
          return parsed?.name === 'TaskCreated';
        } catch {
          return false;
        }
      });
      
      if (taskCreatedEvent) {
        const parsed = taskManager.interface.parseLog(taskCreatedEvent);
        return parsed?.args[0] as bigint;
      }
      
      throw new Error('Task created but could not extract task ID');
    } catch (error: any) {
      // Provide more helpful error messages
      if (error.message?.includes('insufficient funds') || error.code === 'INSUFFICIENT_FUNDS') {
        const balanceFormatted = ethers.formatEther(balance);
        const bountyFormatted = ethers.formatEther(bountyAmount);
        throw new Error(
          `Insufficient funds. You need at least ${bountyFormatted} cUSD for the bounty plus gas fees, but you only have ${balanceFormatted} CELO. Please add more funds.`
        );
      }
      throw error;
    }
  }

  getBountyPool(): BountyPool {
    if (!this.bountyPool) {
      throw new Error('BountyPool contract not loaded');
    }
    return this.bountyPool;
  }

  getReputationContract(): ReputationContract {
    if (!this.reputationContract) {
      throw new Error('ReputationContract not loaded');
    }
    return this.reputationContract;
  }

  getVerificationContract(): VerificationContract {
    if (!this.verificationContract) {
      throw new Error('VerificationContract not loaded');
    }
    return this.verificationContract;
  }

  async getAccount(): Promise<string | null> {
    if (!this.signer) return null;
    return await this.signer.getAddress();
  }

  async getBalance(): Promise<string> {
    if (!this.signer) return '0';
    const address = await this.signer.getAddress();
    const balance = await this.provider!.getBalance(address);
    return ethers.formatEther(balance);
  }

  async getNetwork(): Promise<string> {
    if (!this.provider) return 'unknown';
    const network = await this.provider.getNetwork();
    return network.chainId === BigInt(44787) ? 'alfajores' : network.chainId === BigInt(42220) ? 'celo' : 'unknown';
  }

  async getPendingBalance(workerAddress: string): Promise<string> {
    try {
      // Validate address
      if (!workerAddress || !ethers.isAddress(workerAddress)) {
        return '0';
      }

      const taskManager = this.getTaskManager();
      const bountyPool = this.getBountyPool();
      
      // Get worker's active tasks - handle case where method might not be available
      let activeTasks: bigint[] = [];
      try {
        activeTasks = await taskManager.getWorkerActiveTasks(workerAddress);
      } catch (error: any) {
        // If method doesn't exist or returns empty, return 0
        if (error.code === 'BAD_DATA' || error.message?.includes('could not decode')) {
          console.warn('getWorkerActiveTasks returned empty data, worker may have no active tasks');
          return '0';
        }
        throw error;
      }
      
      // If no active tasks, return 0
      if (!activeTasks || activeTasks.length === 0) {
        return '0';
      }
      
      // Sum up bounties for active tasks
      let totalPending = BigInt(0);
      for (const taskId of activeTasks) {
        try {
          const task = await taskManager.getTask(Number(taskId));
          // If task is still active/in progress and not verified, add to pending
          // Convert bigint status to number for comparison
          const statusNum = Number(task.status);
          if (statusNum === 0 || statusNum === 1) {
            const bounty = await bountyPool.getTaskBounty(Number(taskId));
            totalPending += bounty;
          }
        } catch (error) {
          // Task might not exist, continue
        }
      }
      
      return ethers.formatEther(totalPending);
    } catch (error) {
      console.error('Failed to calculate pending balance:', error);
      return '0';
    }
  }
}

export const blockchainService = new BlockchainService();
