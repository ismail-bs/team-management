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
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskQueryDto,
  TaskCommentDto,
  TaskResponseDto,
  TaskStatsDto,
} from './dto/task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Task created successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async create(
    @Body() createTaskDto: CreateTaskDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tasksService.create(createTaskDto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks with filtering and pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tasks retrieved successfully',
  })
  @ApiQuery({
    name: 'project',
    required: false,
    description: 'Filter by project ID',
  })
  @ApiQuery({
    name: 'assignedTo',
    required: false,
    description: 'Filter by assigned user ID',
  })
  @ApiQuery({
    name: 'createdBy',
    required: false,
    description: 'Filter by creator user ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    description: 'Filter by priority',
  })
  @ApiQuery({
    name: 'dueDateFrom',
    required: false,
    description: 'Filter by due date from',
  })
  @ApiQuery({
    name: 'dueDateTo',
    required: false,
    description: 'Filter by due date to',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search in title and description',
  })
  @ApiQuery({ name: 'tags', required: false, description: 'Filter by tags' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field' })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (asc/desc)',
  })
  async findAll(
    @Query() query: TaskQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.tasksService.findAll(query, req.user.sub);

    // Transform to standard paginated response format
    return {
      data: result.tasks,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get task statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task statistics retrieved successfully',
    type: TaskStatsDto,
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter stats by user ID',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Filter stats by project ID',
  })
  async getStats(
    @Query('userId') userId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.tasksService.getTaskStats(userId, projectId);
  }

  @Get('my-tasks')
  @ApiOperation({ summary: "Get current user's assigned tasks" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User tasks retrieved successfully',
  })
  async getMyTasks(
    @Query() query: TaskQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.tasksService.getTasksByUser(req.user.sub, query);

    // Transform to standard paginated response format
    return {
      data: result.tasks,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get tasks by project' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project tasks retrieved successfully',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  async getTasksByProject(
    @Param('projectId') projectId: string,
    @Query() query: TaskQueryDto,
  ) {
    const result = await this.tasksService.getTasksByProject(projectId, query);

    // Transform to standard paginated response format
    return {
      data: result.tasks,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task retrieved successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Task not found',
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  async findOne(@Param('id') id: string) {
    return this.tasksService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task updated successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Task not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tasksService.update(
      id,
      updateTaskDto,
      req.user.sub,
      req.user.role,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Task deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Task not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    await this.tasksService.remove(id, req.user.sub, req.user.role);
    return { message: 'Task deleted successfully' };
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add comment to task' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Comment added successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Task not found',
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  async addComment(
    @Param('id') id: string,
    @Body() commentDto: TaskCommentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tasksService.addComment(id, commentDto, req.user.sub);
  }

  @Delete(':id/comments/:commentIndex')
  @ApiOperation({ summary: 'Remove comment from task' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comment removed successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Task or comment not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Can only delete your own comments',
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiParam({ name: 'commentIndex', description: 'Comment index' })
  async removeComment(
    @Param('id') id: string,
    @Param('commentIndex', ParseIntPipe) commentIndex: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tasksService.removeComment(id, commentIndex, req.user.sub);
  }

  @Patch(':id/progress')
  @ApiOperation({ summary: 'Update task progress' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task progress updated successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Task not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  async updateProgress(
    @Param('id') id: string,
    @Body('progress') progress: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tasksService.updateProgress(id, progress, req.user.sub);
  }
}
