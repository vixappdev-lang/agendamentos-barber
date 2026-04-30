import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  Inbox,
  Filter,
  CheckCheck,
  BellRing,
  BellOff,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useThemeColors } from "@/hooks/useThemeColors";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  completed: "Concluído",
  reminder: "Lembrete",
  info: "Informação",
};

const TYPE_COLORS: Record<string, string> = {
  confirmed: "hsl(140 60% 50%)",
  cancelled: "hsl(0 60% 55%)",
  completed: "hsl(210 60% 55%)",
  reminder: "hsl(40 70% 55%)",
  info: "hsl(245 60% 65%)",
};

type ReadFilter = "all" | "unread" | "read";
type PeriodFilter = "all" | "today" | "week" | "month";

const formatDateTime = (date: string) =>
  new Date(date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const NotificationsPage = () => {
  const navigate = useNavigate();
  const t = useThemeColors();
  const [email, setEmail] = useState<string | null>(null);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");

  const push = usePushNotifications(email);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        navigate("/login", { replace: true });
        return;
      }
      setEmail(session.user.email);
      await fetchAll(session.user.email);
    })();
  }, [navigate]);

  useEffect(() => {
    if (!email) return;
    const channel = supabase
      .channel(`notif-page-${email}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `customer_email=eq.${email}` },
        () => fetchAll(email)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [email]);

  const fetchAll = async (userEmail: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("customer_email", userEmail)
      .order("created_at", { ascending: false })
      .limit(200);
    setItems((data as Notification[]) || []);
    setLoading(false);
  };

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
    if (!email) return;
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (ids.length === 0) {
      toast.info("Tudo lido!");
      return;
    }
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids);
    setItems((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
    );
    toast.success(`${ids.length} notificações marcadas como lidas`);
  };

  const handleEnablePush = async () => {
    if (push.permission === "default") {
      await push.requestPermission();
    } else if (push.permission === "granted") {
      push.setEnabled(!push.enabled);
      toast.success(push.enabled ? "Push desativado" : "Push ativado");
    } else if (push.permission === "denied") {
      toast.error("Permissão negada. Habilite nas configurações do navegador.");
    }
  };

  // Filtros
  const now = new Date();
  const periodCutoff = (() => {
    const d = new Date(now);
    if (periodFilter === "today") d.setHours(0, 0, 0, 0);
    else if (periodFilter === "week") d.setDate(d.getDate() - 7);
    else if (periodFilter === "month") d.setDate(d.getDate() - 30);
    else return null;
    return d;
  })();

  const filtered = items.filter((n) => {
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    if (readFilter === "read" && !n.read_at) return false;
    if (readFilter === "unread" && n.read_at) return false;
    if (periodCutoff && new Date(n.created_at) < periodCutoff) return false;
    return true;
  });

  const unreadCount = items.filter((n) => !n.read_at).length;

  // Tipos disponíveis para o filtro (apenas os que existem)
  const availableTypes = Array.from(new Set(items.map((n) => n.type)));

  const pushButtonLabel = (() => {
    if (push.permission === "unsupported") return "Não suportado";
    if (push.permission === "denied") return "Bloqueado";
    if (push.permission === "default") return "Ativar push";
    return push.enabled ? "Push ativado" : "Push desativado";
  })();

  const pushButtonActive = push.permission === "granted" && push.enabled;

  return (
    <div className="min-h-screen" style={{ background: t.bgBase, color: t.textPrimary }}>
      <header
        className="sticky top-0 z-30 backdrop-blur-xl"
        style={{ background: "hsl(220 25% 6% / 0.85)", borderBottom: `1px solid ${t.borderSubtle}` }}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/membro")}
              className="p-2 rounded-lg transition-all hover:bg-white/5"
              title="Voltar"
            >
              <ArrowLeft className="w-4 h-4" style={{ color: t.textMuted }} />
            </button>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" style={{ color: t.textPrimary }} />
              <h1 className="text-base sm:text-lg font-bold">Notificações</h1>
              {unreadCount > 0 && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white"
                  style={{ background: "hsl(0 70% 55%)" }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {push.isSupported && (
              <button
                onClick={handleEnablePush}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                style={{
                  background: pushButtonActive ? "hsl(140 60% 50% / 0.15)" : "hsl(0 0% 100% / 0.05)",
                  color: pushButtonActive ? "hsl(140 60% 60%)" : t.textMuted,
                  border: `1px solid ${pushButtonActive ? "hsl(140 60% 50% / 0.3)" : t.borderSubtle}`,
                }}
              >
                {pushButtonActive ? <BellRing className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                {pushButtonLabel}
              </button>
            )}
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                style={{
                  background: "hsl(245 60% 55% / 0.15)",
                  color: "hsl(245 60% 70%)",
                  border: "1px solid hsl(245 60% 55% / 0.3)",
                }}
              >
                <CheckCheck className="w-3.5 h-3.5" /> Marcar todas
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Filtros */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" style={{ color: t.textMuted }} />
            <span className="text-xs font-semibold" style={{ color: t.textMuted }}>
              Filtros
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Tipo */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>
                Tipo
              </label>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>
                  Todos
                </FilterChip>
                {availableTypes.map((tp) => (
                  <FilterChip
                    key={tp}
                    active={typeFilter === tp}
                    onClick={() => setTypeFilter(tp)}
                    color={TYPE_COLORS[tp]}
                  >
                    {TYPE_LABELS[tp] || tp}
                  </FilterChip>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>
                Status
              </label>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip active={readFilter === "all"} onClick={() => setReadFilter("all")}>
                  Todas
                </FilterChip>
                <FilterChip active={readFilter === "unread"} onClick={() => setReadFilter("unread")}>
                  Não lidas
                </FilterChip>
                <FilterChip active={readFilter === "read"} onClick={() => setReadFilter("read")}>
                  Lidas
                </FilterChip>
              </div>
            </div>

            {/* Período */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>
                Período
              </label>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip active={periodFilter === "all"} onClick={() => setPeriodFilter("all")}>
                  Tudo
                </FilterChip>
                <FilterChip active={periodFilter === "today"} onClick={() => setPeriodFilter("today")}>
                  Hoje
                </FilterChip>
                <FilterChip active={periodFilter === "week"} onClick={() => setPeriodFilter("week")}>
                  7 dias
                </FilterChip>
                <FilterChip active={periodFilter === "month"} onClick={() => setPeriodFilter("month")}>
                  30 dias
                </FilterChip>
              </div>
            </div>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="glass-card p-10 text-center text-xs text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-12 flex flex-col items-center gap-3 text-center">
            <Inbox className="w-10 h-10 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">
              {items.length === 0 ? "Nenhuma notificação ainda" : "Nenhuma notificação com esses filtros"}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((n, idx) => {
              const color = TYPE_COLORS[n.type] || TYPE_COLORS.info;
              const isUnread = !n.read_at;
              return (
                <motion.li
                  key={n.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                  onClick={() => isUnread && markRead(n.id)}
                  className="glass-card p-4 cursor-pointer transition-all hover:bg-white/[0.02]"
                  style={isUnread ? { borderLeft: `3px solid ${color}` } : undefined}
                >
                  <div className="flex gap-3">
                    <div
                      className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
                      style={{ background: `${color}15`, border: `1px solid ${color}30` }}
                    >
                      <Bell className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <p
                            className="text-sm font-semibold leading-tight"
                            style={{ color: isUnread ? t.textPrimary : t.textMuted }}
                          >
                            {n.title}
                          </p>
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider"
                            style={{ background: `${color}15`, color }}
                          >
                            {TYPE_LABELS[n.type] || n.type}
                          </span>
                          {isUnread && (
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: color }}
                            />
                          )}
                        </div>
                        <span className="text-[10px]" style={{ color: t.textMuted }}>
                          {formatDateTime(n.created_at)}
                        </span>
                      </div>
                      <p
                        className="text-xs mt-1 leading-relaxed"
                        style={{ color: isUnread ? "hsl(0 0% 75%)" : "hsl(0 0% 50%)" }}
                      >
                        {n.message}
                      </p>
                      {n.link && (
                        <a
                          href={n.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] underline mt-1.5 inline-block"
                          style={{ color }}
                        >
                          Abrir link →
                        </a>
                      )}
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
};

const FilterChip = ({
  active,
  onClick,
  children,
  color,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
}) => {
  const accent = color || "hsl(245 60% 55%)";
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all"
      style={{
        background: active ? `${accent}20` : "hsl(0 0% 100% / 0.04)",
        color: active ? accent : "hsl(0 0% 60%)",
        border: `1px solid ${active ? `${accent}40` : "hsl(0 0% 100% / 0.06)"}`,
      }}
    >
      {children}
    </button>
  );
};

export default NotificationsPage;
