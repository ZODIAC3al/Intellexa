import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class CollectionModel extends Document {
  @Prop({ required: true, unique: true, index: true })
  id: string; // maps to original custom collectionId

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: [String], default: [] })
  documentIds: string[]; // array of DocumentInfoModel 'id' string references

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Workspace', required: true, index: true })
  workspaceId: MongooseSchema.Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CollectionSchema = SchemaFactory.createForClass(CollectionModel);
