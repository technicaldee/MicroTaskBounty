import { ContractKit, newKitFromWeb3 } from '@celo/contractkit';
import Web3 from 'web3';
import { ethers } from 'ethers';
import { TaskManager } from '../../typechain-types/contracts/TaskManager';
import { TaskManager__factory } from '../../typechain-types/factories/contracts/TaskManager__factory';
import { BountyPool } from '../../typechain-types/contracts/BountyPool';
import { BountyPool__factory } from '../../typechain-types/factories/contracts/BountyPool__factory';
import { ReputationContract } from '../../typechain-types/contracts/ReputationContract';
import { ReputationContract__factory } from '../../typechain-types/factories/contracts/ReputationContract__factory';
import { VerificationContract } from '../../typechain-types/contracts/VerificationContract.sol/VerificationContract';
import { VerificationContract__factory } from '../../typechain-types/factories/contracts/VerificationContract.sol/VerificationContract__factory';

const ALFAJORES_RPC = 'https://alfajores-forno.celo-testnet.org';
const CELO_RPC = 'https://forno.celo.org';

export interface ContractAddresses {
  taskManager: string;
  bountyPool: string;
  reputationContract: string;
  verificationContract: string;
}

class BlockchainService {
  private kit: ContractKit | null = null;
  private web3: Web3 | null = null;
  private provider: ethers.JsonRpcProvider | null = null;
  private signer: ethers.Wallet | null = null;
  private addresses: ContractAddresses | null = null;
  private taskManager: TaskManager | null = null;
  private bountyPool: BountyPool | null = null;
  private reputationContract: ReputationContract | null = null;
  private verificationContract: VerificationContract | null = null;

  async initialize(rpcUrl: string = ALFAJORES_RPC, addresses?: ContractAddresses) {
    this.web3 = new Web3(rpcUrl);
    this.kit = newKitFromWeb3(this.web3);
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    if (addresses) {
      this.addresses = addresses;
      await this.loadContracts();
    }
  }

  async connectWallet(privateKey?: string) {
    if (!this.kit || !this.provider) {
      throw new Error('Blockchain service not initialized');
    }

    if (privateKey) {
      this.kit.connection.addAccount(privateKey);
      const accounts = await this.kit.connection.web3.eth.getAccounts();
      this.kit.defaultAccount = accounts[0];
      this.signer = new ethers.Wallet(privateKey, this.provider);
    } else {
      // For mobile, use Valora or other wallet providers
      // This is a placeholder - in production, integrate with Valora or WalletConnect
      throw new Error('Wallet connection not implemented. Please provide private key for testing.');
    }
  }

  async loadContracts() {
    if (!this.addresses || !this.provider) {
      throw new Error('Addresses not set or provider not initialized');
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
    if (this.kit) {
      this.loadContracts();
    }
  }

  getTaskManager(): TaskManager {
    if (!this.taskManager) {
      throw new Error('TaskManager contract not loaded');
    }
    return this.taskManager;
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
    if (!this.kit) return null;
    return this.kit.defaultAccount || null;
  }

  async getBalance(): Promise<string> {
    if (!this.kit || !this.kit.defaultAccount) {
      return '0';
    }
    const balance = await this.kit.getTotalBalance(this.kit.defaultAccount);
    return balance.cUSD.toString();
  }

  async getNetwork(): Promise<string> {
    if (!this.web3) return 'unknown';
    const networkId = await this.web3.eth.net.getId();
    return networkId === 44787 ? 'alfajores' : networkId === 42220 ? 'celo' : 'unknown';
  }
}

export const blockchainService = new BlockchainService();

