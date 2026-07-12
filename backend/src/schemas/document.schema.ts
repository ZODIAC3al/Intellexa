import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class DocumentInfoModel extends Document {
  @Prop({ required: true, unique: true, index: true })
  id: string; // maps to original custom documentId (e.g. doc_123)

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  path: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true, enum: ['processing', 'completed', 'failed'], default: 'processing' })
  status: 'processing' | 'completed' | 'failed';

  @Prop({ default: 0 })
  chunksCount: number;

  @Prop({ default: 0 })
  embeddingsCount: number;

  @Prop({ type: [String], default: [] })
  chunkHashes: string[]; // MD5 hashes of text chunks for document diffing

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Workspace', required: true, index: true })
  workspaceId: MongooseSchema.Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const DocumentInfoSchema = SchemaFactory.createForClass(DocumentInfoModel);
