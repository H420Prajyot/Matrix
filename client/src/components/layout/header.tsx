import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { User } from "@shared/schema";

interface HeaderProps {
  title: string;
  subtitle: string;
  user: User | null;
  bgColor?: string;
  iconColor?: string;
  icon?: React.ComponentType<any>;
  showNotifications?: boolean;
  notificationCount?: number;
}

export default function Header({ 
  title, 
  subtitle, 
  user, 
  bgColor = "bg-primary", 
  iconColor = "text-primary-foreground",
  icon: Icon,
  showNotifications = false,
  notificationCount = 0
}: HeaderProps) {
  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getInitials = (user: User | null) => {
    if (!user) return "??";
    const first = user.firstName?.charAt(0) || "";
    const last = user.lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || user.email?.charAt(0).toUpperCase() || "?";
  };

  const getDisplayName = (user: User | null) => {
    if (!user) return "Unknown User";
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email || "Unknown User";
  };

  return (
    <header className={`${bgColor} border-b border-border shadow-sm`}>
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-10 h-10 ${bgColor} rounded-full flex items-center justify-center`}>
              {Icon ? (
                <Icon className={`${iconColor} h-6 w-6`} />
              ) : (
                <svg className={`${iconColor} h-6 w-6`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              )}
            </div>
            <div>
              <h1 className={`text-xl font-bold ${iconColor}`} data-testid="text-header-title">{title}</h1>
              <p className={`text-sm ${iconColor} opacity-90`} data-testid="text-header-subtitle">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {showNotifications && (
              <Button variant="ghost" size="sm" className={`${iconColor} hover:bg-white/10 relative`} data-testid="button-notifications">
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    data-testid="badge-notification-count"
                  >
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Badge>
                )}
              </Button>
            )}
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 ${bgColor} rounded-full flex items-center justify-center border-2 border-white/20`}>
                <span className={`${iconColor} text-sm font-medium`} data-testid="text-user-initials">
                  {getInitials(user)}
                </span>
              </div>
              <span className={`text-sm font-medium ${iconColor}`} data-testid="text-user-name">
                {getDisplayName(user)}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className={`${iconColor} hover:bg-white/10`}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
