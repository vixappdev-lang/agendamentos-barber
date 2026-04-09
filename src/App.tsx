import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import PrizeWheelConfig from "./pages/admin/PrizeWheelConfig";
import ChatProConfig from "./pages/admin/ChatProConfig";
import Navigation from "./pages/Navigation";
import BaixarSource from "./pages/BaixarSource";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/navegacao" element={<Navigation />} />
          <Route path="/baixar-source" element={<BaixarSource />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="services" element={<Services />} />
            <Route path="barbers" element={<Barbers />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="coupons" element={<Coupons />} />
            <Route path="store" element={<StoreDashboard />} />
            <Route path="prize-wheel" element={<PrizeWheelConfig />} />
            <Route path="confg" element={<ChatProConfig />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
