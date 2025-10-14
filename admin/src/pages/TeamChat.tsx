import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Send, Plus, Hash, Users, Loader2, Info, Trash2 } from "lucide-react";
import { AddChannelDialog } from "@/components/dialogs/AddChannelDialog";
import { SelectTeamMemberDialog } from "@/components/dialogs/SelectTeamMemberDialog";
import { GroupInfoDialog } from "@/components/dialogs/GroupInfoDialog";
import { toast } from "@/hooks/use-toast";
import { apiClient, Conversation, Message } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { websocketClient } from "@/lib/websocket";

export default function TeamChat() {
  const { user } = useAuth();
  const { setActiveConversationId, unreadByConversation, wsConnected } = useChat();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [addChannelOpen, setAddChannelOpen] = useState(false);
  const [selectMemberOpen, setSelectMemberOpen] = useState(false);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const handleDeleteConversation = async () => {
    if (!selectedConversation) return;
    if (selectedConversation.type === 'direct') return;
    const ok = window.confirm('Delete this conversation and all messages? This cannot be undone.');
    if (!ok) return;
    try {
      await apiClient.deleteConversation(selectedConversation._id);
      const deletedId = selectedConversation._id;
      websocketClient.leaveConversation(deletedId);
      setSelectedConversation(null);
      selectedConversationRef.current = null;
      setMessages([]);
      setConversations(prev => prev.filter(c => c._id !== deletedId));
      toast({ title: 'Conversation deleted', description: 'This chat and its messages have been removed.' });
    } catch (err) {
      console.error('Failed to delete conversation', err);
      toast({ title: 'Delete failed', description: 'Could not delete conversation', variant: 'destructive' });
    }
  };
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedConversationRef = useRef<Conversation | null>(null);

  // Register WebSocket event handlers once
  useEffect(() => {
    if (!user) return;

    // Listen for new messages
    const onMessageNew = (data: { message?: Message }) => {
      const newMessage = data.message;
      if (!newMessage) return;

      const senderId = typeof newMessage.sender === 'string'
        ? newMessage.sender
        : newMessage.sender?._id;
      const isOwnMessage = senderId === user?._id;

      if (isOwnMessage) {
        updateConversationWithNewMessage(newMessage);
        return;
      }

      if (selectedConversationRef.current && newMessage.conversation === selectedConversationRef.current._id) {
        setMessages(prev => {
          const exists = prev.some(m => m._id === newMessage._id);
          if (exists) return prev;
          return [...prev, newMessage];
        });
        apiClient.markMessageAsRead(newMessage._id).catch(() => {});
      }

      updateConversationWithNewMessage(newMessage);
    };

    const onMessageUpdated = (data: { message?: Message }) => {
      const updated = data.message;
      if (!updated) return;
      setMessages(prev => prev.map(m => (m._id === updated._id ? { ...m, ...updated } : m)));
      updateConversationWithNewMessage(updated);
    };

    const onUserOnline = (data: { userId?: string }) => {
      console.log('👤 User online:', data.userId);
    };

    const onUserOffline = (data: { userId?: string }) => {
      console.log('👤 User offline:', data.userId);
    };

    const onParticipantAdded = (data: { conversation?: unknown; addedUserId?: string }) => {
      console.log('👥 Participant added event:', data);
      toast({ title: "New Member Added", description: "A new member has been added to the conversation" });
      loadConversations();
    };

    const onParticipantRemoved = (data: { conversation?: unknown; removedUserId?: string }) => {
      console.log('👥 Participant removed event:', data);
      if (data.removedUserId === user?._id) {
        setSelectedConversation(null);
        setMessages([]);
        toast({ title: "Removed from conversation", description: "You have been removed from this conversation", variant: "destructive" });
      } else {
        toast({ title: "Member Removed", description: "A member has been removed from the conversation" });
      }
      loadConversations();
    };

    const onConversationUpdated = (data: { conversation?: Conversation }) => {
      const updatedConv = data.conversation;
      if (!updatedConv) return;
      setConversations(prev => prev.map(conv => (conv._id === updatedConv._id ? updatedConv : conv)));
      if (selectedConversationRef.current?._id === updatedConv._id) {
        setSelectedConversation(updatedConv);
        selectedConversationRef.current = updatedConv;
      }
    };

    const onMessageDeleted = (deletedId: string) => {
      setMessages(prev => prev.filter(m => m._id !== deletedId));
    };

    websocketClient.on('message:new', onMessageNew);
    websocketClient.on('message:updated', onMessageUpdated);
    websocketClient.on('user:online', onUserOnline);
    websocketClient.on('user:offline', onUserOffline);
    websocketClient.on('conversation:participant_added', onParticipantAdded);
    websocketClient.on('conversation:participant_removed', onParticipantRemoved);
    websocketClient.on('conversation:updated', onConversationUpdated);
    websocketClient.on('message:deleted', onMessageDeleted);

    return () => {
      websocketClient.off('message:new', onMessageNew);
      websocketClient.off('message:updated', onMessageUpdated);
      websocketClient.off('user:online', onUserOnline);
      websocketClient.off('user:offline', onUserOffline);
      websocketClient.off('conversation:participant_added', onParticipantAdded);
      websocketClient.off('conversation:participant_removed', onParticipantRemoved);
      websocketClient.off('conversation:updated', onConversationUpdated);
      websocketClient.off('message:deleted', onMessageDeleted);
      setActiveConversationId(null);
      const active = selectedConversationRef.current?._id;
      if (active) websocketClient.leaveConversation(active);
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

  // WebSocket setup moved to global ChatContext

  const updateConversationWithNewMessage = (newMessage: Message) => {
    setConversations(prev => {
      const senderId = typeof newMessage.sender === 'string' ? newMessage.sender : newMessage.sender?._id;
      const isOwnMessage = senderId === user?._id;

      const updated = prev.map(conv => {
        if (conv._id === newMessage.conversation) {
          const shouldIncrementUnread = !isOwnMessage && (!selectedConversationRef.current || selectedConversationRef.current._id !== conv._id);
          return {
            ...conv,
            lastMessage: newMessage,
            updatedAt: newMessage.createdAt,
            unreadCount: shouldIncrementUnread ? (conv.unreadCount || 0) + 1 : (conv.unreadCount || 0),
          };
        }
        return conv;
      });

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

      // Fetch unread counts per conversation and attach
      const convsWithUnread = await Promise.all(
        sortedConvs.map(async (c) => {
          try {
            const { count } = await apiClient.getUnreadCount(c._id);
            return { ...c, unreadCount: count } as Conversation;
          } catch (err) {
            console.error('Failed to get unread count for conversation', c._id, err);
            return { ...c, unreadCount: c.unreadCount || 0 } as Conversation;
          }
        })
      );

      setConversations(convsWithUnread);

      // Auto-select first conversation
      if (convsWithUnread.length > 0 && !selectedConversation) {
        selectConversation(convsWithUnread[0]);
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
      setActiveConversationId(conversation._id);
      
      // Join new conversation room via WebSocket
      websocketClient.joinConversation(conversation._id);
      console.log('🔗 Joined conversation room:', conversation._id);
      
      // Load messages once via API
      await loadMessages(conversation._id);
      // Clear unread for this conversation locally
      setConversations(prev => prev.map(c => c._id === conversation._id ? { ...c, unreadCount: 0 } : c));

      // Mark conversation as read on backend
      try {
        await apiClient.markConversationAsRead(conversation._id);
      } catch (err) {
        console.error('Failed to mark conversation as read', err);
      }

    } catch (error) {
      console.error('Error selecting conversation:', error);
      setMessages([]);
    }
  };

  // Reconnect handled by global ChatContext auto-reconnect

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
        sender: user!,
        content: messageContent,
        messageType: 'text',
        readBy: [],
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

  const handleDeleteMessage = async (messageId: string) => {
    try {
      // Optimistically remove the message
      setMessages(prev => prev.filter(m => m._id !== messageId));
      await apiClient.deleteMessage(messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
      // Reload messages if deletion failed
      if (selectedConversation) {
        await loadMessages(selectedConversation._id);
      }
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
        title: channelData.name,
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
      
    } catch (error: unknown) {
      console.error('Error creating channel:', error);
      
      const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
      let errorMessage = "Failed to create channel";
      if (axiosError?.response?.data?.message) {
        errorMessage = axiosError.response.data.message;
      } else if (axiosError?.message) {
        errorMessage = axiosError.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleSelectMember = async (member: { id: string; name: string }) => {
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
      
    } catch (error: unknown) {
      console.error('Error starting conversation:', error);
      
      const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
      let errorMessage = "Failed to start conversation";
      if (axiosError?.response?.data?.message) {
        errorMessage = axiosError.response.data.message;
      } else if (axiosError?.message) {
        errorMessage = axiosError.message;
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
    const displayName = conv.name || (conv as { title?: string }).title;
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
              <div className="flex items-center gap-2">
                <span className="relative">
                  Messages
                </span>
                <div className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} title={wsConnected ? 'Connected' : 'Disconnected'} />
              </div>
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
                {/* Connection status is shown as dot; reconnect handled globally */}
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
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-2">
                          <span className="truncate">
                            {conv.lastMessage?.content || `${conv.participants.length} participant${conv.participants.length !== 1 ? 's' : ''}`}
                          </span>
                          {(() => { const badgeCount = (unreadByConversation[conv._id] ?? conv.unreadCount ?? 0); return badgeCount > 0; })() && (
                            <span className="ml-auto inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] px-1.5 py-0.5 flex-shrink-0">
                              {(unreadByConversation[conv._id] ?? conv.unreadCount ?? 0)}
                            </span>
                          )}
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
              <CardHeader className="border-b pb-3 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
                <div className="flex items-center justify-between">
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

                  {/* Group Info Button (for group and project chats) */}
                  {(selectedConversation.type === 'group' || selectedConversation.type === 'project') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setGroupInfoOpen(true)}
                    >
                      <Info className="h-4 w-4 mr-1.5" />
                      <span className="hidden sm:inline">Info</span>
                    </Button>
                  )}
                  {/* Delete Conversation - admin only, non-direct chats */}
                  {(user?.role?.toLowerCase() === 'admin' && (selectedConversation.type === 'group' || selectedConversation.type === 'project')) && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleDeleteConversation}
                      title="Delete conversation"
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  )}
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
                          className={`group flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
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
                              {/* Message delete hidden in admin UI */}
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

      {/* Group Info Dialog */}
      {selectedConversation && (selectedConversation.type === 'group' || selectedConversation.type === 'project') && (
        <GroupInfoDialog
          open={groupInfoOpen}
          onOpenChange={setGroupInfoOpen}
          conversation={selectedConversation}
          onUpdate={loadConversations}
        />
      )}
    </DashboardLayout>
  );
}
