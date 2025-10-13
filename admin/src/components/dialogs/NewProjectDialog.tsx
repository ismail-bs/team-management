import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Plus, Users as UsersIcon, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { apiClient, User } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (projectData: {
    title: string;
    description: string;
    priority: string;
    status: string;
    projectManager: string;
    teamMembers: string[];
    budget: string;
    dueDate?: Date;
  }) => Promise<void> | void;
}

export function NewProjectDialog({ open, onOpenChange, onSubmit }: NewProjectDialogProps) {
  const [date, setDate] = useState<Date>();
  const [projectManagers, setProjectManagers] = useState<User[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "",
    status: "",
    projectManager: "",
    budget: ""
  });

  useEffect(() => {
    if (open) {
      loadProjectManagers();
      loadTeamMembers();
    }
  }, [open]);

  const loadProjectManagers = async () => {
    try {
      setLoading(true);
      // Get users with admin and project_manager roles
      const managers = await apiClient.getProjectManagers();
      setProjectManagers(managers);
    } catch (error) {
      console.error('Failed to load project managers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async () => {
    try {
      // Get users with member role
      const response = await apiClient.getUsers({ role: 'member', limit: 100 });
      setTeamMembers(response.data || []);
    } catch (error) {
      console.error('Failed to load team members:', error);
    }
  };

  const toggleTeamMember = (userId: string) => {
    setSelectedTeamMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const removeTeamMember = (userId: string) => {
    setSelectedTeamMembers(prev => prev.filter(id => id !== userId));
  };

  const getSelectedMemberDetails = () => {
    return teamMembers.filter(member => selectedTeamMembers.includes(member._id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
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

    if (!formData.projectManager) {
      toast({
        title: "Validation Error",
        description: "Please select a project manager",
        variant: "destructive"
      });
      return;
    }

    if (!formData.priority) {
      toast({
        title: "Validation Error",
        description: "Please select a priority level",
        variant: "destructive"
      });
      return;
    }

    if (!formData.status) {
      toast({
        title: "Validation Error",
        description: "Please select an initial status",
        variant: "destructive"
      });
      return;
    }

    // Validate budget if provided
    if (formData.budget && isNaN(parseFloat(formData.budget))) {
      toast({
        title: "Validation Error",
        description: "Budget must be a valid number",
        variant: "destructive"
      });
      return;
    }

    // Validate priority values match backend expectations
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(formData.priority)) {
      toast({
        title: "Validation Error",
        description: "Invalid priority value",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);
      await Promise.resolve(onSubmit({ ...formData, teamMembers: selectedTeamMembers, dueDate: date }));
      onOpenChange(false);
      // Reset form after successful submission
      setFormData({
        title: "",
        description: "",
        priority: "",
        status: "",
        projectManager: "",
        budget: ""
      });
      setSelectedTeamMembers([]);
      setDate(undefined);
    } catch (error) {
      // Keep dialog open; parent handles error toast
      console.error('Project creation failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Project
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <form onSubmit={handleSubmit} className="space-y-4 px-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                placeholder="Enter project title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectManager">Project Manager *</Label>
              <Select 
                value={formData.projectManager} 
                onValueChange={(value) => handleInputChange("projectManager", value)}
                disabled={loading || submitting}
              >
                <SelectTrigger disabled={loading || submitting}>
                  <SelectValue placeholder={loading ? "Loading project managers..." : "Select project manager"} />
                </SelectTrigger>
                <SelectContent>
                  {projectManagers.map((manager) => (
                    <SelectItem key={manager._id} value={manager._id}>
                      {manager.firstName} {manager.lastName} ({manager.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Project Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the project objectives and scope"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={3}
              required
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                <SelectTrigger disabled={submitting}>
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
              <Label htmlFor="status">Initial Status *</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                <SelectTrigger disabled={submitting}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not-started">Not Started</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Budget (optional)</Label>
              <Input
                id="budget"
                placeholder="$0"
                value={formData.budget}
                onChange={(e) => handleInputChange("budget", e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Due Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                  disabled={submitting}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a due date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Team Members Section */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-base">
                <UsersIcon className="h-4 w-4" />
                Team Members (Optional)
              </Label>
              <Badge variant="secondary">{selectedTeamMembers.length} selected</Badge>
            </div>

            {/* Selected Members Pills */}
            {selectedTeamMembers.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
                {getSelectedMemberDetails().map((member) => (
                  <Badge
                    key={member._id}
                    variant="default"
                    className="pl-2 pr-1 py-1 gap-2"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={member.avatar} alt={member.firstName} />
                      <AvatarFallback className="text-xs">
                        {member.firstName[0]}{member.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">
                      {member.firstName} {member.lastName}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeTeamMember(member._id)}
                      className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Available Members List */}
            <div className="border rounded-lg">
              <ScrollArea className="h-48">
                <div className="p-2 space-y-1">
                  {teamMembers.length > 0 ? (
                    teamMembers.map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                        onClick={() => { if (!submitting) toggleTeamMember(member._id); }}
                      >
                        <Checkbox
                          checked={selectedTeamMembers.includes(member._id)}
                          onCheckedChange={() => toggleTeamMember(member._id)}
                          disabled={submitting}
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
                          {typeof member.department === 'string' ? member.department : 'No Dept'}
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

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90" disabled={submitting} aria-busy={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </div>
        </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}