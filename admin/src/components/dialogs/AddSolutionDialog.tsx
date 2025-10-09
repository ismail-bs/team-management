import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lightbulb } from "lucide-react";

interface SolutionFormData {
  title: string;
  description: string;
  priority: string;
  estimatedEffort: string;
  requiredResources: string;
  implementation: string;
  challengeId: string;
}

interface AddSolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (solutionData: SolutionFormData) => void;
  challengeId: string;
  challengeTitle: string;
}

export function AddSolutionDialog({ open, onOpenChange, onSubmit, challengeId, challengeTitle }: AddSolutionDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "",
    estimatedEffort: "",
    requiredResources: "",
    implementation: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData, challengeId });
    onOpenChange(false);
    setFormData({
      title: "",
      description: "",
      priority: "",
      estimatedEffort: "",
      requiredResources: "",
      implementation: ""
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Add Solution for "{challengeTitle}"
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Solution Title *</Label>
            <Input
              id="title"
              placeholder="Brief description of the solution"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Detailed Description *</Label>
            <Textarea
              id="description"
              placeholder="Explain the solution in detail..."
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High - Quick fix</SelectItem>
                  <SelectItem value="medium">Medium - Good solution</SelectItem>
                  <SelectItem value="low">Low - Alternative option</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedEffort">Estimated Effort</Label>
              <Select value={formData.estimatedEffort} onValueChange={(value) => handleInputChange("estimatedEffort", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select effort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (1-2 hours)</SelectItem>
                  <SelectItem value="medium">Medium (1-2 days)</SelectItem>
                  <SelectItem value="high">High (1+ week)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="requiredResources">Required Resources</Label>
            <Input
              id="requiredResources"
              placeholder="Team members, tools, or budget needed"
              value={formData.requiredResources}
              onChange={(e) => handleInputChange("requiredResources", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="implementation">Implementation Steps</Label>
            <Textarea
              id="implementation"
              placeholder="Step-by-step implementation plan..."
              value={formData.implementation}
              onChange={(e) => handleInputChange("implementation", e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-primary hover:opacity-90">
              Add Solution
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}