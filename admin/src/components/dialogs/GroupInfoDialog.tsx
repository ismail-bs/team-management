import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Info, 
  Crown,
  Shield,
  User as UserIcon,
  AlertCircle,
  Edit3,
  Check,
  X
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiClient, Conversation, User } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { SelectTeamMemberDialog } from "./SelectTeamMemberDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GroupInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation;
  onUpdate: () => void;
}

export function GroupInfoDialog({ 
  open, 
  onOpenChange, 
  conversation,
  onUpdate 
}: GroupInfoDialogProps) {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectMemberOpen, setSelectMemberOpen] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [selectedUserToRemove, setSelectedUserToRemove] = useState<User | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(conversation.name || '');

  // Check permissions
  const isGroupChat = conversation.type === 'group';
  const isProjectChat = conversation.type === 'project';
  const isCreator = conversation.createdBy?._id === currentUser?._id;
  const isAdmin = currentUser?.role === 'admin';
  
  // For project chats, check if user is project manager
  const isProjectManager = isProjectChat && conversation.project?.projectManager === currentUser?._id;
  
  // Determine if user can manage participants
  const canManageParticipants = isGroupChat 
    ? (isCreator || isAdmin)
    : isProjectChat 
      ? (isAdmin || isProjectManager)
      : false;

  // Determine if user can edit conversation name (only admins for now)
  const canEditName = isAdmin;

  // Update edited name when conversation changes
  useEffect(() => {
    setEditedName(conversation.name || '');
  }, [conversation.name]);

  const handleAddMember = async (member: any) => {
    try {
      setLoading(true);
      await apiClient.addConversationParticipant(conversation._id, member.id);
      
      toast({
        title: "Success",
        description: `${member.name} added to the conversation`,
      });
      
      setSelectMemberOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error adding participant:', error);
      
      let errorMessage = "Failed to add participant";
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedUserToRemove) return;
    
    try {
      setLoading(true);
      await apiClient.removeConversationParticipant(
        conversation._id,
        selectedUserToRemove._id
      );
      
      toast({
        title: "Success",
        description: `${selectedUserToRemove.firstName} ${selectedUserToRemove.lastName} removed from the conversation`,
      });
      
      setRemoveConfirmOpen(false);
      setSelectedUserToRemove(null);
      onUpdate();
    } catch (error) {
      console.error('Error removing participant:', error);
      
      let errorMessage = "Failed to remove participant";
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditName = () => {
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      toast({
        title: "Error",
        description: "Conversation name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    if (editedName.trim() === conversation.name) {
      setIsEditingName(false);
      return;
    }

    try {
      setLoading(true);
      await apiClient.updateConversation(conversation._id, {
        title: editedName.trim()
      });
      
      toast({
        title: "Success",
        description: "Conversation name updated successfully",
      });
      
      setIsEditingName(false);
      // Note: No need to call onUpdate() as WebSocket event will update automatically
    } catch (error) {
      console.error('Error updating conversation name:', error);
      
      let errorMessage = "Failed to update conversation name";
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedName(conversation.name || '');
    setIsEditingName(false);
  };

  const getRoleIcon = (participant: User) => {
    if (participant._id === conversation.createdBy?._id) {
      return <Crown className="h-3.5 w-3.5 text-yellow-600" />;
    }
    if (participant.role === 'admin') {
      return <Shield className="h-3.5 w-3.5 text-blue-600" />;
    }
    return <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const getRoleBadge = (participant: User) => {
    if (participant._id === conversation.createdBy?._id) {
      return <Badge variant="default" className="bg-yellow-600 text-white text-xs">Creator</Badge>;
    }
    if (isProjectChat && conversation.project?.projectManager === participant._id) {
      return <Badge variant="default" className="bg-blue-600 text-white text-xs">PM</Badge>;
    }
    if (participant.role === 'admin') {
      return <Badge variant="default" className="bg-purple-600 text-white text-xs">Admin</Badge>;
    }
    return null;
  };

  // Filter out existing participants from the add member dialog
  const existingParticipantIds = conversation.participants?.map(p => p._id) || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              {isGroupChat ? 'Group Info' : isProjectChat ? 'Project Chat Info' : 'Conversation Info'}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
            <div className="space-y-6">
              {/* Conversation Details */}
              <div className="space-y-3">
                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {isEditingName ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            placeholder="Enter conversation name"
                            className="flex-1"
                            disabled={loading}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveName();
                              } else if (e.key === 'Escape') {
                                handleCancelEdit();
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleSaveName}
                            disabled={loading || !editedName.trim()}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            disabled={loading}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-1">
                          <h3 className="font-semibold text-lg flex-1">
                            {conversation.name || 'Unnamed Conversation'}
                          </h3>
                          {canEditName && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleEditName}
                              disabled={loading}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    {conversation.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {conversation.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {conversation.type}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {conversation.participants?.length || 0} members
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Participants Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Participants ({conversation.participants?.length || 0})
                  </h4>
                  {canManageParticipants && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectMemberOpen(true)}
                      disabled={loading}
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                      Add Member
                    </Button>
                  )}
                </div>

                {/* Participants List */}
                <div className="space-y-2">
                  {conversation.participants?.map((participant) => (
                    <div
                      key={participant._id}
                      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={participant.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                          {participant.firstName?.[0] || 'U'}{participant.lastName?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
                            {participant.firstName || 'Unknown'} {participant.lastName || 'User'}
                            {participant._id === currentUser?._id && (
                              <span className="text-muted-foreground ml-1">(You)</span>
                            )}
                          </p>
                          {getRoleIcon(participant)}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {participant.email || 'No email'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {getRoleBadge(participant)}
                        
                        {canManageParticipants && 
                         participant._id !== currentUser?._id && 
                         participant._id !== conversation.createdBy?._id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setSelectedUserToRemove(participant);
                              setRemoveConfirmOpen(true);
                            }}
                            disabled={loading}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Authorization Info */}
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-xs text-blue-900 dark:text-blue-100">
                      {isGroupChat && (
                        <p>
                          <strong>Group Chat:</strong> Only the creator or admin can add/remove members.
                        </p>
                      )}
                      {isProjectChat && (
                        <p>
                          <strong>Project Chat:</strong> Only admin or project manager can add/remove members.
                        </p>
                      )}
                      {canEditName && (
                        <p className="mt-1">
                          <strong>Edit Name:</strong> Admins can edit conversation names.
                        </p>
                      )}
                      {!canManageParticipants && !canEditName && (
                        <p className="mt-1 text-muted-foreground">
                          You don't have permission to manage this conversation.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <SelectTeamMemberDialog
        open={selectMemberOpen}
        onOpenChange={setSelectMemberOpen}
        onSelect={handleAddMember}
        excludeUserIds={existingParticipantIds}
      />

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Participant?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <strong>
                {selectedUserToRemove?.firstName} {selectedUserToRemove?.lastName}
              </strong>{' '}
              from this conversation? They will no longer have access to the messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedUserToRemove(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Remove Participant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

