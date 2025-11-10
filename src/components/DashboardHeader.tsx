
import { Bell, Search, User, ChevronDown, LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/hooks/useAuth";

interface DashboardHeaderProps {
  userRole: UserRole;
}

export const DashboardHeader = ({ userRole }: DashboardHeaderProps) => {
  const { signOut } = useAuth();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const roleTitle = userRole === 'biller' ? 'Biller Dashboard' : 'Kitchen Manager Dashboard';
  const userName = userRole === 'biller' ? 'JAF HOT' : 'Chef Sarah';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setShowProfileDropdown(false);
  };

  return (
    <header className="bg-gradient-to-r from-restaurant-dark-navy to-restaurant-warm-gray border-b border-restaurant-gray/20 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <SidebarTrigger className="text-white/80 hover:text-restaurant-accent-orange transition-colors hidden md:block" />
          <div>
            <h1 className="text-xl font-semibold text-white">{roleTitle}</h1>
            <p className="text-sm text-white/70">Welcome back, {userName}!</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-restaurant-gray w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 border border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-restaurant-accent-orange/20 focus:border-restaurant-accent-orange bg-white/10 text-white placeholder:text-white/50"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 text-white/80 hover:text-restaurant-accent-orange transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-restaurant-red rounded-full"></span>
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            >
              <div className="w-8 h-8 bg-restaurant-accent-orange rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="hidden md:block text-white font-medium">{userName}</span>
              <ChevronDown className={`w-4 h-4 text-white/80 transition-transform duration-200 ${showProfileDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showProfileDropdown && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-lg shadow-lg z-50">
                <div className="p-3 border-b border-border">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-restaurant-accent-orange rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{userName}</p>
                      <p className="text-sm text-muted-foreground">
                        {userRole === 'biller' ? 'Biller' : 'Kitchen Manager'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-2">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-muted rounded-lg transition-colors group"
                  >
                    <LogOut className="w-5 h-5 text-muted-foreground group-hover:text-destructive" />
                    <span className="text-foreground group-hover:text-destructive font-medium">Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
