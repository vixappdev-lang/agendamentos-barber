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
  Activity,
  Award,
  Trophy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { BarbershopProfile } from "@/hooks/useBarbershops";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  barbershop: BarbershopProfile;
}

interface TopItem { name: string; total: number; revenue: number }
interface UpcomingItem { customer_name: string; appointment_date: string; appointment_time: string; barber_name?: string | null; status?: string }
interface OrderItem { customer_name: string; total_price: number; status: string; created_at: string }

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
  orders_revenue_total: number;
  coupons: number;
  reviews_total: number;
  reviews_avg: number;
  reviews_dist: [number, number, number, number, number]; // [1,2,3,4,5]
  users_total: number;
  revenue_total: number;
  revenue_today: number;
  revenue_week: number;
  revenue_month: number;
  avg_ticket: number;
  completion_rate: number;
  top_services: TopItem[];
  top_barbers: TopItem[];
  upcoming: UpcomingItem[];
  recent_orders: OrderItem[];
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
  label, value, hint, icon: Icon, tone = "default",
}: { label: string; value: string | number; hint?: string; icon: typeof CalendarDays; tone?: Tone }) => {
  const t = tones[tone];
  return (
    <div
      className="rounded-xl border bg-card/60 backdrop-blur-sm p-4 flex items-start gap-3 transition-all hover:border-primary/40 hover:bg-card/80 h-[92px]"
      style={{ borderColor: "hsl(var(--border))" }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ring-1"
        style={{ background: t.bg, boxShadow: `inset 0 0 0 1px ${t.ring}` }}
      >
        <Icon className="w-5 h-5" style={{ color: t.fg }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-medium truncate">{label}</p>
        <p className="text-xl font-bold text-foreground mt-0.5 truncate leading-tight">{value}</p>
        {hint && <p className="text-[10px] text-muted-foreground mt-1 truncate">{hint}</p>}
      </div>
    </div>
  );
};

const SectionTitle = ({ icon: Icon, label, action }: { icon: typeof CalendarDays; label: string; action?: React.ReactNode }) => (
  <div className="flex items-center gap-2 mb-2.5">
    <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
      <Icon className="w-3.5 h-3.5 text-primary" />
    </div>
    <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">{label}</h3>
    <div className="flex-1 h-px bg-border/60" />
    {action}
  </div>
);

const fmtCurrency = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtNumber = (n: number) => n.toLocaleString("pt-BR");
const todayISO = () => new Date().toISOString().slice(0, 10);

const RatingBar = ({ stars, count, total }: { stars: number; count: number; total: number }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-10 inline-flex items-center gap-1 text-amber-400 font-medium">
        {stars}<Star className="w-3 h-3 fill-current" />
      </span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right text-muted-foreground tabular-nums">{count}</span>
    </div>
  );
};

const emptyStats = (extra: Partial<StatsData> = {}): StatsData => ({
  source: "none",
  appointments_total: 0, appointments_today: 0, appointments_pending: 0,
  appointments_completed: 0, appointments_cancelled: 0,
  services: 0, barbers: 0, products: 0,
  orders_total: 0, orders_pending: 0, orders_completed: 0, orders_revenue_total: 0,
  coupons: 0, reviews_total: 0, reviews_avg: 0,
  reviews_dist: [0, 0, 0, 0, 0],
  users_total: 0,
  revenue_total: 0, revenue_today: 0, revenue_week: 0, revenue_month: 0,
  avg_ticket: 0, completion_rate: 0,
  top_services: [], top_barbers: [], upcoming: [], recent_orders: [],
  ...extra,
});

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
          const dist: [number, number, number, number, number] = [0, 0, 0, 0, 0];
          for (const r of reviews) {
            const v = Number(r.rating);
            if (v >= 1 && v <= 5) dist[v - 1]++;
          }

          const completedCount = apptCompleted.count ?? 0;
          const cancelledCount = apptCancelled.count ?? 0;
          const pendingCount = apptPending.count ?? 0;
          const totalForRate = completedCount + cancelledCount + pendingCount;
          const revenueTotal = sumPrice(apptRevenueAll.data);
          const avgTicket = completedCount > 0 ? revenueTotal / completedCount : 0;

          setStats({
            ...emptyStats(),
            source: "cloud",
            appointments_total: apptAll.count ?? 0,
            appointments_today: apptToday.count ?? 0,
            appointments_pending: pendingCount,
            appointments_completed: completedCount,
            appointments_cancelled: cancelledCount,
            services: services.count ?? 0,
            barbers: barbers.count ?? 0,
            products: products.count ?? 0,
            orders_total: ordersAll.count ?? 0,
            orders_pending: ordersPending.count ?? 0,
            orders_completed: ordersCompleted.count ?? 0,
            coupons: coupons.count ?? 0,
            reviews_total: reviews.length,
            reviews_avg: reviewsAvg,
            reviews_dist: dist,
            revenue_total: revenueTotal,
            revenue_today: sumPrice(apptRevenueToday.data),
            avg_ticket: avgTicket,
            completion_rate: totalForRate > 0 ? Math.round((completedCount / totalForRate) * 100) : 0,
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
          const li = (data.lists ?? {}) as Record<string, any[]>;
          const norm = (n: number) => Math.max(0, Number(n) || 0);
          const dist: [number, number, number, number, number] = [
            norm(ex.reviews_1), norm(ex.reviews_2), norm(ex.reviews_3), norm(ex.reviews_4), norm(ex.reviews_5),
          ];
          setStats({
            ...emptyStats(),
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
            orders_revenue_total: Number(ex.orders_revenue_total) || 0,
            coupons: norm(s.coupons),
            reviews_total: norm(s.reviews),
            reviews_avg: Number(ex.reviews_avg) || 0,
            reviews_dist: dist,
            users_total: norm(ex.users_total),
            revenue_total: Number(ex.revenue_total) || 0,
            revenue_today: Number(ex.revenue_today) || 0,
            revenue_week: Number(ex.revenue_week) || 0,
            revenue_month: Number(ex.revenue_month) || 0,
            avg_ticket: Number(ex.avg_ticket) || 0,
            completion_rate: Number(ex.completion_rate) || 0,
            top_services: (li.top_services ?? []).map((r) => ({ name: String(r.name ?? "—"), total: Number(r.total) || 0, revenue: Number(r.revenue) || 0 })),
            top_barbers: (li.top_barbers ?? []).map((r) => ({ name: String(r.name ?? "—"), total: Number(r.total) || 0, revenue: Number(r.revenue) || 0 })),
            upcoming: (li.upcoming ?? []) as UpcomingItem[],
            recent_orders: (li.recent_orders ?? []) as OrderItem[],
            info: data.info,
          });
          return;
        }

        setStats(emptyStats({ error: "MySQL não configurado para esta barbearia." }));
      } catch (e) {
        setStats(emptyStats({ error: e instanceof Error ? e.message : String(e) }));
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

  const fmtDate = (d?: string) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleString("pt-BR"); } catch { return String(d); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
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
            <Button variant="outline" size="sm" onClick={() => load(true)} disabled={loading || refreshing} className="shrink-0">
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
            {/* KPIs Financeiros */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4 h-[92px] flex flex-col justify-center">
                <div className="flex items-center gap-2 text-emerald-400/90 text-[10.5px] uppercase tracking-wider font-medium">
                  <DollarSign className="w-3.5 h-3.5" /> Receita Total
                </div>
                <p className="text-xl font-bold text-foreground mt-0.5 truncate">{fmtCurrency(stats.revenue_total)}</p>
              </div>
              <div className="rounded-xl border border-blue-500/25 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-4 h-[92px] flex flex-col justify-center">
                <div className="flex items-center gap-2 text-blue-400/90 text-[10.5px] uppercase tracking-wider font-medium">
                  <DollarSign className="w-3.5 h-3.5" /> Receita Hoje
                </div>
                <p className="text-xl font-bold text-foreground mt-0.5 truncate">{fmtCurrency(stats.revenue_today)}</p>
              </div>
              <div className="rounded-xl border border-purple-500/25 bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-4 h-[92px] flex flex-col justify-center">
                <div className="flex items-center gap-2 text-purple-400/90 text-[10.5px] uppercase tracking-wider font-medium">
                  <Activity className="w-3.5 h-3.5" /> Ticket Médio
                </div>
                <p className="text-xl font-bold text-foreground mt-0.5 truncate">{fmtCurrency(stats.avg_ticket)}</p>
              </div>
              <div className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-4 h-[92px] flex flex-col justify-center">
                <div className="flex items-center gap-2 text-amber-400/90 text-[10.5px] uppercase tracking-wider font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Taxa de Conclusão
                </div>
                <p className="text-xl font-bold text-foreground mt-0.5 truncate">{stats.completion_rate}%</p>
              </div>
            </div>

            {/* Receita por período (somente MySQL — Cloud não tem ainda) */}
            {stats.source === "mysql" && (stats.revenue_week > 0 || stats.revenue_month > 0) && (
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Receita 7 dias" value={fmtCurrency(stats.revenue_week)} icon={TrendingUp} tone="info" />
                <StatCard label="Receita 30 dias" value={fmtCurrency(stats.revenue_month)} icon={TrendingUp} tone="success" />
              </div>
            )}

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
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Pedidos Totais" value={fmtNumber(stats.orders_total)} icon={ShoppingBag} />
                <StatCard label="Pendentes" value={fmtNumber(stats.orders_pending)} icon={AlertCircle} tone="warning" />
                <StatCard label="Concluídos" value={fmtNumber(stats.orders_completed)} icon={CheckCircle2} tone="success" />
                <StatCard label="Receita Loja" value={fmtCurrency(stats.orders_revenue_total)} icon={DollarSign} tone="success" />
              </div>
            </div>

            {/* Engajamento + Distribuição */}
            <div>
              <SectionTitle icon={MessageSquare} label="Engajamento" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
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

              {stats.reviews_total > 0 && (
                <div className="mt-3 rounded-xl border border-border bg-card/40 p-4">
                  <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-medium mb-3">Distribuição de notas</p>
                  <div className="space-y-1.5">
                    {[5, 4, 3, 2, 1].map((s) => (
                      <RatingBar key={s} stars={s} count={stats.reviews_dist[s - 1]} total={stats.reviews_total} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Top serviços e barbeiros */}
            {(stats.top_services.length > 0 || stats.top_barbers.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-card/40 p-4">
                  <SectionTitle icon={Trophy} label="Top Serviços" />
                  {stats.top_services.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem dados.</p>
                  ) : (
                    <ul className="space-y-2">
                      {stats.top_services.map((it, i) => (
                        <li key={`${it.name}-${i}`} className="flex items-center gap-3 text-sm">
                          <span className="w-6 h-6 rounded-md bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                          <span className="flex-1 truncate text-foreground">{it.name}</span>
                          <span className="text-muted-foreground tabular-nums text-xs">{fmtNumber(it.total)}×</span>
                          <span className="text-emerald-400 tabular-nums text-xs font-medium w-24 text-right">{fmtCurrency(it.revenue)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-xl border border-border bg-card/40 p-4">
                  <SectionTitle icon={Award} label="Top Barbeiros" />
                  {stats.top_barbers.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem dados.</p>
                  ) : (
                    <ul className="space-y-2">
                      {stats.top_barbers.map((it, i) => (
                        <li key={`${it.name}-${i}`} className="flex items-center gap-3 text-sm">
                          <span className="w-6 h-6 rounded-md bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                          <span className="flex-1 truncate text-foreground">{it.name}</span>
                          <span className="text-muted-foreground tabular-nums text-xs">{fmtNumber(it.total)}×</span>
                          <span className="text-emerald-400 tabular-nums text-xs font-medium w-24 text-right">{fmtCurrency(it.revenue)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Próximos agendamentos */}
            {stats.upcoming.length > 0 && (
              <div className="rounded-xl border border-border bg-card/40 p-4">
                <SectionTitle icon={CalendarDays} label="Próximos Agendamentos" />
                <ul className="divide-y divide-border/60">
                  {stats.upcoming.map((u, i) => (
                    <li key={i} className="py-2 flex items-center gap-3 text-sm">
                      <Clock3 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="flex-1 truncate text-foreground">{u.customer_name}</span>
                      <span className="text-xs text-muted-foreground truncate hidden sm:inline">{u.barber_name || "—"}</span>
                      <span className="text-xs font-medium tabular-nums text-foreground/80 w-32 text-right">
                        {String(u.appointment_date).slice(0, 10).split("-").reverse().join("/")} · {String(u.appointment_time).slice(0, 5)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pedidos recentes */}
            {stats.recent_orders.length > 0 && (
              <div className="rounded-xl border border-border bg-card/40 p-4">
                <SectionTitle icon={ShoppingBag} label="Pedidos Recentes" />
                <ul className="divide-y divide-border/60">
                  {stats.recent_orders.map((o, i) => (
                    <li key={i} className="py-2 flex items-center gap-3 text-sm">
                      <ShoppingBag className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="flex-1 truncate text-foreground">{o.customer_name}</span>
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{o.status}</span>
                      <span className="text-xs font-medium tabular-nums text-emerald-400 w-24 text-right">{fmtCurrency(o.total_price)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between text-[10.5px] text-muted-foreground pt-2 border-t border-border/50">
              <span className="inline-flex items-center gap-1.5">
                <Server className="w-3 h-3" />
                {stats.info?.host ? `Host: ${stats.info.host}` : `Fonte: ${stats.source}`}
              </span>
              <span>Atualizado em {fmtDate(stats.info?.checked_at)}</span>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
