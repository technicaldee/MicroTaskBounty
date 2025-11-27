import { configureStore } from '@reduxjs/toolkit';
import taskReducer from './slices/taskSlice';
import walletReducer from './slices/walletSlice';
import userReducer from './slices/userSlice';
import verificationReducer from './slices/verificationSlice';

export const store = configureStore({
  reducer: {
    tasks: taskReducer,
    wallet: walletReducer,
    user: userReducer,
    verification: verificationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

