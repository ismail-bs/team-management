import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentModel, DocumentSchema } from './schemas/document.schema';
import { EmailModule } from '../email/email.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import awsConfig from '../../config/aws.config';

@Module({
  imports: [
    ConfigModule.forFeature(awsConfig),
    MongooseModule.forFeature([
      { name: DocumentModel.name, schema: DocumentSchema },
      { name: User.name, schema: UserSchema },
    ]),
    MulterModule.register({
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
      fileFilter: (req, file, callback) => {
        // Allow all file types for now, but you can add restrictions here
        callback(null, true);
      },
    }),
    EmailModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
