import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Users
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Department {
  _id: string;
  name: string;
  description?: string;
  head?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  employeeCount: number;
  isActive: boolean;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface DepartmentManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDepartmentChange?: () => void;
}

export function DepartmentManagementDialog({ 
  open, 
  onOpenChange,
  onDepartmentChange
}: DepartmentManagementDialogProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [formData, setFormData] = useState({
    name: ""
  });

  useEffect(() => {
    if (open) {
      loadDepartments();
      loadUsers();
    }
  }, [open]);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getDepartments();
      setDepartments(response);
    } catch (error) {
      console.error('Error loading departments:', error);
      toast({
        title: "Error",
        description: "Failed to load departments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await apiClient.getUsers({ limit: 100 });
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleStartAdd = () => {
    setIsAddMode(true);
    setEditingDept(null);
    setFormData({ name: "" });
  };

  const handleStartEdit = (dept: Department) => {
    setIsAddMode(false);
    setEditingDept(dept);
    setFormData({
      name: dept.name
    });
  };

  const handleCancelEdit = () => {
    setIsAddMode(false);
    setEditingDept(null);
    setFormData({ name: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Department name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      if (isAddMode) {
        await apiClient.createDepartment({
          name: formData.name.trim()
        });
        toast({
          title: "Success",
          description: "Department created successfully"
        });
      } else if (editingDept) {
        await apiClient.updateDepartment(editingDept._id, {
          name: formData.name.trim()
        });
        toast({
          title: "Success",
          description: "Department updated successfully"
        });
      }

      handleCancelEdit();
      await loadDepartments();
      if (onDepartmentChange) onDepartmentChange();
    } catch (error: unknown) {
      console.error('=== Error saving department ===');
      console.error('Error object:', error);
      
      const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
      console.error('Error response:', axiosError?.response);
      console.error('Error response data:', axiosError?.response?.data);
      console.error('Error message:', axiosError?.response?.data?.message);
      
      let errorMessage = "Failed to save department";
      
      // Extract error message from response
      if (axiosError?.response?.data?.message) {
        errorMessage = axiosError.response.data.message;
        console.error('✅ Using backend message:', errorMessage);
      } else if (axiosError?.message) {
        errorMessage = axiosError.message;
        console.error('⚠️ Using error.message:', errorMessage);
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
    if (!deletingDept) return;

    try {
      setLoading(true);
      await apiClient.deleteDepartment(deletingDept._id);
      
      toast({
        title: "Success",
        description: "Department deleted successfully"
      });
      
      setDeletingDept(null);
      await loadDepartments();
      if (onDepartmentChange) onDepartmentChange();
    } catch (error) {
      console.error('Error deleting department:', error);
      
      let errorMessage = "Failed to delete department";
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Manage Departments
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
            <div className="space-y-6">
              {/* Add/Edit Form */}
              {(isAddMode || editingDept) && (
                <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-gray-900">
                  <CardContent className="p-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">
                          {isAddMode ? "Add New Department" : "Edit Department"}
                        </h3>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="name">Department Name *</Label>
                        <Input
                          id="name"
                          placeholder="e.g., Engineering, Marketing"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          required
                          autoFocus
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"
                        disabled={loading}
                      >
                        {loading ? "Saving..." : (isAddMode ? "Create Department" : "Update Department")}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Add Button */}
              {!isAddMode && !editingDept && (
                <Button
                  onClick={handleStartAdd}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Department
                </Button>
              )}

              {/* Departments List */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  All Departments ({departments.length})
                </h3>

                {departments.length > 0 ? (
                  <div className="space-y-2">
                    {departments.map((dept) => (
                      <Card
                        key={dept._id}
                        className="hover:shadow-md transition-all border-l-4 border-l-blue-500"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-lg">{dept.name}</h4>
                                <Badge variant="secondary" className="text-xs">
                                  <Users className="h-3 w-3 mr-1" />
                                  {dept.employeeCount} employees
                                </Badge>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartEdit(dept)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => setDeletingDept(dept)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                      <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-muted-foreground mb-4">
                        No departments yet
                      </p>
                      <Button onClick={handleStartAdd} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Department
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDept} onOpenChange={(open) => !open && setDeletingDept(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingDept?.name}</strong>?
              {deletingDept && deletingDept.employeeCount > 0 && (
                <span className="block mt-2 text-orange-600">
                  ⚠️ This department has {deletingDept.employeeCount} employee(s). 
                  It will be marked as inactive instead of being deleted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingDept(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {deletingDept && deletingDept.employeeCount > 0 ? 'Deactivate' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

