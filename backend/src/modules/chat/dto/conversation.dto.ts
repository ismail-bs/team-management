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
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ConversationType } from '../schemas/conversation.schema';

export class CreateConversationDto {
  @ApiPropertyOptional({
    description:
      'Conversation title (required for group/project, optional for direct)',
    minLength: 1,
    maxLength: 100,
    example: 'Project Alpha Discussion',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  title?: string;

  @ApiPropertyOptional({
    description: 'Conversation description',
    maxLength: 500,
    example: 'Discussion about project milestones and deliverables',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiProperty({
    enum: ConversationType,
    description: 'Type of conversation',
    example: ConversationType.PROJECT,
  })
  @IsEnum(ConversationType)
  type: ConversationType;

  @ApiProperty({
    description: 'Array of participant user IDs',
    type: [String],
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  participants: string[];

  @ApiPropertyOptional({
    description: 'Associated project ID',
    example: '507f1f77bcf86cd799439013',
  })
  @IsOptional()
  @IsMongoId()
  project?: string;

  @ApiPropertyOptional({
    description: 'Conversation avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({
    description: 'Conversation settings',
    example: { allowFileSharing: true, allowMentions: true },
  })
  @IsOptional()
  @IsObject()
  settings?: {
    allowFileSharing?: boolean;
    allowMentions?: boolean;
    retentionDays?: number;
    customFields?: Record<string, unknown>;
  };
}

export class UpdateConversationDto extends PartialType(CreateConversationDto) {
  @ApiPropertyOptional({
    description: 'Whether the conversation is archived',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the conversation is muted',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isMuted?: boolean;
}

export class AddParticipantDto {
  @ApiProperty({
    description: 'User ID to add as participant',
    example: '507f1f77bcf86cd799439014',
  })
  @IsMongoId()
  userId: string;
}

export class RemoveParticipantDto {
  @ApiProperty({
    description: 'User ID to remove from participants',
    example: '507f1f77bcf86cd799439014',
  })
  @IsMongoId()
  userId: string;
}

export class ConversationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by conversation type',
    enum: ConversationType,
  })
  @IsOptional()
  @IsEnum(ConversationType)
  type?: ConversationType;

  @ApiPropertyOptional({
    description: 'Filter by project ID',
    example: '507f1f77bcf86cd799439013',
  })
  @IsOptional()
  @IsMongoId()
  project?: string;

  @ApiPropertyOptional({
    description: 'Include archived conversations',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeArchived?: boolean = false;

  @ApiPropertyOptional({
    description: 'Search query for conversation title',
    example: 'project',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

export class ConversationResponseDto {
  @ApiProperty({ description: 'Conversation ID' })
  id: string;

  @ApiProperty({ description: 'Conversation title' })
  title: string;

  @ApiProperty({ description: 'Conversation description' })
  description?: string;

  @ApiProperty({ enum: ConversationType, description: 'Conversation type' })
  type: ConversationType;

  @ApiProperty({ description: 'Participant details', type: 'array' })
  participants: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  }[];

  @ApiProperty({ description: 'Associated project details' })
  project?: {
    id: string;
    name: string;
    description?: string;
  };

  @ApiProperty({ description: 'Creator details' })
  createdBy: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };

  @ApiProperty({ description: 'Last message details' })
  lastMessage?: {
    id: string;
    content: string;
    sender: {
      id: string;
      name: string;
    };
    createdAt: Date;
  };

  @ApiProperty({ description: 'Last activity timestamp' })
  lastActivity: Date;

  @ApiProperty({ description: 'Whether conversation is archived' })
  isArchived: boolean;

  @ApiProperty({ description: 'Whether conversation is muted' })
  isMuted: boolean;

  @ApiProperty({ description: 'Conversation avatar URL' })
  avatar?: string;

  @ApiProperty({ description: 'Conversation settings' })
  settings: object;

  @ApiProperty({ description: 'Unread message count for current user' })
  unreadCount?: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
