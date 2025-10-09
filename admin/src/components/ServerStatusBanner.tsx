import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ServerStatusBannerProps {
  isServerUnavailable: boolean;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export const ServerStatusBanner: React.FC<ServerStatusBannerProps> = ({
  isServerUnavailable,
  onDismiss,
  onRetry,
}) => {
  if (!isServerUnavailable) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-destructive/90 backdrop-blur-sm">
      <Alert className="border-0 rounded-none bg-transparent text-destructive-foreground">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between w-full">
          <span className="font-medium">
            Server is currently unavailable. Some features may not work properly.
          </span>
          <div className="flex items-center gap-2 ml-4">
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="h-7 px-3 text-xs bg-background/10 border-destructive-foreground/20 hover:bg-background/20"
              >
                Retry
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-7 w-7 p-0 hover:bg-background/20"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};