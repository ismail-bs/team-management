import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Users, Clock, AlertCircle, Edit, Save, X } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";

type TaskStatus = 'open' | 'in-progress' | 'resolved' | 'closed' | 'blocked';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

interface TaskDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: {
    id?: string;
    title: string;
    description: string;
    progress: number;
    status: TaskStatus;
    dueDate: string;
    teamMembers: Array<{ id: string; name: string; avatar?: string }>;
    priority: TaskPriority;
  };
}

export function TaskDetailsDialog({ open, onOpenChange, project }: TaskDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: project.title,
    description: project.description,
    progress: project.progress,
    status: project.status,
    dueDate: project.dueDate,
    priority: project.priority
  });

  const handleSave = async () => {
    try {
      // Validate data before saving
      if (!editData.title.trim()) {
        toast({
          title: "Validation Error",
          description: "Task title is required",
          variant: "destructive",
        });
        return;
      }
      
      // Update task via API if project.id exists
      if (project.id) {
        await apiClient.updateTask(project.id, {
          title: editData.title,
          description: editData.description,
          status: editData.status,
          priority: editData.priority,
        });
      }
      
      toast({
        title: "Task Updated",
        description: "Task details have been updated successfully",
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setEditData({
      title: project.title,
      description: project.description,
      progress: project.progress,
      status: project.status,
      dueDate: project.dueDate,
      priority: project.priority
    });
    setIsEditing(false);
  };
  const statusConfig = {
    active: { label: "Active", className: "bg-success text-success-foreground" },
    completed: { label: "Completed", className: "bg-primary text-primary-foreground" },
    paused: { label: "Paused", className: "bg-warning text-warning-foreground" },
    planning: { label: "Planning", className: "bg-secondary text-secondary-foreground" },
  };

  const priorityConfig = {
    high: { label: "High Priority", className: "text-destructive" },
    medium: { label: "Medium Priority", className: "text-warning" },
    low: { label: "Low Priority", className: "text-success" },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Task Details - {isEditing ? editData.title : project.title}
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
              {isEditing ? "Cancel" : "Edit"}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                {isEditing ? (
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={editData.title}
                      onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                ) : (
                  <CardTitle>{project.title}</CardTitle>
                )}
                {isEditing ? (
                  <div className="ml-4">
                    <Label htmlFor="status">Status</Label>
                    <Select value={editData.status} onValueChange={(value) => setEditData(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="planning">Planning</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <Badge className={statusConfig[project.status as keyof typeof statusConfig].className}>
                    {statusConfig[project.status as keyof typeof statusConfig].label}
                  </Badge>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={editData.description}
                    onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{project.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                {isEditing ? (
                  <div className="flex items-center gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={editData.dueDate}
                        onChange={(e) => setEditData(prev => ({ ...prev, dueDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={editData.priority} onValueChange={(value) => setEditData(prev => ({ ...prev, priority: value }))}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {project.dueDate}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${priorityConfig[project.priority as keyof typeof priorityConfig].className}`}>
                      <AlertCircle className="h-4 w-4" />
                      <span>{priorityConfig[project.priority as keyof typeof priorityConfig].label}</span>
                    </div>
                  </>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm items-center">
                  <span>Progress</span>
                  {isEditing ? (
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={editData.progress}
                      onChange={(e) => setEditData(prev => ({ ...prev, progress: parseInt(e.target.value) || 0 }))}
                      className="w-20"
                    />
                  ) : (
                    <span>{project.progress}%</span>
                  )}
                </div>
                <Progress value={isEditing ? editData.progress : project.progress} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Team Members ({project.teamMembers.length})</span>
                </div>
                <div className="flex -space-x-2">
                  {project.teamMembers.map((member) => (
                    <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="text-xs">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {isEditing && (
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}