import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice';
import authReducer from './slices/authSlice';
import ragReducer from './slices/ragSlice';

function loadAuthState() {
  if (typeof window !== 'undefined') {
    try {
      const serialized = localStorage.getItem('intellexa-auth');
      if (serialized) {
        const parsed = JSON.parse(serialized);
        return {
          user: parsed.user || null,
          isAuthenticated: !!parsed.user,
          authLoading: false,
        };
      }
    } catch (e) {
      // Ignore errors
    }
  }
  return {
    user: null,
    isAuthenticated: false,
    authLoading: false,
  };
}

export const preloadedAuthState = loadAuthState();

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    auth: authReducer,
    rag: ragReducer,
  },
  preloadedState: {
    auth: preloadedAuthState,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
