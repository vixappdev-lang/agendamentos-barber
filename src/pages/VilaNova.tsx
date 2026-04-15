import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Scissors, Clock, MapPin, Phone, Instagram, ChevronRight, ChevronDown, Star, X, ArrowLeft, ArrowRight, Check, Calendar, User, Send, Loader2, CheckCircle, Menu, LogOut, Award, Users, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User as AuthUser } from "@supabase/supabase-js";

import heroImg1 from "@/assets/vilanova-hero-1.jpg";
import heroImg2 from "@/assets/vilanova-hero-2.jpg";
import heroImg3 from "@/assets/vilanova-hero-3.jpg";
import galleryImg1 from "@/assets/vilanova-gallery-1.jpg";
import galleryImg2 from "@/assets/vilanova-gallery-2.jpg";
import galleryImg3 from "@/assets/vilanova-gallery-3.jpg";

const heroImages = [heroImg1, heroImg2, heroImg3];
const galleryImages = [heroImg1, heroImg2, heroImg3, galleryImg1, galleryImg2, galleryImg3];

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
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Auth state
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

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

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
      if (session?.user) {
        const meta = session.user.user_metadata;
        if (meta?.full_name) {
          const parts = meta.full_name.split(" ");
          setName(parts[0] || "");
          setSurname(parts.slice(1).join(" ") || "");
        }
        if (meta?.phone) setPhone(meta.phone);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setHeroIndex((p) => (p + 1) % heroImages.length), 5000);
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

  // If user is logged in, skip step 3 validation for name/phone (auto-filled)
  const isLoggedIn = !!user;
  const canProceed = () => {
    switch (currentStep) {
      case 0: return true;
      case 1: return !!selectedBarber;
      case 2: return !!selectedDate && !!selectedTime;
      case 3:
        if (isLoggedIn) return !!name && !!surname && !!phone;
        return !!name && !!surname && !!phone && !!password;
      default: return true;
    }
  };

  const handleSignUp = async (): Promise<boolean> => {
    const digitsOnly = phone.replace(/\D/g, "");
    const email = `${digitsOnly}@genesis.barber`;
    const fullName = `${name.trim()} ${surname.trim()}`;

    // Try sign up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
        },
      },
    });

    if (signUpError) {
      // If user already exists, try to sign in
      if (signUpError.message?.includes("already registered") || signUpError.message?.includes("already been registered")) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          toast.error("Senha incorreta para este telefone. Tente novamente.");
          return false;
        }
        setUser(signInData.user);
        return true;
      }
      toast.error("Erro ao criar conta. Tente novamente.");
      console.error("SignUp error:", signUpError);
      return false;
    }

    if (signUpData.user) {
      setUser(signUpData.user);
    }
    return true;
  };

  const handleConfirm = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) { toast.error("Nome inválido."); return; }
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length < 10) { toast.error("Telefone inválido."); return; }
    setSubmitting(true);

    // Create account if not logged in
    if (!isLoggedIn) {
      if (!password || password.length < 6) {
        toast.error("Senha deve ter no mínimo 6 caracteres.");
        setSubmitting(false);
        return;
      }
      const authOk = await handleSignUp();
      if (!authOk) { setSubmitting(false); return; }
    }

    const customerEmail = `${digitsOnly}@genesis.barber`;
    const { error } = await supabase.from("appointments").insert({
      service_id: selectedService!.id,
      customer_name: `${name.trim()} ${surname.trim()}`,
      customer_phone: phone,
      customer_email: customerEmail,
      barber_name: selectedBarber?.name || null,
      appointment_date: selectedDate,
      appointment_time: selectedTime,
      total_price: selectedService!.price,
      status: "pending",
    });
    if (error) { toast.error("Erro ao agendar."); setSubmitting(false); return; }
    try {
      const dateFormatted = new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR");
      const memberLink = `${window.location.origin}/membro`;
      const bName = settings.business_name || "GenesisBarber";
      const msg = `✅ *Agendamento Confirmado!*\n\nOlá *${name}*, tudo certo!\n\n💈 ${selectedService!.title}\n✂️ ${selectedBarber?.name}\n📅 ${dateFormatted} às ${selectedTime}\n💰 R$ ${selectedService!.price.toFixed(2)}\n\n📍 ${settings.address || "Endereço"}\n⏰ Chegue 5 min antes\n\n🔗 Acesse sua área de membro:\n${memberLink}\n\n*${bName}* 💈`;
      await supabase.functions.invoke("chatpro", {
        body: { action: "send_message", phone: digitsOnly, message: msg },
      });
    } catch (e) { console.error("WhatsApp error:", e); }
    setSubmitting(false);
    setShowConfirmation(true);
  };

  const closeBooking = () => {
    setSelectedService(null); setCurrentStep(0); setSelectedBarber(null);
    setSelectedDate(""); setSelectedTime("");
    if (!isLoggedIn) { setName(""); setSurname(""); setPhone(""); }
    setPassword(""); setShowConfirmation(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setName(""); setSurname(""); setPhone("");
    setMobileMenu(false);
  };

  const selBg = "hsl(0 0% 95%)";
  const selColor = "hsl(230 20% 7%)";
  const selShadow = "0 4px 20px hsl(0 0% 100% / 0.15)";

  const userName = user?.user_metadata?.full_name?.split(" ")[0] || name || "Usuário";

  const navLinks = [
    { label: "Início", href: "#" },
    { label: "Sobre", href: "#sobre" },
    { label: "Serviços", href: "#servicos" },
    { label: "Galeria", href: "#galeria" },
    { label: "Loja", href: "/loja", external: true },
    { label: "Contato", href: "#contato" },
  ];

  const handleGoToMember = () => {
    if (user) {
      window.location.href = "/membro";
    } else {
      window.location.href = "/login";
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ background: "hsl(220 20% 4%)", color: "hsl(0 0% 93%)", fontFamily: "'Montserrat', sans-serif" }}>

      {/* ─── NAVBAR ─── */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled ? "hsl(220 20% 4% / 0.85)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid hsl(0 0% 100% / 0.06)" : "none",
        }}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "hsl(0 0% 95%)" }}>
              <Scissors className="w-4 h-4" style={{ color: "hsl(220 20% 7%)" }} />
            </div>
            <span className="text-lg font-extrabold tracking-tight">{settings.business_name || "GenesisBarber"}</span>
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            {navLinks.map((link) => (
              link.external ? (
                <a key={link.label} href={link.href} className="text-sm font-medium transition-colors hover:text-white" style={{ color: "hsl(0 0% 60%)" }}>
                  {link.label}
                </a>
              ) : (
                <a key={link.label} href={link.href} className="text-sm font-medium transition-colors hover:text-white" style={{ color: "hsl(0 0% 60%)" }}>
                  {link.label}
                </a>
              )
            ))}
            <div className="flex items-center gap-2">
              {user ? (
                <button onClick={handleGoToMember} className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:bg-white/5"
                  style={{ background: "hsl(0 0% 100% / 0.06)", border: "1px solid hsl(0 0% 100% / 0.08)" }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: selBg, color: selColor }}>
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{userName}</span>
                </button>
              ) : (
                <button onClick={handleGoToMember} className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                  style={{ background: "hsl(0 0% 100% / 0.06)", border: "1px solid hsl(0 0% 100% / 0.08)", color: "hsl(0 0% 70%)" }}>
                  Área do Cliente
                </button>
              )}
              <a href="#servicos" className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:translate-y-[-1px]"
                style={{ background: selBg, color: selColor }}>
                Agendar
              </a>
            </div>
          </div>

          {/* Mobile menu btn */}
          <button onClick={() => setMobileMenu(true)} className="md:hidden p-2 rounded-lg" style={{ background: "hsl(0 0% 100% / 0.06)" }}>
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenu && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60]" style={{ background: "hsl(0 0% 0% / 0.6)" }} onClick={() => setMobileMenu(false)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-[70] w-[80vw] max-w-xs flex flex-col"
              style={{ background: "hsl(220 18% 6%)", borderLeft: "1px solid hsl(0 0% 100% / 0.06)" }}>
              <div className="p-5 flex justify-between items-center" style={{ borderBottom: "1px solid hsl(0 0% 100% / 0.06)" }}>
                {user ? (
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold" style={{ background: selBg, color: selColor }}>
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{userName}</p>
                      <p className="text-[10px]" style={{ color: "hsl(0 0% 50%)" }}>Cliente</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: "hsl(0 0% 50%)" }}>Menu</span>
                )}
                <button onClick={() => setMobileMenu(false)} className="p-2 rounded-lg" style={{ background: "hsl(0 0% 100% / 0.05)" }}>
                  <X className="w-4 h-4" style={{ color: "hsl(0 0% 60%)" }} />
                </button>
              </div>
              <nav className="flex-1 p-4 space-y-1">
                {navLinks.map((link) => (
                  <a key={link.label} href={link.href} onClick={() => setMobileMenu(false)}
                    className="block px-4 py-3.5 rounded-xl text-sm font-medium transition-all"
                    style={{ color: "hsl(0 0% 75%)" }}>
                    {link.label}
                  </a>
                ))}
              </nav>
              <div className="p-4 space-y-3" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.06)" }}>
                <button onClick={() => { setMobileMenu(false); handleGoToMember(); }}
                  className="block w-full text-center px-5 py-3 rounded-xl text-sm font-medium"
                  style={{ background: "hsl(0 0% 100% / 0.06)", border: "1px solid hsl(0 0% 100% / 0.08)", color: "hsl(0 0% 70%)" }}>
                  {user ? `👤 ${userName}` : "Minha Conta"}
                </button>
                <a href="#servicos" onClick={() => setMobileMenu(false)}
                  className="block w-full text-center px-5 py-3.5 rounded-xl text-sm font-bold"
                  style={{ background: selBg, color: selColor }}>
                  Agendar Agora
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── HERO ─── */}
      <section ref={heroRef} className="relative h-screen min-h-[600px] max-h-[1000px] overflow-hidden">
        <motion.div style={{ scale: heroScale }} className="absolute inset-0">
          <AnimatePresence mode="wait">
            <motion.img
              key={heroIndex}
              src={heroImages[heroIndex]}
              alt="Barbearia Vila Nova"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>
        </motion.div>

        <div className="absolute inset-0" style={{
          background: "linear-gradient(180deg, hsl(220 20% 4% / 0.4) 0%, hsl(220 20% 4% / 0.2) 40%, hsl(220 20% 4% / 0.7) 75%, hsl(220 20% 4%) 100%)"
        }} />

        <motion.div style={{ opacity: heroOpacity }} className="relative z-10 h-full flex flex-col justify-end pb-12 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, duration: 0.9 }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-px" style={{ background: "hsl(0 0% 100% / 0.3)" }} />
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.35em]" style={{ color: "hsl(0 0% 100% / 0.5)" }}>
                Barbearia Premium
              </span>
            </div>
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tighter mb-5">
              {(settings.business_name || "Genesis").split(" ").map((word, i) => (
                <span key={i}>{word}<br /></span>
              ))}
            </h1>
            <p className="text-sm sm:text-base lg:text-lg max-w-lg mb-8 leading-relaxed" style={{ color: "hsl(0 0% 100% / 0.55)" }}>
              Mais do que um corte — uma experiência de transformação. Estilo, precisão e confiança em cada detalhe.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href="#servicos"
                className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-sm font-bold transition-all hover:translate-y-[-2px] active:scale-[0.98]"
                style={{ background: selBg, color: selColor, boxShadow: selShadow }}>
                Agendar Agora <ChevronRight className="w-4 h-4" />
              </a>
              <a href="#sobre"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-sm font-medium transition-all"
                style={{ background: "hsl(0 0% 100% / 0.06)", border: "1px solid hsl(0 0% 100% / 0.1)", color: "hsl(0 0% 75%)" }}>
                Saiba Mais
              </a>
            </div>
          </motion.div>

          <div className="flex gap-2 mt-10">
            {heroImages.map((_, i) => (
              <button key={i} onClick={() => setHeroIndex(i)}
                className="h-1 rounded-full transition-all duration-500"
                style={{ background: i === heroIndex ? "hsl(0 0% 90%)" : "hsl(0 0% 100% / 0.15)", width: i === heroIndex ? 32 : 12 }} />
            ))}
          </div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10"
        >
          <ChevronDown className="w-5 h-5" style={{ color: "hsl(0 0% 100% / 0.25)" }} />
        </motion.div>
      </section>

      {/* ─── ABOUT ─── */}
      <section id="sobre" className="py-20 sm:py-28 lg:py-36 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            
            {/* Section label */}
            <div className="flex items-center gap-3 mb-10 lg:mb-14">
              <div className="w-10 h-px" style={{ background: "hsl(0 0% 100% / 0.15)" }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.35em]" style={{ color: "hsl(0 0% 100% / 0.35)" }}>Sobre nós</span>
            </div>

            <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
              {/* Text content - takes 5 columns on desktop */}
              <div className="lg:col-span-5">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black mb-8 leading-[1.05] tracking-tight">
                  Onde estilo<br />encontra atitude
                </h2>
                <p className="text-sm sm:text-base leading-relaxed mb-6" style={{ color: "hsl(0 0% 100% / 0.5)" }}>
                  Não somos apenas uma barbearia — somos um espaço de transformação masculina. Aqui, cada detalhe é pensado para elevar seu visual e sua confiança ao máximo nível.
                </p>
                <p className="text-sm sm:text-base leading-relaxed mb-10" style={{ color: "hsl(0 0% 100% / 0.4)" }}>
                  Profissionais especializados, técnicas atualizadas e um ambiente que você não vai querer sair. Desde o corte clássico até o estilo mais ousado, entregamos resultado com precisão.
                </p>

                {/* Features */}
                <div className="space-y-4 mb-10">
                  {[
                    { icon: Award, title: "Excelência Garantida", desc: "Equipe certificada com técnicas de ponta atualizadas" },
                    { icon: Users, title: "Experiência Exclusiva", desc: "Atendimento VIP com atenção total a cada detalhe" },
                    { icon: Heart, title: "Ambiente de Alto Padrão", desc: "Espaço premium projetado para o seu conforto" },
                  ].map((feat) => (
                    <div key={feat.title} className="flex gap-4 items-start p-4 rounded-2xl transition-all"
                      style={{ background: "hsl(0 0% 100% / 0.02)", border: "1px solid hsl(0 0% 100% / 0.04)" }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(0 0% 100% / 0.06)" }}>
                        <feat.icon className="w-5 h-5" style={{ color: "hsl(0 0% 70%)" }} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold mb-0.5">{feat.title}</h4>
                        <p className="text-xs leading-relaxed" style={{ color: "hsl(0 0% 100% / 0.4)" }}>{feat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { number: "5+", label: "Anos" },
                    { number: "3K+", label: "Clientes" },
                    { number: "5.0", label: "Avaliação" },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center p-4 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.02)", border: "1px solid hsl(0 0% 100% / 0.04)" }}>
                      <span className="text-2xl sm:text-3xl font-black block">{stat.number}</span>
                      <p className="text-[10px] sm:text-xs mt-1 font-medium" style={{ color: "hsl(0 0% 100% / 0.35)" }}>{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Image grid - takes 7 columns on desktop */}
              <div className="lg:col-span-7">
                <div className="grid grid-cols-12 gap-3 sm:gap-4">
                  {/* Large featured image */}
                  <div className="col-span-7 rounded-2xl overflow-hidden" style={{ border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                    <div className="aspect-[3/4]">
                      <img src={heroImg1} alt="Interior" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  </div>
                  {/* Right column with 2 stacked images */}
                  <div className="col-span-5 flex flex-col gap-3 sm:gap-4">
                    <div className="rounded-2xl overflow-hidden flex-1" style={{ border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                      <img src={heroImg2} alt="Barba profissional" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="rounded-2xl overflow-hidden flex-1" style={{ border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                      <img src={galleryImg1} alt="Ferramentas profissionais" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  </div>
                  {/* Bottom row with 2 images */}
                  <div className="col-span-5 rounded-2xl overflow-hidden" style={{ border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                    <div className="aspect-[4/3]">
                      <img src={heroImg3} alt="Corte moderno" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  </div>
                  <div className="col-span-7 rounded-2xl overflow-hidden" style={{ border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                    <div className="aspect-[4/3]">
                      <img src={galleryImg3} alt="Ambiente acolhedor" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── SERVICES ─── */}
      <section id="servicos" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8" style={{ background: "hsl(220 18% 5%)" }}>
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12 sm:mb-16">
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="w-10 h-px" style={{ background: "hsl(0 0% 100% / 0.15)" }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.35em]" style={{ color: "hsl(0 0% 100% / 0.35)" }}>Nossos serviços</span>
              <div className="w-10 h-px" style={{ background: "hsl(0 0% 100% / 0.15)" }} />
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">Escolha seu serviço</h2>
            <p className="text-sm sm:text-base mt-4 max-w-md mx-auto" style={{ color: "hsl(0 0% 100% / 0.4)" }}>
              Selecione o serviço desejado e agende no melhor horário para você.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service, i) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="group rounded-2xl overflow-hidden transition-all duration-300 hover:translate-y-[-4px] cursor-pointer"
                style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}
                onClick={() => { setSelectedService(service); setCurrentStep(0); }}
              >
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "hsl(0 0% 100% / 0.06)" }}>
                      <Scissors className="w-5 h-5" style={{ color: "hsl(0 0% 70%)" }} />
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg" style={{ background: "hsl(0 0% 100% / 0.05)", color: "hsl(0 0% 55%)" }}>
                      <Clock className="w-3 h-3" /> {service.duration}
                    </div>
                  </div>
                  <h3 className="font-bold text-base sm:text-lg mb-1">{service.title}</h3>
                  <p className="text-xs mb-5 line-clamp-2" style={{ color: "hsl(0 0% 100% / 0.4)" }}>{service.subtitle || "Serviço profissional"}</p>
                  <div className="flex items-center justify-between pt-4" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.06)" }}>
                    <span className="text-xl sm:text-2xl font-black">R$ {service.price}</span>
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all group-hover:translate-x-1"
                      style={{ background: "hsl(0 0% 100% / 0.06)", color: "hsl(0 0% 70%)" }}>
                      Agendar <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── GALLERY ─── */}
      <section id="galeria" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12 sm:mb-16">
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="w-10 h-px" style={{ background: "hsl(0 0% 100% / 0.15)" }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.35em]" style={{ color: "hsl(0 0% 100% / 0.35)" }}>Galeria</span>
              <div className="w-10 h-px" style={{ background: "hsl(0 0% 100% / 0.15)" }} />
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">Nosso trabalho</h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
            {galleryImages.map((img, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="relative rounded-2xl overflow-hidden cursor-pointer group aspect-square"
                style={{ border: "1px solid hsl(0 0% 100% / 0.06)" }}
                onClick={() => setLightboxIndex(i)}
              >
                <img src={img} alt={`Galeria ${i + 1}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: "hsl(0 0% 100% / 0.15)", backdropFilter: "blur(8px)" }}>
                    <Star className="w-5 h-5 text-white" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8" style={{ background: "hsl(220 18% 5%)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-4">Pronto para elevar<br />seu estilo?</h2>
            <p className="text-sm sm:text-base mb-8 max-w-md mx-auto" style={{ color: "hsl(0 0% 100% / 0.45)" }}>
              Agende agora e descubra por que somos a escolha número 1. Vagas limitadas.
            </p>
            <a href="#servicos"
              className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl text-sm font-bold transition-all hover:translate-y-[-2px] active:scale-[0.98]"
              style={{ background: selBg, color: selColor, boxShadow: selShadow }}>
              Agendar Agora <ChevronRight className="w-4 h-4" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer id="contato" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.04)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(0 0% 95%)" }}>
                  <Scissors className="w-4 h-4" style={{ color: "hsl(220 20% 7%)" }} />
                </div>
                <span className="font-extrabold text-lg">{settings.business_name || "GenesisBarber"}</span>
              </div>
              <p className="text-xs leading-relaxed max-w-xs" style={{ color: "hsl(0 0% 100% / 0.35)" }}>
                Excelência em cuidado masculino. Estilo, precisão e confiança — tudo em um só lugar.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-5">Navegação</h4>
              <div className="space-y-3">
                {navLinks.filter(l => !l.external).map((link) => (
                  <a key={link.label} href={link.href} className="block text-xs transition-colors hover:text-white" style={{ color: "hsl(0 0% 100% / 0.4)" }}>
                    {link.label}
                  </a>
                ))}
                <a href="/loja" className="block text-xs transition-colors hover:text-white" style={{ color: "hsl(0 0% 100% / 0.4)" }}>Loja</a>
                <a href="/login" className="block text-xs transition-colors hover:text-white" style={{ color: "hsl(0 0% 100% / 0.4)" }}>Área do Cliente</a>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-5">Contato</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 text-xs" style={{ color: "hsl(0 0% 100% / 0.4)" }}>
                  <MapPin className="w-3.5 h-3.5 shrink-0" /> {settings.address || "Endereço da barbearia"}
                </div>
                <div className="flex items-center gap-2.5 text-xs" style={{ color: "hsl(0 0% 100% / 0.4)" }}>
                  <Phone className="w-3.5 h-3.5 shrink-0" /> {settings.whatsapp_number || "(00) 00000-0000"}
                </div>
                {settings.instagram && (
                  <div className="flex items-center gap-2.5 text-xs" style={{ color: "hsl(0 0% 100% / 0.4)" }}>
                    <Instagram className="w-3.5 h-3.5 shrink-0" /> {settings.instagram}
                  </div>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-5">Horários</h4>
              <div className="space-y-2 text-xs" style={{ color: "hsl(0 0% 100% / 0.4)" }}>
                <p>Seg - Sex: {settings.opening_time || "09:00"} - {settings.closing_time || "19:00"}</p>
                <p>Intervalo: {settings.lunch_start || "12:00"} - {settings.lunch_end || "13:00"}</p>
              </div>
            </div>
          </div>
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.04)" }}>
            <p className="text-[11px]" style={{ color: "hsl(0 0% 100% / 0.2)" }}>
              © {new Date().getFullYear()} {settings.business_name || "GenesisBarber"}. Todos os direitos reservados.
            </p>
            <div className="flex gap-3">
              {["Instagram", "WhatsApp"].map((s) => (
                <span key={s} className="text-[11px] px-3 py-1.5 rounded-lg" style={{ background: "hsl(0 0% 100% / 0.04)", color: "hsl(0 0% 100% / 0.3)" }}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ─── LIGHTBOX ─── */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "hsl(0 0% 0% / 0.92)", backdropFilter: "blur(20px)" }}
            onClick={() => setLightboxIndex(null)}>
            <button className="absolute top-5 right-5 p-2.5 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.1)" }} onClick={() => setLightboxIndex(null)}>
              <X className="w-5 h-5" />
            </button>
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
              {galleryImages.map((_, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                  className="w-2 h-2 rounded-full transition-all"
                  style={{ background: i === lightboxIndex ? "hsl(0 0% 90%)" : "hsl(0 0% 100% / 0.2)" }} />
              ))}
            </div>
            <img src={galleryImages[lightboxIndex]} alt="" className="max-w-full max-h-[85vh] rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── BOOKING MODAL ─── */}
      <AnimatePresence>
        {selectedService && !showConfirmation && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
            style={{ background: "hsl(220 20% 4% / 0.9)", backdropFilter: "blur(12px)" }}>
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto scrollbar-hide rounded-t-2xl sm:rounded-2xl"
              style={{ background: "hsl(0 0% 100% / 0.04)", backdropFilter: "blur(28px)", border: "1px solid hsl(0 0% 100% / 0.08)", boxShadow: "0 8px 32px hsl(0 0% 0% / 0.4)" }}>

              <div className="flex items-center justify-between p-4 sm:p-5 sticky top-0 z-10" style={{ borderBottom: "1px solid hsl(0 0% 100% / 0.06)", background: "hsl(0 0% 100% / 0.03)", backdropFilter: "blur(28px)" }}>
                <h2 className="text-lg sm:text-xl font-bold">Agendamento</h2>
                <button onClick={closeBooking} className="p-2 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.05)" }}>
                  <X className="w-5 h-5" style={{ color: "hsl(0 0% 60%)" }} />
                </button>
              </div>

              <div className="px-4 sm:px-5 pt-4 pb-2">
                <div className="flex items-center justify-between">
                  {steps.map((step, i) => (
                    <div key={step} className="flex items-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all"
                        style={i < currentStep ? { background: "hsl(0 0% 90% / 0.15)", color: "hsl(0 0% 80%)" } : i === currentStep ? { background: selBg, color: selColor } : { background: "hsl(0 0% 100% / 0.05)", color: "hsl(0 0% 40%)" }}>
                        {i < currentStep ? <Check className="w-4 h-4" /> : i + 1}
                      </div>
                      {i < steps.length - 1 && <div className="hidden sm:block w-6 lg:w-8 h-px mx-1" style={{ background: i < currentStep ? "hsl(0 0% 100% / 0.15)" : "hsl(0 0% 100% / 0.06)" }} />}
                    </div>
                  ))}
                </div>
                <p className="text-sm mt-3 font-medium" style={{ color: "hsl(0 0% 55%)" }}>{steps[currentStep]}</p>
              </div>

              <div className="p-4 sm:p-5 min-h-[280px]">
                {currentStep === 0 && (
                  <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(0 0% 100% / 0.05)" }}>
                      <Scissors className="w-6 h-6" style={{ color: "hsl(0 0% 70%)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold">{selectedService.title}</h3>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "hsl(0 0% 100% / 0.4)" }}>{selectedService.subtitle || selectedService.duration}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="font-bold text-lg">R$ {selectedService.price}</span>
                        <span className="text-xs flex items-center gap-1" style={{ color: "hsl(0 0% 100% / 0.4)" }}><Clock className="w-3 h-3" /> {selectedService.duration}</span>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 1 && (
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
                              style={{ background: selectedBarber?.id === b.id ? selBg : "hsl(0 0% 100% / 0.05)", color: selectedBarber?.id === b.id ? selColor : "hsl(0 0% 50%)" }}>
                              {b.name.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold">{b.name}</h4>
                            <p className="text-xs truncate" style={{ color: "hsl(0 0% 100% / 0.4)" }}>{b.specialty || "Barbeiro"}</p>
                          </div>
                          {selectedBarber?.id === b.id && <Check className="w-5 h-5 shrink-0" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-5">
                    <div>
                      <label className="text-sm font-semibold flex items-center gap-2 mb-3"><Calendar className="w-4 h-4" style={{ color: "hsl(0 0% 55%)" }} /> Data</label>
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
                    {isLoggedIn && (
                      <div className="flex items-center gap-3 p-3 rounded-xl mb-2" style={{ background: "hsl(140 60% 45% / 0.08)", border: "1px solid hsl(140 60% 45% / 0.15)" }}>
                        <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "hsl(140 60% 50%)" }} />
                        <p className="text-xs" style={{ color: "hsl(140 60% 65%)" }}>Logado como <strong>{userName}</strong>. Seus dados foram preenchidos automaticamente.</p>
                      </div>
                    )}
                    {[
                      { label: "Nome", icon: <User className="w-4 h-4" />, type: "text", value: name, set: setName, placeholder: "Seu nome" },
                      { label: "Sobrenome", icon: <User className="w-4 h-4" />, type: "text", value: surname, set: setSurname, placeholder: "Seu sobrenome" },
                      { label: "WhatsApp", icon: <Send className="w-4 h-4" />, type: "tel", value: phone, set: setPhone, placeholder: "(27) 99999-9999" },
                      ...(!isLoggedIn ? [{ label: "Senha", icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, type: "password", value: password, set: setPassword, placeholder: "Crie uma senha (min. 6 caracteres)" }] : []),
                    ].map((field) => (
                      <div key={field.label}>
                        <label className="text-sm font-semibold flex items-center gap-2 mb-2" style={{ color: "hsl(0 0% 80%)" }}>
                          <span style={{ color: "hsl(0 0% 55%)" }}>{field.icon}</span> {field.label}
                        </label>
                        <input type={field.type} value={field.value} onChange={(e) => field.set(e.target.value)} placeholder={field.placeholder}
                          className="w-full rounded-xl px-4 py-3 transition-all outline-none focus:ring-2 focus:ring-white/20"
                          style={{ background: "hsl(0 0% 100% / 0.04)", border: "1px solid hsl(0 0% 100% / 0.08)", color: "hsl(0 0% 93%)" }} />
                      </div>
                    ))}
                    {!isLoggedIn && (
                      <p className="text-[11px] mt-1" style={{ color: "hsl(0 0% 100% / 0.3)" }}>
                        Ao confirmar, sua conta será criada automaticamente para futuros agendamentos.
                      </p>
                    )}
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold mb-4">Resumo</h3>
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
                        <span className="text-sm" style={{ color: "hsl(0 0% 50%)" }}>{item.label}</span>
                        <span className="text-sm font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.06)" }}>
                <button onClick={currentStep === 0 ? closeBooking : () => setCurrentStep(currentStep - 1)}
                  className="flex items-center gap-2 px-4 sm:px-5 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{ background: "hsl(0 0% 100% / 0.05)", border: "1px solid hsl(0 0% 100% / 0.08)", color: "hsl(0 0% 65%)" }}>
                  <ArrowLeft className="w-4 h-4" /> {currentStep === 0 ? "Cancelar" : "Voltar"}
                </button>
                {currentStep < steps.length - 1 ? (
                  <button onClick={() => canProceed() && setCurrentStep(currentStep + 1)} disabled={!canProceed()}
                    className="flex items-center gap-2 px-5 sm:px-6 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-35"
                    style={{ background: selBg, color: selColor }}>
                    Próximo <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={handleConfirm} disabled={submitting}
                    className="flex items-center gap-2 px-5 sm:px-6 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                    style={{ background: selBg, color: selColor, boxShadow: selShadow }}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {submitting ? "..." : "Confirmar"}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation */}
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

              {/* Appointment summary */}
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

              <div className="space-y-2.5 pt-1">
                <motion.button onClick={closeBooking}
                  className="w-full py-3.5 rounded-xl font-bold text-sm"
                  style={{ background: selBg, color: selColor }}
                  whileTap={{ scale: 0.98 }}>
                  Ok
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VilaNova;
