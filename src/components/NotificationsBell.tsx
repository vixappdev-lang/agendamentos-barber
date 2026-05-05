import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, Inbox, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  confirmed: "hsl(140 60% 50%)",
  cancelled: "hsl(0 60% 55%)",
  completed: "hsl(210 60% 55%)",
  reminder: "hsl(40 70% 55%)",
  info: "hsl(245 60% 65%)",
};

const formatRelative = (date: string) => {
  const now = new Date();
  const d = new Date(date);
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d atrás`;
  return d.toLocaleDateString("pt-BR");
};

interface Props {
  email: string;
  iconColor?: string;
}

const NotificationsBell = ({ email, iconColor = "hsl(0 0% 70%)" }: Props) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const fetchAll = async () => {
    if (!email) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("customer_email", email)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data as Notification[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `customer_email=eq.${email}` },
        () => fetchAll()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unreadCount = items.filter((n) => !n.read_at).length;

  const markRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
  };

  const markAllRead = async () => {
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (ids.length === 0) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids);
    setItems((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
    );
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg transition-all hover:bg-white/5"
        title="Notificações"
      >
        <Bell className="w-4 h-4" style={{ color: iconColor }} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
            style={{ background: "hsl(0 70% 55%)" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-14 sm:top-auto sm:mt-2 sm:w-[380px] max-h-[70vh] sm:max-h-[500px] rounded-2xl shadow-2xl overflow-hidden z-[80] flex flex-col"
            style={{
              background: "hsl(220 25% 8%)",
              border: "1px solid hsl(0 0% 100% / 0.08)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-foreground" />
                <span className="text-sm font-bold text-foreground">Notificações</span>
                {unreadCount > 0 && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white"
                    style={{ background: "hsl(0 70% 55%)" }}
                  >
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CheckCheck className="w-3 h-3" /> Marcar todas
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Carregando...</div>
              ) : items.length === 0 ? (
                <div className="p-10 flex flex-col items-center gap-2 text-center">
                  <Inbox className="w-8 h-8 text-muted-foreground opacity-40" />
                  <p className="text-xs text-muted-foreground">Nenhuma notificação ainda</p>
                </div>
              ) : (
                <ul>
                  {items.map((n) => {
                    const color = TYPE_COLORS[n.type] || TYPE_COLORS.info;
                    const isUnread = !n.read_at;
                    return (
                      <li
                        key={n.id}
                        onClick={() => isUnread && markRead(n.id)}
                        className="flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-white/5 border-b border-white/[0.03]"
                        style={{
                          background: isUnread ? "hsl(245 60% 55% / 0.04)" : "transparent",
                        }}
                      >
                        <div
                          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                          style={{ background: isUnread ? color : "hsl(0 0% 100% / 0.15)" }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className="text-xs font-semibold leading-snug"
                              style={{ color: isUnread ? "hsl(0 0% 95%)" : "hsl(0 0% 65%)" }}
                            >
                              {n.title}
                            </p>
                            <span className="text-[9px] text-muted-foreground shrink-0">
                              {formatRelative(n.created_at)}
                            </span>
                          </div>
                          <p
                            className="text-[11px] mt-0.5 leading-relaxed"
                            style={{ color: isUnread ? "hsl(0 0% 75%)" : "hsl(0 0% 50%)" }}
                          >
                            {n.message}
                          </p>
                          {n.link && (
                            <a
                              href={n.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] underline mt-1 inline-block"
                              style={{ color }}
                            >
                              Abrir →
                            </a>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <Link
              to="/membro/notificacoes"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-colors hover:bg-white/5 border-t border-white/5"
              style={{ color: "hsl(245 60% 70%)" }}
            >
              Ver todas as notificações
              <ArrowRight className="w-3 h-3" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationsBell;
