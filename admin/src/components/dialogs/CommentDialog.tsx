import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send } from "lucide-react";

interface Comment {
  id: string;
  author: {
    name: string;
    avatar?: string;
    initials: string;
  };
  content: string;
  timestamp: string;
  isResolved?: boolean;
}

interface CommentFormData {
  challengeId: string;
  content: string;
  timestamp: string;
}

interface CommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (commentData: CommentFormData) => void;
  challengeId: string;
  challengeTitle: string;
  comments: Comment[];
}

export function CommentDialog({ open, onOpenChange, onSubmit, challengeId, challengeTitle, comments }: CommentDialogProps) {
  const [newComment, setNewComment] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onSubmit({ 
        challengeId, 
        content: newComment.trim(),
        timestamp: new Date().toISOString()
      });
      setNewComment("");
    }
  };

  const mockComments: Comment[] = [
    {
      id: "1",
      author: { name: "Alice Johnson", initials: "AJ" },
      content: "I think we should prioritize reaching out to the API provider first. It's the fastest way to get proper documentation.",
      timestamp: "2 hours ago"
    },
    {
      id: "2",
      author: { name: "Bob Smith", initials: "BS" },
      content: "Agreed, but we should also have a backup plan. I can work on the mock API implementation in parallel.",
      timestamp: "1 hour ago"
    },
    {
      id: "3",
      author: { name: "Carol Williams", initials: "CW" },
      content: "Good idea. Let's set a deadline - if we don't hear back from the provider by Thursday, we go with the mock API approach.",
      timestamp: "45 minutes ago",
      isResolved: true
    }
  ];

  const allComments = comments.length > 0 ? comments : mockComments;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Comments - {challengeTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Comments List */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {allComments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
                  <AvatarFallback className="text-xs">
                    {comment.author.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{comment.author.name}</span>
                    <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
                    {comment.isResolved && (
                      <Badge variant="secondary" className="text-xs">
                        Resolved
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Add Comment Form */}
          <div className="border-t pt-4 mt-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Press Ctrl+Enter to send
                </span>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={!newComment.trim()}
                    className="bg-gradient-primary hover:opacity-90"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}