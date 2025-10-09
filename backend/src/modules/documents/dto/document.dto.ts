import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsMongoId,
  IsNumber,
  IsDateString,
  IsNotEmpty,
  ArrayMinSize,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DocumentVisibility } from '../schemas/document.schema';

export class UploadDocumentDto {
  @ApiProperty({
    example: 'Project Requirements Document',
    description: 'Display name for the document',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'Detailed requirements for the medical platform project',
    description: 'Optional description of the document',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'Project ID to associate the document with',
  })
  @IsOptional()
  @IsMongoId()
  project?: string;

  @ApiPropertyOptional({
    enum: DocumentVisibility,
    example: 'project',
    description: 'Document visibility level',
    default: 'private',
  })
  @IsOptional()
  @IsEnum(DocumentVisibility)
  visibility?: string;

  @ApiPropertyOptional({
    example: ['requirements', 'documentation', 'medical'],
    description: 'Tags for categorizing the document',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    example: ['507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'],
    description: 'User IDs to share the document with',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  sharedWith?: string[];
}

export class UpdateDocumentDto extends PartialType(UploadDocumentDto) {
  @ApiPropertyOptional({
    enum: ['active', 'archived', 'deleted'],
    example: 'active',
    description: 'Document status',
  })
  @IsOptional()
  @IsEnum(['active', 'archived', 'deleted'])
  status?: string;
}

export class DocumentQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Page number for pagination',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'Number of documents per page',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 'requirements',
    description: 'Search term for document name or description',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'Filter by project ID',
  })
  @IsOptional()
  @IsMongoId()
  project?: string;

  @ApiPropertyOptional({
    enum: DocumentVisibility,
    example: 'project',
    description: 'Filter by visibility level',
  })
  @IsOptional()
  @IsEnum(DocumentVisibility)
  visibility?: string;

  @ApiPropertyOptional({
    enum: ['active', 'archived', 'deleted'],
    example: 'active',
    description: 'Filter by document status',
    default: 'active',
  })
  @IsOptional()
  @IsEnum(['active', 'archived', 'deleted'])
  status?: string = 'active';

  @ApiPropertyOptional({
    example: ['documentation', 'medical'],
    description: 'Filter by tags',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    example: 'createdAt',
    enum: ['createdAt', 'updatedAt', 'name', 'size', 'downloadCount'],
    description: 'Sort field',
    default: 'createdAt',
  })
  @IsOptional()
  @IsEnum(['createdAt', 'updatedAt', 'name', 'size', 'downloadCount'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    example: 'desc',
    enum: ['asc', 'desc'],
    description: 'Sort order',
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: string = 'desc';

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439012',
    description: 'Filter by uploader user ID',
  })
  @IsOptional()
  @IsMongoId()
  uploadedBy?: string;

  @ApiPropertyOptional({
    example: 'application/pdf',
    description: 'Filter by MIME type',
  })
  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class ShareDocumentDto {
  @ApiProperty({
    example: ['507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'],
    description: 'User IDs to share the document with',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  userIds: string[];
}

export class DocumentResponseDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Document ID',
  })
  id: string;

  @ApiProperty({
    example: 'Project Requirements Document',
    description: 'Document name',
  })
  name: string;

  @ApiPropertyOptional({
    example: 'Detailed requirements for the medical platform project',
    description: 'Document description',
  })
  description?: string;

  @ApiProperty({
    example: 'requirements.pdf',
    description: 'Original filename',
  })
  originalName: string;

  @ApiProperty({
    example: 'application/pdf',
    description: 'MIME type of the document',
  })
  mimeType: string;

  @ApiProperty({
    example: 2048576,
    description: 'File size in bytes',
  })
  size: number;

  @ApiProperty({
    example: 'project',
    enum: DocumentVisibility,
    description: 'Document visibility level',
  })
  visibility: string;

  @ApiProperty({
    example: ['requirements', 'documentation', 'medical'],
    description: 'Document tags',
    type: [String],
  })
  tags: string[];

  @ApiProperty({
    example: 'active',
    enum: ['active', 'archived', 'deleted'],
    description: 'Document status',
  })
  status: string;

  @ApiProperty({
    example: 15,
    description: 'Number of times downloaded',
  })
  downloadCount: number;

  @ApiPropertyOptional({
    example: '2024-01-15T10:30:00Z',
    description: 'Last download timestamp',
  })
  lastDownloadedAt?: Date;

  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'User ID who uploaded the document',
  })
  uploadedBy: string;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'Associated project ID',
  })
  project?: string;

  @ApiProperty({
    example: ['507f1f77bcf86cd799439013', '507f1f77bcf86cd799439014'],
    description: 'User IDs who have access to the document',
    type: [String],
  })
  sharedWith: string[];

  @ApiProperty({
    example: '2024-01-15T09:00:00Z',
    description: 'Document creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Document last update timestamp',
  })
  updatedAt: Date;
}

export class DocumentStatsDto {
  @ApiProperty({
    example: 150,
    description: 'Total number of documents',
  })
  totalDocuments: number;

  @ApiProperty({
    example: 1073741824,
    description: 'Total storage used in bytes',
  })
  totalStorageUsed: number;

  @ApiProperty({
    example: 1250,
    description: 'Total download count across all documents',
  })
  totalDownloads: number;

  @ApiProperty({
    example: 25,
    description: 'Number of documents uploaded this month',
  })
  documentsThisMonth: number;

  @ApiProperty({
    example: {
      'application/pdf': 45,
      'image/jpeg': 30,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 25,
      'text/plain': 20,
      'application/vnd.ms-excel': 15,
      other: 15,
    },
    description: 'Document count by MIME type',
  })
  documentsByType: Record<string, number>;
}
