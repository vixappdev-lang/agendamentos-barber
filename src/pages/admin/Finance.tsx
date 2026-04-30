import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  DollarSign, TrendingUp, Users, ShoppingBag, Receipt,
  ArrowUpRight, ArrowDownRight, Calendar, Filter, Wallet,
  BarChart3, Trophy, Percent, CreditCard, PiggyBank, Download
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";
import { useThemeColors } from "@/hooks/useThemeColors";

type Period = "day" | "week" | "month";

import { usePanelSession } from "@/hooks/usePanelSession";

const Finance = () => {
  const t = useThemeColors();
  const session = usePanelSession();
  const [period, setPeriod] = useState<Period>("month");
  const [stats, setStats] = useState({
    revenue: 0, expenses: 0, netProfit: 0,
    totalAttendances: 0, avgTicket: 0, productSales: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [topServices, setTopServices] = useState<any[]>([]);
  const [barberRanking, setBarberRanking] = useState<any[]>([]);
  const [rawAppointments, setRawAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [period, session.barberName, session.isBarberOnly]);

  const fetchData = async () => {
    setLoading(true);
    const now = new Date();
    let dateFrom: string;
    if (period === "day") { dateFrom = now.toISOString().split("T")[0]; }
    else if (period === "week") { const week = new Date(now); week.setDate(week.getDate() - 7); dateFrom = week.toISOString().split("T")[0]; }
    else { const month = new Date(now); month.setDate(month.getDate() - 30); dateFrom = month.toISOString().split("T")[0]; }

    // Considera tanto agendamentos confirmados quanto concluídos como receita realizada
    let apptQuery = supabase
      .from("appointments")
      .select("*")
      .gte("appointment_date", dateFrom)
      .in("status", ["confirmed", "completed"]);
    if (session.isBarberOnly && session.barberName) {
      apptQuery = apptQuery.eq("barber_name", session.barberName);
    }
    const { data: appointments } = await apptQuery;
    const apptList = appointments ?? [];
    const revenue = apptList.reduce((sum, a) => sum + (Number(a.total_price) || 0), 0);
    const totalAttendances = apptList.length;
    const avgTicket = totalAttendances > 0 ? revenue / totalAttendances : 0;

    // Pedidos da loja: barbeiros não veem (são receita compartilhada da barbearia)
    let productRevenue = 0;
    let productSales = 0;
    if (!session.isBarberOnly) {
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", dateFrom)
        .in("status", ["paid", "delivered", "completed", "confirmed"]);
      const orderList = orders ?? [];
      productRevenue = orderList.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
      productSales = orderList.length;
    }

    // Cancelados
    let cancQuery = supabase
      .from("appointments")
      .select("total_price")
      .gte("appointment_date", dateFrom)
      .eq("status", "cancelled");
    if (session.isBarberOnly && session.barberName) {
      cancQuery = cancQuery.eq("barber_name", session.barberName);
    }
    const { data: cancelled } = await cancQuery;
    const expenses = (cancelled ?? []).reduce((s, a) => s + (Number(a.total_price) || 0), 0);

    const grossRevenue = revenue + productRevenue;
    setStats({
      revenue: grossRevenue,
      expenses,
      netProfit: grossRevenue - expenses,
      totalAttendances,
      avgTicket,
      productSales,
    });

    const chartDays: any[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayRevenue = apptList.filter((a) => a.appointment_date === dateStr).reduce((sum, a) => sum + (Number(a.total_price) || 0), 0);
      const dayCount = apptList.filter((a) => a.appointment_date === dateStr).length;
      chartDays.push({ date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), receita: dayRevenue, atendimentos: dayCount });
    }
    setChartData(chartDays);

    const { data: services } = await supabase.from("services").select("id, title");
    if (services) {
      const serviceMap: Record<string, { title: string; count: number; revenue: number }> = {};
      for (const a of apptList) {
        if (a.service_id) {
          const svc = services.find((s) => s.id === a.service_id);
          const key = a.service_id;
          if (!serviceMap[key]) serviceMap[key] = { title: svc?.title || "—", count: 0, revenue: 0 };
          serviceMap[key].count++; serviceMap[key].revenue += Number(a.total_price) || 0;
        }
      }
      setTopServices(Object.values(serviceMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5));
    }

    const barberMap: Record<string, { name: string; count: number; revenue: number }> = {};
    for (const a of apptList) {
      if (a.barber_name) {
        if (!barberMap[a.barber_name]) barberMap[a.barber_name] = { name: a.barber_name, count: 0, revenue: 0 };
        barberMap[a.barber_name].count++; barberMap[a.barber_name].revenue += Number(a.total_price) || 0;
      }
    }
    setBarberRanking(Object.values(barberMap).sort((a, b) => b.revenue - a.revenue));
    setLoading(false);
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  const periodLabels: Record<Period, string> = { day: "Hoje", week: "7 dias", month: "30 dias" };

  const statCards = [
    { label: "Faturamento", value: formatCurrency(stats.revenue), icon: DollarSign, color: "hsl(140 60% 50%)" },
    { label: "Lucro Líquido", value: formatCurrency(stats.netProfit), icon: TrendingUp, color: "hsl(200 70% 55%)" },
    { label: "Atendimentos", value: stats.totalAttendances, icon: Users, color: "hsl(245 60% 65%)" },
    { label: "Ticket Médio", value: formatCurrency(stats.avgTicket), icon: CreditCard, color: "hsl(35 80% 55%)" },
    { label: "Vendas Produtos", value: stats.productSales, icon: ShoppingBag, color: "hsl(320 60% 55%)" },
    { label: "Cancelados (perda)", value: formatCurrency(stats.expenses), icon: PiggyBank, color: "hsl(0 60% 55%)" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Wallet className="w-5 h-5" style={{ color: t.accentPurple }} /> Financeiro
        </h2>
        <div className="flex gap-2">
          {(["day", "week", "month"] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: period === p ? t.accentPurple : t.cardBg,
                color: period === p ? "white" : t.textSecondary,
                border: `1px solid ${period === p ? t.accentPurple : t.borderSubtle}`,
              }}>
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {statCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${card.color}15`, border: `1px solid ${card.color}30` }}>
                <card.icon className="w-4 h-4" style={{ color: card.color }} />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-lg font-bold text-foreground">{card.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4" style={{ color: t.accentPurple }} /> Receita (14 dias)
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(245 60% 55%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(245 60% 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: t.textSecondary, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: t.textSecondary, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: t.tooltipBg, border: `1px solid ${t.tooltipBorder}`, borderRadius: "8px", color: t.tooltipColor, fontSize: 12 }}
                  formatter={(value: number) => [formatCurrency(value), "Receita"]} />
                <Area type="monotone" dataKey="receita" stroke="hsl(245 60% 55%)" fill="url(#colorReceita)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4" style={{ color: t.accentPurple }} /> Atendimentos (14 dias)
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.borderSubtle} />
                <XAxis dataKey="date" tick={{ fill: t.textSecondary, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: t.textSecondary, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: t.tooltipBg, border: `1px solid ${t.tooltipBorder}`, borderRadius: "8px", color: t.tooltipColor, fontSize: 12 }} />
                <Bar dataKey="atendimentos" fill="hsl(200 70% 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4" style={{ color: "hsl(35 80% 55%)" }} /> Serviços Mais Lucrativos
          </h3>
          <div className="space-y-3">
            {topServices.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum dado no período</p>
            ) : (
              topServices.map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ background: i === 0 ? "hsl(35 80% 55% / 0.15)" : t.cardBg, color: i === 0 ? "hsl(35 80% 55%)" : t.textSecondary }}>
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.title}</p>
                      <p className="text-[10px] text-muted-foreground">{s.count} atendimentos</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{formatCurrency(s.revenue)}</p>
                </div>
              ))
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <Users className="w-4 h-4" style={{ color: t.accentPurple }} /> Ranking de Barbeiros
          </h3>
          <div className="space-y-3">
            {barberRanking.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum dado no período</p>
            ) : (
              barberRanking.map((b, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        background: i === 0 ? t.accentPurpleBg : t.cardBg,
                        color: i === 0 ? t.accentPurple : t.textSecondary,
                        border: `1px solid ${i === 0 ? t.accentPurpleBorder : t.borderSubtle}`,
                      }}>
                      {b.name.charAt(0)}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{b.name}</p>
                      <p className="text-[10px] text-muted-foreground">{b.count} atendimentos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(b.revenue)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Finance;
