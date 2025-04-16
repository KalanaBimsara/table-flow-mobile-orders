
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider } from "@/contexts/AuthContext";
import AppHeaderWrapper from "@/components/AppHeaderWrapper";
import Index from "./pages/Index";
import Orders from "./pages/Orders";
import OrderHistory from "./pages/OrderHistory";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicOrderForm from "./pages/PublicOrderForm";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <Toaster />
            <Sonner />
            <div className="min-h-screen flex flex-col">
              <AppHeaderWrapper />
              <main className="flex-1">
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/order" element={<PublicOrderForm />} />
                  <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<Index />} />
                    <Route 
                      path="/orders" 
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'customer', 'delivery']}>
                          <Orders />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/history" 
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'customer', 'delivery']}>
                          <OrderHistory />
                        </ProtectedRoute>
                      } 
                    />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
