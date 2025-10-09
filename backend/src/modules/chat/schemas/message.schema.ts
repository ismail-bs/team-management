import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message &
  Document & {
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
  };

export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  IMAGE = 'image',
  SYSTEM = 'system',
  NOTIFICATION = 'notification',
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Message {
  @Prop({ required: true, trim: true, maxlength: 4000 })
  content: string;

  @Prop({
    type: String,
    enum: Object.values(MessageType),
    default: MessageType.TEXT,
  })
  messageType: MessageType;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sender: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversation: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  replyTo?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(MessageStatus),
    default: MessageStatus.SENT,
  })
  status: MessageStatus;

  @Prop([
    {
      filename: { type: String, required: true },
      originalName: { type: String, required: true },
      mimetype: { type: String, required: true },
      size: { type: Number, required: true, min: 0 },
      url: { type: String, required: true },
      thumbnailUrl: String,
    },
  ])
  attachments: Array<{
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    url: string;
    thumbnailUrl?: string;
  }>;

  @Prop([
    {
      emoji: { type: String, required: true },
      users: [{ type: Types.ObjectId, ref: 'User' }],
      count: { type: Number, default: 0 },
    },
  ])
  reactions: Array<{
    emoji: string;
    users: Types.ObjectId[];
    count: number;
  }>;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  mentions: Types.ObjectId[];

  @Prop({ default: false })
  isEdited: boolean;

  @Prop()
  editedAt?: Date;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop([
    {
      user: { type: Types.ObjectId, ref: 'User', required: true },
      readAt: { type: Date, default: Date.now },
    },
  ])
  readBy: Array<{
    user: Types.ObjectId;
    readAt: Date;
  }>;

  @Prop({
    type: Object,
    default: {},
  })
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    location?: {
      latitude: number;
      longitude: number;
    };
    customData?: Record<string, unknown>;
  };
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Essential indexes for admin panel queries
MessageSchema.index({ conversation: 1, createdAt: -1 }); // Messages by conversation
