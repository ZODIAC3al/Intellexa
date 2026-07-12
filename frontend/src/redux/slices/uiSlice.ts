import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UIState {
  activeView: 'landing' | 'dashboard' | 'cloud' | 'local' | 'documents' | 'settings' | 'collections' | 'search' | 'profile';
  activeConversationId: string | null;
  activeDocumentId: string | null;
  activeCollectionId: string;
  isSidebarOpen: boolean;
  theme: 'intellexa-dark' | 'intellexa-light';
  searchQuery: string;
}

const initialState: UIState = {
  activeView: 'landing',
  activeConversationId: null,
  activeDocumentId: null,
  activeCollectionId: 'default',
  isSidebarOpen: false,
  theme: 'intellexa-dark',
  searchQuery: '',
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setView: (state, action: PayloadAction<UIState['activeView']>) => {
      state.activeView = action.payload;
    },
    setActiveConversationId: (state, action: PayloadAction<string | null>) => {
      state.activeConversationId = action.payload;
    },
    setActiveDocumentId: (state, action: PayloadAction<string | null>) => {
      state.activeDocumentId = action.payload;
    },
    setActiveCollectionId: (state, action: PayloadAction<string>) => {
      state.activeCollectionId = action.payload;
    },
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.isSidebarOpen = action.payload;
    },
    setTheme: (state, action: PayloadAction<UIState['theme']>) => {
      state.theme = action.payload;
      if (typeof window !== 'undefined') {
        document.documentElement.setAttribute('data-theme', action.payload);
        localStorage.setItem('intellexa-theme', action.payload);
      }
    },
    toggleTheme: (state) => {
      const nextTheme = state.theme === 'intellexa-dark' ? 'intellexa-light' : 'intellexa-dark';
      state.theme = nextTheme;
      if (typeof window !== 'undefined') {
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('intellexa-theme', nextTheme);
      }
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
  },
});

export const {
  setView,
  setActiveConversationId,
  setActiveDocumentId,
  setActiveCollectionId,
  toggleSidebar,
  setSidebarOpen,
  setTheme,
  toggleTheme,
  setSearchQuery,
} = uiSlice.actions;

export default uiSlice.reducer;
