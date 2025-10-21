import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Users,
  Loader2,
  Search
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [formData, setFormData] = useState({ name: "" });

  useEffect(() => {
    loadDepartments();
  }, []);

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

  const handleStartAdd = () => {
    setIsAddMode(true);
    setEditingDept(null);
    setFormData({ name: "" });
  };

  const handleStartEdit = (dept: Department) => {
    setIsAddMode(false);
    setEditingDept(dept);
    setFormData({ name: dept.name });
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
        await apiClient.updateDepartment(editingDept?._id, {
          name: formData.name.trim()
        });
        toast({
          title: "Success",
          description: "Department updated successfully"
        });
      }

      handleCancelEdit();
      await loadDepartments();
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
      await apiClient.deleteDepartment(deletingDept?._id);
      
      toast({
        title: "Success",
        description: "Department deleted successfully"
      });
      
      setDeletingDept(null);
      await loadDepartments();
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

  // Filter departments by search term
  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && departments.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Departments</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">
              Manage company departments and organizational structure
            </p>
          </div>
          <Button 
            onClick={handleStartAdd}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Department
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Departments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{departments.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Departments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {departments.filter(d => d.isActive).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {departments.reduce((sum, d) => sum + d.employeeCount, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search departments..." 
                className="pl-10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Departments List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            All Departments ({filteredDepartments.length})
          </h2>

          {filteredDepartments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDepartments.map((dept) => (
                <Card
                  key={dept?._id}
                  className="hover:shadow-lg transition-all border-l-4 border-l-blue-500"
                >
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900 mb-2">
                            {dept.name}
                          </h3>
                          <Badge variant="secondary" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {dept.employeeCount} employees
                          </Badge>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartEdit(dept)}
                          className="flex-1"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeletingDept(dept)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  {searchTerm ? "No departments found" : "No departments yet"}
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  {searchTerm 
                    ? "Try adjusting your search criteria" 
                    : "Create your first department to organize your team"
                  }
                </p>
                {!searchTerm && (
                  <Button onClick={handleStartAdd} className="bg-gradient-to-r from-blue-600 to-purple-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Department
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddMode || !!editingDept} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {isAddMode ? "Add New Department" : "Edit Department"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Department Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Engineering, Marketing, Sales"
                value={formData.name}
                onChange={(e) => setFormData({ name: e.target.value })}
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Department names must be unique
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  isAddMode ? "Create Department" : "Update Department"
                )}
              </Button>
            </DialogFooter>
          </form>
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
                  They will need to be reassigned to other departments.
                </span>
              )}
              This action cannot be undone.
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
              Delete Department
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

