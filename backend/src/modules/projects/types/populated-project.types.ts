import { Types } from 'mongoose';
import { ProjectStatus } from '../../../common/enums/project-status.enum';
import { Priority } from '../../../common/enums/priority.enum';

/**
 * User interface for populated fields
 */
export interface PopulatedUser {
  _id: Types.ObjectId;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  location?: string;
  status: string;
  avatar?: string;
  bio?: string;
  skills?: string[];
  joinDate: Date;
  lastLogin?: Date;
  tasksCompleted: number;
}

/**
 * Project with populated fields
 */
export interface PopulatedProject {
  _id: Types.ObjectId;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  startDate: Date;
  endDate?: Date;
  deadline?: Date;
  projectManager: PopulatedUser;
  createdBy: Types.ObjectId;
  teamMembers: PopulatedUser[];
  budget?: number;
  spentBudget?: number;
  progress: number;
  tags?: string[];
  clientName?: string;
  clientEmail?: string;
  notes?: string;
  isActive: boolean;
  tasks?: Types.ObjectId[];
  documents?: Types.ObjectId[];
  meetings?: Types.ObjectId[];
  taskCount?: number;
  completedTaskCount?: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  archivedAt?: Date;
}

/**
 * Type guard to check if a value is a populated user
 */
export function isPopulatedUser(
  user: Types.ObjectId | PopulatedUser,
): user is PopulatedUser {
  return (
    user !== null &&
    user !== undefined &&
    typeof user === 'object' &&
    '_id' in user &&
    'email' in user &&
    'firstName' in user
  );
}

/**
 * Helper to safely get user data from ObjectId or PopulatedUser
 */
export function getUserData(
  user: Types.ObjectId | PopulatedUser,
): PopulatedUser | null {
  if (isPopulatedUser(user)) {
    return user;
  }
  return null;
}
