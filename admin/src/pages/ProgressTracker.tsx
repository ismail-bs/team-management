import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ProjectCard } from "@/components/ProjectCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Search, UserPlus, Loader2, TrendingUp, CheckCircle2, Clock, Pause } from "lucide-react";
import { NewProjectDialog } from "@/components/dialogs/NewProjectDialog";
import { EditProjectDialog } from "@/components/dialogs/EditProjectDialog";
import { InviteMemberDialog } from "@/components/dialogs/InviteMemberDialog";
import { toast } from "@/hooks/use-toast";
import { apiClient, Project } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function ProgressTracker() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false);
  
  // Check if current user is admin
  const isAdmin = user?.role === 'admin';

  // Calculate stats from projects
  const stats = {
    completed: projects.filter(p => p.status === 'completed').length,
    active: projects.filter(p => p.status === 'in-progress').length,
    planning: projects.filter(p => p.status === 'not-started').length,
    paused: projects.filter(p => p.status === 'on-hold' || p.status === 'cancelled').length,
  };

  // Load projects
  const loadData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getProjects({ limit: 100 });
      setProjects(response.data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      
      let errorMessage = "Failed to load projects";
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
        variant: "destructive"
      });
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle new project
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
      await apiClient.createProject({
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
      await loadData(); // Refresh data
      
    } catch (error) {
      console.error('Error creating project:', error);
      
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
        variant: "destructive"
      });
    }
  };

  // Handle invite member
  const handleInviteMember = async (memberData: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    department?: string;
  }) => {
    try {
      await apiClient.inviteUser(memberData);
      
      toast({
        title: "Success",
        description: "Invitation sent successfully",
      });
      
      setInviteMemberOpen(false);
      
    } catch (error) {
      console.error('Error inviting member:', error);
      
      let errorMessage = "Failed to send invitation";
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
        variant: "destructive"
      });
    }
  };

  // Filter projects
  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && project.status === 'in-progress') ||
      (statusFilter === 'completed' && project.status === 'completed') ||
      (statusFilter === 'paused' && (project.status === 'on-hold' || project.status === 'cancelled')) ||
      (statusFilter === 'planning' && project.status === 'not-started');
    
    const matchesPriority = 
      priorityFilter === 'all' || 
      (priorityFilter === 'high' && (project.priority === 'urgent' || project.priority === 'high')) ||
      (priorityFilter === 'medium' && project.priority === 'medium') ||
      (priorityFilter === 'low' && project.priority === 'low');
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading projects...</p>
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
            <h1 className="text-2xl md:text-3xl font-bold">Progress Tracker</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Track project status, tasks, and deadlines
            </p>
          </div>
          {isAdmin && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={() => setNewProjectOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setInviteMemberOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </div>
          )}
        </div>

        {/* Stats Cards with Enhanced Design */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-gray-900 hover:shadow-lg transition-all">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2.5 md:p-3 rounded-xl bg-green-100 dark:bg-green-900/50">
                  <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
                  {stats.completed}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-gray-900 hover:shadow-lg transition-all">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2.5 md:p-3 rounded-xl bg-blue-100 dark:bg-blue-900/50">
                  <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.active}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-gray-900 hover:shadow-lg transition-all">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2.5 md:p-3 rounded-xl bg-orange-100 dark:bg-orange-900/50">
                  <Clock className="h-5 w-5 md:h-6 md:w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Planning</p>
                <p className="text-2xl md:text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {stats.planning}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 bg-gradient-to-br from-gray-50 to-white dark:from-gray-950/30 dark:to-gray-900 hover:shadow-lg transition-all">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2.5 md:p-3 rounded-xl bg-gray-100 dark:bg-gray-800/50">
                  <Pause className="h-5 w-5 md:h-6 md:w-6 text-gray-600 dark:text-gray-400" />
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Paused</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-600 dark:text-gray-400">
                  {stats.paused}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search projects..." 
                  className="pl-10" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="planning">Planning</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High/Urgent</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {filteredProjects.length > 0 ? (
            filteredProjects.map((project) => (
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
            <div className="col-span-full">
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">No projects found</p>
                  <p className="text-muted-foreground mb-6">
                    {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' 
                      ? 'Try adjusting your filters' 
                      : 'Create your first project to get started'}
                  </p>
                  {!searchTerm && statusFilter === 'all' && priorityFilter === 'all' && (
                    <Button onClick={() => setNewProjectOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Project
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
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
        
        <InviteMemberDialog 
          open={inviteMemberOpen} 
          onOpenChange={setInviteMemberOpen} 
          onSubmit={handleInviteMember} 
        />
      </div>
    </DashboardLayout>
  );
}
