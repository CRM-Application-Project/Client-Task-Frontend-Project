// features/user/userSlice.ts
import { UserModule, UserProfile } from '@/lib/data';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';


interface UserState {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  allUsers: UserProfile[];
}

const initialState: UserState = {
  currentUser: null,
  isAuthenticated: false,
  allUsers: [],
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<{ 
      user: UserProfile; 
      allUsers: UserProfile[] 
    }>) => {
      state.currentUser = action.payload.user;
      state.allUsers = action.payload.allUsers;
      state.isAuthenticated = true;
    },
    updateCurrentUser: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.currentUser) {
        state.currentUser = { ...state.currentUser, ...action.payload };
      }
    },
    updateUserModules: (state, action: PayloadAction<{
      userId: string;
      modules: UserModule[];
    }>) => {
      if (state.currentUser?.userId === action.payload.userId) {
        state.currentUser.modules = action.payload.modules;
      }
      state.allUsers = state.allUsers.map(user => 
        user.userId === action.payload.userId 
          ? { ...user, modules: action.payload.modules } 
          : user
      );
    },
    logout: (state) => {
      state.currentUser = null;
      state.isAuthenticated = false;
      state.allUsers = [];
    },
  },
});

export const { 
  loginSuccess, 
  updateCurrentUser, 
  updateUserModules, 
  logout 
} = userSlice.actions;

export default userSlice.reducer;