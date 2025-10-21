/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Edit3, Calendar, Users, Target, DollarSign, Trash2, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { SelectTeamMemberDialog } from "./SelectTeamMemberDialog";

interface ProjectDetailsDialogProps {
  children: React.ReactNode;
  project: {
    id?: string;
    title: string;
    description: string;
    progress: number;
    status: "active" | "completed" | "paused" | "planning" | "in-progress" | "not-started" | "on-hold" | "cancelled";
    dueDate: string;
    teamMembers: { id: string; name: string; avatar?: string }[];
    priority: "high" | "medium" | "low" | "urgent";
  };
}

export function ProjectDetailsDialog({ children, project }: ProjectDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectMemberOpen, setSelectMemberOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: project.title,
    description: project.description,
    progress: [project.progress],
    status: project.status,
    priority: project.priority,
    dueDate: project.dueDate,
    budget: "$25,000",
    projectManager: "Alice Johnson"
  });

  const statusConfig = {
    active: { label: "Active", className: "bg-success text-success-foreground" },
    completed: { label: "Completed", className: "bg-primary text-primary-foreground" },
    paused: { label: "Paused", className: "bg-warning text-warning-foreground" },
    planning: { label: "Planning", className: "bg-secondary text-secondary-foreground" },
  };

  const mapStatusToAPI = (status: string): 'not-started' | 'in-progress' | 'completed' | 'on-hold' | 'cancelled' => {
    const statusMap: Record<string, 'not-started' | 'in-progress' | 'completed' | 'on-hold' | 'cancelled'> = {
      'active': 'in-progress',
      'in-progress': 'in-progress',
      'completed': 'completed',
      'paused': 'on-hold',
      'on-hold': 'on-hold',
      'planning': 'not-started',
      'not-started': 'not-started',
      'cancelled': 'cancelled',
    };
    return statusMap[status] || 'in-progress';
  };

  const handleSave = async () => {
    try {
      if (!project.id) {
        toast({
          title: "Error",
          description: "Project ID is missing",
          variant: "destructive"
        });
        return;
      }

      await apiClient.updateProject(project.id, {
        name: formData.title,
        description: formData.description,
        status: mapStatusToAPI(formData.status),
        priority: formData.priority,
        budget: formData.budget ? parseFloat(formData.budget.replace(/[^0-9.]/g, '')) : undefined,
      });
      
      setIsEditing(false);
      setOpen(false);
      
      toast({ 
        title: "Success", 
        description: "Project updated successfully" 
      });
    } catch (error) {
      console.error('Error updating project:', error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to update project", 
        variant: "destructive" 
      });
    }
  };

  const handleInputChange = (field: string, value: string | number | number[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTeamMember = async (member: {
    id: string;
    name: string;
    status: "online" | "away" | "offline";
    role: string;
    department: string;
    avatar?: string;
    initials: string;
  }) => {
    try {
      if (!project.id) {
        toast({
          title: "Error",
          description: "Project ID is missing",
          variant: "destructive"
        });
        return;
      }

      await apiClient.addProjectTeamMember(project.id, member.id);
      
      toast({
        title: "Success",
        description: `${member.name} added to project successfully`
      });
      
      // Close dialogs and refresh
      setSelectMemberOpen(false);
      setOpen(false);
      
      // Trigger parent refresh (would need to pass callback from parent)
      window.location.reload();
    } catch (error) {
      console.error('Error adding team member:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add team member",
        variant: "destructive"
      });
    }
  };

  const handleRemoveTeamMember = async (memberId: string) => {
    try {
      const projectId = (project as any)?._id ?? (project as any).id;
      if (!projectId) {
        toast({
          title: "Error",
          description: "Project ID is missing",
          variant: "destructive"
        });
        return;
      }

      await apiClient.removeProjectTeamMember(projectId, memberId);
      
      toast({
        title: "Success",
        description: "Team member removed successfully"
      });
      
      // Close dialog and refresh
      setOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Error removing team member:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove team member",
        variant: "destructive"
      });
    }
  };

  const handleDeleteProject = async () => {
    try {
      const projectId = (project as any)?._id ?? (project as any).id;
      if (!projectId) {
        toast({
          title: "Error",
          description: "Project ID is missing",
          variant: "destructive"
        });
        return;
      }

      await apiClient.deleteProject(projectId);
      
      toast({
        title: "Success",
        description: "Project deleted successfully"
      });
      
      setOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete project",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Project Details
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              {isEditing ? "Cancel" : "Edit"}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Title and Status */}
          <div className="space-y-4">
            {isEditing ? (
              <div className="space-y-2">
                <Label htmlFor="title">Project Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{formData.title}</h2>
                <Badge className={statusConfig[formData.status as keyof typeof statusConfig].className}>
                  {statusConfig[formData.status as keyof typeof statusConfig].label}
                </Badge>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            {isEditing ? (
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={3}
              />
            ) : (
              <p className="text-muted-foreground">{formData.description}</p>
            )}
          </div>

          {/* Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Progress</Label>
              <span className="text-sm font-medium">{formData.progress[0]}%</span>
            </div>
            {isEditing ? (
              <Slider
                value={formData.progress}
                onValueChange={(value) => handleInputChange("progress", value)}
                max={100}
                step={5}
                className="w-full"
              />
            ) : (
              <Progress value={formData.progress[0]} className="h-3" />
            )}
          </div>

          <Separator />

          {/* Project Details Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Status */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Status
              </Label>
              {isEditing ? (
                <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {statusConfig[formData.status as keyof typeof statusConfig].label}
                </p>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              {isEditing ? (
                <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className={cn(
                  formData.priority === "high" && "border-destructive text-destructive",
                  formData.priority === "medium" && "border-warning text-warning",
                  formData.priority === "low" && "border-success text-success"
                )}>
                  {formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)}
                </Badge>
              )}
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Due Date
              </Label>
              {isEditing ? (
                <Input
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange("dueDate", e.target.value)}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{formData.dueDate}</p>
              )}
            </div>

            {/* Budget */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Budget
              </Label>
              {isEditing ? (
                <Input
                  value={formData.budget}
                  onChange={(e) => handleInputChange("budget", e.target.value)}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{formData.budget}</p>
              )}
            </div>
          </div>

          {/* Team Members */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Members ({project.teamMembers.length})
              </Label>
              {isEditing && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setSelectMemberOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                  <SelectTeamMemberDialog
                    open={selectMemberOpen}
                    onOpenChange={setSelectMemberOpen}
                    onSelect={handleAddTeamMember}
                  />
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {project.teamMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg group relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback className="text-xs">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{member.name}</span>
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveTeamMember(member.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Danger Zone - Delete Project */}
          <div className="space-y-3 p-4 border border-destructive/50 rounded-lg bg-destructive/5">
              <Label className="text-destructive font-semibold">Danger Zone</Label>
              <p className="text-sm text-muted-foreground">
                Deleting a project will permanently remove it and its data. This action cannot be undone.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Project
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the project "{project.title}" and all its related data. Please confirm you want to proceed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive hover:bg-destructive/90">
                      Delete Project
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-gradient-primary hover:opacity-90">
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}