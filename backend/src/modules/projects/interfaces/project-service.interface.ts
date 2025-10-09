import { ProjectDocument } from '../schemas/project.schema';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectResponseDto,
} from '../dto/project.dto';
import {
  PaginatedResponse,
  PaginationQuery,
} from '../../../common/interfaces/base.interface';
import { ProjectStatus } from '../../../common/enums/project-status.enum';
import { Priority } from '../../../common/enums/priority.enum';
import { Role } from '../../../common/enums/role.enum';

/**
 * Interface defining the contract for Project Service operations
 * Ensures consistent implementation and enables better testing/mocking
 */
export interface IProjectService {
  /**
   * Creates a new project
   * @param createProjectDto - Project creation data
   * @param userId - ID of user creating the project
   * @returns Created project document
   */
  create(
    createProjectDto: CreateProjectDto,
    userId: string,
  ): Promise<ProjectDocument>;

  /**
   * Retrieves a paginated list of projects with optional filtering
   * @param options - Query parameters including pagination, filters, and sorting
   * @returns Paginated project list with transformed DTOs
   */
  findAll(
    options: PaginationQuery & {
      status?: ProjectStatus;
      priority?: Priority;
      projectManager?: string;
      teamMember?: string;
      isActive?: boolean;
      $or?: Array<Record<string, unknown>>;
    },
  ): Promise<PaginatedResponse<ProjectResponseDto>>;

  /**
   * Retrieves a single project by ID
   * @param id - Project ID
   * @returns Project document
   * @throws NotFoundException if project not found
   */
  findById(id: string): Promise<ProjectDocument>;

  /**
   * Retrieves a single project by ID with response DTO transformation
   * @param id - Project ID
   * @returns Project response DTO
   * @throws NotFoundException if project not found
   */
  findByIdWithResponse(id: string): Promise<ProjectResponseDto>;

  /**
   * Updates an existing project
   * @param id - Project ID to update
   * @param updateProjectDto - Fields to update
   * @param userId - ID of user making the update
   * @param userRole - Role of user making the update
   * @returns Updated project document
   * @throws NotFoundException if project not found
   * @throws ForbiddenException if user lacks permission
   */
  update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    userId: string,
    userRole: Role,
  ): Promise<ProjectDocument>;

  /**
   * Soft deletes a project (marks as inactive)
   * @param id - Project ID to delete
   * @param userId - ID of user deleting the project
   * @param userRole - Role of user deleting the project
   * @throws NotFoundException if project not found
   * @throws ForbiddenException if user lacks permission
   */
  delete(id: string, userId: string, userRole: Role): Promise<void>;

  /**
   * Retrieves project statistics
   * @returns Aggregated project statistics
   */
  getProjectStats(): Promise<{
    total: number;
    active: number;
    completed: number;
    onHold: number;
    overdue: number;
  }>;

  /**
   * Adds a team member to a project
   * @param projectId - Project ID
   * @param userId - User ID to add
   * @param requesterId - ID of user making the request
   * @param requesterRole - Role of user making the request
   * @returns Updated project document
   */
  addTeamMember(
    projectId: string,
    userId: string,
    requesterId: string,
    requesterRole: Role,
  ): Promise<ProjectDocument>;

  /**
   * Removes a team member from a project
   * @param projectId - Project ID
   * @param userId - User ID to remove
   * @param requesterId - ID of user making the request
   * @param requesterRole - Role of user making the request
   * @returns Updated project document
   */
  removeTeamMember(
    projectId: string,
    userId: string,
    requesterId: string,
    requesterRole: Role,
  ): Promise<ProjectDocument>;

  /**
   * Retrieves projects managed by or involving a specific user
   * @param userId - User ID to filter projects
   * @param options - Pagination options
   * @returns Paginated project response DTOs
   */
  getUserProjects(
    userId: string,
    options: PaginationQuery,
  ): Promise<PaginatedResponse<ProjectResponseDto>>;
}
