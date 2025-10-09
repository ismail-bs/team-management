import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsArray,
  IsMongoId,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { TaskStatus } from '../../../common/enums/status.enum';
import { Priority } from '../../../common/enums/priority.enum';

export class CreateTaskDto {
  @ApiProperty({
    description: 'Task title',
    example: 'Implement user authentication',
    maxLength: 200,
  })
  @IsString({ message: 'Title must be a string' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title: string;

  @ApiPropertyOptional({
    description: 'Task description',
    example: 'Implement secure user authentication with JWT tokens',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(1000, { message: 'Description must not exceed 1000 characters' })
  description?: string;

  @ApiPropertyOptional({
    enum: TaskStatus,
    description: 'Task status',
    default: TaskStatus.OPEN,
  })
  @IsOptional()
  @IsEnum(TaskStatus, { message: 'Status must be a valid enum value' })
  status?: TaskStatus;

  @ApiPropertyOptional({
    enum: Priority,
    description: 'Task priority',
    default: Priority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(Priority, { message: 'Priority must be a valid enum value' })
  priority?: Priority;

  @ApiProperty({
    description: 'Project ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString({ message: 'Project ID must be a string' })
  @IsMongoId({ message: 'Project ID must be a valid MongoDB ObjectId' })
  project: string;

  @ApiPropertyOptional({
    description: 'Assigned user ID',
    example: '507f1f77bcf86cd799439012',
  })
  @IsOptional()
  @IsString({ message: 'Assigned user ID must be a string' })
  @IsMongoId({ message: 'Assigned user ID must be a valid MongoDB ObjectId' })
  assignedTo?: string;

  @ApiPropertyOptional({
    description: 'Due date',
    example: '2024-02-15T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Due date must be a valid ISO date string' })
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Progress percentage (0-100)',
    example: 0,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Progress must be a number' })
  @Min(0, { message: 'Progress must be at least 0' })
  @Max(100, { message: 'Progress must be at most 100' })
  @Type(() => Number)
  progress?: number;

  @ApiPropertyOptional({
    description: 'Task tags',
    type: [String],
    example: ['frontend', 'authentication', 'security'],
  })
  @IsOptional()
  @IsArray({ message: 'Tags must be an array' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((tag: string) => tag?.trim()?.toLowerCase())
      : value,
  )
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Estimated hours to complete the task',
    example: 8,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Estimated hours must be a number' })
  @Min(0, { message: 'Estimated hours must be at least 0' })
  @Type(() => Number)
  estimatedHours?: number;

  @ApiPropertyOptional({
    description: 'Parent task ID for subtasks',
    example: '507f1f77bcf86cd799439013',
  })
  @IsOptional()
  @IsString({ message: 'Parent task ID must be a string' })
  @IsMongoId({ message: 'Parent task ID must be a valid MongoDB ObjectId' })
  parentTask?: string;

  @ApiPropertyOptional({
    description: 'Task dependencies',
    type: [String],
    example: ['507f1f77bcf86cd799439014', '507f1f77bcf86cd799439015'],
  })
  @IsOptional()
  @IsArray({ message: 'Dependencies must be an array' })
  @IsString({ each: true, message: 'Each dependency ID must be a string' })
  @IsMongoId({
    each: true,
    message: 'Each dependency ID must be a valid MongoDB ObjectId',
  })
  dependencies?: string[];
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiPropertyOptional({
    description: 'Actual hours spent on the task',
    example: 6.5,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Actual hours must be a number' })
  @Min(0, { message: 'Actual hours must be at least 0' })
  @Type(() => Number)
  actualHours?: number;
}

export class TaskCommentDto {
  @ApiProperty({
    description: 'Comment text',
    example:
      'This task is progressing well. Need to review the authentication logic.',
    maxLength: 1000,
  })
  @IsString({ message: 'Comment must be a string' })
  @MaxLength(1000, { message: 'Comment must not exceed 1000 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  comment: string;
}

export class TaskQueryDto {
  @ApiPropertyOptional({
    description: 'Project ID filter',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString({ message: 'Project ID must be a string' })
  @IsMongoId({ message: 'Project ID must be a valid MongoDB ObjectId' })
  project?: string;

  @ApiPropertyOptional({
    description: 'Assigned user ID filter',
    example: '507f1f77bcf86cd799439012',
  })
  @IsOptional()
  @IsString({ message: 'Assigned user ID must be a string' })
  @IsMongoId({ message: 'Assigned user ID must be a valid MongoDB ObjectId' })
  assignedTo?: string;

  @ApiPropertyOptional({
    description: 'Created by user ID filter',
    example: '507f1f77bcf86cd799439013',
  })
  @IsOptional()
  @IsString({ message: 'Created by user ID must be a string' })
  @IsMongoId({ message: 'Created by user ID must be a valid MongoDB ObjectId' })
  createdBy?: string;

  @ApiPropertyOptional({
    description: 'Status filter',
    example: 'in-progress',
    enum: ['open', 'in-progress', 'resolved', 'closed'],
  })
  @IsOptional()
  @IsString({ message: 'Status must be a string' })
  status?: string;

  @ApiPropertyOptional({
    description: 'Priority filter',
    example: 'high',
    enum: ['low', 'medium', 'high', 'urgent'],
  })
  @IsOptional()
  @IsString({ message: 'Priority must be a string' })
  priority?: string;

  @ApiPropertyOptional({
    description: 'Due date from (ISO string)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Due date from must be a valid ISO date string' },
  )
  dueDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Due date to (ISO string)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Due date to must be a valid ISO date string' })
  dueDateTo?: string;

  @ApiPropertyOptional({
    description: 'Search in title and description',
    example: 'authentication',
  })
  @IsOptional()
  @IsString({ message: 'Search term must be a string' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({
    description: 'Tags filter',
    type: [String],
    example: ['frontend', 'authentication'],
  })
  @IsOptional()
  @IsArray({ message: 'Tags must be an array' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must be at most 100' })
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'createdAt',
    enum: [
      'title',
      'status',
      'priority',
      'dueDate',
      'progress',
      'estimatedHours',
      'actualHours',
      'createdAt',
      'updatedAt',
    ],
  })
  @IsOptional()
  @IsString({ message: 'Sort by must be a string' })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString({ message: 'Sort order must be a string' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class TaskResponseDto {
  @ApiProperty({
    description: 'Task ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Task title',
    example: 'Implement user authentication',
  })
  title: string;

  @ApiPropertyOptional({
    description: 'Task description',
    example: 'Implement secure user authentication with JWT tokens',
  })
  description?: string;

  @ApiProperty({
    description: 'Task status',
    example: 'in-progress',
    enum: ['open', 'in-progress', 'resolved', 'closed'],
  })
  status: string;

  @ApiProperty({
    description: 'Task priority',
    example: 'high',
    enum: ['low', 'medium', 'high', 'urgent'],
  })
  priority: string;

  @ApiProperty({
    description: 'Project information',
    type: 'object',
    additionalProperties: false,
  })
  project: {
    _id: string;
    name: string;
    description?: string;
    status: string;
    priority: string;
    startDate: string;
    endDate?: string;
    projectManager: {
      _id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      department?: string;
      location?: string;
      status: string;
      avatar?: string;
      bio?: string;
      skills?: string[];
      joinDate: string;
      lastLogin?: string;
      tasksCompleted: number;
    };
    teamMembers: Array<{
      _id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      department?: string;
      location?: string;
      status: string;
      avatar?: string;
      bio?: string;
      skills?: string[];
      joinDate: string;
      lastLogin?: string;
      tasksCompleted: number;
    }>;
    taskCount: number;
    completedTaskCount: number;
    budget?: number;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
  };

  @ApiPropertyOptional({
    description: 'Assigned user information',
    type: 'object',
    additionalProperties: false,
  })
  assignedTo?: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    department?: string;
    location?: string;
    status: string;
    avatar?: string;
    bio?: string;
    skills?: string[];
    joinDate: string;
    lastLogin?: string;
    tasksCompleted: number;
  };

  @ApiProperty({
    description: 'Created by user information',
    type: 'object',
    additionalProperties: false,
  })
  createdBy: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    department?: string;
    location?: string;
    status: string;
    avatar?: string;
    bio?: string;
    skills?: string[];
    joinDate: string;
    lastLogin?: string;
    tasksCompleted: number;
  };

  @ApiPropertyOptional({
    description: 'Due date',
    example: '2024-02-15T00:00:00.000Z',
  })
  dueDate?: string;

  @ApiProperty({
    description: 'Progress percentage (0-100)',
    example: 75,
    minimum: 0,
    maximum: 100,
  })
  progress: number;

  @ApiPropertyOptional({
    description: 'Task tags',
    type: [String],
    example: ['frontend', 'authentication', 'security'],
  })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Estimated hours to complete',
    example: 8,
  })
  estimatedHours?: number;

  @ApiProperty({
    description: 'Actual hours spent',
    example: 6.5,
  })
  actualHours: number;

  @ApiPropertyOptional({
    description: 'Task comments',
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: false,
    },
  })
  comments?: Array<{
    user: {
      _id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      department?: string;
      location?: string;
      status: string;
      avatar?: string;
      bio?: string;
      skills?: string[];
      joinDate: string;
      lastLogin?: string;
      tasksCompleted: number;
    };
    comment: string;
    createdAt: string;
  }>;

  @ApiPropertyOptional({
    description: 'Task attachments',
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: false,
    },
  })
  attachments?: Array<{
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    uploadedBy: {
      _id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      department?: string;
      location?: string;
      status: string;
      avatar?: string;
      bio?: string;
      skills?: string[];
      joinDate: string;
      lastLogin?: string;
      tasksCompleted: number;
    };
    uploadedAt: string;
  }>;

  @ApiPropertyOptional({
    description: 'Task dependencies',
    type: 'array',
  })
  dependencies?: TaskResponseDto[];

  @ApiPropertyOptional({
    description: 'Subtasks',
    type: 'array',
  })
  subtasks?: TaskResponseDto[];

  @ApiPropertyOptional({
    description: 'Parent task information',
    type: 'object',
    additionalProperties: false,
  })
  parentTask?: {
    _id: string;
    title: string;
    status: string;
    priority: string;
    progress: number;
  };

  @ApiProperty({
    description: 'Created at',
    example: '2024-01-15T00:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Updated at',
    example: '2024-01-20T00:00:00.000Z',
  })
  updatedAt: string;
}

export class TaskStatsDto {
  @ApiProperty({
    description: 'Total number of tasks',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Number of open tasks',
    example: 25,
  })
  open: number;

  @ApiProperty({
    description: 'Number of in-progress tasks',
    example: 40,
  })
  inProgress: number;

  @ApiProperty({
    description: 'Number of resolved tasks',
    example: 30,
  })
  resolved: number;

  @ApiProperty({
    description: 'Number of closed tasks',
    example: 55,
  })
  closed: number;

  @ApiProperty({
    description: 'Number of overdue tasks',
    example: 8,
  })
  overdue: number;

  @ApiProperty({
    description: 'Tasks completed this week',
    example: 12,
  })
  completedThisWeek: number;

  @ApiProperty({
    description: 'Tasks completed this month',
    example: 45,
  })
  completedThisMonth: number;
}
