import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Loader2, Clock, Users, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Meeting, User } from "@/lib/api";

interface EditMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: Meeting | null;
  onSubmit: (meetingData: {
    title: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    type: string;
    location: string;
    meetingLink: string;
    participants: string[];
    agenda: string;
  }) => Promise<void>;
}

// Generate time options
const generateTimeOptions = () => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const hourStr = hour.toString().padStart(2, '0');
      const minuteStr = minute.toString().padStart(2, '0');
      const time24 = `${hourStr}:${minuteStr}`;
      
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const time12 = `${hour12}:${minuteStr} ${ampm}`;
      
      times.push({ value: time24, label: time12 });
    }
  }
  return times;
};

export function EditMeetingDialog({ open, onOpenChange, meeting, onSubmit }: EditMeetingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    type: "",
    location: "",
    meetingLink: "",
    agenda: "",
    participants: [] as string[],
  });

  const timeOptions = generateTimeOptions();

  useEffect(() => {
    if (open && meeting) {
      const startDate = new Date(meeting.startTime);
      const endDate = new Date(meeting.endTime);
      
      setFormData({
        title: meeting.title || "",
        description: meeting.description || "",
        date: startDate.toISOString().split('T')[0],
        startTime: startDate.toTimeString().slice(0, 5), // HH:MM
        endTime: endDate.toTimeString().slice(0, 5), // HH:MM
        type: meeting.type || "team-meeting",
        location: meeting.location || "",
        meetingLink: meeting.meetingLink || "",
        agenda: meeting.agenda || "",
        participants: meeting.participants?.map(p => p._id) || [],
      });
      setErrors({});
    }
  }, [open, meeting]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Meeting title is required";
    }
    
    if (!formData.date) {
      newErrors.date = "Date is required";
    }
    
    if (!formData.startTime) {
      newErrors.startTime = "Start time is required";
    }
    
    if (!formData.endTime) {
      newErrors.endTime = "End time is required";
    }
    
    // Validate end time is after start time
    if (formData.startTime && formData.endTime) {
      const [startHour, startMin] = formData.startTime.split(':').map(Number);
      const [endHour, endMin] = formData.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      if (endMinutes <= startMinutes) {
        newErrors.endTime = "End time must be after start time";
      }
    }
    
    if (!formData.type) {
      newErrors.type = "Meeting type is required";
    }
    
    if (!formData.meetingLink.trim()) {
      newErrors.meetingLink = "Meeting link is required";
    } else {
      try {
        new URL(formData.meetingLink);
      } catch {
        newErrors.meetingLink = "Please enter a valid URL";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setErrors({});
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      // Create date objects
      const [startHour, startMin] = formData.startTime.split(':');
      const [endHour, endMin] = formData.endTime.split(':');
      
      const startDateTime = new Date(formData.date);
      startDateTime.setHours(parseInt(startHour), parseInt(startMin), 0, 0);
      
      const endDateTime = new Date(formData.date);
      endDateTime.setHours(parseInt(endHour), parseInt(endMin), 0, 0);
      
      await onSubmit({
        title: formData.title,
        description: formData.description,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        type: formData.type,
        location: formData.location,
        meetingLink: formData.meetingLink,
        participants: formData.participants,
        agenda: formData.agenda,
      });
      
      onOpenChange(false);
      
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (!meeting) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Edit className="h-5 w-5" />
            Edit Meeting
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <div className="space-y-4 px-6 pb-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Meeting Title *</Label>
              <Input
                id="title"
                placeholder="Weekly Team Standup"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                className={errors.title ? "border-destructive" : ""}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange("date", e.target.value)}
                className={errors.date ? "border-destructive" : ""}
              />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date}</p>
              )}
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Start Time *
                </Label>
                <Select 
                  value={formData.startTime} 
                  onValueChange={(value) => handleInputChange("startTime", value)}
                >
                  <SelectTrigger className={errors.startTime ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select start time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {timeOptions.map((time) => (
                      <SelectItem key={time.value} value={time.value}>
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.startTime && (
                  <p className="text-sm text-destructive">{errors.startTime}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endTime" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  End Time *
                </Label>
                <Select 
                  value={formData.endTime} 
                  onValueChange={(value) => handleInputChange("endTime", value)}
                >
                  <SelectTrigger className={errors.endTime ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select end time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {timeOptions.map((time) => (
                      <SelectItem key={time.value} value={time.value}>
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.endTime && (
                  <p className="text-sm text-destructive">{errors.endTime}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Meeting description..."
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Meeting Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Meeting Type *</Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)}>
                <SelectTrigger className={errors.type ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team-meeting">Team Meeting</SelectItem>
                  <SelectItem value="one-on-one">One-on-One</SelectItem>
                  <SelectItem value="project-review">Project Review</SelectItem>
                  <SelectItem value="standup">Standup</SelectItem>
                  <SelectItem value="retrospective">Retrospective</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type}</p>
              )}
            </div>

            {/* Participants */}
            {meeting?.participants && meeting.participants.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Participants ({formData.participants.length})
                </Label>
                <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/20">
                  {meeting.participants.map((participant) => (
                    <Badge
                      key={participant._id}
                      variant={formData.participants.includes(participant._id) ? "default" : "secondary"}
                      className="flex items-center gap-1 cursor-pointer"
                      onClick={() => {
                        const newParticipants = formData.participants.includes(participant._id)
                          ? formData.participants.filter(id => id !== participant._id)
                          : [...formData.participants, participant._id];
                        setFormData(prev => ({ ...prev, participants: newParticipants }));
                      }}
                    >
                      {participant.firstName} {participant.lastName}
                      {formData.participants.includes(participant._id) && (
                        <X className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Click on participants to toggle their inclusion in the meeting
                </p>
              </div>
            )}

            {/* Location and Meeting Link */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Conference Room A"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meetingLink">Meeting Link *</Label>
                <Input
                  id="meetingLink"
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={formData.meetingLink}
                  onChange={(e) => handleInputChange("meetingLink", e.target.value)}
                  className={errors.meetingLink ? "border-destructive" : ""}
                />
                {errors.meetingLink && (
                  <p className="text-sm text-destructive">{errors.meetingLink}</p>
                )}
              </div>
            </div>

            {/* Agenda */}
            <div className="space-y-2">
              <Label htmlFor="agenda">Agenda</Label>
              <Textarea
                id="agenda"
                placeholder="Meeting agenda and topics to discuss..."
                value={formData.agenda}
                onChange={(e) => handleInputChange("agenda", e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Meeting"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
