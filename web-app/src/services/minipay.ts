import { ethers } from 'ethers';

// Token contract addresses on Celo Mainnet
const TOKEN_ADDRESSES = {
  CELO: '0x471EcE3750Da237f93B8E339c536989b8978a438',
  cUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
  USDC: '0xceba9300f2b5b6e3B8F8F8F8F8F8F8F8F8F8F8F8', // Update with actual USDC address
  USDT: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
};

// ERC20 ABI for token operations
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

export interface TokenInfo {
  symbol: string;
  address: string;
  decimals: number;
  balance: string;
}

class MiniPayService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private isMiniPay: boolean = false;

  /**
   * Check if MiniPay is available
   */
  isAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    const ethereum = (window as any).ethereum;
    return !!ethereum && (ethereum.isMiniPay === true);
  }

  /**
   * Initialize MiniPay connection
   */
  async initialize(): Promise<void> {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('MiniPay/MetaMask not available');
    }

    const ethereum = (window as any).ethereum;
    this.isMiniPay = ethereum.isMiniPay === true;
    this.provider = new ethers.BrowserProvider(ethereum);
    this.signer = await this.provider.getSigner();
  }

  /**
   * Get current wallet address
   */
  async getAddress(): Promise<string> {
    if (!this.signer) {
      await this.initialize();
    }
    return await this.signer!.getAddress();
  }

  /**
   * Get CELO balance
   */
  async getCELOBalance(): Promise<string> {
    if (!this.provider) {
      await this.initialize();
    }
    const address = await this.getAddress();
    const balance = await this.provider!.getBalance(address);
    return ethers.formatEther(balance);
  }

  /**
   * Get token balance (cUSD, USDC, USDT)
   */
  async getTokenBalance(tokenSymbol: 'cUSD' | 'USDC' | 'USDT'): Promise<string> {
    if (!this.provider) {
      await this.initialize();
    }
    const address = await this.getAddress();
    const tokenAddress = TOKEN_ADDRESSES[tokenSymbol];
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider!);
    const balance = await contract.balanceOf(address);
    const decimals = await contract.decimals();
    return ethers.formatUnits(balance, decimals);
  }

  /**
   * Get all token balances
   */
  async getAllTokenBalances(): Promise<TokenInfo[]> {
    const tokens: TokenInfo[] = [];
    
    try {
      // Get CELO balance
      const celoBalance = await this.getCELOBalance();
      tokens.push({
        symbol: 'CELO',
        address: TOKEN_ADDRESSES.CELO,
        decimals: 18,
        balance: celoBalance,
      });

      // Get cUSD balance
      const cusdBalance = await this.getTokenBalance('cUSD');
      tokens.push({
        symbol: 'cUSD',
        address: TOKEN_ADDRESSES.cUSD,
        decimals: 18,
        balance: cusdBalance,
      });

      // Get USDC balance (if available)
      try {
        const usdcBalance = await this.getTokenBalance('USDC');
        tokens.push({
          symbol: 'USDC',
          address: TOKEN_ADDRESSES.USDC,
          decimals: 6,
          balance: usdcBalance,
        });
      } catch (e) {
        // USDC might not be available
      }

      // Get USDT balance (if available)
      try {
        const usdtBalance = await this.getTokenBalance('USDT');
        tokens.push({
          symbol: 'USDT',
          address: TOKEN_ADDRESSES.USDT,
          decimals: 6,
          balance: usdtBalance,
        });
      } catch (e) {
        // USDT might not be available
      }
    } catch (error) {
      console.error('Failed to get token balances:', error);
    }

    return tokens;
  }

  /**
   * Transfer tokens (cUSD, USDC, USDT)
   */
  async transferToken(
    tokenSymbol: 'cUSD' | 'USDC' | 'USDT',
    to: string,
    amount: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) {
      await this.initialize();
    }

    const tokenAddress = TOKEN_ADDRESSES[tokenSymbol];
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer!);
    const decimals = await contract.decimals();
    const amountWei = ethers.parseUnits(amount, decimals);

    return await contract.transfer(to, amountWei);
  }

  /**
   * Transfer CELO
   */
  async transferCELO(to: string, amount: string): Promise<ethers.TransactionResponse> {
    if (!this.signer) {
      await this.initialize();
    }

    const amountWei = ethers.parseEther(amount);
    return await this.signer!.sendTransaction({
      to,
      value: amountWei,
    });
  }

  /**
   * Estimate gas for transaction (supports fee abstraction in MiniPay)
   */
  async estimateGas(transaction: ethers.TransactionRequest): Promise<bigint> {
    if (!this.provider) {
      await this.initialize();
    }
    return await this.provider!.estimateGas(transaction);
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<bigint> {
    if (!this.provider) {
      await this.initialize();
    }
    const feeData = await this.provider!.getFeeData();
    return feeData.gasPrice || BigInt(0);
  }

  /**
   * Send transaction with fee abstraction support
   * MiniPay allows paying gas in stablecoins
   */
  async sendTransaction(
    transaction: ethers.TransactionRequest,
    feeCurrency?: 'CELO' | 'cUSD' | 'USDC' | 'USDT'
  ): Promise<ethers.TransactionResponse> {
    if (!this.signer) {
      await this.initialize();
    }

    // If feeCurrency is specified and we're in MiniPay, add it to transaction
    if (this.isMiniPay && feeCurrency && feeCurrency !== 'CELO') {
      // MiniPay supports feeCurrency parameter
      const ethereum = (window as any).ethereum;
      const feeCurrencyAddress = TOKEN_ADDRESSES[feeCurrency];
      
      // Use MiniPay's enhanced transaction format
      const txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          ...transaction,
          feeCurrency: feeCurrencyAddress,
        }],
      });
      
      // Return transaction response
      return {
        hash: txHash,
        wait: async () => {
          return await this.getTransactionReceipt(txHash);
        },
      } as ethers.TransactionResponse;
    }

    // Standard transaction
    return await this.signer!.sendTransaction(transaction);
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    if (!this.provider) {
      await this.initialize();
    }
    return await this.provider!.getTransactionReceipt(txHash);
  }

  /**
   * Open MiniPay add cash screen via deep link
   */
  openAddCash(): void {
    if (this.isMiniPay) {
      window.location.href = 'https://minipay.opera.com/add_cash';
    } else {
      // Fallback for other wallets
      console.log('Add cash feature available in MiniPay');
    }
  }

  /**
   * Check if we're running in MiniPay
   */
  getIsMiniPay(): boolean {
    return this.isMiniPay;
  }
}

export const minipayService = new MiniPayService();

