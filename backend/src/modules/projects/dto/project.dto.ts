import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsArray,
  Min,
  Max,
  IsEmail,
  IsBoolean,
  IsMongoId,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { ProjectStatus } from '../../../common/enums/project-status.enum';
import { Priority } from '../../../common/enums/priority.enum';

export class CreateProjectDto {
  @ApiProperty({
    description: 'Project name',
    example: 'Website Redesign',
    maxLength: 200,
  })
  @IsString({ message: 'Project name must be a string' })
  @MaxLength(200, { message: 'Project name must not exceed 200 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiProperty({
    description: 'Project description',
    example: 'Complete redesign of company website with modern UI/UX',
    maxLength: 1000,
  })
  @IsString({ message: 'Project description must be a string' })
  @MaxLength(1000, {
    message: 'Project description must not exceed 1000 characters',
  })
  description: string;

  @ApiPropertyOptional({
    enum: ProjectStatus,
    description: 'Project status',
    default: ProjectStatus.NOT_STARTED,
  })
  @IsOptional()
  @IsEnum(ProjectStatus, { message: 'Status must be a valid enum value' })
  status?: ProjectStatus;

  @ApiPropertyOptional({
    enum: Priority,
    description: 'Project priority',
    default: Priority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(Priority, { message: 'Priority must be a valid enum value' })
  priority?: Priority;

  @ApiProperty({
    description: 'Project start date',
    example: '2024-01-15T00:00:00.000Z',
  })
  @IsDateString({}, { message: 'Start date must be a valid ISO date string' })
  startDate: string;

  @ApiPropertyOptional({
    description: 'Project end date',
    example: '2024-06-15T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid ISO date string' })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Project deadline',
    example: '2024-05-30T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Deadline must be a valid ISO date string' })
  deadline?: string;

  @ApiProperty({
    description: 'Project manager ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString({ message: 'Project manager ID must be a string' })
  @IsMongoId({ message: 'Project manager ID must be a valid MongoDB ObjectId' })
  projectManager: string;

  @ApiPropertyOptional({
    description: 'Team member IDs',
    type: [String],
    example: ['507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'],
  })
  @IsOptional()
  @IsArray({ message: 'Team members must be an array' })
  @IsString({ each: true, message: 'Each team member ID must be a string' })
  @IsMongoId({
    each: true,
    message: 'Each team member ID must be a valid MongoDB ObjectId',
  })
  teamMembers?: string[];

  @ApiPropertyOptional({
    description: 'Project budget',
    example: 50000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Budget must be a number' })
  @Min(0, { message: 'Budget must be a positive number' })
  @Type(() => Number)
  budget?: number;

  @ApiPropertyOptional({
    description: 'Project tags',
    type: [String],
    example: ['web', 'redesign', 'ui-ux'],
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
    description: 'Client name',
    example: 'Acme Corporation',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Client name must be a string' })
  @MaxLength(100, { message: 'Client name must not exceed 100 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  clientName?: string;

  @ApiPropertyOptional({
    description: 'Client email',
    example: 'contact@acme.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Client email must be a valid email address' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  clientEmail?: string;

  @ApiPropertyOptional({
    description: 'Project notes',
    example: 'Important project notes and requirements',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(2000, { message: 'Notes must not exceed 2000 characters' })
  notes?: string;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @ApiPropertyOptional({
    description: 'Project progress (0-100)',
    example: 75,
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
    description: 'Spent budget',
    example: 25000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Spent budget must be a number' })
  @Min(0, { message: 'Spent budget must be a positive number' })
  @Type(() => Number)
  spentBudget?: number;

  @ApiPropertyOptional({
    description: 'Is project active',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Is active must be a boolean' })
  isActive?: boolean;
}

export class ProjectResponseDto {
  @ApiProperty({
    description: 'Project ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Project name',
    example: 'Website Redesign',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Project description',
    example: 'Complete redesign of company website with modern UI/UX',
  })
  description?: string;

  @ApiProperty({
    description: 'Project status',
    example: 'in-progress',
    enum: ['not-started', 'in-progress', 'completed', 'on-hold', 'cancelled'],
  })
  status: string;

  @ApiProperty({
    description: 'Project priority',
    example: 'high',
    enum: ['low', 'medium', 'high', 'urgent'],
  })
  priority: string;

  @ApiProperty({
    description: 'Project start date',
    example: '2024-01-15T00:00:00.000Z',
  })
  startDate: string;

  @ApiPropertyOptional({
    description: 'Project end date',
    example: '2024-06-15T00:00:00.000Z',
  })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Project deadline',
    example: '2024-05-30T00:00:00.000Z',
  })
  deadline?: string;

  @ApiProperty({
    description: 'Project manager information',
    type: 'object',
    additionalProperties: false,
  })
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

  @ApiProperty({
    description: 'Team members information',
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: false,
    },
  })
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

  @ApiProperty({
    description: 'Total task count',
    example: 25,
  })
  taskCount: number;

  @ApiProperty({
    description: 'Completed task count',
    example: 18,
  })
  completedTaskCount: number;

  @ApiPropertyOptional({
    description: 'Project budget',
    example: 50000,
  })
  budget?: number;

  @ApiPropertyOptional({
    description: 'Spent budget',
    example: 25000,
  })
  spentBudget?: number;

  @ApiPropertyOptional({
    description: 'Project progress (0-100)',
    example: 75,
    minimum: 0,
    maximum: 100,
  })
  progress?: number;

  @ApiPropertyOptional({
    description: 'Project tags',
    type: [String],
    example: ['web', 'redesign', 'ui-ux'],
  })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Client name',
    example: 'Acme Corporation',
  })
  clientName?: string;

  @ApiPropertyOptional({
    description: 'Client email',
    example: 'contact@acme.com',
  })
  clientEmail?: string;

  @ApiPropertyOptional({
    description: 'Project notes',
    example: 'Important project notes and requirements',
  })
  notes?: string;

  @ApiProperty({
    description: 'Is project active',
    example: true,
  })
  isActive: boolean;

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

  @ApiPropertyOptional({
    description: 'Completed at',
    example: '2024-06-15T00:00:00.000Z',
  })
  completedAt?: string;

  @ApiPropertyOptional({
    description: 'Archived at',
    example: '2024-06-20T00:00:00.000Z',
  })
  archivedAt?: string;
}

export class AddTeamMemberDto {
  @ApiProperty({ description: 'User ID to add to project' })
  @IsString()
  userId: string;
}

export class RemoveTeamMemberDto {
  @ApiProperty({ description: 'User ID to remove from project' })
  @IsString()
  userId: string;
}

export class ProjectQueryDto {
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
    description: 'Search term for project name or description',
    example: 'website',
  })
  @IsOptional()
  @IsString({ message: 'Search term must be a string' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by project status',
    example: 'in-progress',
    enum: ['not-started', 'in-progress', 'completed', 'on-hold', 'cancelled'],
  })
  @IsOptional()
  @IsString({ message: 'Status must be a string' })
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by project priority',
    example: 'high',
    enum: ['low', 'medium', 'high', 'urgent'],
  })
  @IsOptional()
  @IsString({ message: 'Priority must be a string' })
  priority?: string;

  @ApiPropertyOptional({
    description: 'Filter by project manager ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString({ message: 'Project manager ID must be a string' })
  @IsMongoId({ message: 'Project manager ID must be a valid MongoDB ObjectId' })
  projectManager?: string;

  @ApiPropertyOptional({
    description: 'Filter by team member ID',
    example: '507f1f77bcf86cd799439012',
  })
  @IsOptional()
  @IsString({ message: 'Team member ID must be a string' })
  @IsMongoId({ message: 'Team member ID must be a valid MongoDB ObjectId' })
  teamMember?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'createdAt',
    enum: [
      'name',
      'status',
      'priority',
      'startDate',
      'endDate',
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

export class ProjectStatsDto {
  @ApiProperty({ description: 'Total projects' })
  total: number;

  @ApiProperty({ description: 'Active projects' })
  active: number;

  @ApiProperty({ description: 'Completed projects' })
  completed: number;

  @ApiProperty({ description: 'Projects on hold' })
  onHold: number;

  @ApiProperty({ description: 'Overdue projects' })
  overdue: number;

  @ApiProperty({ description: 'Projects by status' })
  projectsByStatus: Record<string, number>;

  @ApiProperty({ description: 'Projects by priority' })
  projectsByPriority: Record<string, number>;
}
