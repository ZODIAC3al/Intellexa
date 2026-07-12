import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class UsageModel extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Workspace', required: true, index: true })
  workspaceId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, index: true })
  month: string; // Format: YYYY-MM

  @Prop({ default: 0 })
  cloudCallsCount: number;

  @Prop({ default: 0 })
  tokenCount: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UsageSchema = SchemaFactory.createForClass(UsageModel);
