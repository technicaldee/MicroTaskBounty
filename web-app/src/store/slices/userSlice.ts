import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { blockchainService } from '../../services/blockchain';

interface UserState {
  reputation: number;
  badges: number[];
  activeTasks: number[];
  tasksCompleted: number;
  tasksRejected: number;
  totalEarnings: string;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  reputation: 0,
  badges: [],
  activeTasks: [],
  tasksCompleted: 0,
  tasksRejected: 0,
  totalEarnings: '0',
  loading: false,
  error: null,
};

export const fetchReputation = createAsyncThunk(
  'user/fetchReputation',
  async (address: string, { rejectWithValue }) => {
    try {
      const reputationContract = blockchainService.getReputationContract();
      const score = await reputationContract.getReputationScore(address);
      const data = await reputationContract.getReputationData(address);
      
      // Fetch badges for all categories
      const badges: number[] = [];
      for (let i = 0; i < 5; i++) {
        try {
          const hasBadge = await reputationContract.hasCategoryBadge(address, i);
          if (hasBadge) {
            badges.push(i);
          }
        } catch (error) {
          // Category might not have badge, continue
        }
      }
      
      return {
        score: Number(score),
        tasksCompleted: Number(data.tasksCompleted),
        tasksRejected: Number(data.tasksRejected),
        badges,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch reputation');
    }
  }
);

export const fetchActiveTasks = createAsyncThunk(
  'user/fetchActiveTasks',
  async (address: string, { rejectWithValue }) => {
    try {
      const activeTasks = await blockchainService.getWorkerActiveTasks(address);
      return activeTasks;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch active tasks');
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    updateReputation: (state, action) => {
      state.reputation = action.payload;
    },
    addBadge: (state, action) => {
      if (!state.badges.includes(action.payload)) {
        state.badges.push(action.payload);
      }
    },
    addActiveTask: (state, action) => {
      if (state.activeTasks.length < 3 && !state.activeTasks.includes(action.payload)) {
        state.activeTasks.push(action.payload);
      }
    },
    removeActiveTask: (state, action) => {
      state.activeTasks = state.activeTasks.filter((id) => id !== action.payload);
    },
    incrementEarnings: (state, action) => {
      const current = parseFloat(state.totalEarnings);
      const amount = parseFloat(action.payload);
      state.totalEarnings = (current + amount).toFixed(2);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReputation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReputation.fulfilled, (state, action) => {
        state.loading = false;
        state.reputation = action.payload.score;
        state.tasksCompleted = action.payload.tasksCompleted;
        state.tasksRejected = action.payload.tasksRejected;
        state.badges = action.payload.badges;
      })
      .addCase(fetchReputation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchActiveTasks.fulfilled, (state, action) => {
        state.activeTasks = action.payload;
      });
  },
});

export const {
  updateReputation,
  addBadge,
  addActiveTask,
  removeActiveTask,
  incrementEarnings,
} = userSlice.actions;
export default userSlice.reducer;
