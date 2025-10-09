import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import {
  PaginationQuery,
  PaginationResult,
} from '../../common/interfaces/base.interface';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const existingUser = await this.userModel.findOne({
      email: createUserDto.email,
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);
    const user = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
      joinDate: new Date(),
    });

    return user.save();
  }

  async findAll(
    options: PaginationQuery & {
      role?: Role;
      department?: string;
      status?: string;
      search?: string;
    },
  ): Promise<PaginationResult<UserDocument>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      role,
      department,
      status,
      search,
    } = options;
    const skip = (page - 1) * limit;

    const sortOptions: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    // Build filter query
    const filter: Record<string, any> = {};

    if (role) {
      filter.role = role;
    }

    if (department) {
      filter.department = department;
    }

    if (status) {
      filter.status = status;
    }

    if (search) {
      // Escape special regex characters to prevent ReDoS attacks
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { firstName: { $regex: escapedSearch, $options: 'i' } },
        { lastName: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } },
        { department: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select(
          '-password -refreshToken -inviteToken -emailVerificationToken -passwordResetToken',
        )
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('projects', 'name status')
        .exec(),
      this.userModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel
      .findById(id)
      .select(
        '-password -refreshToken -inviteToken -emailVerificationToken -passwordResetToken',
      )
      .populate('projects', 'title status')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByInviteToken(token: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        inviteToken: token,
        inviteExpires: { $gt: new Date() },
      })
      .exec();
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 12);
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .select(
        '-password -refreshToken -inviteToken -emailVerificationToken -passwordResetToken',
      )
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  async updateRefreshToken(id: string, refreshToken: string): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);
    await this.userModel
      .findByIdAndUpdate(id, { refreshToken: hashedRefreshToken })
      .exec();
  }

  async validateRefreshToken(
    id: string,
    refreshToken: string,
  ): Promise<boolean> {
    const user = await this.userModel
      .findById(id)
      .select('refreshToken')
      .exec();
    if (!user || !user.refreshToken) {
      return false;
    }
    return bcrypt.compare(refreshToken, user.refreshToken);
  }

  async clearRefreshToken(id: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, { refreshToken: null }).exec();
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(id, { lastLogin: new Date() })
      .exec();
  }

  async validatePassword(
    user: UserDocument,
    password: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  async setInviteToken(
    id: string,
    token: string,
    expires: Date,
  ): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(id, {
        inviteToken: token,
        inviteExpires: expires,
      })
      .exec();
  }

  async clearInviteToken(id: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(id, {
        inviteToken: null,
        inviteExpires: null,
      })
      .exec();
  }

  async findProjectManagers(): Promise<UserDocument[]> {
    return this.userModel
      .find({
        role: { $in: [Role.PROJECT_MANAGER, Role.ADMIN] },
        status: 'active',
      })
      .select(
        '-password -refreshToken -inviteToken -inviteExpires -emailVerificationToken -passwordResetToken',
      )
      .sort({ firstName: 1, lastName: 1 })
      .exec();
  }
}
