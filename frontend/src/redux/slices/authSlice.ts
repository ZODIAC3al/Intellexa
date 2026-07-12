import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  _id: string;
  email: string;
  name: string;
  plan: 'local-core' | 'standard-pro' | 'enterprise';
  workspaceId: string;
  avatar?: string;
  settings?: {
    theme: 'dark' | 'light' | 'system';
    defaultRetrievalStrategy: 'similarity' | 'mmr';
  };
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  authLoading: true,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.authLoading = false;
      if (typeof window !== 'undefined') {
        localStorage.setItem('intellexa-auth', JSON.stringify({ user: action.payload }));
      }
    },
    clearCredentials: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.authLoading = false;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('intellexa-auth');
      }
    },
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.authLoading = action.payload;
    },
  },
});

export const { setCredentials, clearCredentials, setAuthLoading } = authSlice.actions;
export default authSlice.reducer;
