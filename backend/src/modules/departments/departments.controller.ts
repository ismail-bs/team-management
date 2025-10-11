import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentResponseDto,
} from './dto/department.dto';
import { DepartmentDocument } from './schemas/department.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@ApiTags('departments')
@Controller('departments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new department (Admin only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Department created successfully',
    type: DepartmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Department with this name already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only Admin can create departments',
  })
  async create(
    @Body() createDepartmentDto: CreateDepartmentDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<DepartmentDocument> {
    return this.departmentsService.create(createDepartmentDto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active departments' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Departments retrieved successfully',
    type: [DepartmentResponseDto],
  })
  async findAll(): Promise<DepartmentDocument[]> {
    return this.departmentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific department' })
  @ApiParam({ name: 'id', description: 'Department ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Department retrieved successfully',
    type: DepartmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Department not found',
  })
  async findOne(@Param('id') id: string): Promise<DepartmentDocument> {
    return this.departmentsService.findById(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a department (Admin only)' })
  @ApiParam({ name: 'id', description: 'Department ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Department updated successfully',
    type: DepartmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Department not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only Admin can update departments',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<DepartmentDocument> {
    return this.departmentsService.update(
      id,
      updateDepartmentDto,
      req.user.sub,
    );
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a department (Admin only)' })
  @ApiParam({ name: 'id', description: 'Department ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Department deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Department not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only Admin can delete departments',
  })
  async remove(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.departmentsService.remove(id, req.user.sub);
  }
}
