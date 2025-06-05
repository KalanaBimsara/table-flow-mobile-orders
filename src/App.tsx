
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Orders from "./pages/Orders";
import OrderHistory from "./pages/OrderHistory";
import Production from "./pages/Production";
import Auth from "./pages/Auth";
import PublicOrderForm from "./pages/PublicOrderForm";
import InsightsDashboard from "./pages/InsightsDashboard";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import { AppProvider } from "./contexts/AppContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppHeaderWrapper from "./components/AppHeaderWrapper";
import "./App.css";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <AuthProvider>
              <AppProvider>
                <div className="min-h-screen bg-background font-sans antialiased">
                  <Routes>
                    <Route path="/auth" element={<ProtectedRoute public><Auth /></ProtectedRoute>} />
                    <Route path="/order" element={<ProtectedRoute public><PublicOrderForm /></ProtectedRoute>} />
                    <Route element={<AppHeaderWrapper />}>
                      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                      <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                      <Route path="/history" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
                      <Route path="/production" element={<ProtectedRoute allowedRoles={['admin']}><Production /></ProtectedRoute>} />
                      <Route path="/insights" element={<ProtectedRoute allowedRoles={['admin']}><InsightsDashboard /></ProtectedRoute>} />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </div>
              </AppProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
