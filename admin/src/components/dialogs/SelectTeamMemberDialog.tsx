import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { apiClient, User as ApiUser } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface TeamMember {
  id: string;
  name: string;
  status: "online" | "away" | "offline";
  role: string;
  department: string;
  avatar?: string;
  initials: string;
}

interface SelectTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (member: TeamMember) => void;
  excludeUserIds?: string[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'online':
      return 'bg-success';
    case 'away':
      return 'bg-warning';
    case 'offline':
      return 'bg-muted';
    default:
      return 'bg-muted';
  }
};

export function SelectTeamMemberDialog({ 
  open, 
  onOpenChange, 
  onSelect,
  excludeUserIds = []
}: SelectTeamMemberDialogProps) {
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadTeamMembers();
    }
  }, [open]);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const response = await apiClient.getUsers({ limit: 100 });
      const users: ApiUser[] = response.data || [];
      
      // Filter out current user - you can't DM yourself!
      const otherUsers = users.filter(user => user?._id !== currentUser?._id);
      
      const mappedMembers: TeamMember[] = otherUsers.map(user => {
        const department: string = (typeof user.department === 'object' && user.department !== null)
          ? (user.department.name ?? 'General')
          : (user.department ?? 'General');

        return {
          id: user?._id,
          name: `${user.firstName} ${user.lastName}`,
          status: user.status === 'active' ? 'online' : 'offline',
          role: user.role?.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Member',
          department,
          avatar: user.avatar,
          initials: `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase(),
        };
      });
      
      setTeamMembers(mappedMembers);
    } catch (error) {
      console.error('Error loading team members:', error);
      setTeamMembers([]);
      let message = 'Failed to load team members';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
        if (axiosError.response?.data?.message) {
          message = axiosError.response.data.message;
        } else if (axiosError.message) {
          message = axiosError.message;
        }
      } else if (error instanceof Error && error.message) {
        message = error.message;
      }
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = teamMembers.filter(member =>
    !excludeUserIds.includes(member.id) && // Exclude specified users
    (member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectMember = (member: TeamMember) => {
    onSelect(member);
    onOpenChange(false);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start Direct Message</DialogTitle>
          <DialogDescription>
            Select a team member to start a conversation with.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {errorMessage && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{errorMessage}</p>
              <div className="mt-2">
                <Button size="sm" variant="outline" onClick={loadTeamMembers}>Retry</Button>
              </div>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading team members...</span>
              </div>
            ) : filteredMembers.map((member) => (
              <Button
                key={member.id}
                variant="ghost"
                className="w-full justify-start h-auto p-3"
                onClick={() => handleSelectMember(member)}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback>
                        {member.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background ${getStatusColor(member.status)}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{member.name}</div>
                    <div className="text-sm text-muted-foreground">{member.role}</div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {member.department}
                  </Badge>
                </div>
              </Button>
              ))}
          </div>

          {!loading && filteredMembers.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              {searchQuery ? 'No team members found matching your search' : 'No team members available'}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}