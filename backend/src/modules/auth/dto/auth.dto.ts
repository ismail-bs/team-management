import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  Matches,
} from 'class-validator';
import { Role } from '../../../common/enums/role.enum.js';

export class LoginDto {
  @ApiProperty({
    example: 'admin@teamplatform.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Admin123!',
    description: 'User password',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @ApiProperty({
    example: 'john.doe@company.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description:
      'User password (minimum 8 characters, must contain uppercase, lowercase, number)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(100, { message: 'Password must not exceed 100 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    },
  )
  password: string;

  @ApiProperty({
    example: 'John',
    description: 'User first name',
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'User phone number',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: 'Engineering',
    description: 'User department',
    required: false,
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({
    example: 'New York',
    description: 'User location',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;
}

export class InviteUserDto {
  @ApiProperty({
    example: 'newuser@company.com',
    description: 'Email address to send invitation',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'John',
    description: 'First name of the invited user',
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name of the invited user',
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    enum: Role,
    example: Role.MEMBER,
    description: 'Role to assign to the invited user',
  })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({
    example: 'Engineering',
    description: 'Department of the invited user',
    required: false,
  })
  @IsOptional()
  @IsString()
  department?: string;
}

export class AcceptInviteDto {
  @ApiProperty({
    example: 'invitation-token-here',
    description: 'Invitation token received via email',
  })
  @IsString()
  token: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description:
      'Password for the new account (minimum 8 characters, must contain uppercase, lowercase, number)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(100, { message: 'Password must not exceed 100 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    },
  )
  password: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'Phone number',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: 'New York',
    description: 'Location',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    example: 'refresh-token-here',
    description: 'Refresh token',
  })
  @IsString()
  refreshToken: string;
}

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  accessToken: string;

  @ApiProperty({
    example: 'refresh-token-here',
    description: 'JWT refresh token',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'User information',
  })
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    status: string;
  };
}
