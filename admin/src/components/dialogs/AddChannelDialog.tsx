import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hash, Loader2 } from "lucide-react";

interface AddChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (channelData: { name: string }) => Promise<void>;
}

export function AddChannelDialog({ open, onOpenChange, onSubmit }: AddChannelDialogProps) {
  const [channelName, setChannelName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous error
    setError("");
    
    // Validate
    if (!channelName.trim()) {
      setError("Channel name is required");
      return; // Don't close modal
    }
    
    // Validate format
    const sanitizedName = channelName.toLowerCase().trim().replace(/\s+/g, '-');
    if (!/^[a-z0-9-]+$/.test(sanitizedName)) {
      setError("Channel name can only contain lowercase letters, numbers, and hyphens");
      return; // Don't close modal
    }
    
    try {
      setLoading(true);
      
      // Call parent's onSubmit
      await onSubmit({ name: sanitizedName });
      
      // Only close and reset on success
      onOpenChange(false);
      setChannelName("");
      setError("");
      
    } catch (err) {
      // Error handled by parent with toast
      // Modal stays open
      console.error('Channel creation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Hash className="h-5 w-5" />
            Create New Channel
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channelName">Channel Name *</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="channelName"
                placeholder="general"
                value={channelName}
                onChange={(e) => {
                  setChannelName(e.target.value);
                  setError(""); // Clear error when typing
                }}
                className={`pl-10 ${error ? 'border-destructive' : ''}`}
                disabled={loading}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Channel names must be lowercase with letters, numbers, and hyphens only.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                onOpenChange(false);
                setChannelName("");
                setError("");
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Channel"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
