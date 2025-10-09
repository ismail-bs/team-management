import { useState, useEffect, useCallback } from 'react';

interface UseServerStatusOptions {
  checkInterval?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export const useServerStatus = (options: UseServerStatusOptions = {}) => {
  const {
    checkInterval = 30000, // Check every 30 seconds
    retryAttempts = 3,
    retryDelay = 1000,
  } = options;

  const [isServerAvailable, setIsServerAvailable] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkServerStatus = useCallback(async (): Promise<boolean> => {
    try {
      setIsChecking(true);
      
      // Try to reach the backend health endpoint or any simple endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        setIsServerAvailable(true);
        setLastChecked(new Date());
        return true;
      } else {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    } catch (error) {
      console.warn('Server status check failed:', error);
      
      // Try a few more times with delay
      for (let attempt = 1; attempt <= retryAttempts; attempt++) {
        try {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/health`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
            },
          });

          clearTimeout(timeoutId);
          
          if (response.ok) {
            setIsServerAvailable(true);
            setLastChecked(new Date());
            return true;
          }
        } catch (retryError) {
          console.warn(`Server status retry ${attempt} failed:`, retryError);
        }
      }
      
      setIsServerAvailable(false);
      setLastChecked(new Date());
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [retryAttempts, retryDelay]);

  const manualCheck = useCallback(async () => {
    return await checkServerStatus();
  }, [checkServerStatus]);

  useEffect(() => {
    // Initial check
    checkServerStatus();

    // Set up periodic checks - commented out for now
    // const interval = setInterval(checkServerStatus, checkInterval);

    // Also check when the page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkServerStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkServerStatus, checkInterval]);

  return {
    isServerAvailable,
    isServerUnavailable: !isServerAvailable,
    isChecking,
    lastChecked,
    checkServerStatus: manualCheck,
  };
};