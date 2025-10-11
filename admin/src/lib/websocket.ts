import { io, Socket } from 'socket.io-client';
import { Message, Conversation } from './api';

/**
 * Type-safe Socket.IO event definitions
 * Ensures consistent event handling across the application
 */
export interface SocketEvents {
  // Connection events
  connect: () => void;
  disconnect: () => void;
  error: (error: Error) => void;
  
  // Message events
  'message:new': (message: Message) => void;
  'message:updated': (message: Message) => void;
  'message:deleted': (messageId: string) => void;
  
  // Conversation events
  'conversation:new': (conversation: Conversation) => void;
  'conversation:updated': (conversation: Conversation) => void;
  'conversation:deleted': (conversationId: string) => void;
  
  // User events
  'user:typing': (data: { userId: string; conversationId: string; isTyping: boolean }) => void;
  'user:online': (userId: string) => void;
  'user:offline': (userId: string) => void;
}

/**
 * WebSocket client for real-time communication
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - JWT authentication
 * - Type-safe event handling
 * - Room-based messaging (join/leave conversations)
 * - Typing indicators
 * - Online/offline presence
 * - Connection state management
 * 
 * Usage:
 * 1. Connect with JWT token: websocketClient.connect(token)
 * 2. Join conversation: websocketClient.joinConversation(conversationId)
 * 3. Send message: websocketClient.sendMessage(conversationId, content)
 * 4. Listen to events: websocketClient.on('message:new', handler)
 */
class WebSocketClient {
  private socket: Socket | null = null;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.loadTokenFromStorage();
  }

  private loadTokenFromStorage() {
    this.token = localStorage.getItem('access_token');
  }

  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (token) {
        this.token = token;
      }

      if (!this.token) {
        reject(new Error('No authentication token available'));
        return;
      }

      // Disconnect existing connection
      if (this.socket) {
        this.socket.disconnect();
      }

      // Create new connection
      const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';
      console.log('🔌 Connecting to WebSocket:', `${wsUrl}/chat`);
      this.socket = io(`${wsUrl}/chat`, {
        auth: {
          token: this.token
        },
        transports: ['websocket'],
        upgrade: true,
        rememberUpgrade: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // Connection event handlers
      this.socket.on('connect', () => {
        console.log('✅ WebSocket connected successfully');
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ WebSocket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          this.handleReconnect();
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
        console.error('Error details:', {
          message: error.message,
          description: error.description,
          context: error.context,
          type: error.type
        });
        if (error.message === 'Authentication error') {
          // Token might be expired, clear it
          this.token = null;
          localStorage.removeItem('access_token');
        }
        reject(error);
      });

      // Add authentication error handler
      this.socket.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
      });

      // Set connection timeout
      setTimeout(() => {
        if (!this.socket?.connected) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
      
      setTimeout(() => {
        this.connect().catch(console.error);
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.reconnectAttempts = 0;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Event listeners
  on(event: string, callback: (...args: unknown[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: unknown[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Message operations
  sendMessage(conversationId: string, content: string, messageType: 'text' | 'file' | 'image' = 'text') {
    if (this.socket?.connected) {
      this.socket.emit('message:send', {
        conversation: conversationId,
        content,
        type: messageType
      });
    } else {
      throw new Error('WebSocket not connected');
    }
  }

  markMessageAsRead(conversationId: string, messageId: string) {
    if (this.socket?.connected) {
      this.socket.emit('message:read', {
        conversation: conversationId,
        message: messageId
      });
    }
  }

  // Typing indicators
  startTyping(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit('typing:start', { conversationId });
    }
  }

  stopTyping(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit('typing:stop', { conversationId });
    }
  }

  // Conversation operations
  joinConversation(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit('conversation:join', { conversationId });
    }
  }

  leaveConversation(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit('conversation:leave', { conversationId });
    }
  }

  createConversation(data: {
    name?: string;
    type: 'direct' | 'group' | 'project';
    participants: string[];
    project?: string;
  }) {
    if (this.socket?.connected) {
      this.socket.emit('conversation:create', data);
    }
  }

  // User presence
  updatePresence(status: 'online' | 'away' | 'busy' | 'offline') {
    if (this.socket?.connected) {
      this.socket.emit('user:presence', { status });
    }
  }
}

// Create and export singleton instance
export const websocketClient = new WebSocketClient();
export default websocketClient;