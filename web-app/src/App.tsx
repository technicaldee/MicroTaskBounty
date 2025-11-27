import { useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { AppDispatch } from './store';
import { connectWallet } from './store/slices/walletSlice';
import { blockchainService } from './services/blockchain';
import TaskFeedScreen from './screens/TaskFeedScreen';
import TaskDetailScreen from './screens/TaskDetailScreen';
import CreateTaskScreen from './screens/CreateTaskScreen';
import WalletScreen from './screens/WalletScreen';
import ProfileScreen from './screens/ProfileScreen';
import VerificationScreen from './screens/VerificationScreen';
import './App.css';

function App() {
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Initialize blockchain service and try to load contract addresses
    blockchainService.initialize().then(async () => {
      // Try to load contracts from deployments.json
      try {
        await blockchainService.loadContracts();
        console.log('Contracts loaded successfully');

        // Auto-connect to MiniPay/MetaMask if available
        if (blockchainService.isWalletAvailable()) {
          try {
            const ethereum = (window as any).ethereum;
            const isMiniPay = blockchainService.isMiniPay();

            // Check if already connected
            const accounts = await ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
              // Auto-connect if wallet is already authorized
              await dispatch(connectWallet()).unwrap();
              console.log(`Auto-connected to ${isMiniPay ? 'MiniPay' : 'wallet'}`);
            } else {
              // Try to connect automatically
              // MiniPay auto-approves, MetaMask prompts
              try {
                await ethereum.request({ method: 'eth_requestAccounts' });
                await dispatch(connectWallet()).unwrap();
                console.log(`Auto-connected to ${isMiniPay ? 'MiniPay' : 'wallet'}`);
              } catch (err: any) {
                // User rejected or connection failed - that's okay, user can connect manually
                if (err.code !== 4001) { // 4001 = user rejected
                  console.log('Auto-connect failed:', err.message);
                }
              }
            }
          } catch (error: any) {
            // Silently fail - user can connect manually from wallet screen
            console.log('Auto-connect not available:', error?.message || 'Unknown error');
          }
        }
      } catch (error) {
        console.error('Failed to load contracts:', error);
      }
    }).catch(console.error);
  }, [dispatch]);

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-logo">
            MicroTaskBounty
          </Link>
          <div className="nav-links">
            <Link
              to="/"
              className={location.pathname === '/' ? 'active' : ''}
            >
              Tasks
            </Link>
            <Link
              to="/verification"
              className={location.pathname === '/verification' ? 'active' : ''}
            >
              Verification
            </Link>
            <Link
              to="/wallet"
              className={location.pathname === '/wallet' ? 'active' : ''}
            >
              Wallet
            </Link>
            <Link
              to="/profile"
              className={location.pathname === '/profile' ? 'active' : ''}
            >
              Profile
            </Link>
            <Link
              to="/create-task"
              className={location.pathname === '/create-task' ? 'active' : ''}
            >
              Create Task
            </Link>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<TaskFeedScreen />} />
          <Route path="/task/:taskId" element={<TaskDetailScreen />} />
          <Route path="/create-task" element={<CreateTaskScreen />} />
          <Route path="/verification" element={<VerificationScreen />} />
          <Route path="/wallet" element={<WalletScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

