import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  CalendarDays,
  DollarSign,
  Scissors,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = [
  "hsl(245 60% 55%)",
  "hsl(200 70% 50%)",
  "hsl(160 60% 45%)",
  "hsl(280 60% 55%)",
  "hsl(30 70% 50%)",
  "hsl(350 60% 50%)",
];

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalAppointments: 0,
    totalRevenue: 0,
    totalServices: 0,
    todayAppointments: 0,
  });
  const [weeklyData, setWeeklyData] = useState<{ day: string; agendamentos: number; receita: number }[]>([]);
  const [serviceDistribution, setServiceDistribution] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const today = new Date().toISOString().split("T")[0];

    const [appointmentsRes, servicesRes] = await Promise.all([
      supabase.from("appointments").select("*"),
      supabase.from("services").select("*"),
    ]);

    const appointments = appointmentsRes.data || [];
    const services = servicesRes.data || [];

    const todayApps = appointments.filter((a) => a.appointment_date === today);
    const totalRevenue = appointments.reduce((sum, a) => sum + (Number(a.total_price) || 0), 0);

    setStats({
      totalAppointments: appointments.length,
      totalRevenue: totalRevenue,
      totalServices: services.filter((s) => s.active).length,
      todayAppointments: todayApps.length,
    });

    // Weekly data (last 7 days)
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const weekly = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split("T")[0];
      const dayApps = appointments.filter((a) => a.appointment_date === dateStr);
      return {
        day: days[d.getDay()],
        agendamentos: dayApps.length,
        receita: dayApps.reduce((s, a) => s + (Number(a.total_price) || 0), 0),
      };
    });
    setWeeklyData(weekly);

    // Service distribution
    const serviceCounts: Record<string, number> = {};
    for (const app of appointments) {
      const svc = services.find((s) => s.id === app.service_id);
      const name = svc?.title || "Outro";
      serviceCounts[name] = (serviceCounts[name] || 0) + 1;
    }
    setServiceDistribution(
      Object.entries(serviceCounts).map(([name, value]) => ({ name, value }))
    );
  };

  const statCards = [
    { label: "Agendamentos Hoje", value: stats.todayAppointments, icon: CalendarDays, color: "hsl(245 60% 55%)" },
    { label: "Total Agendamentos", value: stats.totalAppointments, icon: Users, color: "hsl(200 70% 50%)" },
    { label: "Receita Total", value: `R$ ${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: "hsl(160 60% 45%)" },
    { label: "Serviços Ativos", value: stats.totalServices, icon: Scissors, color: "hsl(280 60% 55%)" },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-4 sm:p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${card.color}20`, border: `1px solid ${card.color}30` }}>
                <card.icon className="w-4 h-4" style={{ color: card.color }} />
              </div>
              <TrendingUp className="w-3 h-3 text-muted-foreground" />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Area chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">Agendamentos (Últimos 7 dias)</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="gradAgend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(245 60% 55%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(245 60% 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: 'hsl(0 0% 50%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(0 0% 50%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(230 18% 11%)',
                    border: '1px solid hsl(0 0% 100% / 0.1)',
                    borderRadius: '12px',
                    color: 'hsl(0 0% 90%)',
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="agendamentos" stroke="hsl(245 60% 55%)" fill="url(#gradAgend)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Area chart - Receita */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">Receita (Últimos 7 dias)</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(200 70% 50%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(200 70% 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: 'hsl(0 0% 50%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(0 0% 50%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(230 18% 11%)',
                    border: '1px solid hsl(0 0% 100% / 0.1)',
                    borderRadius: '12px',
                    color: 'hsl(0 0% 90%)',
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="receita" stroke="hsl(200 70% 50%)" fill="url(#gradReceita)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Pie chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-card p-5"
      >
        <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição por Serviço</h3>
        <div className="h-64 flex items-center justify-center">
          {serviceDistribution.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum agendamento registrado ainda</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={serviceDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={55}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {serviceDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(230 18% 11%)',
                    border: '1px solid hsl(0 0% 100% / 0.1)',
                    borderRadius: '12px',
                    color: 'hsl(0 0% 90%)',
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
