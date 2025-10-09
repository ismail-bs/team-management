import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  title: string;
  description: string;
  progress: number;
  status: "active" | "completed" | "paused" | "planning";
  dueDate: string;
  teamMembers: { id: string; name: string; avatar?: string }[];
  priority: "high" | "medium" | "low";
}

const statusConfig = {
  active: { label: "Active", className: "bg-success text-success-foreground" },
  completed: { label: "Completed", className: "bg-primary text-primary-foreground" },
  paused: { label: "Paused", className: "bg-warning text-warning-foreground" },
  planning: { label: "Planning", className: "bg-secondary text-secondary-foreground" },
};

const priorityConfig = {
  high: { className: "border-l-destructive" },
  medium: { className: "border-l-warning" },
  low: { className: "border-l-success" },
};

/**
 * Reusable project card component for displaying project summary
 * 
 * Features:
 * - Visual status indication with colored badges
 * - Priority indicators (high, medium, low, urgent)
 * - Progress bar with percentage
 * - Team member avatars with overlap effect
 * - Due date display
 * - Responsive layout
 * - Hover effects for better UX
 * 
 * Used in: Dashboard, ProgressTracker pages
 */
export function ProjectCard({ 
  title, 
  description, 
  progress, 
  status, 
  dueDate, 
  teamMembers, 
  priority 
}: ProjectCardProps) {
  const statusStyle = statusConfig[status];
  const priorityStyle = priorityConfig[priority];

  return (
    <Card className={cn(
      "shadow-soft hover:shadow-medium transition-all duration-300 border-l-4 group",
      priorityStyle.className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
            {title}
          </CardTitle>
          <Badge variant="secondary" className={statusStyle.className}>
            {statusStyle.label}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{dueDate}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="flex -space-x-2">
              {teamMembers.slice(0, 3).map((member) => (
                <Avatar key={member.id} className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={member.avatar} alt={member.name} />
                  <AvatarFallback className="text-xs">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
              ))}
              {teamMembers.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground">
                    +{teamMembers.length - 3}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}