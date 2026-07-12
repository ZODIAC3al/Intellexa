# Intellexa

A full-stack AI-powered research workspace with Cloud and Local (Ollama) chat capabilities, document management, and RAG (Retrieval-Augmented Generation) features.

## Architecture

```
Intellexa/
├── frontend/          # Next.js 15 frontend (port 3005)
├── backend/           # NestJS backend (port 3001)
└── shared/            # Shared TypeScript types
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript, TailwindCSS, Redux Toolkit, TanStack Query |
| Backend | NestJS 11, Mongoose, JWT Auth, Multer |
| AI Services | HuggingFace Inference API, Ollama (local), ChromaDB |
| Storage | MongoDB Atlas, Cloudinary (avatars) |

## Features

### Chat Interfaces
- **Cloud Chat**: Uses HuggingFace models (Qwen/Qwen2.5-72B-Instruct)
- **Local Chat**: Connects to local Ollama (llama3.2) + RAG from uploaded documents

### Document Management
- Upload PDF, DOCX, TXT, MD files (up to 50MB)
- Automatic chunking and embedding
- Vector storage in ChromaDB
- Document diffing on re-upload

### Collections
- Group documents into collections
- Each collection has its own vector database
- Default "General Research" collection auto-created

### Profile Management
- User profile with avatar upload (Cloudinary)
- Name/email editing

## Setup

### Prerequisites
- Node.js 24+
- MongoDB connection string
- HuggingFace API token
- Cloudinary account (for avatars)
- Ollama (optional, for local chat)

### Environment Variables

Create `backend/.env`:

```bash
# Backend
PORT=3001
JWT_SECRET=your-jwt-secret-here

# HuggingFace
HF_TOKEN=your-hf-token-here
HF_CHAT_MODEL=Qwen/Qwen2.5-72B-Instruct

# Ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_CHAT_MODEL=llama3.2
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# Storage
MONGODB_URI=mongodb://localhost:27017/intellexa
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Installation

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Running

```bash
# Terminal 1: Start backend
cd backend
npm run start

# Terminal 2: Start frontend
cd frontend
npm run dev
```

### Local AI Setup (Optional)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull models
ollama pull llama3.2
ollama pull nomic-embed-text

# Start Ollama (if not auto-started)
ollama serve
```

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/login` | POST | No | Login with email/password |
| `/api/auth/signup` | POST | No | Create account |
| `/api/auth/me` | GET | Yes | Get current user |
| `/api/chat` | POST | Yes | Cloud chat streaming |
| `/api/local/chat` | POST | Yes | Local RAG chat streaming |
| `/api/documents/upload` | POST | Yes | Upload document |
| `/api/documents` | GET | Yes | List documents |
| `/api/collections` | GET/POST | Yes | Collection management |
| `/api/profile` | PATCH | Yes | Update profile |
| `/api/profile/avatar` | POST | Yes | Upload avatar |

## Component Flow

```
[User] -> [Next.js Frontend:3005]
    |
    +-- /api/auth/* --> [NestJS Backend:3001] --> MongoDB
    |
    +-- /api/chat --> [HuggingFace API]
    |
    +-- /api/local/chat --> [Ollama:11434] + [ChromaDB:8000]
    |
    +-- /api/documents/* --> [MongoDB] + [ChromaDB]
    |
    +-- /api/profile/avatar --> [Cloudinary]
```

## Directory Structure

### Frontend (`frontend/src/`)
```
components/
├── CloudAssistantView.tsx    # Cloud chat interface
├── LocalAssistantView.tsx    # Local RAG chat
├── DocumentsView.tsx         # Document upload/list
├── CollectionsView.tsx       # Collection management
├── Sidebar.tsx               # Navigation sidebar
└── SettingsView.tsx          # Settings panel

redux/
├── slices/
│   ├── authSlice.ts         # Authentication state
│   ├── ragSlice.ts           # RAG settings
│   └── uiSlice.ts            # UI state
└── store.ts                  # Redux store

utils/
├── api.ts                    # API client
└── speech.ts                 # TTS/STT utilities
```

### Backend (`backend/src/`)
```
auth/
├── auth.controller.ts       # Auth endpoints
├── auth.service.ts          # Auth logic
├── jwt.strategy.ts          # JWT validation
└── jwt-auth.guard.ts        # Route guard

controllers/
├── api.controller.ts        # All API endpoints

services/
├── cloud-ai.service.ts      # HuggingFace integration
├── local-ai.service.ts      # Ollama integration
├── vector-store.service.ts  # ChromaDB with fallback
├── document-processor.service.ts
├── collections.service.ts
└── history.service.ts

schemas/
├── user.schema.ts
├── workspace.schema.ts
├── document.schema.ts
├── collection.schema.ts
└── conversation.schema.ts
```

## Notes

- User session persists via httpOnly JWT cookie
- Avatar uploads use Cloudinary cloud storage
- Local chat requires Ollama running with models pulled
- Cloud chat requires valid HuggingFace token
- Documents auto-index in background after upload