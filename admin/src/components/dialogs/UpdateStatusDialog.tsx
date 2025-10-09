import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";

interface UpdateStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: string;
  onStatusUpdate: (status: string) => void;
  onMarkDone: () => void;
}

const statusOptions = [
  { value: "critical", label: "Critical", className: "bg-destructive text-destructive-foreground" },
  { value: "high", label: "High", className: "bg-warning text-warning-foreground" },
  { value: "medium", label: "Medium", className: "bg-primary text-primary-foreground" },
  { value: "low", label: "Low", className: "bg-success text-success-foreground" },
];

export function UpdateStatusDialog({ 
  open, 
  onOpenChange, 
  currentStatus, 
  onStatusUpdate, 
  onMarkDone 
}: UpdateStatusDialogProps) {
  const handleStatusSelect = (status: string) => {
    onStatusUpdate(status);
    onOpenChange(false);
  };

  const handleMarkDone = () => {
    onMarkDone();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Challenge Status</DialogTitle>
          <DialogDescription>
            Choose a new status for this challenge or mark it as complete.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-3">Current Status</h4>
            <Badge className={statusOptions.find(s => s.value === currentStatus)?.className}>
              {statusOptions.find(s => s.value === currentStatus)?.label}
            </Badge>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Select New Status</h4>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((status) => (
                <Button
                  key={status.value}
                  variant="outline"
                  onClick={() => handleStatusSelect(status.value)}
                  className="justify-start"
                  disabled={status.value === currentStatus}
                >
                  <Badge className={`${status.className} mr-2`} variant="secondary">
                    {status.label}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col space-y-2">
          <Button
            onClick={handleMarkDone}
            className="w-full bg-success text-success-foreground hover:bg-success/90"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark Challenge as Done
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}