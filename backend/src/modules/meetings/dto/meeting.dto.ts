import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsArray,
  IsBoolean,
  IsMongoId,
  IsUrl,
  IsNotEmpty,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { MeetingType, MeetingStatus } from '../../../common/enums/status.enum';

export class CreateMeetingDto {
  @ApiProperty({
    description: 'Meeting title',
    example: 'Weekly Team Standup',
    maxLength: 200,
  })
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title: string;

  @ApiPropertyOptional({
    description: 'Meeting description',
    example: 'Weekly team standup to discuss progress and blockers',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(1000, { message: 'Description must not exceed 1000 characters' })
  description?: string;

  @ApiProperty({
    description: 'Meeting type',
    example: 'team-meeting',
    enum: [
      'team-meeting',
      'one-on-one',
      'project-review',
      'standup',
      'retrospective',
      'other',
    ],
  })
  @IsString({ message: 'Type must be a string' })
  @IsEnum(
    [
      'team-meeting',
      'one-on-one',
      'project-review',
      'standup',
      'retrospective',
      'other',
    ],
    {
      message: 'Type must be a valid meeting type',
    },
  )
  type: string;

  @ApiProperty({
    description: 'Meeting start time',
    example: '2024-03-15T10:00:00.000Z',
  })
  @IsDateString({}, { message: 'Start time must be a valid ISO date string' })
  startTime: string;

  @ApiProperty({
    description: 'Meeting end time',
    example: '2024-03-15T11:00:00.000Z',
  })
  @IsDateString({}, { message: 'End time must be a valid ISO date string' })
  endTime: string;

  @ApiPropertyOptional({
    description: 'Meeting location',
    example: 'Conference Room A',
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'Location must be a string' })
  @MaxLength(200, { message: 'Location must not exceed 200 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  location?: string;

  @ApiPropertyOptional({
    description: 'Meeting link for virtual meetings',
    example: 'https://zoom.us/j/123456789',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Meeting link must be a string' })
  @IsUrl({}, { message: 'Meeting link must be a valid URL' })
  @MaxLength(500, { message: 'Meeting link must not exceed 500 characters' })
  meetingLink?: string;

  @ApiProperty({
    description: 'Participant user IDs',
    type: [String],
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
  })
  @IsArray({ message: 'Participants must be an array' })
  @ArrayMinSize(1, { message: 'At least one participant is required' })
  @IsString({ each: true, message: 'Each participant ID must be a string' })
  @IsMongoId({
    each: true,
    message: 'Each participant ID must be a valid MongoDB ObjectId',
  })
  participants: string[];

  @ApiPropertyOptional({
    description: 'Associated project ID',
    example: '507f1f77bcf86cd799439013',
  })
  @IsOptional()
  @IsString({ message: 'Project ID must be a string' })
  @IsMongoId({ message: 'Project ID must be a valid MongoDB ObjectId' })
  project?: string;

  @ApiPropertyOptional({
    description: 'Meeting agenda',
    example: 'Review last week progress, Discuss blockers, Plan next week',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'Agenda must be a string' })
  @MaxLength(2000, { message: 'Agenda must not exceed 2000 characters' })
  agenda?: string;

  @ApiPropertyOptional({
    description: 'Whether the meeting is recurring',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    description: 'Recurring frequency',
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    example: 'weekly',
  })
  @IsOptional()
  @IsString()
  @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
  recurringFrequency?: string;

  @ApiPropertyOptional({
    description: 'Recurring end date',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  recurringEndDate?: string;
}

export class UpdateMeetingDto extends PartialType(CreateMeetingDto) {
  @ApiPropertyOptional({
    description: 'Meeting status',
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
  })
  @IsString()
  @IsOptional()
  @IsEnum(['scheduled', 'in-progress', 'completed', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ description: 'Meeting notes' })
  @IsString()
  @IsOptional()
  @MaxLength(5000, { message: 'Notes must not exceed 5000 characters' })
  notes?: string;

  @ApiPropertyOptional({ description: 'Meeting decisions' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  decisions?: string[];

  @ApiPropertyOptional({ description: 'Meeting attachments' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];

  @ApiPropertyOptional({ description: 'Actual start time' })
  @IsDateString()
  @IsOptional()
  actualStartTime?: string;

  @ApiPropertyOptional({ description: 'Actual end time' })
  @IsDateString()
  @IsOptional()
  actualEndTime?: string;

  @ApiPropertyOptional({
    description: 'Whether the meeting is recurring',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    description: 'Recurring frequency',
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    example: 'weekly',
  })
  @IsOptional()
  @IsString()
  @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
  recurringFrequency?: string;

  @ApiPropertyOptional({
    description: 'Recurring end date',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  recurringEndDate?: string;
}

export class ParticipantResponseDto {
  @ApiProperty({
    description: 'Response status',
    enum: ['accepted', 'declined', 'pending'],
  })
  @IsString()
  @IsEnum(['accepted', 'declined', 'pending'])
  status: 'accepted' | 'declined' | 'pending';
}

export class MeetingQueryDto {
  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsMongoId()
  @IsOptional()
  project?: string;

  @ApiPropertyOptional({
    description: 'Filter by meeting type',
    enum: MeetingType,
  })
  @IsEnum(MeetingType)
  @IsOptional()
  type?: MeetingType;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
  })
  @IsString()
  @IsOptional()
  @IsEnum(['scheduled', 'in-progress', 'completed', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ description: 'Start date for date range filter' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for date range filter' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @Transform(({ value }) => parseInt(value))
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @Transform(({ value }) => parseInt(value))
  @IsOptional()
  limit?: number;
}

export class MeetingResponseDto {
  @ApiProperty({ description: 'Meeting ID' })
  _id: string;

  @ApiProperty({ description: 'Meeting title' })
  title: string;

  @ApiProperty({ description: 'Meeting description', required: false })
  description?: string;

  @ApiProperty({ description: 'Meeting start time' })
  startTime: Date;

  @ApiProperty({ description: 'Meeting end time' })
  endTime: Date;

  @ApiProperty({ enum: MeetingType, description: 'Type of meeting' })
  type: MeetingType;

  @ApiProperty({ description: 'Meeting location', required: false })
  location?: string;

  @ApiProperty({
    description: 'Meeting link for virtual meetings',
    required: false,
  })
  meetingLink?: string;

  @ApiProperty({ description: 'Meeting agenda items', type: [String] })
  agenda: string[];

  @ApiProperty({ description: 'Meeting participants', type: [String] })
  participants: string[];

  @ApiProperty({ description: 'Meeting organizer (user ID)' })
  organizer: string;

  @ApiProperty({ description: 'Associated project ID', required: false })
  project?: string;

  @ApiProperty({ description: 'Whether the meeting is recurring' })
  isRecurring: boolean;

  @ApiProperty({ description: 'Recurrence pattern', required: false })
  recurrencePattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
  };

  @ApiProperty({ description: 'Meeting notes', required: false })
  notes?: string;

  @ApiProperty({ description: 'Meeting decisions', type: [String] })
  decisions: string[];

  @ApiProperty({ description: 'Meeting attachments', type: [String] })
  attachments: string[];

  @ApiProperty({ enum: MeetingStatus, description: 'Meeting status' })
  status: MeetingStatus;

  @ApiProperty({ description: 'Actual start time', required: false })
  actualStartTime?: Date;

  @ApiProperty({ description: 'Actual end time', required: false })
  actualEndTime?: Date;

  @ApiProperty({ description: 'Participant responses', type: 'array' })
  participantResponses: Array<{
    userId: string;
    status: string;
    respondedAt?: Date;
  }>;

  @ApiProperty({ description: 'Meeting creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Meeting last update date' })
  updatedAt: Date;
}
