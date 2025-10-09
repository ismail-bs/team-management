export enum TaskStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in-progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum MeetingType {
  TEAM_MEETING = 'team-meeting',
  ONE_ON_ONE = 'one-on-one',
  PROJECT_REVIEW = 'project-review',
  STANDUP = 'standup',
  RETROSPECTIVE = 'retrospective',
  OTHER = 'other',
}

export enum MeetingStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  POSTPONED = 'postponed',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}
