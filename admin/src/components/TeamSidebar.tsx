import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { 
  BarChart3, 
  Calendar, 
  MessageSquare, 
  FolderOpen, 
  Users, 
  UserCog,
  Building2,
  Menu,
  X,
  LogOut,
  Settings,
  Home
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Progress Tracker", href: "/progress-tracker", icon: BarChart3 },
  { name: "Meetings", href: "/meetings", icon: Calendar },
  { name: "Team Chat", href: "/chat", icon: MessageSquare },
  { name: "Document Hub", href: "/documents", icon: FolderOpen },
  // { name: "Team Members", href: "/team", icon: Users }, // Hidden - use User Management instead
  { name: "Departments", href: "/departments", icon: Building2, adminOnly: true },
  { name: "User Management", href: "/user-management", icon: UserCog, adminOnly: true },
];

export function TeamSidebar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { totalUnread } = useChat();

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login');
    }
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };
  
  const getInitials = () => {
    if (!user) return 'U';
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U';
  };
  
  const getDisplayName = () => {
    if (!user) return 'User';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  };
  
  const getRole = () => {
    if (!user) return 'Member';
    return user.role?.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Member';
  };

  // Sidebar Content Component (reused for desktop and mobile)
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation
          .filter(item => !item.adminOnly || user?.role === 'admin')
          .map((item) => {
          const active = isActive(item.href);
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                "hover:bg-secondary/80 group",
                active && "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg",
                !active && "text-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-colors flex-shrink-0",
                active && "text-white",
                !active && "text-muted-foreground group-hover:text-foreground"
              )} />
              <span className="truncate flex-1">{item.name}</span>
              {item.name === 'Team Chat' && totalUnread > 0 && (
                <span className="ml-auto inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] px-1.5 py-0.5">
                  {totalUnread}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-3 p-2 rounded-lg transition-all duration-200 w-full hover:bg-secondary/50 group cursor-pointer"
            >
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-white">{getInitials()}</span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-foreground truncate">{getDisplayName()}</p>
                <p className="text-xs text-muted-foreground truncate">{getRole()}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <img src="/logo-no-background.png" alt="Intrq" className="h-8 w-auto" />
            <h1 className="text-base font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TeamHub
            </h1>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-9 w-9 p-0"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-72 bg-card border-r border-border transform transition-transform duration-300 lg:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo-no-background.png" alt="Intrq" className="h-6 w-auto" />
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                TeamHub
              </h1>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setMobileMenuOpen(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <SidebarContent />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-card border-r border-border z-40">
        {/* Desktop Header */}
        <div className="p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <img src="/logo-no-background.png" alt="Intrq" className="h-8 w-auto" />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                TeamHub
              </h1>
            </div>
          </div>
        </div>

        <SidebarContent />
      </div>
    </>
  );
}
