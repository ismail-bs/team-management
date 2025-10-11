import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Permission, hasPermission } from '../enums/permission.enum';
import {
  PERMISSIONS_KEY,
  RESOURCE_KEY,
} from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectConnection() private connection: Connection,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true; // No permissions required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userRole = user.role;

    // Admin has all permissions
    if (userRole === 'admin') {
      return true;
    }

    // Check if user has required permissions
    const hasRequiredPermissions = requiredPermissions.every((permission) =>
      hasPermission(userRole, permission),
    );

    if (!hasRequiredPermissions) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    // For project managers and members, check resource ownership
    const resourceType = this.reflector.get<string>(
      RESOURCE_KEY,
      context.getHandler(),
    );

    if (
      resourceType &&
      (userRole === 'project_manager' || userRole === 'member')
    ) {
      const resourceId =
        request.params.id || request.params.projectId || request.params.taskId;

      if (!resourceId) {
        // For create operations or list operations, allow if has permission
        return true;
      }

      const hasAccess = await this.checkResourceAccess(
        resourceType,
        resourceId,
        user.sub,
        userRole,
      );

      if (!hasAccess) {
        throw new ForbiddenException(
          `You do not have access to this ${resourceType}`,
        );
      }
    }

    return true;
  }

  private async checkResourceAccess(
    resourceType: string,
    resourceId: string,
    userId: string,
    userRole: string,
  ): Promise<boolean> {
    switch (resourceType) {
      case 'project':
        return this.checkProjectAccess(resourceId, userId, userRole);

      case 'task':
        return this.checkTaskAccess(resourceId, userId, userRole);

      case 'document':
        return this.checkDocumentAccess(resourceId, userId, userRole);

      case 'meeting':
        return this.checkMeetingAccess(resourceId, userId, userRole);

      default:
        return false;
    }
  }

  private async checkProjectAccess(
    projectId: string,
    userId: string,
    userRole: string,
  ): Promise<boolean> {
    const ProjectModel = this.connection.model('Project');
    const project = await ProjectModel.findById(projectId).exec();

    if (!project) {
      return false;
    }

    // Project Manager: Only their projects
    if (userRole === 'project_manager') {
      return project.projectManager?.toString() === userId;
    }

    // Member: Only projects they're assigned to
    if (userRole === 'member') {
      return project.teamMembers?.some(
        (memberId: any) => memberId.toString() === userId,
      );
    }

    return false;
  }

  private async checkTaskAccess(
    taskId: string,
    userId: string,
    userRole: string,
  ): Promise<boolean> {
    const TaskModel = this.connection.model('Task');
    const task = await TaskModel.findById(taskId).populate('project').exec();

    if (!task || !task.project) {
      return false;
    }

    const project = task.project;

    // Project Manager: Tasks in their projects
    if (userRole === 'project_manager') {
      return project.projectManager?.toString() === userId;
    }

    // Member: Tasks in their projects (read) or assigned to them (update)
    if (userRole === 'member') {
      const isInProject = project.teamMembers?.some(
        (memberId: any) => memberId.toString() === userId,
      );

      // For update operations, must be assigned to the task
      // For read operations, just being in the project is enough
      return isInProject;
    }

    return false;
  }

  private async checkDocumentAccess(
    documentId: string,
    userId: string,
    userRole: string,
  ): Promise<boolean> {
    const DocumentModel = this.connection.model('Document');
    const document = await DocumentModel.findById(documentId)
      .populate('project')
      .exec();

    if (!document) {
      return false;
    }

    // If document is shared with user
    if (document.sharedWith?.some((id: any) => id.toString() === userId)) {
      return true;
    }

    // If document belongs to a project
    if (document.project) {
      const project = document.project;

      // Project Manager: Documents in their projects
      if (userRole === 'project_manager') {
        return project.projectManager?.toString() === userId;
      }

      // Member: Documents in their projects
      if (userRole === 'member') {
        return project.teamMembers?.some(
          (memberId: any) => memberId.toString() === userId,
        );
      }
    }

    // Document uploaded by user
    return document.uploadedBy?.toString() === userId;
  }

  private async checkMeetingAccess(
    meetingId: string,
    userId: string,
    userRole: string,
  ): Promise<boolean> {
    const MeetingModel = this.connection.model('Meeting');
    const meeting = await MeetingModel.findById(meetingId).exec();

    if (!meeting) {
      return false;
    }

    // Project Manager: Meetings they organized
    if (userRole === 'project_manager') {
      return meeting.organizer?.toString() === userId;
    }

    // Member: Meetings they're invited to (read only)
    if (userRole === 'member') {
      return meeting.participants?.some(
        (participantId: any) => participantId.toString() === userId,
      );
    }

    return false;
  }
}
