import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChromaClient } from 'chromadb';
import * as fs from 'fs';
import * as path from 'path';

interface LocalVectorItem {
  id: string;
  documentId: string;
  text: string;
  metadata: {
    documentId: string;
    documentName: string;
    chunkIndex: number;
    [key: string]: any;
  };
  embedding: number[];
}

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);
  private chromaClient: ChromaClient | null = null;
  private chromaHost = 'http://localhost:8000';
  private useLocalFallback = false;
  private readonly fallbackDbPath = path.join(process.cwd(), '..', 'vector-db', 'vectors.json');
  private localVectors: Record<string, LocalVectorItem[]> = {};

  public isFallbackActive(): boolean {
    return this.useLocalFallback;
  }

  constructor(private configService: ConfigService) {
    this.chromaHost = this.configService.get<string>('CHROMA_HOST') || this.chromaHost;
    this.initChroma();
  }

  private async initChroma() {
    try {
      this.logger.log(`Attempting to connect to ChromaDB at ${this.chromaHost}...`);
      this.chromaClient = new ChromaClient({ path: this.chromaHost });
      const version = await this.chromaClient.version();
      this.logger.log(`Connected to ChromaDB successfully. Version: ${version}`);
      try {
        const collections = await this.chromaClient.listCollections();
        for (const col of collections) {
          if (!col.metadata || col.metadata['hnsw:space'] !== 'cosine') {
            this.logger.log(`Migrating ChromaDB collection ${col.name} to cosine distance space...`);
            await this.chromaClient.deleteCollection({ name: col.name });
          }
        }
      } catch (err) {
        this.logger.error('Failed to run ChromaDB metric space migration:', err);
      }
    } catch (error) {
      this.logger.warn(`Could not connect to ChromaDB at ${this.chromaHost}: ${error.message || error}`);
      this.logger.log('Fallback active: Local file-based vector storage.');
      this.useLocalFallback = true;
      this.loadLocalVectors();
    }
  }

  private loadLocalVectors() {
    try {
      const dir = path.dirname(this.fallbackDbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.fallbackDbPath)) {
        const data = fs.readFileSync(this.fallbackDbPath, 'utf8');
        this.localVectors = JSON.parse(data);
      } else {
        this.localVectors = {};
        this.saveLocalVectors();
      }
    } catch (error) {
      this.logger.error('Failed to load local vector db:', error);
      this.localVectors = {};
    }
  }

  private saveLocalVectors() {
    try {
      fs.writeFileSync(this.fallbackDbPath, JSON.stringify(this.localVectors, null, 2), 'utf8');
    } catch (error) {
      this.logger.error('Failed to save local vector db:', error);
    }
  }

  async addDocuments(
    collectionName: string,
    items: { id: string; text: string; metadata: any; embedding: number[] }[]
  ): Promise<void> {
    const sanitizedCollectionName = this.sanitizeCollectionName(collectionName);

    if (this.useLocalFallback) {
      if (!this.localVectors[sanitizedCollectionName]) {
        this.localVectors[sanitizedCollectionName] = [];
      }
      const documentId = items[0]?.metadata?.documentId;
      if (documentId) {
        // Clear previous chunks of the same document to avoid duplicates
        this.localVectors[sanitizedCollectionName] = this.localVectors[sanitizedCollectionName].filter(
          (item) => item.documentId !== documentId
        );
      }

      for (const item of items) {
        this.localVectors[sanitizedCollectionName].push({
          id: item.id,
          documentId: item.metadata.documentId,
          text: item.text,
          metadata: item.metadata,
          embedding: item.embedding,
        });
      }
      this.saveLocalVectors();
      this.logger.log(`Added ${items.length} items to local fallback vector collection: ${sanitizedCollectionName}`);
      return;
    }

    try {
      const collection = await this.chromaClient!.getOrCreateCollection({
        name: sanitizedCollectionName,
        metadata: { 'hnsw:space': 'cosine' },
      });

      const ids = items.map((item) => item.id);
      const embeddings = items.map((item) => item.embedding);
      const documents = items.map((item) => item.text);
      const metadatas = items.map((item) => item.metadata);

      await collection.add({
        ids,
        embeddings,
        documents,
        metadatas,
      });
      this.logger.log(`Added ${items.length} items to ChromaDB collection: ${sanitizedCollectionName}`);
    } catch (error) {
      this.logger.error(`Failed to add documents to ChromaDB (${sanitizedCollectionName}):`, error);
      // Fallback on error
      this.useLocalFallback = true;
      this.loadLocalVectors();
      await this.addDocuments(collectionName, items);
    }
  }

  async similaritySearch(
    collectionName: string,
    queryEmbedding: number[],
    topK: number = 4,
    minScore: number = 0.0,
    retrievalStrategy: 'similarity' | 'mmr' = 'mmr'
  ): Promise<{ id: string; text: string; metadata: any; similarity: number }[]> {
    const sanitizedCollectionName = this.sanitizeCollectionName(collectionName);

    if (this.useLocalFallback) {
      const collectionItems = this.localVectors[sanitizedCollectionName] || [];
      if (collectionItems.length === 0) {
        return [];
      }

      const results = collectionItems.map((item) => {
        const similarity = this.cosineSimilarity(queryEmbedding, item.embedding);
        return {
          id: item.id,
          text: item.text,
          metadata: item.metadata,
          similarity,
          embedding: item.embedding,
        };
      });

      // Filter by minScore and sort descending by similarity
      const filtered = results
        .filter((r) => r.similarity >= minScore)
        .sort((a, b) => b.similarity - a.similarity);

      if (retrievalStrategy === 'mmr') {
        return this.runMMR(filtered, topK);
      } else {
        return filtered.slice(0, topK).map(({ embedding, ...rest }) => rest);
      }
    }

    try {
      const collection = await this.chromaClient!.getOrCreateCollection({
        name: sanitizedCollectionName,
        metadata: { 'hnsw:space': 'cosine' },
      });

      const candidateCount = retrievalStrategy === 'mmr' ? Math.min(topK * 2, 20) : topK;

      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: candidateCount,
        include: ['documents', 'metadatas', 'distances', 'embeddings'] as any,
      });

      const matched: { id: string; text: string; metadata: any; similarity: number; embedding: number[] }[] = [];
      if (results.ids && results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          const id = results.ids[0][i];
          const text = results.documents && results.documents[0] && results.documents[0][i] !== null ? results.documents[0][i]! : '';
          const metadata = results.metadatas && results.metadatas[0] ? results.metadatas[0][i] : {};
          // ChromaDB returns distance. For cosine distance, similarity is 1 - distance.
          const distanceVal = results.distances && results.distances[0] && results.distances[0][i] !== null ? results.distances[0][i]! : 1.0;
          const similarity = 1.0 - distanceVal;
          const embedding = (results.embeddings && results.embeddings[0] && results.embeddings[0][i] ? results.embeddings[0][i] : []) as number[];

          if (similarity >= minScore) {
            matched.push({ id, text, metadata, similarity, embedding });
          }
        }
      }

      if (retrievalStrategy === 'mmr') {
        return this.runMMR(matched, topK);
      } else {
        return matched.map(({ embedding, ...rest }) => rest);
      }
    } catch (error) {
      this.logger.error(`Error searching in ChromaDB (${sanitizedCollectionName}):`, error);
      // Fallback
      this.useLocalFallback = true;
      this.loadLocalVectors();
      return this.similaritySearch(collectionName, queryEmbedding, topK, minScore, retrievalStrategy);
    }
  }

  async count(collectionName: string): Promise<number> {
    const sanitizedCollectionName = this.sanitizeCollectionName(collectionName);
    if (this.useLocalFallback) {
      return (this.localVectors[sanitizedCollectionName] || []).length;
    }
    try {
      const collection = await this.chromaClient!.getOrCreateCollection({
        name: sanitizedCollectionName,
        metadata: { 'hnsw:space': 'cosine' },
      });
      return await collection.count();
    } catch (error) {
      this.logger.error(`Error counting items in ChromaDB (${sanitizedCollectionName}):`, error);
      return (this.localVectors[sanitizedCollectionName] || []).length;
    }
  }

  private runMMR(
    candidates: { id: string; text: string; metadata: any; similarity: number; embedding: number[] }[],
    topK: number,
    lambda = 0.5
  ): { id: string; text: string; metadata: any; similarity: number }[] {
    if (candidates.length <= topK) {
      return candidates.map(({ embedding, ...rest }) => rest);
    }

    const selected: typeof candidates = [];
    const remaining = [...candidates];

    // Select the first (highest similarity) candidate
    const first = remaining.shift()!;
    selected.push(first);

    while (selected.length < topK && remaining.length > 0) {
      let bestScore = -Infinity;
      let bestIndex = -1;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];

        // Compute redundancy (max similarity to already selected candidates)
        let maxRedundancy = -Infinity;
        for (const sel of selected) {
          const simBetweenCandidates = this.cosineSimilarity(candidate.embedding, sel.embedding);
          if (simBetweenCandidates > maxRedundancy) {
            maxRedundancy = simBetweenCandidates;
          }
        }

        // MMR Score = lambda * relevance - (1 - lambda) * maxRedundancy
        const mmrScore = lambda * candidate.similarity - (1 - lambda) * maxRedundancy;

        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIndex = i;
        }
      }

      if (bestIndex !== -1) {
        selected.push(remaining[bestIndex]);
        remaining.splice(bestIndex, 1);
      } else {
        break;
      }
    }

    return selected.map(({ embedding, ...rest }) => rest);
  }

  async deleteDocument(collectionName: string, documentId: string): Promise<void> {
    const sanitizedCollectionName = this.sanitizeCollectionName(collectionName);

    if (this.useLocalFallback) {
      if (this.localVectors[sanitizedCollectionName]) {
        this.localVectors[sanitizedCollectionName] = this.localVectors[sanitizedCollectionName].filter(
          (item) => item.documentId !== documentId
        );
        this.saveLocalVectors();
      }
      return;
    }

    try {
      const collection = await this.chromaClient!.getCollection({
        name: sanitizedCollectionName,
      });
      // Delete where documentId matches
      await collection.delete({
        where: { documentId: { $eq: documentId } },
      });
      this.logger.log(`Deleted document ${documentId} chunks from ChromaDB collection ${sanitizedCollectionName}`);
    } catch (error) {
      this.logger.error(`Error deleting from ChromaDB (${sanitizedCollectionName}):`, error);
    }
  }

  async deleteCollection(collectionName: string): Promise<void> {
    const sanitizedCollectionName = this.sanitizeCollectionName(collectionName);

    if (this.useLocalFallback) {
      delete this.localVectors[sanitizedCollectionName];
      this.saveLocalVectors();
      return;
    }

    try {
      await this.chromaClient!.deleteCollection({ name: sanitizedCollectionName });
      this.logger.log(`Deleted ChromaDB collection: ${sanitizedCollectionName}`);
    } catch (error) {
      this.logger.error(`Error deleting ChromaDB collection (${sanitizedCollectionName}):`, error);
    }
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private sanitizeCollectionName(name: string): string {
    // Chroma collections require name starting with alphanumeric, containing only alphanumeric, underscores, hyphens, and length between 3 and 63 characters
    let sanitized = name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    if (sanitized.length < 3) {
      sanitized = sanitized + '_col';
    }
    if (sanitized.length > 63) {
      sanitized = sanitized.substring(0, 63);
    }
    // Make sure it starts with alphanumeric
    if (!/^[a-z0-9]/.test(sanitized)) {
      sanitized = 'a_' + sanitized.substring(1);
    }
    return sanitized;
  }
}
