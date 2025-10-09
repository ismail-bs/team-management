import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TaskStatus } from '../../../common/enums/status.enum';
import { Priority } from '../../../common/enums/priority.enum';

export type TaskDocument = Task &
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
export class Task {
  @Prop({ required: true, trim: true, maxlength: 200 })
  title: string;

  @Prop({ maxlength: 2000 })
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(TaskStatus),
    default: TaskStatus.OPEN,
  })
  status: TaskStatus;

  @Prop({
    type: String,
    enum: Object.values(Priority),
    default: Priority.MEDIUM,
  })
  priority: Priority;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  project: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop()
  dueDate?: Date;

  @Prop({ default: 0, min: 0, max: 100 })
  progress: number;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ min: 0 })
  estimatedHours?: number;

  @Prop({ default: 0, min: 0 })
  actualHours: number;

  @Prop([
    {
      user: { type: Types.ObjectId, ref: 'User', required: true },
      comment: { type: String, required: true, maxlength: 1000 },
      createdAt: { type: Date, default: Date.now },
    },
  ])
  comments: Array<{
    user: Types.ObjectId;
    comment: string;
    createdAt: Date;
  }>;

  @Prop([
    {
      filename: { type: String, required: true },
      originalName: { type: String, required: true },
      mimetype: { type: String, required: true },
      size: { type: Number, required: true, min: 0 },
      uploadedBy: { type: Types.ObjectId, ref: 'User', required: true },
      uploadedAt: { type: Date, default: Date.now },
    },
  ])
  attachments: Array<{
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    uploadedBy: Types.ObjectId;
    uploadedAt: Date;
  }>;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Task' }], default: [] })
  dependencies: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Task' }], default: [] })
  subtasks: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Task' })
  parentTask?: Types.ObjectId;
}

export const TaskSchema = SchemaFactory.createForClass(Task);

// Essential indexes for admin panel queries
TaskSchema.index({ project: 1, status: 1 }); // Get tasks by project and status
TaskSchema.index({ assignedTo: 1, status: 1 }); // Get user's tasks by status
TaskSchema.index({ title: 'text', description: 'text' }); // Search
TaskSchema.index({ createdAt: -1 }); // Recent tasks for dashboard
