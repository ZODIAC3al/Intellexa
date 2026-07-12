import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import { ApiController } from './controllers/api.controller';
import { CloudAiService } from './services/cloud-ai.service';
import { LocalAiService } from './services/local-ai.service';
import { DocumentProcessorService } from './services/document-processor.service';
import { VectorStoreService } from './services/vector-store.service';
import { HistoryService } from './services/history.service';
import { CollectionsService } from './services/collections.service';

// Import Schemas
import { User, UserSchema } from './schemas/user.schema';
import { Workspace, WorkspaceSchema } from './schemas/workspace.schema';
import { DocumentInfoModel, DocumentInfoSchema } from './schemas/document.schema';
import { CollectionModel, CollectionSchema } from './schemas/collection.schema';
import { ConversationModel, ConversationSchema } from './schemas/conversation.schema';
import { NotificationModel, NotificationSchema } from './schemas/notification.schema';
import { ActivityModel, ActivitySchema } from './schemas/activity.schema';
import { UsageModel, UsageSchema } from './schemas/usage.schema';

// Import AuthModule
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MulterModule.register({
      storage: multer.memoryStorage(),
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/intellexa'),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Workspace.name, schema: WorkspaceSchema },
      { name: DocumentInfoModel.name, schema: DocumentInfoSchema },
      { name: CollectionModel.name, schema: CollectionSchema },
      { name: ConversationModel.name, schema: ConversationSchema },
      { name: NotificationModel.name, schema: NotificationSchema },
      { name: ActivityModel.name, schema: ActivitySchema },
      { name: UsageModel.name, schema: UsageSchema },
    ]),
    AuthModule,
  ],
  controllers: [ApiController],
  providers: [
    CloudAiService,
    LocalAiService,
    DocumentProcessorService,
    VectorStoreService,
    HistoryService,
    CollectionsService,
  ],
})
export class AppModule {}
