import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Save } from "lucide-react";
import { Meeting } from "@/lib/api";

interface AddNotesSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: Meeting | null;
  onSubmit: (data: { notes: string; summary: string }) => Promise<void>;
}

export function AddNotesSummaryDialog({ 
  open, 
  onOpenChange, 
  meeting,
  onSubmit 
}: AddNotesSummaryDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    notes: "",
    summary: ""
  });

  useEffect(() => {
    if (open && meeting) {
      setFormData({
        notes: meeting.notes || "",
        summary: meeting.summary || ""
      });
    }
  }, [open, meeting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await onSubmit(formData);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        notes: "",
        summary: ""
      });
    } catch (error) {
      // Error handled by parent
      console.error('Error submitting notes/summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!meeting) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Add Meeting Notes & Summary
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {meeting.title}
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <form onSubmit={handleSubmit} className="space-y-6 px-6">
            {/* Meeting Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">
                Meeting Notes
                <span className="text-xs text-muted-foreground ml-2">(max 2000 characters)</span>
              </Label>
              <Textarea
                id="notes"
                placeholder="Enter detailed notes from the meeting..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={8}
                maxLength={2000}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.notes.length} / 2000 characters
              </p>
            </div>

            {/* Meeting Summary */}
            <div className="space-y-2">
              <Label htmlFor="summary">
                Meeting Summary
                <span className="text-xs text-muted-foreground ml-2">(max 3000 characters)</span>
              </Label>
              <Textarea
                id="summary"
                placeholder="Enter a brief summary of key points, decisions, and action items..."
                value={formData.summary}
                onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                rows={10}
                maxLength={3000}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.summary.length} / 3000 characters
              </p>
            </div>

            {/* Helper Tips */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
                💡 Tips for effective meeting documentation:
              </p>
              <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>Include key discussion points and decisions made</li>
                <li>List action items with assigned owners</li>
                <li>Note any follow-up meetings or deadlines</li>
                <li>Capture important feedback or concerns raised</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
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
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Notes & Summary
                  </>
                )}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

