import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Calendar, Check, ChevronRight, Clock, Search, Star, User2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useThemeColors } from "@/hooks/useThemeColors";
import {
  MOCK_CATEGORIES,
  MOCK_BARBERS,
  MOCK_TIMES,
  type MockService,
  type MockBarber,
} from "@/data/agendaDiretoMock";

type Step = "list" | "barber" | "datetime" | "info" | "confirm" | "done";

const AgendaDireto = () => {
  const t = useThemeColors();
  const navigate = useNavigate();
  const [activeCat, setActiveCat] = useState(MOCK_CATEGORIES[0].id);
  const [search, setSearch] = useState("");
  const [step, setStep] = useState<Step>("list");

  const [service, setService] = useState<MockService | null>(null);
  const [barber, setBarber] = useState<MockBarber | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const filteredServices = useMemo(() => {
    const cat = MOCK_CATEGORIES.find((c) => c.id === activeCat);
    if (!cat) return [];
    if (!search.trim()) return cat.services;
    const q = search.toLowerCase();
    return cat.services.filter(
      (s) => s.title.toLowerCase().includes(q) || s.subtitle.toLowerCase().includes(q)
    );
  }, [activeCat, search]);

  const dates = useMemo(() => {
    const out: { iso: string; day: string; weekday: string; month: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      out.push({
        iso: d.toISOString().slice(0, 10),
        day: String(d.getDate()).padStart(2, "0"),
        weekday: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
        month: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      });
    }
    return out;
  }, []);

  const reset = () => {
    setStep("list");
    setService(null);
    setBarber(null);
    setDate("");
    setTime("");
    setName("");
    setPhone("");
  };

  const goNext = () => {
    if (step === "barber" && !barber) return toast.error("Selecione um profissional");
    if (step === "datetime" && (!date || !time)) return toast.error("Escolha data e horário");
    if (step === "info" && (!name.trim() || phone.replace(/\D/g, "").length < 10))
      return toast.error("Preencha nome e telefone válido");

    const order: Step[] = ["list", "barber", "datetime", "info", "confirm", "done"];
    setStep(order[order.indexOf(step) + 1]);
  };

  const goBack = () => {
    const order: Step[] = ["list", "barber", "datetime", "info", "confirm", "done"];
    const i = order.indexOf(step);
    if (i <= 0) {
      navigate(-1);
      return;
    }
    setStep(order[i - 1]);
  };

  const confirmBooking = () => {
    toast.success("Agendamento simulado com sucesso! (preview)");
    setStep("done");
  };

  const stepTitles: Record<Step, string> = {
    list: "Escolha um serviço",
    barber: "Escolha um profissional",
    datetime: "Data e horário",
    info: "Seus dados",
    confirm: "Revisão",
    done: "Pronto!",
  };

  const progress = ["list", "barber", "datetime", "info", "confirm"].indexOf(step) + 1;

  return (
    <div className="min-h-screen w-full" style={{ background: t.bg, color: t.textPrimary }}>
      {/* Topbar */}
      <header
        className="sticky top-0 z-40 backdrop-blur-xl border-b"
        style={{ background: `${t.bg}cc`, borderColor: t.borderSubtle }}
      >
        <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={goBack}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-white/5"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.25em] opacity-60">Agenda Direto</p>
            <h1 className="text-base font-bold truncate">{stepTitles[step]}</h1>
          </div>
          {step !== "done" && (
            <span className="text-xs opacity-70 tabular-nums">{progress}/5</span>
          )}
        </div>
        {/* progress bar */}
        {step !== "done" && (
          <div className="h-[2px] w-full" style={{ background: t.borderSubtle }}>
            <motion.div
              className="h-full"
              style={{ background: t.textPrimary }}
              initial={{ width: 0 }}
              animate={{ width: `${(progress / 5) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        )}
      </header>

      <main className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 py-6 pb-32">
        <AnimatePresence mode="wait">
          {/* STEP 1 — LIST BY CATEGORY */}
          {step === "list" && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              {/* Search */}
              <div
                className="flex items-center gap-3 px-4 h-12 rounded-2xl mb-5"
                style={{ background: t.cardBgSubtle, border: `1px solid ${t.borderSubtle}` }}
              >
                <Search className="w-4 h-4 opacity-60" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar serviço…"
                  className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-50"
                />
              </div>

              {/* Categories chips */}
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
                {MOCK_CATEGORIES.map((cat) => {
                  const active = cat.id === activeCat;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCat(cat.id)}
                      className="flex items-center gap-2 px-4 h-10 rounded-full text-sm whitespace-nowrap transition-all"
                      style={{
                        background: active ? t.textPrimary : t.cardBgSubtle,
                        color: active ? t.bg : t.textPrimary,
                        border: `1px solid ${active ? t.textPrimary : t.borderSubtle}`,
                        fontWeight: active ? 600 : 500,
                      }}
                    >
                      <span>{cat.icon}</span>
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Services list */}
              <div className="mt-5 space-y-3">
                {filteredServices.length === 0 && (
                  <p className="text-sm opacity-60 text-center py-8">Nenhum serviço encontrado.</p>
                )}
                {filteredServices.map((s, i) => (
                  <motion.button
                    key={s.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => {
                      setService(s);
                      setStep("barber");
                    }}
                    className="w-full flex items-center gap-4 p-3 rounded-2xl text-left transition-all hover:translate-x-1"
                    style={{ background: t.cardBg, border: `1px solid ${t.borderSubtle}` }}
                  >
                    <img
                      src={s.image}
                      alt={s.title}
                      loading="lazy"
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base leading-tight truncate">{s.title}</h3>
                      <p className="text-xs opacity-70 mt-0.5 line-clamp-2">{s.subtitle}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="inline-flex items-center gap-1 opacity-70">
                          <Clock className="w-3 h-3" />
                          {s.duration}
                        </span>
                        <span className="font-bold text-sm">R$ {s.price}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 opacity-50 flex-shrink-0" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 2 — BARBER */}
          {step === "barber" && (
            <motion.div
              key="barber"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-3"
            >
              <SelectedServiceCard service={service!} t={t} />
              <h2 className="text-xs uppercase tracking-[0.2em] opacity-60 mt-6 mb-2">Profissionais</h2>
              {MOCK_BARBERS.map((b, i) => {
                const active = barber?.id === b.id;
                return (
                  <motion.button
                    key={b.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setBarber(b)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all"
                    style={{
                      background: t.cardBg,
                      border: `1px solid ${active ? t.textPrimary : t.borderSubtle}`,
                      transform: active ? "scale(1.01)" : "scale(1)",
                    }}
                  >
                    <img src={b.avatar} alt={b.name} className="w-12 h-12 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{b.name}</p>
                      <p className="text-xs opacity-70 truncate">{b.specialty}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold">
                      <Star className="w-3 h-3 fill-current" /> {b.rating.toFixed(1)}
                    </span>
                    {active && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: t.textPrimary }}
                      >
                        <Check className="w-3.5 h-3.5" style={{ color: t.bg }} />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          )}

          {/* STEP 3 — DATE & TIME */}
          {step === "datetime" && (
            <motion.div
              key="datetime"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <SelectedServiceCard service={service!} t={t} />

              <h2 className="text-xs uppercase tracking-[0.2em] opacity-60 mt-6 mb-3">Selecione a data</h2>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
                {dates.map((d) => {
                  const active = d.iso === date;
                  return (
                    <button
                      key={d.iso}
                      onClick={() => setDate(d.iso)}
                      className="flex flex-col items-center justify-center min-w-[64px] h-20 rounded-2xl transition-all"
                      style={{
                        background: active ? t.textPrimary : t.cardBg,
                        color: active ? t.bg : t.textPrimary,
                        border: `1px solid ${active ? t.textPrimary : t.borderSubtle}`,
                      }}
                    >
                      <span className="text-[10px] uppercase opacity-70">{d.weekday}</span>
                      <span className="text-2xl font-black leading-none my-0.5">{d.day}</span>
                      <span className="text-[10px] uppercase opacity-70">{d.month}</span>
                    </button>
                  );
                })}
              </div>

              <h2 className="text-xs uppercase tracking-[0.2em] opacity-60 mt-6 mb-3">Horários disponíveis</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {MOCK_TIMES.map((tm) => {
                  const active = tm === time;
                  return (
                    <button
                      key={tm}
                      onClick={() => setTime(tm)}
                      className="h-11 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: active ? t.textPrimary : t.cardBg,
                        color: active ? t.bg : t.textPrimary,
                        border: `1px solid ${active ? t.textPrimary : t.borderSubtle}`,
                      }}
                    >
                      {tm}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 4 — INFO */}
          {step === "info" && (
            <motion.div
              key="info"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-4"
            >
              <SelectedServiceCard service={service!} t={t} />
              <div className="space-y-3 mt-6">
                <Field label="Nome completo" t={t}>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full bg-transparent outline-none text-base"
                  />
                </Field>
                <Field label="WhatsApp" t={t}>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    inputMode="tel"
                    className="w-full bg-transparent outline-none text-base"
                  />
                </Field>
              </div>
            </motion.div>
          )}

          {/* STEP 5 — CONFIRM */}
          {step === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <h2 className="text-xs uppercase tracking-[0.2em] opacity-60 mb-3">Revise seu agendamento</h2>
              <div
                className="rounded-2xl p-5 space-y-4"
                style={{ background: t.cardBg, border: `1px solid ${t.borderSubtle}` }}
              >
                <Row label="Serviço" value={service?.title || "—"} sub={`R$ ${service?.price} · ${service?.duration}`} />
                <Divider t={t} />
                <Row label="Profissional" value={barber?.name || "—"} sub={barber?.specialty} icon={<User2 className="w-4 h-4" />} />
                <Divider t={t} />
                <Row
                  label="Data & horário"
                  value={
                    date
                      ? new Date(date + "T00:00").toLocaleDateString("pt-BR", {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                        })
                      : "—"
                  }
                  sub={time}
                  icon={<Calendar className="w-4 h-4" />}
                />
                <Divider t={t} />
                <Row label="Cliente" value={name} sub={phone} />
              </div>
              <p className="text-[11px] opacity-60 mt-4 text-center">
                ⚡ Esta tela é apenas um preview — o agendamento não será salvo no painel.
              </p>
            </motion.div>
          )}

          {/* STEP 6 — DONE */}
          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center text-center py-20"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                style={{ background: t.textPrimary }}
              >
                <Check className="w-10 h-10" style={{ color: t.bg }} />
              </motion.div>
              <h2 className="text-2xl font-black mb-2">Tudo certo!</h2>
              <p className="text-sm opacity-70 max-w-xs">
                Agendamento simulado. Em produção, o cliente receberia confirmação por WhatsApp.
              </p>
              <button
                onClick={reset}
                className="mt-8 px-6 h-11 rounded-full font-semibold text-sm"
                style={{ background: t.textPrimary, color: t.bg }}
              >
                Novo agendamento
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Sticky CTA */}
      {step !== "list" && step !== "done" && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 px-4 py-4 backdrop-blur-xl border-t"
          style={{ background: `${t.bg}e6`, borderColor: t.borderSubtle }}
        >
          <div className="max-w-[1100px] mx-auto flex items-center gap-3">
            <button
              onClick={goBack}
              className="h-12 px-5 rounded-full font-semibold text-sm"
              style={{ background: t.cardBg, color: t.textPrimary, border: `1px solid ${t.borderSubtle}` }}
            >
              Voltar
            </button>
            <button
              onClick={step === "confirm" ? confirmBooking : goNext}
              className="flex-1 h-12 rounded-full font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: t.textPrimary, color: t.bg }}
            >
              {step === "confirm" ? "Confirmar agendamento" : "Continuar"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const SelectedServiceCard = ({ service, t }: { service: MockService; t: ReturnType<typeof useThemeColors> }) => (
  <div
    className="flex items-center gap-3 p-3 rounded-2xl"
    style={{ background: t.cardBgSubtle, border: `1px solid ${t.borderSubtle}` }}
  >
    <img src={service.image} alt={service.title} className="w-14 h-14 rounded-xl object-cover" />
    <div className="flex-1 min-w-0">
      <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">Serviço selecionado</p>
      <p className="font-bold text-sm truncate">{service.title}</p>
      <p className="text-xs opacity-70">
        R$ {service.price} · {service.duration}
      </p>
    </div>
  </div>
);

const Field = ({
  label,
  children,
  t,
}: {
  label: string;
  children: React.ReactNode;
  t: ReturnType<typeof useThemeColors>;
}) => (
  <label className="block">
    <span className="text-[11px] uppercase tracking-[0.2em] opacity-60">{label}</span>
    <div
      className="mt-1.5 px-4 h-12 rounded-2xl flex items-center"
      style={{ background: t.cardBg, border: `1px solid ${t.borderSubtle}` }}
    >
      {children}
    </div>
  </label>
);

const Row = ({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
}) => (
  <div className="flex items-start gap-3">
    {icon && <div className="mt-1 opacity-60">{icon}</div>}
    <div className="flex-1 min-w-0">
      <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">{label}</p>
      <p className="font-semibold text-sm">{value}</p>
      {sub && <p className="text-xs opacity-70">{sub}</p>}
    </div>
  </div>
);

const Divider = ({ t }: { t: ReturnType<typeof useThemeColors> }) => (
  <div className="h-px w-full" style={{ background: t.borderSubtle }} />
);

export default AgendaDireto;
