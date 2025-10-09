import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsMongoId,
  IsBoolean,
  IsObject,
  MinLength,
  MaxLength,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { MessageType, MessageStatus } from '../schemas/message.schema';

export class SendMessageDto {
  @ApiProperty({
    description: 'Message content',
    minLength: 1,
    maxLength: 5000,
    example: 'Hello team! How is the project progressing?',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  @Transform(({ value }) => value?.trim())
  content: string;

  @ApiProperty({
    enum: MessageType,
    description: 'Type of message',
    example: MessageType.TEXT,
  })
  @IsEnum(MessageType)
  type: MessageType;

  @ApiProperty({
    description: 'Conversation ID where message is sent',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  conversation: string;

  @ApiPropertyOptional({
    description: 'Message ID this is replying to',
    example: '507f1f77bcf86cd799439012',
  })
  @IsOptional()
  @IsMongoId()
  replyTo?: string;

  @ApiPropertyOptional({
    description: 'File attachments',
    type: 'array',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageAttachmentDto)
  attachments?: MessageAttachmentDto[];

  @ApiPropertyOptional({
    description: 'Users mentioned in the message',
    type: [String],
    example: ['507f1f77bcf86cd799439013', '507f1f77bcf86cd799439014'],
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  mentions?: string[];

  @ApiPropertyOptional({
    description: 'Message metadata',
    example: { priority: 'high', category: 'announcement' },
  })
  @IsOptional()
  @IsObject()
  metadata?: {
    priority?: string;
    category?: string;
    customData?: Record<string, unknown>;
  };

  @ApiPropertyOptional({
    description: 'Temporary ID for client-side tracking',
  })
  @IsOptional()
  @IsString()
  tempId?: string;
}

export class MessageAttachmentDto {
  @ApiProperty({
    description: 'File name',
    example: 'document.pdf',
  })
  @IsString()
  fileName: string;

  @ApiProperty({
    description: 'Original file name',
    example: 'Project Requirements.pdf',
  })
  @IsString()
  originalName: string;

  @ApiProperty({
    description: 'MIME type',
    example: 'application/pdf',
  })
  @IsString()
  mimeType: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1024000,
  })
  @IsNumber()
  @Min(1)
  size: number;

  @ApiProperty({
    description: 'File URL',
    example: 'https://example.com/files/document.pdf',
  })
  @IsString()
  url: string;

  @ApiPropertyOptional({
    description: 'Thumbnail URL for images/videos',
    example: 'https://example.com/thumbnails/document-thumb.jpg',
  })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}

export class UpdateMessageDto {
  @ApiProperty({
    description: 'Updated message content',
    minLength: 1,
    maxLength: 5000,
    example: 'Updated: Hello team! How is the project progressing?',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  @Transform(({ value }) => value?.trim())
  content: string;

  @ApiPropertyOptional({
    description: 'Updated mentions',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  mentions?: string[];
}

export class MessageReactionDto {
  @ApiProperty({
    description: 'Emoji for reaction',
    example: '👍',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  emoji: string;
}

export class MessageQueryDto {
  @ApiProperty({
    description: 'Conversation ID to get messages from',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  conversation: string;

  @ApiPropertyOptional({
    description: 'Filter by message type',
    enum: MessageType,
  })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @ApiPropertyOptional({
    description: 'Filter by sender ID',
    example: '507f1f77bcf86cd799439012',
  })
  @IsOptional()
  @IsMongoId()
  sender?: string;

  @ApiPropertyOptional({
    description: 'Search query for message content',
    example: 'project update',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({
    description: 'Include deleted messages',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeDeleted?: boolean = false;

  @ApiPropertyOptional({
    description: 'Get messages before this message ID (for pagination)',
    example: '507f1f77bcf86cd799439015',
  })
  @IsOptional()
  @IsMongoId()
  before?: string;

  @ApiPropertyOptional({
    description: 'Get messages after this message ID (for pagination)',
    example: '507f1f77bcf86cd799439016',
  })
  @IsOptional()
  @IsMongoId()
  after?: string;

  @ApiPropertyOptional({
    description: 'Number of messages to return',
    example: 50,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class MarkAsReadDto {
  @ApiProperty({
    description: 'Message ID to mark as read',
    example: '507f1f77bcf86cd799439017',
  })
  @IsMongoId()
  messageId: string;
}

export class MessageResponseDto {
  @ApiProperty({ description: 'Message ID' })
  id: string;

  @ApiProperty({ description: 'Message content' })
  content: string;

  @ApiProperty({ enum: MessageType, description: 'Message type' })
  type: MessageType;

  @ApiProperty({ description: 'Sender details' })
  sender: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };

  @ApiProperty({ description: 'Conversation ID' })
  conversation: string;

  @ApiProperty({ description: 'Reply to message details' })
  replyTo?: {
    id: string;
    content: string;
    sender: {
      id: string;
      name: string;
    };
  };

  @ApiProperty({ enum: MessageStatus, description: 'Message status' })
  status: MessageStatus;

  @ApiProperty({ description: 'File attachments', type: 'array' })
  attachments: MessageAttachmentDto[];

  @ApiProperty({ description: 'Message reactions', type: 'array' })
  reactions: {
    emoji: string;
    users: {
      id: string;
      name: string;
    }[];
    count: number;
  }[];

  @ApiProperty({ description: 'Mentioned users', type: 'array' })
  mentions: {
    id: string;
    name: string;
    email: string;
  }[];

  @ApiProperty({ description: 'Whether message is edited' })
  isEdited: boolean;

  @ApiProperty({ description: 'Edit timestamp' })
  editedAt?: Date;

  @ApiProperty({ description: 'Whether message is deleted' })
  isDeleted: boolean;

  @ApiProperty({ description: 'Deletion timestamp' })
  deletedAt?: Date;

  @ApiProperty({ description: 'Users who read this message', type: 'array' })
  readBy: {
    user: {
      id: string;
      name: string;
    };
    readAt: Date;
  }[];

  @ApiProperty({ description: 'Message metadata' })
  metadata: object;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class MessageStatsDto {
  @ApiProperty({ description: 'Total messages in conversation' })
  totalMessages: number;

  @ApiProperty({ description: 'Unread messages count' })
  unreadCount: number;

  @ApiProperty({ description: 'Messages by type' })
  messagesByType: {
    [key in MessageType]: number;
  };

  @ApiProperty({ description: 'Most active participants', type: 'array' })
  topSenders: {
    user: {
      id: string;
      name: string;
    };
    messageCount: number;
  }[];
}
