import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar as CalendarIcon, Clock, Users, Video, Plus, Loader2, MapPin, Eye, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddMeetingDialog } from "@/components/dialogs/AddMeetingDialog";
import { ViewMeetingDialog } from "@/components/dialogs/ViewMeetingDialog";
import { EditMeetingDialog } from "@/components/dialogs/EditMeetingDialog";
import { AddNotesSummaryDialog } from "@/components/dialogs/AddNotesSummaryDialog";
import { toast } from "@/hooks/use-toast";
import { apiClient, Meeting, User } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { format, isToday, isTomorrow, isSameDay } from "date-fns";

export default function Meetings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [addMeetingOpen, setAddMeetingOpen] = useState(false);
  const [viewMeetingOpen, setViewMeetingOpen] = useState(false);
  const [editMeetingOpen, setEditMeetingOpen] = useState(false);
  const [addNotesOpen, setAddNotesOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  // Separate state for upcoming and past meetings with pagination
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [pastMeetings, setPastMeetings] = useState<Meeting[]>([]);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);
  const [upcomingTotal, setUpcomingTotal] = useState(0);
  const [pastTotal, setPastTotal] = useState(0);
  const [upcomingTotalPages, setUpcomingTotalPages] = useState(0);
  const [pastTotalPages, setPastTotalPages] = useState(0);
  const limit = 10;

  const canCreateMeeting = user?.role === 'admin' || user?.role === 'project_manager';

  // Helper functions
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Load upcoming meetings
  const loadUpcomingMeetings = async (page = 1) => {
    try {
      setLoading(true);
      const response = await apiClient.getMeetings({ 
        timeFilter: 'upcoming',
        page, 
        limit 
      });
      setUpcomingMeetings(response.data || []);
      setUpcomingTotal(response.total || 0);
      setUpcomingTotalPages(response.totalPages || 0);
    } catch (error) {
      console.error('Failed to load upcoming meetings:', error);
      toast({
        title: "Error",
        description: "Failed to load upcoming meetings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load past meetings
  const loadPastMeetings = async (page = 1) => {
    try {
      setLoading(true);
      const response = await apiClient.getMeetings({ 
        timeFilter: 'past',
        page, 
        limit 
      });
      setPastMeetings(response.data || []);
      setPastTotal(response.total || 0);
      setPastTotalPages(response.totalPages || 0);
    } catch (error) {
      console.error('Failed to load past meetings:', error);
      toast({
        title: "Error",
        description: "Failed to load past meetings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load initial data for both tabs
  useEffect(() => {
    if (user) {
      loadUpcomingMeetings(1);
      loadPastMeetings(1);
    }
  }, [user]);

  // Load upcoming meetings when page changes or tab switches to upcoming
  useEffect(() => {
    if (user && activeTab === 'upcoming') {
      loadUpcomingMeetings(upcomingPage);
    }
  }, [upcomingPage, user, activeTab]);

  // Load past meetings when page changes or tab switches to past
  useEffect(() => {
    if (user && activeTab === 'past') {
      loadPastMeetings(pastPage);
    }
  }, [pastPage, user, activeTab]);

  // Reset page to 1 when switching tabs
  useEffect(() => {
    setUpcomingPage(1);
    setPastPage(1);
  }, [activeTab]);

  // Get meetings for selected date (for calendar)
  const selectedDateMeetings = [...upcomingMeetings, ...pastMeetings].filter(meeting => 
    selectedDate && isSameDay(new Date(meeting.startTime), selectedDate)
  );

  // Get unique meeting dates for calendar
  const allMeetings = [...upcomingMeetings, ...pastMeetings];
  const meetingDates = new Set(
    allMeetings.map(meeting => new Date(meeting.startTime).toDateString())
  );

  // Handle add meeting
  const handleAddMeeting = async (meetingData: {
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
    isRecurring: boolean;
    recurringFrequency?: string;
    recurringEndDate?: string;
  }) => {
    try {
      const [startHour, startMin] = meetingData.startTime.split(':');
      const [endHour, endMin] = meetingData.endTime.split(':');
      
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
        participants: meetingData.participants,
        agenda: meetingData.agenda,
        isRecurring: meetingData.isRecurring,
        recurringFrequency: meetingData.isRecurring ? meetingData.recurringFrequency : undefined,
        recurringEndDate: meetingData.isRecurring && meetingData.recurringEndDate 
          ? new Date(meetingData.recurringEndDate).toISOString() 
          : undefined,
      });
      
      toast({
        title: "Success",
        description: "Meeting created successfully! Invitations sent to participants.",
      });
      
      setAddMeetingOpen(false);
      // Reload both tabs to refresh counts
      await loadUpcomingMeetings(upcomingPage);
      await loadPastMeetings(pastPage);
    } catch (err) {
      console.error('Error creating meeting:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create meeting",
        variant: "destructive"
      });
      throw err;
    }
  };

  const handleUpdateMeeting = async (meetingData: {
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
  }) => {
    if (!selectedMeeting) return;
    
    try {
      const [startHour, startMin] = meetingData.startTime.split(':');
      const [endHour, endMin] = meetingData.endTime.split(':');
      
      const startDateTime = new Date(meetingData.date);
      startDateTime.setHours(parseInt(startHour), parseInt(startMin), 0, 0);
      
      const endDateTime = new Date(meetingData.date);
      endDateTime.setHours(parseInt(endHour), parseInt(endMin), 0, 0);

      await apiClient.updateMeeting(selectedMeeting?._id, {
        title: meetingData.title,
        description: meetingData.description,
        type: meetingData.type as "team-meeting" | "one-on-one" | "project-review" | "standup" | "retrospective" | "other",
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        location: meetingData.location,
        meetingLink: meetingData.meetingLink,
        participants: meetingData.participants as unknown as User[],
        agenda: meetingData.agenda,
      });
      
      toast({
        title: "Success",
        description: "Meeting updated successfully",
      });
      
      setEditMeetingOpen(false);
      setSelectedMeeting(null);
      // Reload both tabs to refresh counts
      await loadUpcomingMeetings(upcomingPage);
      await loadPastMeetings(pastPage);
    } catch (err) {
      console.error('Error updating meeting:', err);
      toast({
        title: "Error",
        description: "Failed to update meeting",
        variant: "destructive"
      });
      throw err;
    }
  };

  const handleDeleteMeeting = async () => {
    if (!selectedMeeting) return;
    
    try {
      await apiClient.deleteMeeting(selectedMeeting?._id);
      toast({
        title: "Success",
        description: "Meeting deleted successfully",
      });
      // Reload both tabs to refresh counts
      await loadUpcomingMeetings(upcomingPage);
      await loadPastMeetings(pastPage);
      setViewMeetingOpen(false);
      setSelectedMeeting(null);
    } catch (err) {
      console.error('Error deleting meeting:', err);
      toast({
        title: "Error",
        description: "Failed to delete meeting",
        variant: "destructive"
      });
    }
  };

  const handleAddNotesSummary = async (data: { notes: string; summary: string }) => {
    if (!selectedMeeting) return;
    
    try {
      await apiClient.updateMeeting(selectedMeeting?._id, {
        notes: data.notes,
        summary: data.summary,
      });
      
      toast({
        title: "Success",
        description: "Notes and summary added successfully",
      });
      
      setAddNotesOpen(false);
      setSelectedMeeting(null);
      await loadPastMeetings(pastPage);
    } catch (err) {
      console.error('Error adding notes/summary:', err);
      toast({
        title: "Error",
        description: "Failed to add notes and summary",
        variant: "destructive"
      });
    }
  };

  // Pagination component
  const renderPagination = (currentPage: number, totalPages: number, onPageChange: (page: number) => void, totalItems: number) => {
    // Always show pagination if there are items, even if only 1 page
    if (totalItems === 0) return null;

    return (
      <div className="flex items-center justify-between mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600">
          Showing page {currentPage} of {Math.max(1, totalPages)} ({totalItems} total items)
        </div>
        {totalPages > 1 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  className="h-8 w-8 p-0"
                >
                  {pageNum}
                </Button>
              );
            })}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Render meeting card
  const renderMeetingCard = (meeting: Meeting, isPast = false) => {
    const startDate = new Date(meeting.startTime);
    const endDate = new Date(meeting.endTime);
    const isTodayMeeting = isToday(startDate);
    const isTomorrowMeeting = isTomorrow(startDate);
    
    return (
      <Card key={meeting?._id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500 bg-gradient-to-r from-white to-blue-50/30">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-xl font-bold text-gray-900">{meeting.title}</CardTitle>
                {isTodayMeeting && (
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    Today
                  </Badge>
                )}
                {isTomorrowMeeting && (
                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                    Tomorrow
                  </Badge>
                )}
              </div>
              {meeting.description && (
                <p className="text-sm text-gray-600 leading-relaxed">{meeting.description}</p>
              )}
            </div>
            <Badge 
              variant="secondary" 
              className="ml-4 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 font-medium"
            >
              {meeting.type.replace('-', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Time & Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100">
              <div className="p-2 bg-blue-100 rounded-full">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {startDate.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
                <p className="text-xs text-gray-600">
                  {formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100">
              <div className="p-2 bg-green-100 rounded-full">
                <MapPin className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Location</p>
                <p className="text-xs text-gray-600">{meeting.location || 'Virtual Meeting'}</p>
              </div>
            </div>
          </div>

          {/* Participants */}
          {meeting.participants && meeting.participants.length > 0 && (
            <div className="p-3 bg-white rounded-lg border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-100 rounded-full">
                    <Users className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {meeting.participants.length} Participants
                  </span>
                </div>
                {meeting.participants.length > 6 && (
                  <span className="text-xs text-gray-500">
                    +{meeting.participants.length - 6} more
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {meeting.participants.slice(0, 6).map((participant, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 border-2 border-white shadow-sm">
                      <AvatarImage src={participant.avatar} />
                      <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        {participant.firstName?.[0]}{participant.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                ))}
                {meeting.participants.length > 6 && (
                  <div className="h-8 w-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center shadow-sm">
                    <span className="text-xs font-medium text-gray-600">
                      +{meeting.participants.length - 6}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedMeeting(meeting);
                setViewMeetingOpen(true);
              }}
              className="border-gray-200 hover:bg-gray-50"
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            
            {!isPast && canCreateMeeting && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedMeeting(meeting);
                  setEditMeetingOpen(true);
                }}
                className="border-gray-200 hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            
            {isPast && canCreateMeeting && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedMeeting(meeting);
                  setAddNotesOpen(true);
                }}
                className="border-gray-200 hover:bg-gray-50"
              >
                {meeting.notes || meeting.summary ? 'Edit Notes' : 'Add Notes'}
              </Button>
            )}
            
            {!isPast && meeting.meetingLink && (
              <Button 
                size="sm" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-sm"
                onClick={() => {
                  if (meeting.meetingLink) {
                    window.open(meeting.meetingLink, '_blank', 'noopener,noreferrer');
                  }
                }}
              >
                <Video className="h-4 w-4 mr-1" />
                Join
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Meetings</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">
              Schedule and manage team meetings
            </p>
          </div>
          {canCreateMeeting && (
            <Button 
              onClick={() => setAddMeetingOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold text-blue-600">{upcomingTotal}</div>
              <p className="text-xs md:text-sm text-gray-600">Upcoming</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold text-green-600">{pastTotal}</div>
              <p className="text-xs md:text-sm text-gray-600">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold text-orange-600">{upcomingTotal + pastTotal}</div>
              <p className="text-xs md:text-sm text-gray-600">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold text-purple-600">{selectedDateMeetings.length}</div>
              <p className="text-xs md:text-sm text-gray-600">Today</p>
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
                          key={meeting?._id} 
                          className="p-3 rounded-lg bg-blue-50 border border-blue-200"
                        >
                          <p className="font-medium text-sm">{meeting.title}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                            <MapPin className="h-3 w-3" />
                            <span>{meeting.location || 'Virtual'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No meetings scheduled</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meetings List with Tabs */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'upcoming' | 'past')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-12 bg-white border border-gray-200 shadow-sm p-1">
                <TabsTrigger value="upcoming" className="text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
                  Upcoming
                  <Badge variant="secondary" className="ml-2 text-xs bg-blue-100 text-blue-700 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800">
                    {upcomingTotal}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="past" className="text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
                  Past
                  <Badge variant="secondary" className="ml-2 text-xs bg-gray-100 text-gray-700 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800">
                    {pastTotal}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="mt-6">
                {upcomingMeetings.length > 0 ? (
                  <>
                    <div className="space-y-4">
                      {upcomingMeetings.map((meeting) => renderMeetingCard(meeting, false))}
                    </div>
                    {renderPagination(upcomingPage, upcomingTotalPages, setUpcomingPage, upcomingTotal)}
                  </>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                      <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming meetings</h3>
                      <p className="text-gray-600 mb-4">
                        {canCreateMeeting ? 'Schedule your first meeting to get started' : 'No meetings scheduled yet'}
                      </p>
                      {canCreateMeeting && (
                        <Button onClick={() => setAddMeetingOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                          <Plus className="h-4 w-4 mr-2" />
                          Schedule Meeting
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="past" className="mt-6">
                {pastMeetings.length > 0 ? (
                  <>
                    <div className="space-y-4">
                      {pastMeetings.map((meeting) => renderMeetingCard(meeting, true))}
                    </div>
                    {renderPagination(pastPage, pastTotalPages, setPastPage, pastTotal)}
                  </>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                      <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No past meetings</h3>
                      <p className="text-gray-600">
                        Completed meetings will appear here
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AddMeetingDialog
        open={addMeetingOpen}
        onOpenChange={setAddMeetingOpen}
        onSubmit={handleAddMeeting}
      />

      <ViewMeetingDialog
        open={viewMeetingOpen}
        onOpenChange={setViewMeetingOpen}
        meeting={selectedMeeting}
        onEdit={() => {
          setViewMeetingOpen(false);
          setEditMeetingOpen(true);
        }}
        onDelete={handleDeleteMeeting}
        onAddNotes={() => {
          setViewMeetingOpen(false);
          setAddNotesOpen(true);
        }}
        canEdit={canCreateMeeting}
      />

      <EditMeetingDialog
        open={editMeetingOpen}
        onOpenChange={setEditMeetingOpen}
        meeting={selectedMeeting}
        onSubmit={handleUpdateMeeting}
      />

      <AddNotesSummaryDialog
        open={addNotesOpen}
        onOpenChange={setAddNotesOpen}
        meeting={selectedMeeting}
        onSubmit={handleAddNotesSummary}
      />
    </DashboardLayout>
  );
}