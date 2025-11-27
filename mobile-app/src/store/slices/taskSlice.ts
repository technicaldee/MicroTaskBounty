import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { blockchainService } from '../../services/blockchain';

export interface Task {
  id: number;
  creator: string;
  description: string;
  category: number;
  bountyAmount: string;
  maxWorkers: number;
  location: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  deadline: number;
  status: number;
  submissionCount: number;
  verifiedCount: number;
  distance?: number;
}

interface TaskState {
  tasks: Task[];
  activeTasks: Task[];
  claimedTasks: number[];
  loading: boolean;
  error: string | null;
}

const initialState: TaskState = {
  tasks: [],
  activeTasks: [],
  claimedTasks: [],
  loading: false,
  error: null,
};

export const fetchTasks = createAsyncThunk('tasks/fetchTasks', async () => {
  // In production, fetch from contract events or subgraph
  // For now, return empty array
  return [];
});

export const claimTask = createAsyncThunk(
  'tasks/claimTask',
  async (taskId: number, { rejectWithValue }) => {
    try {
      const taskManager = blockchainService.getTaskManager();
      const tx = await taskManager.claimTask(taskId);
      await tx.wait();
      return taskId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const submitTask = createAsyncThunk(
  'tasks/submitTask',
  async (
    { taskId, ipfsHash, location }: { taskId: number; ipfsHash: string; location: any },
    { rejectWithValue }
  ) => {
    try {
      const taskManager = blockchainService.getTaskManager();
      const tx = await taskManager.submitTaskCompletion(taskId, ipfsHash, location);
      await tx.wait();
      return { taskId, ipfsHash };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    addTask: (state, action: PayloadAction<Task>) => {
      state.tasks.push(action.payload);
    },
    updateTask: (state, action: PayloadAction<Task>) => {
      const index = state.tasks.findIndex((t) => t.id === action.payload.id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
    },
    removeTask: (state, action: PayloadAction<number>) => {
      state.tasks = state.tasks.filter((t) => t.id !== action.payload);
    },
    setTasks: (state, action: PayloadAction<Task[]>) => {
      state.tasks = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch tasks';
      })
      .addCase(claimTask.fulfilled, (state, action) => {
        state.claimedTasks.push(action.payload);
      })
      .addCase(submitTask.fulfilled, (state, action) => {
        state.claimedTasks = state.claimedTasks.filter((id) => id !== action.payload.taskId);
      });
  },
});

export const { addTask, updateTask, removeTask, setTasks } = taskSlice.actions;
export default taskSlice.reducer;




