
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import AppHeader from "@/components/AppHeader";
import Index from "./pages/Index";
import Orders from "./pages/Orders";
import OrderHistory from "./pages/OrderHistory";
import UserManagement from "./pages/UserManagement";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import AdminSetup from "./components/AdminSetup";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

// Protected route component
const ProtectedRoute = ({ 
  children, 
  requiredRole 
}: { 
  children: React.ReactNode;
  requiredRole?: 'admin' | 'delivery' | 'customer';
}) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex h-screen w-full items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Auth route - redirects to dashboard if already logged in
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex h-screen w-full items-center justify-center">Loading...</div>;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Setup route - checks if we need to create the first admin user
const SetupRoute = ({ children }: { children: React.ReactNode }) => {
  const [needsSetup, setNeedsSetup] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkForAdmin = async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');
      
      if (error) {
        console.error('Error checking for admin:', error);
      } else {
        setNeedsSetup(count === 0);
      }
      
      setLoading(false);
    };

    checkForAdmin();
  }, []);

  if (loading) {
    return <div className="flex h-screen w-full items-center justify-center">Loading...</div>;
  }

  if (needsSetup) {
    return <AdminSetup />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route 
        path="/setup" 
        element={<SetupRoute><Navigate to="/auth" replace /></SetupRoute>} 
      />
      <Route 
        path="/auth" 
        element={
          <SetupRoute>
            <AuthRoute><Auth /></AuthRoute>
          </SetupRoute>
        } 
      />
      <Route 
        path="/" 
        element={
          <SetupRoute>
            <ProtectedRoute>
              <div className="min-h-screen flex flex-col">
                <AppHeader />
                <main className="flex-1">
                  <Index />
                </main>
              </div>
            </ProtectedRoute>
          </SetupRoute>
        } 
      />
      <Route 
        path="/orders" 
        element={
          <SetupRoute>
            <ProtectedRoute>
              <div className="min-h-screen flex flex-col">
                <AppHeader />
                <main className="flex-1">
                  <Orders />
                </main>
              </div>
            </ProtectedRoute>
          </SetupRoute>
        } 
      />
      <Route 
        path="/history" 
        element={
          <SetupRoute>
            <ProtectedRoute>
              <div className="min-h-screen flex flex-col">
                <AppHeader />
                <main className="flex-1">
                  <OrderHistory />
                </main>
              </div>
            </ProtectedRoute>
          </SetupRoute>
        } 
      />
      <Route 
        path="/users" 
        element={
          <SetupRoute>
            <ProtectedRoute requiredRole="admin">
              <div className="min-h-screen flex flex-col">
                <AppHeader />
                <main className="flex-1">
                  <UserManagement />
                </main>
              </div>
            </ProtectedRoute>
          </SetupRoute>
        } 
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
