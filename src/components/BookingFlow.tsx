import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Calendar, User, Clock, Send, X } from "lucide-react";
import type { Service, Barber } from "@/data/services";
import { barbers, availableTimes } from "@/data/services";

interface BookingFlowProps {
  service: Service;
  onClose: () => void;
}

const steps = ["Serviço", "Barbeiro", "Data & Hora", "Seus Dados", "Confirmar"];

const BookingFlow = ({ service, onClose }: BookingFlowProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const canProceed = () => {
    switch (currentStep) {
      case 0: return true;
      case 1: return !!selectedBarber;
      case 2: return !!selectedDate && !!selectedTime;
      case 3: return !!name && !!phone;
      default: return true;
    }
  };

  const next = () => {
    if (canProceed() && currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
  };

  const back = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const generateDates = () => {
    const dates: { label: string; value: string; weekday: string; day: string }[] = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (d.getDay() !== 0) {
        dates.push({
          label: d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }),
          value: d.toISOString().split("T")[0],
          weekday: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
          day: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        });
      }
    }
    return dates;
  };

  const sendWhatsApp = () => {
    const dateFormatted = selectedDate
      ? new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR")
      : "";
    const msg = `Olá! Gostaria de confirmar meu agendamento:%0A%0A📋 *Serviço:* ${service.title}%0A💈 *Barbeiro:* ${selectedBarber?.name}%0A📅 *Data:* ${dateFormatted}%0A🕐 *Horário:* ${selectedTime}%0A👤 *Nome:* ${name}%0A📱 *Telefone:* ${phone}%0A💰 *Valor:* R$ ${service.price}`;
    window.open(`https://wa.me/5511999999999?text=${msg}`, "_blank");
  };

  const dates = generateDates();

  const slideVariants = {
    enter: { x: 40, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -40, opacity: 0 },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-card-strong w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-xl font-bold text-foreground">Agendamento</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
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
                {i < steps.length - 1 && (
                  <div className={`hidden sm:block w-8 h-px mx-1 ${i < currentStep ? "bg-primary/50" : "bg-white/10"}`} />
                )}
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
                <div className="space-y-3">
                  <div className="glass-card p-4 border-primary/20 flex items-center gap-4 overflow-hidden">
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                      <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground">{service.title}</h3>
                      <p className="text-sm text-muted-foreground">{service.subtitle}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="gold-text font-bold text-lg">R$ {service.price}</span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" /> {service.duration}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-3">
                  {barbers.map((barber) => (
                    <button
                      key={barber.id}
                      onClick={() => setSelectedBarber(barber)}
                      className={`w-full glass-card p-4 text-left transition-all ${selectedBarber?.id === barber.id ? "border-primary/30 bg-primary/5" : "hover:bg-white/5"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm ${selectedBarber?.id === barber.id ? "gold-gradient text-primary-foreground" : "bg-white/5 text-muted-foreground"}`}>
                          {barber.avatar}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{barber.name}</h4>
                          <p className="text-sm text-muted-foreground">{barber.specialty}</p>
                        </div>
                        {selectedBarber?.id === barber.id && <Check className="w-5 h-5 text-primary" />}
                      </div>
                    </button>
                  ))}
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
                        <button
                          key={d.value}
                          onClick={() => setSelectedDate(d.value)}
                          className={`shrink-0 w-16 py-3 rounded-xl text-center transition-all ${
                            selectedDate === d.value
                              ? "gold-gradient text-primary-foreground shadow-lg shadow-primary/20"
                              : "bg-white/5 text-muted-foreground hover:bg-white/10 border border-white/5"
                          }`}
                        >
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
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-40 overflow-y-auto scrollbar-hide">
                      {availableTimes.map((t) => (
                        <button
                          key={t}
                          onClick={() => setSelectedTime(t)}
                          className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                            selectedTime === t
                              ? "gold-gradient text-primary-foreground shadow-lg shadow-primary/20"
                              : "bg-white/5 text-muted-foreground hover:bg-white/10 border border-white/5"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-primary" /> Seu nome
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Digite seu nome"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                      <Send className="w-4 h-4 text-primary" /> WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-3">
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
                    <div key={item.label} className="flex justify-between py-2.5 border-b border-white/5">
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
        <div className="p-5 border-t border-white/5 flex items-center justify-between">
          <button
            onClick={currentStep === 0 ? onClose : back}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {currentStep === 0 ? "Cancelar" : "Voltar"}
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={next}
              disabled={!canProceed()}
              className="btn-primary flex items-center gap-2"
            >
              Próximo <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={sendWhatsApp}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-whatsapp hover:bg-whatsapp/90 text-whatsapp-foreground text-sm font-semibold transition-all shadow-lg shadow-whatsapp/20"
            >
              <Send className="w-4 h-4" /> Enviar via WhatsApp
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BookingFlow;
