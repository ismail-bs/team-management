import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Calendar, Clock, MapPin, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ViewAgendaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: {
    id: string;
    title: string;
    description: string;
    date: string;
    time: string;
    type: string;
    location: string;
    teamInformation: string;
    meetingLink?: string;
  };
}

export function ViewAgendaDialog({ open, onOpenChange, meeting }: ViewAgendaDialogProps) {
  const meetingTypeColors = {
    recurring: "bg-primary text-primary-foreground",
    project: "bg-success text-success-foreground",
    external: "bg-warning text-warning-foreground"
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Team Information - {meeting.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Meeting Overview */}
          <Card className="shadow-soft">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{meeting.title}</CardTitle>
                <Badge className={meetingTypeColors[meeting.type as keyof typeof meetingTypeColors]}>
                  {meeting.type}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{meeting.description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{meeting.date}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{meeting.time}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{meeting.location}</span>
                </div>
                {meeting.meetingLink && (
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <Button variant="link" className="p-0 h-auto text-primary">
                      Join Meeting
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Team Information */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">Team Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {meeting.teamInformation}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Meeting Notes Section */}
          <Card className="shadow-soft border-dashed">
            <CardContent className="p-4 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Meeting notes will be available after the meeting
              </p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}