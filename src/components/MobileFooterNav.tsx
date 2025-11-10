import { Home, ClipboardList, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MobileFooterNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      toast.error('Failed to logout', {
        style: {
          background: 'white',
          color: '#333',
          border: '1px solid #e5e5e5',
          padding: '16px',
          fontSize: '14px',
          fontWeight: '500',
        },
      });
    }
  };

  const navItems = profile?.role === 'kitchen_manager' ? [
    {
      icon: Home,
      label: "Kitchen",
      path: "/dashboard",
      active: location.pathname === "/dashboard",
      action: () => navigate("/dashboard")
    },
    {
      icon: ClipboardList,
      label: "Active Orders",
      path: "/dashboard/active-orders",
      active: location.pathname === "/dashboard/active-orders",
      action: () => navigate("/dashboard/active-orders")
    }
  ] : [
    {
      icon: Home,
      label: "Dashboard",
      path: "/dashboard",
      active: location.pathname === "/dashboard",
      action: () => navigate("/dashboard")
    },
    {
      icon: ClipboardList,
      label: "Billing",
      path: "/dashboard/billing",
      active: location.pathname === "/dashboard/billing",
      action: () => navigate("/dashboard/billing")
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-card border-t-2 border-gray-200 dark:border-border z-50 md:hidden shadow-xl">
      <div className="flex items-center justify-around py-2 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.label}
              variant="ghost"
              size="sm"
              className={`flex flex-col items-center gap-0.5 h-auto py-2 px-2 rounded-xl transition-all duration-300 flex-1 mx-0.5 ${
                item.active
                  ? "bg-gradient-to-br from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg transform scale-105"
                  : "text-gray-600 hover:text-red-600 hover:bg-red-50"
              }`}
              onClick={item.action}
            >
              <Icon className={`w-5 h-5 ${item.active ? "text-white" : ""} transition-colors`} />
              <span className={`text-[9px] font-bold mt-0.5 ${item.active ? "text-white" : ""} whitespace-nowrap`}>
                {item.label}
              </span>
            </Button>
          );
        })}
        
        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-0.5 h-auto py-2 px-2 rounded-xl transition-all duration-300 flex-1 mx-0.5 text-gray-600 hover:text-red-600 hover:bg-red-50"
            >
              <User className="w-5 h-5 transition-colors" />
              <span className="text-[9px] font-bold mt-0.5 whitespace-nowrap">Profile</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="mb-2">
            <DropdownMenuLabel>
              {profile?.full_name || "My Account"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
            >
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default MobileFooterNav;