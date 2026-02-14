import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Referrals from "./pages/Referrals";
import Chapter from "./pages/Chapter";
import Meetings from "./pages/Meetings";

import SomosUnicos from "./pages/SomosUnicos";

import Subscriptions from "./pages/Subscriptions";
import EthicsCommittee from "./pages/EthicsCommittee";
import Admin from "./pages/Admin";
import AdminModeration from "./pages/AdminModeration";
import MyBusinessSphere from "./pages/MyBusinessSphere";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
            <Route path="/referrals" element={<ProtectedRoute><Layout><Referrals /></Layout></ProtectedRoute>} />
            <Route path="/chapter" element={<ProtectedRoute><Layout><Chapter /></Layout></ProtectedRoute>} />
            <Route path="/meetings" element={<ProtectedRoute><Layout><Meetings /></Layout></ProtectedRoute>} />
            
            <Route path="/somos-unicos" element={<ProtectedRoute><Layout><SomosUnicos /></Layout></ProtectedRoute>} />
            <Route path="/feed" element={<ProtectedRoute><Layout><SomosUnicos /></Layout></ProtectedRoute>} />
            <Route path="/rankings" element={<ProtectedRoute><Layout><SomosUnicos /></Layout></ProtectedRoute>} />
            
            <Route path="/subscriptions" element={<ProtectedRoute><Layout><Subscriptions /></Layout></ProtectedRoute>} />
            <Route path="/ethics-committee" element={<ProtectedRoute><Layout><EthicsCommittee /></Layout></ProtectedRoute>} />
            <Route path="/mi-esfera" element={<ProtectedRoute><Layout><MyBusinessSphere /></Layout></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Layout><Admin /></Layout></ProtectedRoute>} />
            <Route path="/admin/moderation" element={<ProtectedRoute><Layout><AdminModeration /></Layout></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
