import { useState } from "react";
import { Scissors, LogOut, Menu, X, Home, CalendarDays, ScissorsIcon, Brush, Sparkles, Droplets } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { User } from "@supabase/supabase-js";

interface HeaderProps {
  user?: User | null;
  onSignOut?: () => void;
  onCategorySelect?: (category: string) => void;
}

const menuItems = [
  { id: "inicio", label: "Início", icon: Home },
  { id: "agendamentos", label: "Meus Agendamentos", icon: CalendarDays },
  { id: "cabelo", label: "Cabelo", icon: ScissorsIcon },
  { id: "barba", label: "Barba", icon: Brush },
  { id: "extras", label: "Extras", icon: Sparkles },
];

const Header = ({ user, onSignOut, onCategorySelect }: HeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleMenuClick = (id: string) => {
    if (id === "inicio") {
      onCategorySelect?.("all");
    } else if (["cabelo", "barba", "extras"].includes(id)) {
      onCategorySelect?.(id);
    }
    // "agendamentos" - future feature
    setMenuOpen(false);
  };

  return (
    <>
      <header className="w-full sticky top-0 z-50" style={{
        background: 'hsl(0 0% 100% / 0.03)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid hsl(0 0% 100% / 0.06)',
      }}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center shadow-lg" style={{ boxShadow: '0 4px 20px hsl(245 60% 55% / 0.25)' }}>
              <Scissors className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">SuaBarbearia</h1>
              <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase -mt-0.5">Premium Grooming</p>
            </div>
          </div>

          {user && (
            <button
              onClick={() => setMenuOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground transition-all"
              style={{ background: 'hsl(0 0% 100% / 0.04)', border: '1px solid hsl(0 0% 100% / 0.06)' }}
            >
              <img
                src={user.user_metadata?.avatar_url}
                alt=""
                className="w-6 h-6 rounded-full"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <Menu className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Side Menu Drawer */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60]"
              style={{ background: 'hsl(0 0% 0% / 0.5)', backdropFilter: 'blur(4px)' }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-[70] w-72 flex flex-col"
              style={{
                background: 'hsl(230 18% 10%)',
                borderLeft: '1px solid hsl(0 0% 100% / 0.08)',
              }}
            >
              {/* Menu Header */}
              <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid hsl(0 0% 100% / 0.06)' }}>
                <div className="flex items-center gap-3">
                  <img
                    src={user?.user_metadata?.avatar_url}
                    alt=""
                    className="w-10 h-10 rounded-full"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {user?.user_metadata?.full_name || "Usuário"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <button onClick={() => setMenuOpen(false)} className="p-2 rounded-xl" style={{ background: 'hsl(0 0% 100% / 0.05)' }}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Menu Items */}
              <nav className="flex-1 p-3 space-y-1">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-foreground/80 transition-all hover:text-foreground"
                    style={{ background: 'transparent' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'hsl(0 0% 100% / 0.05)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <item.icon className="w-4.5 h-4.5 text-muted-foreground" />
                    {item.label}
                  </button>
                ))}
              </nav>

              {/* Sign Out */}
              <div className="p-4" style={{ borderTop: '1px solid hsl(0 0% 100% / 0.06)' }}>
                <button
                  onClick={() => { onSignOut?.(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{ color: 'hsl(0 60% 60%)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'hsl(0 60% 50% / 0.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <LogOut className="w-4.5 h-4.5" />
                  Sair da conta
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
