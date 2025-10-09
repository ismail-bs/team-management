import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  color: string;
  count: number;
}

interface CategoryManagementDialogProps {
  children: React.ReactNode;
}

const initialCategories: Category[] = [
  { id: "1", name: "Engineering", color: "bg-primary", count: 2 },
  { id: "2", name: "Design", color: "bg-accent", count: 1 },
  { id: "3", name: "Product", color: "bg-success", count: 1 },
  { id: "4", name: "Marketing", color: "bg-warning", count: 1 },
  { id: "5", name: "Sales", color: "bg-destructive", count: 1 },
];

export function CategoryManagementDialog({ children }: CategoryManagementDialogProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: "",
    color: "bg-primary"
  });

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name.trim()) return;
    
    const category: Category = {
      id: Date.now().toString(),
      name: newCategory.name,
      color: newCategory.color,
      count: 0
    };
    
    setCategories(prev => [...prev, category]);
    setNewCategory({ name: "", color: "bg-primary" });
    setShowAddForm(false);
    
    toast({
      title: "Category Added",
      description: `${category.name} has been added successfully`,
    });
  };

  const handleDeleteCategory = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    setCategories(prev => prev.filter(c => c.id !== categoryId));
    
    toast({
      title: "Category Deleted",
      description: `${category?.name} has been removed`,
    });
  };

  const colorOptions = [
    { value: "bg-primary", label: "Primary" },
    { value: "bg-accent", label: "Accent" },
    { value: "bg-success", label: "Success" },
    { value: "bg-warning", label: "Warning" },
    { value: "bg-destructive", label: "Destructive" },
    { value: "bg-secondary", label: "Secondary" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Manage Categories
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add Category Button */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Team Categories</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>

          {/* Add Category Form */}
          {showAddForm && (
            <Card>
              <CardContent className="p-4">
                <form onSubmit={handleAddCategory} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="categoryName">Category Name</Label>
                      <Input
                        id="categoryName"
                        placeholder="e.g., DevOps"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="categoryColor">Color</Label>
                      <div className="flex gap-2 flex-wrap">
                        {colorOptions.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            className={`w-8 h-8 rounded ${color.value} border-2 ${
                              newCategory.color === color.value ? 'border-foreground' : 'border-border'
                            }`}
                            onClick={() => setNewCategory(prev => ({ ...prev, color: color.value }))}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="bg-gradient-primary hover:opacity-90">
                      Add Category
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Categories List */}
          <div className="space-y-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-secondary/50"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded ${category.color}`} />
                  <span className="font-medium">{category.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {category.count} members
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteCategory(category.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}