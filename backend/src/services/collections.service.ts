import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VectorStoreService } from './vector-store.service';
import { CollectionModel } from '../schemas/collection.schema';
import { Collection } from '../../../shared/types';

@Injectable()
export class CollectionsService {
  private readonly logger = new Logger(CollectionsService.name);

  constructor(
    private vectorStoreService: VectorStoreService,
    @InjectModel(CollectionModel.name) private collectionModel: Model<CollectionModel>
  ) {}

  async getCollections(workspaceId: string): Promise<Collection[]> {
    try {
      let docs = await this.collectionModel.find({ workspaceId: new Types.ObjectId(workspaceId) as any } as any);
      if (docs.length === 0) {
        // Automatically seed a default collection for the workspace
        const defaultColl = await this.createCollection(
          'General Research',
          'Default collection for uploaded research documents',
          workspaceId
        );
        return [defaultColl];
      }
      return docs.map((d) => this.mapToCollection(d));
    } catch (error) {
      this.logger.error('Failed to get collections:', error);
      return [];
    }
  }

  async getCollection(id: string, workspaceId: string): Promise<Collection | null> {
    try {
      let doc = await this.collectionModel.findOne({ id, workspaceId: new Types.ObjectId(workspaceId) as any } as any);
      if (!doc && id === 'default') {
        // Try to find the "General Research" collection as fallback
        doc = await this.collectionModel.findOne({ name: 'General Research', workspaceId: new Types.ObjectId(workspaceId) as any } as any);
      }
      return doc ? this.mapToCollection(doc) : { name: 'General Research', id: 'default', description: '', documentIds: [], createdAt: new Date().toISOString() };
    } catch (error) {
      this.logger.error(`Failed to get collection ${id}:`, error);
      return { name: 'General Research', id: 'default', description: '', documentIds: [], createdAt: new Date().toISOString() };
    }
  }

  async createCollection(name: string, description?: string, workspaceId?: string): Promise<Collection> {
    const isDefault = name === 'General Research' || !name;
    const newColl = new this.collectionModel({
      id: isDefault ? 'default' : Math.random().toString(36).substring(2, 11),
      name: name || 'General Research',
      description: description || (isDefault ? 'Default collection for uploaded research documents' : undefined),
      documentIds: [],
      workspaceId: workspaceId ? new Types.ObjectId(workspaceId) : undefined,
    });
    const doc = await newColl.save();
    return this.mapToCollection(doc);
  }

  async updateCollection(
    id: string,
    workspaceId: string,
    updates: Partial<Pick<Collection, 'name' | 'description' | 'documentIds'>>
  ): Promise<Collection> {
    const col = await this.collectionModel.findOne({ id, workspaceId: new Types.ObjectId(workspaceId) as any } as any);
    if (!col) {
      throw new NotFoundException(`Collection with ID ${id} not found`);
    }
    Object.assign(col, updates);
    await col.save();
    return this.mapToCollection(col);
  }

  async deleteCollection(id: string, workspaceId: string): Promise<boolean> {
    const col = await this.collectionModel.findOne({ id, workspaceId: new Types.ObjectId(workspaceId) as any } as any);
    if (col) {
      // Try to delete from vector db
      await this.vectorStoreService.deleteCollection(col.name);
      await this.collectionModel.deleteOne({ _id: col._id } as any);
      return true;
    }
    return false;
  }

  async addDocumentToCollection(collectionId: string, documentId: string, workspaceId: string): Promise<Collection> {
    let col = await this.collectionModel.findOne({ id: collectionId, workspaceId: new Types.ObjectId(workspaceId) as any } as any);
    if (!col && collectionId === 'default') {
      // Try to find the "General Research" collection
      col = await this.collectionModel.findOne({ name: 'General Research', workspaceId: new Types.ObjectId(workspaceId) as any } as any);
    }
    if (!col) {
      const defaultColl = await this.createCollection(
        'General Research',
        'Default collection for uploaded research documents',
        workspaceId
      );
      col = await this.collectionModel.findOne({ id: defaultColl.id } as any);
    }
    if (!col) {
      throw new NotFoundException(`Collection ${collectionId} not found`);
    }
    if (!col.documentIds.includes(documentId)) {
      col.documentIds.push(documentId);
      await col.save();
    }
    return this.mapToCollection(col);
  }

  async removeDocumentFromCollection(collectionId: string, documentId: string, workspaceId: string): Promise<Collection> {
    const col = await this.collectionModel.findOne({ id: collectionId, workspaceId: new Types.ObjectId(workspaceId) as any } as any);
    if (!col) {
      throw new NotFoundException(`Collection ${collectionId} not found`);
    }
    col.documentIds = col.documentIds.filter((id) => id !== documentId);
    await col.save();
    return this.mapToCollection(col);
  }

  async removeDocumentFromAllCollections(documentId: string, workspaceId: string): Promise<void> {
    await this.collectionModel.updateMany(
      { workspaceId: new Types.ObjectId(workspaceId) as any, documentIds: documentId } as any,
      { $pull: { documentIds: documentId } } as any
    );
  }

  private mapToCollection(doc: CollectionModel): Collection {
    return {
      id: doc.id,
      name: doc.name,
      description: doc.description,
      documentIds: doc.documentIds,
      createdAt: (doc as any).createdAt ? (doc as any).createdAt.toISOString() : new Date().toISOString(),
    };
  }
}
