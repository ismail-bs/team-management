import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from '../chat.service';
import { SendMessageDto, MessageReactionDto } from '../dto/message.dto';

interface JwtPayload {
  sub: string;
  email?: string;
  name?: string;
}

interface AuthenticatedSocket extends Socket {
  userId: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/chat',
})
@UsePipes(new ValidationPipe({ transform: true }))
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('ChatGateway');
  private connectedUsers = new Map<string, string[]>(); // userId -> socketIds[]

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(): void {
    this.logger.log('Chat Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(
          `Client ${client.id} attempted to connect without token`,
        );
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      let payload;
      try {
        payload = this.jwtService.verify(token);
      } catch (error) {
        this.logger.warn(
          `Client ${client.id} provided invalid token: ${error.message}`,
        );
        client.emit('error', { message: 'Invalid authentication token' });
        client.disconnect();
        return;
      }

      if (!payload?.sub) {
        this.logger.warn(`Client ${client.id} token missing user ID`);
        client.emit('error', { message: 'Invalid token payload' });
        client.disconnect();
        return;
      }

      client.userId = payload.sub;
      client.user = {
        id: payload.sub,
        email: payload.email || '',
        name: payload.name || '',
      };

      // Track connected user
      const userSockets = this.connectedUsers.get(client.userId) || [];
      userSockets.push(client.id);
      this.connectedUsers.set(client.userId, userSockets);

      // Join user to their personal room for direct notifications
      await client.join(`user:${client.userId}`);

      // Join user to all their conversation rooms
      try {
        const conversations = await this.chatService.findAllConversations(
          client.userId,
          {},
        );
        for (const conversation of conversations) {
          await client.join(`conversation:${conversation._id}`);
        }
      } catch (error) {
        this.logger.error('Error joining conversation rooms:', error.message);
      }

      this.logger.log(`Client ${client.id} connected as user ${client.userId}`);

      // Notify other users that this user is online
      client.broadcast.emit('user:online', {
        userId: client.userId,
        user: client.user,
      });
    } catch (error) {
      this.logger.error(
        `Authentication failed for client ${client.id}:`,
        error.message,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      // Remove socket from user's socket list
      const userSockets = this.connectedUsers.get(client.userId) || [];
      const updatedSockets = userSockets.filter(
        (socketId) => socketId !== client.id,
      );

      if (updatedSockets.length === 0) {
        // User is completely offline
        this.connectedUsers.delete(client.userId);

        // Notify other users that this user is offline
        client.broadcast.emit('user:offline', {
          userId: client.userId,
        });
      } else {
        this.connectedUsers.set(client.userId, updatedSockets);
      }

      this.logger.log(
        `Client ${client.id} disconnected (user: ${client.userId})`,
      );
    }
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @MessageBody() sendMessageDto: SendMessageDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      client.emit('message:error', { error: 'User not authenticated' });
      return;
    }

    try {
      const message = await this.chatService.sendMessage(
        sendMessageDto,
        client.userId,
      );

      // Broadcast to all participants in the conversation
      this.server
        .to(`conversation:${sendMessageDto.conversation}`)
        .emit('message:new', {
          message: message,
        });

      // Send acknowledgment to sender
      client.emit('message:sent', {
        tempId: sendMessageDto.tempId,
        message: message,
      });
    } catch (error) {
      this.logger.error('Error sending message:', error.message);
      client.emit('message:error', {
        tempId: sendMessageDto.tempId,
        error: error.message,
      });
    }
  }

  @SubscribeMessage('message:edit')
  async handleEditMessage(
    @MessageBody()
    data: { messageId: string; content: string; mentions?: string[] },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      client.emit('message:error', { error: 'User not authenticated' });
      return;
    }

    try {
      const updatedMessage = await this.chatService.updateMessage(
        data.messageId,
        { content: data.content, mentions: data.mentions },
        client.userId,
      );

      // Broadcast to conversation participants
      this.server
        .to(`conversation:${updatedMessage.conversation}`)
        .emit('message:edited', {
          message: updatedMessage,
        });
    } catch (error) {
      this.logger.error('Error editing message:', error.message);
      client.emit('message:error', {
        error: error.message,
      });
    }
  }

  @SubscribeMessage('message:react')
  async handleReactToMessage(
    @MessageBody() reactionDto: MessageReactionDto & { messageId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      client.emit('message:error', { error: 'User not authenticated' });
      return;
    }

    try {
      const updatedMessage = await this.chatService.addReaction(
        reactionDto.messageId,
        { emoji: reactionDto.emoji },
        client.userId,
      );

      // Broadcast to conversation participants
      this.server
        .to(`conversation:${updatedMessage.conversation}`)
        .emit('message:reaction', {
          messageId: reactionDto.messageId,
          reactions: updatedMessage.reactions,
          userId: client.userId,
        });
    } catch (error) {
      this.logger.error('Error adding reaction:', error.message);
      client.emit('message:error', {
        error: error.message,
      });
    }
  }

  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      client.emit('conversation:error', { error: 'User not authenticated' });
      return;
    }

    try {
      // Verify user has access to conversation
      await this.chatService.findOneConversation(
        data.conversationId,
        client.userId,
      );

      // Join the conversation room
      await client.join(`conversation:${data.conversationId}`);

      client.emit('conversation:joined', {
        conversationId: data.conversationId,
      });
    } catch (error) {
      this.logger.error('Error joining conversation:', error.message);
      client.emit('conversation:error', {
        error: error.message,
      });
    }
  }

  @SubscribeMessage('conversation:leave')
  async handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    await client.leave(`conversation:${data.conversationId}`);

    client.emit('conversation:left', {
      conversationId: data.conversationId,
    });
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return;

    client.to(`conversation:${data.conversationId}`).emit('typing:start', {
      conversationId: data.conversationId,
      userId: client.userId,
      user: client.user,
    });
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return;

    client.to(`conversation:${data.conversationId}`).emit('typing:stop', {
      conversationId: data.conversationId,
      userId: client.userId,
    });
  }

  // Helper methods
  getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}
