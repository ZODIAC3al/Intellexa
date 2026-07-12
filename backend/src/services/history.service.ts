import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConversationModel, MessageDocument } from '../schemas/conversation.schema';
import { Conversation, Message } from '../../../shared/types';

@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);

  constructor(
    @InjectModel(ConversationModel.name) private conversationModel: Model<ConversationModel>
  ) {}

  async getConversations(workspaceId: string): Promise<Conversation[]> {
    try {
      const docs = await this.conversationModel
        .find({ workspaceId: new Types.ObjectId(workspaceId) as any })
        .sort({ updatedAt: -1 });
      return docs.map((d) => this.mapToConversation(d));
    } catch (error) {
      this.logger.error('Failed to get chat history:', error);
      return [];
    }
  }

  async getConversation(id: string, workspaceId: string): Promise<Conversation | null> {
    try {
      const doc = await this.conversationModel.findOne({ id, workspaceId: new Types.ObjectId(workspaceId) as any } as any);
      return doc ? this.mapToConversation(doc) : null;
    } catch (error) {
      this.logger.error(`Failed to get conversation ${id}:`, error);
      return null;
    }
  }

  async createConversation(mode: 'cloud' | 'local', title = 'New Conversation', workspaceId: string): Promise<Conversation> {
    const newConv = new this.conversationModel({
      id: Math.random().toString(36).substring(2, 11),
      title,
      mode,
      messages: [],
      isFavorite: false,
      isPinned: false,
      workspaceId: new Types.ObjectId(workspaceId),
    });
    const doc = await newConv.save();
    return this.mapToConversation(doc);
  }

  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    workspaceId: string,
    extra?: Partial<Message>
  ): Promise<Message> {
    let doc = await this.conversationModel.findOne({ id: conversationId, workspaceId: new Types.ObjectId(workspaceId) as any } as any);
    if (!doc) {
      // Auto-create conversation
      doc = new this.conversationModel({
        id: conversationId,
        title: 'New Chat',
        mode: 'cloud',
        messages: [],
        isFavorite: false,
        isPinned: false,
        workspaceId: new Types.ObjectId(workspaceId),
      });
      await doc.save();
    }

    const message: MessageDocument = {
      id: Math.random().toString(36).substring(2, 11),
      role,
      content,
      timestamp: new Date().toISOString(),
      citations: extra?.citations as any,
      imageUrls: extra?.imageUrls,
      audioUrl: extra?.audioUrl,
      metrics: extra?.metrics as any,
    } as any;

    doc.messages.push(message);
    (doc as any).updatedAt = new Date();

    // Auto-update conversation title if it is default
    if (doc.messages.length >= 1 && (doc.title === 'New Conversation' || doc.title === 'New Chat' || doc.title.startsWith('New '))) {
      const firstUserMessage = doc.messages.find((m) => m.role === 'user')?.content || '';
      if (firstUserMessage) {
        doc.title = firstUserMessage.substring(0, 30) + (firstUserMessage.length > 30 ? '...' : '');
      }
    }

    await doc.save();
    return message as any;
  }

  async updateConversation(
    id: string,
    workspaceId: string,
    updates: Partial<Pick<Conversation, 'title' | 'isFavorite' | 'isPinned'>>
  ): Promise<Conversation> {
    const doc = await this.conversationModel.findOne({ id, workspaceId: new Types.ObjectId(workspaceId) as any } as any);
    if (!doc) {
      throw new Error(`Conversation with ID ${id} not found`);
    }

    Object.assign(doc, updates);
    (doc as any).updatedAt = new Date();
    await doc.save();
    return this.mapToConversation(doc);
  }

  async deleteConversation(id: string, workspaceId: string): Promise<boolean> {
    const result = await this.conversationModel.deleteOne({ id, workspaceId: new Types.ObjectId(workspaceId) as any } as any);
    return result.deletedCount > 0;
  }

  async clearAll(workspaceId: string): Promise<void> {
    await this.conversationModel.deleteMany({ workspaceId: new Types.ObjectId(workspaceId) as any } as any);
  }

  private mapToConversation(doc: ConversationModel): Conversation {
    return {
      id: doc.id,
      title: doc.title,
      mode: doc.mode,
      messages: doc.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        citations: m.citations
          ? m.citations.map((c) => ({
              documentId: c.documentId,
              documentName: c.documentName,
              chunkIndex: c.chunkIndex,
              similarity: c.similarity,
              text: c.text,
              pageNumber: c.pageNumber,
            }))
          : undefined,
        imageUrls: m.imageUrls,
        audioUrl: m.audioUrl,
        metrics: m.metrics
          ? {
              chunksSearchedCount: m.metrics.chunksSearchedCount,
              chunksRetrievedCount: m.metrics.chunksRetrievedCount,
              searchTimeMs: m.metrics.searchTimeMs,
              generationTimeMs: m.metrics.generationTimeMs,
              totalTimeMs: m.metrics.totalTimeMs,
              avgSimilarityScore: m.metrics.avgSimilarityScore,
            }
          : undefined,
      })),
      isFavorite: doc.isFavorite,
      isPinned: doc.isPinned,
      createdAt: (doc as any).createdAt ? (doc as any).createdAt.toISOString() : new Date().toISOString(),
      updatedAt: (doc as any).updatedAt ? (doc as any).updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}
