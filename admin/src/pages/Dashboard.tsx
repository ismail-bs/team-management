import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatsCard } from "@/components/StatsCard";
import { ProjectCard } from "@/components/ProjectCard";
import { NewProjectDialog } from "@/components/dialogs/NewProjectDialog";
import { EditProjectDialog } from "@/components/dialogs/EditProjectDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  CheckCircle, 
  Clock, 
  Users,
  Calendar,
  Plus,
  ArrowRight,
  Loader2,
  TrendingUp
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiClient, Project, Meeting } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

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
    } catch (error: any) {
      console.error('Dashboard load error:', error);
      
      let errorMessage = "Failed to load dashboard data";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
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
  const handleNewProject = async (projectData: any) => {
    try {
      await apiClient.createProject({
        name: projectData.title,
        description: projectData.description,
        priority: projectData.priority,
        status: projectData.status,
        projectManager: projectData.projectManager,
        startDate: new Date().toISOString(),
        endDate: projectData.dueDate?.toISOString(),
        budget: projectData.budget ? parseFloat(projectData.budget) : undefined,
      });
      
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      
      setNewProjectOpen(false);
      
      // Reload dashboard data
      await loadData();
      
    } catch (error: any) {
      console.error('Create project error:', error);
      
      let errorMessage = "Failed to create project";
      if (error?.response?.data?.message) {
        errorMessage = Array.isArray(error.response.data.message) 
          ? error.response.data.message.join(', ')
          : error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
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
          <Button 
            onClick={() => setNewProjectOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatsCard
            title="Active Projects"
            value={stats.activeProjects}
            icon={<BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />}
          />
          <StatsCard
            title="Completed Tasks"
            value={stats.completedTasks}
            icon={<CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-green-500" />}
          />
          <StatsCard
            title="Pending Tasks"
            value={stats.pendingTasks}
            icon={<Clock className="h-5 w-5 md:h-6 md:w-6 text-orange-500" />}
          />
          <StatsCard
            title="Team Members"
            value={stats.teamMembers}
            icon={<Users className="h-5 w-5 md:h-6 md:w-6 text-purple-500" />}
          />
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
                      progress={Math.round((project.completedTaskCount / Math.max(project.taskCount, 1)) * 100)}
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
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Calendar className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
                  Upcoming Meetings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {meetings.length > 0 ? (
                  <>
                    {meetings.map((meeting) => (
                      <div 
                        key={meeting._id} 
                        className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                      >
                        <h4 className="font-medium text-sm">{meeting.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(meeting.startTime).toLocaleDateString()} at{' '}
                          {new Date(meeting.startTime).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {meeting.participants?.length || 0} participants
                        </p>
                      </div>
                    ))}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => navigate('/meetings')}
                    >
                      View All Meetings
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming meetings
                  </p>
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
