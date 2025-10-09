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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
    return this.chatService.updateConversation(
      id,
      updateConversationDto,
      req.user.sub,
    );
  }

  @Post('conversations/:id/participants')
  @ApiOperation({ summary: 'Add a participant to a conversation' })
  @ApiResponse({ status: 200, description: 'Participant added successfully' })
  async addParticipant(
    @Param('id') id: string,
    @Body() addParticipantDto: AddParticipantDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.chatService.addParticipant(id, addParticipantDto, req.user.sub);
  }

  @Delete('conversations/:id/participants')
  @ApiOperation({ summary: 'Remove a participant from a conversation' })
  @ApiResponse({ status: 200, description: 'Participant removed successfully' })
  async removeParticipant(
    @Param('id') id: string,
    @Body() removeParticipantDto: RemoveParticipantDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.chatService.removeParticipant(
      id,
      removeParticipantDto,
      req.user.sub,
    );
  }

  // Message endpoints
  @Post('messages')
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const message = await this.chatService.sendMessage(
      sendMessageDto,
      req.user.sub,
    );

    // Emit WebSocket event for real-time delivery (consistent with gateway format)
    this.chatGateway.server
      .to(`conversation:${sendMessageDto.conversation}`)
      .emit('message:new', {
        message: message,
      });

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
    await this.chatService.deleteMessage(id, req.user.sub);
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
}
