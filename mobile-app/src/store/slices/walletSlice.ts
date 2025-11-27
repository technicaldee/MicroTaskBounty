import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { blockchainService } from '../../services/blockchain';

interface WalletState {
  address: string | null;
  balance: string;
  pendingBalance: string;
  verifiedBalance: string;
  connected: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: WalletState = {
  address: null,
  balance: '0',
  pendingBalance: '0',
  verifiedBalance: '0',
  connected: false,
  loading: false,
  error: null,
};

export const connectWallet = createAsyncThunk(
  'wallet/connect',
  async (privateKey: string | undefined, { rejectWithValue }) => {
    try {
      await blockchainService.connectWallet(privateKey);
      const address = await blockchainService.getAccount();
      const balance = await blockchainService.getBalance();
      return { address, balance };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchBalance = createAsyncThunk('wallet/fetchBalance', async () => {
  const balance = await blockchainService.getBalance();
  return balance;
});

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    disconnect: (state) => {
      state.address = null;
      state.balance = '0';
      state.connected = false;
    },
    updateBalance: (state, action) => {
      state.balance = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(connectWallet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(connectWallet.fulfilled, (state, action) => {
        state.loading = false;
        state.address = action.payload.address;
        state.balance = action.payload.balance;
        state.connected = true;
      })
      .addCase(connectWallet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchBalance.fulfilled, (state, action) => {
        state.balance = action.payload;
      });
  },
});

export const { disconnect, updateBalance } = walletSlice.actions;
export default walletSlice.reducer;




