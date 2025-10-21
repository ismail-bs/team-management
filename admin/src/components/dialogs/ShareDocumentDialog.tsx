import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Share2, Loader2 } from "lucide-react";
import { apiClient, User as ApiUser } from "@/lib/api";
import { toast } from "sonner";

interface ShareDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentName: string;
  currentlySharedWith: string[];
  onShare: (userIds: string[]) => Promise<void>;
}

export function ShareDocumentDialog({ 
  open, 
  onOpenChange, 
  documentId,
  documentName,
  currentlySharedWith,
  onShare 
}: ShareDocumentDialogProps) {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (open) {
      loadUsers();
      setSelectedUserIds(currentlySharedWith);
    }
  }, [open, currentlySharedWith]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await apiClient.getUsers({ limit: 100 });
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onShare(selectedUserIds);
      onOpenChange(false);
    } catch (error) {
      // Error already handled in parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share "{documentName}"
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Select team members to share with:</Label>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto border rounded-lg p-4 space-y-3">
                {users.map(user => (
                  <div key={user?._id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`user-${user?._id}`}
                      checked={selectedUserIds.includes(user?._id)}
                      onCheckedChange={() => handleToggleUser(user?._id)}
                    />
                    <Label 
                      htmlFor={`user-${user?._id}`} 
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {typeof user.department === 'object' && user.department?.name 
                            ? user.department.name 
                            : typeof user.department === 'string' 
                            ? user.department 
                            : 'No department'}
                        </span>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {selectedUserIds.length} user(s) selected
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || loadingUsers}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Share Document
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

