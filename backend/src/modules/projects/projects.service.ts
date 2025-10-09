import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectResponseDto,
  ProjectStatsDto,
} from './dto/project.dto';
import {
  PaginationQuery,
  PaginatedResponse,
} from '../../common/interfaces/base.interface';
import { ProjectStatus } from '../../common/enums/project-status.enum.js';
import { Priority } from '../../common/enums/priority.enum.js';
import { Role } from '../../common/enums/role.enum.js';
import { IProjectService } from './interfaces/project-service.interface';
import { PopulatedUser, getUserData } from './types/populated-project.types';
import { ChatService } from '../chat/chat.service';
import { ConversationType } from '../chat/schemas/conversation.schema';

/**
 * Service handling all project-related business logic
 * Implements comprehensive CRUD operations, team management, and statistics
 */
@Injectable()
export class ProjectsService implements IProjectService {
  private logger: Logger = new Logger('ProjectsService');

  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
  ) {}

  /**
   * Creates a new project in the system
   * @param createProjectDto - Project creation data
   * @param userId - ID of user creating the project
   * @returns Created project document
   */
  async create(
    createProjectDto: CreateProjectDto,
    userId: string,
  ): Promise<ProjectDocument> {
    const project = new this.projectModel({
      ...createProjectDto,
      createdBy: new Types.ObjectId(userId),
      startDate: new Date(createProjectDto.startDate),
      endDate: createProjectDto.endDate
        ? new Date(createProjectDto.endDate)
        : undefined,
      deadline: createProjectDto.deadline
        ? new Date(createProjectDto.deadline)
        : undefined,
      teamMembers: createProjectDto.teamMembers || [],
    });

    const savedProject = await project.save();

    // Auto-create project conversation for team collaboration
    try {
      const participants = [
        createProjectDto.projectManager,
        ...(createProjectDto.teamMembers || []),
      ];

      const conversation = await this.chatService.createConversation(
        {
          title: `${savedProject.name} - Team Chat`,
          type: ConversationType.PROJECT,
          participants,
          project: savedProject._id.toString(),
        },
        userId,
      );

      // Send initial system message
      await this.chatService.sendSystemMessage(
        conversation._id.toString(),
        `🚀 Project "${savedProject.name}" has been created! Use this channel to discuss project-related topics with your team.`,
      );

      this.logger.log(
        `Project conversation created for project: ${savedProject.name}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create project conversation: ${error.message}`,
      );
      // Don't fail project creation if chat creation fails
    }

    return savedProject;
  }

  /**
   * Retrieves a paginated list of projects with optional filtering
   * @param options - Query parameters including pagination, filters, and sorting
   * @returns Paginated project list with transformed DTOs
   */
  async findAll(
    options: PaginationQuery & {
      status?: ProjectStatus;
      priority?: Priority;
      projectManager?: string;
      teamMember?: string;
      isActive?: boolean;
      $or?: Array<Record<string, unknown>>;
    },
  ): Promise<PaginatedResponse<ProjectResponseDto>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      status,
      priority,
      projectManager,
      teamMember,
      isActive = true,
    } = options;

    const skip = (page - 1) * limit;

    // Build sort options with proper typing
    const sortOptions: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'desc' ? -1 : 1,
    };

    // Build filter query - using Record for better type safety
    const filter: Record<string, any> = { isActive };

    if (search) {
      // Escape special regex characters to prevent ReDoS attacks
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
        { clientName: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (projectManager && projectManager.trim() !== '') {
      if (Types.ObjectId.isValid(projectManager)) {
        filter.projectManager = new Types.ObjectId(projectManager);
      }
    }

    if (teamMember && teamMember.trim() !== '') {
      if (Types.ObjectId.isValid(teamMember)) {
        filter.teamMembers = { $in: [new Types.ObjectId(teamMember)] };
      }
    }

    const [projects, total] = await Promise.all([
      this.projectModel
        .find(filter)
        .populate('projectManager', 'firstName lastName email')
        // .populate('teamMembers', 'firstName lastName email role')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.projectModel.countDocuments(filter),
    ]);

    const projectsWithStats = await Promise.all(
      projects.map(async (project) => this.transformToResponseDto(project)),
    );

    return {
      data: projectsWithStats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves a single project by ID with all relations populated
   * @param id - Project ID (MongoDB ObjectId as string)
   * @returns Project document with populated projectManager and teamMembers
   * @throws BadRequestException if ID format is invalid
   * @throws NotFoundException if project doesn't exist
   */
  async findById(id: string): Promise<ProjectDocument> {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid project ID format');
    }

    const project = await this.projectModel
      .findById(id)
      .populate(
        'projectManager',
        'firstName lastName email role department status',
      )
      .populate(
        'teamMembers',
        'firstName lastName email role department status avatar',
      )
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async findByIdWithResponse(id: string): Promise<ProjectResponseDto> {
    const project = await this.findById(id);
    return this.transformToResponseDto(project);
  }

  /**
   * Updates an existing project with provided data
   * @param id - Project ID to update
   * @param updateProjectDto - Fields to update
   * @param userId - ID of user making the update
   * @param userRole - Role of user making the update
   * @returns Updated project document
   */
  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    userId: string,
    userRole: Role,
  ): Promise<ProjectDocument> {
    const project = await this.findById(id);

    // Check permissions - only project manager or admin can update
    if (
      userRole !== Role.ADMIN &&
      project.projectManager.toString() !== userId
    ) {
      throw new ForbiddenException(
        'Only project manager or admin can update this project',
      );
    }

    // Handle date conversions with proper typing
    const updateData: Record<string, any> = { ...updateProjectDto };
    if (updateProjectDto.startDate) {
      updateData.startDate = new Date(updateProjectDto.startDate);
    }
    if (updateProjectDto.endDate) {
      updateData.endDate = new Date(updateProjectDto.endDate);
    }
    if (updateProjectDto.deadline) {
      updateData.deadline = new Date(updateProjectDto.deadline);
    }

    // If status is being changed to completed, set completedAt
    if (
      updateProjectDto.status === ProjectStatus.COMPLETED &&
      project.status !== ProjectStatus.COMPLETED
    ) {
      updateData.completedAt = new Date();
      updateData.progress = 100;
    }

    // If status is being changed to cancelled, mark as inactive
    if (
      updateProjectDto.status === ProjectStatus.CANCELLED &&
      project.status !== ProjectStatus.CANCELLED
    ) {
      updateData.isActive = false;
    }

    const updatedProject = await this.projectModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('projectManager', 'firstName lastName email')
      .populate('teamMembers', 'firstName lastName email role')
      .exec();

    return updatedProject!;
  }

  async delete(id: string, userId: string, userRole: Role): Promise<void> {
    const project = await this.findById(id);

    // Check permissions - only project manager or admin can delete
    if (
      userRole !== Role.ADMIN &&
      project.projectManager.toString() !== userId
    ) {
      throw new ForbiddenException(
        'Only project manager or admin can delete this project',
      );
    }

    await this.projectModel.findByIdAndDelete(id);
  }

  /**
   * Adds a team member to a project
   * Validates permissions and prevents duplicate additions
   * @param projectId - Project ID
   * @param userId - User ID to add as team member
   * @param requesterId - ID of user making the request
   * @param requesterRole - Role of user making the request
   * @returns Updated project document with populated team members
   * @throws NotFoundException if project not found
   * @throws ForbiddenException if requester is not PM or admin
   * @throws BadRequestException if user is already a team member
   */
  async addTeamMember(
    projectId: string,
    userId: string,
    requesterId: string,
    requesterRole: Role,
  ): Promise<ProjectDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const project = await this.findById(projectId);

    // Permission check: Only project manager or admin can add team members
    if (
      requesterRole !== Role.ADMIN &&
      project.projectManager.toString() !== requesterId
    ) {
      throw new ForbiddenException(
        'Only project manager or admin can add team members',
      );
    }

    // Prevent duplicate team member additions
    if (project.teamMembers.some((member) => member.toString() === userId)) {
      throw new BadRequestException('User is already a team member');
    }

    const updatedProject = await this.projectModel
      .findByIdAndUpdate(
        projectId,
        { $addToSet: { teamMembers: userId } },
        { new: true },
      )
      .populate('projectManager', 'firstName lastName email')
      .populate('teamMembers', 'firstName lastName email role')
      .exec();

    // Add user to project conversation if it exists
    try {
      const projectConversations = await this.chatService.findAllConversations(
        requesterId,
        {},
      );
      const projectConv = projectConversations.find(
        (conv) =>
          conv.type === ConversationType.PROJECT &&
          conv.project?.toString() === projectId,
      );

      if (projectConv) {
        await this.chatService.addParticipant(
          projectConv._id.toString(),
          { userId },
          requesterId,
        );
        this.logger.log(
          `Added user ${userId} to project conversation for project ${projectId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to add user to project conversation: ${error.message}`,
      );
      // Don't fail the team member addition if chat fails
    }

    return updatedProject!;
  }

  /**
   * Removes a team member from a project
   * Validates permissions before removal
   * @param projectId - Project ID
   * @param userId - User ID to remove from team
   * @param requesterId - ID of user making the request
   * @param requesterRole - Role of user making the request
   * @returns Updated project document
   * @throws NotFoundException if project not found
   * @throws ForbiddenException if requester lacks permission
   */
  async removeTeamMember(
    projectId: string,
    userId: string,
    requesterId: string,
    requesterRole: Role,
  ): Promise<ProjectDocument> {
    const project = await this.findById(projectId);

    // Check permissions
    if (
      requesterRole !== Role.ADMIN &&
      project.projectManager.toString() !== requesterId
    ) {
      throw new ForbiddenException(
        'Only project manager or admin can remove team members',
      );
    }

    // Cannot remove project manager
    if (project.projectManager.toString() === userId) {
      throw new BadRequestException('Cannot remove project manager from team');
    }

    const updatedProject = await this.projectModel
      .findByIdAndUpdate(
        projectId,
        { $pull: { teamMembers: userId } },
        { new: true },
      )
      .populate('projectManager', 'firstName lastName email')
      .populate('teamMembers', 'firstName lastName email role')
      .exec();

    return updatedProject!;
  }

  /**
   * Calculates comprehensive project statistics with role-based filtering
   * Aggregates data on active, completed, on-hold, and overdue projects
   * @param userId - Optional user ID to filter projects (for non-admins)
   * @param userRole - User role to determine access level
   * @returns Project statistics DTO with counts by status and priority
   */
  async getProjectStats(
    userId?: string,
    userRole?: Role,
  ): Promise<ProjectStatsDto> {
    // Only count active (non-cancelled/non-archived) projects
    const filter: Record<string, any> = { isActive: true };

    // If not admin, only show projects where user is involved (as PM or team member)
    if (userRole !== Role.ADMIN && userId) {
      filter.$or = [
        { projectManager: new Types.ObjectId(userId) },
        { teamMembers: { $in: [new Types.ObjectId(userId)] } },
      ];
    }

    const [
      totalProjects,
      activeProjects,
      completedProjects,
      overdueProjects,
      statusStats,
      priorityStats,
    ] = await Promise.all([
      this.projectModel.countDocuments(filter),
      this.projectModel.countDocuments({
        ...filter,
        status: { $in: [ProjectStatus.NOT_STARTED, ProjectStatus.IN_PROGRESS] },
      }),
      this.projectModel.countDocuments({
        ...filter,
        status: ProjectStatus.COMPLETED,
      }),
      this.projectModel.countDocuments({
        ...filter,
        deadline: { $lt: new Date() },
        status: { $nin: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED] },
      }),
      this.projectModel.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.projectModel.aggregate([
        { $match: filter },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
    ]);

    const projectsByStatus = Object.values(ProjectStatus).reduce(
      (acc, status) => {
        acc[status] = statusStats.find((s) => s._id === status)?.count || 0;
        return acc;
      },
      {} as Record<ProjectStatus, number>,
    );

    const projectsByPriority = Object.values(Priority).reduce(
      (acc, priority) => {
        acc[priority] =
          priorityStats.find((p) => p._id === priority)?.count || 0;
        return acc;
      },
      {} as Record<Priority, number>,
    );

    return {
      total: totalProjects,
      active: activeProjects,
      completed: completedProjects,
      onHold:
        statusStats.find((s) => s._id === ProjectStatus.ON_HOLD)?.count || 0,
      overdue: overdueProjects,
      projectsByStatus,
      projectsByPriority,
    };
  }

  /**
   * Retrieves all projects where user is involved (as PM or team member)
   * Used for "My Projects" feature in the admin panel
   * @param userId - User ID to filter projects
   * @param options - Pagination and sorting options
   * @returns Paginated list of projects involving the user
   * @throws BadRequestException if userId is invalid
   */
  async getUserProjects(
    userId: string,
    options: PaginationQuery,
  ): Promise<PaginatedResponse<ProjectResponseDto>> {
    // Validate userId is not empty and is a valid ObjectId format
    if (!userId || userId.trim() === '' || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID provided');
    }

    // Convert userId to ObjectId for the query
    const userObjectId = new Types.ObjectId(userId);

    return this.findAll({
      ...options,
      $or: [
        { projectManager: userObjectId },
        { teamMembers: { $in: [userObjectId] } },
      ],
    });
  }

  /**
   * Transforms a Mongoose project document to a frontend-friendly DTO
   * Populates nested user objects and converts dates to ISO strings
   * Calculates task completion statistics
   * @param project - Raw project document from MongoDB
   * @returns Formatted project response DTO matching frontend expectations
   */
  private async transformToResponseDto(
    project: ProjectDocument,
  ): Promise<ProjectResponseDto> {
    // Get counts for related entities from embedded arrays
    const [taskCount, completedTaskCount, documentCount, meetingCount] =
      await Promise.all([
        // Using embedded array lengths for performance
        // In a real scenario, these could be actual database counts
        Promise.resolve(project.tasks?.length || 0),
        Promise.resolve(0), // Would need to query tasks with completed status
        Promise.resolve(project.documents?.length || 0),
        Promise.resolve(project.meetings?.length || 0),
      ]);

    const pmData = getUserData(project.projectManager);
    const teamMembersData = Array.isArray(project.teamMembers)
      ? project.teamMembers
          .map((m) => getUserData(m))
          .filter((u): u is PopulatedUser => u !== null)
      : [];

    return {
      _id: project._id.toString(),
      name: project.name,
      description: project.description,
      status: project.status,
      priority: project.priority,
      startDate: project.startDate.toISOString(),
      endDate: project.endDate?.toISOString(),
      deadline: project.deadline?.toISOString(),
      projectManager: pmData
        ? {
            _id: pmData?._id?.toString(),
            email: pmData?.email,
            firstName: pmData?.firstName,
            lastName: pmData?.lastName,
            role: pmData?.role,
            department: pmData?.department,
            location: pmData?.location,
            status: pmData?.status,
            avatar: pmData?.avatar,
            bio: pmData?.bio,
            skills: pmData?.skills || [],
            joinDate: pmData?.joinDate?.toISOString(),
            lastLogin: pmData?.lastLogin?.toISOString(),
            tasksCompleted: pmData?.tasksCompleted,
          }
        : {
            _id: project.projectManager.toString(),
            email: '',
            firstName: '',
            lastName: '',
            role: '',
            department: undefined,
            location: undefined,
            status: 'active',
            avatar: undefined,
            bio: undefined,
            skills: [],
            joinDate: new Date().toISOString(),
            lastLogin: undefined,
            tasksCompleted: 0,
          },
      teamMembers: teamMembersData.map((member) => ({
        _id: member?._id?.toString(),
        email: member.email,
        firstName: member?.firstName,
        lastName: member?.lastName,
        role: member?.role,
        department: member?.department,
        location: member?.location,
        status: member?.status,
        avatar: member?.avatar,
        bio: member?.bio,
        skills: member?.skills || [],
        joinDate: member?.joinDate?.toISOString(),
        lastLogin: member?.lastLogin?.toISOString(),
        tasksCompleted: member?.tasksCompleted,
      })),
      taskCount,
      completedTaskCount,
      budget: project?.budget,
      spentBudget: project.spentBudget,
      progress: project.progress,
      tags: project?.tags,
      clientName: project.clientName,
      clientEmail: project?.clientEmail,
      notes: project.notes,
      isActive: project.isActive,
      createdAt: project?.createdAt?.toISOString(),
      updatedAt: project?.updatedAt?.toISOString(),
      completedAt: project.completedAt?.toISOString(),
      archivedAt: project?.archivedAt?.toISOString(),
    };
  }
}
