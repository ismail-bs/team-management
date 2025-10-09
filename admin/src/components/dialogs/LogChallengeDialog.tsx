import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Loader2 } from "lucide-react";
import { apiClient, User } from "@/lib/api";

interface LogChallengeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (challenge: ChallengeFormData) => void;
}

interface ChallengeFormData {
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee: string;
  project: string;
  solutions: string[];
}

export function LogChallengeDialog({ open, onOpenChange, onSubmit }: LogChallengeDialogProps) {
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [formData, setFormData] = useState<ChallengeFormData>({
    title: "",
    description: "",
    status: "medium",
    priority: "medium",
    assignee: "",
    project: "",
    solutions: [""],
  });

  useEffect(() => {
    if (open) {
      loadTeamMembers();
    }
  }, [open]);

  const loadTeamMembers = async () => {
    try {
      setLoadingMembers(true);
      const response = await apiClient.getUsers({ limit: 100 });
      setTeamMembers(response.data || []);
    } catch (error) {
      console.error('Error loading team members:', error);
      setTeamMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filteredSolutions = formData.solutions.filter(solution => solution.trim() !== "");
    onSubmit({
      ...formData,
      solutions: filteredSolutions,
    });
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      status: "medium",
      priority: "medium",
      assignee: "",
      project: "",
      solutions: [""],
    });
  };

  const addSolution = () => {
    setFormData(prev => ({
      ...prev,
      solutions: [...prev.solutions, ""]
    }));
  };

  const removeSolution = (index: number) => {
    setFormData(prev => ({
      ...prev,
      solutions: prev.solutions.filter((_, i) => i !== index)
    }));
  };

  const updateSolution = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      solutions: prev.solutions.map((solution, i) => i === index ? value : solution)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log New Challenge</DialogTitle>
          <DialogDescription>
            Create a new challenge entry to track issues and blockers.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Brief challenge title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project">Project *</Label>
              <Input
                id="project"
                value={formData.project}
                onChange={(e) => setFormData(prev => ({ ...prev, project: e.target.value }))}
                placeholder="Related project name"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed description of the challenge..."
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignee">Assignee *</Label>
              <Select 
                value={formData.assignee} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, assignee: value }))}
                disabled={loadingMembers}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingMembers ? "Loading members..." : "Select assignee"} />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member._id} value={member._id}>
                      {member.firstName} {member.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Possible Solutions</Label>
              <Button type="button" variant="outline" size="sm" onClick={addSolution}>
                <Plus className="h-4 w-4 mr-2" />
                Add Solution
              </Button>
            </div>
            {formData.solutions.map((solution, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={solution}
                  onChange={(e) => updateSolution(index, e.target.value)}
                  placeholder="Describe a possible solution..."
                />
                {formData.solutions.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeSolution(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-primary hover:opacity-90">
              Log Challenge
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}