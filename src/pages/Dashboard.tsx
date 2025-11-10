
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardContent } from "@/components/DashboardContent";
import MenuManagement from "./MenuManagement";
import Billing from "./Billing";
import BillHistory from "./BillHistory";
import ActiveOrders from "./ActiveOrders";
import MobileFooterNav from "@/components/MobileFooterNav";
import { useAuth } from "@/hooks/useAuth";

const Dashboard = () => {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    if (!loading && !profile) {
      navigate('/');
      return;
    }
  }, [profile, navigate, loading]);

  useEffect(() => {
    // Update current page based on route
    if (location.pathname.includes('/menu')) {
      setCurrentPage('menu');
    } else if (location.pathname.includes('/billing')) {
      setCurrentPage('billing');
    } else if (location.pathname.includes('/bill-history')) {
      setCurrentPage('bill-history');
    } else if (location.pathname.includes('/active-orders')) {
      setCurrentPage('active-orders');
    } else {
      setCurrentPage('dashboard');
    }
  }, [location.pathname]);

  const renderContent = () => {
    if (currentPage === 'menu') {
      return <MenuManagement />;
    } else if (currentPage === 'billing') {
      return <Billing />;
    } else if (currentPage === 'bill-history') {
      return <BillHistory />;
    } else if (currentPage === 'active-orders') {
      return <ActiveOrders />;
    }
    return <DashboardContent userRole={profile!.role} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-restaurant-warm-bg">
        <div className="text-restaurant-gray text-xl">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-restaurant-warm-bg">
        <div className="hidden md:block">
          <AppSidebar userRole={profile.role} />
        </div>
        <div className="flex-1 flex flex-col bg-restaurant-light-cream">
          <DashboardHeader userRole={profile.role} />
          <main className="flex-1 p-3 md:p-6 bg-restaurant-light-cream pb-16 md:pb-6">
            {renderContent()}
          </main>
          <MobileFooterNav />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
