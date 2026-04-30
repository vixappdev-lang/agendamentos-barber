import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Calendar, Check, ChevronRight, Clock, Loader2,
  Lock, MessageCircle, Phone, Search, Sparkles, Star, User2, X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useDevToolsBlock } from "@/hooks/useDevToolsBlock";
import { useBookingRules } from "@/hooks/useBookingRules";
import { supabase } from "@/integrations/supabase/client";
import {
  MOCK_CATEGORIES, MOCK_BARBERS, MOCK_TIMES,
  MOCK_AMENITIES, MOCK_BARBERSHOP_AMENITIES,
  type MockService, type MockBarber, type MockAmenity,
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

const easeSoft = [0.22, 1, 0.36, 1] as const;

const AgendaDireto = () => {
  const t = useThemeColors();
  useDevToolsBlock();
  const navigate = useNavigate();
  const rules = useBookingRules();
  const [activeCat, setActiveCat] = useState(MOCK_CATEGORIES[0].id);
  const [search, setSearch] = useState("");
  const [step, setStep] = useState<Step>("list");

  // Dados reais
  const [realBarbers, setRealBarbers] = useState<Array<{ id: string; name: string; specialty: string | null; avatar_url: string | null }>>([]);
  const [realServices, setRealServices] = useState<Array<{ id: string; title: string; subtitle: string | null; price: number; duration: string; image_url: string | null; category: string | null }>>([]);
  const [latePolicy, setLatePolicy] = useState("");

  const [service, setService] = useState<MockService | null>(null);
  const [barber, setBarber] = useState<MockBarber | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const [authMode, setAuthMode] = useState<"new" | "existing">("new");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [signedUserId, setSignedUserId] = useState<string | null>(null);

  // amenity modal
  const [amenityOpen, setAmenityOpen] = useState<MockAmenity | null>(null);

  // success modal
  const [successOpen, setSuccessOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

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

  // Fetch profissionais e serviços reais
  useEffect(() => {
    (async () => {
      const [bRes, sRes, settingsRes] = await Promise.all([
        supabase.from("barbers").select("id,name,specialty,avatar_url").eq("active", true).order("sort_order"),
        supabase.from("services").select("id,title,subtitle,price,duration,image_url,category").eq("active", true).order("sort_order"),
        supabase.from("business_settings").select("value").eq("key", "late_policy").maybeSingle(),
      ]);
      if (bRes.data) setRealBarbers(bRes.data as any);
      if (sRes.data) setRealServices(sRes.data.map((s: any) => ({ ...s, price: Number(s.price) })));
      if (settingsRes.data?.value) setLatePolicy(settingsRes.data.value);
    })();
  }, []);

  const filteredServices = useMemo(() => {
    // Se há serviços reais, usa-os agrupando por category
    if (realServices.length > 0) {
      const cat = MOCK_CATEGORIES.find((c) => c.id === activeCat);
      const catKey = cat?.id || "geral";
      const matched = realServices.filter((s) => (s.category || "geral") === catKey || activeCat === "todos");
      const list = matched.length > 0 ? matched : realServices;
      const q = search.trim().toLowerCase();
      const final = !q ? list : list.filter((s) =>
        s.title.toLowerCase().includes(q) || (s.subtitle || "").toLowerCase().includes(q)
      );
      return final.map((s) => ({
        id: s.id,
        title: s.title,
        subtitle: s.subtitle || "",
        price: s.price,
        duration: s.duration,
        image: s.image_url || "/placeholder.svg",
        amenities: undefined as string[] | undefined,
      })) as MockService[];
    }
    const cat = MOCK_CATEGORIES.find((c) => c.id === activeCat);
    if (!cat) return [];
    if (!search.trim()) return cat.services;
    const q = search.toLowerCase();
    return cat.services.filter(
      (s) => s.title.toLowerCase().includes(q) || s.subtitle.toLowerCase().includes(q)
    );
  }, [activeCat, search, realServices]);

  // Datas vindas do hook centralizado (respeita admin)
  const dates = useMemo(() => {
    if (rules.dates.length > 0) {
      return rules.dates.map((d) => ({ iso: d.iso, day: d.day, weekday: d.weekday, month: d.month }));
    }
    // Fallback enquanto carrega
    const out: { iso: string; day: string; weekday: string; month: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
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
  }, [rules.dates]);

  // Horários do dia escolhido
  const availableTimes = useMemo(() => {
    if (!date) return [] as string[];
    const list = rules.getTimesFor(date, barber?.name || null);
    return list.length > 0 ? list : [];
  }, [date, barber, rules]);

  const reset = () => {
    setStep("list");
    setService(null); setBarber(null);
    setDate(""); setTime("");
    if (!signedUserId) { setPhone(""); setName(""); }
    setPassword(""); setAuthMode("new");
    setSuccessOpen(false);
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
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name.trim(), phone: onlyDigits(phone) },
          },
        });
        if (error) {
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

  const sendWhatsAppConfirmation = async () => {
    if (!service || !barber || !date || !time || !phone) return;
    const dt = new Date(date + "T00:00").toLocaleDateString("pt-BR", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
    });
    const firstName = (name || "Cliente").split(" ")[0];
    const priceFmt = `R$ ${service.price.toFixed(2).replace(".", ",")}`;
    const protocolo = Math.random().toString(36).slice(2, 8).toUpperCase();

    const msg =
`✂️ *BARBEARIA STYLLUS*
━━━━━━━━━━━━━━━━━━━━

Olá, *${firstName}*! 👋
Seu agendamento foi *confirmado* com sucesso. ✅

📋 *DETALHES DO ATENDIMENTO*
• Serviço: *${service.title}*
• Profissional: *${barber.name}*
• Duração: ${service.duration}
• Investimento: *${priceFmt}*

📅 *DATA E HORÁRIO*
${dt} — *${time}h*

📍 *ENDEREÇO*
Rua Jatobás, 41 — Coqueiral de Aracruz/ES

━━━━━━━━━━━━━━━━━━━━
🔖 Protocolo: *#${protocolo}*

🕐 *Recomendamos chegar 5 min antes.*
Para *remarcar* ou *cancelar*, basta responder esta mensagem.

Estamos te esperando! 💈
_Equipe Styllus_`;

    try {
      const { data, error } = await supabase.functions.invoke("chatpro", {
        body: { action: "send_message", phone: onlyDigits(phone), message: msg },
      });
      if (error) {
        console.warn("ChatPro invoke error:", error);
        return;
      }
      if (data?.success) {
        toast.success("WhatsApp enviado!", { description: "Confirmação chegou no seu celular." });
      } else if (data?.reason === "chatpro_not_configured") {
        console.info("ChatPro não configurado no admin.");
      }
    } catch (e) {
      console.warn("ChatPro fail:", e);
    }
  };

  const confirmBooking = async () => {
    if (!service || !barber || !date || !time) {
      toast.error("Dados incompletos");
      return;
    }
    setConfirming(true);
    try {
      // Verifica conflito em tempo real antes de inserir
      if (rules.isSlotBlocked(date, time, barber.name)) {
        toast.error("Horário acabou de ser ocupado. Escolha outro.");
        setStep("datetime");
        return;
      }

      // INSERT real (apenas se for serviço real do banco — UUID válido)
      const isRealService = realServices.some((s) => s.id === service.id);
      if (isRealService) {
        const { error } = await supabase.from("appointments").insert({
          customer_name: name.trim() || "Cliente",
          customer_phone: onlyDigits(phone),
          customer_email: signedUserId ? phoneToEmail(phone) : phoneToEmail(phone),
          service_id: service.id,
          barber_name: barber.name,
          appointment_date: date,
          appointment_time: time,
          total_price: service.price,
          status: rules.defaultStatus,
        });
        if (error) {
          toast.error("Erro ao salvar: " + error.message);
          return;
        }
      }

      await sendWhatsAppConfirmation();
      setSuccessOpen(true);
      setStep("done");
    } finally {
      setConfirming(false);
    }
  };

  const stepTitles: Record<Step, string> = {
    list: "Escolha o serviço",
    barber: "Escolha o profissional",
    datetime: "Data e horário",
    auth: signedUserId ? "Seus dados" : authMode === "existing" ? "Entrar na conta" : "Criar conta",
    confirm: "Revisar e confirmar",
    done: "Tudo certo",
  };

  const totalSteps = stepOrder.length - 1;
  const progress = stepOrder.indexOf(step) + 1;
  const isLight = t.isLight;

  // Glass suave — sutil, sem exagero.
  const glassCard: React.CSSProperties = {
    background: isLight
      ? "hsl(0 0% 100% / 0.6)"
      : "hsl(0 0% 100% / 0.025)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: `1px solid ${isLight ? "hsl(220 14% 90%)" : "hsl(0 0% 100% / 0.06)"}`,
    boxShadow: isLight
      ? "0 1px 2px hsl(220 15% 20% / 0.03)"
      : "none",
  };
  const glassCardActive: React.CSSProperties = {
    background: isLight
      ? "hsl(0 0% 100%)"
      : "hsl(0 0% 100% / 0.06)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: `1px solid ${isLight ? "hsl(220 18% 25%)" : "hsl(0 0% 100% / 0.18)"}`,
    boxShadow: isLight
      ? "0 2px 8px hsl(220 15% 20% / 0.08)"
      : "0 0 0 1px hsl(0 0% 100% / 0.04) inset",
  };
  const subtleBorder = isLight ? "hsl(220 14% 89%)" : "hsl(0 0% 100% / 0.07)";
  const softBg = isLight ? "hsl(220 14% 96%)" : "hsl(0 0% 100% / 0.05)";

  // Comodidades da barbearia (filtradas)
  const shopAmenities = MOCK_AMENITIES.filter((a) => MOCK_BARBERSHOP_AMENITIES.includes(a.id));
  const serviceAmenities = service?.amenities
    ? MOCK_AMENITIES.filter((a) => service.amenities!.includes(a.id))
    : shopAmenities;

  return (
    <div className="min-h-screen w-full" style={{ background: t.pageBg, color: t.textPrimary }}>
      {/* Soft ambient backdrop */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none -z-0"
        style={{
          background: isLight
            ? "radial-gradient(1200px 600px at 50% -10%, hsl(220 30% 96%) 0%, transparent 60%)"
            : "radial-gradient(1200px 600px at 50% -10%, hsl(220 30% 10% / 0.5) 0%, transparent 60%)",
        }}
      />

      {/* Topbar */}
      <header
        className="sticky top-0 z-40 backdrop-blur-2xl"
        style={{
          background: isLight ? "hsl(0 0% 100% / 0.78)" : `${t.pageBg}d9`,
          borderBottom: `1px solid ${subtleBorder}`,
        }}
      >
        <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: glassCard.background as string, border: glassCard.border as string }}
            aria-hidden
          >
            <Sparkles className="w-4 h-4 opacity-70" />
          </div>
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
          <div className="h-[2px] w-full overflow-hidden" style={{ background: subtleBorder }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: t.textPrimary }}
              initial={false}
              animate={{ width: `${(progress / totalSteps) * 100}%` }}
              transition={{ duration: 0.5, ease: easeSoft }}
            />
          </div>
        )}
      </header>

      <main className="relative w-full max-w-[1100px] mx-auto px-4 sm:px-6 py-7 pb-32">
        <AnimatePresence mode="wait">
          {/* ── STEP 1: LIST ── */}
          {step === "list" && (
            <motion.div key="list" {...fade}>
              {/* Search */}
              <div className="flex items-center gap-3 px-4 h-12 rounded-2xl mb-5" style={glassCard}>
                <Search className="w-4 h-4 opacity-50" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar serviço…"
                  className="flex-1 bg-transparent outline-none text-[14px] placeholder:opacity-40"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
                {MOCK_CATEGORIES.map((cat) => {
                  const active = cat.id === activeCat;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCat(cat.id)}
                      className="px-5 h-9 rounded-full text-[12.5px] whitespace-nowrap transition-all"
                      style={
                        active
                          ? { background: t.textPrimary, color: t.pageBg, border: `1px solid ${t.textPrimary}`, fontWeight: 700 }
                          : { ...glassCard, fontWeight: 500 }
                      }
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Comodidades — logo abaixo das categorias, ícones compactos uniformes */}
              {shopAmenities.length > 0 && (
                <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-2.5 sm:max-w-md">
                  {shopAmenities.slice(0, 4).map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setAmenityOpen(a)}
                      className="h-12 sm:h-14 rounded-xl flex items-center justify-center transition-all hover:translate-y-[-1px] active:scale-95"
                      style={glassCard}
                      aria-label={a.label}
                      title={a.label}
                    >
                      <a.icon className="w-[18px] h-[18px] sm:w-5 sm:h-5 opacity-80" strokeWidth={1.6} />
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-5 space-y-2">
                {filteredServices.length === 0 && (
                  <p className="text-sm opacity-60 text-center py-10">Nenhum serviço encontrado.</p>
                )}
                {filteredServices.map((s, i) => (
                  <motion.button
                    key={s.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.035, 0.2), ease: easeSoft }}
                    onClick={() => { setService(s); setStep("barber"); }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition-all hover:translate-y-[-1px] group"
                    style={glassCard}
                  >
                    <img
                      src={s.image} alt={s.title}
                      className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-xl object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[14px] leading-tight truncate">{s.title}</h3>
                      <p className="text-[11.5px] opacity-60 mt-0.5 line-clamp-1 leading-snug">{s.subtitle}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11.5px]">
                        <span className="inline-flex items-center gap-1 opacity-60">
                          <Clock className="w-3 h-3" /> {s.duration}
                        </span>
                        <span className="font-bold text-[13px]">R$ {s.price}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-30 flex-shrink-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-60" />
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
              {(realBarbers.length > 0
                ? realBarbers.map((rb, idx) => ({
                    id: rb.id,
                    name: rb.name,
                    specialty: rb.specialty || "Profissional",
                    rating: 5,
                    accent: ["hsl(220 80% 60%)", "hsl(280 70% 60%)", "hsl(150 60% 50%)", "hsl(30 90% 60%)"][idx % 4],
                    initials: rb.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase(),
                    avatar_url: rb.avatar_url,
                  } as MockBarber & { avatar_url: string | null }))
                : MOCK_BARBERS.map((b) => ({ ...b, avatar_url: null as string | null }))
              ).map((b, i) => {
                const active = barber?.id === b.id;
                return (
                  <motion.button
                    key={b.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, ease: easeSoft }}
                    onClick={() => setBarber(b)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all hover:translate-y-[-1px]"
                    style={active ? glassCardActive : glassCard}
                  >
                    {b.avatar_url ? (
                      <img
                        src={b.avatar_url}
                        alt={b.name}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-[14px] flex-shrink-0 text-white"
                        style={{
                          background: `linear-gradient(135deg, ${b.accent}, ${b.accent.replace(/(\d+)%\)$/, (m, l) => `${Math.max(0, parseInt(l) - 15)}%)`)})`,
                        }}
                      >
                        {b.initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[14px] truncate">{b.name}</p>
                      <p className="text-[12px] opacity-60 truncate">{b.specialty}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold opacity-80">
                      <Star className="w-3 h-3 fill-current" /> {b.rating.toFixed(1)}
                    </span>
                    {active && (
                      <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: t.textPrimary }}
                      >
                        <Check className="w-3.5 h-3.5" style={{ color: t.pageBg }} />
                      </motion.div>
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
              <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
                {dates.map((d) => {
                  const active = d.iso === date;
                  return (
                    <button
                      key={d.iso}
                      onClick={() => setDate(d.iso)}
                      className="flex flex-col items-center justify-center min-w-[58px] h-[76px] rounded-2xl transition-all hover:translate-y-[-1px]"
                      style={
                        active
                          ? { background: t.textPrimary, color: t.pageBg, border: `1px solid ${t.textPrimary}` }
                          : glassCard
                      }
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
                {(availableTimes.length > 0 ? availableTimes : MOCK_TIMES).map((tm) => {
                  const active = tm === time;
                  const blocked = date ? rules.isSlotBlocked(date, tm, barber?.name || null) : false;
                  return (
                    <button
                      key={tm}
                      onClick={() => !blocked && setTime(tm)}
                      disabled={blocked}
                      title={blocked ? "Indisponível" : tm}
                      className="h-11 rounded-xl text-[13px] font-semibold transition-all hover:translate-y-[-1px] disabled:opacity-30 disabled:cursor-not-allowed disabled:line-through"
                      style={
                        active
                          ? { background: t.textPrimary, color: t.pageBg, border: `1px solid ${t.textPrimary}` }
                          : glassCard
                      }
                    >
                      {tm}
                    </button>
                  );
                })}
                {date && availableTimes.length === 0 && !rules.loading && (
                  <p className="col-span-full text-center text-[12px] opacity-60 py-4">
                    Nenhum horário disponível neste dia.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: AUTH ── */}
          {step === "auth" && (
            <motion.div key="auth" {...fade}>
              <SelectedServiceCard service={service!} glass={glassCard} />

              <div className="mt-7 mb-4 flex items-center gap-1 p-1 rounded-full w-fit" style={glassCard}>
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
                    style={{ background: softBg }}
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
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
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
                  <MessageCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  Você receberá a confirmação por WhatsApp e poderá acompanhar tudo na Área do Cliente.
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

              {/* Comodidades inclusas no serviço */}
              {serviceAmenities.length > 0 && (
                <>
                  <h2 className="text-[10px] uppercase tracking-[0.3em] opacity-50 font-bold mt-7 mb-3">
                    Comodidades inclusas
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {serviceAmenities.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setAmenityOpen(a)}
                        className="inline-flex items-center gap-2 px-3 h-9 rounded-full text-[12px] transition-all hover:translate-y-[-1px]"
                        style={glassCard}
                      >
                        <a.icon className="w-3.5 h-3.5 opacity-80" strokeWidth={1.7} />
                        <span className="font-semibold opacity-80">{a.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              <p className="text-[11px] opacity-50 mt-6 text-center">
                Ao confirmar você receberá uma mensagem no WhatsApp com os detalhes.
              </p>
            </motion.div>
          )}

          {/* ── STEP 6: DONE (placeholder, modal mostra real) ── */}
          {step === "done" && !successOpen && (
            <motion.div
              key="done"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center text-center py-20"
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: t.textPrimary }}>
                <Check className="w-8 h-8" style={{ color: t.pageBg }} strokeWidth={3} />
              </div>
              <h2 className="text-2xl font-black mb-2">Agendamento confirmado</h2>
              <button
                onClick={reset}
                className="mt-6 px-6 h-11 rounded-full font-semibold text-sm"
                style={glassCard}
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
                step === "confirm" ? confirmBooking
                  : step === "auth" ? submitAuth
                  : goNext
              }
              disabled={authLoading || confirming}
              className="flex-1 h-12 rounded-full font-bold text-[13px] flex items-center justify-center gap-2 disabled:opacity-60 transition-transform active:scale-[0.98]"
              style={{ background: t.textPrimary, color: t.pageBg }}
            >
              {(authLoading || confirming) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {step === "confirm" ? "Confirmar agendamento"
                    : step === "auth" ? (authMode === "new" ? "Criar conta e continuar" : "Entrar e continuar")
                    : "Continuar"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Amenity modal */}
      <AnimatePresence>
        {amenityOpen && (
          <AmenityModal amenity={amenityOpen} onClose={() => setAmenityOpen(null)} t={t} glass={glassCard} softBg={softBg} />
        )}
      </AnimatePresence>

      {/* Success modal */}
      <AnimatePresence>
        {successOpen && service && barber && (
          <SuccessModal
            onNew={reset}
            onMember={() => navigate("/membro")}
            service={service}
            barber={barber}
            date={date}
            time={time}
            t={t}
            glass={glassCard}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.32, ease: easeSoft },
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

// ─── Amenity modal ────────────────────────────────────────────────────────────
// Animações específicas por ícone — só dispara quando o modal abre.
const amenityAnimations: Record<string, { animate: any; transition: any }> = {
  wifi: {
    animate: { scale: [0.9, 1.08, 1], opacity: [0.4, 1, 1] },
    transition: { duration: 1.2, times: [0, 0.6, 1], repeat: Infinity, repeatDelay: 0.6, ease: "easeOut" },
  },
  coffee: {
    animate: { y: [0, -3, 0], rotate: [-2, 2, -2] },
    transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
  },
  parking: {
    animate: { scale: [1, 1.08, 1] },
    transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
  },
  ar: {
    animate: { rotate: [0, 360] },
    transition: { duration: 4, repeat: Infinity, ease: "linear" },
  },
  tv: {
    animate: { opacity: [1, 0.55, 1] },
    transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" },
  },
  produtos: {
    animate: { scale: [1, 1.15, 1], rotate: [0, 12, -12, 0] },
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
  cartao: {
    animate: { rotateY: [0, 180, 360] },
    transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
  },
  acessivel: {
    animate: { x: [0, 4, 0] },
    transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
  },
  kids: {
    animate: { y: [0, -4, 0] },
    transition: { duration: 1.4, repeat: Infinity, ease: "easeOut" },
  },
  petfriendly: {
    animate: { rotate: [-8, 8, -8] },
    transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" },
  },
  drinks: {
    animate: { rotate: [-6, 6, -6], y: [0, -2, 0] },
    transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
  },
  som: {
    animate: { scale: [1, 1.12, 1] },
    transition: { duration: 0.6, repeat: Infinity, ease: "easeInOut" },
  },
};

const AmenityModal = ({
  amenity, onClose, t, glass, softBg,
}: {
  amenity: MockAmenity; onClose: () => void;
  t: ReturnType<typeof useThemeColors>;
  glass: React.CSSProperties;
  softBg: string;
}) => {
  const Icon = amenity.icon;
  const anim = amenityAnimations[amenity.id] || {
    animate: { scale: [1, 1.08, 1] },
    transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
  };
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "hsl(0 0% 0% / 0.55)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.98 }}
        transition={{ ease: easeSoft, duration: 0.32 }}
        className="w-full max-w-md rounded-3xl p-6 relative overflow-hidden"
        style={{
          background: t.isLight
            ? "hsl(0 0% 100%)"
            : "hsl(220 18% 9%)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: t.isLight ? "1px solid hsl(220 14% 88%)" : "1px solid hsl(0 0% 100% / 0.08)",
          boxShadow: "0 16px 40px hsl(0 0% 0% / 0.35)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105"
          style={{ background: softBg }}
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
        <motion.div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: softBg }}
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.05 }}
        >
          <motion.div animate={anim.animate} transition={anim.transition} style={{ display: "inline-flex" }}>
            <Icon className="w-7 h-7" strokeWidth={1.7} />
          </motion.div>
        </motion.div>
        <h3 className="text-xl font-black mb-2">{amenity.label}</h3>
        <p className="text-[14px] opacity-70 leading-relaxed">{amenity.description}</p>
        <button
          onClick={onClose}
          className="mt-6 w-full h-12 rounded-full font-bold text-[13px]"
          style={{ background: t.textPrimary, color: t.pageBg }}
        >
          Entendi
        </button>
      </motion.div>
    </motion.div>
  );
};

// ─── Success modal ────────────────────────────────────────────────────────────
const SuccessModal = ({
  onNew, onMember, service, barber, date, time, t, glass,
}: {
  onNew: () => void;
  onMember: () => void;
  service: MockService;
  barber: MockBarber;
  date: string; time: string;
  t: ReturnType<typeof useThemeColors>;
  glass: React.CSSProperties;
}) => {
  const dt = date
    ? new Date(date + "T00:00").toLocaleDateString("pt-BR", {
        weekday: "long", day: "2-digit", month: "long",
      })
    : "";
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "hsl(0 0% 0% / 0.6)", backdropFilter: "blur(10px)" }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ ease: easeSoft, duration: 0.4 }}
        className="w-full max-w-md rounded-3xl p-7 text-center relative overflow-hidden"
        style={{ ...glass, background: t.pageBg }}
      >
        {/* Subtle gradient accent */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: t.isLight
              ? "radial-gradient(400px 200px at 50% 0%, hsl(140 60% 90% / 0.4), transparent 70%)"
              : "radial-gradient(400px 200px at 50% 0%, hsl(140 60% 30% / 0.18), transparent 70%)",
          }}
        />
        <div className="relative">
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.05 }}
            className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5 relative"
            style={{ background: t.textPrimary }}
          >
            <Check className="w-10 h-10" style={{ color: t.pageBg }} strokeWidth={3} />
            {/* ripple */}
            <motion.div
              initial={{ scale: 1, opacity: 0.4 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 1.4, ease: "easeOut", repeat: Infinity, repeatDelay: 0.4 }}
              className="absolute inset-0 rounded-full border-2"
              style={{ borderColor: t.textPrimary }}
            />
          </motion.div>

          <h2 className="text-2xl font-black mb-1">Agendamento confirmado!</h2>
          <p className="text-[13px] opacity-60 mb-6">
            Enviamos a confirmação no seu WhatsApp.
          </p>

          <div className="rounded-2xl p-4 text-left space-y-2 mb-6" style={{ background: t.isLight ? "hsl(220 14% 96%)" : "hsl(0 0% 100% / 0.04)" }}>
            <div className="flex items-center justify-between text-[13px]">
              <span className="opacity-60">Serviço</span>
              <span className="font-bold truncate ml-3">{service.title}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="opacity-60">Profissional</span>
              <span className="font-bold truncate ml-3">{barber.name}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="opacity-60">Quando</span>
              <span className="font-bold truncate ml-3 capitalize">{dt} · {time}</span>
            </div>
            <div className="flex items-center justify-between text-[13px] pt-1.5 border-t" style={{ borderColor: t.isLight ? "hsl(220 14% 90%)" : "hsl(0 0% 100% / 0.06)" }}>
              <span className="opacity-60">Total</span>
              <span className="font-black text-base">R$ {service.price}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={onMember}
              className="h-12 rounded-full font-bold text-[13px]"
              style={{ background: t.textPrimary, color: t.pageBg }}
            >
              Ir para Área do Cliente
            </button>
            <button
              onClick={onNew}
              className="h-11 rounded-full font-semibold text-[12.5px] opacity-70 hover:opacity-100 transition-opacity"
            >
              Fazer novo agendamento
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AgendaDireto;
