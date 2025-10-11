import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { ChatService } from '../chat/chat.service';
import {
  LoginDto,
  RegisterDto,
  InviteUserDto,
  AcceptInviteDto,
  AuthResponseDto,
} from './dto/auth.dto';
import { Role } from '../../common/enums/role.enum.js';
import { UserStatus } from '../../common/enums/status.enum.js';

@Injectable()
export class AuthService {
  private logger: Logger = new Logger('AuthService');

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private chatService: ChatService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const user = await this.usersService.create({
      ...registerDto,
      status: UserStatus.ACTIVE,
    });

    const tokens = await this.generateTokens(
      user._id.toString(),
      user.email,
      user.role,
    );
    await this.usersService.updateRefreshToken(
      user._id.toString(),
      tokens.refreshToken,
    );
    await this.usersService.updateLastLogin(user._id.toString());

    return {
      ...tokens,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    const userId = user._id.toString();

    const tokens = await this.generateTokens(userId, user.email, user.role);
    await this.usersService.updateRefreshToken(userId, tokens.refreshToken);
    await this.usersService.updateLastLogin(userId);

    return {
      ...tokens,
      user: {
        id: userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
      },
    };
  }

  async inviteUser(
    inviteUserDto: InviteUserDto,
    invitedBy: string,
  ): Promise<{ message: string; inviteToken: string }> {
    const existingUser = await this.usersService.findByEmail(
      inviteUserDto.email,
    );
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpires = new Date();
    inviteExpires.setHours(inviteExpires.getHours() + 24); // 24 hours expiry

    // Create user with pending status
    const user = await this.usersService.create({
      email: inviteUserDto.email,
      firstName: inviteUserDto.firstName,
      lastName: inviteUserDto.lastName,
      password: crypto.randomBytes(16).toString('hex'), // Temporary password
      role: inviteUserDto.role,
      department: inviteUserDto.department,
      status: UserStatus.PENDING,
    });

    await this.usersService.setInviteToken(
      user._id.toString(),
      inviteToken,
      inviteExpires,
    );

    // Get inviter details for personalized email
    let invitedByName: string | undefined;
    try {
      const inviter = await this.usersService.findById(invitedBy);
      invitedByName = `${inviter.firstName} ${inviter.lastName}`;
    } catch (error) {
      this.logger.warn(`Could not find inviter details: ${error.message}`);
    }

    // Send invitation email
    try {
      await this.emailService.sendInviteEmail({
        to: inviteUserDto.email,
        firstName: inviteUserDto.firstName,
        lastName: inviteUserDto.lastName,
        inviteToken,
        invitedByName,
      });
      this.logger.log(`Invitation email sent to ${inviteUserDto.email}`);
    } catch (error) {
      this.logger.error(`Failed to send invitation email: ${error.message}`);
      // Don't fail the invite if email fails - return token for manual sharing
    }

    return {
      message: 'Invitation sent successfully',
      inviteToken, // Return token for testing/manual sharing purposes
    };
  }

  async acceptInvite(
    acceptInviteDto: AcceptInviteDto,
  ): Promise<AuthResponseDto> {
    const user = await this.usersService.findByInviteToken(
      acceptInviteDto.token,
    );
    if (!user) {
      throw new BadRequestException('Invalid or expired invitation token');
    }

    // Update user with new password and activate account
    const updatedUser = await this.usersService.update(user._id.toString(), {
      password: acceptInviteDto.password,
      phone: acceptInviteDto.phone,
      location: acceptInviteDto.location,
      status: UserStatus.ACTIVE,
    });

    await this.usersService.clearInviteToken(user._id.toString());

    const tokens = await this.generateTokens(
      updatedUser._id.toString(),
      updatedUser.email,
      updatedUser.role,
    );
    await this.usersService.updateRefreshToken(
      updatedUser._id.toString(),
      tokens.refreshToken,
    );

    // Send welcome email
    try {
      await this.emailService.sendWelcomeEmail({
        to: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
      });
      this.logger.log(`Welcome email sent to ${updatedUser.email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email: ${error.message}`);
      // Don't fail the acceptance if email fails
    }

    // Auto-create department chat and add user
    if (updatedUser.department) {
      try {
        const deptConversation = await this.chatService.addUserToDepartmentChat(
          updatedUser._id.toString(),
          updatedUser.department.toString(),
        );

        if (deptConversation) {
          // Send welcome message to department chat
          await this.chatService.sendSystemMessage(
            deptConversation._id.toString(),
            `👋 ${updatedUser.firstName} ${updatedUser.lastName} has joined the ${updatedUser.department} team! Welcome aboard!`,
          );
          this.logger.log(
            `User ${updatedUser.email} added to ${updatedUser.department} department chat`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to add user to department chat: ${error.message}`,
        );
        // Don't fail the acceptance if chat creation fails
      }
    }

    return {
      ...tokens,
      user: {
        id: updatedUser._id.toString(),
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        status: updatedUser.status,
      },
    };
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isValid = await this.usersService.validateRefreshToken(
      user._id.toString(),
      refreshToken,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(
      user._id.toString(),
      user.email,
      user.role,
    );
    await this.usersService.updateRefreshToken(
      user._id.toString(),
      tokens.refreshToken,
    );

    return tokens;
  }

  async logout(userId: string): Promise<{ message: string }> {
    await this.usersService.clearRefreshToken(userId);
    return { message: 'Logged out successfully' };
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: Role,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.expiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
