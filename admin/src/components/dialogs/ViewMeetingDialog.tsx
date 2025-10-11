import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, MapPin, Video, Users, FileText, Edit, Trash2 } from "lucide-react";
import { Meeting } from "@/lib/api";

interface ViewMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: Meeting | null;
  onEdit: () => void;
  onDelete: () => void;
  onAddNotes?: () => void;
  canEdit?: boolean;
}

export function ViewMeetingDialog({ open, onOpenChange, meeting, onEdit, onDelete, onAddNotes, canEdit }: ViewMeetingDialogProps) {
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!meeting) {
    return null;
  }

  // Check if meeting is in the past
  const isPast = new Date(meeting.endTime) < new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{meeting.title}</DialogTitle>
              {meeting.description && (
                <p className="text-sm text-muted-foreground">{meeting.description}</p>
              )}
            </div>
            <Badge variant="secondary" className="ml-4">
              {meeting.type.replace('-', ' ')}
            </Badge>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-medium">{formatDate(meeting.startTime)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
              <Clock className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="font-medium">{formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}</p>
              </div>
            </div>
          </div>

          {/* Location & Link */}
          <div className="space-y-3">
            {meeting.location && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-medium">{meeting.location}</p>
                </div>
              </div>
            )}
            
            {meeting.meetingLink && (
              <div className="flex items-center justify-between gap-3 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <Video className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Meeting Link</p>
                    <a 
                      href={meeting.meetingLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline truncate block max-w-xs"
                    >
                      {meeting.meetingLink}
                    </a>
                  </div>
                </div>
                <Button 
                  variant="default" 
                  size="sm" 
                  asChild
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"
                >
                  <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer">
                    Join Now
                  </a>
                </Button>
              </div>
            )}
          </div>

          {/* Participants */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">
                Participants ({meeting.participants.length})
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {meeting.participants.map((participant) => (
                <div 
                  key={participant._id} 
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={participant.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                      {participant.firstName[0]}{participant.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {participant.firstName} {participant.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {participant.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Organizer */}
          {meeting.organizer && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">Organizer</h3>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={meeting.organizer.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                    {meeting.organizer.firstName[0]}{meeting.organizer.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">
                    {meeting.organizer.firstName} {meeting.organizer.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{meeting.organizer.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Agenda */}
          {meeting.agenda && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">Agenda</h3>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm whitespace-pre-wrap">{meeting.agenda}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          {meeting.notes && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">Notes</h3>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm whitespace-pre-wrap">{meeting.notes}</p>
              </div>
            </div>
          )}

          {/* Summary */}
          {meeting.summary && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">Summary</h3>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30 border border-green-200 dark:border-green-800">
                <p className="text-sm whitespace-pre-wrap">{meeting.summary}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between px-6 py-4 border-t bg-background">
          {!isPast && canEdit && (
            <Button 
              variant="destructive" 
              onClick={() => {
                onDelete();
                onOpenChange(false);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Meeting
            </Button>
          )}
          
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {!isPast && canEdit && (
              <Button 
                onClick={() => {
                  onEdit();
                  onOpenChange(false);
                }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Meeting
              </Button>
            )}
            {isPast && canEdit && !meeting.notes && onAddNotes && (
              <Button 
                onClick={() => {
                  onAddNotes();
                  onOpenChange(false);
                }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"
              >
                <FileText className="h-4 w-4 mr-2" />
                Add Notes
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

