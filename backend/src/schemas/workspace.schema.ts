import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema()
export class WorkspaceMember {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: ['owner', 'editor', 'viewer'], default: 'viewer' })
  role: 'owner' | 'editor' | 'viewer';
}

const WorkspaceMemberSchema = SchemaFactory.createForClass(WorkspaceMember);

@Schema({ timestamps: true })
export class Workspace extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  ownerId: MongooseSchema.Types.ObjectId;

  @Prop({ type: [WorkspaceMemberSchema], default: [] })
  members: WorkspaceMember[];

  @Prop({ default: false })
  isPublic: boolean;

  @Prop({ type: [String], default: [] })
  publicCollectionIds: string[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const WorkspaceSchema = SchemaFactory.createForClass(Workspace);
