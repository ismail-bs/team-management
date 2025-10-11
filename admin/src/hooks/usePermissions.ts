import { useAuth } from "@/contexts/AuthContext";
import {
  Permission,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isAdmin,
  isProjectManager,
  isMember,
  canCreateProject,
  canUpdateProject,
  canDeleteProject,
  canManageProjectTeam,
  canCreateTask,
  canUpdateTask,
  canCreateMeeting,
  canUpdateMeeting,
  canDeleteMeeting,
  canAddMeetingNotes,
  canCreateDocument,
  canUpdateDocument,
  canDeleteDocument,
  getRoleDisplayName,
  getAccessLevelDescription,
} from "@/lib/rbac";

/**
 * Custom hook for permission checks
 * Provides easy access to RBAC utilities with current user context
 */
export function usePermissions() {
  const { user } = useAuth();
  const userRole = user?.role;
  const userId = user?._id;

  return {
    // Raw permission checks
    hasPermission: (permission: Permission) => hasPermission(userRole, permission),
    hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(userRole, permissions),
    hasAllPermissions: (permissions: Permission[]) => hasAllPermissions(userRole, permissions),
    
    // Role checks
    isAdmin: isAdmin(userRole),
    isProjectManager: isProjectManager(userRole),
    isMember: isMember(userRole),
    
    // Project permissions
    canCreateProject: canCreateProject(userRole),
    canUpdateProject: (projectManagerId: string | undefined) => 
      canUpdateProject(userRole, projectManagerId, userId),
    canDeleteProject: (projectManagerId: string | undefined) => 
      canDeleteProject(userRole, projectManagerId, userId),
    canManageProjectTeam: (projectManagerId: string | undefined) => 
      canManageProjectTeam(userRole, projectManagerId, userId),
    
    // Task permissions
    canCreateTask: (projectManagerId: string | undefined, isTeamMember: boolean) => 
      canCreateTask(userRole, projectManagerId, userId, isTeamMember),
    canUpdateTask: (
      projectManagerId: string | undefined,
      taskAssignedTo: string | undefined,
      isTeamMember: boolean
    ) => canUpdateTask(userRole, projectManagerId, userId, taskAssignedTo, isTeamMember),
    
    // Meeting permissions
    canCreateMeeting: canCreateMeeting(userRole),
    canUpdateMeeting: (organizerId: string | undefined) => 
      canUpdateMeeting(userRole, organizerId, userId),
    canDeleteMeeting: (organizerId: string | undefined) => 
      canDeleteMeeting(userRole, organizerId, userId),
    canAddMeetingNotes: (organizerId: string | undefined) => 
      canAddMeetingNotes(userRole, organizerId, userId),
    
    // Document permissions
    canCreateDocument: (projectManagerId: string | undefined, isTeamMember: boolean) => 
      canCreateDocument(userRole, projectManagerId, userId, isTeamMember),
    canUpdateDocument: (projectManagerId: string | undefined, uploadedBy: string | undefined) => 
      canUpdateDocument(userRole, projectManagerId, userId, uploadedBy),
    canDeleteDocument: (projectManagerId: string | undefined, uploadedBy: string | undefined) => 
      canDeleteDocument(userRole, projectManagerId, userId, uploadedBy),
    
    // Utility functions
    getRoleDisplayName: () => getRoleDisplayName(userRole),
    getAccessLevelDescription: () => getAccessLevelDescription(userRole),
    
    // Current user info
    role: userRole,
    userId,
  };
}

