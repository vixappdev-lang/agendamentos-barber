import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  services: number;
  barbers: number;
  products: number;
  orders_total: number;
  orders_pending: number;
  coupons: number;
  revenue_total: number;
  error?: string;
}

const cardStyle =
  "rounded-xl border border-border bg-card/50 backdrop-blur-sm p-4 flex items-start gap-3 transition-all hover:border-primary/30";

const iconWrap = "w-10 h-10 rounded-lg flex items-center justify-center shrink-0";

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
  tone?: "default" | "success" | "warning" | "info";
}) => {
  const tones: Record<string, { bg: string; fg: string }> = {
    default: { bg: "hsl(245 60% 55% / 0.12)", fg: "hsl(245 60% 70%)" },
    success: { bg: "hsl(140 60% 50% / 0.12)", fg: "hsl(140 60% 60%)" },
    warning: { bg: "hsl(38 90% 55% / 0.12)", fg: "hsl(38 90% 60%)" },
    info: { bg: "hsl(200 70% 55% / 0.12)", fg: "hsl(200 70% 65%)" },
  };
  const t = tones[tone];
  return (
    <div className={cardStyle}>
      <div className={iconWrap} style={{ background: t.bg }}>
        <Icon className="w-5 h-5" style={{ color: t.fg }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground mt-0.5 truncate">{value}</p>
        {hint && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{hint}</p>}
      </div>
    </div>
  );
};

const fmtCurrency = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const todayISO = () => new Date().toISOString().slice(0, 10);

export const BarbershopMonitorModal = ({ open, onOpenChange, barbershop }: Props) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setStats(null);
      try {
        // Genesis Sistemas / qualquer perfil cloud → lê do Supabase
        if (barbershop.is_cloud) {
          const today = todayISO();
          const [
            apptAll,
            apptToday,
            apptPending,
            apptRevenue,
            services,
            barbers,
            products,
            ordersAll,
            ordersPending,
            coupons,
          ] = await Promise.all([
            supabase.from("appointments").select("id", { count: "exact", head: true }),
            supabase.from("appointments").select("id", { count: "exact", head: true }).eq("appointment_date", today),
            supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "pending"),
            supabase.from("appointments").select("total_price").eq("status", "completed"),
            supabase.from("services").select("id", { count: "exact", head: true }),
            supabase.from("barbers").select("id", { count: "exact", head: true }),
            supabase.from("products").select("id", { count: "exact", head: true }),
            supabase.from("orders").select("id", { count: "exact", head: true }),
            supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
            supabase.from("coupons").select("id", { count: "exact", head: true }),
          ]);

          const revenue = (apptRevenue.data ?? []).reduce(
            (sum, r: { total_price: number | null }) => sum + (Number(r.total_price) || 0),
            0,
          );

          if (!cancelled) {
            setStats({
              source: "cloud",
              appointments_total: apptAll.count ?? 0,
              appointments_today: apptToday.count ?? 0,
              appointments_pending: apptPending.count ?? 0,
              services: services.count ?? 0,
              barbers: barbers.count ?? 0,
              products: products.count ?? 0,
              orders_total: ordersAll.count ?? 0,
              orders_pending: ordersPending.count ?? 0,
              coupons: coupons.count ?? 0,
              revenue_total: revenue,
            });
          }
          return;
        }

        // Perfil com MySQL configurado
        if (barbershop.mysql_profile_id) {
          const { data, error } = await supabase.functions.invoke("mysql-proxy", {
            body: { action: "stats", profile_id: barbershop.mysql_profile_id },
          });
          if (error) throw error;
          if (!data?.success) throw new Error(data?.error || "Falha ao consultar MySQL");
          const s = data.data as Record<string, number>;
          if (!cancelled) {
            setStats({
              source: "mysql",
              appointments_total: Math.max(0, s.appointments ?? 0),
              appointments_today: 0,
              appointments_pending: 0,
              services: Math.max(0, s.services ?? 0),
              barbers: Math.max(0, s.barbers ?? 0),
              products: Math.max(0, s.products ?? 0),
              orders_total: Math.max(0, s.orders ?? 0),
              orders_pending: 0,
              coupons: Math.max(0, s.coupons ?? 0),
              revenue_total: 0,
            });
          }
          return;
        }

        // Sem fonte
        if (!cancelled) {
          setStats({
            source: "none",
            appointments_total: 0,
            appointments_today: 0,
            appointments_pending: 0,
            services: 0,
            barbers: 0,
            products: 0,
            orders_total: 0,
            orders_pending: 0,
            coupons: 0,
            revenue_total: 0,
            error: "MySQL não configurado para esta barbearia.",
          });
        }
      } catch (e) {
        if (!cancelled) {
          setStats({
            source: "none",
            appointments_total: 0,
            appointments_today: 0,
            appointments_pending: 0,
            services: 0,
            barbers: 0,
            products: 0,
            orders_total: 0,
            orders_pending: 0,
            coupons: 0,
            revenue_total: 0,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, barbershop]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5" />
            Monitoramento — {barbershop.name}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">Fonte:</span>
            {barbershop.is_cloud ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Cloud className="w-3 h-3" /> Lovable Cloud
              </span>
            ) : barbershop.mysql_profile_id ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-green-500/10 text-green-400 border border-green-500/20">
                <DbIcon className="w-3 h-3" /> MySQL próprio
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground border border-border">
                <AlertCircle className="w-3 h-3" /> Sem fonte
              </span>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : stats?.error ? (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Não foi possível carregar os dados.</p>
              <p className="text-xs mt-1 opacity-80">{stats.error}</p>
            </div>
          </div>
        ) : stats ? (
          <div className="space-y-4 py-2">
            {/* Linha 1 — Agendamentos */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" /> Agendamentos
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard
                  label="Total"
                  value={stats.appointments_total}
                  icon={CalendarDays}
                />
                <StatCard
                  label="Hoje"
                  value={stats.appointments_today}
                  icon={Clock3}
                  tone="info"
                />
                <StatCard
                  label="Pendentes"
                  value={stats.appointments_pending}
                  icon={AlertCircle}
                  tone="warning"
                />
              </div>
            </div>

            {/* Linha 2 — Catálogo */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5" /> Catálogo
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Serviços" value={stats.services} icon={Scissors} />
                <StatCard label="Barbeiros" value={stats.barbers} icon={Users} />
                <StatCard label="Produtos" value={stats.products} icon={ShoppingBag} />
                <StatCard label="Cupons" value={stats.coupons} icon={Tag} />
              </div>
            </div>

            {/* Linha 3 — Loja & Receita */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Loja & Receita
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard label="Pedidos" value={stats.orders_total} icon={ShoppingBag} />
                <StatCard
                  label="Pedidos pendentes"
                  value={stats.orders_pending}
                  icon={AlertCircle}
                  tone="warning"
                />
                <StatCard
                  label="Receita (concluídos)"
                  value={fmtCurrency(stats.revenue_total)}
                  hint={stats.source === "mysql" ? "Indisponível via MySQL stats" : undefined}
                  icon={CheckCircle2}
                  tone="success"
                />
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground text-center pt-2">
              Atualizado em {new Date().toLocaleString("pt-BR")}
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
