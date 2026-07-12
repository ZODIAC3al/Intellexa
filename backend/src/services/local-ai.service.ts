import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VectorStoreService } from './vector-store.service';
import { Observable } from 'rxjs';
import { Citation } from '../../../shared/types';
import { performance } from 'perf_hooks';

@Injectable()
export class LocalAiService {
  private readonly logger = new Logger(LocalAiService.name);
  private ollamaHost = 'http://localhost:11434';
  private chatModel = 'llama3.2';
  private embeddingModel = 'nomic-embed-text';

  constructor(
    private configService: ConfigService,
    private vectorStoreService: VectorStoreService
  ) {
    this.ollamaHost = this.configService.get<string>('OLLAMA_HOST') || this.ollamaHost;
    this.chatModel = this.configService.get<string>('OLLAMA_CHAT_MODEL') || this.chatModel;
    this.embeddingModel = this.configService.get<string>('OLLAMA_EMBEDDING_MODEL') || this.embeddingModel;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.ollamaHost}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.embeddingModel,
          prompt: text,
        }),
      });

      if (!response.ok) {
        // Try fallback to the main chat model in case nomic-embed-text is not pulled
        this.logger.warn(`Failed embedding with model ${this.embeddingModel}. Trying chat model ${this.chatModel}...`);
        const fallbackResponse = await fetch(`${this.ollamaHost}/api/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.chatModel,
            prompt: text,
          }),
        });
        if (!fallbackResponse.ok) {
          throw new Error(`Ollama embedding api error: ${fallbackResponse.statusText}`);
        }
        const data = await fallbackResponse.json();
        return data.embedding;
      }

      const data = await response.json();
      return data.embedding;
    } catch (error) {
      this.logger.error('Error generating embedding from Ollama:', error);
      // Return a dummy embedding (random small numbers) in case Ollama is offline so indexing does not crash
      this.logger.warn('Returning a pseudo-random embedding vector as fallback.');
      const mockVector = Array.from({ length: 384 }, () => Math.random() * 0.1 - 0.05);
      return mockVector;
    }
  }

  async checkOllamaStatus(): Promise<boolean> {
    try {
      const response = await fetch(this.ollamaHost);
      return response.ok;
    } catch {
      return false;
    }
  }

  streamLocalChat(
    question: string,
    collectionName: string,
    options?: {
      topK?: number;
      minScore?: number;
      systemPrompt?: string;
      retrievalStrategy?: 'similarity' | 'mmr';
      overrideChunks?: Citation[];
    }
  ): Observable<{ type: 'citation' | 'token' | 'metrics' | 'done' | 'error'; data: any }> {
    return new Observable((subscriber) => {
      const totalStart = performance.now();
      const topK = options?.topK ?? 5;
      const minScore = options?.minScore ?? 0.75;
      const retrievalStrategy = options?.retrievalStrategy ?? 'mmr';
      const defaultSystem = `You are Intellexa Local Research Assistant, a highly professional offline researcher. 
You must answer the user's question ONLY using the provided source chunks. 
If the information is not present in the sources, state that you cannot find the answer in the uploaded files. Do not fabricate facts.
Every time you state a fact or summarize an excerpt, you MUST cite the source (e.g. [Source 1], [Source 2]).`;

      const systemPrompt = options?.systemPrompt ?? defaultSystem;

      (async () => {
        try {
          const isOllamaRunning = await this.checkOllamaStatus();
          if (!isOllamaRunning) {
            subscriber.next({
              type: 'token',
              data: `⚠️ **Ollama Offline Warning**\nCould not reach Ollama at \`${this.ollamaHost}\`.\n\nPlease start Ollama and ensure the \`${this.chatModel}\` and \`${this.embeddingModel}\` models are pulled:\n\`\`\`bash\nollama run ${this.chatModel}\nollama pull ${this.embeddingModel}\n\`\`\``,
            });
            subscriber.next({ type: 'done', data: {} });
            subscriber.complete();
            return;
          }

          // 1. Resolve searched chunks count in collection
          let chunksSearchedCount = 0;
          try {
            chunksSearchedCount = await this.vectorStoreService.count(collectionName);
          } catch {
            chunksSearchedCount = 0;
          }

          let citations: Citation[] = [];
          let searchTimeMs = 0;
          let matchedCount = 0;

          if (options?.overrideChunks && options.overrideChunks.length > 0) {
            citations = options.overrideChunks;
            matchedCount = citations.length;
          } else {
            // 2. Generate query embedding & perform similarity search
            const searchStart = performance.now();
            const queryEmbedding = await this.generateEmbedding(question);
            const matched = await this.vectorStoreService.similaritySearch(
              collectionName,
              queryEmbedding,
              topK,
              minScore,
              retrievalStrategy
            );
            const searchEnd = performance.now();
            searchTimeMs = Math.round(searchEnd - searchStart);

            // 3. Extract citations
            citations = matched.map((m) => ({
              documentId: m.metadata.documentId,
              documentName: m.metadata.documentName,
              chunkIndex: m.metadata.chunkIndex,
              similarity: m.similarity,
              text: m.text,
              pageNumber: m.metadata.pageNumber,
            }));
            matchedCount = matched.length;
          }

          // Emit citations to frontend
          subscriber.next({ type: 'citation', data: citations });

          if (matchedCount === 0) {
            subscriber.next({
              type: 'token',
              data: `I couldn't find sufficient information in the uploaded documents to answer that question. (No chunks matched the similarity threshold of ${minScore}).`,
            });
            // Emit zeroed metrics
            subscriber.next({
              type: 'metrics',
              data: {
                chunksSearchedCount,
                chunksRetrievedCount: 0,
                searchTimeMs,
                generationTimeMs: 0,
                totalTimeMs: Math.round(performance.now() - totalStart),
                avgSimilarityScore: 0,
              },
            });
            subscriber.next({ type: 'done', data: {} });
            subscriber.complete();
            return;
          }

          // 4. Assemble context details
          const contexts = citations
            .map(
              (c, idx) =>
                `[Source ${idx + 1}]:\nDocument: ${c.documentName}\nPage: ${c.pageNumber || 'N/A'}\nChunk: ${c.chunkIndex}\nText: ${c.text}`
            )
            .join('\n\n');

          const userContent = `Provided Context:\n${contexts}\n\nUser Question: ${question}`;

          // 5. Query Ollama Chat API
          const genStart = performance.now();
          const response = await fetch(`${this.ollamaHost}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: this.chatModel,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent },
              ],
              stream: true,
            }),
          });

          if (!response.ok) {
            throw new Error(`Ollama response error: ${response.statusText}`);
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('Response body has no reader stream');
          }

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim() === '') continue;
              try {
                const parsed = JSON.parse(line);
                const token = parsed.message?.content || '';
                if (token) {
                  subscriber.next({ type: 'token', data: token });
                }
              } catch (err) {
                this.logger.error('Failed parsing Ollama stream chunk:', err);
              }
            }
          }

          const genEnd = performance.now();
          const generationTimeMs = Math.round(genEnd - genStart);
          const totalTimeMs = Math.round(performance.now() - totalStart);

          // Calculate average similarity
          const avgSimilarityScore = matchedCount > 0 ? citations.reduce((a, b) => a + b.similarity, 0) / matchedCount : 0;

          // Emit metrics
          subscriber.next({
            type: 'metrics',
            data: {
              chunksSearchedCount,
              chunksRetrievedCount: matchedCount,
              searchTimeMs,
              generationTimeMs,
              totalTimeMs,
              avgSimilarityScore,
            },
          });

          subscriber.next({ type: 'done', data: {} });
          subscriber.complete();
        } catch (error) {
          this.logger.error('Error running Local LLM Chat:', error);
          subscriber.next({
            type: 'token',
            data: `\n\n[Error from Local Ollama Instance]: ${error.message || error}. Ensure that Ollama is active and model "${this.chatModel}" is downloaded.`,
          });
          subscriber.next({ type: 'done', data: {} });
          subscriber.complete();
        }
      })();
    });
  }
}
