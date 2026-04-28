import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CalendarDays,
  Scissors,
  Users,
  ShoppingBag,
  Tag,
  TrendingUp,
  Cloud,
  Database as DbIcon,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Star,
  XCircle,
  RefreshCw,
  Server,
  DollarSign,
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { BarbershopProfile } from "@/hooks/useBarbershops";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  barbershop: BarbershopProfile;
}

interface StatsData {
  source: "cloud" | "mysql" | "none";
  appointments_total: number;
  appointments_today: number;
  appointments_pending: number;
  appointments_completed: number;
  appointments_cancelled: number;
  services: number;
  barbers: number;
  products: number;
  orders_total: number;
  orders_pending: number;
  orders_completed: number;
  coupons: number;
  reviews_total: number;
  reviews_avg: number;
  users_total: number;
  revenue_total: number;
  revenue_today: number;
  info?: {
    mysql_version?: string;
    database?: string;
    host?: string;
    checked_at?: string;
  };
  error?: string;
}

const tones: Record<string, { bg: string; fg: string; ring: string }> = {
  default: { bg: "hsl(245 60% 55% / 0.12)", fg: "hsl(245 70% 72%)", ring: "hsl(245 60% 55% / 0.25)" },
  success: { bg: "hsl(142 70% 45% / 0.12)", fg: "hsl(142 70% 60%)", ring: "hsl(142 70% 45% / 0.25)" },
  warning: { bg: "hsl(38 95% 55% / 0.12)", fg: "hsl(38 95% 62%)", ring: "hsl(38 95% 55% / 0.25)" },
  info:    { bg: "hsl(200 80% 55% / 0.12)", fg: "hsl(200 85% 68%)", ring: "hsl(200 80% 55% / 0.25)" },
  danger:  { bg: "hsl(0 75% 55% / 0.12)",  fg: "hsl(0 80% 68%)",  ring: "hsl(0 75% 55% / 0.25)" },
  accent:  { bg: "hsl(280 70% 55% / 0.12)", fg: "hsl(280 80% 72%)", ring: "hsl(280 70% 55% / 0.25)" },
};

type Tone = keyof typeof tones;

const StatCard = ({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: typeof CalendarDays;
  tone?: Tone;
}) => {
  const t = tones[tone];
  return (
    <div
      className="rounded-xl border bg-card/60 backdrop-blur-sm p-4 flex items-start gap-3 transition-all hover:border-primary/40 hover:bg-card/80 min-h-[88px]"
      style={{ borderColor: "hsl(var(--border))" }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ring-1"
        style={{ background: t.bg, boxShadow: `inset 0 0 0 1px ${t.ring}` }}
      >
        <Icon className="w-5 h-5" style={{ color: t.fg }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        <p className="text-xl font-bold text-foreground mt-0.5 truncate leading-tight">{value}</p>
        {hint && <p className="text-[10px] text-muted-foreground mt-1 truncate">{hint}</p>}
      </div>
    </div>
  );
};

const SectionTitle = ({ icon: Icon, label }: { icon: typeof CalendarDays; label: string }) => (
  <div className="flex items-center gap-2 mb-2.5">
    <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
      <Icon className="w-3.5 h-3.5 text-primary" />
    </div>
    <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">{label}</h3>
    <div className="flex-1 h-px bg-border/60" />
  </div>
);

const fmtCurrency = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtNumber = (n: number) => n.toLocaleString("pt-BR");
const todayISO = () => new Date().toISOString().slice(0, 10);

export const BarbershopMonitorModal = ({ open, onOpenChange, barbershop }: Props) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        if (barbershop.is_cloud) {
          const today = todayISO();
          const [
            apptAll, apptToday, apptPending, apptCompleted, apptCancelled,
            apptRevenueAll, apptRevenueToday,
            services, barbers, products,
            ordersAll, ordersPending, ordersCompleted,
            coupons, reviewsRows,
          ] = await Promise.all([
            supabase.from("appointments").select("id", { count: "exact", head: true }),
            supabase.from("appointments").select("id", { count: "exact", head: true }).eq("appointment_date", today),
            supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "pending"),
            supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "completed"),
            supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
            supabase.from("appointments").select("total_price").eq("status", "completed"),
            supabase.from("appointments").select("total_price").eq("status", "completed").eq("appointment_date", today),
            supabase.from("services").select("id", { count: "exact", head: true }),
            supabase.from("barbers").select("id", { count: "exact", head: true }),
            supabase.from("products").select("id", { count: "exact", head: true }),
            supabase.from("orders").select("id", { count: "exact", head: true }),
            supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
            supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "completed"),
            supabase.from("coupons").select("id", { count: "exact", head: true }),
            supabase.from("reviews").select("rating"),
          ]);

          const sumPrice = (rows: any[] | null) =>
            (rows ?? []).reduce((s, r) => s + (Number(r.total_price) || 0), 0);

          const reviews = (reviewsRows.data ?? []) as { rating: number | null }[];
          const reviewsAvg = reviews.length
            ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length
            : 0;

          setStats({
            source: "cloud",
            appointments_total: apptAll.count ?? 0,
            appointments_today: apptToday.count ?? 0,
            appointments_pending: apptPending.count ?? 0,
            appointments_completed: apptCompleted.count ?? 0,
            appointments_cancelled: apptCancelled.count ?? 0,
            services: services.count ?? 0,
            barbers: barbers.count ?? 0,
            products: products.count ?? 0,
            orders_total: ordersAll.count ?? 0,
            orders_pending: ordersPending.count ?? 0,
            orders_completed: ordersCompleted.count ?? 0,
            coupons: coupons.count ?? 0,
            reviews_total: reviews.length,
            reviews_avg: reviewsAvg,
            users_total: 0,
            revenue_total: sumPrice(apptRevenueAll.data),
            revenue_today: sumPrice(apptRevenueToday.data),
            info: { checked_at: new Date().toISOString() },
          });
          return;
        }

        if (barbershop.mysql_profile_id) {
          const { data, error } = await supabase.functions.invoke("mysql-proxy", {
            body: { action: "stats", profile_id: barbershop.mysql_profile_id },
          });
          if (error) throw error;
          if (!data?.success) throw new Error(data?.error || "Falha ao consultar MySQL");
          const s = (data.data ?? {}) as Record<string, number>;
          const ex = (data.extras ?? {}) as Record<string, number>;
          const norm = (n: number) => Math.max(0, Number(n) || 0);
          setStats({
            source: "mysql",
            appointments_total: norm(s.appointments),
            appointments_today: norm(ex.appointments_today),
            appointments_pending: norm(ex.appointments_pending),
            appointments_completed: norm(ex.appointments_completed),
            appointments_cancelled: norm(ex.appointments_cancelled),
            services: norm(s.services),
            barbers: norm(s.barbers),
            products: norm(s.products),
            orders_total: norm(s.orders),
            orders_pending: norm(ex.orders_pending),
            orders_completed: norm(ex.orders_completed),
            coupons: norm(s.coupons),
            reviews_total: norm(s.reviews),
            reviews_avg: Number(ex.reviews_avg) || 0,
            users_total: norm(ex.users_total),
            revenue_total: Number(ex.revenue_total) || 0,
            revenue_today: Number(ex.revenue_today) || 0,
            info: data.info,
          });
          return;
        }

        setStats({
          source: "none",
          appointments_total: 0, appointments_today: 0, appointments_pending: 0,
          appointments_completed: 0, appointments_cancelled: 0,
          services: 0, barbers: 0, products: 0,
          orders_total: 0, orders_pending: 0, orders_completed: 0,
          coupons: 0, reviews_total: 0, reviews_avg: 0, users_total: 0,
          revenue_total: 0, revenue_today: 0,
          error: "MySQL não configurado para esta barbearia.",
        });
      } catch (e) {
        setStats({
          source: "none",
          appointments_total: 0, appointments_today: 0, appointments_pending: 0,
          appointments_completed: 0, appointments_cancelled: 0,
          services: 0, barbers: 0, products: 0,
          orders_total: 0, orders_pending: 0, orders_completed: 0,
          coupons: 0, reviews_total: 0, reviews_avg: 0, users_total: 0,
          revenue_total: 0, revenue_today: 0,
          error: e instanceof Error ? e.message : String(e),
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [barbershop],
  );

  useEffect(() => {
    if (!open) return;
    setStats(null);
    load(false);
  }, [open, load]);

  const sourceBadge = barbershop.is_cloud ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/25">
      <Cloud className="w-3 h-3" /> Lovable Cloud
    </span>
  ) : barbershop.mysql_profile_id ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
      <DbIcon className="w-3 h-3" /> MySQL Próprio
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-medium bg-muted text-muted-foreground border border-border">
      <AlertCircle className="w-3 h-3" /> Sem fonte
    </span>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="truncate">Monitoramento — {barbershop.name}</span>
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {sourceBadge}
                {stats?.info?.mysql_version && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] bg-muted/50 text-muted-foreground border border-border">
                    <Server className="w-3 h-3" /> MySQL {stats.info.mysql_version.split("-")[0]}
                  </span>
                )}
                {stats?.info?.database && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] bg-muted/50 text-muted-foreground border border-border">
                    <DbIcon className="w-3 h-3" /> {stats.info.database}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => load(true)}
              disabled={loading || refreshing}
              className="shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : stats?.error ? (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Não foi possível carregar os dados.</p>
              <p className="text-xs mt-1 opacity-80 break-words">{stats.error}</p>
            </div>
          </div>
        ) : stats ? (
          <div className="space-y-5 py-2">
            {/* Receita em destaque */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4">
                <div className="flex items-center gap-2 text-emerald-400/90 text-[10.5px] uppercase tracking-wider font-medium">
                  <DollarSign className="w-3.5 h-3.5" /> Receita Total
                </div>
                <p className="text-2xl font-bold text-foreground mt-1">{fmtCurrency(stats.revenue_total)}</p>
                <p className="text-[10.5px] text-muted-foreground mt-0.5">Agendamentos concluídos</p>
              </div>
              <div className="rounded-xl border border-blue-500/25 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-4">
                <div className="flex items-center gap-2 text-blue-400/90 text-[10.5px] uppercase tracking-wider font-medium">
                  <DollarSign className="w-3.5 h-3.5" /> Receita Hoje
                </div>
                <p className="text-2xl font-bold text-foreground mt-1">{fmtCurrency(stats.revenue_today)}</p>
                <p className="text-[10.5px] text-muted-foreground mt-0.5">Concluídos no dia atual</p>
              </div>
            </div>

            {/* Agendamentos */}
            <div>
              <SectionTitle icon={CalendarDays} label="Agendamentos" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard label="Total" value={fmtNumber(stats.appointments_total)} icon={CalendarDays} />
                <StatCard label="Hoje" value={fmtNumber(stats.appointments_today)} icon={Clock3} tone="info" />
                <StatCard label="Pendentes" value={fmtNumber(stats.appointments_pending)} icon={AlertCircle} tone="warning" />
                <StatCard label="Concluídos" value={fmtNumber(stats.appointments_completed)} icon={CheckCircle2} tone="success" />
                <StatCard label="Cancelados" value={fmtNumber(stats.appointments_cancelled)} icon={XCircle} tone="danger" />
              </div>
            </div>

            {/* Catálogo */}
            <div>
              <SectionTitle icon={Scissors} label="Catálogo & Equipe" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Serviços" value={fmtNumber(stats.services)} icon={Scissors} />
                <StatCard label="Barbeiros" value={fmtNumber(stats.barbers)} icon={Users} tone="info" />
                <StatCard label="Produtos" value={fmtNumber(stats.products)} icon={ShoppingBag} tone="accent" />
                <StatCard label="Cupons" value={fmtNumber(stats.coupons)} icon={Tag} tone="warning" />
              </div>
            </div>

            {/* Loja */}
            <div>
              <SectionTitle icon={ShoppingBag} label="Loja" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard label="Pedidos Totais" value={fmtNumber(stats.orders_total)} icon={ShoppingBag} />
                <StatCard label="Pendentes" value={fmtNumber(stats.orders_pending)} icon={AlertCircle} tone="warning" />
                <StatCard label="Concluídos" value={fmtNumber(stats.orders_completed)} icon={CheckCircle2} tone="success" />
              </div>
            </div>

            {/* Engajamento */}
            <div>
              <SectionTitle icon={MessageSquare} label="Engajamento" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard
                  label="Avaliações"
                  value={fmtNumber(stats.reviews_total)}
                  icon={MessageSquare}
                  tone="info"
                />
                <StatCard
                  label="Nota média"
                  value={stats.reviews_total ? `${stats.reviews_avg.toFixed(1)} / 5` : "—"}
                  icon={Star}
                  tone="warning"
                  hint={stats.reviews_total ? `${stats.reviews_total} avaliações` : "Sem avaliações"}
                />
                <StatCard
                  label="Usuários"
                  value={fmtNumber(stats.users_total)}
                  icon={Users}
                  tone="accent"
                  hint={stats.source === "cloud" ? "Indisponível em Cloud" : undefined}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[10.5px] text-muted-foreground pt-2 border-t border-border/50">
              <span className="inline-flex items-center gap-1.5">
                <Server className="w-3 h-3" />
                {stats.info?.host ? `Host: ${stats.info.host}` : `Fonte: ${stats.source}`}
              </span>
              <span>Atualizado em {new Date(stats.info?.checked_at ?? Date.now()).toLocaleString("pt-BR")}</span>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
