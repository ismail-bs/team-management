import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Edit, Trash2, Lock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { apiClient, User, Project } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onUpdate: () => void;
}

export function EditProjectDialog({ open, onOpenChange, project, onUpdate }: EditProjectDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [date, setDate] = useState<Date | undefined>();
  const [projectManagers, setProjectManagers] = useState<User[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "",
    status: "",
    projectManager: "",
    budget: ""
  });

  // Check if user can edit progress (admin or project_manager)
  const canEditProgress = user?.role === 'admin' || user?.role === 'project_manager';

  useEffect(() => {
    if (open && project) {
      // Load project managers first
      loadProjectManagers();
      
      // Populate form with project data
      setFormData({
        title: project.name || "",
        description: project.description || "",
        priority: project.priority || "medium",
        status: project.status || "not-started",
        projectManager: typeof project.projectManager === 'object' 
          ? project.projectManager._id 
          : project.projectManager || "",
        budget: project.budget?.toString() || ""
      });
      
      // Set progress from project (default to 0 if not set)
      setProgress(project.progress || 0);
      
      if (project.endDate) {
        setDate(new Date(project.endDate));
      } else {
        setDate(undefined);
      }
    }
  }, [open, project]);

  const loadProjectManagers = async () => {
    try {
      const managers = await apiClient.getProjectManagers();
      setProjectManagers(managers);
    } catch (error) {
      console.error('Failed to load project managers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Project title is required",
        variant: "destructive"
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Project description is required",
        variant: "destructive"
      });
      return;
    }

    // Project manager is optional - only validate if it's provided but invalid
    if (formData.projectManager && formData.projectManager.length !== 24) {
      toast({
        title: "Validation Error",
        description: "Invalid project manager selection",
        variant: "destructive"
      });
      return;
    }

    // Validate progress can only be updated if status allows it
    const currentProgress = project.progress || 0;
    if (progress < currentProgress) {
      toast({
        title: "Validation Error",
        description: `Progress cannot decrease from ${currentProgress}% to ${progress}%`,
        variant: "destructive"
      });
      return;
    }

    // Check if progress can be updated based on status
    const statusesAllowingProgress = ['in-progress', 'completed'];
    if (progress !== currentProgress && !statusesAllowingProgress.includes(formData.status)) {
      toast({
        title: "Validation Error",
        description: 'Progress can only be updated when status is "In Progress" or "Completed"',
        variant: "destructive"
      });
      return;
    }

    // Check if trying to revert from completed
    if (project.status === 'completed' && formData.status !== 'completed') {
      toast({
        title: "Validation Error",
        description: 'Cannot revert status from "Completed". Completed projects are final.',
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      // Build update payload - only include fields that have values
      const updatePayload: Record<string, unknown> = {
        name: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: formData.status,
        progress: progress, // Include progress
      };

      // Only include projectManager if it's a valid MongoDB ObjectId
      if (formData.projectManager && formData.projectManager.length === 24) {
        updatePayload.projectManager = formData.projectManager;
      }

      // Only include endDate if it's set
      if (date) {
        updatePayload.endDate = date.toISOString();
      }

      // Only include budget if it's a valid number
      if (formData.budget && !isNaN(parseFloat(formData.budget))) {
        updatePayload.budget = parseFloat(formData.budget);
      }
      
      await apiClient.updateProject(project._id, updatePayload);
      
      toast({
        title: "Success",
        description: "Project updated successfully",
      });
      
      onUpdate();
      onOpenChange(false);
      
    } catch (error) {
      console.error('Update error:', error);
      
      let errorMessage = "Failed to update project";
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
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      
      await apiClient.deleteProject(project._id);
      
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
      
      onUpdate();
      onOpenChange(false);
      
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Project
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Project Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Project Title *</Label>
            <Input
              id="title"
              placeholder="Enter project title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              required
            />
          </div>

          {/* Project Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Project Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the project objectives and scope"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={3}
              required
            />
          </div>

          {/* Project Manager (Read-Only) */}
          <div className="space-y-2">
            <Label htmlFor="projectManager" className="flex items-center gap-2">
              Project Manager
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            </Label>
            <Input
              id="projectManager"
              value={
                typeof project.projectManager === 'object' 
                  ? `${project.projectManager.firstName} ${project.projectManager.lastName}`
                  : 'Not Assigned'
              }
              disabled
              className="bg-muted/50 cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              Project Manager cannot be changed.
            </p>
          </div>

          {/* Priority and Status - Properly Aligned 2 Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority" className="block">Priority *</Label>
              <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="flex items-center gap-2">
                Status *
                {project.status === 'completed' && (
                  <Lock className="h-3.5 w-3.5 text-green-600" />
                )}
              </Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => handleInputChange("status", value)}
                disabled={project.status === 'completed'}
                required
              >
                <SelectTrigger className={project.status === 'completed' ? 'opacity-60' : ''}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not-started">Not Started</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Completion Message for Status */}
          {project.status === 'completed' && (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="text-xs text-green-700 dark:text-green-300">
                ✓ This project is completed and cannot be reverted.
              </p>
            </div>
          )}

          {/* Budget and Due Date - Properly Aligned 2 Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Budget</Label>
              <Input
                id="budget"
                type="number"
                placeholder="$0"
                value={formData.budget}
                onChange={(e) => handleInputChange("budget", e.target.value)}
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="progress" className="flex items-center gap-2">
                Project Progress
                {(!canEditProgress || 
                  formData.status === 'not-started' || 
                  formData.status === 'on-hold' || 
                  formData.status === 'cancelled' ||
                  project.status === 'completed') && (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Label>
              <div className="flex items-center gap-2">
                {progress !== (project.progress || 0) && (
                  <span className="text-xs text-muted-foreground">
                    {project.progress || 0}% →
                  </span>
                )}
                <span className={cn(
                  "text-sm font-semibold px-2.5 py-1 rounded-full",
                  progress === 100 
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : progress > 0
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                )}>
                  {progress}%
                </span>
              </div>
            </div>
            
            {/* Simple Progress Bar with Editable Input */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                {/* Visual Progress Bar (shows current value) */}
                <div className="relative flex-1 h-9 bg-gray-200 dark:bg-gray-800 rounded-md overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-300 ease-out",
                      progress === 100 
                        ? "bg-gradient-to-r from-green-500 to-green-600"
                        : "bg-gradient-to-r from-blue-500 to-purple-600"
                    )}
                    style={{ width: `${progress}%` }}
                  >
                    <div className="h-full w-full bg-white/20" />
                  </div>
                  
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-sm font-semibold text-white drop-shadow">
                      {progress}%
                    </span>
                  </div>
                </div>

                {/* Editable Input (on the right) */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Input
                    type="number"
                    min={project.progress || 0}
                    max={100}
                    step={5}
                    value={progress}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      if (val >= (project.progress || 0) && val <= 100) {
                        setProgress(val);
                      }
                    }}
                    className="w-16 text-center font-semibold"
                    disabled={
                      !canEditProgress || 
                      formData.status === 'not-started' || 
                      formData.status === 'on-hold' || 
                      formData.status === 'cancelled' ||
                      project.status === 'completed'
                    }
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground px-1">
                Range: {project.progress || 0}% - 100%
              </div>
            </div>
            
            {/* Progress Rules Info */}
            <div className="space-y-2">
              {!canEditProgress && (
                <div className="text-xs bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-md p-2 flex items-start gap-2">
                  <Lock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>Only Admin and Project Manager can update progress</span>
                </div>
              )}
              
              {(formData.status === 'not-started' || 
                formData.status === 'on-hold' || 
                formData.status === 'cancelled') && (
                <div className="text-xs bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-2 flex items-start gap-2">
                  <span className="text-blue-600">ℹ️</span>
                  <span>Progress can only be updated when status is "In Progress". Change status first.</span>
                </div>
              )}
              
              {project.status === 'completed' && (
                <div className="text-xs bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-2 flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>This project is completed. Status and progress are locked.</span>
                </div>
              )}
              
              {formData.status === 'in-progress' && canEditProgress && (
                <div className="text-xs bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-2 flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Progress can only increase (from {project.progress || 0}% onwards). Cannot decrease.</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"
              disabled={loading || project.status === 'completed'}
            >
              {loading ? 'Updating...' : 'Update Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

