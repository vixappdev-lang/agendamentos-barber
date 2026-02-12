import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Calendar, User, Clock, Send, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User as AuthUser } from "@supabase/supabase-js";

interface BookingService {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  duration: string;
  image: string;
}

interface BookingFlowProps {
  service: BookingService;
  onClose: () => void;
  user?: AuthUser | null;
}

interface DBBarber {
  id: string;
  name: string;
  specialty: string | null;
  avatar_url: string | null;
}

const steps = ["Serviço", "Barbeiro", "Data & Hora", "Seus Dados", "Confirmar"];

const BookingFlow = ({ service, onClose, user }: BookingFlowProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [barbers, setBarbers] = useState<DBBarber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<DBBarber | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loadingTimes, setLoadingTimes] = useState(false);

  // Fetch barbers and settings on mount
  useEffect(() => {
    const fetchData = async () => {
      const [barbersRes, settingsRes] = await Promise.all([
        supabase.from("barbers").select("id, name, specialty, avatar_url").eq("active", true).order("sort_order"),
        supabase.from("business_settings").select("key, value"),
      ]);
      if (barbersRes.data) setBarbers(barbersRes.data);
      if (settingsRes.data) {
        const map: Record<string, string> = {};
        for (const r of settingsRes.data) map[r.key] = r.value || "";
        setSettings(map);
      }
    };
    fetchData();
  }, []);

  // Fetch booked times when date or barber changes
  useEffect(() => {
    if (!selectedDate || !selectedBarber) { setBookedTimes([]); return; }
    const fetchBooked = async () => {
      setLoadingTimes(true);
      const { data } = await supabase
        .from("appointments")
        .select("appointment_time")
        .eq("appointment_date", selectedDate)
        .eq("barber_name", selectedBarber.name)
        .in("status", ["pending", "confirmed"]);
      setBookedTimes((data || []).map(a => a.appointment_time?.slice(0, 5)));
      setLoadingTimes(false);
    };
    fetchBooked();
  }, [selectedDate, selectedBarber]);

  // Generate available times from settings
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

  const availableTimes = generateTimes();

  const canProceed = () => {
    switch (currentStep) {
      case 0: return true;
      case 1: return !!selectedBarber;
      case 2: return !!selectedDate && !!selectedTime;
      case 3: return !!name && !!phone;
      default: return true;
    }
  };

  const next = () => { if (canProceed() && currentStep < steps.length - 1) setCurrentStep(currentStep + 1); };
  const back = () => { if (currentStep > 0) setCurrentStep(currentStep - 1); };

  const generateDates = () => {
    const dates: { label: string; value: string; weekday: string; day: string }[] = [];
    const today = new Date();
    const daysOff = (settings.days_off || "0").split(",").map(Number);
    for (let i = 1; i <= 21; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (!daysOff.includes(d.getDay())) {
        dates.push({
          label: d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }),
          value: d.toISOString().split("T")[0],
          weekday: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
          day: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        });
      }
      if (dates.length >= 14) break;
    }
    return dates;
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    const { error } = await supabase.from("appointments").insert({
      service_id: service.id,
      customer_name: name,
      customer_phone: phone,
      customer_email: user?.email || null,
      barber_name: selectedBarber?.name || null,
      appointment_date: selectedDate,
      appointment_time: selectedTime,
      total_price: service.price,
      status: "pending",
    });

    if (error) { toast.error("Erro ao agendar. Tente novamente."); setSubmitting(false); return; }
    toast.success("Agendamento realizado com sucesso!");

    const whatsapp = settings.whatsapp_number || "5511999999999";
    const dateFormatted = selectedDate ? new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR") : "";
    const msg = `Olá! Gostaria de confirmar meu agendamento:%0A%0A📋 *Serviço:* ${service.title}%0A💈 *Barbeiro:* ${selectedBarber?.name}%0A📅 *Data:* ${dateFormatted}%0A🕐 *Horário:* ${selectedTime}%0A👤 *Nome:* ${name}%0A📱 *Telefone:* ${phone}%0A💰 *Valor:* R$ ${service.price}`;
    window.open(`https://wa.me/${whatsapp}?text=${msg}`, "_blank");

    setSubmitting(false);
    onClose();
  };

  const dates = generateDates();
  const slideVariants = { enter: { x: 40, opacity: 0 }, center: { x: 0, opacity: 1 }, exit: { x: -40, opacity: 0 } };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'hsl(230 20% 7% / 0.85)', backdropFilter: 'blur(12px)' }}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className="glass-card-strong w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto scrollbar-hide rounded-t-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 min-[375px]:p-5 sticky top-0 z-10" style={{ borderBottom: '1px solid hsl(0 0% 100% / 0.06)', background: 'hsl(0 0% 100% / 0.04)', backdropFilter: 'blur(28px)' }}>
          <h2 className="text-lg min-[375px]:text-xl font-bold text-foreground">Agendamento</h2>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors" style={{ background: 'hsl(0 0% 100% / 0.05)' }}>
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center justify-between">
            {steps.map((step, i) => (
              <div key={step} className="flex items-center">
                <div className={`step-indicator ${i < currentStep ? "step-completed" : i === currentStep ? "step-active" : "step-inactive"}`}>
                  {i < currentStep ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                {i < steps.length - 1 && <div className="hidden sm:block w-8 h-px mx-1" style={{ background: i < currentStep ? 'hsl(245 60% 55% / 0.3)' : 'hsl(0 0% 100% / 0.06)' }} />}
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-3 font-medium">{steps[currentStep]}</p>
        </div>

        {/* Content */}
        <div className="p-5 min-h-[280px]">
          <AnimatePresence mode="wait">
            <motion.div key={currentStep} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>

              {currentStep === 0 && (
                <div className="glass-card p-4 flex items-center gap-4 overflow-hidden">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                    <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground">{service.title}</h3>
                    <p className="text-sm text-muted-foreground">{service.subtitle}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="gold-text font-bold text-lg">R$ {service.price}</span>
                      <span className="flex items-center gap-1 text-muted-foreground"><Clock className="w-3 h-3" /> {service.duration}</span>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-3">
                  {barbers.map((barber) => (
                    <button key={barber.id} onClick={() => setSelectedBarber(barber)}
                      className="w-full glass-card p-4 text-left transition-all"
                      style={{
                        borderColor: selectedBarber?.id === barber.id ? 'hsl(245 60% 55% / 0.3)' : undefined,
                        background: selectedBarber?.id === barber.id ? 'hsl(245 60% 55% / 0.06)' : undefined,
                      }}>
                      <div className="flex items-center gap-3">
                        {barber.avatar_url ? (
                          <img src={barber.avatar_url} alt={barber.name} className="w-11 h-11 rounded-xl object-cover" />
                        ) : (
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm"
                            style={{
                              background: selectedBarber?.id === barber.id ? 'linear-gradient(135deg, hsl(245 60% 50%), hsl(265 60% 55%))' : 'hsl(0 0% 100% / 0.05)',
                              color: selectedBarber?.id === barber.id ? 'hsl(0 0% 100%)' : 'hsl(0 0% 50%)',
                            }}>{barber.name.charAt(0)}</div>
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{barber.name}</h4>
                          <p className="text-sm text-muted-foreground">{barber.specialty || "Barbeiro"}</p>
                        </div>
                        {selectedBarber?.id === barber.id && <Check className="w-5 h-5 text-primary" />}
                      </div>
                    </button>
                  ))}
                  {barbers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum barbeiro disponível</p>}
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-primary" /> Data
                    </label>
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                      {dates.map((d) => (
                        <button key={d.value} onClick={() => { setSelectedDate(d.value); setSelectedTime(""); }}
                          className="shrink-0 w-16 py-3 rounded-xl text-center transition-all"
                          style={{
                            background: selectedDate === d.value ? 'linear-gradient(135deg, hsl(245 60% 50%), hsl(265 60% 55%))' : 'hsl(0 0% 100% / 0.04)',
                            border: `1px solid ${selectedDate === d.value ? 'transparent' : 'hsl(0 0% 100% / 0.06)'}`,
                            color: selectedDate === d.value ? 'hsl(0 0% 100%)' : 'hsl(0 0% 55%)',
                            boxShadow: selectedDate === d.value ? '0 4px 20px hsl(245 60% 55% / 0.25)' : 'none',
                          }}>
                          <span className="block text-[10px] uppercase font-medium opacity-70">{d.weekday}</span>
                          <span className="block text-sm font-bold mt-0.5">{d.day}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-primary" /> Horário
                    </label>
                    {loadingTimes ? (
                      <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-40 overflow-y-auto scrollbar-hide">
                        {availableTimes.map((t) => {
                          const isBooked = bookedTimes.includes(t);
                          return (
                            <button key={t} onClick={() => !isBooked && setSelectedTime(t)} disabled={isBooked}
                              className="py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed relative"
                              style={{
                                background: selectedTime === t ? 'linear-gradient(135deg, hsl(245 60% 50%), hsl(265 60% 55%))' : isBooked ? 'hsl(0 60% 50% / 0.08)' : 'hsl(0 0% 100% / 0.04)',
                                border: `1px solid ${selectedTime === t ? 'transparent' : isBooked ? 'hsl(0 60% 50% / 0.2)' : 'hsl(0 0% 100% / 0.06)'}`,
                                color: selectedTime === t ? 'hsl(0 0% 100%)' : isBooked ? 'hsl(0 60% 55%)' : 'hsl(0 0% 55%)',
                                boxShadow: selectedTime === t ? '0 4px 16px hsl(245 60% 55% / 0.2)' : 'none',
                              }}>
                              <span style={{ textDecoration: isBooked ? 'line-through' : 'none' }}>{t}</span>
                              {isBooked && <span className="block text-[9px] font-semibold mt-0.5" style={{ color: 'hsl(0 60% 55%)' }}>Agendado</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2"><User className="w-4 h-4 text-primary" /> Seu nome</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Digite seu nome" className="glass-input" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2"><Send className="w-4 h-4 text-primary" /> WhatsApp</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="glass-input" />
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground mb-4">Resumo do Agendamento</h3>
                  {[
                    { label: "Serviço", value: service.title },
                    { label: "Barbeiro", value: selectedBarber?.name || "" },
                    { label: "Data", value: selectedDate ? new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR") : "" },
                    { label: "Horário", value: selectedTime },
                    { label: "Nome", value: name },
                    { label: "WhatsApp", value: phone },
                    { label: "Valor", value: `R$ ${service.price}` },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between py-2.5" style={{ borderBottom: '1px solid hsl(0 0% 100% / 0.04)' }}>
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className="text-sm font-semibold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-5 flex items-center justify-between" style={{ borderTop: '1px solid hsl(0 0% 100% / 0.06)' }}>
          <button onClick={currentStep === 0 ? onClose : back} className="btn-secondary flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> {currentStep === 0 ? "Cancelar" : "Voltar"}
          </button>
          {currentStep < steps.length - 1 ? (
            <button onClick={next} disabled={!canProceed()} className="btn-primary flex items-center gap-2">
              Próximo <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleConfirm} disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: 'hsl(142 70% 40%)', color: 'white', boxShadow: '0 4px 20px hsl(142 70% 40% / 0.25)' }}>
              <Send className="w-4 h-4" /> {submitting ? "Enviando..." : "Confirmar & WhatsApp"}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BookingFlow;
