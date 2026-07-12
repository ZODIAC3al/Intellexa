import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class NotificationModel extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Workspace', required: true, index: true })
  workspaceId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: ['document_indexed', 'invite_received', 'weekly_summary'] })
  type: 'document_indexed' | 'invite_received' | 'weekly_summary';

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  read: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(NotificationModel);
