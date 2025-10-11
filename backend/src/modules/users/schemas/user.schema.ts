import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role } from '../../../common/enums/role.enum';
import { UserStatus } from '../../../common/enums/status.enum';

export type UserDocument = User &
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
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, minlength: 8 })
  password: string;

  @Prop({ required: true, trim: true, maxlength: 50 })
  firstName: string;

  @Prop({ required: true, trim: true, maxlength: 50 })
  lastName: string;

  @Prop({ trim: true, match: /^[+]?[1-9][\d]{0,15}$/ })
  phone?: string;

  @Prop({ enum: Object.values(Role), default: Role.MEMBER })
  role: Role;

  @Prop({ type: Types.ObjectId, ref: 'Department' })
  department?: Types.ObjectId;

  @Prop({ trim: true, maxlength: 200 })
  location?: string;

  @Prop({ enum: Object.values(UserStatus), default: UserStatus.ACTIVE })
  status: UserStatus;

  @Prop({ default: Date.now })
  joinDate: Date;

  @Prop({ maxlength: 500 })
  bio?: string;

  @Prop({ type: [String], default: [] })
  skills: string[];

  @Prop()
  avatar?: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Project' }], default: [] })
  projects: Types.ObjectId[];

  @Prop({ default: 0, min: 0 })
  tasksCompleted: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Task' }], default: [] })
  currentTasks: Types.ObjectId[];

  @Prop()
  inviteToken?: string;

  @Prop()
  inviteExpires?: Date;

  @Prop()
  refreshToken?: string;

  @Prop()
  lastLogin?: Date;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop()
  emailVerificationToken?: string;

  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;

  // Virtual fields for computed properties
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get initials(): string {
    return `${this.firstName[0]}${this.lastName[0]}`.toUpperCase();
  }
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add virtual fields
UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.virtual('initials').get(function () {
  return `${this.firstName[0]}${this.lastName[0]}`.toUpperCase();
});

// Essential indexes for admin panel queries
UserSchema.index({ email: 1 }, { unique: true }); // Login
UserSchema.index({ role: 1 }); // Filter by role (project managers)
UserSchema.index({ department: 1 }); // Filter by department
UserSchema.index({ firstName: 'text', lastName: 'text', email: 'text' }); // Search
