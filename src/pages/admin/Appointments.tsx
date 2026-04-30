import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { CalendarDays, Search, ChevronLeft, ChevronRight, Check, X, Clock, CheckCircle2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePanelSession } from "@/hooks/usePanelSession";

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  barber_name: string | null;
  appointment_date: string;
  appointment_time: string;
  status: string | null;
  total_price: number | null;
  service_id: string | null;
  services?: { title: string } | null;
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "hsl(40 70% 50% / 0.12)", text: "hsl(40 70% 55%)", label: "Pendente" },
  confirmed: { bg: "hsl(200 70% 50% / 0.12)", text: "hsl(200 70% 55%)", label: "Confirmado" },
  completed: { bg: "hsl(160 60% 45% / 0.12)", text: "hsl(160 60% 55%)", label: "Concluído" },
  cancelled: { bg: "hsl(0 60% 50% / 0.12)", text: "hsl(0 60% 55%)", label: "Cancelado" },
};

const Appointments = () => {
  const session = usePanelSession();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"day" | "month">("month");

  useEffect(() => {
    if (session.loading) return;
    fetchAppointments();

    const channel = supabase
      .channel('admin-appointments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => fetchAppointments()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedDate, currentMonth, filterMode, session.loading, session.barberName]);

  const fetchAppointments = async () => {
    let query = supabase
      .from("appointments")
      .select("*, services(title)")
      .order("appointment_date", { ascending: false })
      .order("appointment_time", { ascending: true });

    if (filterMode === "day" && selectedDate) {
      query = query.eq("appointment_date", selectedDate);
    } else if (filterMode === "month") {
      const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
      query = query.gte("appointment_date", start).lte("appointment_date", end);
    }

    // Isolamento: barbeiro só vê os próprios agendamentos
    if (session.isBarberOnly && session.barberName) {
      query = query.eq("barber_name", session.barberName);
    }

    const { data } = await query;
    setAppointments((data as Appointment[]) || []);
  };

  const generateToken = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID().replace(/-/g, "");
    }
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  };

  const DEFAULT_TEMPLATES: Record<string, string> = {
    confirmed_whatsapp_template:
      "✅ Olá *{cliente}*! Seu agendamento na *{barbearia}* foi *CONFIRMADO*.\n\n📅 {data} às {hora}{barbeiro_linha}\n\nTe esperamos! 💈",
    cancelled_whatsapp_template:
      "❌ Olá *{cliente}*, infelizmente seu agendamento na *{barbearia}* do dia {data} às {hora} foi *cancelado*.\n\nEntre em contato para reagendar.",
    review_whatsapp_template:
      "⭐ Olá *{cliente}*! Como foi seu atendimento na *{barbearia}*?\n\nDeixe sua avaliação: {link}\n\nSua opinião é muito importante 💈",
  };

  const STATUS_TEMPLATE_KEY: Record<string, string> = {
    confirmed: "confirmed_whatsapp_template",
    cancelled: "cancelled_whatsapp_template",
  };

  const ENABLED_KEY: Record<string, string> = {
    confirmed_whatsapp_template: "confirmed_send_enabled",
    cancelled_whatsapp_template: "cancelled_send_enabled",
    review_whatsapp_template: "review_send_enabled",
  };

  const renderTemplate = (tmpl: string, vars: Record<string, string>) => {
    let out = tmpl;
    Object.entries(vars).forEach(([k, v]) => {
      const escaped = `{${k}}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      out = out.replace(new RegExp(escaped, "g"), v);
    });
    return out;
  };

  const fetchSettingsMap = async (keys: string[]) => {
    const { data } = await supabase
      .from("business_settings")
      .select("key,value")
      .in("key", keys);
    const map: Record<string, string> = {};
    (data || []).forEach((s: any) => { map[s.key] = s.value || ""; });
    return map;
  };

  const buildAppointmentVars = (a: Appointment, businessName: string, link?: string) => ({
    cliente: a.customer_name,
    barbearia: businessName,
    data: format(new Date(a.appointment_date + "T00:00:00"), "dd/MM/yyyy"),
    hora: a.appointment_time?.slice(0, 5) || "",
    barbeiro: a.barber_name ? `\n💈 Barbeiro: ${a.barber_name}` : "",
    barbeiro_linha: a.barber_name ? `\n💈 Barbeiro: ${a.barber_name}` : "",
    link: link || "",
  });

  const sendReviewWhatsApp = async (a: Appointment, token: string) => {
    if (!a.customer_phone) return;
    try {
      const map = await fetchSettingsMap([
        "business_name",
        "review_whatsapp_template",
        "review_send_enabled",
      ]);
      if (map.review_send_enabled === "false") return;
      const businessName = map.business_name || "Barbearia";
      const link = `${window.location.origin}/avaliacao?token=${token}`;
      const tmpl = map.review_whatsapp_template || DEFAULT_TEMPLATES.review_whatsapp_template;
      const message = renderTemplate(tmpl, buildAppointmentVars(a, businessName, link));
      await supabase.functions.invoke("chatpro", {
        body: { action: "send_message", phone: a.customer_phone, message },
      });
    } catch (e) {
      console.error("Review WhatsApp error:", e);
    }
  };

  const sendStatusWhatsApp = async (a: Appointment, status: string) => {
    if (!a.customer_phone) return;
    const templateKey = STATUS_TEMPLATE_KEY[status];
    if (!templateKey) return;
    try {
      const enabledKey = ENABLED_KEY[templateKey];
      const map = await fetchSettingsMap([
        "business_name",
        templateKey,
        ...(enabledKey ? [enabledKey] : []),
      ]);
      if (enabledKey && map[enabledKey] === "false") return;
      const businessName = map.business_name || "Barbearia";
      const tmpl = map[templateKey] || DEFAULT_TEMPLATES[templateKey];
      const message = renderTemplate(tmpl, buildAppointmentVars(a, businessName));
      await supabase.functions.invoke("chatpro", {
        body: { action: "send_message", phone: a.customer_phone, message },
      });
    } catch (e) {
      console.error("Status WhatsApp error:", e);
    }
  };

  const writeNotification = async (a: Appointment, status: string) => {
    if (!a.customer_email && !a.customer_phone) return;
    try {
      const titles: Record<string, string> = {
        confirmed: "Agendamento confirmado",
        cancelled: "Agendamento cancelado",
        completed: "Atendimento concluído",
      };
      const messages: Record<string, string> = {
        confirmed: `Seu agendamento ${format(new Date(a.appointment_date + "T00:00:00"), "dd/MM/yyyy")} às ${a.appointment_time?.slice(0, 5)} foi confirmado.`,
        cancelled: `Seu agendamento ${format(new Date(a.appointment_date + "T00:00:00"), "dd/MM/yyyy")} às ${a.appointment_time?.slice(0, 5)} foi cancelado.`,
        completed: `Obrigado pela visita! Que tal avaliar seu atendimento?`,
      };
      if (!titles[status]) return;
      await supabase.from("notifications").insert({
        customer_email: a.customer_email || null,
        customer_phone: a.customer_phone || null,
        title: titles[status],
        message: messages[status],
        type: status,
        appointment_id: a.id,
      });
    } catch (e) {
      console.error("Notification error:", e);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const target = appointments.find((a) => a.id === id);
    const patch: Record<string, any> = { status };
    let token: string | null = null;
    if (status === "completed") {
      token = generateToken();
      patch.review_token = token;
    }
    await supabase.from("appointments").update(patch).eq("id", id);
    if (target) {
      if (status === "completed" && token) {
        await sendReviewWhatsApp(target, token);
      } else {
        await sendStatusWhatsApp(target, status);
      }
      await writeNotification(target, status);
    }
    fetchAppointments();
  };

  const filtered = appointments.filter(
    (a) =>
      a.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      a.barber_name?.toLowerCase().includes(search.toLowerCase()) ||
      (a.services as any)?.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <h2 className="text-lg font-bold text-foreground">Agendamentos</h2>

        {/* Filter mode toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterMode("day")}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={filterMode === "day" ? { background: 'hsl(245 60% 55% / 0.15)', color: 'hsl(245 60% 70%)', border: '1px solid hsl(245 60% 55% / 0.3)' } : { background: 'hsl(0 0% 100% / 0.05)', color: 'hsl(0 0% 60%)', border: '1px solid transparent' }}
          >
            Por Dia
          </button>
          <button
            onClick={() => setFilterMode("month")}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={filterMode === "month" ? { background: 'hsl(245 60% 55% / 0.15)', color: 'hsl(245 60% 70%)', border: '1px solid hsl(245 60% 55% / 0.3)' } : { background: 'hsl(0 0% 100% / 0.05)', color: 'hsl(0 0% 60%)', border: '1px solid transparent' }}
          >
            Por Mês
          </button>
        </div>
      </div>

      {/* Filter controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {filterMode === "day" ? (
          <div className="relative flex-1 max-w-xs">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              className="glass-input pl-10 text-sm"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg" style={{ background: 'hsl(0 0% 100% / 0.05)' }}>
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
            <span className="text-sm font-semibold text-foreground min-w-[140px] text-center capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg" style={{ background: 'hsl(0 0% 100% / 0.05)' }}>
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
          </div>
        )}

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            className="glass-input pl-10 text-sm"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((a) => {
          const st = statusColors[a.status || "pending"] || statusColors.pending;
          return (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground">{a.customer_name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: st.bg, color: st.text }}>
                      {st.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {format(new Date(a.appointment_date + "T00:00:00"), "dd/MM/yyyy")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {a.appointment_time?.slice(0, 5)}
                    </span>
                    {(a.services as any)?.title && (
                      <span>{(a.services as any).title}</span>
                    )}
                    {a.barber_name && <span>• {a.barber_name}</span>}
                  </div>
                </div>

                {a.total_price && (
                  <span className="text-sm font-bold shrink-0" style={{ color: 'hsl(245 60% 70%)' }}>
                    R$ {Number(a.total_price).toFixed(2)}
                  </span>
                )}

                <div className="flex items-center gap-1 shrink-0">
                  {a.status !== "confirmed" && a.status !== "completed" && a.status !== "cancelled" && (
                    <button
                      onClick={() => updateStatus(a.id, "confirmed")}
                      title="Confirmar e avisar cliente"
                      className="p-2 rounded-lg transition-colors"
                      style={{ background: 'hsl(200 70% 50% / 0.1)' }}
                    >
                      <CheckCircle2 className="w-4 h-4" style={{ color: 'hsl(200 70% 55%)' }} />
                    </button>
                  )}
                  {a.status !== "completed" && (
                    <button
                      onClick={() => updateStatus(a.id, "completed")}
                      title="Concluir"
                      className="p-2 rounded-lg transition-colors"
                      style={{ background: 'hsl(160 60% 45% / 0.1)' }}
                    >
                      <Check className="w-4 h-4" style={{ color: 'hsl(160 60% 55%)' }} />
                    </button>
                  )}
                  {a.status !== "cancelled" && (
                    <button
                      onClick={() => updateStatus(a.id, "cancelled")}
                      title="Cancelar"
                      className="p-2 rounded-lg transition-colors"
                      style={{ background: 'hsl(0 60% 50% / 0.1)' }}
                    >
                      <X className="w-4 h-4" style={{ color: 'hsl(0 60% 55%)' }} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum agendamento encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Appointments;
