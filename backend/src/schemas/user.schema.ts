import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true, index: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  avatarUrl?: string;

  @Prop({ default: 'local-core' })
  plan: 'local-core' | 'standard-pro' | 'enterprise';

  @Prop({
    type: {
      theme: { type: String, default: 'dark' },
      defaultRetrievalStrategy: { type: String, default: 'mmr' },
    },
    default: { theme: 'dark', defaultRetrievalStrategy: 'mmr' },
  })
  settings: {
    theme: 'dark' | 'light' | 'system';
    defaultRetrievalStrategy: 'similarity' | 'mmr';
  };

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Workspace' })
  workspaceId?: MongooseSchema.Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
