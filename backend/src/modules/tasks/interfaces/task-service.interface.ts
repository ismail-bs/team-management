import { TaskDocument } from '../schemas/task.schema';
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskCommentDto,
  TaskQueryDto,
  TaskStatsDto,
} from '../dto/task.dto';

/**
 * Interface defining the contract for Task Service operations
 * Ensures consistent implementation and enables better testing/mocking
 */
export interface ITaskService {
  /**
   * Creates a new task
   * @param createTaskDto - Task creation data
   * @param userId - ID of user creating the task
   * @returns Created task document with populated relations
   */
  create(createTaskDto: CreateTaskDto, userId: string): Promise<TaskDocument>;

  /**
   * Retrieves a paginated list of tasks with optional filtering
   * @param query - Query parameters including filters, pagination, and sorting
   * @param userId - ID of user making the request
   * @returns Paginated task list with populated relations
   */
  findAll(
    query: TaskQueryDto,
    userId: string,
  ): Promise<{
    tasks: TaskDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  /**
   * Retrieves a single task by ID with all relations populated
   * @param id - Task ID
   * @returns Task document with populated project, assignee, creator, subtasks, dependencies
   * @throws NotFoundException if task not found
   * @throws BadRequestException if ID is invalid
   */
  findById(id: string): Promise<TaskDocument>;

  /**
   * Updates an existing task
   * @param id - Task ID to update
   * @param updateTaskDto - Fields to update
   * @param userId - ID of user making the update
   * @returns Updated task document
   * @throws NotFoundException if task not found
   * @throws ForbiddenException if user lacks permission
   */
  update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    userId: string,
  ): Promise<TaskDocument>;

  /**
   * Deletes a task and handles cleanup (subtasks, dependencies)
   * @param id - Task ID to delete
   * @param userId - ID of user deleting the task
   * @throws NotFoundException if task not found
   * @throws ForbiddenException if user is not the creator
   */
  remove(id: string, userId: string): Promise<void>;

  /**
   * Adds a comment to a task
   * @param id - Task ID
   * @param commentDto - Comment content
   * @param userId - ID of user adding the comment
   * @returns Updated task document
   */
  addComment(
    id: string,
    commentDto: TaskCommentDto,
    userId: string,
  ): Promise<TaskDocument>;

  /**
   * Removes a comment from a task
   * @param taskId - Task ID
   * @param commentIndex - Index of comment to remove
   * @param userId - ID of user removing the comment
   * @returns Updated task document
   * @throws ForbiddenException if user didn't create the comment
   */
  removeComment(
    taskId: string,
    commentIndex: number,
    userId: string,
  ): Promise<TaskDocument>;

  /**
   * Retrieves tasks for a specific project
   * @param projectId - Project ID
   * @param query - Query parameters
   * @returns Paginated task list
   */
  getTasksByProject(
    projectId: string,
    query: TaskQueryDto,
  ): Promise<{
    tasks: TaskDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  /**
   * Retrieves tasks assigned to a specific user
   * @param userId - User ID
   * @param query - Query parameters
   * @returns Paginated task list
   */
  getTasksByUser(
    userId: string,
    query: TaskQueryDto,
  ): Promise<{
    tasks: TaskDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  /**
   * Calculates task statistics with optional filtering
   * @param userId - Optional user ID to filter tasks
   * @param projectId - Optional project ID to filter tasks
   * @returns Task statistics including status counts and completion metrics
   */
  getTaskStats(userId?: string, projectId?: string): Promise<TaskStatsDto>;

  /**
   * Updates task progress and auto-updates status based on progress
   * @param id - Task ID
   * @param progress - Progress percentage (0-100)
   * @param userId - ID of user updating progress
   * @returns Updated task document
   * @throws ForbiddenException if user lacks permission
   */
  updateProgress(
    id: string,
    progress: number,
    userId: string,
  ): Promise<TaskDocument>;
}
