import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MeetingType } from '../../../common/enums/status.enum';

export type MeetingDocument = Meeting &
  Document & {
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
  };

export enum MeetingStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  POSTPONED = 'postponed',
}

export enum ParticipantStatus {
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  PENDING = 'pending',
}

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Meeting {
  @Prop({ required: true, trim: true, maxlength: 200 })
  title: string;

  @Prop({ maxlength: 1000 })
  description?: string;

  @Prop({ required: true })
  startTime: Date;

  @Prop({ required: true })
  endTime: Date;

  @Prop({
    type: String,
    enum: Object.values(MeetingType),
    default: MeetingType.TEAM_MEETING,
  })
  type: MeetingType;

  @Prop({ trim: true, maxlength: 200 })
  location?: string;

  @Prop({ trim: true })
  meetingLink?: string;

  @Prop({ maxlength: 2000 })
  agenda?: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], required: true })
  participants: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  organizer: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project' })
  project?: Types.ObjectId;

  @Prop({ default: false })
  isRecurring: boolean;

  @Prop({
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: function () {
      return this.isRecurring;
    },
  })
  recurringFrequency?: string;

  @Prop()
  recurringEndDate?: Date;

  @Prop({ maxlength: 2000 })
  notes?: string;

  @Prop({ maxlength: 3000 })
  summary?: string;

  @Prop({ type: [String], default: [] })
  decisions: string[];

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop({
    type: String,
    enum: Object.values(MeetingStatus),
    default: MeetingStatus.SCHEDULED,
  })
  status: MeetingStatus;

  @Prop()
  actualStartTime?: Date;

  @Prop()
  actualEndTime?: Date;

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User', required: true },
        status: {
          type: String,
          enum: Object.values(ParticipantStatus),
          default: ParticipantStatus.PENDING,
        },
        respondedAt: { type: Date },
      },
    ],
    default: [],
  })
  participantResponses: Array<{
    userId: Types.ObjectId;
    status: ParticipantStatus;
    respondedAt?: Date;
  }>;
}

export const MeetingSchema = SchemaFactory.createForClass(Meeting);

// Essential indexes for admin panel queries
MeetingSchema.index({ startTime: 1, endTime: 1 }); // Upcoming meetings
MeetingSchema.index({ type: 1 }); // Filter by type
MeetingSchema.index({ status: 1 }); // Filter by status
MeetingSchema.index({ project: 1 }); // Meetings by project
