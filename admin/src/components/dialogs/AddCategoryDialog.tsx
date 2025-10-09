import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Palette } from "lucide-react";

interface AddCategoryDialogProps {
  children: React.ReactNode;
}

const colorOptions = [
  { value: "bg-primary", label: "Primary", preview: "hsl(var(--primary))" },
  { value: "bg-success", label: "Success", preview: "hsl(var(--success))" },
  { value: "bg-accent", label: "Accent", preview: "hsl(var(--accent))" },
  { value: "bg-warning", label: "Warning", preview: "hsl(var(--warning))" },
  { value: "bg-destructive", label: "Destructive", preview: "hsl(var(--destructive))" },
  { value: "bg-secondary", label: "Secondary", preview: "hsl(var(--secondary))" }
];

export function AddCategoryDialog({ children }: AddCategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    color: "bg-primary"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }
    
    // Note: Category creation endpoint not yet implemented in backend
    // This is a future enhancement feature
    setOpen(false);
    
    // Reset form
    setFormData({
      name: "",
      color: "bg-primary"
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Category
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="categoryName">Category Name *</Label>
            <Input
              id="categoryName"
              placeholder="Enter category name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
            />
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Category Color *
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => handleInputChange("color", color.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    formData.color === color.value 
                      ? "border-primary shadow-md" 
                      : "border-muted hover:border-muted-foreground"
                  }`}
                >
                  <div 
                    className="w-8 h-8 rounded-full mx-auto mb-2"
                    style={{ backgroundColor: color.preview }}
                  />
                  <span className="text-xs">{color.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {formData.name && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="p-4 bg-secondary/50 rounded-lg">
                <div className={`w-12 h-12 ${formData.color} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-medium text-sm text-center">{formData.name}</h3>
                <p className="text-2xl font-bold text-foreground text-center">0</p>
                <p className="text-xs text-muted-foreground text-center">documents</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-primary hover:opacity-90">
              Add Category
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}