import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Calendar, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ViewNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: {
    id: string;
    title: string;
    date: string;
    time: string;
    attendees: number;
    notes: string;
    decisions: string[];
    attachments?: string[];
  };
}

export function ViewNotesDialog({ open, onOpenChange, meeting }: ViewNotesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Meeting Notes - {meeting.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Meeting Details */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">Meeting Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{meeting.date}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{meeting.time}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{meeting.attendees} attendees</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Meeting Notes */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">Meeting Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{meeting.notes}</p>
              </div>
            </CardContent>
          </Card>

          {/* Key Decisions */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">Key Decisions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {meeting.decisions.map((decision, index) => (
                  <li key={index} className="text-sm text-muted-foreground pl-4 relative">
                    <span className="absolute left-0 top-2 h-1 w-1 bg-primary rounded-full"></span>
                    {decision}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Attachments */}
          {meeting.attachments && meeting.attachments.length > 0 && (
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">Attachments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {meeting.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{attachment}</span>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}