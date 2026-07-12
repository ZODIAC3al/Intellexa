import {
  Conversation,
  DocumentInfo,
  Collection,
  DashboardStats,
} from '../../../shared/types';

export const API_BASE = 'http://localhost:3001/api';

// Helper to fetch JSON
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: 'include',
  });
  if (!res.ok) {
    const errorText = await res.text();
    let errorMessage = 'Network response was not ok';
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // History APIs
  getHistory: () => fetchJson<Conversation[]>(`${API_BASE}/history`),
  
  createConversation: (mode: 'cloud' | 'local', title?: string) =>
    fetchJson<Conversation>(`${API_BASE}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, title }),
    }),

  updateConversation: (id: string, updates: Partial<Pick<Conversation, 'title' | 'isFavorite' | 'isPinned'>>) =>
    fetchJson<Conversation>(`${API_BASE}/history/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }),

  deleteConversation: (id: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/history/${id}`, {
      method: 'DELETE',
    }),

  clearHistory: () =>
    fetchJson<{ success: boolean }>(`${API_BASE}/history`, {
      method: 'DELETE',
    }),

  // Documents APIs
  getDocuments: () => fetchJson<DocumentInfo[]>(`${API_BASE}/documents`),

  uploadDocument: (file: File, collectionId: string, chunkSize?: number, chunkOverlap?: number) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('collectionId', collectionId);
    if (chunkSize !== undefined) formData.append('chunkSize', String(chunkSize));
    if (chunkOverlap !== undefined) formData.append('chunkOverlap', String(chunkOverlap));
    return fetchJson<DocumentInfo>(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData,
    });
  },

  reindexDocument: (id: string, collectionId: string, chunkSize?: number, chunkOverlap?: number) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/documents/reindex`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, collectionId, chunkSize, chunkOverlap }),
    }),

  deleteDocument: (id: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/documents/${id}`, {
      method: 'DELETE',
    }),

  getStats: () => fetchJson<DashboardStats>(`${API_BASE}/documents/stats`),

  downloadDocumentUrl: (id: string) => `${API_BASE}/documents/download/${id}`,

  // Collections APIs
  getCollections: () => fetchJson<Collection[]>(`${API_BASE}/collections`),

  createCollection: (name: string, description?: string) =>
    fetchJson<Collection>(`${API_BASE}/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    }),

  updateCollection: (id: string, updates: Partial<Pick<Collection, 'name' | 'description' | 'documentIds'>>) =>
    fetchJson<Collection>(`${API_BASE}/collections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }),

  deleteCollection: (id: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/collections/${id}`, {
      method: 'DELETE',
    }),

  // Global Search
  search: (query: string, collectionId?: string) => {
    let url = `${API_BASE}/search?q=${encodeURIComponent(query)}`;
    if (collectionId) {
      url += `&collectionId=${encodeURIComponent(collectionId)}`;
    }
    return fetchJson<{ results: any[]; durationMs: number }>(url);
  },

  retrieveLocalChunks: (question: string, collectionId: string, topK?: number, minScore?: number, retrievalStrategy?: string) =>
    fetchJson<any[]>(`${API_BASE}/local/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, collectionId, topK, minScore, retrievalStrategy }),
    }),

  // Image Generation
  generateImage: (prompt: string) =>
    fetchJson<{ base64Url: string }>(`${API_BASE}/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    }),

  // Speech to Text
  transcribeSpeech: (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');
    return fetchJson<{ text: string }>(`${API_BASE}/speech`, {
      method: 'POST',
      body: formData,
    });
  },

  // Auth APIs
  login: (email: string, passwordHash: string) =>
    fetchJson<any>(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: passwordHash }),
    }),

  signup: (email: string, passwordHash: string, name: string) =>
    fetchJson<any>(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: passwordHash, name }),
    }),

  getMe: () => fetchJson<any>(`${API_BASE}/auth/me`),

  // Account APIs
  exportData: () => fetchJson<any>(`${API_BASE}/account/export`),

  deleteAccount: () =>
    fetchJson<{ success: boolean }>(`${API_BASE}/account`, {
      method: 'DELETE',
    }),

  // Public Workspace APIs
  getPublicWorkspace: (slug: string) =>
    fetchJson<any>(`${API_BASE}/public/w/${slug}`),

  // Activity Feed API
  getActivity: () => fetchJson<any[]>(`${API_BASE}/activity`),

  // Notifications APIs
  getNotifications: () => fetchJson<any[]>(`${API_BASE}/notifications`),

  markNotificationRead: (id: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  // Usage Meter API
  getUsageMeter: () => fetchJson<any>(`${API_BASE}/usage/meter`),

  // Members APIs
  getMembers: () => fetchJson<any[]>(`${API_BASE}/workspaces/members`),

  inviteMember: (email: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/workspaces/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }),

  updateWorkspaceMemberRole: (userId: string, role: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/workspaces/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    }),

  // Profile APIs
  updateProfile: (data: { name: string; email: string; avatar?: string }) =>
    fetchJson<any>(`${API_BASE}/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchJson<{ avatarUrl: string }>(`${API_BASE}/profile/avatar`, {
      method: 'POST',
      body: formData,
    });
  },
};