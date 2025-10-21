import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument } from './schemas/task.schema';
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskQueryDto,
  TaskCommentDto,
  TaskStatsDto,
} from './dto/task.dto';
import { TaskStatus } from '../../common/enums/status.enum';
import { ITaskService } from './interfaces/task-service.interface';

/**
 * Service handling all task-related business logic
 * Manages task CRUD operations, comments, progress tracking, and statistics
 */
@Injectable()
export class TasksService implements ITaskService {
  constructor(@InjectModel(Task.name) private taskModel: Model<TaskDocument>) {}

  /**
   * Creates a new task in the system
   * Handles parent-child task relationships and dependency tracking
   * @param createTaskDto - Task creation data including title, project, assignee
   * @param userId - ID of user creating the task (set as createdBy)
   * @returns Created task document with all relations populated
   */
  async create(
    createTaskDto: CreateTaskDto,
    userId: string,
  ): Promise<TaskDocument> {
    const taskData = {
      ...createTaskDto,
      createdBy: new Types.ObjectId(userId),
      project: new Types.ObjectId(createTaskDto.project),
      assignedTo: createTaskDto.assignedTo
        ? new Types.ObjectId(createTaskDto.assignedTo)
        : undefined,
      parentTask: createTaskDto.parentTask
        ? new Types.ObjectId(createTaskDto.parentTask)
        : undefined,
      dependencies:
        createTaskDto.dependencies?.map((id) => new Types.ObjectId(id)) || [],
    };

    const task = new this.taskModel(taskData);
    const savedTask = await task.save();

    // If this is a subtask, add it to parent's subtasks array
    if (createTaskDto.parentTask) {
      await this.taskModel.findByIdAndUpdate(createTaskDto.parentTask, {
        $addToSet: { subtasks: savedTask?._id },
      });
    }

    return this.findById(savedTask?._id?.toString());
  }

  async findAll(
    query: TaskQueryDto,
    userId: string,
  ): Promise<{
    tasks: TaskDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      project,
      assignedTo,
      createdBy,
      status,
      priority,
      dueDateFrom,
      dueDateTo,
      search,
      tags,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: Record<string, unknown> = {};

    // Build filter conditions
    if (project) filter.project = new Types.ObjectId(project);
    if (assignedTo) filter.assignedTo = new Types.ObjectId(assignedTo);
    if (createdBy) filter.createdBy = new Types.ObjectId(createdBy);
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (tags && tags.length > 0) filter.tags = { $in: tags };

    // Date range filter
    if (dueDateFrom || dueDateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dueDateFrom) dateFilter.$gte = new Date(dueDateFrom);
      if (dueDateTo) dateFilter.$lte = new Date(dueDateTo);
      filter.dueDate = dateFilter;
    }

    // Search filter - escape special regex characters to prevent ReDoS attacks
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const sortOptions: Record<string, 1 | -1> = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [tasks, total] = await Promise.all([
      this.taskModel
        .find(filter)
        .populate('project', 'name')
        .populate('assignedTo', 'firstName lastName email avatar')
        .populate('createdBy', 'firstName lastName email avatar')
        .populate('parentTask', 'title')
        .populate('subtasks', 'title status progress')
        .populate('dependencies', 'title status')
        .populate('comments.user', 'firstName lastName avatar')
        .populate('attachments.uploadedBy', 'firstName lastName')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.taskModel.countDocuments(filter),
    ]);

    return {
      tasks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<TaskDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid task ID');
    }

    const task = await this.taskModel
      .findById(id)
      .populate('project', 'name description')
      .populate('assignedTo', 'firstName lastName email avatar department')
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('parentTask', 'title status progress')
      .populate('subtasks', 'title status progress dueDate assignedTo')
      .populate('dependencies', 'title status progress')
      .populate('comments.user', 'firstName lastName avatar')
      .populate('attachments.uploadedBy', 'firstName lastName')
      .exec();

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    userId: string,
  ): Promise<TaskDocument> {
    const task = await this.findById(id);

    // Check if user has permission to update (creator, assignee, or admin)
    const canUpdate =
      (task.createdBy && task.createdBy?._id?.toString() === userId) ||
      (task.assignedTo && task.assignedTo?._id?.toString() === userId);

    if (!canUpdate) {
      throw new ForbiddenException(
        'You do not have permission to update this task',
      );
    }

    const updateData: Record<string, unknown> = { ...updateTaskDto };

    // Handle ObjectId conversions
    if (updateTaskDto.project)
      updateData.project = new Types.ObjectId(updateTaskDto.project);
    if (updateTaskDto.assignedTo)
      updateData.assignedTo = new Types.ObjectId(updateTaskDto.assignedTo);
    if (updateTaskDto.parentTask)
      updateData.parentTask = new Types.ObjectId(updateTaskDto.parentTask);
    if (updateTaskDto.dependencies) {
      updateData.dependencies = updateTaskDto.dependencies.map(
        (id) => new Types.ObjectId(id),
      );
    }

    // Handle parent task changes
    if (
      updateTaskDto.parentTask &&
      updateTaskDto.parentTask !== task.parentTask?.toString()
    ) {
      // Remove from old parent
      if (task.parentTask) {
        await this.taskModel.findByIdAndUpdate(task.parentTask, {
          $pull: { subtasks: task?._id },
        });
      }
      // Add to new parent
      await this.taskModel.findByIdAndUpdate(updateTaskDto.parentTask, {
        $addToSet: { subtasks: task?._id },
      });
    }

    const updatedTask = await this.taskModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!updatedTask) {
      throw new NotFoundException('Task not found after update');
    }

    return this.findById(updatedTask?._id?.toString());
  }

  async remove(id: string, userId: string): Promise<void> {
    const task = await this.findById(id);

    // Check if user has permission to delete (creator only or admin)
    if (task.createdBy?._id?.toString() !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this task',
      );
    }

    // Remove from parent's subtasks if it's a subtask
    if (task.parentTask) {
      await this.taskModel.findByIdAndUpdate(task.parentTask, {
        $pull: { subtasks: task?._id },
      });
    }

    // Delete all subtasks
    if (task?.subtasks && task?.subtasks?.length > 0) {
      await this.taskModel.deleteMany({ _id: { $in: task?.subtasks } });
    }

    // Remove this task from dependencies of other tasks
    await this.taskModel.updateMany(
      { dependencies: task?._id },
      { $pull: { dependencies: task?._id } },
    );

    await this.taskModel.findByIdAndDelete(id);
  }

  async addComment(
    id: string,
    commentDto: TaskCommentDto,
    userId: string,
  ): Promise<TaskDocument> {
    const task = await this.findById(id);

    const comment = {
      user: new Types.ObjectId(userId),
      comment: commentDto.comment,
      createdAt: new Date(),
    };

    await this.taskModel.findByIdAndUpdate(id, {
      $push: { comments: comment },
    });

    return this.findById(id);
  }

  async removeComment(
    taskId: string,
    commentIndex: number,
    userId: string,
  ): Promise<TaskDocument> {
    const task = await this.findById(taskId);

    if (!task?.comments || commentIndex >= task?.comments?.length) {
      throw new NotFoundException('Comment not found');
    }

    const comment = task.comments[commentIndex];
    if (comment.user?.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    task?.comments?.splice(commentIndex, 1);
    await task.save();

    return this.findById(taskId);
  }

  async getTasksByProject(
    projectId: string,
    query: TaskQueryDto,
  ): Promise<{
    tasks: TaskDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryWithProject = { ...query, project: projectId };
    return this.findAll(queryWithProject, '');
  }

  async getTasksByUser(
    userId: string,
    query: TaskQueryDto,
  ): Promise<{
    tasks: TaskDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryWithUser = { ...query, assignedTo: userId };
    return this.findAll(queryWithUser, userId);
  }

  /**
   * Calculates comprehensive task statistics with optional filtering
   * Provides metrics on task status distribution, overdue tasks, and completion rates
   * @param userId - Optional user ID to filter tasks assigned to specific user
   * @param projectId - Optional project ID to filter tasks by project
   * @returns Task statistics including counts by status and time-based metrics
   */
  async getTaskStats(
    userId?: string,
    projectId?: string,
  ): Promise<TaskStatsDto> {
    const filter: Record<string, Types.ObjectId> = {};
    if (userId) filter.assignedTo = new Types.ObjectId(userId);
    if (projectId) filter.project = new Types.ObjectId(projectId);

    const now = new Date();
    const weekStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - now.getDay(),
    );
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      total,
      open,
      inProgress,
      resolved,
      closed,
      overdue,
      completedThisWeek,
      completedThisMonth,
    ] = await Promise.all([
      this.taskModel.countDocuments(filter),
      this.taskModel.countDocuments({ ...filter, status: TaskStatus.OPEN }),
      this.taskModel.countDocuments({
        ...filter,
        status: TaskStatus.IN_PROGRESS,
      }),
      this.taskModel.countDocuments({ ...filter, status: TaskStatus.RESOLVED }),
      this.taskModel.countDocuments({ ...filter, status: TaskStatus.CLOSED }),
      this.taskModel.countDocuments({
        ...filter,
        dueDate: { $lt: now },
        status: { $nin: [TaskStatus.RESOLVED, TaskStatus.CLOSED] },
      }),
      this.taskModel.countDocuments({
        ...filter,
        status: { $in: [TaskStatus.RESOLVED, TaskStatus.CLOSED] },
        updatedAt: { $gte: weekStart },
      }),
      this.taskModel.countDocuments({
        ...filter,
        status: { $in: [TaskStatus.RESOLVED, TaskStatus.CLOSED] },
        updatedAt: { $gte: monthStart },
      }),
    ]);

    return {
      total,
      open,
      inProgress,
      resolved,
      closed,
      overdue,
      completedThisWeek,
      completedThisMonth,
    };
  }

  /**
   * Updates task progress percentage and auto-adjusts status
   * Implements smart status transitions based on progress value
   * @param id - Task ID
   * @param progress - Progress percentage (0-100)
   * @param userId - ID of user updating progress (must be creator or assignee)
   * @returns Updated task document
   * @throws ForbiddenException if user is not creator or assignee
   *
   * Status auto-update logic:
   * - progress = 0 → status changes to OPEN
   * - 0 < progress < 100 → status changes to IN_PROGRESS
   * - progress = 100 → status changes to RESOLVED
   */
  async updateProgress(
    id: string,
    progress: number,
    userId: string,
  ): Promise<TaskDocument> {
    const task = await this.findById(id);

    // Permission check: Only creator or assignee can update progress
    const canUpdate =
      (task.createdBy && task.createdBy?._id?.toString() === userId) ||
      (task.assignedTo && task.assignedTo?._id?.toString() === userId);

    if (!canUpdate) {
      throw new ForbiddenException(
        'You do not have permission to update this task',
      );
    }

    // Auto-update status based on progress percentage
    let status = task.status;
    if (progress === 0 && status === TaskStatus.IN_PROGRESS) {
      status = TaskStatus.OPEN;
    } else if (progress > 0 && progress < 100 && status === TaskStatus.OPEN) {
      status = TaskStatus.IN_PROGRESS;
    } else if (progress === 100) {
      status = TaskStatus.RESOLVED;
    }

    await this.taskModel.findByIdAndUpdate(id, { progress, status });
    return this.findById(id);
  }
}
