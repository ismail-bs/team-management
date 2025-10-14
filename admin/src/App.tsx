import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { ServerStatusBanner } from "@/components/ServerStatusBanner";
import { useServerStatus } from "@/hooks/useServerStatus";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import AcceptInvite from "./pages/AcceptInvite";
import Dashboard from "./pages/Dashboard";
import ProgressTracker from "./pages/ProgressTracker";
import Meetings from "./pages/Meetings";
import TeamChat from "./pages/TeamChat";
import DocumentHub from "./pages/DocumentHub";
import TeamMembers from "./pages/TeamMembers";
import UserManagement from "./pages/UserManagement";
import AccountSettings from "./pages/AccountSettings";
import Departments from "./pages/Departments";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (replaces cacheTime)
    },
    mutations: {
      retry: 0,
    },
  },
});

const AppContent = () => {
  const { isServerUnavailable, checkServerStatus } = useServerStatus();

  return (
    <>
      <ServerStatusBanner 
        isServerUnavailable={isServerUnavailable}
        onRetry={checkServerStatus}
      />
      <div className={isServerUnavailable ? 'pt-16' : ''}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute><ProgressTracker /></ProtectedRoute>} />
          <Route path="/progress-tracker" element={<ProtectedRoute><ProgressTracker /></ProtectedRoute>} />
          <Route path="/meetings" element={<ProtectedRoute><Meetings /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><TeamChat /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute><DocumentHub /></ProtectedRoute>} />
          <Route path="/document-hub" element={<ProtectedRoute><DocumentHub /></ProtectedRoute>} />
          <Route path="/team" element={<ProtectedRoute><TeamMembers /></ProtectedRoute>} />
          <Route path="/departments" element={<ProtectedRoute><Departments /></ProtectedRoute>} />
          <Route path="/user-management" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <ChatProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </ChatProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
