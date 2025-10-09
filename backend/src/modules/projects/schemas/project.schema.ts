import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ProjectStatus } from '../../../common/enums/project-status.enum';
import { Priority } from '../../../common/enums/priority.enum';

export type ProjectDocument = Project &
  Document & {
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
  };

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Project {
  @Prop({ required: true, trim: true, maxlength: 200 })
  name: string;

  @Prop({ required: true, maxlength: 1000 })
  description: string;

  @Prop({
    enum: Object.values(ProjectStatus),
    default: ProjectStatus.NOT_STARTED,
  })
  status: ProjectStatus;

  @Prop({ enum: Object.values(Priority), default: Priority.MEDIUM })
  priority: Priority;

  @Prop({ required: true })
  startDate: Date;

  @Prop()
  endDate?: Date;

  @Prop()
  deadline?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  projectManager: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  teamMembers: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Task' }], default: [] })
  tasks: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'DocumentModel' }], default: [] })
  documents: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Meeting' }], default: [] })
  meetings: Types.ObjectId[];

  @Prop({ min: 0, max: 100, default: 0 })
  progress: number;

  @Prop({ default: 0, min: 0 })
  budget?: number;

  @Prop({ default: 0, min: 0 })
  spentBudget?: number;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ trim: true, maxlength: 100 })
  clientName?: string;

  @Prop({ trim: true, lowercase: true })
  clientEmail?: string;

  @Prop({ maxlength: 2000 })
  notes?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  completedAt?: Date;

  @Prop()
  archivedAt?: Date;

  // Computed fields for frontend compatibility
  get taskCount(): number {
    return this.tasks.length;
  }

  get completedTaskCount(): number {
    // This would be calculated from actual task statuses in a real implementation
    return Math.floor(this.tasks.length * (this.progress / 100));
  }
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

// Add virtual fields
ProjectSchema.virtual('taskCount').get(function () {
  return this.tasks?.length;
});

ProjectSchema.virtual('completedTaskCount').get(function () {
  // This would be calculated from actual task statuses in a real implementation
  return Math.floor(this.tasks?.length * (this.progress / 100));
});

// Essential indexes for admin panel queries
ProjectSchema.index({ name: 'text', description: 'text' }); // Search
ProjectSchema.index({ status: 1 }); // Filter by status
ProjectSchema.index({ priority: 1 }); // Filter by priority
ProjectSchema.index({ projectManager: 1 }); // Get projects by manager
ProjectSchema.index({ createdAt: -1 }); // Recent projects for dashboard
