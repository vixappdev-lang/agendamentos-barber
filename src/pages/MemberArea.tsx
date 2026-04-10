import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, Calendar, Clock, LogOut, ChevronRight, Loader2, CheckCircle, XCircle, AlertCircle, User, Plus, ArrowLeft, LayoutDashboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { User as AuthUser } from "@supabase/supabase-js";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  barber_name: string | null;
  status: string | null;
  total_price: number | null;
  created_at: string | null;
  service_id: string | null;
  customer_name: string;
  service_title?: string;
}

const statusMap: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  pending: { label: "Pendente", color: "hsl(40 80% 55%)", bg: "hsl(40 80% 55% / 0.1)", icon: AlertCircle },
  confirmed: { label: "Confirmado", color: "hsl(140 60% 50%)", bg: "hsl(140 60% 50% / 0.1)", icon: CheckCircle },
  completed: { label: "Concluído", color: "hsl(210 60% 55%)", bg: "hsl(210 60% 55% / 0.1)", icon: CheckCircle },
  cancelled: { label: "Cancelado", color: "hsl(0 60% 55%)", bg: "hsl(0 60% 55% / 0.1)", icon: XCircle },
};

const MemberArea = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/vilanova/login", { replace: true }); return; }
      setUser(session.user);
      await fetchData(session.user.email!);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) navigate("/vilanova/login", { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchData = async (email: string) => {
    setLoading(true);
    const [aptsRes, svcRes] = await Promise.all([
      supabase.from("appointments").select("*").eq("customer_email", email).order("appointment_date", { ascending: false }),
      supabase.from("services").select("id, title"),
    ]);

    console.log("MemberArea fetchData email:", email, "aptsRes:", aptsRes, "svcRes:", svcRes);

    const svcMap: Record<string, string> = {};
    if (svcRes.data) svcRes.data.forEach((s: any) => { svcMap[s.id] = s.title; });
    setServices(svcMap);

    if (aptsRes.data) {
      setAppointments(aptsRes.data.map((a: any) => ({
        ...a,
        service_title: a.service_id ? svcMap[a.service_id] : "Serviço",
      })));
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/vilanova", { replace: true });
  };

  const today = new Date().toISOString().split("T")[0];
  const upcoming = appointments.filter(a => a.appointment_date >= today && a.status !== "cancelled");
  const history = appointments.filter(a => a.appointment_date < today || a.status === "cancelled");
  const totalCompleted = appointments.filter(a => a.status === "completed" || (a.appointment_date < today && a.status !== "cancelled")).length;

  const userName = user?.user_metadata?.full_name || "Membro";
  const firstName = userName.split(" ")[0];
  const initials = userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const bg = "hsl(220 20% 4%)";
  const cardBg = "hsl(0 0% 100% / 0.03)";
  const borderColor = "hsl(0 0% 100% / 0.08)";
  const btnBg = "hsl(0 0% 95%)";
  const btnColor = "hsl(220 20% 7%)";

  const AppointmentCard = ({ apt }: { apt: Appointment }) => {
    const status = statusMap[apt.status || "pending"] || statusMap.pending;
    const StatusIcon = status.icon;
    const dateStr = new Date(apt.appointment_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
    const isPast = apt.appointment_date < today;

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 sm:p-5 transition-all"
        style={{ background: cardBg, border: `1px solid ${borderColor}`, opacity: isPast ? 0.6 : 1 }}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(0 0% 100% / 0.05)" }}>
              <Scissors className="w-5 h-5" style={{ color: "hsl(0 0% 60%)" }} />
            </div>
            <div>
              <h4 className="font-bold text-sm">{apt.service_title || "Serviço"}</h4>
              {apt.barber_name && <p className="text-xs" style={{ color: "hsl(0 0% 50%)" }}>com {apt.barber_name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
            style={{ background: status.bg, color: status.color }}>
            <StatusIcon className="w-3 h-3" /> {status.label}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs" style={{ color: "hsl(0 0% 55%)" }}>
          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {dateStr}</span>
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {apt.appointment_time?.slice(0, 5)}</span>
          {apt.total_price && <span className="font-semibold" style={{ color: "hsl(0 0% 75%)" }}>R$ {Number(apt.total_price).toFixed(2)}</span>}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen w-full" style={{ background: bg, color: "hsl(0 0% 93%)", fontFamily: "'Montserrat', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 w-full" style={{ background: "hsl(220 20% 4% / 0.85)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${borderColor}` }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/vilanova" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: btnBg }}>
                <Scissors className="w-3.5 h-3.5" style={{ color: btnColor }} />
              </div>
              <span className="text-sm font-extrabold tracking-tight hidden sm:block">Vila Nova</span>
            </a>
            <div className="w-px h-5" style={{ background: borderColor }} />
            <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "hsl(0 0% 50%)" }}>
              <LayoutDashboard className="w-3.5 h-3.5" /> Área do Cliente
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.05)", border: `1px solid ${borderColor}` }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold" style={{ background: btnBg, color: btnColor }}>
                {initials}
              </div>
              <span className="text-xs font-medium hidden sm:block">{firstName}</span>
            </div>
            <button onClick={handleSignOut} className="p-2 rounded-lg transition-all hover:bg-white/5" title="Sair">
              <LogOut className="w-4 h-4" style={{ color: "hsl(0 0% 50%)" }} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Welcome */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Olá, {firstName}! 👋</h1>
            <p className="text-sm mt-1" style={{ color: "hsl(0 0% 50%)" }}>Gerencie seus agendamentos aqui.</p>
          </div>
          <button onClick={() => navigate("/vilanova#servicos")}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:translate-y-[-1px]"
            style={{ background: btnBg, color: btnColor }}>
            <Plus className="w-4 h-4" /> Novo Agendamento
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Total", value: appointments.length, icon: Calendar },
            { label: "Concluídos", value: totalCompleted, icon: CheckCircle },
            { label: "Próximos", value: upcoming.length, icon: Clock },
            { label: "Cancelados", value: appointments.filter(a => a.status === "cancelled").length, icon: XCircle },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl p-4 sm:p-5" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
              <stat.icon className="w-4 h-4 mb-2" style={{ color: "hsl(0 0% 45%)" }} />
              <p className="text-xl sm:text-2xl font-black">{stat.value}</p>
              <p className="text-[11px] font-medium mt-0.5" style={{ color: "hsl(0 0% 45%)" }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: "hsl(0 0% 100% / 0.03)", border: `1px solid ${borderColor}` }}>
          {(["upcoming", "history"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: tab === t ? btnBg : "transparent", color: tab === t ? btnColor : "hsl(0 0% 50%)" }}>
              {t === "upcoming" ? `Próximos (${upcoming.length})` : `Histórico (${history.length})`}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "hsl(0 0% 40%)" }} />
          </div>
        ) : (
          <div className="space-y-3">
            {(tab === "upcoming" ? upcoming : history).length === 0 ? (
              <div className="text-center py-16 rounded-2xl" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                <Calendar className="w-10 h-10 mx-auto mb-3" style={{ color: "hsl(0 0% 30%)" }} />
                <p className="font-semibold text-sm mb-1">{tab === "upcoming" ? "Nenhum agendamento próximo" : "Sem histórico ainda"}</p>
                <p className="text-xs" style={{ color: "hsl(0 0% 40%)" }}>
                  {tab === "upcoming" ? "Agende um horário para aparecer aqui." : "Seus agendamentos passados aparecerão aqui."}
                </p>
                {tab === "upcoming" && (
                  <button onClick={() => navigate("/vilanova#servicos")}
                    className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl text-xs font-bold"
                    style={{ background: btnBg, color: btnColor }}>
                    <Plus className="w-3.5 h-3.5" /> Agendar Agora
                  </button>
                )}
              </div>
            ) : (
              (tab === "upcoming" ? upcoming : history).map((apt) => (
                <AppointmentCard key={apt.id} apt={apt} />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default MemberArea;
