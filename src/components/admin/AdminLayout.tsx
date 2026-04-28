import { useEffect, useState } from "react";
import { useNavigate, useLocation, Outlet, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeColors } from "@/hooks/useThemeColors";
import {
  LayoutDashboard,
  Scissors,
  CalendarDays,
  Tag,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Users,
  Settings,
  ShoppingBag,
  MessageSquare,
  Wallet,
  Building2,
  Star,
} from "lucide-react";
import { isSuperAdmin } from "@/lib/superAdmin";
import { clearAdminMysqlSession, getAdminMysqlSession } from "@/lib/adminMysqlSession";

interface NavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  superAdminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { label: "Financeiro", path: "/admin/finance", icon: Wallet },
  { label: "Serviços", path: "/admin/services", icon: Scissors },
  { label: "Loja", path: "/admin/store", icon: ShoppingBag },
  { label: "Barbeiros", path: "/admin/barbers", icon: Users },
  { label: "Agendamentos", path: "/admin/appointments", icon: CalendarDays },
  { label: "Cupons", path: "/admin/coupons", icon: Tag },
  { label: "Avaliações", path: "/admin/reviews", icon: Star },
  { label: "ChatPro", path: "/admin/confg", icon: MessageSquare },
  { label: "Perfis Barbearias", path: "/admin/barbershops", icon: Building2, superAdminOnly: true },
  { label: "Configurações", path: "/admin/settings", icon: Settings },
];

const AdminLayout = () => {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const t = useThemeColors();

  useEffect(() => {
    const checkAdmin = async () => {
      const mysqlSession = getAdminMysqlSession();
      if (mysqlSession) {
        setUserEmail(mysqlSession.email);
        setLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin/login"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin");
      if (!roles || roles.length === 0) { await supabase.auth.signOut(); navigate("/admin/login"); return; }
      setUserEmail(session.user.email ?? null);
      setLoading(false);
    };
    checkAdmin();
  }, [navigate]);

  // Pré-carrega chunks das rotas admin em background (após sessão validada)
  useEffect(() => {
    if (loading) return;
    const idle = (cb: () => void) =>
      "requestIdleCallback" in window
        ? (window as any).requestIdleCallback(cb, { timeout: 2000 })
        : setTimeout(cb, 800);
    idle(() => {
      void import("@/pages/admin/Dashboard");
      void import("@/pages/admin/Services");
      void import("@/pages/admin/Barbers");
      void import("@/pages/admin/Appointments");
      void import("@/pages/admin/Coupons");
      void import("@/pages/admin/StoreDashboard");
      void import("@/pages/admin/Finance");
      void import("@/pages/admin/ChatProConfig");
      void import("@/pages/admin/Reviews");
      void import("@/pages/admin/Settings");
      if (isSuperAdmin(userEmail)) {
        void import("@/pages/admin/Barbershops");
      }
    });
  }, [loading, userEmail]);

  const mysqlSession = getAdminMysqlSession();
  const visibleNavItems = navItems.filter((it) => {
    if (it.superAdminOnly) return isSuperAdmin(userEmail);
    if (!mysqlSession?.permissions) return true;
    const key = it.path === "/admin" ? "dashboard" : it.path.split("/").pop();
    if (key === "confg") return mysqlSession.permissions.chatpro !== false;
    return mysqlSession.permissions[key || ""] !== false;
  });

  const handleLogout = async () => { clearAdminMysqlSession(); await supabase.auth.signOut(); navigate("/admin/login"); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: t.pageBgAlt }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'hsl(245 60% 55%)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: t.pageBgAlt }}>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      <motion.aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: t.sidebarBg, borderRight: `1px solid ${t.border}` }}>
        <div className="p-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${t.border}` }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'hsl(245 60% 55% / 0.15)', border: '1px solid hsl(245 60% 55% / 0.3)' }}>
              <Scissors className="w-4 h-4" style={{ color: 'hsl(245 60% 70%)' }} />
            </div>
            <span className="font-bold text-sm text-foreground">Admin Panel</span>
          </div>
          <button className="lg:hidden text-muted-foreground" onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                style={isActive ? { background: 'hsl(245 60% 55% / 0.1)', border: '1px solid hsl(245 60% 55% / 0.15)' } : { border: '1px solid transparent' }}>
                <item.icon className="w-4 h-4" />
                {item.label}
                {isActive && <ChevronRight className="w-3 h-3 ml-auto" style={{ color: 'hsl(245 60% 65%)' }} />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3" style={{ borderTop: `1px solid ${t.border}` }}>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive transition-all duration-200"
            style={{ border: '1px solid transparent' }}>
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </motion.aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 py-4"
          style={{ background: t.headerBg, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${t.border}` }}>
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="w-5 h-5 text-foreground" /></button>
          <h1 className="text-lg sm:text-xl font-bold text-foreground">
            {location.pathname === "/admin" ? (() => {
              const hour = new Date().getHours();
              const greeting = hour >= 5 && hour < 12 ? "Bom dia" : hour >= 12 && hour < 18 ? "Boa tarde" : hour >= 18 && hour < 24 ? "Boa noite" : "Boa madrugada";
              return `${greeting}, Admin.`;
            })() : navItems.find((i) => i.path === location.pathname)?.label || "Admin"}
          </h1>
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-auto"><Outlet /></main>
      </div>
    </div>
  );
};

export default AdminLayout;
