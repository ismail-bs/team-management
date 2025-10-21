import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
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
import {
  Department,
  DepartmentDocument,
} from '../departments/schemas/department.schema';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Department.name)
    private departmentModel: Model<DepartmentDocument>,
  ) {}

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

    const saved = await user.save();

    // If user is assigned to a department, update that department's employee count
    if (saved.department) {
      const deptId = saved.department?.toString();
      const count = await this.userModel.countDocuments({ department: deptId });
      await this.departmentModel.findByIdAndUpdate(deptId, {
        employeeCount: count,
      });
    }

    return saved;
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

    this.logger.log('📊 User query filters:', {
      role,
      department,
      status,
      search,
      page,
      limit,
    });

    if (role) {
      filter.role = role;
      this.logger.log('✅ Filtering by role:', role);
    }

    if (department) {
      filter.department = new Types.ObjectId(department);
      this.logger.log('✅ Filtering by department:', department);
    }

    if (status) {
      filter.status = status;
      this.logger.log('✅ Filtering by status:', status);
    }

    if (search) {
      // Escape special regex characters to prevent ReDoS attacks
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { firstName: { $regex: escapedSearch, $options: 'i' } },
        { lastName: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    this.logger.log('🔍 Final MongoDB filter:', JSON.stringify(filter));

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
        .populate('department', 'name')
        .exec(),
      this.userModel.countDocuments(filter),
    ]);

    this.logger.log(
      `✅ Found ${total} total users, returning ${data.length} for page ${page}`,
    );

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
      .populate('department', 'name')
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
    // Track previous department to update counts if it changes
    const prev = await this.userModel.findById(id).select('department').exec();
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

    // Recalculate employee counts if department changed
    const prevDept = prev?.department ? prev.department?.toString() : null;
    const newDept = user.department ? user.department?.toString() : null;

    if (prevDept !== newDept) {
      if (prevDept) {
        const prevCount = await this.userModel.countDocuments({
          department: prevDept,
        });
        await this.departmentModel.findByIdAndUpdate(prevDept, {
          employeeCount: prevCount,
        });
      }
      if (newDept) {
        const newCount = await this.userModel.countDocuments({
          department: newDept,
        });
        await this.departmentModel.findByIdAndUpdate(newDept, {
          employeeCount: newCount,
        });
      }
    }

    return user;
  }

  async remove(id: string): Promise<void> {
    const user = await this.userModel.findById(id).select('department').exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userModel.findByIdAndDelete(id).exec();

    // Update employee count for the user's former department
    const deptId = user.department ? user.department?.toString() : null;
    if (deptId) {
      const count = await this.userModel.countDocuments({ department: deptId });
      await this.departmentModel.findByIdAndUpdate(deptId, {
        employeeCount: count,
      });
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

  async getUserStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      total,
      admins,
      projectManagers,
      members,
      active,
      inactive,
      newThisMonth,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ role: Role.ADMIN }),
      this.userModel.countDocuments({ role: Role.PROJECT_MANAGER }),
      this.userModel.countDocuments({ role: Role.MEMBER }),
      this.userModel.countDocuments({ status: 'active' }),
      this.userModel.countDocuments({ status: 'inactive' }),
      this.userModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
    ]);

    return {
      total,
      admins,
      projectManagers,
      members,
      active,
      inactive,
      newThisMonth,
    };
  }
}
