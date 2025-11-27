import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { blockchainService } from '../../services/blockchain';

interface Verification {
  id: number;
  taskId: number;
  worker: string;
  ipfsHash: string;
  status: number;
  approvalCount: number;
  rejectionCount: number;
}

interface VerificationState {
  pendingVerifications: Verification[];
  myVerifications: Verification[];
  loading: boolean;
  error: string | null;
}

const initialState: VerificationState = {
  pendingVerifications: [],
  myVerifications: [],
  loading: false,
  error: null,
};

export const fetchPendingVerifications = createAsyncThunk(
  'verification/fetchPending',
  async () => {
    // In production, fetch from contract events
    return [];
  }
);

export const stakeForVerification = createAsyncThunk(
  'verification/stake',
  async (
    { submissionId, stakeAmount }: { submissionId: number; stakeAmount: string },
    { rejectWithValue }
  ) => {
    try {
      const verificationContract = blockchainService.getVerificationContract();
      const tx = await verificationContract.stakeForVerification(submissionId, {
        value: stakeAmount,
      });
      await tx.wait();
      return submissionId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const submitVote = createAsyncThunk(
  'verification/vote',
  async (
    { submissionId, approved, feedback }: { submissionId: number; approved: boolean; feedback: string },
    { rejectWithValue }
  ) => {
    try {
      const verificationContract = blockchainService.getVerificationContract();
      const tx = await verificationContract.submitVerification(submissionId, approved, feedback);
      await tx.wait();
      return { submissionId, approved };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const verificationSlice = createSlice({
  name: 'verification',
  initialState,
  reducers: {
    addVerification: (state, action) => {
      state.pendingVerifications.push(action.payload);
    },
    updateVerification: (state, action) => {
      const index = state.pendingVerifications.findIndex(
        (v) => v.id === action.payload.id
      );
      if (index !== -1) {
        state.pendingVerifications[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPendingVerifications.fulfilled, (state, action) => {
        state.pendingVerifications = action.payload;
      })
      .addCase(stakeForVerification.fulfilled, (_state, _action) => {
        // Update verification state
      })
      .addCase(submitVote.fulfilled, (_state, _action) => {
        // Update verification state
      });
  },
});

export const { addVerification, updateVerification } = verificationSlice.actions;
export default verificationSlice.reducer;




