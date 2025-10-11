import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Settings } from "lucide-react";
import { apiClient } from "@/lib/api";
import { DepartmentManagementDialog } from "./DepartmentManagementDialog";

interface InviteMemberData {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
}

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (memberData: InviteMemberData) => void;
}

export function InviteMemberDialog({ open, onOpenChange, onSubmit }: InviteMemberDialogProps) {
  const [departments, setDepartments] = useState<Array<{_id: string; name: string}>>([]);
  const [deptManagementOpen, setDeptManagementOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "member",
    department: ""
  });

  useEffect(() => {
    if (open) {
      loadDepartments();
    }
  }, [open]);

  const loadDepartments = async () => {
    try {
      const response = await apiClient.getDepartments();
      setDepartments(response);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.email || !formData.email.includes('@')) {
      return;
    }
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      return;
    }
    if (!formData.department.trim()) {
      return;
    }
    
    try {
      // Call parent's onSubmit to handle the API call
      onSubmit(formData);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        email: "",
        firstName: "",
        lastName: "",
        role: "member",
        department: ""
      });
    } catch (error) {
      console.error('Error inviting member:', error);
      // Error handling is done by parent component
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="member@company.com"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)} required>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="project_manager">Project Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="department">Department *</Label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setDeptManagementOpen(true)}
                className="h-7 text-xs"
              >
                <Settings className="h-3.5 w-3.5 mr-1" />
                Manage
              </Button>
            </div>
            <Select value={formData.department} onValueChange={(value) => handleInputChange("department", value)} required>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.length > 0 ? (
                  departments.map((dept) => (
                    <SelectItem key={dept._id} value={dept._id}>
                      {dept.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No departments available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-primary hover:opacity-90">
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* Department Management Dialog */}
    <DepartmentManagementDialog
      open={deptManagementOpen}
      onOpenChange={setDeptManagementOpen}
      onDepartmentChange={loadDepartments}
    />
  </>
  );
}