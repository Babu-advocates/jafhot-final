
import { Toaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'white',
              color: '#333',
              border: '1px solid #e5e5e5',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '500',
              padding: '12px 16px',
              boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.1)',
            },
            success: {
              style: {
                background: 'white',
                color: '#22c55e',
                border: '1px solid #22c55e',
              },
            },
            error: {
              style: {
                background: 'white',
                color: '#ef4444',
                border: '1px solid #ef4444',
              },
            },
          }}
        />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/menu" element={<Dashboard />} />
            <Route path="/dashboard/billing" element={<Dashboard />} />
            <Route path="/dashboard/bill-history" element={<Dashboard />} />
            <Route path="/dashboard/active-orders" element={<Dashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
