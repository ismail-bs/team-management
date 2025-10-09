import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar as CalendarIcon, Clock, Users, Video, Plus, Loader2, MapPin } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { AddMeetingDialog } from "@/components/dialogs/AddMeetingDialog";
import { ViewMeetingDialog } from "@/components/dialogs/ViewMeetingDialog";
import { EditMeetingDialog } from "@/components/dialogs/EditMeetingDialog";
import { toast } from "@/hooks/use-toast";
import { apiClient, Meeting } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function Meetings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [addMeetingOpen, setAddMeetingOpen] = useState(false);
  const [viewMeetingOpen, setViewMeetingOpen] = useState(false);
  const [editMeetingOpen, setEditMeetingOpen] = useState(false);

  // Load meetings
  const loadMeetings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getMeetings({ limit: 100 });
      setMeetings(response.data || []);
    } catch (error) {
      console.error('Failed to load meetings:', error);
      toast({
        title: "Error",
        description: "Failed to load meetings",
        variant: "destructive"
      });
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadMeetings();
    }
  }, [user]);

  // Handle add meeting
  const handleAddMeeting = async (meetingData: any) => {
    try {
      // Parse time range (e.g., "14:00 - 15:00")
      const timeParts = meetingData.time.split(' - ');
      const startTimeStr = timeParts[0] || '09:00';
      const endTimeStr = timeParts[1] || '10:00';
      
      // Create date objects in local timezone
      const [startHour, startMin] = startTimeStr.split(':');
      const [endHour, endMin] = endTimeStr.split(':');
      
      const startDateTime = new Date(meetingData.date);
      startDateTime.setHours(parseInt(startHour), parseInt(startMin), 0, 0);
      
      const endDateTime = new Date(meetingData.date);
      endDateTime.setHours(parseInt(endHour), parseInt(endMin), 0, 0);

      await apiClient.createMeeting({
        title: meetingData.title,
        description: meetingData.description,
        type: meetingData.type,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        location: meetingData.location,
        meetingLink: meetingData.meetingLink,
        participants: user ? [user._id] : [],
        agenda: meetingData.agenda,
        isRecurring: meetingData.isRecurring,
        recurringFrequency: meetingData.isRecurring ? meetingData.recurringFrequency : undefined,
        recurringEndDate: meetingData.isRecurring && meetingData.recurringEndDate 
          ? new Date(meetingData.recurringEndDate).toISOString() 
          : undefined,
      });
      
      // Only show toast on API success
      toast({
        title: "Success",
        description: "Meeting created successfully",
      });
      
      // Reload meetings
      await loadMeetings();
      
    } catch (err) {
      // Only show toast for API errors
      console.error('API error creating meeting:', err);
      toast({
        title: "API Error",
        description: err instanceof Error ? err.message : "Failed to create meeting",
        variant: "destructive",
      });
      // Re-throw so dialog knows to stay open
      throw err;
    }
  };

  // Handle update meeting
  const handleUpdateMeeting = async (meetingData: any) => {
    if (!selectedMeeting) return;
    
    try {
      await apiClient.updateMeeting(selectedMeeting._id, meetingData);
      
      toast({
        title: "Success",
        description: "Meeting updated successfully",
      });
      
      await loadMeetings();
      
    } catch (err) {
      console.error('API error updating meeting:', err);
      toast({
        title: "API Error",
        description: err instanceof Error ? err.message : "Failed to update meeting",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Handle delete meeting
  const handleDeleteMeeting = async () => {
    if (!selectedMeeting) return;
    
    if (!confirm('Are you sure you want to delete this meeting? This action cannot be undone.')) {
      return;
    }
    
    try {
      await apiClient.deleteMeeting(selectedMeeting._id);
      
      toast({
        title: "Success",
        description: "Meeting deleted successfully",
      });
      
      await loadMeetings();
      setViewMeetingOpen(false);
      setSelectedMeeting(null);
      
    } catch (err) {
      console.error('API error deleting meeting:', err);
      toast({
        title: "API Error",
        description: err instanceof Error ? err.message : "Failed to delete meeting",
        variant: "destructive",
      });
    }
  };

  // Filter meetings by date
  const upcomingMeetings = meetings
    .filter(m => new Date(m.startTime) >= new Date())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  
  const pastMeetings = meetings
    .filter(m => new Date(m.startTime) < new Date())
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  // Get meetings for selected date
  const selectedDateMeetings = selectedDate 
    ? meetings.filter(m => {
        const meetingDate = new Date(m.startTime);
        return meetingDate.toDateString() === selectedDate.toDateString();
      })
    : [];

  // Get all meeting dates for calendar highlighting
  const meetingDates = new Set(
    meetings.map(m => new Date(m.startTime).toDateString())
  );

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading meetings...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Meetings</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Schedule and manage team meetings
            </p>
          </div>
          <Button 
            onClick={() => setAddMeetingOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Schedule Meeting
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold text-blue-600">{upcomingMeetings.length}</div>
              <p className="text-xs md:text-sm text-muted-foreground">Upcoming</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold text-green-600">{pastMeetings.length}</div>
              <p className="text-xs md:text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold text-orange-600">{meetings.length}</div>
              <p className="text-xs md:text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold text-purple-600">{selectedDateMeetings.length}</div>
              <p className="text-xs md:text-sm text-muted-foreground">Today</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-blue-600" />
                Meeting Calendar
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-lg border"
                modifiers={{
                  meeting: (date) => meetingDates.has(date.toDateString()),
                }}
                modifiersClassNames={{
                  meeting: "bg-blue-100 dark:bg-blue-900 font-bold",
                }}
              />
              
              {selectedDate && (
                <div className="mt-4 w-full space-y-2">
                  <h4 className="font-semibold text-sm">
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long',
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h4>
                  
                  {selectedDateMeetings.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedDateMeetings.map((meeting) => (
                        <div 
                          key={meeting._id} 
                          className="p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border border-blue-200 dark:border-blue-800"
                        >
                          <p className="font-medium text-sm">{meeting.title}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Users className="h-3 w-3" />
                            <span>{meeting.participants.length} participants</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No meetings scheduled
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meetings List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold">Upcoming Meetings</h2>
            
            {upcomingMeetings.length > 0 ? (
              <div className="space-y-4">
                {upcomingMeetings.map((meeting) => (
                  <Card key={meeting._id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">{meeting.title}</CardTitle>
                          {meeting.description && (
                            <p className="text-sm text-muted-foreground">{meeting.description}</p>
                          )}
                        </div>
                        <Badge variant="secondary">{meeting.type.replace('-', ' ')}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Time & Location */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <span>{new Date(meeting.startTime).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}</span>
                        </div>
                        {meeting.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{meeting.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Participants */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {meeting.participants.length} Participant{meeting.participants.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex -space-x-2">
                          {meeting.participants.slice(0, 5).map((participant) => (
                            <Avatar key={participant._id} className="h-8 w-8 border-2 border-background">
                              <AvatarImage src={participant.avatar} />
                              <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                                {participant.firstName[0]}{participant.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {meeting.participants.length > 5 && (
                            <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs">
                              +{meeting.participants.length - 5}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {meeting.meetingLink && (
                          <Button 
                            variant="default" 
                            size="sm" 
                            asChild
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"
                          >
                            <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer">
                              <Video className="h-4 w-4 mr-2" />
                              Join Meeting
                            </a>
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedMeeting(meeting);
                            setViewMeetingOpen(true);
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <CalendarIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">No upcoming meetings</p>
                  <p className="text-muted-foreground mb-6">
                    Schedule your first meeting to get started
                  </p>
                  <Button onClick={() => setAddMeetingOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Meeting
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Past Meetings */}
            {pastMeetings.length > 0 && (
              <>
                <h2 className="text-lg font-semibold mt-8">Past Meetings</h2>
                <div className="space-y-4">
                  {pastMeetings.slice(0, 3).map((meeting) => (
                    <Card key={meeting._id} className="opacity-75">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base mb-1">{meeting.title}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {new Date(meeting.startTime).toLocaleDateString()} • {formatTime(meeting.startTime)}
                            </p>
                          </div>
                          <Badge variant="secondary">Completed</Badge>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Dialogs */}
        <AddMeetingDialog 
          open={addMeetingOpen} 
          onOpenChange={setAddMeetingOpen} 
          onSubmit={handleAddMeeting} 
          type="upcoming" 
        />
        
        {selectedMeeting && (
          <>
            <ViewMeetingDialog
              open={viewMeetingOpen}
              onOpenChange={setViewMeetingOpen}
              meeting={selectedMeeting}
              onEdit={() => {
                setViewMeetingOpen(false);
                setEditMeetingOpen(true);
              }}
              onDelete={handleDeleteMeeting}
            />
            
            <EditMeetingDialog
              open={editMeetingOpen}
              onOpenChange={setEditMeetingOpen}
              meeting={selectedMeeting}
              onUpdate={handleUpdateMeeting}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
