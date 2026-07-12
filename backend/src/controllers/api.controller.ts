import { Controller, Post, Get, Delete, Patch, Body, Param, Res, UseInterceptors, UploadedFile, BadRequestException, NotFoundException, Query, StreamableFile, UseGuards, Req, ForbiddenException, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Types, Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CloudAiService } from '../services/cloud-ai.service';
import { LocalAiService } from '../services/local-ai.service';
import { DocumentProcessorService } from '../services/document-processor.service';
import { VectorStoreService } from '../services/vector-store.service';
import { HistoryService } from '../services/history.service';
import { CollectionsService } from '../services/collections.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Schemas
import { User } from '../schemas/user.schema';
import { Workspace } from '../schemas/workspace.schema';
import { DocumentInfoModel } from '../schemas/document.schema';
import { CollectionModel } from '../schemas/collection.schema';
import { NotificationModel } from '../schemas/notification.schema';
import { ActivityModel } from '../schemas/activity.schema';
import { UsageModel } from '../schemas/usage.schema';
import { ConversationModel } from '../schemas/conversation.schema';

import * as fs from 'fs';
import * as path from 'path';

@Controller('api')
export class ApiController {
  private readonly logger = new Logger(ApiController.name);
  private searchDurations: number[] = [];
  private responseDurations: number[] = [];

  constructor(
    private cloudAiService: CloudAiService,
    private localAiService: LocalAiService,
    private documentProcessor: DocumentProcessorService,
    private vectorStore: VectorStoreService,
    private historyService: HistoryService,
    private collectionsService: CollectionsService,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Workspace.name) private workspaceModel: Model<Workspace>,
    @InjectModel(DocumentInfoModel.name) private docModel: Model<DocumentInfoModel>,
    @InjectModel(CollectionModel.name) private colModel: Model<CollectionModel>,
    @InjectModel(ConversationModel.name) private convModel: Model<ConversationModel>,
    @InjectModel(NotificationModel.name) private notificationModel: Model<NotificationModel>,
    @InjectModel(ActivityModel.name) private activityModel: Model<ActivityModel>,
    @InjectModel(UsageModel.name) private usageModel: Model<UsageModel>
  ) {}

  // Log Workspace Activity helper
  private async logActivity(workspaceId: any, userId: any, action: string) {
    try {
      const log = new this.activityModel({
        workspaceId: new Types.ObjectId(workspaceId),
        userId: new Types.ObjectId(userId),
        action,
      });
      await log.save();
    } catch (err) {
      console.error('Failed to log workspace activity:', err);
    }
  }

  // Log Notification helper
  private async createNotification(workspaceId: any, type: 'document_indexed' | 'invite_received' | 'weekly_summary', title: string, message: string) {
    try {
      const notif = new this.notificationModel({
        workspaceId: new Types.ObjectId(workspaceId),
        type,
        title,
        message,
        read: false,
      });
      await notif.save();
    } catch (err) {
      console.error('Failed to create notification:', err);
    }
  }

  // Increment Usage helper
  private async incrementUsage(workspaceId: any, tokens: number = 0) {
    try {
      const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
      await this.usageModel.updateOne(
        { workspaceId: new Types.ObjectId(workspaceId) as any, month: currentMonth } as any,
        { $inc: { cloudCallsCount: 1, tokenCount: tokens } } as any,
        { upsert: true }
      );
    } catch (err) {
      console.error('Failed to update cloud usage:', err);
    }
  }

  // --- CLOUD AI CHAT ---
  @Post('chat')
  @UseGuards(JwtAuthGuard)
  async cloudChat(@Body() body: any, @Req() req: any, @Res() res: Response) {
    const workspaceId = req.user.workspaceId;
    
    const currentMonth = new Date().toISOString().substring(0, 7);
    const usage = await this.usageModel.findOne({ workspaceId: new Types.ObjectId(workspaceId) as any, month: currentMonth } as any);
    const cloudCalls = usage?.cloudCallsCount || 0;
    
    if (req.user.plan === 'standard-pro' && cloudCalls >= 500) {
      throw new ForbiddenException('Monthly cloud query limit reached for Standard Pro. Please upgrade to Enterprise.');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const { conversationId, messages, temperature, topP, maxTokens } = body;
    const startTime = Date.now();

    const stream = this.cloudAiService.streamChat(messages, {
      temperature,
      topP,
      maxTokens,
    });

    let fullAnswer = '';

    stream.subscribe({
      next: (chunk) => {
        if (chunk.content) {
          fullAnswer += chunk.content;
        }
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      },
      error: (err) => {
        res.write(`data: ${JSON.stringify({ content: `\n\n[Stream Error]: ${err.message}`, done: true })}\n\n`);
        res.end();
      },
      complete: async () => {
        const duration = Date.now() - startTime;
        this.responseDurations.push(duration);
        
        // Approximate token usage
        const estTokens = Math.round((fullAnswer.length + JSON.stringify(messages).length) / 4);
        await this.incrementUsage(workspaceId, estTokens);

        if (conversationId) {
          const lastUserMessage = messages[messages.length - 1]?.content || '';
          await this.historyService.addMessage(conversationId, 'user', lastUserMessage, workspaceId);
          await this.historyService.addMessage(conversationId, 'assistant', fullAnswer, workspaceId);
        }
        res.end();
      },
    });
  }

  @Post('image')
  @UseGuards(JwtAuthGuard)
  async generateImage(@Body('prompt') prompt: string, @Req() req: any) {
    if (!prompt) {
      throw new BadRequestException('Prompt is required');
    }
    const workspaceId = req.user.workspaceId;
    await this.incrementUsage(workspaceId, 250); // assume flat cost per image gen
    return this.cloudAiService.generateImage(prompt);
  }

  @Post('speech')
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(JwtAuthGuard)
  async transcribeSpeech(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('Audio file is required');
    }
    const workspaceId = req.user.workspaceId;
    await this.incrementUsage(workspaceId, 50); // assume flat cost per speech gen
    return this.cloudAiService.transcribeSpeech(file.buffer, file.mimetype);
  }

  // --- CONVERSATION HISTORY ---
  @Get('history')
  @UseGuards(JwtAuthGuard)
  getHistory(@Req() req: any) {
    return this.historyService.getConversations(req.user.workspaceId);
  }

  @Post('history')
  @UseGuards(JwtAuthGuard)
  createConversation(@Body('mode') mode: 'cloud' | 'local', @Body('title') title: string, @Req() req: any) {
    return this.historyService.createConversation(mode, title, req.user.workspaceId);
  }

  @Patch('history/:id')
  @UseGuards(JwtAuthGuard)
  updateConversation(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.historyService.updateConversation(id, req.user.workspaceId, body);
  }

  @Delete('history/:id')
  @UseGuards(JwtAuthGuard)
  async deleteConversation(@Param('id') id: string, @Req() req: any) {
    const success = await this.historyService.deleteConversation(id, req.user.workspaceId);
    if (!success) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }
    return { success: true };
  }

  @Delete('history')
  @UseGuards(JwtAuthGuard)
  async clearHistory(@Req() req: any) {
    await this.historyService.clearAll(req.user.workspaceId);
    return { success: true };
  }

  // --- LOCAL AI & RAG ---
  @Post('local/retrieve')
  @UseGuards(JwtAuthGuard)
  async localRetrieve(@Body() body: any, @Req() req: any) {
    const workspaceId = req.user.workspaceId;
    const { question, collectionId, topK, minScore, retrievalStrategy } = body;
    if (!question) {
      throw new BadRequestException('Question is required');
    }

    const collection = await this.collectionsService.getCollection(collectionId, workspaceId) || { name: 'General Research' };

    const queryEmbedding = await this.localAiService.generateEmbedding(question);
    const matched = await this.vectorStore.similaritySearch(
      collection.name,
      queryEmbedding,
      Number(topK) || 5,
      Number(minScore) || 0.45,
      retrievalStrategy || 'mmr'
    );

    return matched.map((m) => ({
      documentId: m.metadata.documentId,
      documentName: m.metadata.documentName,
      chunkIndex: m.metadata.chunkIndex,
      similarity: m.similarity,
      text: m.text,
      pageNumber: m.metadata.pageNumber,
    }));
  }

  @Post('local/chat')
  @UseGuards(JwtAuthGuard)
  async localChat(@Body() body: any, @Req() req: any, @Res() res: Response) {
    const workspaceId = req.user.workspaceId;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const { conversationId, question, collectionId, topK, minScore, systemPrompt, retrievalStrategy, overrideChunks } = body;
    const startTime = Date.now();

    const collection = await this.collectionsService.getCollection(collectionId, workspaceId) || { name: 'General Research' };

    const stream = this.localAiService.streamLocalChat(question, collection.name, {
      topK: Number(topK) || 5,
      minScore: Number(minScore) || 0.75,
      systemPrompt,
      retrievalStrategy,
      overrideChunks,
    });

    let fullAnswer = '';
    let citations: any[] = [];
    let metrics: any = null;

    stream.subscribe({
      next: (event) => {
        if (event.type === 'citation') {
          citations = event.data;
        } else if (event.type === 'token') {
          fullAnswer += event.data;
        } else if (event.type === 'metrics') {
          metrics = event.data;
        }
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      },
      error: (err) => {
        res.write(`data: ${JSON.stringify({ type: 'error', data: err.message })}\n\n`);
        res.end();
      },
      complete: async () => {
        const duration = Date.now() - startTime;
        this.responseDurations.push(duration);
        if (conversationId) {
          await this.historyService.addMessage(conversationId, 'user', question, workspaceId);
          await this.historyService.addMessage(conversationId, 'assistant', fullAnswer, workspaceId, { citations, metrics });
        }
        res.end();
      },
    });
  }

  // --- DOCUMENTS MANAGEMENT ---
  @Post('documents/upload')
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(JwtAuthGuard)
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Req() req: any
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const workspaceId = req.user.workspaceId;
    const collectionId = body.collectionId || 'default';
    const chunkSize = Number(body.chunkSize) || 512;
    const chunkOverlap = Number(body.chunkOverlap) || 100;

    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    
    // --- Document Diffing Engine ---
    const existingDoc = await this.docModel.findOne({ name: originalName, workspaceId: new Types.ObjectId(workspaceId) as any } as any);
    let diffLog = '';
    let oldDocIdToDelete: string | null = null;
    
    const rawText = await this.documentProcessor.parseDocument(file.buffer, originalName);
    const cleanText = this.documentProcessor.cleanText(rawText);
    const pagesText = cleanText.split('--- PAGE_BREAK_MARKER ---');
    const newHashes: string[] = [];

    const chunkSizeChar = chunkSize * 4;
    const chunkOverlapChar = chunkOverlap * 4;

    for (let pageIdx = 0; pageIdx < pagesText.length; pageIdx++) {
      const pageContent = pagesText[pageIdx].trim();
      if (!pageContent) continue;
      const chunks = this.documentProcessor.splitText(pageContent, chunkSizeChar, chunkOverlapChar);
      for (const chunk of chunks) {
        newHashes.push(this.documentProcessor.getChunkHash(chunk));
      }
    }

    if (existingDoc && existingDoc.chunkHashes && existingDoc.chunkHashes.length > 0) {
      const oldHashes = existingDoc.chunkHashes;
      const oldHashSet = new Set(oldHashes);
      const newHashSet = new Set(newHashes);
      
      let unchanged = 0;
      let changed = 0;
      
      for (const h of newHashes) {
        if (oldHashSet.has(h)) {
          unchanged++;
        } else {
          changed++;
        }
      }
      
      const deletedChunks = oldHashes.filter(h => !newHashSet.has(h)).length;
      diffLog = `Re-uploaded document diff: ${changed} chunks modified/new, ${unchanged} unchanged, ${deletedChunks} chunks purged.`;
      
      oldDocIdToDelete = existingDoc.id;
    }

    const documentId = 'doc_' + Math.random().toString(36).substring(2, 11);
    const extension = path.extname(originalName);
    const storedFileName = `${documentId}${extension}`;
    const relativePath = path.join('documents', storedFileName);
    const absolutePath = path.join(process.cwd(), '..', relativePath);

    // Ensure documents dir exists
    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file to disk
    fs.writeFileSync(absolutePath, file.buffer);

    // Register document in db
    const docInfo = await this.documentProcessor.registerDocument(
      documentId,
      originalName,
      relativePath,
      file.size,
      workspaceId,
      'processing'
    );

    // Update chunk hashes directly
    await this.docModel.updateOne({ id: documentId } as any, { $set: { chunkHashes: newHashes } } as any);

    // Async Ingestion Process
    (async () => {
      try {
        const collection = await this.collectionsService.getCollection(collectionId, workspaceId) || { name: 'General Research' };
        const vectorItems: any[] = [];
        let chunkIndexGlobal = 0;

        for (let pageIdx = 0; pageIdx < pagesText.length; pageIdx++) {
          const pageContent = pagesText[pageIdx].trim();
          if (!pageContent) continue;
          
          const pageNumber = pageIdx + 1;
          const chunks = this.documentProcessor.splitText(pageContent, chunkSizeChar, chunkOverlapChar);

          for (let i = 0; i < chunks.length; i++) {
            const chunkText = chunks[i];
            const embedding = await this.localAiService.generateEmbedding(chunkText);
            vectorItems.push({
              id: `${documentId}_chunk_${chunkIndexGlobal}`,
              text: chunkText,
              metadata: {
                documentId,
                documentName: originalName,
                chunkIndex: chunkIndexGlobal,
                pageNumber,
              },
              embedding,
            });
            chunkIndexGlobal++;
          }
        }

        // Clean up old document embeddings
        if (oldDocIdToDelete) {
          await this.vectorStore.deleteDocument(collection.name, oldDocIdToDelete);
          await this.collectionsService.removeDocumentFromAllCollections(oldDocIdToDelete, workspaceId);
          await this.docModel.deleteOne({ id: oldDocIdToDelete } as any);
        }

        // Add to vector store
        if (vectorItems.length > 0) {
          await this.vectorStore.addDocuments(collection.name, vectorItems);
        }

        // Complete registration
        await this.documentProcessor.updateDocument(documentId, workspaceId, {
          status: 'completed',
          chunksCount: chunkIndexGlobal,
          embeddingsCount: chunkIndexGlobal,
        });

        // Add to collection
        await this.collectionsService.addDocumentToCollection(collectionId, documentId, workspaceId);

        // Logs activity & notifications
        await this.logActivity(workspaceId, req.user._id, diffLog || `Uploaded and indexed document: ${originalName}`);
        await this.createNotification(
          workspaceId,
          'document_indexed',
          'Document Indexing Complete',
          `Successfully processed and embedded ${originalName}.`
        );
      } catch (err) {
        this.logger.error(`Document upload ingestion failed for ${originalName}:`, err);
        await this.documentProcessor.updateDocument(documentId, workspaceId, {
          status: 'failed',
        });
        await this.createNotification(
          workspaceId,
          'document_indexed',
          'Document Indexing Failed',
          `An error occurred while indexing ${originalName}.`,
        );
      }
    })();

    return docInfo;
  }

  @Post('documents/reindex')
  @UseGuards(JwtAuthGuard)
  async reindexDocument(@Body() body: any, @Req() req: any) {
    const workspaceId = req.user.workspaceId;
    const { id, collectionId = 'default', chunkSize = 512, chunkOverlap = 100 } = body;
    const doc = await this.documentProcessor.getDocument(id, workspaceId);
    if (!doc) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    const absolutePath = path.join(process.cwd(), '..', doc.path);
    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException(`Source file for ${doc.name} was not found on disk`);
    }

    await this.documentProcessor.updateDocument(id, workspaceId, { status: 'processing' });

    (async () => {
      try {
        const collection = await this.collectionsService.getCollection(collectionId, workspaceId) || { name: 'General Research' };
        const buffer = fs.readFileSync(absolutePath);

        const rawText = await this.documentProcessor.parseDocument(buffer, doc.name);
        const cleanText = this.documentProcessor.cleanText(rawText);

        const pagesText = cleanText.split('--- PAGE_BREAK_MARKER ---');
        const vectorItems: any[] = [];
        const newHashes: string[] = [];
        let chunkIndexGlobal = 0;

        const chunkSizeChar = Number(chunkSize) * 4;
        const chunkOverlapChar = Number(chunkOverlap) * 4;

        for (let pageIdx = 0; pageIdx < pagesText.length; pageIdx++) {
          const pageContent = pagesText[pageIdx].trim();
          if (!pageContent) continue;
          
          const pageNumber = pageIdx + 1;
          const chunks = this.documentProcessor.splitText(pageContent, chunkSizeChar, chunkOverlapChar);

          for (let i = 0; i < chunks.length; i++) {
            const chunkText = chunks[i];
            newHashes.push(this.documentProcessor.getChunkHash(chunkText));
            const embedding = await this.localAiService.generateEmbedding(chunkText);
            vectorItems.push({
              id: `${id}_chunk_${chunkIndexGlobal}`,
              text: chunkText,
              metadata: {
                documentId: id,
                documentName: doc.name,
                chunkIndex: chunkIndexGlobal,
                pageNumber,
              },
              embedding,
            });
            chunkIndexGlobal++;
          }
        }

        // Remove old vector references
        await this.vectorStore.deleteDocument(collection.name, id);

        // Add new
        if (vectorItems.length > 0) {
          await this.vectorStore.addDocuments(collection.name, vectorItems);
        }

        await this.docModel.updateOne({ id } as any, { $set: { chunkHashes: newHashes } } as any);

        await this.documentProcessor.updateDocument(id, workspaceId, {
          status: 'completed',
          chunksCount: chunkIndexGlobal,
          embeddingsCount: chunkIndexGlobal,
        });

        await this.logActivity(workspaceId, req.user._id, `Re-indexed document: ${doc.name}`);
      } catch (err) {
        await this.documentProcessor.updateDocument(id, workspaceId, { status: 'failed' });
      }
    })();

    return { success: true };
  }

  @Get('documents')
  @UseGuards(JwtAuthGuard)
  getDocuments(@Req() req: any) {
    return this.documentProcessor.getDocuments(req.user.workspaceId);
  }

  @Delete('documents/:id')
  @UseGuards(JwtAuthGuard)
  async deleteDocument(@Param('id') id: string, @Req() req: any) {
    const workspaceId = req.user.workspaceId;
    const doc = await this.documentProcessor.getDocument(id, workspaceId);
    if (!doc) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    // Delete chunks from all collection indexes in vector db
    const collections = await this.collectionsService.getCollections(workspaceId);
    for (const col of collections) {
      if (col.documentIds.includes(id)) {
        await this.vectorStore.deleteDocument(col.name, id);
      }
    }

    // Remove from registry lists and local file
    await this.collectionsService.removeDocumentFromAllCollections(id, workspaceId);
    const success = await this.documentProcessor.deleteDocument(id, workspaceId);
    
    await this.logActivity(workspaceId, req.user._id, `Deleted document: ${doc.name}`);
    return { success };
  }

  @Get('documents/download/:id')
  @UseGuards(JwtAuthGuard)
  async downloadDocument(@Param('id') id: string, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    const doc = await this.documentProcessor.getDocument(id, req.user.workspaceId);
    if (!doc) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    const absolutePath = path.join(process.cwd(), '..', doc.path);
    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException('Document file not found on disk');
    }

    const fileStream = fs.createReadStream(absolutePath);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.name)}"`,
    });
    return new StreamableFile(fileStream);
  }

  @Get('documents/stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@Req() req: any) {
    const workspaceId = req.user.workspaceId;
    const docs = await this.documentProcessor.getDocuments(workspaceId);
    const collections = await this.collectionsService.getCollections(workspaceId);
    const conversations = await this.historyService.getConversations(workspaceId);

    const documentsCount = docs.length;
    const collectionsCount = collections.length;
    const conversationsCount = conversations.length;
    let messagesCount = 0;
    let cloudMessagesCount = 0;
    let localMessagesCount = 0;

    conversations.forEach((c) => {
      messagesCount += c.messages.length;
      if (c.mode === 'cloud') {
        cloudMessagesCount += c.messages.length;
      } else {
        localMessagesCount += c.messages.length;
      }
    });

    const chunksCount = docs.reduce((acc, d) => acc + d.chunksCount, 0);
    const embeddingsCount = docs.reduce((acc, d) => acc + d.embeddingsCount, 0);

    let storageUsedBytes = 0;
    let dbSizeBytes = 0;

    const docsDir = path.join(process.cwd(), '..', 'documents');
    const uploadsDir = path.join(process.cwd(), '..', 'uploads');
    const vectorDir = path.join(process.cwd(), '..', 'vector-db');

    const walkSize = (dir: string): number => {
      let size = 0;
      if (!fs.existsSync(dir)) return 0;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          size += walkSize(filePath);
        } else {
          size += stat.size;
        }
      }
      return size;
    };

    storageUsedBytes = walkSize(docsDir) + walkSize(uploadsDir);
    dbSizeBytes = walkSize(vectorDir);

    const storageUsedMb = Number((storageUsedBytes / (1024 * 1024)).toFixed(2));
    const databaseSizeMb = Number((dbSizeBytes / (1024 * 1024)).toFixed(2));

    const avgSearchTimeMs =
      this.searchDurations.length > 0
        ? Math.round(this.searchDurations.reduce((a, b) => a + b, 0) / this.searchDurations.length)
        : 12;

    const avgResponseTimeMs =
      this.responseDurations.length > 0
        ? Math.round(this.responseDurations.reduce((a, b) => a + b, 0) / this.responseDurations.length)
        : 850;

    const ollamaConnected = await this.localAiService.checkOllamaStatus();
    const vectorDbEngine = this.vectorStore.isFallbackActive() ? 'json_fallback' : 'chroma';
    const hfTokenConfigured = this.cloudAiService.isTokenConfigured();

    return {
      documentsCount,
      collectionsCount,
      conversationsCount,
      messagesCount,
      chunksCount,
      embeddingsCount,
      databaseSizeMb,
      avgSearchTimeMs,
      avgResponseTimeMs,
      storageUsedMb,
      cloudMessagesCount,
      localMessagesCount,
      systemHealth: {
        ollamaConnected,
        vectorDbEngine,
        hfTokenConfigured,
      },
    };
  }

  // --- COLLECTIONS ROUTING ---
  @Get('collections')
  @UseGuards(JwtAuthGuard)
  getCollections(@Req() req: any) {
    return this.collectionsService.getCollections(req.user.workspaceId);
  }

  @Post('collections')
  @UseGuards(JwtAuthGuard)
  async createCollection(@Body('name') name: string, @Body('description') description: string, @Req() req: any) {
    if (!name) {
      throw new BadRequestException('Collection name is required');
    }
    const col = await this.collectionsService.createCollection(name, description, req.user.workspaceId);
    await this.logActivity(req.user.workspaceId, req.user._id, `Created collection: ${name}`);
    return col;
  }

  @Patch('collections/:id')
  @UseGuards(JwtAuthGuard)
  updateCollection(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.collectionsService.updateCollection(id, req.user.workspaceId, body);
  }

  @Delete('collections/:id')
  @UseGuards(JwtAuthGuard)
  async deleteCollection(@Param('id') id: string, @Req() req: any) {
    const col = await this.collectionsService.getCollection(id, req.user.workspaceId);
    const success = await this.collectionsService.deleteCollection(id, req.user.workspaceId);
    if (success && col) {
      await this.logActivity(req.user.workspaceId, req.user._id, `Deleted collection: ${col.name}`);
    }
    return { success };
  }

  // --- GLOBAL SEARCH ---
  @Get('search')
  @UseGuards(JwtAuthGuard)
  async search(@Query('q') query: string, @Query('collectionId') collectionId: string, @Req() req: any) {
    if (!query) {
      throw new BadRequestException('Query parameter is required');
    }

    const workspaceId = req.user.workspaceId;
    const startTime = Date.now();
    const queryEmbedding = await this.localAiService.generateEmbedding(query);

    let collections = await this.collectionsService.getCollections(workspaceId);
    if (collectionId) {
      collections = collections.filter((c) => c.id === collectionId);
    }

    const allResults: any[] = [];
    for (const col of collections) {
      const results = await this.vectorStore.similaritySearch(col.name, queryEmbedding, 5, 0.1);
      results.forEach((r) => {
        allResults.push({
          ...r,
          collectionId: col.id,
          collectionName: col.name,
        });
      });
    }

    // Sort globally
    allResults.sort((a, b) => b.similarity - a.similarity);

    const duration = Date.now() - startTime;
    this.searchDurations.push(duration);

    return {
      results: allResults.slice(0, 10),
      durationMs: duration,
    };
  }

  // --- NOTIFICATIONS CENTER ---
  @Get('notifications')
  @UseGuards(JwtAuthGuard)
  async getNotifications(@Req() req: any) {
    return this.notificationModel
      .find({ workspaceId: new Types.ObjectId(req.user.workspaceId) as any } as any)
      .sort({ createdAt: -1 })
      .limit(30);
  }

  @Patch('notifications/:id/read')
  @UseGuards(JwtAuthGuard)
  async markNotificationRead(@Param('id') id: string, @Req() req: any) {
    await this.notificationModel.updateOne(
      { _id: new Types.ObjectId(id) as any, workspaceId: new Types.ObjectId(req.user.workspaceId) as any } as any,
      { $set: { read: true } } as any
    );
    return { success: true };
  }

  // --- ACTIVITY FEED ---
  @Get('activity')
  @UseGuards(JwtAuthGuard)
  async getActivity(@Req() req: any) {
    return this.activityModel
      .find({ workspaceId: new Types.ObjectId(req.user.workspaceId) as any } as any)
      .populate('userId', 'name email avatarUrl')
      .sort({ createdAt: -1 })
      .limit(50);
  }

  // --- USAGE COUNTERS ---
  @Get('usage/meter')
  @UseGuards(JwtAuthGuard)
  async getUsageMeter(@Req() req: any) {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const usage = await this.usageModel.findOne({
      workspaceId: new Types.ObjectId(req.user.workspaceId) as any,
      month: currentMonth,
    } as any);
    return {
      month: currentMonth,
      cloudCallsCount: usage?.cloudCallsCount || 0,
      tokenCount: usage?.tokenCount || 0,
    };
  }

  // --- WORKSPACE & MEMBERS MANAGEMENT ---
  @Get('workspaces/members')
  @UseGuards(JwtAuthGuard)
  async getMembers(@Req() req: any) {
    const ws = await this.workspaceModel
      .findById(req.user.workspaceId)
      .populate('members.userId', 'name email avatarUrl');
    if (!ws) throw new NotFoundException('Workspace not found');
    return ws.members;
  }

  @Post('workspaces/invite')
  @UseGuards(JwtAuthGuard)
  async inviteMember(@Body('email') email: string, @Req() req: any) {
    const ws = await this.workspaceModel.findById(req.user.workspaceId);
    if (!ws) throw new NotFoundException('Workspace not found');

    const prospectiveUser = await this.userModel.findOne({ email: email.toLowerCase() });
    if (!prospectiveUser) {
      throw new BadRequestException('User with that email does not have an Intellexa account');
    }

    // Check if already in workspace
    const exists = ws.members.some(m => m.userId.toString() === prospectiveUser._id.toString());
    if (exists) {
      throw new BadRequestException('User is already a member of this workspace');
    }

    ws.members.push({ userId: prospectiveUser._id as any, role: 'viewer' });
    await ws.save();

    await this.logActivity(ws._id, req.user._id, `Invited teammate: ${prospectiveUser.name}`);
    await this.createNotification(
      ws._id,
      'invite_received',
      'Workspace Membership Updated',
      `${prospectiveUser.name} has been added as a viewer.`
    );

    return { success: true };
  }

  @Patch('workspaces/members/:userId')
  @UseGuards(JwtAuthGuard)
  async updateMemberRole(
    @Param('userId') userIdToUpdate: string,
    @Body('role') role: 'owner' | 'editor' | 'viewer',
    @Req() req: any
  ) {
    const ws = await this.workspaceModel.findById(req.user.workspaceId);
    if (!ws) throw new NotFoundException('Workspace not found');

    // Confirm requestor is Owner
    const currentMember = ws.members.find(m => m.userId.toString() === req.user._id.toString());
    if (!currentMember || currentMember.role !== 'owner') {
      throw new ForbiddenException('Only workspace owners can manage memberships');
    }

    const targetMember = ws.members.find(m => m.userId.toString() === userIdToUpdate);
    if (!targetMember) throw new NotFoundException('Target user is not a member of this workspace');

    targetMember.role = role;
    await ws.save();
    return { success: true };
  }

  // --- PUBLIC SHARE WORKSPACE PAGE ---
  @Get('public/w/:slug')
  async getPublicWorkspace(@Param('slug') slug: string) {
    const ws = await this.workspaceModel.findOne({ slug, isPublic: true });
    if (!ws) {
      throw new NotFoundException('Public workspace not found');
    }

    const publicCollections = await this.colModel.find({
      workspaceId: ws._id as any,
      id: { $in: ws.publicCollectionIds },
    } as any);

    return {
      workspaceName: ws.name,
      slug: ws.slug,
      collections: publicCollections.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
      })),
    };
  }

  @Post('public/w/:slug/chat')
  async publicChat(@Param('slug') slug: string, @Body() body: any, @Res() res: Response) {
    const ws = await this.workspaceModel.findOne({ slug, isPublic: true });
    if (!ws) throw new NotFoundException('Public workspace not found');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const { question, collectionId, topK } = body;

    // Confirm collection is in publicCollectionIds
    if (!ws.publicCollectionIds.includes(collectionId)) {
      throw new ForbiddenException('Selected collection is not public');
    }

    const collection = await this.colModel.findOne({ id: collectionId, workspaceId: ws._id as any } as any);
    if (!collection) throw new NotFoundException('Collection not found');

    const stream = this.localAiService.streamLocalChat(question, collection.name, {
      topK: Number(topK) || 3,
      minScore: 0.5,
      retrievalStrategy: 'similarity',
    });

    stream.subscribe({
      next: (event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      },
      error: (err) => {
        res.write(`data: ${JSON.stringify({ type: 'error', data: err.message })}\n\n`);
        res.end();
      },
      complete: () => {
        res.end();
      },
    });
  }

  // --- PERSONAL ACCOUNT EXPORT & DELETION ---
  @Get('account/export')
  @UseGuards(JwtAuthGuard)
  async exportData(@Req() req: any, @Res() res: Response) {
    const workspaceId = req.user.workspaceId;
    const documents = await this.docModel.find({ workspaceId: new Types.ObjectId(workspaceId) as any } as any);
    const collections = await this.colModel.find({ workspaceId: new Types.ObjectId(workspaceId) as any } as any);
    const conversations = await this.convModel.find({ workspaceId: new Types.ObjectId(workspaceId) as any } as any);

    const bundle = {
      user: {
        name: req.user.name,
        email: req.user.email,
        plan: req.user.plan,
        createdAt: req.user.createdAt,
      },
      documents: documents.map(d => ({
        name: d.name,
        size: d.size,
        status: d.status,
        chunksCount: d.chunksCount,
      })),
      collections: collections.map(c => ({
        name: c.name,
        description: c.description,
        documentIds: c.documentIds,
      })),
      conversations: conversations.map(c => ({
        title: c.title,
        mode: c.mode,
        messages: c.messages,
      })),
    };

    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="intellexa_account_export.json"',
    });
    res.send(JSON.stringify(bundle, null, 2));
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  async deleteAccount(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const userId = req.user._id;
    const workspaceId = req.user.workspaceId;

    // Delete workspace documents physically and vector db references
    const documents = await this.docModel.find({ workspaceId: new Types.ObjectId(workspaceId) as any } as any);
    const collections = await this.colModel.find({ workspaceId: new Types.ObjectId(workspaceId) as any } as any);
    
    for (const col of collections) {
      await this.vectorStore.deleteCollection(col.name);
    }

    for (const doc of documents) {
      const absolutePath = path.join(process.cwd(), '..', doc.path);
      try {
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
      } catch (err) {
        console.error(`Error deleting doc file ${doc.id}:`, err);
      }
    }

    // Delete Mongo entries
    await this.docModel.deleteMany({ workspaceId: new Types.ObjectId(workspaceId) as any } as any);
    await this.colModel.deleteMany({ workspaceId: new Types.ObjectId(workspaceId) as any } as any);
    await this.convModel.deleteMany({ workspaceId: new Types.ObjectId(workspaceId) as any } as any);
    await this.notificationModel.deleteMany({ workspaceId: new Types.ObjectId(workspaceId) as any } as any);
    await this.activityModel.deleteMany({ workspaceId: new Types.ObjectId(workspaceId) as any } as any);
    await this.usageModel.deleteMany({ workspaceId: new Types.ObjectId(workspaceId) as any } as any);
    
    await this.workspaceModel.deleteMany({ ownerId: userId as any } as any);
    await this.userModel.deleteOne({ _id: userId as any } as any);

    // Clear session cookie
    res.clearCookie('jwt_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return { success: true };
  }

  // --- PROFILE MANAGEMENT ---
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Body() body: any, @Req() req: any) {
    const { name, email, avatar } = body;
    const updates: any = {};
    if (name) updates.name = name;
    if (email) updates.email = email.toLowerCase();
    if (avatar) updates.avatar = avatar;
    await this.userModel.updateOne(
      { _id: req.user._id as any },
      { $set: updates } as any
    );
    return { success: true };
  }

  @Post('profile/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      // Use Cloudinary for avatar upload
      const cloudinary = require('cloudinary').v2;
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'intellexa', resource_type: 'image' },
          (err: any, result: any) => {
            if (err) reject(err);
            else resolve(result);
          }
        );
        uploadStream.end(file.buffer);
      });

      const avatarUrl = (uploadResult as any).secure_url;

      // Update user avatar
      await this.userModel.updateOne(
        { _id: req.user._id as any },
        { $set: { avatar: avatarUrl } } as any
      );

      return { avatarUrl };
    } catch (err: any) {
      this.logger.error(`Avatar upload failed: ${err.message}`, err.stack);
      throw new Error(`Avatar upload failed: ${err.message || 'Unknown error'}`);
    }
  }
}
