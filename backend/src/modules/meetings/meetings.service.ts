import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Meeting,
  MeetingDocument,
  ParticipantStatus,
} from './schemas/meeting.schema';
import {
  CreateMeetingDto,
  UpdateMeetingDto,
  ParticipantResponseDto,
  MeetingQueryDto,
} from './dto/meeting.dto';

@Injectable()
export class MeetingsService {
  constructor(
    @InjectModel(Meeting.name) private meetingModel: Model<MeetingDocument>,
  ) {}

  async create(
    createMeetingDto: CreateMeetingDto,
    organizerId: string,
  ): Promise<MeetingDocument> {
    // Validate meeting times
    const startTime = new Date(createMeetingDto.startTime);
    const endTime = new Date(createMeetingDto.endTime);

    if (startTime >= endTime) {
      throw new BadRequestException('End time must be after start time');
    }

    if (startTime < new Date()) {
      throw new BadRequestException('Meeting cannot be scheduled in the past');
    }

    // Check for scheduling conflicts
    await this.checkSchedulingConflicts(
      createMeetingDto.participants,
      startTime,
      endTime,
    );

    // Create participant responses
    const participantResponses = createMeetingDto.participants.map(
      (participantId) => ({
        userId: new Types.ObjectId(participantId),
        status: 'pending',
        respondedAt: null,
      }),
    );

    const meeting = new this.meetingModel({
      ...createMeetingDto,
      organizer: new Types.ObjectId(organizerId),
      participants: createMeetingDto.participants.map(
        (id) => new Types.ObjectId(id),
      ),
      project: createMeetingDto.project
        ? new Types.ObjectId(createMeetingDto.project)
        : undefined,
      startTime,
      endTime,
      recurringEndDate: createMeetingDto.recurringEndDate
        ? new Date(createMeetingDto.recurringEndDate)
        : undefined,
      participantResponses,
    });

    const savedMeeting = await meeting.save();

    // If recurring, create future instances
    if (createMeetingDto.isRecurring && createMeetingDto.recurringFrequency) {
      await this.createRecurringInstances(savedMeeting);
    }

    return this.findById(savedMeeting._id.toString());
  }

  async findAll(
    query: MeetingQueryDto,
    userId: string,
  ): Promise<{
    meetings: MeetingDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      project,
      type,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = query;

    const filter: Record<string, unknown> = {
      $or: [
        { organizer: new Types.ObjectId(userId) },
        { participants: new Types.ObjectId(userId) },
      ],
    };

    if (project) {
      filter.project = new Types.ObjectId(project);
    }

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      const timeFilter: Record<string, Date> = {};
      if (startDate) {
        timeFilter.$gte = new Date(startDate);
      }
      if (endDate) {
        timeFilter.$lte = new Date(endDate);
      }
      filter.startTime = timeFilter;
    }

    const skip = (page - 1) * limit;

    const [meetings, total] = await Promise.all([
      this.meetingModel
        .find(filter)
        .populate('participants', 'firstName lastName email avatar')
        .populate('organizer', 'firstName lastName email avatar')
        .populate('project', 'name')
        .sort({ startTime: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.meetingModel.countDocuments(filter),
    ]);

    return {
      meetings,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<MeetingDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid meeting ID');
    }

    const meeting = await this.meetingModel
      .findById(id)
      .populate('participants', 'firstName lastName email avatar')
      .populate('organizer', 'firstName lastName email avatar')
      .populate('project', 'name description')
      .exec();

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    return meeting;
  }

  async update(
    id: string,
    updateMeetingDto: UpdateMeetingDto,
    userId: string,
  ): Promise<MeetingDocument> {
    const meeting = await this.findById(id);

    // Check if user is organizer or has permission to update
    if (!meeting.organizer || meeting.organizer._id.toString() !== userId) {
      throw new ForbiddenException(
        'Only the organizer can update this meeting',
      );
    }

    // Validate meeting times if being updated
    if (updateMeetingDto.startTime || updateMeetingDto.endTime) {
      const startTime = updateMeetingDto.startTime
        ? new Date(updateMeetingDto.startTime)
        : meeting.startTime;
      const endTime = updateMeetingDto.endTime
        ? new Date(updateMeetingDto.endTime)
        : meeting.endTime;

      if (startTime >= endTime) {
        throw new BadRequestException('End time must be after start time');
      }

      // Check for scheduling conflicts (excluding current meeting)
      if (
        updateMeetingDto.participants ||
        updateMeetingDto.startTime ||
        updateMeetingDto.endTime
      ) {
        const participants =
          updateMeetingDto.participants ||
          meeting.participants.map((p) => p._id.toString());
        await this.checkSchedulingConflicts(
          participants,
          startTime,
          endTime,
          id,
        );
      }
    }

    const updateData: Record<string, unknown> = {
      ...updateMeetingDto,
    };

    if (updateMeetingDto.startTime) {
      updateData.startTime = new Date(updateMeetingDto.startTime);
    }

    if (updateMeetingDto.endTime) {
      updateData.endTime = new Date(updateMeetingDto.endTime);
    }

    if (updateMeetingDto.recurringEndDate) {
      updateData.recurringEndDate = new Date(updateMeetingDto.recurringEndDate);
    }

    if (updateMeetingDto.participants) {
      updateData.participants = updateMeetingDto.participants.map(
        (id) => new Types.ObjectId(id),
      );

      // Update participant responses for new participants
      const existingParticipants = meeting.participantResponses.map((pr) =>
        pr.userId.toString(),
      );
      const newParticipants = updateMeetingDto.participants.filter(
        (p) => !existingParticipants.includes(p),
      );

      if (newParticipants.length > 0) {
        const newResponses = newParticipants.map((participantId) => ({
          userId: new Types.ObjectId(participantId),
          status: 'pending',
          respondedAt: null,
        }));
        updateData.participantResponses = [
          ...meeting.participantResponses,
          ...newResponses,
        ];
      }
    }

    if (updateMeetingDto.actualStartTime) {
      updateData.actualStartTime = new Date(updateMeetingDto.actualStartTime);
    }

    if (updateMeetingDto.actualEndTime) {
      updateData.actualEndTime = new Date(updateMeetingDto.actualEndTime);
    }

    const updatedMeeting = await this.meetingModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('participants', 'firstName lastName email avatar')
      .populate('organizer', 'firstName lastName email avatar')
      .populate('project', 'name description')
      .exec();

    if (!updatedMeeting) {
      throw new NotFoundException('Meeting not found');
    }

    return updatedMeeting;
  }

  async remove(id: string, userId: string): Promise<void> {
    const meeting = await this.findById(id);

    // Check if user is organizer
    if (meeting.organizer._id.toString() !== userId) {
      throw new ForbiddenException(
        'Only the organizer can delete this meeting',
      );
    }

    await this.meetingModel.findByIdAndDelete(id);
  }

  async respondToMeeting(
    id: string,
    userId: string,
    responseDto: ParticipantResponseDto,
  ): Promise<MeetingDocument> {
    const meeting = await this.findById(id);

    // Check if user is a participant
    const isParticipant = meeting.participants.some(
      (p) => p._id.toString() === userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this meeting');
    }

    // Update participant response
    const responseIndex = meeting.participantResponses.findIndex(
      (pr) => pr.userId.toString() === userId,
    );

    const validStatus = responseDto.status as ParticipantStatus;

    if (responseIndex !== -1) {
      meeting.participantResponses[responseIndex].status = validStatus;
      meeting.participantResponses[responseIndex].respondedAt = new Date();
    } else {
      meeting.participantResponses.push({
        userId: new Types.ObjectId(userId),
        status: validStatus,
        respondedAt: new Date(),
      });
    }

    await meeting.save();
    return this.findById(id);
  }

  async getUpcomingMeetings(
    userId: string,
    limit: number = 5,
  ): Promise<MeetingDocument[]> {
    const now = new Date();

    return this.meetingModel
      .find({
        $or: [
          { organizer: new Types.ObjectId(userId) },
          { participants: new Types.ObjectId(userId) },
        ],
        startTime: { $gte: now },
        status: { $in: ['scheduled', 'in-progress'] },
      })
      .populate('participants', 'firstName lastName email avatar')
      .populate('organizer', 'firstName lastName email avatar')
      .populate('project', 'name')
      .sort({ startTime: 1 })
      .limit(limit)
      .exec();
  }

  async getMeetingsByProject(
    projectId: string,
    userId: string,
  ): Promise<MeetingDocument[]> {
    return this.meetingModel
      .find({
        project: new Types.ObjectId(projectId),
        $or: [
          { organizer: new Types.ObjectId(userId) },
          { participants: new Types.ObjectId(userId) },
        ],
      })
      .populate('participants', 'firstName lastName email avatar')
      .populate('organizer', 'firstName lastName email avatar')
      .sort({ startTime: -1 })
      .exec();
  }

  private async checkSchedulingConflicts(
    participantIds: string[],
    startTime: Date,
    endTime: Date,
    excludeMeetingId?: string,
  ): Promise<void> {
    const filter: Record<string, unknown> = {
      participants: { $in: participantIds.map((id) => new Types.ObjectId(id)) },
      status: { $in: ['scheduled', 'in-progress'] },
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime },
        },
      ],
    };

    if (excludeMeetingId) {
      filter._id = { $ne: new Types.ObjectId(excludeMeetingId) };
    }

    const conflictingMeetings = await this.meetingModel.find(filter).exec();

    if (conflictingMeetings.length > 0) {
      throw new BadRequestException(
        'One or more participants have conflicting meetings at this time',
      );
    }
  }

  private async createRecurringInstances(
    meeting: MeetingDocument,
  ): Promise<void> {
    if (!meeting.isRecurring || !meeting.recurringFrequency) {
      return;
    }

    const instances: Array<Partial<MeetingDocument>> = [];
    const maxInstances = 52; // Limit to 52 instances (1 year for weekly)
    const currentDate = new Date(meeting.startTime);
    const endDate =
      meeting.recurringEndDate ||
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year default

    for (let i = 0; i < maxInstances && currentDate <= endDate; i++) {
      // Calculate next occurrence
      switch (meeting.recurringFrequency) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'yearly':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }

      if (currentDate > endDate) break;

      const duration = meeting.endTime.getTime() - meeting.startTime.getTime();
      const instanceEndTime = new Date(currentDate.getTime() + duration);

      instances.push({
        title: meeting.title,
        description: meeting.description,
        startTime: new Date(currentDate),
        endTime: instanceEndTime,
        type: meeting.type,
        location: meeting.location,
        meetingLink: meeting.meetingLink,
        agenda: meeting.agenda,
        participants: meeting.participants,
        organizer: meeting.organizer,
        project: meeting.project,
        isRecurring: false, // Individual instances are not recurring
        participantResponses: meeting.participantResponses.map((pr) => ({
          userId: pr.userId,
          status: ParticipantStatus.PENDING,
          respondedAt: undefined,
        })),
      });
    }

    if (instances.length > 0) {
      await this.meetingModel.insertMany(instances);
    }
  }
}
