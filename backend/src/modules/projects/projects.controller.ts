import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectResponseDto,
  AddTeamMemberDto,
  RemoveTeamMemberDto,
  ProjectStatsDto,
} from './dto/project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  RequirePermissions,
  Resource,
} from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { Role } from '../../common/enums/role.enum.js';
import { ProjectStatus } from '../../common/enums/project-status.enum.js';
import { Priority } from '../../common/enums/priority.enum.js';
import type {
  PaginationQuery,
  PaginatedResponse,
} from '../../common/interfaces/base.interface';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@ApiTags('projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.PROJECT_CREATE)
  @ApiOperation({ summary: 'Create a new project (Admin only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Project created successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only Admin can create projects',
  })
  async create(
    @Body() createProjectDto: CreateProjectDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.create(
      createProjectDto,
      req.user.sub,
    );

    return this.projectsService.findByIdWithResponse(project?._id?.toString());
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ProjectStatus })
  @ApiQuery({ name: 'priority', required: false, enum: Priority })
  @ApiQuery({ name: 'projectManager', required: false, type: String })
  @ApiQuery({ name: 'teamMember', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Projects retrieved successfully',
  })
  async findAll(
    @Query()
    query: PaginationQuery & {
      status?: ProjectStatus;
      priority?: Priority;
      projectManager?: string;
      teamMember?: string;
    },
  ): Promise<PaginatedResponse<ProjectResponseDto>> {
    return this.projectsService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get project statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project statistics retrieved successfully',
    type: ProjectStatsDto,
  })
  async getStats(
    @Request() req: AuthenticatedRequest,
  ): Promise<ProjectStatsDto> {
    return this.projectsService.getProjectStats(req.user.sub, req.user.role);
  }

  @Get('my-projects')
  @ApiOperation({ summary: "Get current user's projects" })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User projects retrieved successfully',
  })
  async getMyProjects(
    @Query() query: PaginationQuery,
    @Request() req: AuthenticatedRequest,
  ): Promise<PaginatedResponse<ProjectResponseDto>> {
    return this.projectsService.getUserProjects(req.user.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project retrieved successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found',
  })
  async findOne(@Param('id') id: string): Promise<ProjectResponseDto> {
    return this.projectsService.findByIdWithResponse(id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.PROJECT_UPDATE)
  @Resource('project')
  @ApiOperation({ summary: 'Update project (Admin/PM for their projects)' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project updated successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.update(
      id,
      updateProjectDto,
      req.user.sub,
      req.user.role,
    );

    return this.projectsService.findByIdWithResponse(project?._id?.toString());
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.PROJECT_DELETE)
  @Resource('project')
  @ApiOperation({ summary: 'Delete project (Admin/PM for their projects)' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Project deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async remove(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.projectsService.delete(id, req.user.sub, req.user.role);
  }

  @Post(':id/team-members')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.PROJECT_MANAGE_TEAM)
  @Resource('project')
  @ApiOperation({
    summary: 'Add team member to project (Admin/PM for their projects)',
  })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Team member added successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'User is already a team member',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async addTeamMember(
    @Param('id') id: string,
    @Body() addTeamMemberDto: AddTeamMemberDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.addTeamMember(
      id,
      addTeamMemberDto.userId,
      req.user.sub,
      req.user.role,
    );

    return this.projectsService.findByIdWithResponse(project?._id?.toString());
  }

  @Delete(':id/team-members')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.PROJECT_MANAGE_TEAM)
  @Resource('project')
  @ApiOperation({
    summary: 'Remove team member from project (Admin/PM for their projects)',
  })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Team member removed successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot remove project manager',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async removeTeamMember(
    @Param('id') id: string,
    @Body() removeTeamMemberDto: RemoveTeamMemberDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.removeTeamMember(
      id,
      removeTeamMemberDto.userId,
      req.user.sub,
      req.user.role,
    );

    return this.projectsService.findByIdWithResponse(project?._id?.toString());
  }
}
