import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, Clock, MapPin, Phone, Instagram, ChevronRight, Star, X, ArrowLeft, ArrowRight, Check, Calendar, User, Send, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const heroImages = [
  "https://cdn.cashbarber.com.br/1733331980-673960.png",
  "https://cdn.cashbarber.com.br/1733492970-621580.jpg",
  "https://cdn.cashbarber.com.br/1733492971-363604.png",
];

const galleryImages = [
  "https://cdn.cashbarber.com.br/1733331980-673960.png",
  "https://cdn.cashbarber.com.br/1733492970-621580.jpg",
  "https://cdn.cashbarber.com.br/1733492971-363604.png",
];

interface DBService {
  id: string; title: string; subtitle: string | null; price: number;
  duration: string; image_url: string | null;
}

interface DBBarber {
  id: string; name: string; specialty: string | null; avatar_url: string | null;
}

const steps = ["Serviço", "Barbeiro", "Data & Hora", "Seus Dados", "Confirmar"];

const VilaNova = () => {
  const [heroIndex, setHeroIndex] = useState(0);
  const [services, setServices] = useState<DBService[]>([]);
  const [barbers, setBarbers] = useState<DBBarber[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [selectedService, setSelectedService] = useState<DBService | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Booking state
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedBarber, setSelectedBarber] = useState<DBBarber | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroIndex((p) => (p + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const [servicesRes, barbersRes, settingsRes] = await Promise.all([
        supabase.from("services").select("*").eq("active", true).order("sort_order"),
        supabase.from("barbers").select("id, name, specialty, avatar_url").eq("active", true).order("sort_order"),
        supabase.from("business_settings").select("key, value"),
      ]);
      if (servicesRes.data) setServices(servicesRes.data as DBService[]);
      if (barbersRes.data) setBarbers(barbersRes.data);
      if (settingsRes.data) {
        const map: Record<string, string> = {};
        for (const r of settingsRes.data) map[r.key] = r.value || "";
        setSettings(map);
      }
    };
    fetchData();
  }, []);

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
    const today = new Date();
    const daysOff = (settings.days_off || "0").split(",").map(Number);
    for (let i = 1; i <= 21; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
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

  const canProceed = () => {
    switch (currentStep) {
      case 0: return true;
      case 1: return !!selectedBarber;
      case 2: return !!selectedDate && !!selectedTime;
      case 3: return !!name && !!surname && !!phone && !!password;
      default: return true;
    }
  };

  const handleConfirm = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) { toast.error("Nome inválido."); return; }
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length < 10) { toast.error("Telefone inválido."); return; }

    setSubmitting(true);
    const { error } = await supabase.from("appointments").insert({
      service_id: selectedService!.id,
      customer_name: `${name.trim()} ${surname.trim()}`,
      customer_phone: phone,
      barber_name: selectedBarber?.name || null,
      appointment_date: selectedDate,
      appointment_time: selectedTime,
      total_price: selectedService!.price,
      status: "pending",
    });

    if (error) { toast.error("Erro ao agendar."); setSubmitting(false); return; }

    // Send WhatsApp
    try {
      const dateFormatted = new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR");
      const msg = `✅ *Agendamento Confirmado!*\n\nOlá *${name}*, tudo certo!\n\n💈 ${selectedService!.title}\n✂️ ${selectedBarber?.name}\n📅 ${dateFormatted} às ${selectedTime}\n💰 R$ ${selectedService!.price.toFixed(2)}\n\n📍 Barbearia Vila Nova - Colatina/ES\n⏰ Chegue 5 min antes\n\n*Barbearia Vila Nova* 💈`;
      await supabase.functions.invoke("chatpro", {
        body: { action: "send_message", phone: digitsOnly, message: msg },
      });
    } catch (e) {
      console.error("WhatsApp error:", e);
    }

    setSubmitting(false);
    setShowConfirmation(true);
  };

  const closeBooking = () => {
    setSelectedService(null);
    setCurrentStep(0);
    setSelectedBarber(null);
    setSelectedDate("");
    setSelectedTime("");
    setName("");
    setSurname("");
    setPhone("");
    setPassword("");
    setShowConfirmation(false);
  };

  const selBg = "hsl(0 0% 90%)";
  const selColor = "hsl(230 20% 7%)";
  const selShadow = "0 4px 16px hsl(0 0% 100% / 0.12)";

  return (
    <div className="min-h-screen" style={{ background: "hsl(230 20% 5%)", color: "hsl(0 0% 93%)", fontFamily: "'Montserrat', sans-serif" }}>

      {/* Hero Section */}
      <section className="relative h-screen overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={heroIndex}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImages[heroIndex]})` }}
          />
        </AnimatePresence>
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, hsl(230 20% 5% / 0.3) 0%, hsl(230 20% 5% / 0.7) 60%, hsl(230 20% 5%) 100%)" }} />

        <div className="relative z-10 h-full flex flex-col justify-end pb-16 px-6 max-w-4xl mx-auto">
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-px" style={{ background: "hsl(0 0% 100% / 0.4)" }} />
              <span className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "hsl(0 0% 100% / 0.6)" }}>Barbearia</span>
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-[0.95] tracking-tight mb-4">
              Vila<br />Nova
            </h1>
            <p className="text-base sm:text-lg max-w-md mb-8" style={{ color: "hsl(0 0% 100% / 0.6)" }}>
              A 1ª Barbearia por Assinatura de Colatina. Tradição, estilo e conforto em cada detalhe.
            </p>
            <a href="#servicos"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-bold transition-all hover:translate-y-[-2px]"
              style={{ background: selBg, color: selColor, boxShadow: selShadow }}>
              Agendar Agora <ChevronRight className="w-4 h-4" />
            </a>
          </motion.div>

          {/* Hero dots */}
          <div className="flex gap-2 mt-8">
            {heroImages.map((_, i) => (
              <button key={i} onClick={() => setHeroIndex(i)}
                className="w-2 h-2 rounded-full transition-all"
                style={{ background: i === heroIndex ? "hsl(0 0% 90%)" : "hsl(0 0% 100% / 0.2)", width: i === heroIndex ? 24 : 8 }} />
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-px" style={{ background: "hsl(0 0% 100% / 0.15)" }} />
              <span className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "hsl(0 0% 100% / 0.4)" }}>Sobre nós</span>
            </div>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-extrabold mb-6 leading-tight">Tradição que<br />inspira estilo</h2>
                <p className="text-sm leading-relaxed mb-6" style={{ color: "hsl(0 0% 100% / 0.5)" }}>
                  Buscando sempre atualizações e melhorias para o conforto do cliente. Na Vila Nova, cada corte é uma experiência única, com profissionais qualificados e ambiente acolhedor.
                </p>
                <div className="flex gap-8">
                  {[
                    { number: "5+", label: "Anos" },
                    { number: "3K+", label: "Clientes" },
                    { number: "5⭐", label: "Avaliação" },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <span className="text-2xl font-extrabold">{stat.number}</span>
                      <p className="text-xs mt-1" style={{ color: "hsl(0 0% 100% / 0.4)" }}>{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                <img src={heroImages[1]} alt="Vila Nova" className="w-full h-80 object-cover" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicos" className="py-20 px-6" style={{ background: "hsl(230 18% 6%)" }}>
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-px" style={{ background: "hsl(0 0% 100% / 0.15)" }} />
              <span className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "hsl(0 0% 100% / 0.4)" }}>Nossos serviços</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-12">Escolha seu serviço</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {services.map((service, i) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group rounded-2xl overflow-hidden transition-all hover:translate-y-[-3px] cursor-pointer"
                style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}
                onClick={() => { setSelectedService(service); setCurrentStep(0); }}
              >
                <div className="p-5 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(0 0% 100% / 0.05)" }}>
                    <Scissors className="w-6 h-6" style={{ color: "hsl(0 0% 70%)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground text-sm">{service.title}</h3>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "hsl(0 0% 100% / 0.4)" }}>{service.subtitle || service.duration}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-extrabold">R$ {service.price}</span>
                    <p className="text-[10px] mt-0.5 flex items-center gap-1 justify-end" style={{ color: "hsl(0 0% 100% / 0.35)" }}>
                      <Clock className="w-3 h-3" /> {service.duration}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-px" style={{ background: "hsl(0 0% 100% / 0.15)" }} />
              <span className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "hsl(0 0% 100% / 0.4)" }}>Galeria</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-12">Nosso trabalho</h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {galleryImages.map((img, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative rounded-2xl overflow-hidden cursor-pointer group aspect-square"
                style={{ border: "1px solid hsl(0 0% 100% / 0.06)" }}
                onClick={() => setLightboxIndex(i)}
              >
                <img src={img} alt={`Galeria ${i + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                  <Star className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact / Footer */}
      <footer className="py-16 px-6" style={{ background: "hsl(230 18% 4%)", borderTop: "1px solid hsl(0 0% 100% / 0.04)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8 mb-12">
            <div>
              <h3 className="font-bold text-lg mb-4">Vila Nova</h3>
              <p className="text-xs leading-relaxed" style={{ color: "hsl(0 0% 100% / 0.4)" }}>
                A 1ª Barbearia por Assinatura de Colatina. Tradição e estilo.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Contato</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs" style={{ color: "hsl(0 0% 100% / 0.5)" }}>
                  <MapPin className="w-3.5 h-3.5" /> Colatina, ES
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: "hsl(0 0% 100% / 0.5)" }}>
                  <Phone className="w-3.5 h-3.5" /> (27) 99999-9999
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: "hsl(0 0% 100% / 0.5)" }}>
                  <Instagram className="w-3.5 h-3.5" /> @barbeariavilanova
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Horários</h4>
              <div className="space-y-2 text-xs" style={{ color: "hsl(0 0% 100% / 0.5)" }}>
                <p>Seg - Sex: 09:00 - 19:00</p>
                <p>Sáb: 09:00 - 17:00</p>
                <p>Dom: Fechado</p>
              </div>
            </div>
          </div>
          <div className="pt-8 text-center text-xs" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.04)", color: "hsl(0 0% 100% / 0.25)" }}>
            © {new Date().getFullYear()} Barbearia Vila Nova. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "hsl(0 0% 0% / 0.9)", backdropFilter: "blur(20px)" }}
            onClick={() => setLightboxIndex(null)}
          >
            <button className="absolute top-6 right-6 p-2 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.1)" }} onClick={() => setLightboxIndex(null)}>
              <X className="w-5 h-5" />
            </button>
            <img src={galleryImages[lightboxIndex]} alt="" className="max-w-full max-h-[85vh] rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking Modal */}
      <AnimatePresence>
        {selectedService && !showConfirmation && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
            style={{ background: 'hsl(230 20% 5% / 0.9)', backdropFilter: 'blur(12px)' }}>
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto scrollbar-hide rounded-t-2xl sm:rounded-2xl"
              style={{ background: "hsl(0 0% 100% / 0.05)", backdropFilter: "blur(28px)", border: "1px solid hsl(0 0% 100% / 0.08)", boxShadow: "0 8px 32px hsl(0 0% 0% / 0.3)" }}>

              {/* Header */}
              <div className="flex items-center justify-between p-5 sticky top-0 z-10" style={{ borderBottom: '1px solid hsl(0 0% 100% / 0.06)', background: 'hsl(0 0% 100% / 0.03)', backdropFilter: 'blur(28px)' }}>
                <h2 className="text-xl font-bold">Agendamento</h2>
                <button onClick={closeBooking} className="p-2 rounded-xl" style={{ background: 'hsl(0 0% 100% / 0.05)' }}>
                  <X className="w-5 h-5" style={{ color: "hsl(0 0% 60%)" }} />
                </button>
              </div>

              {/* Steps */}
              <div className="px-5 pt-4 pb-2">
                <div className="flex items-center justify-between">
                  {steps.map((step, i) => (
                    <div key={step} className="flex items-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all"
                        style={i < currentStep ? { background: 'hsl(0 0% 90% / 0.15)', color: 'hsl(0 0% 80%)' } : i === currentStep ? { background: selBg, color: selColor } : { background: 'hsl(0 0% 100% / 0.05)', color: 'hsl(0 0% 40%)' }}>
                        {i < currentStep ? <Check className="w-4 h-4" /> : i + 1}
                      </div>
                      {i < steps.length - 1 && <div className="hidden sm:block w-8 h-px mx-1" style={{ background: i < currentStep ? 'hsl(0 0% 100% / 0.15)' : 'hsl(0 0% 100% / 0.06)' }} />}
                    </div>
                  ))}
                </div>
                <p className="text-sm mt-3 font-medium" style={{ color: "hsl(0 0% 60%)" }}>{steps[currentStep]}</p>
              </div>

              {/* Content */}
              <div className="p-5 min-h-[280px]">
                {currentStep === 0 && (
                  <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "hsl(0 0% 100% / 0.05)" }}>
                      <Scissors className="w-6 h-6" style={{ color: "hsl(0 0% 70%)" }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold">{selectedService.title}</h3>
                      <p className="text-xs mt-0.5" style={{ color: "hsl(0 0% 100% / 0.4)" }}>{selectedService.subtitle || selectedService.duration}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="font-bold text-lg">R$ {selectedService.price}</span>
                        <span className="text-xs flex items-center gap-1" style={{ color: "hsl(0 0% 100% / 0.4)" }}><Clock className="w-3 h-3" /> {selectedService.duration}</span>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="space-y-3">
                    {barbers.map((b) => (
                      <button key={b.id} onClick={() => setSelectedBarber(b)}
                        className="w-full rounded-xl p-4 text-left transition-all"
                        style={{ background: selectedBarber?.id === b.id ? "hsl(0 0% 100% / 0.08)" : "hsl(0 0% 100% / 0.03)", border: `1px solid ${selectedBarber?.id === b.id ? "hsl(0 0% 100% / 0.15)" : "hsl(0 0% 100% / 0.06)"}` }}>
                        <div className="flex items-center gap-3">
                          {b.avatar_url ? (
                            <img src={b.avatar_url} alt={b.name} className="w-11 h-11 rounded-xl object-cover" />
                          ) : (
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm"
                              style={{ background: selectedBarber?.id === b.id ? selBg : "hsl(0 0% 100% / 0.05)", color: selectedBarber?.id === b.id ? selColor : "hsl(0 0% 50%)" }}>
                              {b.name.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold">{b.name}</h4>
                            <p className="text-xs" style={{ color: "hsl(0 0% 100% / 0.4)" }}>{b.specialty || "Barbeiro"}</p>
                          </div>
                          {selectedBarber?.id === b.id && <Check className="w-5 h-5" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-5">
                    <div>
                      <label className="text-sm font-semibold flex items-center gap-2 mb-3"><Calendar className="w-4 h-4" style={{ color: "hsl(0 0% 60%)" }} /> Data</label>
                      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                        {dates.map((d) => (
                          <button key={d.value} onClick={() => { setSelectedDate(d.value); setSelectedTime(""); }}
                            className="shrink-0 w-16 py-3 rounded-xl text-center transition-all"
                            style={{ background: selectedDate === d.value ? selBg : "hsl(0 0% 100% / 0.04)", border: `1px solid ${selectedDate === d.value ? "transparent" : "hsl(0 0% 100% / 0.06)"}`, color: selectedDate === d.value ? selColor : "hsl(0 0% 55%)" }}>
                            <span className="block text-[10px] uppercase font-medium opacity-70">{d.weekday}</span>
                            <span className="block text-sm font-bold mt-0.5">{d.day}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold flex items-center gap-2 mb-3"><Clock className="w-4 h-4" style={{ color: "hsl(0 0% 60%)" }} /> Horário</label>
                      {loadingTimes ? (
                        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "hsl(0 0% 50%)" }} /></div>
                      ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-40 overflow-y-auto scrollbar-hide">
                          {availableTimes.map((t) => {
                            const isBooked = bookedTimes.includes(t);
                            return (
                              <button key={t} onClick={() => !isBooked && setSelectedTime(t)} disabled={isBooked}
                                className="py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                style={{ background: selectedTime === t ? selBg : isBooked ? "hsl(0 60% 50% / 0.08)" : "hsl(0 0% 100% / 0.04)", border: `1px solid ${selectedTime === t ? "transparent" : "hsl(0 0% 100% / 0.06)"}`, color: selectedTime === t ? selColor : isBooked ? "hsl(0 60% 55%)" : "hsl(0 0% 55%)" }}>
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

                {currentStep === 3 && (
                  <div className="space-y-4">
                    {[
                      { label: "Nome", icon: <User className="w-4 h-4" />, type: "text", value: name, set: setName, placeholder: "Seu nome" },
                      { label: "Sobrenome", icon: <User className="w-4 h-4" />, type: "text", value: surname, set: setSurname, placeholder: "Seu sobrenome" },
                      { label: "WhatsApp", icon: <Send className="w-4 h-4" />, type: "tel", value: phone, set: setPhone, placeholder: "(27) 99999-9999" },
                      { label: "Senha", icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, type: "password", value: password, set: setPassword, placeholder: "Crie uma senha" },
                    ].map((field) => (
                      <div key={field.label}>
                        <label className="text-sm font-semibold flex items-center gap-2 mb-2" style={{ color: "hsl(0 0% 80%)" }}>
                          <span style={{ color: "hsl(0 0% 55%)" }}>{field.icon}</span> {field.label}
                        </label>
                        <input type={field.type} value={field.value} onChange={(e) => field.set(e.target.value)} placeholder={field.placeholder}
                          className="w-full rounded-xl px-4 py-3 transition-all outline-none"
                          style={{ background: "hsl(0 0% 100% / 0.04)", border: "1px solid hsl(0 0% 100% / 0.08)", color: "hsl(0 0% 93%)" }} />
                      </div>
                    ))}
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold mb-4">Resumo do Agendamento</h3>
                    {[
                      { label: "Serviço", value: selectedService.title },
                      { label: "Barbeiro", value: selectedBarber?.name || "" },
                      { label: "Data", value: selectedDate ? new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR") : "" },
                      { label: "Horário", value: selectedTime },
                      { label: "Nome", value: `${name} ${surname}` },
                      { label: "WhatsApp", value: phone },
                      { label: "Valor", value: `R$ ${selectedService.price}` },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between py-2.5" style={{ borderBottom: "1px solid hsl(0 0% 100% / 0.04)" }}>
                        <span className="text-sm" style={{ color: "hsl(0 0% 55%)" }}>{item.label}</span>
                        <span className="text-sm font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-5 flex items-center justify-between" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.06)" }}>
                <button onClick={currentStep === 0 ? closeBooking : () => setCurrentStep(currentStep - 1)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{ background: "hsl(0 0% 100% / 0.05)", border: "1px solid hsl(0 0% 100% / 0.08)", color: "hsl(0 0% 65%)" }}>
                  <ArrowLeft className="w-4 h-4" /> {currentStep === 0 ? "Cancelar" : "Voltar"}
                </button>
                {currentStep < steps.length - 1 ? (
                  <button onClick={() => canProceed() && setCurrentStep(currentStep + 1)} disabled={!canProceed()}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-35"
                    style={{ background: selBg, color: selColor }}>
                    Próximo <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={handleConfirm} disabled={submitting}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                    style={{ background: selBg, color: selColor, boxShadow: selShadow }}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {submitting ? "Confirmando..." : "Confirmar"}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'hsl(230 20% 5% / 0.9)', backdropFilter: 'blur(12px)' }}>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }}
              className="w-full max-w-sm p-6 text-center space-y-5 rounded-2xl"
              style={{ background: "hsl(0 0% 100% / 0.05)", backdropFilter: "blur(28px)", border: "1px solid hsl(0 0% 100% / 0.08)" }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
                style={{ background: "hsl(140 60% 45% / 0.12)", border: "2px solid hsl(140 60% 45% / 0.3)" }}>
                <CheckCircle className="w-10 h-10" style={{ color: "hsl(140 60% 50%)" }} />
              </motion.div>
              <div>
                <h3 className="text-xl font-bold">Agendamento Confirmado!</h3>
                <p className="text-sm mt-2" style={{ color: "hsl(0 0% 60%)" }}>Confira no seu WhatsApp os detalhes.</p>
              </div>
              <motion.button onClick={closeBooking}
                className="w-full py-3 rounded-xl font-bold text-sm"
                style={{ background: selBg, color: selColor }}
                whileTap={{ scale: 0.98 }}>
                Entendido ✨
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VilaNova;
