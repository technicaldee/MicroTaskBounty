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
  reputation: 50,
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
  async (address: string) => {
    const reputationContract = blockchainService.getReputationContract();
    const score = await reputationContract.getReputationScore(address);
    const data = await reputationContract.getReputationData(address);
    return {
      score: Number(score),
      tasksCompleted: Number(data.tasksCompleted),
      tasksRejected: Number(data.tasksRejected),
    };
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
      })
      .addCase(fetchReputation.fulfilled, (state, action) => {
        state.loading = false;
        state.reputation = action.payload.score;
        state.tasksCompleted = action.payload.tasksCompleted;
        state.tasksRejected = action.payload.tasksRejected;
      })
      .addCase(fetchReputation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch reputation';
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




