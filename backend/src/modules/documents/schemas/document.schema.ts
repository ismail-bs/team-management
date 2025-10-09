import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DocumentDocument = DocumentModel &
  Document & {
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
  };

export enum DocumentVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  TEAM = 'team',
}

export enum DocumentStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class DocumentModel {
  @Prop({ required: true, trim: true, maxlength: 200 })
  name: string;

  @Prop({ maxlength: 1000 })
  description?: string;

  @Prop({ required: true, trim: true })
  originalName: string;

  @Prop({ required: true, alias: 'filename' })
  fileName: string; // Unique filename in storage (maps to 'filename' in JSON)

  @Prop({ required: true, alias: 'mimetype' })
  mimeType: string; // Maps to 'mimetype' in JSON

  @Prop({ required: true, min: 0 })
  size: number; // File size in bytes

  @Prop({ required: true })
  s3Key: string; // S3 object key

  @Prop({ required: true })
  s3Bucket: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project' })
  project?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(DocumentVisibility),
    default: DocumentVisibility.PRIVATE,
  })
  visibility: DocumentVisibility;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  sharedWith: Types.ObjectId[];

  @Prop({
    type: String,
    enum: Object.values(DocumentStatus),
    default: DocumentStatus.ACTIVE,
  })
  status: DocumentStatus;

  @Prop({ default: 0, min: 0 })
  downloadCount: number;

  @Prop()
  lastDownloadedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  lastDownloadedBy?: Types.ObjectId;

  @Prop({ default: 1, min: 1 })
  version: number;

  @Prop({ type: Types.ObjectId, ref: 'DocumentModel' })
  parentDocument?: Types.ObjectId; // For versioning

  @Prop({ default: false })
  isLatestVersion: boolean;
}

export const DocumentSchema = SchemaFactory.createForClass(DocumentModel);

// Essential indexes for admin panel queries
DocumentSchema.index({ uploadedBy: 1, createdAt: -1 }); // User's documents
DocumentSchema.index({ project: 1, createdAt: -1 }); // Project documents
DocumentSchema.index({ name: 'text', description: 'text' }); // Search
