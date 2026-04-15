import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./components/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Services from "./pages/admin/Services";
import Barbers from "./pages/admin/Barbers";
import Appointments from "./pages/admin/Appointments";
import Coupons from "./pages/admin/Coupons";
import Settings from "./pages/admin/Settings";
import StoreDashboard from "./pages/admin/StoreDashboard";
import Finance from "./pages/admin/Finance";
import ChatProConfig from "./pages/admin/ChatProConfig";
import Navigation from "./pages/Navigation";
import BaixarSource from "./pages/BaixarSource";
import DemoSite from "./pages/DemoSite";
import VilaNova from "./pages/VilaNova";
import MemberLogin from "./pages/MemberLogin";
import MemberArea from "./pages/MemberArea";
import MemberRouteGuard from "./components/MemberRouteGuard";
import LoginRedirectGuard from "./components/LoginRedirectGuard";
import StorePage from "./pages/StorePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ThemeProvider>
          <Routes>
            {/* Main site (GenesisBarber landing) */}
            <Route path="/" element={<VilaNova />} />
            
            {/* Direct scheduling */}
            <Route path="/agenda" element={<Index />} />
            
            {/* Store page */}
            <Route path="/loja" element={<StorePage />} />
            
            <Route path="/navegacao" element={<Navigation />} />
            <Route path="/demo-site" element={<DemoSite />} />
            
            {/* Login - redirect to member area if already authenticated */}
            <Route element={<LoginRedirectGuard />}>
              <Route path="/login" element={<MemberLogin />} />
            </Route>
            
            {/* Protected member area */}
            <Route element={<MemberRouteGuard />}>
              <Route path="/membro" element={<MemberArea />} />
            </Route>
            
            <Route path="/baixar-source" element={<BaixarSource />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="finance" element={<Finance />} />
              <Route path="services" element={<Services />} />
              <Route path="barbers" element={<Barbers />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="coupons" element={<Coupons />} />
              <Route path="store" element={<StoreDashboard />} />
              <Route path="confg" element={<ChatProConfig />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            
            {/* Legacy redirects */}
            <Route path="/vilanova" element={<VilaNova />} />
            <Route path="/vilanova/login" element={<MemberLogin />} />
            <Route path="/vilanova/membro" element={<MemberArea />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ThemeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
