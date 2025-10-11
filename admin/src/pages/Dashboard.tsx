import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatsCard } from "@/components/StatsCard";
import { ProjectCard } from "@/components/ProjectCard";
import { NewProjectDialog } from "@/components/dialogs/NewProjectDialog";
import { EditProjectDialog } from "@/components/dialogs/EditProjectDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  CheckCircle, 
  Clock, 
  Users,
  Calendar,
  Plus,
  ArrowRight,
  Loader2,
  TrendingUp,
  Video,
  MapPin,
  ExternalLink
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiClient, Project, Meeting } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [stats, setStats] = useState({
    activeProjects: 0,
    completedTasks: 0,
    pendingTasks: 0,
    teamMembers: 0,
  });

  // Load dashboard data
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [projectsRes, meetingsRes, tasksRes, usersRes] = await Promise.all([
        apiClient.getProjects({ limit: 6 }).catch(() => ({ data: [], total: 0 })),
        apiClient.getUpcomingMeetings().catch(() => []),
        apiClient.getTasks({ limit: 100 }).catch(() => ({ data: [] })),
        apiClient.getUsers({ limit: 100 }).catch(() => ({ data: [] })),
      ]);

      const projectData = projectsRes.data || [];
      const meetingData = Array.isArray(meetingsRes) ? meetingsRes : [];
      const taskData = tasksRes.data || [];
      const userData = usersRes.data || [];

      setProjects(projectData);
      setMeetings(meetingData.slice(0, 5));

      // Calculate stats
      setStats({
        activeProjects: projectData.filter(p => p.status === 'in-progress').length,
        completedTasks: taskData.filter(t => t.status === 'done' || t.status === 'closed').length,
        pendingTasks: taskData.filter(t => t.status === 'open' || t.status === 'in-progress').length,
        teamMembers: userData.length,
      });
    } catch (error) {
      console.error('Dashboard load error:', error);
      
      let errorMessage = "Failed to load dashboard data";
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Handle new project creation
  const handleNewProject = async (projectData: {
    title: string;
    description: string;
    priority: string;
    status: string;
    projectManager: string;
    teamMembers: string[];
    budget: string;
    dueDate?: Date;
  }) => {
    try {
      const newProject = await apiClient.createProject({
        name: projectData.title,
        description: projectData.description,
        priority: projectData.priority,
        status: projectData.status,
        projectManager: projectData.projectManager,
        teamMembers: projectData.teamMembers || [],
        startDate: new Date().toISOString(),
        endDate: projectData.dueDate?.toISOString(),
        budget: projectData.budget ? parseFloat(projectData.budget) : undefined,
      });
      
      toast({
        title: "Success",
        description: "Project created successfully! Team members will receive email notifications.",
      });
      
      setNewProjectOpen(false);
      
      // Reload dashboard data
      await loadData();
      
    } catch (error) {
      console.error('Create project error:', error);
      
      let errorMessage = "Failed to create project";
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string | string[] } }; message?: string };
        if (axiosError.response?.data?.message) {
          errorMessage = Array.isArray(axiosError.response.data.message) 
            ? axiosError.response.data.message.join(', ')
            : axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading dashboard...</p>
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
            <h1 className="text-2xl md:text-3xl font-bold">Team Dashboard</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Welcome back! Here's what's happening with your team.
            </p>
          </div>
          {user?.role === 'admin' && (
            <Button 
              onClick={() => setNewProjectOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          )}
        </div>

        {/* Stats Cards with Enhanced Design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-gray-900 hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/50">
                  <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.activeProjects}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-gray-900 hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/50">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Completed Tasks</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {stats.completedTasks}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-gray-900 hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/50">
                  <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Pending Tasks</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {stats.pendingTasks}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-gray-900 hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/50">
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Team Members</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.teamMembers}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Projects Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-semibold">Recent Projects</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/progress-tracker')}
                className="text-sm"
              >
                View All 
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            <div className="grid gap-4">
              {projects.length > 0 ? (
                projects.map((project) => (
                  <div 
                    key={project._id}
                    onClick={() => {
                      setSelectedProject(project);
                      setEditProjectOpen(true);
                    }}
                    className="cursor-pointer"
                  >
                    <ProjectCard
                      title={project.name}
                      description={project.description || ''}
                      progress={project.progress || 0}
                      status={
                        project.status === 'in-progress' ? 'active' :
                        project.status === 'completed' ? 'completed' :
                        project.status === 'on-hold' ? 'paused' : 'planning'
                      }
                      dueDate={project.endDate ? new Date(project.endDate).toLocaleDateString() : 'No due date'}
                      teamMembers={project.teamMembers.map(m => ({
                        id: m._id,
                        name: `${m.firstName} ${m.lastName}`
                      }))}
                      priority={
                        project.priority === 'urgent' || project.priority === 'high' ? 'high' :
                        project.priority === 'low' ? 'low' : 'medium'
                      }
                    />
                  </div>
                ))
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No projects yet</p>
                    <Button onClick={() => setNewProjectOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Project
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Upcoming Meetings */}
            <Card className="border-blue-200 shadow-sm">
              <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Upcoming Meetings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {meetings.length > 0 ? (
                  <>
                    {meetings.map((meeting) => {
                      const startDate = new Date(meeting.startTime);
                      const isToday = startDate.toDateString() === new Date().toDateString();
                      const isTomorrow = new Date(startDate).setHours(0,0,0,0) === new Date(new Date().setDate(new Date().getDate() + 1)).setHours(0,0,0,0);
                      
                      return (
                        <div 
                          key={meeting._id} 
                          className="p-3 border rounded-lg hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-900 dark:to-blue-950/20"
                          onClick={() => navigate('/meetings')}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-sm flex-1 pr-2">{meeting.title}</h4>
                            {isToday && (
                              <Badge variant="default" className="bg-blue-600 text-xs">Today</Badge>
                            )}
                            {isTomorrow && (
                              <Badge variant="secondary" className="text-xs">Tomorrow</Badge>
                            )}
                          </div>
                          
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              <span>
                                {format(startDate, 'MMM dd, yyyy')} at {format(startDate, 'h:mm a')}
                              </span>
                            </div>
                            
                            {meeting.location && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5" />
                                <span className="truncate">{meeting.location}</span>
                              </div>
                            )}
                            
                            {meeting.meetingLink && (
                              <div className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700">
                                <Video className="h-3.5 w-3.5" />
                                <span>Join Online</span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Users className="h-3.5 w-3.5" />
                              <span>{meeting.participants?.length || 0} participant{meeting.participants?.length !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => navigate('/meetings')}
                    >
                      View All Meetings
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground mb-4">No upcoming meetings</p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => navigate('/meetings')}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Schedule Meeting
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dialogs */}
        <NewProjectDialog
          open={newProjectOpen}
          onOpenChange={setNewProjectOpen}
          onSubmit={handleNewProject}
        />
        
        {selectedProject && (
          <EditProjectDialog
            open={editProjectOpen}
            onOpenChange={setEditProjectOpen}
            project={selectedProject}
            onUpdate={loadData}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
