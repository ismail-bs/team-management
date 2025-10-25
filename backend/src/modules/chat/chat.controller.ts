import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum.js';
import { ChatService } from './chat.service';
import { ChatGateway } from './gateways/chat.gateway';
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
  MessageQueryDto,
} from './dto/message.dto';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface.js';

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  // Conversation endpoints
  @Post('conversations')
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({
    status: 201,
    description: 'Conversation created successfully',
  })
  async createConversation(
    @Body() createConversationDto: CreateConversationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.chatService.createConversation(
      createConversationDto,
      req.user.sub,
    );
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Conversations retrieved successfully',
  })
  async findAllConversations(
    @Query() query: ConversationQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.chatService.findAllConversations(req.user.sub, query);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get a specific conversation' })
  @ApiResponse({
    status: 200,
    description: 'Conversation retrieved successfully',
  })
  async findOneConversation(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.chatService.findOneConversation(id, req.user.sub);
  }

  @Patch('conversations/:id')
  @ApiOperation({ summary: 'Update a conversation' })
  @ApiResponse({
    status: 200,
    description: 'Conversation updated successfully',
  })
  async updateConversation(
    @Param('id') id: string,
    @Body() updateConversationDto: UpdateConversationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    this.logger.log(`🔄 Updating conversation ${id}`);
    this.logger.log(`🔄 Update data:`, updateConversationDto);

    const updatedConversation = await this.chatService.updateConversation(
      id,
      updateConversationDto,
      req.user.sub,
    );

    this.logger.log(`🔄 Conversation updated, emitting WebSocket event`);

    // Emit WebSocket event to all participants in the conversation
    this.chatGateway.server
      .to(`conversation:${id}`)
      .emit('conversation:updated', {
        conversation: updatedConversation,
      });

    this.logger.log(
      `✅ Conversation update broadcasted to room: conversation:${id}`,
    );

    return updatedConversation;
  }

  @Post('conversations/:id/participants')
  @ApiOperation({ summary: 'Add a participant to a conversation' })
  @ApiResponse({ status: 200, description: 'Participant added successfully' })
  async addParticipant(
    @Param('id') id: string,
    @Body() addParticipantDto: AddParticipantDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const updatedConversation = await this.chatService.addParticipant(
      id,
      addParticipantDto,
      req.user.sub,
    );

    // Emit WebSocket event to all participants
    this.chatGateway.server
      .to(`conversation:${id}`)
      .emit('conversation:participant_added', {
        conversation: updatedConversation,
        addedUserId: addParticipantDto.userId,
      });

    return updatedConversation;
  }

  @Delete('conversations/:id/participants')
  @ApiOperation({ summary: 'Remove a participant from a conversation' })
  @ApiResponse({ status: 200, description: 'Participant removed successfully' })
  async removeParticipant(
    @Param('id') id: string,
    @Body() removeParticipantDto: RemoveParticipantDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const updatedConversation = await this.chatService.removeParticipant(
      id,
      removeParticipantDto,
      req.user.sub,
    );

    // Emit WebSocket event to all remaining participants
    this.chatGateway.server
      .to(`conversation:${id}`)
      .emit('conversation:participant_removed', {
        conversation: updatedConversation,
        removedUserId: removeParticipantDto.userId,
      });

    return updatedConversation;
  }

  // Message endpoints
  @Post('messages')
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @Request() req: AuthenticatedRequest,
  ) {
    this.logger.log(
      `📨 HTTP API: Sending message to conversation ${sendMessageDto.conversation}`,
    );
    this.logger.log(`📨 Content: ${sendMessageDto.content}`);
    this.logger.log(`📨 Type: ${sendMessageDto.type}`);
    this.logger.log(`📨 User: ${req.user.sub}`);

    const message = await this.chatService.sendMessage(
      sendMessageDto,
      req.user.sub,
    );

    this.logger.log(`📨 Message saved with ID: ${message?._id}`);

    // Get room info for debugging
    const roomName = `conversation:${sendMessageDto.conversation}`;
    const socketsInRoom = await this.chatGateway.server
      .in(roomName)
      .fetchSockets();
    this.logger.log(`📢 Broadcasting to room: ${roomName}`);
    this.logger.log(`📢 Clients in room: ${socketsInRoom.length}`);
    socketsInRoom.forEach((socket, index) => {
      this.logger.log(`📢   Client ${index + 1}: ${socket.id}`);
    });

    // Emit WebSocket event for real-time delivery (consistent with gateway format)
    this.chatGateway.server.to(roomName).emit('message:new', {
      message: message,
    });

    this.logger.log(
      `✅ Message broadcasted to ${socketsInRoom.length} clients`,
    );

    return message;
  }

  @Get('messages')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async findMessages(
    @Query() query: MessageQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.chatService.findMessages(query, req.user.sub);
  }

  @Patch('messages/:id')
  @ApiOperation({ summary: 'Update a message' })
  @ApiResponse({ status: 200, description: 'Message updated successfully' })
  async updateMessage(
    @Param('id') id: string,
    @Body() updateMessageDto: UpdateMessageDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.chatService.updateMessage(id, updateMessageDto, req.user.sub);
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  async deleteMessage(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const deleted = await this.chatService.deleteMessage(
      id,
      req.user.sub,
      req.user.role,
    );

    // Emit WebSocket event to conversation room so clients can update UI
    const conversationId =
      typeof deleted.conversation === 'string'
        ? deleted.conversation
        : deleted?.conversation?.toString?.();
    if (conversationId) {
      this.chatGateway.server
        .to(`conversation:${conversationId}`)
        // Emit just the ID to match frontend handler signature
        .emit('message:deleted', id);
    }

    return { message: 'Message deleted successfully' };
  }

  @Post('messages/:id/read')
  @ApiOperation({ summary: 'Mark a message as read' })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  async markAsRead(
    @Param('id') messageId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.chatService.markAsRead({ messageId }, req.user.sub);
    return { message: 'Message marked as read' };
  }

  @Get('conversations/:id/unread-count')
  @ApiOperation({ summary: 'Get unread message count for a conversation' })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
  })
  async getUnreadCount(
    @Param('id') conversationId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const count = await this.chatService.getUnreadCount(
      req.user.sub,
      conversationId,
    );
    return { unreadCount: count };
  }

  @Post('conversations/:id/read')
  @ApiOperation({
    summary:
      'Mark all unread messages in a conversation as read for current user',
  })
  @ApiResponse({ status: 200, description: 'Conversation marked as read' })
  async markConversationAsRead(
    @Param('id') conversationId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const { updatedCount } = await this.chatService.markConversationAsRead(
      conversationId,
      req.user.sub,
    );
    return { updatedCount };
  }

  @Delete('conversations/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a conversation (Admin only)' })
  @ApiResponse({
    status: 204,
    description: 'Conversation deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async deleteConversation(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.chatService.deleteConversation(id, req.user.sub);

    // Notify participants via WebSocket that conversation was deleted
    this.chatGateway.server
      .to(`conversation:${id}`)
      .emit('conversation:deleted', id);
  }
}
