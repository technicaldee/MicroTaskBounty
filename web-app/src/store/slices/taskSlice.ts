import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ethers } from 'ethers';
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
  activeTasks: number[];
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

export const fetchTasks = createAsyncThunk('tasks/fetchTasks', async (_, { rejectWithValue }) => {
  try {
    const tasks = await blockchainService.getAllTasks();
    return tasks;
  } catch (error: any) {
    return rejectWithValue(error.message || 'Failed to fetch tasks');
  }
});

export const claimTask = createAsyncThunk(
  'tasks/claimTask',
  async (taskId: number, { rejectWithValue, dispatch }) => {
    try {
      const taskManager = blockchainService.getTaskManager();
      const tx = await taskManager.claimTask(taskId);
      await tx.wait();
      
      // Refresh active tasks after claiming
      const address = await blockchainService.getAccount();
      if (address) {
        const activeTasks = await blockchainService.getWorkerActiveTasks(address);
        dispatch(setActiveTasks(activeTasks));
      }
      
      return taskId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (
    {
      description,
      category,
      bountyAmount,
      currency,
      maxWorkers,
      location,
      deadline,
      requirements,
    }: {
      description: string;
      category: number;
      bountyAmount: string;
      currency: 'CELO' | 'cUSD';
      maxWorkers: number;
      location: { latitude: number; longitude: number; radius: number };
      deadline: number;
      requirements: { photoCount: number; requiresLocation: boolean; minReputation: number; requiredBadge: number };
    },
    { rejectWithValue }
  ) => {
    try {
      const bountyWei = ethers.parseEther(bountyAmount);
      
      // Convert location to contract format (scaled by 1e6)
      const contractLocation = {
        latitude: BigInt(Math.floor(location.latitude * 1e6)),
        longitude: BigInt(Math.floor(location.longitude * 1e6)),
        radius: BigInt(location.radius),
      };

      const taskId = await blockchainService.createTask(
        description,
        category,
        bountyWei,
        currency,
        maxWorkers,
        contractLocation,
        deadline,
        requirements
      );

      return { taskId: Number(taskId), description, bountyAmount, currency };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create task');
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
    setActiveTasks: (state, action: PayloadAction<number[]>) => {
      state.activeTasks = action.payload;
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
      })
      .addCase(createTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTask.fulfilled, (state) => {
        state.loading = false;
        // Task will be fetched on next refresh
      })
      .addCase(createTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { addTask, updateTask, removeTask, setTasks, setActiveTasks } = taskSlice.actions;
export default taskSlice.reducer;

