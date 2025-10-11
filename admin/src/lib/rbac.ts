/**
 * Role-Based Access Control (RBAC) Utilities
 * 
 * Centralized permission system that matches backend permissions
 * Prevents code redundancy and ensures consistency
 */

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
const RolePermissions: Record<string, Permission[]> = {
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

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string | undefined, permission: Permission): boolean {
  if (!role) return false;
  return RolePermissions[role]?.includes(permission) || false;
}

/**
 * Check if a role has any of the permissions
 */
export function hasAnyPermission(role: string | undefined, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has all permissions
 */
export function hasAllPermissions(role: string | undefined, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Check if user is admin
 */
export function isAdmin(role: string | undefined): boolean {
  return role === 'admin';
}

/**
 * Check if user is project manager
 */
export function isProjectManager(role: string | undefined): boolean {
  return role === 'project_manager';
}

/**
 * Check if user is member
 */
export function isMember(role: string | undefined): boolean {
  return role === 'member';
}

/**
 * Check if user can create projects
 */
export function canCreateProject(role: string | undefined): boolean {
  return isAdmin(role);
}

/**
 * Check if user can update a specific project
 * @param role - User's role
 * @param projectManagerId - ID of the project's manager
 * @param userId - Current user's ID
 */
export function canUpdateProject(
  role: string | undefined,
  projectManagerId: string | undefined,
  userId: string | undefined
): boolean {
  if (!role || !userId) return false;
  if (isAdmin(role)) return true;
  if (isProjectManager(role) && projectManagerId === userId) return true;
  return false;
}

/**
 * Check if user can delete a project
 */
export function canDeleteProject(
  role: string | undefined,
  projectManagerId: string | undefined,
  userId: string | undefined
): boolean {
  if (!role || !userId) return false;
  if (isAdmin(role)) return true;
  if (isProjectManager(role) && projectManagerId === userId) return true;
  return false;
}

/**
 * Check if user can manage team for a project
 */
export function canManageProjectTeam(
  role: string | undefined,
  projectManagerId: string | undefined,
  userId: string | undefined
): boolean {
  if (!role || !userId) return false;
  if (isAdmin(role)) return true;
  if (isProjectManager(role) && projectManagerId === userId) return true;
  return false;
}

/**
 * Check if user can create tasks in a project
 */
export function canCreateTask(
  role: string | undefined,
  projectManagerId: string | undefined,
  userId: string | undefined,
  isTeamMember: boolean
): boolean {
  if (!role || !userId) return false;
  if (isAdmin(role)) return true;
  if (isProjectManager(role) && projectManagerId === userId) return true;
  return false; // Members cannot create tasks
}

/**
 * Check if user can update a task
 */
export function canUpdateTask(
  role: string | undefined,
  projectManagerId: string | undefined,
  userId: string | undefined,
  taskAssignedTo: string | undefined,
  isTeamMember: boolean
): boolean {
  if (!role || !userId) return false;
  if (isAdmin(role)) return true;
  if (isProjectManager(role) && projectManagerId === userId) return true;
  if (isMember(role) && taskAssignedTo === userId && isTeamMember) return true; // Can update own tasks
  return false;
}

/**
 * Check if user can create meetings
 */
export function canCreateMeeting(role: string | undefined): boolean {
  if (!role) return false;
  return isAdmin(role) || isProjectManager(role);
}

/**
 * Check if user can update a meeting
 */
export function canUpdateMeeting(
  role: string | undefined,
  organizerId: string | undefined,
  userId: string | undefined
): boolean {
  if (!role || !userId) return false;
  if (isAdmin(role)) return true;
  if (isProjectManager(role) && organizerId === userId) return true;
  return false;
}

/**
 * Check if user can delete a meeting
 */
export function canDeleteMeeting(
  role: string | undefined,
  organizerId: string | undefined,
  userId: string | undefined
): boolean {
  return canUpdateMeeting(role, organizerId, userId);
}

/**
 * Check if user can add notes to a meeting
 */
export function canAddMeetingNotes(
  role: string | undefined,
  organizerId: string | undefined,
  userId: string | undefined
): boolean {
  if (!role || !userId) return false;
  if (isAdmin(role)) return true;
  if (isProjectManager(role) && organizerId === userId) return true;
  return false;
}

/**
 * Check if user can create documents in a project
 */
export function canCreateDocument(
  role: string | undefined,
  projectManagerId: string | undefined,
  userId: string | undefined,
  isTeamMember: boolean
): boolean {
  if (!role || !userId) return false;
  if (isAdmin(role)) return true;
  if (isProjectManager(role) && (projectManagerId === userId || isTeamMember)) return true;
  return false;
}

/**
 * Check if user can update a document
 */
export function canUpdateDocument(
  role: string | undefined,
  projectManagerId: string | undefined,
  userId: string | undefined,
  uploadedBy: string | undefined
): boolean {
  if (!role || !userId) return false;
  if (isAdmin(role)) return true;
  if (isProjectManager(role) && projectManagerId === userId) return true;
  if (uploadedBy === userId) return true; // Can update own documents
  return false;
}

/**
 * Check if user can delete a document
 */
export function canDeleteDocument(
  role: string | undefined,
  projectManagerId: string | undefined,
  userId: string | undefined,
  uploadedBy: string | undefined
): boolean {
  return canUpdateDocument(role, projectManagerId, userId, uploadedBy);
}

/**
 * Get user role display name
 */
export function getRoleDisplayName(role: string | undefined): string {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'project_manager':
      return 'Project Manager';
    case 'member':
      return 'Team Member';
    default:
      return 'Unknown';
  }
}

/**
 * Get access level description for UI
 */
export function getAccessLevelDescription(role: string | undefined): string {
  switch (role) {
    case 'admin':
      return 'Full access to all features';
    case 'project_manager':
      return 'Manage assigned projects and teams';
    case 'member':
      return 'Read access with limited updates';
    default:
      return 'No access';
  }
}

