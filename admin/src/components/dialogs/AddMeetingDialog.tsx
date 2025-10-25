import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, Repeat, Loader2, Clock, Users as UsersIcon, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiClient, User as ApiUser } from "@/lib/api";

interface MeetingFormData {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  location: string;
  meetingLink: string;
  agenda: string;
  participants: string[];
  isRecurring: boolean;
  recurringFrequency?: string;
  recurringEndDate?: string;
}

interface AddMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (meetingData: MeetingFormData) => Promise<void>;
}

// Generate time options (00:00 to 23:30 in 30-minute intervals)
const generateTimeOptions = () => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const hourStr = hour?.toString().padStart(2, '0');
      const minuteStr = minute?.toString().padStart(2, '0');
      const time24 = `${hourStr}:${minuteStr}`;
      
      // Convert to 12-hour format for display
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const time12 = `${hour12}:${minuteStr} ${ampm}`;
      
      times.push({ value: time24, label: time12 });
    }
  }
  return times;
};

export function AddMeetingDialog({ open, onOpenChange, onSubmit }: AddMeetingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [teamMembers, setTeamMembers] = useState<ApiUser[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    type: "team-meeting",
    location: "",
    meetingLink: "",
    agenda: "",
    isRecurring: false,
    recurringFrequency: "",
    recurringEndDate: ""
  });

  const timeOptions = generateTimeOptions();

  useEffect(() => {
    if (open) {
      loadTeamMembers();
    }
  }, [open]);

  const loadTeamMembers = async () => {
    try {
      const response = await apiClient.getUsers({ limit: 100 });
      setTeamMembers(response.data || []);
    } catch (error) {
      console.error('Failed to load team members:', error);
    }
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const removeParticipant = (userId: string) => {
    setSelectedParticipants(prev => prev.filter(id => id !== userId));
  };

  const getSelectedParticipantDetails = () => {
    return teamMembers.filter(member => selectedParticipants.includes(member?._id));
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      date: "",
      startTime: "",
      endTime: "",
      type: "team-meeting",
      location: "",
      meetingLink: "",
      agenda: "",
      isRecurring: false,
      recurringFrequency: "",
      recurringEndDate: ""
    });
    setSelectedParticipants([]);
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required field validation
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
    
    // Validate meeting is not in the past
    if (formData.date && formData.startTime) {
      const [startHour, startMin] = formData.startTime.split(':').map(Number);
      const meetingDateTime = new Date(formData.date);
      meetingDateTime.setHours(startHour, startMin, 0, 0);
      
      const now = new Date();
      if (meetingDateTime < now) {
        newErrors.startTime = "Meeting time cannot be in the past";
      }
    }
    
    if (!formData.type) {
      newErrors.type = "Meeting type is required";
    }
    
    // Participants validation
    if (selectedParticipants.length === 0) {
      newErrors.participants = "At least one participant is required";
    }

    // Meeting link validation - OPTIONAL but validate format if provided
    if (formData.meetingLink.trim()) {
      // Validate URL format only if provided
      try {
        new URL(formData.meetingLink);
      } catch {
        newErrors.meetingLink = "Please enter a valid URL (e.g., https://zoom.us/j/123...)";
      }
    }

    // Recurring validation
    if (formData.isRecurring && !formData.recurringFrequency) {
      newErrors.recurringFrequency = "Frequency is required for recurring meetings";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.MouseEvent<HTMLButtonElement> | React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Clear previous errors
    setErrors({});
    
    // Validate form
    if (!validateForm()) {
      return; // Don't close modal, show inline errors
    }

    try {
      setLoading(true);
      
      // Convert separate start/end times and include participants
      const meetingDataWithTime = {
        ...formData,
        participants: selectedParticipants,
      };
      
      // Call parent's onSubmit (this will throw on API error)
      await onSubmit(meetingDataWithTime);
      
      // Only close and reset on success (if no error thrown)
      onOpenChange(false);
      resetForm();
      
    } catch (error) {
      // API error already handled by parent with toast
      // Modal stays open so user can retry
      console.error('Meeting creation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Calendar className="h-5 w-5" />
            Schedule New Meeting
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

            {/* Time Range - Start and End */}
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
                <Label htmlFor="meetingLink">Meeting Link</Label>
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

            {/* Participants Section */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-base">
                  <UsersIcon className="h-4 w-4" />
                  Participants *
                </Label>
                <Badge variant="secondary">{selectedParticipants.length} selected</Badge>
              </div>

              {errors.participants && (
                <p className="text-sm text-destructive">{errors.participants}</p>
              )}

              {/* Selected Participants Pills */}
              {selectedParticipants.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
                  {getSelectedParticipantDetails().map((participant) => (
                    <Badge
                      key={participant?._id}
                      variant="default"
                      className="pl-2 pr-1 py-1 gap-2"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={participant.avatar} alt={participant.firstName} />
                        <AvatarFallback className="text-xs">
                          {participant.firstName[0]}{participant.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">
                        {participant.firstName} {participant.lastName}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeParticipant(participant?._id)}
                        className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Available Participants List */}
              <div className="border rounded-lg">
                <ScrollArea className="h-40">
                  <div className="p-2 space-y-1">
                    {teamMembers.length > 0 ? (
                      teamMembers.map((member) => (
                        <div
                          key={member?._id}
                          className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                          onClick={() => toggleParticipant(member?._id)}
                        >
                          <Checkbox
                            checked={selectedParticipants.includes(member?._id)}
                            onCheckedChange={() => toggleParticipant(member?._id)}
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatar} alt={member.firstName} />
                            <AvatarFallback>
                              {member.firstName[0]}{member.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.firstName} {member.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {member.email}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {member.role}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No team members available
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Recurring Meeting Options */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, isRecurring: checked === true }))
                  }
                />
                <Label htmlFor="isRecurring" className="flex items-center gap-2 cursor-pointer text-sm">
                  <Repeat className="h-4 w-4" />
                  Make this a recurring meeting
                </Label>
              </div>

              {formData.isRecurring && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                  <div className="space-y-2">
                    <Label htmlFor="recurringFrequency" className="text-sm">Frequency *</Label>
                    <Select 
                      value={formData.recurringFrequency} 
                      onValueChange={(value) => handleInputChange("recurringFrequency", value)}
                    >
                      <SelectTrigger className={errors.recurringFrequency ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.recurringFrequency && (
                      <p className="text-sm text-destructive">{errors.recurringFrequency}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recurringEndDate" className="text-sm">Repeat Until (Optional)</Label>
                    <Input
                      id="recurringEndDate"
                      type="date"
                      value={formData.recurringEndDate}
                      onChange={(e) => handleInputChange("recurringEndDate", e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer - Always Visible */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => {
              onOpenChange(false);
              resetForm();
            }}
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
                Creating...
              </>
            ) : (
              "Add Meeting"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
