import { useState, useEffect } from "react";
import {
  Scissors, LogOut, Menu, X, Home, CalendarDays,
  ScissorsIcon, Brush, Sparkles, Crown,
  ChevronRight, MapPin, Gift,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { supabase } from "@/integrations/supabase/client";

interface HeaderProps {
  user?: User | null;
  onSignOut?: () => void;
  onCategorySelect?: (category: string) => void;
  onDirections?: () => void;
  onOpenWheel?: () => void;
}

const menuSections = [
  {
    label: "Menu",
    items: [
      { id: "inicio", label: "Início", icon: Home },
      { id: "agendamentos", label: "Meus Agendamentos", icon: CalendarDays },
      { id: "directions", label: "Como Chegar", icon: MapPin },
    ],
  },
  {
    label: "Serviços",
    items: [
      { id: "cabelo", label: "Cabelo", icon: ScissorsIcon },
      { id: "barba", label: "Barba", icon: Brush },
      { id: "combo", label: "Combos", icon: Crown },
      { id: "extras", label: "Extras", icon: Sparkles },
    ],
  },
];

const Header = ({ user, onSignOut, onCategorySelect, onDirections, onOpenWheel }: HeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { settings } = useBusinessSettings();
  const businessName = settings.business_name || "Barbearia";
  const [wheelEnabled, setWheelEnabled] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.from("business_settings").select("value").eq("key", "prize_wheel_enabled").maybeSingle();
      setWheelEnabled(data?.value === "true");
    };
    check();
  }, []);

  const handleMenuClick = (id: string) => {
    if (id === "inicio") {
      onCategorySelect?.("all");
    } else if (id === "directions") {
      onDirections?.();
    } else if (id === "roleta") {
      onOpenWheel?.();
    } else if (["cabelo", "barba", "combo", "extras"].includes(id)) {
      onCategorySelect?.(id);
    }
    setMenuOpen(false);
  };

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Usuário";

  // Build dynamic menu sections
  const dynamicMenuSections = menuSections.map((section) => {
    if (section.label === "Menu" && wheelEnabled) {
      return {
        ...section,
        items: [
          ...section.items,
          { id: "roleta", label: "Roleta Premiada", icon: Gift },
        ],
      };
    }
    return section;
  });

  return (
    <>
      <header className="w-full sticky top-0 z-50" style={{
        background: 'hsl(0 0% 100% / 0.03)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid hsl(0 0% 100% / 0.06)',
      }}>
        <div className="container mx-auto px-3 min-[375px]:px-4 h-14 min-[375px]:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-[375px]:gap-3">
            <div className="w-9 h-9 min-[375px]:w-10 min-[375px]:h-10 rounded-xl gold-gradient flex items-center justify-center" style={{ boxShadow: '0 4px 20px hsl(45 100% 50% / 0.25)' }}>
              <Scissors className="w-4 h-4 min-[375px]:w-5 min-[375px]:h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base min-[375px]:text-lg font-bold tracking-tight text-foreground leading-tight">{businessName}</h1>
              <p className="text-[9px] min-[375px]:text-[10px] text-muted-foreground tracking-[0.2em] uppercase -mt-0.5">Premium Grooming</p>
            </div>
          </div>

          {user && (
            <button
              onClick={() => setMenuOpen(true)}
              className="flex items-center gap-2 px-2.5 min-[375px]:px-3 py-1.5 min-[375px]:py-2 rounded-xl text-xs text-muted-foreground transition-all"
              style={{ background: 'hsl(0 0% 100% / 0.04)', border: '1px solid hsl(0 0% 100% / 0.06)' }}
            >
              <img
                src={user.user_metadata?.avatar_url}
                alt=""
                className="w-6 h-6 rounded-full object-cover"
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
              style={{ background: 'hsl(0 0% 0% / 0.6)', backdropFilter: 'blur(6px)' }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed top-0 right-0 bottom-0 z-[70] w-[80vw] max-w-xs flex flex-col overflow-y-auto scrollbar-hide"
              style={{
                background: 'hsl(230 18% 9%)',
                borderLeft: '1px solid hsl(0 0% 100% / 0.08)',
              }}
            >
              {/* User Profile Header */}
              <div className="p-4 min-[375px]:p-5" style={{ borderBottom: '1px solid hsl(0 0% 100% / 0.06)' }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Menu</span>
                  <button onClick={() => setMenuOpen(false)} className="p-1.5 rounded-lg" style={{ background: 'hsl(0 0% 100% / 0.05)' }}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {user ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={user.user_metadata?.avatar_url}
                      alt=""
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-accent/30"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">
                        Olá, {firstName}!
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="glass-card p-3 text-center">
                    <p className="text-sm text-muted-foreground">Faça login para agendar</p>
                  </div>
                )}
              </div>

              {/* Menu Sections */}
              <nav className="flex-1 p-3 space-y-4">
                {dynamicMenuSections.map((section) => (
                  <div key={section.label}>
                    <p className="px-3 mb-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
                      {section.label}
                    </p>
                    <div className="space-y-0.5">
                      {section.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleMenuClick(item.id)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 min-[375px]:py-3 rounded-xl text-[13px] min-[375px]:text-sm font-medium text-foreground/75 transition-all active:scale-[0.98]"
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                          onTouchStart={(e) => { e.currentTarget.style.background = 'hsl(0 0% 100% / 0.05)'; }}
                          onTouchEnd={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'hsl(0 0% 100% / 0.05)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: item.id === "roleta" ? 'hsl(280 55% 50% / 0.15)' : 'hsl(45 100% 50% / 0.1)' }}
                          >
                            <item.icon className="w-4 h-4 text-accent" />
                          </div>
                          <span className="flex-1 text-left">{item.label}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>

              {/* Info + Sign Out */}
              <div className="p-4 space-y-3" style={{ borderTop: '1px solid hsl(0 0% 100% / 0.06)' }}>
                {user && (
                  <button
                    onClick={() => { onSignOut?.(); setMenuOpen(false); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
                    style={{
                      background: 'hsl(0 60% 50% / 0.08)',
                      color: 'hsl(0 60% 65%)',
                      border: '1px solid hsl(0 60% 50% / 0.12)',
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    Sair da conta
                  </button>
                )}

                <p className="text-[10px] text-center text-muted-foreground/30">
                  © {new Date().getFullYear()} {businessName}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
