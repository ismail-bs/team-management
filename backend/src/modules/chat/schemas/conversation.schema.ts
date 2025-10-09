import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation &
  Document & {
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
  };

export enum ConversationType {
  DIRECT = 'direct',
  GROUP = 'group',
  PROJECT = 'project',
}

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Conversation {
  @Prop({ trim: true, maxlength: 200 })
  name?: string;

  @Prop({ trim: true, maxlength: 500 })
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(ConversationType),
    default: ConversationType.DIRECT,
  })
  type: ConversationType;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'User' }],
    required: true,
    validate: {
      validator: function (participants: Types.ObjectId[]) {
        return participants && participants.length > 0;
      },
      message: 'Conversation must have at least one participant',
    },
  })
  participants: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Project' })
  project?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  lastMessage?: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  lastActivity: Date;

  @Prop({ default: false })
  isArchived: boolean;

  @Prop({ default: false })
  isMuted: boolean;

  @Prop()
  avatar?: string;

  @Prop({
    type: Object,
    default: {},
  })
  settings: {
    allowFileSharing?: boolean;
    allowMentions?: boolean;
    retentionDays?: number;
    customFields?: Record<string, unknown>;
  };

  @Prop({ default: 0, min: 0 })
  unreadCount: number;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Essential indexes for admin panel queries
ConversationSchema.index({ participants: 1 }); // User's conversations
ConversationSchema.index({ project: 1 }); // Project conversations
