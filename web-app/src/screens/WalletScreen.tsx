import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchBalance, connectWallet } from '../store/slices/walletSlice';
import { blockchainService } from '../services/blockchain';
import { minipayService } from '../services/minipay';
import type { TokenInfo } from '../services/minipay';
import './Screen.css';

export default function WalletScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { address, balance, pendingBalance, verifiedBalance, connected, loading } = useSelector(
    (state: RootState) => state.wallet
  );
  const [connecting, setConnecting] = useState(false);
  const [isMiniPay, setIsMiniPay] = useState(false);
  const [tokenBalances, setTokenBalances] = useState<TokenInfo[]>([]);

  useEffect(() => {
    // Check if MiniPay
    setIsMiniPay(blockchainService.isMiniPay());
    
    if (connected) {
      dispatch(fetchBalance());
      
      // Load token balances if MiniPay
      if (blockchainService.isMiniPay()) {
        loadTokenBalances();
      }
      
      // Refresh balance every 30 seconds
      const interval = setInterval(() => {
        dispatch(fetchBalance());
        if (blockchainService.isMiniPay()) {
          loadTokenBalances();
        }
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [connected, dispatch]);

  const loadTokenBalances = async () => {
    if (!minipayService.isAvailable()) return;
    
    try {
      await minipayService.initialize();
      const tokens = await minipayService.getAllTokenBalances();
      setTokenBalances(tokens);
    } catch (error) {
      console.error('Failed to load token balances:', error);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await dispatch(connectWallet()).unwrap();
    } catch (error: any) {
      alert(error || 'Failed to connect wallet. Please install MetaMask or provide a private key.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="screen">
      {!connected ? (
        <div className="connect-section">
          <h1>Connect Wallet</h1>
          <p className="subtitle">
            Connect your wallet to start earning from tasks
          </p>
          <button
            className="connect-button"
            onClick={handleConnect}
            disabled={loading || connecting}
          >
            {connecting || loading ? 'Connecting...' : `Connect Wallet ${isMiniPay ? '(MiniPay)' : '(MetaMask)'}`}
          </button>
          <p className="help-text">
            {isMiniPay 
              ? 'MiniPay detected - connect automatically'
              : 'Make sure MetaMask is installed and connected to Celo network'}
          </p>
        </div>
      ) : (
        <>
          {isMiniPay && (
            <button
              className="add-cash-button"
              onClick={() => minipayService.openAddCash()}
              style={{ marginBottom: '20px', padding: '12px 24px', fontSize: '16px' }}
            >
              💰 Add Cash
            </button>
          )}

          <div className="balance-card">
            <label className="balance-label">Total Balance</label>
            <p className="balance-amount">{balance} cUSD</p>
          </div>

          {isMiniPay && tokenBalances.length > 0 && (
            <div className="detail-section">
              <label className="detail-label">Token Balances</label>
              <div style={{ marginTop: '10px' }}>
                {tokenBalances.map((token) => (
                  <div key={token.symbol} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    padding: '8px 0',
                    borderBottom: '1px solid #eee'
                  }}>
                    <span>{token.symbol}:</span>
                    <span style={{ fontWeight: 'bold' }}>
                      {parseFloat(token.balance).toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="detail-section">
            <label className="detail-label">Account</label>
            <p className="address-text">{address}</p>
          </div>

          <div className="detail-section">
            <label className="detail-label">Pending</label>
            <p className="detail-value">{pendingBalance || '0.00'} cUSD</p>
          </div>

          <div className="detail-section">
            <label className="detail-label">Verified</label>
            <p className="detail-value">{verifiedBalance || balance} cUSD</p>
          </div>
        </>
      )}
    </div>
  );
}
