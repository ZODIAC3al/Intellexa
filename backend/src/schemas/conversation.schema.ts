import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema()
export class CitationDocument {
  @Prop({ required: true })
  documentId: string;

  @Prop({ required: true })
  documentName: string;

  @Prop({ required: true })
  chunkIndex: number;

  @Prop({ required: true })
  similarity: number;

  @Prop({ required: true })
  text: string;

  @Prop()
  pageNumber?: number;
}
const CitationSchema = SchemaFactory.createForClass(CitationDocument);

@Schema()
export class RagMetricsDocument {
  @Prop({ required: true })
  chunksSearchedCount: number;

  @Prop({ required: true })
  chunksRetrievedCount: number;

  @Prop({ required: true })
  searchTimeMs: number;

  @Prop({ required: true })
  generationTimeMs: number;

  @Prop({ required: true })
  totalTimeMs: number;

  @Prop({ required: true })
  avgSimilarityScore: number;
}
const RagMetricsSchema = SchemaFactory.createForClass(RagMetricsDocument);

@Schema()
export class MessageDocument {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true, enum: ['user', 'assistant', 'system'] })
  role: 'user' | 'assistant' | 'system';

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  timestamp: string;

  @Prop({ type: [CitationSchema], default: [] })
  citations?: CitationDocument[];

  @Prop({ type: [String], default: [] })
  imageUrls?: string[];

  @Prop()
  audioUrl?: string;

  @Prop({ type: RagMetricsSchema })
  metrics?: RagMetricsDocument;
}
const MessageSchema = SchemaFactory.createForClass(MessageDocument);

@Schema({ timestamps: true })
export class ConversationModel extends Document {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true, enum: ['cloud', 'local'] })
  mode: 'cloud' | 'local';

  @Prop({ type: [MessageSchema], default: [] })
  messages: MessageDocument[];

  @Prop({ default: false })
  isFavorite: boolean;

  @Prop({ default: false })
  isPinned: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Workspace', required: true, index: true })
  workspaceId: MongooseSchema.Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(ConversationModel);
