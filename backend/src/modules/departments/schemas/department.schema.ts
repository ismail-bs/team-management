import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DepartmentDocument = Department &
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
export class Department {
  @Prop({ required: true, trim: true, maxlength: 100, unique: true })
  name: string;

  @Prop({ trim: true, maxlength: 500 })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  head?: Types.ObjectId; // Department head/manager

  @Prop({ default: 0, min: 0 })
  employeeCount: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);

// Indexes for optimization
DepartmentSchema.index({ isActive: 1 });
DepartmentSchema.index({ createdBy: 1 });
