import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsPhoneNumber,
  MinLength,
  MaxLength,
  IsDateString,
  IsMongoId,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Role } from '../../../common/enums/role.enum';
import { UserStatus } from '../../../common/enums/status.enum';

export class CreateUserDto {
  @ApiProperty({
    example: 'john.doe@company.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase()?.trim())
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'User password',
    minLength: 6,
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({
    example: 'John',
    description: 'User first name',
    maxLength: 50,
  })
  @IsString({ message: 'First name must be a string' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
    maxLength: 50,
  })
  @IsString({ message: 'Last name must be a string' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  lastName: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'User phone number',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @ApiProperty({
    enum: Role,
    example: Role.MEMBER,
    description: 'User role',
    required: false,
  })
  @IsOptional()
  @IsEnum(Role, { message: 'Role must be a valid enum value' })
  role?: Role;

  @ApiProperty({
    example: 'Engineering',
    description: 'User department',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Department must be a string' })
  @MaxLength(100, { message: 'Department must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  department?: string;

  @ApiProperty({
    example: 'New York',
    description: 'User location',
    required: false,
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'Location must be a string' })
  @MaxLength(200, { message: 'Location must not exceed 200 characters' })
  @Transform(({ value }) => value?.trim())
  location?: string;

  @ApiProperty({
    enum: UserStatus,
    example: UserStatus.ACTIVE,
    description: 'User status',
    required: false,
  })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'Status must be a valid enum value' })
  status?: UserStatus;

  @ApiProperty({
    example:
      'Experienced software developer with expertise in React and Node.js',
    description: 'User bio',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Bio must be a string' })
  @MaxLength(500, { message: 'Bio must not exceed 500 characters' })
  bio?: string;

  @ApiProperty({
    example: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
    description: 'User skills',
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Skills must be an array' })
  @IsString({ each: true, message: 'Each skill must be a string' })
  @Transform(({ value }) => value?.map((skill: string) => skill?.trim()))
  skills?: string[];

  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    description: 'User avatar URL',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Avatar must be a string' })
  avatar?: string;

  @ApiProperty({
    example: 25,
    description: 'Number of completed tasks',
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tasks completed must be a number' })
  @Type(() => Number)
  tasksCompleted?: number;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}

// Admin update DTO - excludes email and password
export class AdminUpdateUserDto {
  @ApiProperty({
    example: 'John',
    description: 'User first name',
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  firstName?: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  lastName?: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'User phone number',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @ApiProperty({
    enum: Role,
    example: Role.MEMBER,
    description: 'User role',
    required: false,
  })
  @IsOptional()
  @IsEnum(Role, { message: 'Role must be a valid enum value' })
  role?: Role;

  @ApiProperty({
    example: 'Engineering',
    description: 'User department',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Department must be a string' })
  @MaxLength(100, { message: 'Department must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  department?: string;

  @ApiProperty({
    example: 'New York',
    description: 'User location',
    required: false,
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'Location must be a string' })
  @MaxLength(200, { message: 'Location must not exceed 200 characters' })
  @Transform(({ value }) => value?.trim())
  location?: string;

  @ApiProperty({
    enum: UserStatus,
    example: UserStatus.ACTIVE,
    description: 'User status',
    required: false,
  })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'Status must be a valid enum value' })
  status?: UserStatus;

  @ApiProperty({
    example: 'Experienced software developer',
    description: 'User bio',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Bio must be a string' })
  @MaxLength(500, { message: 'Bio must not exceed 500 characters' })
  bio?: string;

  @ApiProperty({
    example: ['JavaScript', 'React', 'Node.js'],
    description: 'User skills',
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Skills must be an array' })
  @IsString({ each: true, message: 'Each skill must be a string' })
  @Transform(({ value }) => value?.map((skill: string) => skill?.trim()))
  skills?: string[];

  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    description: 'User avatar URL',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Avatar must be a string' })
  avatar?: string;
}

export class UserResponseDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'User ID',
  })
  _id: string;

  @ApiProperty({
    example: 'john.doe@company.com',
    description: 'User email address',
  })
  email: string;

  @ApiProperty({
    example: 'John',
    description: 'User first name',
  })
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
  })
  lastName: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
  })
  fullName: string;

  @ApiProperty({
    example: 'JD',
    description: 'User initials',
  })
  initials: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'User phone number',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    enum: Role,
    example: Role.MEMBER,
    description: 'User role',
  })
  role: Role;

  @ApiProperty({
    example: 'Engineering',
    description: 'User department (can be string name or populated object)',
    required: false,
  })
  department?: string | { _id: string; name: string };

  @ApiProperty({
    example: 'New York',
    description: 'User location',
    required: false,
  })
  location?: string;

  @ApiProperty({
    enum: UserStatus,
    example: UserStatus.ACTIVE,
    description: 'User status',
  })
  status: UserStatus;

  @ApiProperty({
    example: '2024-01-15T10:00:00Z',
    description: 'User join date',
  })
  joinDate: Date;

  @ApiProperty({
    example: 'Experienced software developer',
    description: 'User bio',
    required: false,
  })
  bio?: string;

  @ApiProperty({
    example: ['JavaScript', 'React', 'Node.js'],
    description: 'User skills',
  })
  skills: string[];

  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    description: 'User avatar URL',
    required: false,
  })
  avatar?: string;

  @ApiProperty({
    example: 25,
    description: 'Number of completed tasks',
  })
  tasksCompleted: number;

  @ApiProperty({
    example: true,
    description: 'Email verification status',
  })
  isEmailVerified: boolean;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Last login timestamp',
    required: false,
  })
  lastLogin?: Date;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'User creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'User last update timestamp',
  })
  updatedAt: Date;
}

export class UserQueryDto {
  @ApiProperty({
    description: 'Page number',
    minimum: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number' })
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a number' })
  limit?: number = 10;

  @ApiProperty({
    description: 'Search term for name, email',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  search?: string;

  @ApiProperty({
    enum: Role,
    description: 'Filter by role',
    required: false,
  })
  @IsOptional()
  @IsEnum(Role, { message: 'Role must be a valid enum value' })
  role?: Role;

  @ApiProperty({
    description: 'Filter by department ID',
    required: false,
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId({ message: 'Department must be a valid MongoDB ObjectId' })
  department?: string;

  @ApiProperty({
    enum: UserStatus,
    description: 'Filter by status',
    required: false,
  })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'Status must be a valid enum value' })
  status?: UserStatus;

  @ApiProperty({
    description: 'Sort by field',
    enum: [
      'firstName',
      'lastName',
      'email',
      'joinDate',
      'lastLogin',
      'createdAt',
    ],
    default: 'createdAt',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Sort by must be a string' })
  sortBy?: string = 'createdAt';

  @ApiProperty({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Sort order must be a string' })
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class UserStatsResponseDto {
  @ApiProperty({
    example: 150,
    description: 'Total number of users',
  })
  total: number;

  @ApiProperty({
    example: 5,
    description: 'Number of admin users',
  })
  admins: number;

  @ApiProperty({
    example: 25,
    description: 'Number of project managers',
  })
  projectManagers: number;

  @ApiProperty({
    example: 120,
    description: 'Number of members',
  })
  members: number;

  @ApiProperty({
    example: 145,
    description: 'Number of active users',
  })
  active: number;

  @ApiProperty({
    example: 5,
    description: 'Number of inactive users',
  })
  inactive: number;

  @ApiProperty({
    example: 12,
    description: 'Number of users who joined this month',
  })
  newThisMonth: number;
}
