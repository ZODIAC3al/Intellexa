import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class ActivityModel extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Workspace', required: true, index: true })
  workspaceId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  action: string;

  createdAt?: Date;
}

export const ActivitySchema = SchemaFactory.createForClass(ActivityModel);
