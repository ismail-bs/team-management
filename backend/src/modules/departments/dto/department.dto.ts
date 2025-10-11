import {
  IsString,
  IsOptional,
  IsMongoId,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateDepartmentDto {
  @ApiProperty({
    description: 'Department name',
    example: 'Engineering',
    minLength: 1,
    maxLength: 100,
  })
  @IsString({ message: 'Department name must be a string' })
  @MinLength(1, { message: 'Department name is required' })
  @MaxLength(100, { message: 'Department name must not exceed 100 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiPropertyOptional({
    description: 'Department description',
    example: 'Software development and engineering team',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(500, {
    message: 'Description must not exceed 500 characters',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @ApiPropertyOptional({
    description: 'Department head user ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId({ message: 'Department head ID must be a valid MongoDB ObjectId' })
  head?: string;
}

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {
  @ApiPropertyOptional({
    description: 'Whether the department is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}

export class DepartmentResponseDto {
  @ApiProperty({ description: 'Department ID' })
  _id: string;

  @ApiProperty({ description: 'Department name' })
  name: string;

  @ApiProperty({ description: 'Department description', required: false })
  description?: string;

  @ApiProperty({ description: 'Department head details', required: false })
  head?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };

  @ApiProperty({ description: 'Number of employees in department' })
  employeeCount: number;

  @ApiProperty({ description: 'Whether department is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Creator details' })
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: string;
}
