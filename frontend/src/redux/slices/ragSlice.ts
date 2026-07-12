import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface RAGState {
  temperature: number;
  maxTokens: number;
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  retrievalStrategy: 'similarity' | 'mmr';
  activeCollectionIds: string[];
  qualityMode: 'fast' | 'balanced' | 'high_accuracy' | 'custom';
  similarityThreshold: number;
  cloudModel: string;
  topP: number;
  streamingEnabled: boolean;
  ttsEnabled: boolean;
  systemPrompt: string;
}

const initialState: RAGState = {
  temperature: 0.7,
  maxTokens: 1024,
  chunkSize: 512,
  chunkOverlap: 100,
  topK: 5,
  retrievalStrategy: 'mmr',
  activeCollectionIds: ['default'],
  qualityMode: 'balanced',
  similarityThreshold: 0.75,
  cloudModel: 'llama-3-8b-instruct',
  topP: 0.9,
  streamingEnabled: true,
  ttsEnabled: false,
  systemPrompt: 'You are Intellexa, a highly context-aware assistant. Answer query based only on the provided context.',
};

export const ragSlice = createSlice({
  name: 'rag',
  initialState,
  reducers: {
    updateRagSettings: (state, action: PayloadAction<Partial<RAGState>>) => {
      const updates = { ...action.payload };
      if (updates.qualityMode && updates.qualityMode !== 'custom') {
        if (updates.qualityMode === 'fast') {
          updates.chunkSize = 256;
          updates.chunkOverlap = 50;
          updates.topK = 3;
        } else if (updates.qualityMode === 'balanced') {
          updates.chunkSize = 512;
          updates.chunkOverlap = 100;
          updates.topK = 5;
        } else if (updates.qualityMode === 'high_accuracy') {
          updates.chunkSize = 1024;
          updates.chunkOverlap = 150;
          updates.topK = 8;
        }
      }
      return { ...state, ...updates };
    },
    setActiveCollectionIds: (state, action: PayloadAction<string[]>) => {
      state.activeCollectionIds = action.payload;
    },
    resetRagSettings: () => {
      return initialState;
    },
  },
});

export const { updateRagSettings, setActiveCollectionIds, resetRagSettings } = ragSlice.actions;
export default ragSlice.reducer;
