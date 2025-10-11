export enum Permission {
  // Project Permissions
  PROJECT_CREATE = 'project:create',
  PROJECT_READ = 'project:read',
  PROJECT_UPDATE = 'project:update',
  PROJECT_DELETE = 'project:delete',
  PROJECT_MANAGE_TEAM = 'project:manage_team',

  // Task Permissions
  TASK_CREATE = 'task:create',
  TASK_READ = 'task:read',
  TASK_UPDATE = 'task:update',
  TASK_DELETE = 'task:delete',
  TASK_ASSIGN = 'task:assign',

  // Meeting Permissions
  MEETING_CREATE = 'meeting:create',
  MEETING_READ = 'meeting:read',
  MEETING_UPDATE = 'meeting:update',
  MEETING_DELETE = 'meeting:delete',
  MEETING_ADD_NOTES = 'meeting:add_notes',

  // Document Permissions
  DOCUMENT_CREATE = 'document:create',
  DOCUMENT_READ = 'document:read',
  DOCUMENT_UPDATE = 'document:update',
  DOCUMENT_DELETE = 'document:delete',
  DOCUMENT_SHARE = 'document:share',

  // User Management
  USER_INVITE = 'user:invite',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',

  // Department Management
  DEPARTMENT_CREATE = 'department:create',
  DEPARTMENT_READ = 'department:read',
  DEPARTMENT_UPDATE = 'department:update',
  DEPARTMENT_DELETE = 'department:delete',

  // Chat Permissions
  CHAT_READ = 'chat:read',
  CHAT_SEND = 'chat:send',
  CHAT_MANAGE_PARTICIPANTS = 'chat:manage_participants',
}

// Permission sets by role
export const RolePermissions: Record<string, Permission[]> = {
  admin: [
    // Admin has ALL permissions
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_DELETE,
    Permission.PROJECT_MANAGE_TEAM,

    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.TASK_UPDATE,
    Permission.TASK_DELETE,
    Permission.TASK_ASSIGN,

    Permission.MEETING_CREATE,
    Permission.MEETING_READ,
    Permission.MEETING_UPDATE,
    Permission.MEETING_DELETE,
    Permission.MEETING_ADD_NOTES,

    Permission.DOCUMENT_CREATE,
    Permission.DOCUMENT_READ,
    Permission.DOCUMENT_UPDATE,
    Permission.DOCUMENT_DELETE,
    Permission.DOCUMENT_SHARE,

    Permission.USER_INVITE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,

    Permission.DEPARTMENT_CREATE,
    Permission.DEPARTMENT_READ,
    Permission.DEPARTMENT_UPDATE,
    Permission.DEPARTMENT_DELETE,

    Permission.CHAT_READ,
    Permission.CHAT_SEND,
    Permission.CHAT_MANAGE_PARTICIPANTS,
  ],

  project_manager: [
    // PM can manage THEIR projects
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE, // Only their projects
    Permission.PROJECT_MANAGE_TEAM, // Only their projects

    Permission.TASK_CREATE, // In their projects
    Permission.TASK_READ,
    Permission.TASK_UPDATE, // In their projects
    Permission.TASK_DELETE, // In their projects
    Permission.TASK_ASSIGN, // In their projects

    Permission.MEETING_CREATE,
    Permission.MEETING_READ,
    Permission.MEETING_UPDATE, // Only their meetings
    Permission.MEETING_DELETE, // Only their meetings
    Permission.MEETING_ADD_NOTES,

    Permission.DOCUMENT_CREATE, // In their projects
    Permission.DOCUMENT_READ,
    Permission.DOCUMENT_UPDATE, // In their projects
    Permission.DOCUMENT_DELETE, // In their projects
    Permission.DOCUMENT_SHARE, // In their projects

    Permission.USER_READ,

    Permission.DEPARTMENT_READ,

    Permission.CHAT_READ,
    Permission.CHAT_SEND,
    Permission.CHAT_MANAGE_PARTICIPANTS, // Only project chats they manage
  ],

  member: [
    // Members have READ access mostly
    Permission.PROJECT_READ, // Only assigned projects

    Permission.TASK_READ, // Only in their projects
    Permission.TASK_UPDATE, // Only tasks assigned to them

    Permission.MEETING_READ,

    Permission.DOCUMENT_READ, // Only shared documents

    Permission.USER_READ,

    Permission.DEPARTMENT_READ,

    Permission.CHAT_READ,
    Permission.CHAT_SEND,
  ],
};

// Helper function to check if role has permission
export function hasPermission(role: string, permission: Permission): boolean {
  return RolePermissions[role]?.includes(permission) || false;
}

// Helper function to check if role has any of the permissions
export function hasAnyPermission(
  role: string,
  permissions: Permission[],
): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

// Helper function to check if role has all permissions
export function hasAllPermissions(
  role: string,
  permissions: Permission[],
): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}
