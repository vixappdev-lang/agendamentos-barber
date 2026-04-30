import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Calendar, Check, ChevronRight, Clock, Loader2,
  Lock, Mail, Phone, Search, Sparkles, Star, User2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { useThemeColors } from "@/hooks/useThemeColors";
import { supabase } from "@/integrations/supabase/client";
import {
  MOCK_CATEGORIES, MOCK_BARBERS, MOCK_TIMES,
  type MockService, type MockBarber,
} from "@/data/agendaDiretoMock";

type Step = "list" | "barber" | "datetime" | "auth" | "confirm" | "done";

const onlyDigits = (v: string) => v.replace(/\D/g, "");
const phoneToEmail = (raw: string) => `${onlyDigits(raw)}@styllus.barber`;
const formatPhone = (raw: string) => {
  const d = onlyDigits(raw).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const phoneSchema = z.string().refine((v) => onlyDigits(v).length >= 10, "Telefone inválido");
const nameSchema = z.string().trim().min(2, "Nome muito curto").max(80);
const passwordSchema = z.string().min(6, "Mínimo 6 caracteres").max(72);

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

  // Auth state
  const [authMode, setAuthMode] = useState<"new" | "existing">("new");
  const [existingChecked, setExistingChecked] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [signedUserId, setSignedUserId] = useState<string | null>(null);

  // Already-logged user shortcut
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSignedUserId(session.user.id);
        const meta = session.user.user_metadata as { full_name?: string; phone?: string };
        if (meta?.full_name) setName(meta.full_name);
        if (meta?.phone) setPhone(formatPhone(meta.phone));
      }
    });
  }, []);

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
    setService(null); setBarber(null);
    setDate(""); setTime("");
    if (!signedUserId) { setPhone(""); setName(""); }
    setPassword(""); setExistingChecked(false); setAuthMode("new");
  };

  const stepOrder: Step[] = signedUserId
    ? ["list", "barber", "datetime", "confirm", "done"]
    : ["list", "barber", "datetime", "auth", "confirm", "done"];

  const goNext = () => {
    if (step === "barber" && !barber) return toast.error("Selecione um profissional");
    if (step === "datetime" && (!date || !time)) return toast.error("Escolha data e horário");
    const i = stepOrder.indexOf(step);
    setStep(stepOrder[i + 1]);
  };

  const goBack = () => {
    const i = stepOrder.indexOf(step);
    if (i <= 0) { navigate(-1); return; }
    setStep(stepOrder[i - 1]);
  };

  // Detect if phone already has account → toggles to login mode
  const checkPhone = async (raw: string) => {
    setPhone(formatPhone(raw));
    setExistingChecked(false);
    if (onlyDigits(raw).length < 10) return;
    // Probe by attempting an OTP-less signin with dummy password to detect account existence is unreliable.
    // Better UX: just keep both modes available via tabs, and let signIn fail gracefully.
    setExistingChecked(true);
  };

  const submitAuth = async () => {
    const p = phoneSchema.safeParse(phone);
    if (!p.success) return toast.error(p.error.errors[0].message);
    const pw = passwordSchema.safeParse(password);
    if (!pw.success) return toast.error(pw.error.errors[0].message);

    const email = phoneToEmail(phone);
    setAuthLoading(true);

    try {
      if (authMode === "existing") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error("Telefone ou senha incorretos");
          return;
        }
        setSignedUserId(data.user?.id || null);
        if (data.user?.user_metadata?.full_name) setName(data.user.user_metadata.full_name);
        toast.success("Bem-vindo de volta!");
        setStep("confirm");
      } else {
        const n = nameSchema.safeParse(name);
        if (!n.success) return toast.error(n.error.errors[0].message);

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name.trim(), phone: onlyDigits(phone) },
          },
        });
        if (error) {
          // If already registered, switch to login mode
          if (error.message.toLowerCase().includes("registered") || error.message.toLowerCase().includes("already")) {
            setAuthMode("existing");
            toast.info("Você já tem conta. Digite sua senha para entrar.");
            return;
          }
          toast.error(error.message);
          return;
        }
        setSignedUserId(data.user?.id || null);
        toast.success("Conta criada!");
        setStep("confirm");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const confirmBooking = () => {
    toast.success("Agendamento confirmado!", {
      description: "Em produção, você receberia confirmação por WhatsApp.",
    });
    setStep("done");
  };

  const stepTitles: Record<Step, string> = {
    list: "Escolha o serviço",
    barber: "Escolha o profissional",
    datetime: "Data e horário",
    auth: signedUserId ? "Seus dados" : authMode === "existing" ? "Entrar na conta" : "Criar conta",
    confirm: "Revisar e confirmar",
    done: "Tudo certo",
  };

  const totalSteps = stepOrder.length - 1; // exclude "done"
  const progress = stepOrder.indexOf(step) + 1;
  const isLight = t.isLight;
  const glassCard: React.CSSProperties = {
    background: isLight ? "hsl(0 0% 100% / 0.7)" : "hsl(0 0% 100% / 0.03)",
    backdropFilter: "blur(20px) saturate(140%)",
    WebkitBackdropFilter: "blur(20px) saturate(140%)",
    border: `1px solid ${isLight ? "hsl(220 12% 88%)" : "hsl(0 0% 100% / 0.06)"}`,
  };
  const subtleBorder = isLight ? "hsl(220 12% 88%)" : "hsl(0 0% 100% / 0.06)";

  return (
    <div className="min-h-screen w-full" style={{ background: t.pageBg, color: t.textPrimary }}>
      {/* Subtle glow background */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none -z-0"
        style={{
          background: isLight
            ? "radial-gradient(1000px 500px at 50% -10%, hsl(220 30% 95%) 0%, transparent 60%)"
            : "radial-gradient(1000px 500px at 50% -10%, hsl(220 30% 12% / 0.6) 0%, transparent 60%)",
        }}
      />

      {/* Topbar */}
      <header
        className="sticky top-0 z-40 backdrop-blur-2xl"
        style={{
          background: isLight ? "hsl(0 0% 100% / 0.75)" : `${t.pageBg}cc`,
          borderBottom: `1px solid ${subtleBorder}`,
        }}
      >
        <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <button
            onClick={goBack}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-white/5"
            aria-label="Voltar"
            style={{ background: glassCard.background as string, border: glassCard.border as string }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-50 font-semibold">Agendamento</p>
            <h1 className="text-[15px] font-bold truncate -mt-0.5">{stepTitles[step]}</h1>
          </div>
          {step !== "done" && (
            <span className="text-[11px] font-semibold opacity-60 tabular-nums">
              {progress}/{totalSteps}
            </span>
          )}
        </div>
        {step !== "done" && (
          <div className="h-[2px] w-full" style={{ background: subtleBorder }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: t.textPrimary }}
              initial={{ width: 0 }}
              animate={{ width: `${(progress / totalSteps) * 100}%` }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        )}
      </header>

      <main className="relative w-full max-w-[1100px] mx-auto px-4 sm:px-6 py-7 pb-32">
        <AnimatePresence mode="wait">
          {/* ── STEP 1: LIST ── */}
          {step === "list" && (
            <motion.div key="list" {...fade}>
              <div
                className="flex items-center gap-3 px-4 h-12 rounded-2xl mb-5"
                style={glassCard}
              >
                <Search className="w-4 h-4 opacity-50" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar serviço…"
                  className="flex-1 bg-transparent outline-none text-[14px] placeholder:opacity-40"
                />
              </div>

              {/* Categories */}
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
                {MOCK_CATEGORIES.map((cat) => {
                  const active = cat.id === activeCat;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCat(cat.id)}
                      className="px-5 h-10 rounded-full text-[13px] whitespace-nowrap transition-all"
                      style={{
                        background: active ? t.textPrimary : (glassCard.background as string),
                        color: active ? t.pageBg : t.textPrimary,
                        border: `1px solid ${active ? t.textPrimary : subtleBorder}`,
                        backdropFilter: active ? undefined : "blur(20px)",
                        fontWeight: active ? 700 : 500,
                      }}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 space-y-2.5">
                {filteredServices.length === 0 && (
                  <p className="text-sm opacity-60 text-center py-10">Nenhum serviço encontrado.</p>
                )}
                {filteredServices.map((s, i) => (
                  <motion.button
                    key={s.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                    onClick={() => { setService(s); setStep("barber"); }}
                    className="w-full flex items-center gap-4 p-3 rounded-2xl text-left transition-all hover:translate-y-[-1px] group"
                    style={glassCard}
                  >
                    <img
                      src={s.image} alt={s.title} loading="lazy"
                      className="w-[88px] h-[88px] sm:w-24 sm:h-24 rounded-xl object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[15px] leading-tight truncate">{s.title}</h3>
                      <p className="text-[12px] opacity-60 mt-1 line-clamp-2 leading-snug">{s.subtitle}</p>
                      <div className="flex items-center gap-3 mt-2.5 text-[12px]">
                        <span className="inline-flex items-center gap-1 opacity-60">
                          <Clock className="w-3 h-3" /> {s.duration}
                        </span>
                        <span className="font-bold text-[14px]">R$ {s.price}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 opacity-30 flex-shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:opacity-60" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: BARBER ── */}
          {step === "barber" && (
            <motion.div key="barber" {...fade} className="space-y-2.5">
              <SelectedServiceCard service={service!} glass={glassCard} />
              <h2 className="text-[10px] uppercase tracking-[0.3em] opacity-50 font-bold mt-7 mb-3">
                Profissionais
              </h2>
              {MOCK_BARBERS.map((b, i) => {
                const active = barber?.id === b.id;
                return (
                  <motion.button
                    key={b.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setBarber(b)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all"
                    style={{
                      ...glassCard,
                      border: `1px solid ${active ? t.textPrimary : subtleBorder}`,
                      transform: active ? "scale(1.005)" : "scale(1)",
                    }}
                  >
                    <img src={b.avatar} alt={b.name} className="w-12 h-12 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[14px] truncate">{b.name}</p>
                      <p className="text-[12px] opacity-60 truncate">{b.specialty}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold opacity-80">
                      <Star className="w-3 h-3 fill-current" /> {b.rating.toFixed(1)}
                    </span>
                    {active && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: t.textPrimary }}
                      >
                        <Check className="w-3.5 h-3.5" style={{ color: t.pageBg }} />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          )}

          {/* ── STEP 3: DATE/TIME ── */}
          {step === "datetime" && (
            <motion.div key="datetime" {...fade}>
              <SelectedServiceCard service={service!} glass={glassCard} />
              <h2 className="text-[10px] uppercase tracking-[0.3em] opacity-50 font-bold mt-7 mb-3">
                Data
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
                {dates.map((d) => {
                  const active = d.iso === date;
                  return (
                    <button
                      key={d.iso}
                      onClick={() => setDate(d.iso)}
                      className="flex flex-col items-center justify-center min-w-[64px] h-[84px] rounded-2xl transition-all"
                      style={{
                        background: active ? t.textPrimary : (glassCard.background as string),
                        color: active ? t.pageBg : t.textPrimary,
                        border: `1px solid ${active ? t.textPrimary : subtleBorder}`,
                        backdropFilter: active ? undefined : "blur(20px)",
                      }}
                    >
                      <span className="text-[10px] uppercase opacity-60 font-semibold">{d.weekday}</span>
                      <span className="text-2xl font-black leading-none my-0.5">{d.day}</span>
                      <span className="text-[10px] uppercase opacity-60 font-semibold">{d.month}</span>
                    </button>
                  );
                })}
              </div>

              <h2 className="text-[10px] uppercase tracking-[0.3em] opacity-50 font-bold mt-7 mb-3">
                Horário
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {MOCK_TIMES.map((tm) => {
                  const active = tm === time;
                  return (
                    <button
                      key={tm}
                      onClick={() => setTime(tm)}
                      className="h-11 rounded-xl text-[13px] font-semibold transition-all"
                      style={{
                        background: active ? t.textPrimary : (glassCard.background as string),
                        color: active ? t.pageBg : t.textPrimary,
                        border: `1px solid ${active ? t.textPrimary : subtleBorder}`,
                        backdropFilter: active ? undefined : "blur(20px)",
                      }}
                    >
                      {tm}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: AUTH ── */}
          {step === "auth" && (
            <motion.div key="auth" {...fade}>
              <SelectedServiceCard service={service!} glass={glassCard} />

              <div className="mt-7 mb-4 flex items-center gap-2 p-1 rounded-full w-fit" style={glassCard}>
                {(["new", "existing"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setAuthMode(m)}
                    className="px-4 h-9 rounded-full text-[12px] font-semibold transition-all"
                    style={{
                      background: authMode === m ? t.textPrimary : "transparent",
                      color: authMode === m ? t.pageBg : t.textPrimary,
                    }}
                  >
                    {m === "new" ? "Primeira vez" : "Já tenho conta"}
                  </button>
                ))}
              </div>

              <div className="rounded-3xl p-5 sm:p-6 space-y-4" style={glassCard}>
                <div className="flex items-start gap-3 mb-1">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: isLight ? "hsl(220 12% 94%)" : "hsl(0 0% 100% / 0.05)" }}
                  >
                    <Sparkles className="w-4 h-4 opacity-70" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold leading-tight">
                      {authMode === "new" ? "Crie sua conta em 30 segundos" : "Bem-vindo de volta"}
                    </p>
                    <p className="text-[12px] opacity-60 leading-snug mt-0.5">
                      {authMode === "new"
                        ? "Acompanhe agendamentos, histórico e benefícios na Área do Cliente."
                        : "Use seu telefone e senha para entrar."}
                    </p>
                  </div>
                </div>

                {authMode === "new" && (
                  <Field icon={<User2 className="w-4 h-4 opacity-50" />} glass={glassCard}>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nome completo"
                      maxLength={80}
                      className="w-full bg-transparent outline-none text-[15px] placeholder:opacity-40"
                    />
                  </Field>
                )}

                <Field icon={<Phone className="w-4 h-4 opacity-50" />} glass={glassCard}>
                  <input
                    value={phone}
                    onChange={(e) => checkPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    inputMode="tel"
                    className="w-full bg-transparent outline-none text-[15px] placeholder:opacity-40"
                  />
                </Field>

                <Field icon={<Lock className="w-4 h-4 opacity-50" />} glass={glassCard}>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={authMode === "new" ? "Crie uma senha (mín. 6)" : "Sua senha"}
                    maxLength={72}
                    className="w-full bg-transparent outline-none text-[15px] placeholder:opacity-40"
                  />
                </Field>

                <p className="text-[11px] opacity-50 leading-relaxed flex items-start gap-2 mt-1">
                  <Mail className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  Ao continuar, você concorda em receber notificações sobre seu agendamento.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── STEP 5: CONFIRM ── */}
          {step === "confirm" && (
            <motion.div key="confirm" {...fade}>
              <h2 className="text-[10px] uppercase tracking-[0.3em] opacity-50 font-bold mb-3">
                Revise seu agendamento
              </h2>
              <div className="rounded-3xl p-5 sm:p-6 space-y-4" style={glassCard}>
                <Row label="Serviço" value={service?.title || "—"}
                  sub={`R$ ${service?.price} · ${service?.duration}`} />
                <Divider color={subtleBorder} />
                <Row label="Profissional" value={barber?.name || "—"}
                  sub={barber?.specialty} icon={<User2 className="w-4 h-4" />} />
                <Divider color={subtleBorder} />
                <Row
                  label="Data e horário"
                  value={
                    date
                      ? new Date(date + "T00:00").toLocaleDateString("pt-BR", {
                          weekday: "long", day: "2-digit", month: "long",
                        })
                      : "—"
                  }
                  sub={time}
                  icon={<Calendar className="w-4 h-4" />}
                />
                <Divider color={subtleBorder} />
                <Row label="Cliente" value={name || "—"} sub={phone} />
              </div>
              <p className="text-[11px] opacity-50 mt-4 text-center">
                Esta tela é um preview. O agendamento não será gravado no painel.
              </p>
            </motion.div>
          )}

          {/* ── STEP 6: DONE ── */}
          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center justify-center text-center py-20"
            >
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1, stiffness: 200, damping: 15 }}
                className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                style={{ background: t.textPrimary }}
              >
                <Check className="w-10 h-10" style={{ color: t.pageBg }} strokeWidth={3} />
              </motion.div>
              <h2 className="text-3xl font-black mb-2">Tudo certo!</h2>
              <p className="text-sm opacity-60 max-w-xs">
                Agendamento confirmado. Você pode acompanhar tudo na sua Área do Cliente.
              </p>
              <div className="flex gap-3 mt-8">
                <button
                  onClick={reset}
                  className="px-6 h-11 rounded-full font-semibold text-sm"
                  style={{ ...glassCard }}
                >
                  Novo agendamento
                </button>
                <button
                  onClick={() => navigate("/membro")}
                  className="px-6 h-11 rounded-full font-bold text-sm"
                  style={{ background: t.textPrimary, color: t.pageBg }}
                >
                  Área do Cliente
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Sticky CTA */}
      {step !== "list" && step !== "done" && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 px-4 py-4 backdrop-blur-2xl"
          style={{
            background: isLight ? "hsl(0 0% 100% / 0.85)" : `${t.pageBg}e6`,
            borderTop: `1px solid ${subtleBorder}`,
          }}
        >
          <div className="max-w-[1100px] mx-auto flex items-center gap-3">
            <button
              onClick={goBack}
              className="h-12 px-5 rounded-full font-semibold text-[13px]"
              style={glassCard}
            >
              Voltar
            </button>
            <button
              onClick={
                step === "confirm"
                  ? confirmBooking
                  : step === "auth"
                  ? submitAuth
                  : goNext
              }
              disabled={authLoading}
              className="flex-1 h-12 rounded-full font-bold text-[13px] flex items-center justify-center gap-2 disabled:opacity-60 transition-transform active:scale-[0.98]"
              style={{ background: t.textPrimary, color: t.pageBg }}
            >
              {authLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {step === "confirm"
                    ? "Confirmar agendamento"
                    : step === "auth"
                    ? authMode === "new" ? "Criar conta e continuar" : "Entrar e continuar"
                    : "Continuar"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
};

const SelectedServiceCard = ({
  service, glass,
}: { service: MockService; glass: React.CSSProperties }) => (
  <div className="flex items-center gap-3 p-3 rounded-2xl" style={glass}>
    <img src={service.image} alt={service.title} className="w-14 h-14 rounded-xl object-cover" />
    <div className="flex-1 min-w-0">
      <p className="text-[10px] uppercase tracking-[0.25em] opacity-50 font-semibold">Serviço</p>
      <p className="font-bold text-[14px] truncate">{service.title}</p>
      <p className="text-[12px] opacity-60">R$ {service.price} · {service.duration}</p>
    </div>
  </div>
);

const Field = ({
  icon, children, glass,
}: { icon?: React.ReactNode; children: React.ReactNode; glass: React.CSSProperties }) => (
  <div className="flex items-center gap-3 px-4 h-12 rounded-2xl" style={glass}>
    {icon}
    {children}
  </div>
);

const Row = ({
  label, value, sub, icon,
}: { label: string; value: string; sub?: string; icon?: React.ReactNode }) => (
  <div className="flex items-start gap-3">
    {icon && <div className="mt-1 opacity-50">{icon}</div>}
    <div className="flex-1 min-w-0">
      <p className="text-[10px] uppercase tracking-[0.25em] opacity-50 font-semibold">{label}</p>
      <p className="font-semibold text-[14px] mt-0.5">{value}</p>
      {sub && <p className="text-[12px] opacity-60 mt-0.5 capitalize">{sub}</p>}
    </div>
  </div>
);

const Divider = ({ color }: { color: string }) => (
  <div className="h-px w-full" style={{ background: color }} />
);

export default AgendaDireto;
