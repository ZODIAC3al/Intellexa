export interface Citation {
  documentId: string;
  documentName: string;
  chunkIndex: number;
  similarity: number;
  text: string;
  pageNumber?: number; // Page number if available
}

export interface RagMetrics {
  chunksSearchedCount: number;
  chunksRetrievedCount: number;
  searchTimeMs: number;
  generationTimeMs: number;
  totalTimeMs: number;
  avgSimilarityScore: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  citations?: Citation[];
  imageUrls?: string[];
  audioUrl?: string;
  metrics?: RagMetrics; // RAG metrics calculation
}

export type AssistantMode = 'cloud' | 'local';

export interface Conversation {
  id: string;
  title: string;
  mode: AssistantMode;
  messages: Message[];
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DocumentStatus = 'processing' | 'completed' | 'failed';

export interface DocumentInfo {
  id: string;
  name: string;
  path: string;
  size: number;
  status: DocumentStatus;
  chunksCount: number;
  embeddingsCount: number;
  createdAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  documentIds: string[];
  createdAt: string;
}

export interface SystemHealth {
  ollamaConnected: boolean;
  vectorDbEngine: 'chroma' | 'json_fallback';
  hfTokenConfigured: boolean;
}

export interface DashboardStats {
  documentsCount: number;
  collectionsCount: number;
  conversationsCount: number;
  messagesCount: number;
  chunksCount: number;
  embeddingsCount: number;
  databaseSizeMb: number;
  avgSearchTimeMs: number;
  avgResponseTimeMs: number;
  storageUsedMb: number;
  cloudMessagesCount: number;
  localMessagesCount: number;
  systemHealth: SystemHealth;
}
