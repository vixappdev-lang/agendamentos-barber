import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, Calendar, Clock, LogOut, Loader2, CheckCircle, XCircle, AlertCircle, Plus, LayoutDashboard, ArrowLeft, ArrowRight, Check, User, Send, X } from "lucide-react";
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

interface DBService {
  id: string; title: string; subtitle: string | null; price: number;
  duration: string; image_url: string | null;
}

interface DBBarber {
  id: string; name: string; specialty: string | null; avatar_url: string | null;
}

const statusMap: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  pending: { label: "Pendente", color: "hsl(40 80% 55%)", bg: "hsl(40 80% 55% / 0.1)", icon: AlertCircle },
  confirmed: { label: "Confirmado", color: "hsl(140 60% 50%)", bg: "hsl(140 60% 50% / 0.1)", icon: CheckCircle },
  completed: { label: "Concluído", color: "hsl(210 60% 55%)", bg: "hsl(210 60% 55% / 0.1)", icon: CheckCircle },
  cancelled: { label: "Cancelado", color: "hsl(0 60% 55%)", bg: "hsl(0 60% 55% / 0.1)", icon: XCircle },
};

const bookingSteps = ["Serviço", "Barbeiro", "Data & Hora", "Confirmar"];

const MemberArea = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allServices, setAllServices] = useState<DBService[]>([]);
  const [serviceMap, setServiceMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");

  // Booking modal state
  const [showBooking, setShowBooking] = useState(false);
  const [bookingStep, setBookingStep] = useState(0);
  const [barbers, setBarbers] = useState<DBBarber[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [selectedService, setSelectedService] = useState<DBService | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<DBBarber | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

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
    const [aptsRes, svcRes, barbersRes, settingsRes] = await Promise.all([
      supabase.from("appointments").select("*").eq("customer_email", email).order("appointment_date", { ascending: false }),
      supabase.from("services").select("*").eq("active", true).order("sort_order"),
      supabase.from("barbers").select("id, name, specialty, avatar_url").eq("active", true).order("sort_order"),
      supabase.from("business_settings").select("key, value"),
    ]);

    const sMap: Record<string, string> = {};
    if (svcRes.data) {
      setAllServices(svcRes.data as DBService[]);
      svcRes.data.forEach((s: any) => { sMap[s.id] = s.title; });
    }
    setServiceMap(sMap);
    if (barbersRes.data) setBarbers(barbersRes.data);
    if (settingsRes.data) {
      const map: Record<string, string> = {};
      for (const r of settingsRes.data) map[r.key] = r.value || "";
      setSettings(map);
    }

    if (aptsRes.data) {
      setAppointments(aptsRes.data.map((a: any) => ({
        ...a,
        service_title: a.service_id ? sMap[a.service_id] : "Serviço",
      })));
    }
    setLoading(false);
  };

  // Fetch booked times when date/barber changes
  useEffect(() => {
    if (!selectedDate || !selectedBarber) { setBookedTimes([]); return; }
    const fetchBooked = async () => {
      setLoadingTimes(true);
      const { data } = await supabase
        .from("appointments").select("appointment_time")
        .eq("appointment_date", selectedDate).eq("barber_name", selectedBarber.name)
        .in("status", ["pending", "confirmed"]);
      setBookedTimes((data || []).map(a => a.appointment_time?.slice(0, 5)));
      setLoadingTimes(false);
    };
    fetchBooked();
  }, [selectedDate, selectedBarber]);

  const generateTimes = () => {
    const opening = settings.opening_time || "09:00";
    const closing = settings.closing_time || "19:00";
    const lunchStart = settings.lunch_start || "12:00";
    const lunchEnd = settings.lunch_end || "13:00";
    const times: string[] = [];
    const [oh, om] = opening.split(":").map(Number);
    const [ch, cm] = closing.split(":").map(Number);
    const [lsh, lsm] = lunchStart.split(":").map(Number);
    const [leh, lem] = lunchEnd.split(":").map(Number);
    let h = oh, m = om;
    while (h < ch || (h === ch && m < cm)) {
      const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const inLunch = (h > lsh || (h === lsh && m >= lsm)) && (h < leh || (h === leh && m < lem));
      if (!inLunch) times.push(time);
      m += 30;
      if (m >= 60) { h++; m = 0; }
    }
    return times;
  };

  const generateDates = () => {
    const dates: { value: string; weekday: string; day: string }[] = [];
    const todayDate = new Date();
    const daysOff = (settings.days_off || "0").split(",").map(Number);
    for (let i = 1; i <= 21; i++) {
      const d = new Date(todayDate);
      d.setDate(todayDate.getDate() + i);
      if (!daysOff.includes(d.getDay())) {
        dates.push({
          value: d.toISOString().split("T")[0],
          weekday: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
          day: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        });
      }
      if (dates.length >= 14) break;
    }
    return dates;
  };

  const availableTimes = generateTimes();
  const dates = generateDates();

  const canProceedBooking = () => {
    switch (bookingStep) {
      case 0: return !!selectedService;
      case 1: return !!selectedBarber;
      case 2: return !!selectedDate && !!selectedTime;
      default: return true;
    }
  };

  const handleBookingConfirm = async () => {
    if (!user || !selectedService) return;
    setSubmitting(true);

    const fullName = user.user_metadata?.full_name || "Cliente";
    const phone = user.user_metadata?.phone || "";
    const customerEmail = user.email!;

    const { error } = await supabase.from("appointments").insert({
      service_id: selectedService.id,
      customer_name: fullName,
      customer_phone: phone,
      customer_email: customerEmail,
      barber_name: selectedBarber?.name || null,
      appointment_date: selectedDate,
      appointment_time: selectedTime,
      total_price: selectedService.price,
      status: "pending",
    });

    if (error) {
      toast.error("Erro ao agendar. Tente novamente.");
      console.error("Booking error:", error);
      setSubmitting(false);
      return;
    }

    // Send WhatsApp
    try {
      const digitsOnly = phone.replace(/\D/g, "");
      const dateFormatted = new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR");
      const memberLink = `https://vilanova-demo.vercel.app/vilanova/membro`;
      const msg = `✅ *Agendamento Confirmado!*\n\nOlá *${fullName.split(" ")[0]}*, tudo certo!\n\n💈 ${selectedService.title}\n✂️ ${selectedBarber?.name}\n📅 ${dateFormatted} às ${selectedTime}\n💰 R$ ${selectedService.price.toFixed(2)}\n\n📍 Av. Afonso Pena, 1500 - Centro, Belo Horizonte/MG\n⏰ Chegue 5 min antes\n\n🔗 Acesse sua área de membro:\n${memberLink}\n\n*Barbearia Vila Nova* 💈`;
      if (digitsOnly.length >= 10) {
        await supabase.functions.invoke("chatpro", {
          body: { action: "send_message", phone: digitsOnly, message: msg },
        });
      }
    } catch (e) { console.error("WhatsApp error:", e); }

    setSubmitting(false);
    setShowBooking(false);
    setShowConfirmation(true);

    // Refresh data
    await fetchData(customerEmail);
  };

  const closeBooking = () => {
    setShowBooking(false);
    setBookingStep(0);
    setSelectedService(null);
    setSelectedBarber(null);
    setSelectedDate("");
    setSelectedTime("");
  };

  const closeConfirmation = () => {
    setShowConfirmation(false);
    setSelectedService(null);
    setSelectedBarber(null);
    setSelectedDate("");
    setSelectedTime("");
    setBookingStep(0);
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
          <button onClick={() => { setShowBooking(true); setBookingStep(0); }}
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
                  <button onClick={() => { setShowBooking(true); setBookingStep(0); }}
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

      {/* ─── BOOKING MODAL ─── */}
      <AnimatePresence>
        {showBooking && !showConfirmation && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
            style={{ background: "hsl(220 20% 4% / 0.9)", backdropFilter: "blur(12px)" }}>
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto scrollbar-hide rounded-t-2xl sm:rounded-2xl"
              style={{ background: "hsl(0 0% 100% / 0.04)", backdropFilter: "blur(28px)", border: "1px solid hsl(0 0% 100% / 0.08)", boxShadow: "0 8px 32px hsl(0 0% 0% / 0.4)" }}>

              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 sticky top-0 z-10" style={{ borderBottom: "1px solid hsl(0 0% 100% / 0.06)", background: "hsl(0 0% 100% / 0.03)", backdropFilter: "blur(28px)" }}>
                <h2 className="text-lg sm:text-xl font-bold">Novo Agendamento</h2>
                <button onClick={closeBooking} className="p-2 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.05)" }}>
                  <X className="w-5 h-5" style={{ color: "hsl(0 0% 60%)" }} />
                </button>
              </div>

              {/* Steps */}
              <div className="px-4 sm:px-5 pt-4 pb-2">
                <div className="flex items-center justify-between">
                  {bookingSteps.map((step, i) => (
                    <div key={step} className="flex items-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all"
                        style={i < bookingStep ? { background: "hsl(0 0% 90% / 0.15)", color: "hsl(0 0% 80%)" } : i === bookingStep ? { background: btnBg, color: btnColor } : { background: "hsl(0 0% 100% / 0.05)", color: "hsl(0 0% 40%)" }}>
                        {i < bookingStep ? <Check className="w-4 h-4" /> : i + 1}
                      </div>
                      {i < bookingSteps.length - 1 && <div className="hidden sm:block w-6 lg:w-8 h-px mx-1" style={{ background: i < bookingStep ? "hsl(0 0% 100% / 0.15)" : "hsl(0 0% 100% / 0.06)" }} />}
                    </div>
                  ))}
                </div>
                <p className="text-sm mt-3 font-medium" style={{ color: "hsl(0 0% 55%)" }}>{bookingSteps[bookingStep]}</p>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-5 min-h-[280px]">
                {bookingStep === 0 && (
                  <div className="space-y-2">
                    {allServices.map((svc) => (
                      <button key={svc.id} onClick={() => setSelectedService(svc)}
                        className="w-full rounded-xl p-4 text-left transition-all"
                        style={{ background: selectedService?.id === svc.id ? "hsl(0 0% 100% / 0.08)" : "hsl(0 0% 100% / 0.03)", border: `1px solid ${selectedService?.id === svc.id ? "hsl(0 0% 100% / 0.15)" : "hsl(0 0% 100% / 0.06)"}` }}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-sm">{svc.title}</h4>
                            <p className="text-xs mt-0.5" style={{ color: "hsl(0 0% 50%)" }}>{svc.duration}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">R$ {svc.price}</span>
                            {selectedService?.id === svc.id && <Check className="w-5 h-5" />}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {bookingStep === 1 && (
                  <div className="space-y-2">
                    {barbers.map((b) => (
                      <button key={b.id} onClick={() => setSelectedBarber(b)}
                        className="w-full rounded-xl p-4 text-left transition-all"
                        style={{ background: selectedBarber?.id === b.id ? "hsl(0 0% 100% / 0.08)" : "hsl(0 0% 100% / 0.03)", border: `1px solid ${selectedBarber?.id === b.id ? "hsl(0 0% 100% / 0.15)" : "hsl(0 0% 100% / 0.06)"}` }}>
                        <div className="flex items-center gap-3">
                          {b.avatar_url ? (
                            <img src={b.avatar_url} alt={b.name} className="w-11 h-11 rounded-xl object-cover" />
                          ) : (
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm"
                              style={{ background: selectedBarber?.id === b.id ? btnBg : "hsl(0 0% 100% / 0.05)", color: selectedBarber?.id === b.id ? btnColor : "hsl(0 0% 50%)" }}>
                              {b.name.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold">{b.name}</h4>
                            <p className="text-xs truncate" style={{ color: "hsl(0 0% 50%)" }}>{b.specialty || "Barbeiro"}</p>
                          </div>
                          {selectedBarber?.id === b.id && <Check className="w-5 h-5 shrink-0" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {bookingStep === 2 && (
                  <div className="space-y-5">
                    <div>
                      <label className="text-sm font-semibold flex items-center gap-2 mb-3"><Calendar className="w-4 h-4" style={{ color: "hsl(0 0% 55%)" }} /> Data</label>
                      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                        {dates.map((d) => (
                          <button key={d.value} onClick={() => { setSelectedDate(d.value); setSelectedTime(""); }}
                            className="shrink-0 w-16 py-3 rounded-xl text-center transition-all"
                            style={{ background: selectedDate === d.value ? btnBg : "hsl(0 0% 100% / 0.04)", border: `1px solid ${selectedDate === d.value ? "transparent" : "hsl(0 0% 100% / 0.06)"}`, color: selectedDate === d.value ? btnColor : "hsl(0 0% 55%)" }}>
                            <span className="block text-[10px] uppercase font-medium opacity-70">{d.weekday}</span>
                            <span className="block text-sm font-bold mt-0.5">{d.day}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold flex items-center gap-2 mb-3"><Clock className="w-4 h-4" style={{ color: "hsl(0 0% 55%)" }} /> Horário</label>
                      {loadingTimes ? (
                        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "hsl(0 0% 50%)" }} /></div>
                      ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-40 overflow-y-auto scrollbar-hide">
                          {availableTimes.map((t) => {
                            const isBooked = bookedTimes.includes(t);
                            return (
                              <button key={t} onClick={() => !isBooked && setSelectedTime(t)} disabled={isBooked}
                                className="py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                style={{ background: selectedTime === t ? btnBg : isBooked ? "hsl(0 60% 50% / 0.08)" : "hsl(0 0% 100% / 0.04)", border: `1px solid ${selectedTime === t ? "transparent" : "hsl(0 0% 100% / 0.06)"}`, color: selectedTime === t ? btnColor : isBooked ? "hsl(0 60% 55%)" : "hsl(0 0% 55%)" }}>
                                <span style={{ textDecoration: isBooked ? "line-through" : "none" }}>{t}</span>
                                {isBooked && <span className="block text-[9px] font-semibold mt-0.5" style={{ color: "hsl(0 60% 55%)" }}>Agendado</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {bookingStep === 3 && (
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold mb-4">Resumo</h3>
                    {[
                      { label: "Serviço", value: selectedService?.title || "" },
                      { label: "Barbeiro", value: selectedBarber?.name || "" },
                      { label: "Data", value: selectedDate ? new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR") : "" },
                      { label: "Horário", value: selectedTime },
                      { label: "Cliente", value: userName },
                      { label: "Valor", value: selectedService ? `R$ ${selectedService.price}` : "" },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between py-2.5" style={{ borderBottom: "1px solid hsl(0 0% 100% / 0.04)" }}>
                        <span className="text-sm" style={{ color: "hsl(0 0% 50%)" }}>{item.label}</span>
                        <span className="text-sm font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-5 flex items-center justify-between" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.06)" }}>
                <button onClick={bookingStep === 0 ? closeBooking : () => setBookingStep(bookingStep - 1)}
                  className="flex items-center gap-2 px-4 sm:px-5 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{ background: "hsl(0 0% 100% / 0.05)", border: "1px solid hsl(0 0% 100% / 0.08)", color: "hsl(0 0% 65%)" }}>
                  <ArrowLeft className="w-4 h-4" /> {bookingStep === 0 ? "Cancelar" : "Voltar"}
                </button>
                {bookingStep < bookingSteps.length - 1 ? (
                  <button onClick={() => canProceedBooking() && setBookingStep(bookingStep + 1)} disabled={!canProceedBooking()}
                    className="flex items-center gap-2 px-5 sm:px-6 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-35"
                    style={{ background: btnBg, color: btnColor }}>
                    Próximo <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={handleBookingConfirm} disabled={submitting}
                    className="flex items-center gap-2 px-5 sm:px-6 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                    style={{ background: btnBg, color: btnColor }}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {submitting ? "..." : "Confirmar"}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── CONFIRMATION MODAL ─── */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "hsl(220 20% 4% / 0.92)", backdropFilter: "blur(12px)" }}>
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }}
              className="w-full max-w-sm p-7 text-center space-y-5 rounded-2xl"
              style={{ background: "hsl(0 0% 100% / 0.04)", backdropFilter: "blur(28px)", border: "1px solid hsl(0 0% 100% / 0.08)" }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
                style={{ background: "hsl(140 60% 45% / 0.12)", border: "2px solid hsl(140 60% 45% / 0.3)" }}>
                <CheckCircle className="w-10 h-10" style={{ color: "hsl(140 60% 50%)" }} />
              </motion.div>
              <div>
                <h3 className="text-2xl font-black tracking-tight">Tudo Certo! 🎉</h3>
                <p className="text-base font-semibold mt-2">Seu agendamento foi confirmado!</p>
                <p className="text-sm mt-2" style={{ color: "hsl(0 0% 55%)" }}>
                  Você receberá uma confirmação no seu WhatsApp com todos os detalhes.
                </p>
              </div>

              <div className="p-4 rounded-xl space-y-2 text-left" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                {[
                  { icon: "💈", text: selectedService?.title },
                  { icon: "✂️", text: selectedBarber?.name },
                  { icon: "📅", text: selectedDate ? new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) : "" },
                  { icon: "🕐", text: selectedTime ? `às ${selectedTime}` : "" },
                  { icon: "💰", text: selectedService ? `R$ ${selectedService.price.toFixed(2)}` : "" },
                ].filter(item => item.text).map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm">
                    <span>{item.icon}</span>
                    <span style={{ color: "hsl(0 0% 80%)" }}>{item.text}</span>
                  </div>
                ))}
              </div>

              <motion.button onClick={closeConfirmation}
                className="w-full py-3.5 rounded-xl font-bold text-sm"
                style={{ background: btnBg, color: btnColor }}
                whileTap={{ scale: 0.98 }}>
                Ok
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MemberArea;
