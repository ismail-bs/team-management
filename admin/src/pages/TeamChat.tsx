import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Send, Plus, Hash, Users, Loader2 } from "lucide-react";
import { AddChannelDialog } from "@/components/dialogs/AddChannelDialog";
import { SelectTeamMemberDialog } from "@/components/dialogs/SelectTeamMemberDialog";
import { toast } from "@/hooks/use-toast";
import { apiClient, Conversation, Message } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { websocketClient } from "@/lib/websocket";

export default function TeamChat() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [addChannelOpen, setAddChannelOpen] = useState(false);
  const [selectMemberOpen, setSelectMemberOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasConnectedRef = useRef(false);
  const selectedConversationRef = useRef<Conversation | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    if (user && !hasConnectedRef.current) {
      hasConnectedRef.current = true;
      initializeWebSocket();
    }

    return () => {
      // Cleanup on unmount
      websocketClient.disconnect();
      hasConnectedRef.current = false;
    };
  }, [user]);

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // WebSocket setup
  const initializeWebSocket = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error('No auth token found');
        return;
      }

      await websocketClient.connect(token);
      console.log('✅ WebSocket connected successfully');

      // Listen for new messages
      websocketClient.on('message:new', (data: any) => {
        console.log('🔔 WebSocket message:new event received:', data);
        
        const newMessage = data.message || data;
        console.log('📨 Processed message:', newMessage);
        console.log('👤 Message sender:', newMessage.sender?._id);
        console.log('👤 Current user:', user?._id);
        console.log('📂 Current conversation (ref):', selectedConversationRef.current?._id);
        console.log('📂 Message conversation:', newMessage.conversation);

        // Check if this message is from the current user (skip if it is - we already have optimistic update)
        const isOwnMessage = newMessage.sender?._id === user?._id || newMessage.sender === user?._id;
        
        if (isOwnMessage) {
          console.log('⏭️ Skipping own message (already added via optimistic update)');
          // Still update conversation list timestamp
          updateConversationWithNewMessage(newMessage);
          return;
        }

        // Add to messages if it's for the current conversation
        if (selectedConversationRef.current && newMessage.conversation === selectedConversationRef.current._id) {
          console.log('✅ Adding message to current conversation');
          setMessages(prev => {
            const exists = prev.some(m => m._id === newMessage._id);
            if (exists) {
              console.log('⚠️ Message already exists, skipping');
              return prev;
            }
            console.log('✅ Message added to state');
            return [...prev, newMessage];
          });
        } else {
          console.log('ℹ️ Message for different conversation, updating sidebar only');
        }

        // Update conversation list
        updateConversationWithNewMessage(newMessage);
      });

      // Listen for user online/offline
      websocketClient.on('user:online', (data: any) => {
        console.log('👤 User online:', data.userId);
      });

      websocketClient.on('user:offline', (data: any) => {
        console.log('👤 User offline:', data.userId);
      });

    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
      toast({
        title: "Connection Error",
        description: "Real-time chat unavailable. Messages will still work.",
        variant: "destructive",
      });
    }
  };

  const updateConversationWithNewMessage = (newMessage: Message) => {
    setConversations(prev => {
      const updated = prev.map(conv => 
        conv._id === newMessage.conversation
          ? { ...conv, lastMessage: newMessage, updatedAt: newMessage.createdAt }
          : conv
      );

      // Re-sort by most recent
      return updated.sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.createdAt).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt).getTime();
        return timeB - timeA;
      });
    });
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const convs = await apiClient.getConversations();
      
      // Sort by most recent
      const sortedConvs = (convs || []).sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.createdAt).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt).getTime();
        return timeB - timeA;
      });
      
      setConversations(sortedConvs);
      
      // Auto-select first conversation
      if (sortedConvs.length > 0 && !selectedConversation) {
        selectConversation(sortedConvs[0]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conversation: Conversation) => {
    try {
      // Leave previous conversation room
      if (selectedConversation) {
        websocketClient.leaveConversation(selectedConversation._id);
      }

      setSelectedConversation(conversation);
      selectedConversationRef.current = conversation; // Update ref for WebSocket callbacks
      setMessages([]);
      
      // Join new conversation room via WebSocket
      websocketClient.joinConversation(conversation._id);
      console.log('🔗 Joined conversation room:', conversation._id);
      
      // Load messages once via API
      await loadMessages(conversation._id);
      
    } catch (error) {
      console.error('Error selecting conversation:', error);
      setMessages([]);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const msgs = await apiClient.getMessages(conversationId, { limit: 100 });
      
      // Sort oldest → newest
      const sortedMessages = Array.isArray(msgs) 
        ? msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        : [];
      
      setMessages(sortedMessages);
      
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || sendingMessage) return;

    const messageContent = messageInput.trim();
    const tempId = `temp-${Date.now()}`;
    setMessageInput("");
    
    try {
      setSendingMessage(true);
      
      // Create optimistic message
      const optimisticMessage: Message = {
        _id: tempId,
        conversation: selectedConversation._id,
        sender: user as any,
        content: messageContent,
        type: 'text',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Message;

      // Add optimistically
      setMessages(prev => [...prev, optimisticMessage]);
      scrollToBottom();

      // Send via API (backend will emit WebSocket event)
      const newMessage = await apiClient.sendMessage(selectedConversation._id, {
        content: messageContent,
        messageType: 'text'
      });

      console.log('📤 Message sent successfully:', newMessage);

      // Replace optimistic with real message (has real _id, timestamp, etc.)
      setMessages(prev => {
        const updated = prev.map(m => m._id === tempId ? newMessage : m);
        console.log('🔄 Replaced optimistic message with real message');
        return updated;
      });

      // Update conversation list
      updateConversationWithNewMessage(newMessage);
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m._id !== tempId));
      
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      
      // Restore message input
      setMessageInput(messageContent);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAddChannel = async (channelData: { name: string }) => {
    try {
      const conversation = await apiClient.createConversation({
        name: channelData.name,
        type: 'group',
        participants: user ? [user._id] : [],
      });
      
      setConversations(prev => [conversation, ...prev]);
      selectConversation(conversation);
      
      toast({
        title: "Success",
        description: `Channel #${channelData.name} created`,
      });
      
      setAddChannelOpen(false);
      
    } catch (error: any) {
      console.error('Error creating channel:', error);
      
      let errorMessage = "Failed to create channel";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleSelectMember = async (member: any) => {
    try {
      // Check if conversation exists
      const existingConv = conversations.find(conv => 
        conv.type === 'direct' && 
        conv.participants.some(p => p._id === member.id)
      );

      if (existingConv) {
        selectConversation(existingConv);
        setSelectMemberOpen(false);
        
        toast({
          title: "Info",
          description: `Opened conversation with ${member.name}`,
        });
        return;
      }

      // Create new DM
      const conversation = await apiClient.createConversation({
        type: 'direct',
        participants: user ? [user._id, member.id] : [member.id],
      });
      
      setConversations(prev => [conversation, ...prev]);
      selectConversation(conversation);
      
      toast({
        title: "Success",
        description: `Started conversation with ${member.name}`,
      });
      
      setSelectMemberOpen(false);
      
    } catch (error: any) {
      console.error('Error starting conversation:', error);
      
      let errorMessage = "Failed to start conversation";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const getConversationName = (conv: Conversation) => {
    const displayName = conv.name || (conv as any).title;
    if (displayName) return displayName;
    
    if (conv.type === 'direct') {
      const otherUser = conv.participants.find(p => p._id !== user?._id);
      return otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Direct Message';
    }
    
    return 'Conversation';
  };

  const getConversationAvatar = (conv: Conversation) => {
    if (conv.type === 'direct') {
      const otherUser = conv.participants.find(p => p._id !== user?._id);
      return otherUser?.avatar;
    }
    return undefined;
  };

  const getConversationInitials = (conv: Conversation) => {
    if (conv.type === 'direct') {
      const otherUser = conv.participants.find(p => p._id !== user?._id);
      if (otherUser) {
        return `${otherUser.firstName?.[0] || ''}${otherUser.lastName?.[0] || ''}`.toUpperCase() || 'DM';
      }
    }
    return conv.name ? conv.name.substring(0, 2).toUpperCase() : 'GC';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading conversations...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-2rem)] m-4 flex gap-4">
        {/* Conversations Sidebar */}
        <Card className="w-full md:w-80 flex flex-col">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Messages</span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddChannelOpen(true)}
                  title="New Channel"
                >
                  <Hash className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectMemberOpen(true)}
                  title="New Direct Message"
                >
                  <Users className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 p-0 overflow-y-auto">
            {conversations.length > 0 ? (
              <div className="divide-y">
                {conversations.map((conv) => (
                  <div
                    key={conv._id}
                    onClick={() => selectConversation(conv)}
                    className={`p-4 cursor-pointer transition-all border-l-4 ${
                      selectedConversation?._id === conv._id 
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border-l-blue-600' 
                        : 'border-l-transparent hover:bg-muted/50 hover:border-l-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {conv.type === 'direct' ? (
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={getConversationAvatar(conv)} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                            {getConversationInitials(conv)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Hash className="h-5 w-5 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm truncate">
                            {getConversationName(conv)}
                          </p>
                          {conv.updatedAt && (
                            <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                              {new Date(conv.updatedAt).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage?.content || `${conv.participants.length} participant${conv.participants.length !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <p className="mb-4">No conversations yet</p>
                <Button size="sm" onClick={() => setAddChannelOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Channel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col min-w-0">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <CardHeader className="border-b pb-3">
                <div className="flex items-center gap-3">
                  {selectedConversation.type === 'direct' ? (
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={getConversationAvatar(selectedConversation)} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        {getConversationInitials(selectedConversation)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <Hash className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg">
                      {selectedConversation.type === 'group' ? '#' : ''}
                      {getConversationName(selectedConversation)}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.participants.length} member{selectedConversation.participants.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </CardHeader>

              {/* Messages Area */}
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-muted-foreground">No messages yet</p>
                      <p className="text-sm text-muted-foreground mt-1">Start the conversation!</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => {
                      if (!message.sender) return null;
                      
                      const isCurrentUser = message.sender._id === user?._id;
                      const senderInitials = `${message.sender.firstName?.[0] || ''}${message.sender.lastName?.[0] || ''}`.toUpperCase() || 'U';
                      const senderName = `${message.sender.firstName || ''} ${message.sender.lastName || ''}`.trim() || 'Unknown';
                      
                      return (
                        <div 
                          key={message._id} 
                          className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                          {!isCurrentUser && (
                            <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                              <AvatarImage src={message.sender.avatar} />
                              <AvatarFallback className="text-xs bg-gradient-to-br from-gray-400 to-gray-600 text-white">
                                {senderInitials}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          
                          <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium">
                                {isCurrentUser ? 'You' : senderName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(message.createdAt).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            </div>
                            <div className={`px-4 py-2 rounded-2xl ${
                              isCurrentUser 
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-none' 
                                : 'bg-muted rounded-bl-none'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </CardContent>

              {/* Message Input */}
              <div className="border-t p-4">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder={`Message ${getConversationName(selectedConversation)}...`}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={sendingMessage}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || sendingMessage}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"
                  >
                    {sendingMessage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Hash className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Welcome to Team Chat</h3>
                <p className="text-muted-foreground mb-6">Select a conversation to start messaging</p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => setAddChannelOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Channel
                  </Button>
                  <Button variant="outline" onClick={() => setSelectMemberOpen(true)}>
                    <Users className="h-4 w-4 mr-2" />
                    New Message
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Dialogs */}
      <AddChannelDialog
        open={addChannelOpen}
        onOpenChange={setAddChannelOpen}
        onSubmit={handleAddChannel}
      />
      
      <SelectTeamMemberDialog
        open={selectMemberOpen}
        onOpenChange={setSelectMemberOpen}
        onSelect={handleSelectMember}
      />
    </DashboardLayout>
  );
}
