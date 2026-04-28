import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

import VilaNova from "./pages/VilaNova"; // landing eager (LCP)
import MemberRouteGuard from "./components/MemberRouteGuard";
import LoginRedirectGuard from "./components/LoginRedirectGuard";

// Lazy: rotas secundárias e admin
const NotFound = lazy(() => import("./pages/NotFound"));
const Index = lazy(() => import("./pages/Index"));
const StorePage = lazy(() => import("./pages/StorePage"));
const Navigation = lazy(() => import("./pages/Navigation"));
const DemoSite = lazy(() => import("./pages/DemoSite"));
const BaixarSource = lazy(() => import("./pages/BaixarSource"));
const MemberLogin = lazy(() => import("./pages/MemberLogin"));
const MemberArea = lazy(() => import("./pages/MemberArea"));

const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Services = lazy(() => import("./pages/admin/Services"));
const Barbers = lazy(() => import("./pages/admin/Barbers"));
const Appointments = lazy(() => import("./pages/admin/Appointments"));
const Coupons = lazy(() => import("./pages/admin/Coupons"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const StoreDashboard = lazy(() => import("./pages/admin/StoreDashboard"));
const Finance = lazy(() => import("./pages/admin/Finance"));
const ChatProConfig = lazy(() => import("./pages/admin/ChatProConfig"));
const Barbershops = lazy(() => import("./pages/admin/Barbershops"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen w-full flex items-center justify-center bg-background">
    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ThemeProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Main site (eager) */}
              <Route path="/" element={<VilaNova />} />

              <Route path="/agenda" element={<Index />} />
              <Route path="/loja" element={<StorePage />} />
              <Route path="/navegacao" element={<Navigation />} />
              <Route path="/demo-site" element={<DemoSite />} />

              <Route element={<LoginRedirectGuard />}>
                <Route path="/login" element={<MemberLogin />} />
              </Route>

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
                <Route path="barbershops" element={<Barbershops />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* Legacy redirects */}
              <Route path="/vilanova" element={<VilaNova />} />
              <Route path="/vilanova/login" element={<MemberLogin />} />
              <Route path="/vilanova/membro" element={<MemberArea />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ThemeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
