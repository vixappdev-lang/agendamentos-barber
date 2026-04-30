import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  ShoppingBag, DollarSign, Trophy, TrendingUp, Percent, Package, Download,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useThemeColors } from "@/hooks/useThemeColors";

type Period = "day" | "week" | "month";

const periodLabels: Record<Period, string> = { day: "Hoje", week: "7 dias", month: "30 dias" };

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const StoreKPIs = () => {
  const t = useThemeColors();
  const [period, setPeriod] = useState<Period>("month");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    revenue: 0,
    ordersCount: 0,
    avgTicket: 0,
    itemsSold: 0,
    cancelRate: 0,
    completionRate: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    const now = new Date();
    const dateFrom = new Date(now);
    if (period === "day") dateFrom.setHours(0, 0, 0, 0);
    else if (period === "week") dateFrom.setDate(dateFrom.getDate() - 7);
    else dateFrom.setDate(dateFrom.getDate() - 30);

    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .gte("created_at", dateFrom.toISOString())
      .order("created_at", { ascending: false });

    const allOrders = ordersData ?? [];
    const validStatuses = ["paid", "delivered", "completed", "confirmed", "preparing", "delivering"];
    const completed = allOrders.filter((o) => validStatuses.includes(o.status));
    const cancelled = allOrders.filter((o) => o.status === "cancelled");

    const revenue = completed.reduce((s, o) => s + (Number(o.total_price) || 0), 0);
    const ordersCount = completed.length;
    const avgTicket = ordersCount > 0 ? revenue / ordersCount : 0;
    const cancelRate = allOrders.length > 0 ? (cancelled.length / allOrders.length) * 100 : 0;
    const completionRate = allOrders.length > 0
      ? (allOrders.filter((o) => o.status === "completed").length / allOrders.length) * 100
      : 0;

    const orderIds = completed.map((o) => o.id);
    let itemsData: any[] = [];
    if (orderIds.length > 0) {
      const { data } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds);
      itemsData = data ?? [];
    }

    const itemsSold = itemsData.reduce((s, i) => s + (i.quantity || 0), 0);

    // Top products
    const productMap: Record<string, { title: string; qty: number; revenue: number }> = {};
    for (const it of itemsData) {
      const key = it.product_id || it.product_title;
      if (!productMap[key]) productMap[key] = { title: it.product_title, qty: 0, revenue: 0 };
      productMap[key].qty += it.quantity || 0;
      productMap[key].revenue += (Number(it.product_price) || 0) * (it.quantity || 0);
    }
    const top = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Chart 14 dias
    const days: any[] = [];
    const daysCount = period === "day" ? 1 : period === "week" ? 7 : 14;
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const dayRevenue = completed
        .filter((o) => {
          const od = new Date(o.created_at);
          return od >= d && od < next;
        })
        .reduce((s, o) => s + (Number(o.total_price) || 0), 0);
      days.push({
        date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        receita: dayRevenue,
      });
    }

    setStats({ revenue, ordersCount, avgTicket, itemsSold, cancelRate, completionRate });
    setChartData(days);
    setTopProducts(top);
    setOrders(completed);
    setItems(itemsData);
    setLoading(false);
  };

  const exportCSV = () => {
    const rows = [
      ["Pedido", "Cliente", "Telefone", "Status", "Modo", "Total", "Data"],
      ...orders.map((o) => [
        o.id.slice(0, 8),
        o.customer_name,
        o.customer_phone || "",
        o.status,
        o.delivery_mode,
        Number(o.total_price).toFixed(2),
        new Date(o.created_at).toLocaleString("pt-BR"),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loja_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cards = [
    { label: "Receita", value: formatCurrency(stats.revenue), icon: DollarSign, color: "hsl(140 60% 50%)" },
    { label: "Pedidos", value: stats.ordersCount, icon: ShoppingBag, color: "hsl(245 60% 65%)" },
    { label: "Ticket Médio", value: formatCurrency(stats.avgTicket), icon: TrendingUp, color: "hsl(200 70% 55%)" },
    { label: "Itens Vendidos", value: stats.itemsSold, icon: Package, color: "hsl(35 80% 55%)" },
    { label: "Taxa Conclusão", value: `${stats.completionRate.toFixed(1)}%`, icon: Percent, color: "hsl(160 60% 50%)" },
    { label: "Taxa Cancelamento", value: `${stats.cancelRate.toFixed(1)}%`, icon: Percent, color: "hsl(0 60% 55%)" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" style={{ color: t.accentPurple }} /> KPIs da Loja
        </h2>
        <div className="flex gap-2 items-center">
          {(["day", "week", "month"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: period === p ? t.accentPurple : t.cardBg,
                color: period === p ? "white" : t.textSecondary,
                border: `1px solid ${period === p ? t.accentPurple : t.borderSubtle}`,
              }}
            >
              {periodLabels[p]}
            </button>
          ))}
          <button
            onClick={exportCSV}
            disabled={orders.length === 0}
            className="ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40"
            style={{
              background: "hsl(140 60% 50% / 0.15)",
              color: "hsl(140 60% 60%)",
              border: "1px solid hsl(140 60% 50% / 0.3)",
            }}
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-4 space-y-2"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `${card.color}15`, border: `1px solid ${card.color}30` }}
            >
              <card.icon className="w-4 h-4" style={{ color: card.color }} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-lg font-bold text-foreground">{card.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-5"
      >
        <h3 className="text-sm font-semibold text-foreground mb-4">Receita por dia</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="storeRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(140 60% 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(140 60% 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: t.textSecondary, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: t.textSecondary, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: t.tooltipBg,
                  border: `1px solid ${t.tooltipBorder}`,
                  borderRadius: "8px",
                  color: t.tooltipColor,
                  fontSize: 12,
                }}
                formatter={(v: number) => [formatCurrency(v), "Receita"]}
              />
              <Area type="monotone" dataKey="receita" stroke="hsl(140 60% 50%)" fill="url(#storeRev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-5"
      >
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4" style={{ color: "hsl(35 80% 55%)" }} /> Produtos Mais Vendidos
        </h3>
        <div className="space-y-3">
          {topProducts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              {loading ? "Carregando..." : "Nenhum dado no período"}
            </p>
          ) : (
            topProducts.map((p, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{
                      background: i === 0 ? "hsl(35 80% 55% / 0.15)" : t.cardBg,
                      color: i === 0 ? "hsl(35 80% 55%)" : t.textSecondary,
                    }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.title}</p>
                    <p className="text-[10px] text-muted-foreground">{p.qty} unidades</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground">{formatCurrency(p.revenue)}</p>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default StoreKPIs;
