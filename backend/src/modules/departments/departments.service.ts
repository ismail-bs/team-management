import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Department, DepartmentDocument } from './schemas/department.schema';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentResponseDto,
} from './dto/department.dto';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class DepartmentsService {
  private logger: Logger = new Logger('DepartmentsService');

  constructor(
    @InjectModel(Department.name)
    private departmentModel: Model<DepartmentDocument>,
    @InjectModel('User')
    private userModel: Model<User>,
  ) {}

  async create(
    createDepartmentDto: CreateDepartmentDto,
    userId: string,
  ): Promise<DepartmentDocument> {
    // Check if department name already exists
    const existing = await this.departmentModel
      .findOne({ name: new RegExp(`^${createDepartmentDto.name}$`, 'i') })
      .exec();

    if (existing) {
      throw new ConflictException('Department with this name already exists');
    }

    const department = new this.departmentModel({
      name: createDepartmentDto.name,
      description: createDepartmentDto.description,
      head: createDepartmentDto.head
        ? new Types.ObjectId(createDepartmentDto.head)
        : undefined,
      createdBy: new Types.ObjectId(userId),
      employeeCount: 0,
      isActive: true, // Explicitly set to true
    });

    const savedDepartment = await department.save();
    this.logger.log(
      `Department created: ${savedDepartment.name}, isActive: ${savedDepartment.isActive}`,
    );

    return this.findById(savedDepartment._id.toString());
  }

  async findAll(): Promise<DepartmentDocument[]> {
    return this.departmentModel
      .find({ isActive: true })
      .populate('head', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName')
      .sort({ name: 1 })
      .exec();
  }

  async findById(id: string): Promise<DepartmentDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid department ID');
    }

    const department = await this.departmentModel
      .findById(id)
      .populate('head', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName')
      .exec();

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  async update(
    id: string,
    updateDepartmentDto: UpdateDepartmentDto,
    userId: string,
  ): Promise<DepartmentDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid department ID');
    }

    const department = await this.departmentModel.findById(id);

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    this.logger.log(
      `Updating department ${id} with data:`,
      updateDepartmentDto,
    );

    // Check for duplicate name if name is being updated
    if (
      updateDepartmentDto.name &&
      updateDepartmentDto.name !== department.name
    ) {
      const existing = await this.departmentModel
        .findOne({
          name: new RegExp(`^${updateDepartmentDto.name}$`, 'i'),
          _id: { $ne: id },
        })
        .exec();

      if (existing) {
        throw new ConflictException('Department with this name already exists');
      }
    }

    // Only update the fields that are provided
    if (updateDepartmentDto.name !== undefined) {
      department.name = updateDepartmentDto.name;
    }
    if (updateDepartmentDto.description !== undefined) {
      department.description = updateDepartmentDto.description;
    }
    if (updateDepartmentDto.head !== undefined) {
      department.head = updateDepartmentDto.head
        ? new Types.ObjectId(updateDepartmentDto.head)
        : undefined;
    }
    if (updateDepartmentDto.isActive !== undefined) {
      department.isActive = updateDepartmentDto.isActive;
    }

    const updated = await department.save();

    this.logger.log(
      `Department updated successfully: ${updated.name}, isActive: ${updated.isActive}`,
    );

    return this.findById(updated._id.toString());
  }

  async remove(id: string, userId: string): Promise<void> {
    const department = await this.departmentModel.findById(id);

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    // Check if department has employees
    const employeeCount = await this.userModel.countDocuments({
      department: id,
    });

    if (employeeCount > 0) {
      // Soft delete - mark as inactive
      department.isActive = false;
      await department.save();
      this.logger.log(
        `Department soft-deleted (has ${employeeCount} employees): ${department.name}`,
      );
    } else {
      // Hard delete - no employees
      await this.departmentModel.findByIdAndDelete(id);
      this.logger.log(`Department deleted: ${department.name}`);
    }
  }

  async updateEmployeeCount(departmentId: string): Promise<void> {
    if (!Types.ObjectId.isValid(departmentId)) {
      return;
    }

    const count = await this.userModel.countDocuments({
      department: departmentId,
    });

    await this.departmentModel.findByIdAndUpdate(departmentId, {
      employeeCount: count,
    });
  }
}
