// app/store.ts
import { configureStore } from '@reduxjs/toolkit';
import userReducer from '../hooks/userSlice'; 

export const store = configureStore({
  reducer: {
    user: userReducer,
    // add other reducers here
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;