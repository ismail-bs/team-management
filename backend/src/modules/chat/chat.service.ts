import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
  ConversationType,
} from './schemas/conversation.schema';
import {
  Message,
  MessageDocument,
  MessageType,
  MessageStatus,
} from './schemas/message.schema';
import {
  CreateConversationDto,
  UpdateConversationDto,
  AddParticipantDto,
  RemoveParticipantDto,
  ConversationQueryDto,
} from './dto/conversation.dto';
import {
  SendMessageDto,
  UpdateMessageDto,
  MessageReactionDto,
  MessageQueryDto,
  MarkAsReadDto,
} from './dto/message.dto';
import { User } from '../users/schemas/user.schema';
import { Project } from '../projects/schemas/project.schema';
import { Role } from 'src/common/enums/role.enum';

@Injectable()
export class ChatService {
  private logger: Logger = new Logger('ChatService');

  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private messageModel: Model<MessageDocument>,
    @InjectModel('User')
    private userModel: Model<User>,
    @InjectModel('Project')
    private projectModel: Model<Project>,
  ) {}

  // Conversation Methods
  async createConversation(
    createConversationDto: CreateConversationDto,
    userId: string,
  ): Promise<ConversationDocument> {
    // Ensure creator is included in participants
    const participants = Array.from(
      new Set([...createConversationDto.participants, userId]),
    );

    // For direct conversations, ensure only 2 participants
    if (
      createConversationDto.type === ConversationType.DIRECT &&
      participants.length !== 2
    ) {
      throw new BadRequestException(
        'Direct conversations must have exactly 2 participants',
      );
    }

    // Check if direct conversation already exists
    if (createConversationDto.type === ConversationType.DIRECT) {
      const existingConversation = await this.conversationModel.findOne({
        type: ConversationType.DIRECT,
        participants: { $all: participants, $size: 2 },
      });

      if (existingConversation) {
        return existingConversation;
      }
    }

    const conversation = new this.conversationModel({
      name: createConversationDto.title, // Map 'title' from DTO to 'name' in schema
      description: createConversationDto.description,
      type: createConversationDto.type,
      project: createConversationDto.project,
      participants,
      createdBy: userId,
      lastActivity: new Date(),
    });

    const savedConversation = await conversation.save();

    // Populate participants before returning
    const populatedConversation = await this.conversationModel
      .findById(savedConversation._id)
      .populate('participants', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName email avatar')
      .exec();

    return populatedConversation || savedConversation;
  }

  async findAllConversations(
    userId: string,
    query: ConversationQueryDto,
  ): Promise<ConversationDocument[]> {
    const filter: Record<string, unknown> = {
      participants: userId,
    };

    if (query.type) {
      filter.type = query.type;
    }

    if (query.project) {
      filter.project = query.project;
    }

    if (!query.includeArchived) {
      filter.isArchived = { $ne: true };
    }

    if (query.search) {
      // Escape special regex characters to prevent ReDoS attacks
      const escapedSearch = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.title = { $regex: escapedSearch, $options: 'i' };
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    return this.conversationModel
      .find(filter)
      .populate('participants', 'firstName lastName email avatar')
      .populate('project', 'name description')
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('lastMessage')
      .sort({ lastActivity: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async findOneConversation(
    conversationId: string,
    userId: string,
  ): Promise<ConversationDocument> {
    const conversation = await this.conversationModel
      .findOne({
        _id: conversationId,
        participants: userId,
      })
      .populate('participants', 'firstName lastName email avatar')
      .populate('project', 'name description')
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('lastMessage')
      .exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async updateConversation(
    conversationId: string,
    updateConversationDto: UpdateConversationDto,
    userId: string,
  ): Promise<ConversationDocument> {
    const conversation = await this.conversationModel.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Get user details to check if they're an admin
    const user = await this.userModel.findById(userId);
    const isAdmin = user?.role === Role.ADMIN;

    // Only creator or admin can update certain fields
    if (updateConversationDto.title || updateConversationDto.description) {
      const isCreator = conversation.createdBy.toString() === userId;
      if (!isCreator && !isAdmin) {
        throw new ForbiddenException(
          'Only conversation creator or admin can update title/description',
        );
      }
    }

    // Map 'title' from DTO to 'name' in schema
    if (updateConversationDto.title !== undefined) {
      conversation.name = updateConversationDto.title;
    }
    if (updateConversationDto.description !== undefined) {
      conversation.description = updateConversationDto.description;
    }
    if (updateConversationDto.isArchived !== undefined) {
      conversation.isArchived = updateConversationDto.isArchived;
    }
    if (updateConversationDto.isMuted !== undefined) {
      conversation.isMuted = updateConversationDto.isMuted;
    }

    await conversation.save();

    // Populate participants and createdBy before returning
    const populatedConversation = await this.conversationModel
      .findById(conversationId)
      .populate('participants', 'firstName lastName email avatar role')
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('project', 'name projectManager')
      .exec();

    return populatedConversation || conversation;
  }

  async addParticipant(
    conversationId: string,
    addParticipantDto: AddParticipantDto,
    userId: string,
  ): Promise<ConversationDocument> {
    const conversation = await this.conversationModel
      .findById(conversationId)
      .populate('project', 'projectManager')
      .exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.type === ConversationType.DIRECT) {
      throw new BadRequestException(
        'Cannot add participants to direct conversations',
      );
    }

    // Authorization check based on conversation type
    const requestingUser = await this.userModel
      .findById(userId)
      .select('role')
      .exec();

    if (!requestingUser) {
      throw new NotFoundException('User not found');
    }

    const isCreator = conversation.createdBy.toString() === userId;
    const isAdmin = requestingUser.role === Role.ADMIN;

    if (conversation.type === ConversationType.GROUP) {
      // Group Chat: Only creator or admin can add members
      if (!isCreator && !isAdmin) {
        throw new ForbiddenException(
          'Only the group creator or admin can add participants',
        );
      }
    } else if (conversation.type === ConversationType.PROJECT) {
      // Project Chat: Only admin or project manager can add members
      const projectData = conversation.project as any;
      const isProjectManager =
        projectData?.projectManager?.toString() === userId;

      if (!isAdmin && !isProjectManager) {
        throw new ForbiddenException(
          'Only admin or project manager can add participants to project chat',
        );
      }
    }

    if (
      conversation.participants.some(
        (p) => p.toString() === addParticipantDto.userId,
      )
    ) {
      throw new BadRequestException('User is already a participant');
    }

    conversation.participants.push(
      new Types.ObjectId(addParticipantDto.userId),
    );
    conversation.lastActivity = new Date();

    const savedConversation = await conversation.save();

    this.logger.log(
      `Participant ${addParticipantDto.userId} added to conversation ${conversationId}`,
    );

    return this.conversationModel
      .findById(savedConversation._id)
      .populate('participants', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName email avatar')
      .exec() as Promise<ConversationDocument>;
  }

  async removeParticipant(
    conversationId: string,
    removeParticipantDto: RemoveParticipantDto,
    userId: string,
  ): Promise<ConversationDocument> {
    const conversation = await this.conversationModel
      .findById(conversationId)
      .populate('project', 'projectManager')
      .exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.type === ConversationType.DIRECT) {
      throw new BadRequestException(
        'Cannot remove participants from direct conversations',
      );
    }

    // Authorization check based on conversation type
    const requestingUser = await this.userModel
      .findById(userId)
      .select('role')
      .exec();

    if (!requestingUser) {
      throw new NotFoundException('User not found');
    }

    const isCreator = conversation.createdBy.toString() === userId;
    const isAdmin = requestingUser.role === Role.ADMIN;
    const isSelfRemoval = removeParticipantDto.userId === userId;

    if (conversation.type === ConversationType.GROUP) {
      // Group Chat: Only creator, admin, or self can remove
      if (!isCreator && !isAdmin && !isSelfRemoval) {
        throw new ForbiddenException(
          'Only the group creator or admin can remove participants',
        );
      }
    } else if (conversation.type === ConversationType.PROJECT) {
      // Project Chat: Only admin, project manager, or self can remove
      const projectData = conversation.project as any;
      const isProjectManager =
        projectData?.projectManager?.toString() === userId;

      if (!isAdmin && !isProjectManager && !isSelfRemoval) {
        throw new ForbiddenException(
          'Only admin or project manager can remove participants from project chat',
        );
      }
    }

    const participantIndex = conversation.participants.findIndex(
      (p) => p.toString() === removeParticipantDto.userId,
    );

    if (participantIndex === -1) {
      throw new BadRequestException('User is not a participant');
    }

    // Prevent removing the last participant
    if (conversation.participants.length === 1) {
      throw new BadRequestException(
        'Cannot remove the last participant from the conversation',
      );
    }

    conversation.participants.splice(participantIndex, 1);
    conversation.lastActivity = new Date();

    const savedConversation = await conversation.save();

    this.logger.log(
      `Participant ${removeParticipantDto.userId} removed from conversation ${conversationId}`,
    );

    return this.conversationModel
      .findById(savedConversation._id)
      .populate('participants', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName email avatar')
      .exec() as Promise<ConversationDocument>;
  }

  // Message Methods
  async sendMessage(
    sendMessageDto: SendMessageDto,
    userId: string,
  ): Promise<MessageDocument> {
    // Verify user is participant in conversation
    const conversation = await this.conversationModel.findOne({
      _id: sendMessageDto.conversation,
      participants: userId,
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found or access denied');
    }

    const message = new this.messageModel({
      content: sendMessageDto.content,
      messageType: sendMessageDto.type,
      conversation: sendMessageDto.conversation,
      replyTo: sendMessageDto.replyTo,
      attachments: sendMessageDto.attachments,
      mentions: sendMessageDto.mentions,
      metadata: sendMessageDto.metadata,
      sender: userId,
      status: MessageStatus.SENT,
    });

    const savedMessage = await message.save();

    // Update conversation's last message and activity
    await this.conversationModel.findByIdAndUpdate(
      sendMessageDto.conversation,
      {
        lastMessage: savedMessage._id,
        lastActivity: new Date(),
      },
    );

    // Populate sender before returning
    const populatedMessage = await this.messageModel
      .findById(savedMessage._id)
      .populate('sender', 'firstName lastName email avatar')
      .exec();

    return populatedMessage || savedMessage;
  }

  async findMessages(
    query: MessageQueryDto,
    userId: string,
  ): Promise<MessageDocument[]> {
    // Verify user has access to conversation
    const conversation = await this.conversationModel.findOne({
      _id: query.conversation,
      participants: userId,
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found or access denied');
    }

    const filter: Record<string, unknown> = {
      conversation: query.conversation,
    };

    if (!query.includeDeleted) {
      filter.isDeleted = { $ne: true };
    }

    if (query.type) {
      filter.type = query.type;
    }

    if (query.sender) {
      filter.sender = query.sender;
    }

    if (query.search) {
      // Escape special regex characters to prevent ReDoS attacks
      const escapedSearch = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.content = { $regex: escapedSearch, $options: 'i' };
    }

    if (query.before) {
      filter._id = { $lt: query.before };
    }

    if (query.after) {
      filter._id = { $gt: query.after };
    }

    const limit = query.limit || 50;

    return this.messageModel
      .find(filter)
      .populate('sender', 'firstName lastName email avatar')
      .populate('replyTo')
      .populate('mentions', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async updateMessage(
    messageId: string,
    updateMessageDto: UpdateMessageDto,
    userId: string,
  ): Promise<MessageDocument> {
    const message = await this.messageModel.findOne({
      _id: messageId,
      sender: userId,
      isDeleted: { $ne: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found or access denied');
    }

    message.content = updateMessageDto.content;
    message.mentions =
      updateMessageDto.mentions?.map((id) => new Types.ObjectId(id)) ||
      message.mentions;
    message.isEdited = true;
    message.editedAt = new Date();

    return message.save();
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messageModel.findOne({
      _id: messageId,
      sender: userId,
    });

    if (!message) {
      throw new NotFoundException('Message not found or access denied');
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();
  }

  async addReaction(
    messageId: string,
    reactionDto: MessageReactionDto,
    userId: string,
  ): Promise<MessageDocument> {
    const message = await this.messageModel.findById(messageId);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user has access to conversation
    const conversation = await this.conversationModel.findOne({
      _id: message.conversation,
      participants: userId,
    });

    if (!conversation) {
      throw new ForbiddenException('Access denied');
    }

    const userObjectId = new Types.ObjectId(userId);
    const existingReaction = message.reactions.find(
      (r) => r.emoji === reactionDto.emoji,
    );

    if (existingReaction) {
      const userIndex = existingReaction.users.findIndex(
        (u) => u.toString() === userId,
      );
      if (userIndex === -1) {
        existingReaction.users.push(userObjectId);
        existingReaction.count++;
      } else {
        existingReaction.users.splice(userIndex, 1);
        existingReaction.count--;
        if (existingReaction.count === 0) {
          message.reactions = message.reactions.filter(
            (r) => r.emoji !== reactionDto.emoji,
          );
        }
      }
    } else {
      message.reactions.push({
        emoji: reactionDto.emoji,
        users: [userObjectId],
        count: 1,
      });
    }

    return message.save();
  }

  async markAsRead(
    markAsReadDto: MarkAsReadDto,
    userId: string,
  ): Promise<void> {
    const message = await this.messageModel.findById(markAsReadDto.messageId);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user has access to conversation
    const conversation = await this.conversationModel.findOne({
      _id: message.conversation,
      participants: userId,
    });

    if (!conversation) {
      throw new ForbiddenException('Access denied');
    }

    const existingRead = message.readBy.find(
      (r) => r.user.toString() === userId,
    );
    if (!existingRead) {
      message.readBy.push({
        user: new Types.ObjectId(userId),
        readAt: new Date(),
      });
      await message.save();
    }
  }

  async getUnreadCount(
    userId: string,
    conversationId: string,
  ): Promise<number> {
    return this.messageModel.countDocuments({
      conversation: conversationId,
      sender: { $ne: userId },
      'readBy.user': { $ne: userId },
      isDeleted: { $ne: true },
    });
  }

  /**
   * Find or create a department group conversation
   * Used for automatic department chat creation on user onboarding
   */
  async findOrCreateDepartmentChat(
    department: string,
  ): Promise<ConversationDocument> {
    // Try to find existing department conversation
    const existing = await this.conversationModel
      .findOne({
        type: ConversationType.GROUP,
        name: `${department} Department`,
      })
      .exec();

    if (existing) {
      return existing;
    }

    // Create new department conversation
    const conversation = new this.conversationModel({
      type: ConversationType.GROUP,
      name: `${department} Department`,
      participants: [], // Will be populated as users join
      createdBy: null, // System-created conversation
    });

    return conversation.save();
  }

  /**
   * Send a system message (automated message, not from a user)
   * Used for welcome messages, notifications, etc.
   */
  async sendSystemMessage(
    conversationId: string,
    content: string,
  ): Promise<MessageDocument> {
    // Validate conversation exists
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const message = new this.messageModel({
      conversation: new Types.ObjectId(conversationId),
      // No sender for system messages
      content,
      messageType: MessageType.SYSTEM,
      status: MessageStatus.SENT,
      readBy: [], // System messages start unread
    });

    const savedMessage = await message.save();

    // Update conversation's last message
    conversation.lastMessage = savedMessage._id;
    conversation.updatedAt = new Date();
    await conversation.save();

    return savedMessage;
  }

  /**
   * Add user to department chat if it exists
   * Used during onboarding to automatically add new users to their department
   */
  async addUserToDepartmentChat(
    userId: string,
    department: string,
  ): Promise<ConversationDocument | null> {
    try {
      const conversation = await this.findOrCreateDepartmentChat(department);

      // Check if user is already a participant
      const isParticipant = conversation.participants.some(
        (p) => p.toString() === userId,
      );

      if (!isParticipant) {
        conversation.participants.push(new Types.ObjectId(userId));
        await conversation.save();
      }

      return conversation;
    } catch (error) {
      // Don't fail onboarding if chat creation fails
      return null;
    }
  }
}
