import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';
import * as crypto from 'crypto';
import { DocumentInfoModel } from '../schemas/document.schema';
import { DocumentInfo, DocumentStatus } from '../../../shared/types';

@Injectable()
export class DocumentProcessorService {
  private readonly logger = new Logger(DocumentProcessorService.name);
  private readonly docsDir = path.join(process.cwd(), '..', 'documents');

  constructor(
    @InjectModel(DocumentInfoModel.name) private documentModel: Model<DocumentInfoModel>
  ) {}

  async getDocuments(workspaceId: string): Promise<DocumentInfo[]> {
    try {
      const docs = await this.documentModel.find({ workspaceId: new Types.ObjectId(workspaceId) as any } as any);
      return docs.map((d) => this.mapToDocumentInfo(d));
    } catch (error) {
      this.logger.error('Failed to get documents registry:', error);
      return [];
    }
  }

  async getDocument(id: string, workspaceId: string): Promise<DocumentInfo | null> {
    try {
      const doc = await this.documentModel.findOne({ id, workspaceId: new Types.ObjectId(workspaceId) as any } as any);
      return doc ? this.mapToDocumentInfo(doc) : null;
    } catch (error) {
      this.logger.error(`Failed to get document ${id}:`, error);
      return null;
    }
  }

  async getDocumentByName(name: string, workspaceId: string): Promise<DocumentInfo | null> {
    try {
      const doc = await this.documentModel.findOne({ name, workspaceId: new Types.ObjectId(workspaceId) as any } as any);
      return doc ? this.mapToDocumentInfo(doc) : null;
    } catch (error) {
      this.logger.error(`Failed to get document by name ${name}:`, error);
      return null;
    }
  }

  async registerDocument(
    id: string,
    name: string,
    pathRelative: string,
    size: number,
    workspaceId: string,
    status: DocumentStatus = 'processing'
  ): Promise<DocumentInfo> {
    const doc = new this.documentModel({
      id,
      name,
      path: pathRelative,
      size,
      status,
      chunksCount: 0,
      embeddingsCount: 0,
      workspaceId: new Types.ObjectId(workspaceId),
    });
    const saved = await doc.save();
    return this.mapToDocumentInfo(saved);
  }

  async updateDocument(id: string, workspaceId: string, updates: Partial<DocumentInfo>): Promise<DocumentInfo | null> {
    try {
      const doc = await this.documentModel.findOne({ id, workspaceId: new Types.ObjectId(workspaceId) as any } as any);
      if (!doc) {
        this.logger.warn(`Document ${id} not found in registry for update`);
        return null;
      }
      Object.assign(doc, updates);
      await doc.save();
      return this.mapToDocumentInfo(doc);
    } catch (err) {
      this.logger.error(`Failed to update document ${id}:`, err);
      return null;
    }
  }

  async deleteDocument(id: string, workspaceId: string): Promise<boolean> {
    try {
      const doc = await this.documentModel.findOne({ id, workspaceId: new Types.ObjectId(workspaceId) as any } as any);
      if (!doc) return false;

      // Attempt to delete physical file
      const absolutePath = path.join(this.docsDir, '..', doc.path);
      try {
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
      } catch (err) {
        this.logger.error(`Error deleting physical file for doc ${id}:`, err);
      }

      await this.documentModel.deleteOne({ _id: doc._id } as any);
      return true;
    } catch (err) {
      this.logger.error(`Failed to delete document ${id}:`, err);
      return false;
    }
  }

  async parseDocument(fileBuffer: Buffer, filename: string): Promise<string> {
    const ext = path.extname(filename).toLowerCase();
    try {
      if (ext === '.pdf') {
        const pdfParse = require('pdf-parse');
        const textResult = await pdfParse(fileBuffer);
        
        const mappedPages = textResult.text.split(/\n\n|(?=\s*Page\s*\d+)/).map((p: string) => {
          return `${p.trim()}\n--- PAGE_BREAK_MARKER ---\n`;
        });
        return mappedPages.join('');
      } else if (ext === '.docx') {
        const parsed = await mammoth.extractRawText({ buffer: fileBuffer });
        return parsed.value || '';
      } else if (ext === '.txt' || ext === '.md' || ext === '.markdown') {
        return fileBuffer.toString('utf8');
      } else {
        throw new Error(`Unsupported file extension: ${ext}`);
      }
    } catch (error) {
      this.logger.error(`Failed to parse document ${filename}:`, error);
      throw error;
    }
  }

  cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
      .replace(/\n\s*\n/g, '\n\n') // Collapse consecutive empty lines
      .trim();
  }

  splitText(text: string, chunkSize = 1000, chunkOverlap = 200): string[] {
    if (chunkSize <= 0) return [text];
    
    const chunks: string[] = [];
    let i = 0;
    
    while (i < text.length) {
      let end = i + chunkSize;
      
      if (end < text.length) {
        const searchRange = text.substring(end - Math.min(200, chunkSize), end + 200);
        let splitIdx = -1;
        
        splitIdx = searchRange.lastIndexOf('\n\n');
        if (splitIdx !== -1) {
          end = (end - Math.min(200, chunkSize)) + splitIdx + 2;
        } else {
          splitIdx = searchRange.lastIndexOf('\n');
          if (splitIdx !== -1) {
            end = (end - Math.min(200, chunkSize)) + splitIdx + 1;
          } else {
            splitIdx = searchRange.lastIndexOf('. ');
            if (splitIdx !== -1) {
              end = (end - Math.min(200, chunkSize)) + splitIdx + 2;
            } else {
              splitIdx = searchRange.lastIndexOf(' ');
              if (splitIdx !== -1) {
                end = (end - Math.min(200, chunkSize)) + splitIdx + 1;
              }
            }
          }
        }
      }
      
      const chunk = text.substring(i, Math.min(end, text.length)).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
      
      i = Math.max(i + 1, end - chunkOverlap);
    }
    
    return chunks;
  }

  getChunkHash(text: string): string {
    return crypto.createHash('md5').update(text).digest('hex');
  }

  private mapToDocumentInfo(doc: DocumentInfoModel): DocumentInfo {
    return {
      id: doc.id,
      name: doc.name,
      path: doc.path,
      size: doc.size,
      status: doc.status,
      chunksCount: doc.chunksCount,
      embeddingsCount: doc.embeddingsCount,
      createdAt: (doc as any).createdAt ? (doc as any).createdAt.toISOString() : new Date().toISOString(),
    };
  }
}
