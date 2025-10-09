import { ReactNode } from "react";
import { TeamSidebar } from "./TeamSidebar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <TeamSidebar />
      
      {/* Main Content - Add left margin on desktop to account for fixed sidebar */}
      <main className="lg:pl-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
