
import { useState } from "react";
import { 
  BarChart3, 
  ShoppingCart, 
  Users, 
  ChefHat, 
  ClipboardList, 
  Timer,
  Package,
  LogOut
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { UserRole } from "@/hooks/useAuth";

interface AppSidebarProps {
  userRole: UserRole;
}

const billerMenuItems = [
  { title: "Dashboard", icon: BarChart3, active: true },
  { title: "Billing", icon: ShoppingCart },
  { title: "Bill History", icon: ClipboardList },
  { title: "Menu Items", icon: ChefHat },
];

const kitchenMenuItems = [
  { title: "Kitchen Dashboard", icon: ChefHat, active: true },
  { title: "Active Orders", icon: Timer },
  { title: "Menu Items", icon: ClipboardList },
  { title: "Inventory", icon: Package },
];

export function AppSidebar({ userRole }: AppSidebarProps) {
  const { state } = useSidebar();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState(0);

  const menuItems = userRole === 'biller' ? billerMenuItems : kitchenMenuItems;
  const roleTitle = userRole === 'biller' ? 'Biller Panel' : 'Kitchen Panel';
  const isCollapsed = state === 'collapsed';
  const isKitchenManager = userRole === 'kitchen_manager';

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleItemClick = (index: number, title: string) => {
    setActiveItem(index);
    // Navigate to different pages based on the menu item
    if (title === 'Menu Items') {
      navigate('/dashboard/menu');
    } else if (title === 'Billing') {
      navigate('/dashboard/billing');
    } else if (title === 'Bill History') {
      navigate('/dashboard/bill-history');
    } else if (title === 'Active Orders') {
      navigate('/dashboard/active-orders');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent className="bg-restaurant-dark-navy border-r border-restaurant-warm-gray/20">
        {/* Logo/Brand Section */}
        <div className="p-4 border-b border-restaurant-warm-gray/20">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isKitchenManager ? 'bg-restaurant-red' : 'bg-restaurant-accent-orange'
              }`}>
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-white">Restaurant</h2>
                <p className="text-xs text-gray-300">{roleTitle}</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="flex justify-center">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isKitchenManager ? 'bg-restaurant-red' : 'bg-restaurant-accent-orange'
              }`}>
                <ChefHat className="w-5 h-5 text-white" />
              </div>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={`${isCollapsed ? "sr-only" : ""} text-gray-400`}>
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item, index) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    onClick={() => handleItemClick(index, item.title)}
                    className={`
                      ${activeItem === index 
                        ? `${isKitchenManager ? 'bg-restaurant-red hover:bg-restaurant-red-hover' : 'bg-restaurant-accent-orange hover:bg-restaurant-accent-orange-hover'} text-white shadow-lg` 
                        : `text-gray-300 ${isKitchenManager ? 'hover:bg-restaurant-red/10 hover:text-restaurant-red' : 'hover:bg-restaurant-accent-orange/10 hover:text-restaurant-accent-orange'}`
                      }
                      transition-all duration-200 mx-2 rounded-lg
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                    {!isCollapsed && <span className="font-medium">{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout Button */}
        <div className="mt-auto p-4 border-t border-restaurant-warm-gray/20">
          <SidebarMenuButton 
            onClick={handleLogout}
            className="w-full text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors duration-200 mx-2 rounded-lg"
          >
            <LogOut className="w-5 h-5" />
            {!isCollapsed && <span className="font-medium">Logout</span>}
          </SidebarMenuButton>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
