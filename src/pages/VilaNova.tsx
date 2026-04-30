import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Scissors, Clock, MapPin, Phone, Instagram, ChevronRight, ChevronDown, Star, X, ArrowLeft, ArrowRight, Check, Calendar, User, Send, Loader2, CheckCircle, Menu, LogOut, Award, Users, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useThemeColors } from "@/hooks/useThemeColors";
import { toast } from "sonner";
import type { User as AuthUser } from "@supabase/supabase-js";
import { findStockImage } from "@/data/stockImages";
import { TeamSection, TestimonialsSection, FAQSection } from "@/components/landing/LandingExtras";
import DirectionsModalSimple from "@/components/DirectionsModalSimple";

import heroImg1 from "@/assets/styllus/hero-1.jpg";
import heroImg2 from "@/assets/styllus/hero-2.jpg";
import heroImg3 from "@/assets/styllus/hero-3.jpg";
import galleryImg1 from "@/assets/styllus/gallery-1.jpg";
import galleryImg2 from "@/assets/styllus/gallery-2.jpg";
import galleryImg3 from "@/assets/styllus/gallery-3.jpg";
import galleryImg4 from "@/assets/styllus/gallery-4.jpg";
import galleryImg5 from "@/assets/styllus/gallery-5.jpg";
import galleryImg6 from "@/assets/styllus/gallery-6.jpg";
import brandLogo from "@/assets/styllus/logo.png";

const heroImages = [heroImg1, heroImg2, heroImg3];
const galleryImages = [galleryImg1, galleryImg2, galleryImg3, galleryImg4, galleryImg5, galleryImg6];

interface DBService {
  id: string; title: string; subtitle: string | null; price: number;
  duration: string; image_url: string | null;
}

interface DBBarber {
  id: string; name: string; specialty: string | null; avatar_url: string | null;
}

const steps = ["Serviço", "Barbeiro", "Data & Hora", "Seus Dados", "Confirmar"];

const VilaNova = () => {
  const t = useThemeColors();
  const [heroIndex, setHeroIndex] = useState(0);
  const [services, setServices] = useState<DBService[]>([]);
  const [barbers, setBarbers] = useState<DBBarber[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [selectedService, setSelectedService] = useState<DBService | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [allServicesOpen, setAllServicesOpen] = useState(false);

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

  const selBg = settings.btn_primary_bg || (t.isLight ? "hsl(220 20% 12%)" : "hsl(0 0% 95%)");
  const selColor = settings.btn_primary_text || (t.isLight ? "hsl(0 0% 98%)" : "hsl(230 20% 7%)");
  const selShadow = t.isLight ? "0 2px 8px hsl(220 15% 20% / 0.15)" : "0 4px 20px hsl(0 0% 100% / 0.15)";

  const userName = user?.user_metadata?.full_name?.split(" ")[0] || name || "Usuário";

  const navLinks = [
    { label: "Início", href: "#" },
    { label: "Sobre", href: "#sobre" },
    { label: "Serviços", href: "#servicos" },
    { label: "Equipe", href: "#equipe" },
    { label: "Galeria", href: "#galeria" },
    { label: "FAQ", href: "#faq" },
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
    <div className="min-h-screen w-full overflow-x-hidden" style={{ background: t.pageBg, color: t.textPrimary, fontFamily: "'Montserrat', sans-serif" }}>

      {/* ─── NAVBAR ─── */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled ? t.headerBg : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? `1px solid ${t.border}` : "none",
        }}
      >
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 h-16 sm:h-20 grid grid-cols-[auto_1fr_auto] items-center gap-6">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-white/15" style={{ background: "hsl(0 0% 95%)" }}>
              <img src={settings.site_logo_url || brandLogo} alt={settings.business_name || "Logo"} className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">{settings.business_name || "GenesisBarber"}</span>
          </a>

          {/* Desktop nav — centralizado */}
          <div className="hidden md:flex items-center justify-center gap-6 lg:gap-8">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} className="text-sm font-medium transition-colors hover:opacity-80" style={{ color: t.textLink }}>
                {link.label}
              </a>
            ))}
          </div>

          {/* Right actions */}
          <div className="hidden md:flex items-center gap-2 justify-end">
            {user ? (
              <button onClick={handleGoToMember} className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:opacity-90"
                style={{ background: t.btnGhostBg, border: `1px solid ${t.btnGhostBorder}` }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: selBg, color: selColor }}>
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium">{userName}</span>
              </button>
            ) : (
              <button onClick={handleGoToMember} className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90"
                style={{ background: t.btnGhostBg, border: `1px solid ${t.btnGhostBorder}`, color: t.btnGhostColor }}>
                Área do Cliente
              </button>
            )}
            <a href="#servicos" className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:translate-y-[-1px]"
              style={{ background: selBg, color: selColor }}>
              Agendar
            </a>
          </div>

          {/* Mobile menu btn */}
          <button onClick={() => setMobileMenu(true)} className="md:hidden p-2 rounded-lg justify-self-end col-start-3" style={{ background: t.btnGhostBg }}>
            <Menu className="w-5 h-5" style={{ color: t.textPrimary }} />
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenu && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60]" style={{ background: t.overlayBg }} onClick={() => setMobileMenu(false)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-[70] w-[80vw] max-w-xs flex flex-col"
              style={{ background: t.drawerBg, borderLeft: `1px solid ${t.border}` }}>
              <div className="p-5 flex justify-between items-center" style={{ borderBottom: `1px solid ${t.border}` }}>
                {user ? (
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold" style={{ background: selBg, color: selColor }}>
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{userName}</p>
                      <p className="text-[10px]" style={{ color: t.textSecondary }}>Cliente</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: t.textSecondary }}>Menu</span>
                )}
                <button onClick={() => setMobileMenu(false)} className="p-2 rounded-lg" style={{ background: t.cardBgSubtle }}>
                  <X className="w-4 h-4" style={{ color: t.textLink }} />
                </button>
              </div>
              <nav className="flex-1 p-4 space-y-1">
                {navLinks.map((link) => (
                  <a key={link.label} href={link.href} onClick={() => setMobileMenu(false)}
                    className="block px-4 py-3.5 rounded-xl text-sm font-medium transition-all"
                    style={{ color: t.btnGhostColor }}>
                    {link.label}
                  </a>
                ))}
              </nav>
              <div className="p-4 space-y-3" style={{ borderTop: `1px solid ${t.border}` }}>
                <button onClick={() => { setMobileMenu(false); handleGoToMember(); }}
                  className="block w-full text-center px-5 py-3 rounded-xl text-sm font-medium"
                  style={{ background: t.btnGhostBg, border: `1px solid ${t.btnGhostBorder}`, color: t.btnGhostColor }}>
                  {user ? `👤 ${userName}` : "Área do Cliente"}
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
          {heroImages.map((img, i) => (
            <img
              key={i}
              src={img}
              alt={settings.business_name || "Barbearia Styllus"}
              decoding="async"
              fetchPriority={i === 0 ? "high" : "low"}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ease-in-out"
              style={{ opacity: i === heroIndex ? 1 : 0 }}
            />
          ))}
        </motion.div>

        <div className="absolute inset-0" style={{
          background: "linear-gradient(180deg, hsl(220 20% 4% / 0.4) 0%, hsl(220 20% 4% / 0.2) 40%, hsl(220 20% 4% / 0.7) 75%, hsl(220 20% 4%) 100%)"
        }} />

        <motion.div style={{ opacity: heroOpacity }} className="relative z-10 h-full flex flex-col justify-end pb-12 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto w-full">
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, duration: 0.9 }}>
            <div className="mb-5">
              <span
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold tracking-wide"
                style={{
                  background: "hsl(0 0% 100% / 0.08)",
                  border: "1px solid hsl(0 0% 100% / 0.14)",
                  backdropFilter: "blur(18px) saturate(140%)",
                  WebkitBackdropFilter: "blur(18px) saturate(140%)",
                  color: "hsl(0 0% 95%)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(140 60% 55%)" }} />
                {settings.hero_subtitle || "Estilo e precisão há 20 anos"}
              </span>
            </div>
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tighter mb-5">
              {(settings.hero_title || settings.business_name || "Genesis").split(" ").map((word, i) => (
                <span key={i}>{word}<br /></span>
              ))}
            </h1>
            <p className="text-sm sm:text-base lg:text-lg max-w-lg mb-8 leading-relaxed" style={{ color: "hsl(0 0% 100% / 0.55)" }}>
              {settings.hero_description || "Mais do que um corte, uma experiência de transformação. Estilo, precisão e confiança em cada detalhe."}
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
        <div className="max-w-[1600px] mx-auto">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            
            {/* Section label */}
            <div className="flex items-center gap-3 mb-10 lg:mb-14">
              <div className="w-10 h-px" style={{ background: t.borderSubtle }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.35em]" style={{ color: t.textMuted }}>Sobre nós</span>
            </div>

            <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
              {/* Text content - takes 5 columns on desktop */}
              <div className="lg:col-span-5">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black mb-8 leading-[1.05] tracking-tight" style={{ color: t.textPrimary }}>
                  {settings.about_title || "Onde estilo\nencontra atitude"}
                </h2>
                <p className="text-sm sm:text-base leading-relaxed mb-6" style={{ color: t.textSecondary }}>
                  {settings.about_description || "Não somos apenas uma barbearia, somos um espaço de transformação masculina. Aqui, cada detalhe é pensado para elevar seu visual e sua confiança ao máximo nível."}
                </p>
                <p className="text-sm sm:text-base leading-relaxed mb-10" style={{ color: t.textMuted }}>
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
                      style={{ background: t.cardBg, border: `1px solid ${t.isLight ? 'hsl(220 12% 88%)' : t.borderSubtle}`, boxShadow: t.isLight ? '0 1px 3px hsl(220 15% 20% / 0.04)' : 'none' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: t.isLight ? 'hsl(220 12% 94%)' : t.cardBgSubtle }}>
                        <feat.icon className="w-5 h-5" style={{ color: t.textLink }} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold mb-0.5" style={{ color: t.textPrimary }}>{feat.title}</h4>
                        <p className="text-xs leading-relaxed" style={{ color: t.textMuted }}>{feat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { number: settings.business_years || "20+", label: "Anos" },
                    { number: settings.business_clients || "10K+", label: "Clientes" },
                    { number: settings.business_rating || "5.0", label: "Avaliação" },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center p-4 rounded-xl" style={{ background: t.cardBg, border: `1px solid ${t.isLight ? 'hsl(220 12% 88%)' : t.borderSubtle}`, boxShadow: t.isLight ? '0 1px 3px hsl(220 15% 20% / 0.04)' : 'none' }}>
                      <span className="text-2xl sm:text-3xl font-black block" style={{ color: t.textPrimary }}>{stat.number}</span>
                      <p className="text-[10px] sm:text-xs mt-1 font-medium" style={{ color: t.textMuted }}>{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Image grid - takes 7 columns on desktop - 2x2 alinhado */}
              <div className="lg:col-span-7">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {[
                    { src: galleryImg1, alt: "Corte profissional" },
                    { src: galleryImg2, alt: "Estilo e precisão" },
                    { src: galleryImg3, alt: "Acabamento perfeito" },
                    { src: galleryImg4, alt: "Visual moderno" },
                  ].map((img) => (
                    <div
                      key={img.alt}
                      className="rounded-2xl overflow-hidden aspect-square"
                      style={{ border: `1px solid ${t.borderSubtle}` }}
                    >
                      <img
                        src={img.src}
                        alt={img.alt}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── SERVICES ─── */}
      <section id="servicos" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8" style={{ background: t.isLight ? "hsl(220 12% 95%)" : "hsl(220 18% 5%)" }}>
        <div className="max-w-[1600px] mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12 sm:mb-16">
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="w-10 h-px" style={{ background: t.borderSubtle }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.35em]" style={{ color: t.textMuted }}>Nossos serviços</span>
              <div className="w-10 h-px" style={{ background: t.borderSubtle }} />
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight" style={{ color: t.textPrimary }}>Escolha seu serviço</h2>
            <p className="text-sm sm:text-base mt-4 max-w-md mx-auto" style={{ color: t.textSecondary }}>
              Selecione o serviço desejado e agende no melhor horário para você.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {services.slice(0, 4).map((service, i) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="group rounded-2xl overflow-hidden transition-all duration-300 hover:translate-y-[-4px] cursor-pointer"
                style={{ background: t.cardBg, border: `1px solid ${t.isLight ? 'hsl(220 12% 88%)' : t.borderSubtle}`, boxShadow: t.isLight ? '0 2px 8px hsl(220 15% 20% / 0.06), 0 1px 3px hsl(220 15% 20% / 0.04)' : 'none' }}
                onClick={() => { setSelectedService(service); setCurrentStep(0); }}
              >
                {(() => {
                  const stock = findStockImage(service.title)?.src || null;
                  const imgSrc = service.image_url || stock;
                  return imgSrc ? (
                    <div className="relative w-full h-44 sm:h-48 overflow-hidden" style={{ background: t.cardBgSubtle }}>
                      <img
                        src={imgSrc}
                        alt={service.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        decoding="async"
                        onError={(e) => {
                          const el = e.currentTarget as HTMLImageElement;
                          if (stock && el.src !== stock) el.src = stock;
                          else el.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold" style={{ background: 'hsl(0 0% 0% / 0.6)', backdropFilter: 'blur(8px)', color: 'hsl(0 0% 95%)' }}>
                        <Clock className="w-3 h-3" /> {service.duration}
                      </div>
                    </div>
                  ) : null;
                })()}
                <div className="p-5 sm:p-6">
                  {!service.image_url && !findStockImage(service.title) && (
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: t.isLight ? 'hsl(220 12% 94%)' : t.cardBgSubtle }}>
                        <Scissors className="w-5 h-5" style={{ color: t.textLink }} />
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg" style={{ background: t.isLight ? 'hsl(220 12% 94%)' : t.cardBgSubtle, color: t.textMuted }}>
                        <Clock className="w-3 h-3" /> {service.duration}
                      </div>
                    </div>
                  )}
                  <h3 className="font-bold text-base sm:text-lg mb-1" style={{ color: t.textPrimary }}>{service.title}</h3>
                  <p className="text-xs mb-5 line-clamp-2" style={{ color: t.textSecondary }}>{service.subtitle || "Serviço profissional"}</p>
                  <div className="flex items-center justify-between pt-4" style={{ borderTop: `1px solid ${t.isLight ? 'hsl(220 12% 90%)' : t.borderSubtle}` }}>
                    <span className="text-xl sm:text-2xl font-black" style={{ color: t.textPrimary }}>R$ {service.price}</span>
                    <span className="flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl transition-all group-hover:translate-x-1"
                      style={{ background: selBg, color: selColor }}>
                      Agendar <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {services.length > 4 && (
            <div className="flex justify-center mt-10">
              <button
                onClick={() => setAllServicesOpen(true)}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-bold transition-all hover:translate-y-[-1px] active:scale-[0.98]"
                style={{
                  background: t.isLight ? "hsl(0 0% 100%)" : "hsl(0 0% 100% / 0.06)",
                  border: `1px solid ${t.isLight ? "hsl(220 12% 88%)" : "hsl(0 0% 100% / 0.12)"}`,
                  backdropFilter: "blur(20px)",
                  color: t.textPrimary,
                }}
              >
                Ver todos os serviços ({services.length})
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ─── EQUIPE ─── */}
      <TeamSection barbers={barbers} />

      {/* ─── GALLERY ─── */}
      <section id="galeria" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1600px] mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12 sm:mb-16">
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="w-10 h-px" style={{ background: t.borderSubtle }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.35em]" style={{ color: t.textMuted }}>Galeria</span>
              <div className="w-10 h-px" style={{ background: t.borderSubtle }} />
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight" style={{ color: t.textPrimary }}>Nosso trabalho</h2>
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
                style={{ border: `1px solid ${t.borderSubtle}` }}
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

      {/* ─── DEPOIMENTOS ─── */}
      <TestimonialsSection />

      {/* ─── FAQ ─── */}
      <FAQSection />

      {/* ─── CTA BANNER ─── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8" style={{ background: t.isLight ? "hsl(220 12% 95%)" : "hsl(220 18% 5%)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-4" style={{ color: t.textPrimary }}>Pronto para elevar<br />seu estilo?</h2>
            <p className="text-sm sm:text-base mb-8 max-w-md mx-auto" style={{ color: t.textSecondary }}>
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
      <footer id="contato" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8" style={{ borderTop: `1px solid ${t.borderSubtle}` }}>
        <div className="max-w-[1600px] mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10 mb-14">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: t.btnBg }}>
                  <Scissors className="w-4 h-4" style={{ color: t.btnColor }} />
                </div>
                <span className="font-extrabold text-lg" style={{ color: t.textPrimary }}>{settings.business_name || "GenesisBarber"}</span>
              </div>
              <p className="text-xs leading-relaxed max-w-xs" style={{ color: t.textMuted }}>
                Excelência em cuidado masculino. Estilo, precisão e confiança, tudo em um só lugar.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-5" style={{ color: t.textPrimary }}>Contato</h4>
              <div className="space-y-3">
                {settings.address && (() => {
                  // Shorten long address: keep first 2 segments (street + neighborhood)
                  const parts = settings.address.split(",").map(s => s.trim()).filter(Boolean);
                  const short = parts.length > 3 ? `${parts[1] || parts[0]}, ${parts[0]} — ${parts[parts.length - 4] || parts[2] || ""}`.trim() : settings.address;
                  return (
                    <div className="flex items-start gap-2.5 text-xs" style={{ color: t.textSecondary }}>
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 leading-relaxed">{short.replace(/,\s*—\s*$/, "")}</span>
                    </div>
                  );
                })()}
                <div className="flex items-center gap-2.5 text-xs" style={{ color: t.textSecondary }}>
                  <Phone className="w-3.5 h-3.5 shrink-0" /> {settings.whatsapp_number || "(00) 00000-0000"}
                </div>
                {settings.instagram && (() => {
                  // extrai handle (@usuario) do link ou texto
                  const raw = settings.instagram.trim();
                  const match = raw.match(/instagram\.com\/([^/?#]+)/i);
                  const handle = match ? match[1].replace(/\/$/, "") : raw.replace(/^@/, "");
                  const url = match ? raw : `https://www.instagram.com/${handle}`;
                  return (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2.5 text-xs transition-opacity hover:opacity-100"
                      style={{ color: t.textSecondary }}
                    >
                      <Instagram className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-semibold">@{handle}</span>
                    </a>
                  );
                })()}
                {settings.address && (
                  <button
                    onClick={() => setDirectionsOpen(true)}
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:translate-y-[-1px] active:scale-[0.98]"
                    style={{ background: t.btnBg, color: t.btnColor, boxShadow: t.cardShadow }}
                  >
                    <MapPin className="w-3.5 h-3.5" /> Como chegar?
                  </button>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-5" style={{ color: t.textPrimary }}>Horários</h4>
              <div className="space-y-2 text-xs" style={{ color: t.textSecondary }}>
                <p>Seg - Sex: {settings.opening_time || "09:00"} - {settings.closing_time || "19:00"}</p>
                <p>Intervalo: {settings.lunch_start || "12:00"} - {settings.lunch_end || "13:00"}</p>
              </div>
            </div>
          </div>
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: `1px solid ${t.borderSubtle}` }}>
            <p className="text-[11px]" style={{ color: t.textMuted }}>
              © {new Date().getFullYear()} {settings.business_name || "GenesisBarber"}. Todos os direitos reservados.
            </p>
            <div className="flex gap-3">
              {["Instagram", "WhatsApp"].map((s) => (
                <span key={s} className="text-[11px] px-3 py-1.5 rounded-lg" style={{ background: t.cardBgSubtle, color: t.textMuted }}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ─── DIRECTIONS MODAL ─── */}
      <DirectionsModalSimple
        open={directionsOpen}
        onClose={() => setDirectionsOpen(false)}
        address={settings.address || ""}
        businessName={settings.business_name}
      />

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
            style={{ background: t.overlayBg, backdropFilter: "blur(12px)" }}>
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto scrollbar-hide rounded-t-2xl sm:rounded-2xl"
              style={{ background: t.modalCardBg, backdropFilter: t.isLight ? "none" : "blur(28px)", border: `1px solid ${t.border}`, boxShadow: "0 8px 32px hsl(0 0% 0% / 0.4)" }}>

              <div className="flex items-center justify-between p-4 sm:p-5 sticky top-0 z-10" style={{ borderBottom: `1px solid ${t.borderSubtle}`, background: t.modalCardBg, backdropFilter: t.isLight ? "none" : "blur(28px)" }}>
                <h2 className="text-lg sm:text-xl font-bold" style={{ color: t.textPrimary }}>Agendamento</h2>
                <button onClick={closeBooking} className="p-2 rounded-xl" style={{ background: t.cardBgSubtle }}>
                  <X className="w-5 h-5" style={{ color: t.textMuted }} />
                </button>
              </div>

              <div className="px-4 sm:px-5 pt-4 pb-2">
                <div className="flex items-center justify-between">
                  {steps.map((step, i) => (
                    <div key={step} className="flex items-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all"
                        style={i < currentStep ? { background: t.cardBgActive, color: t.textSecondary } : i === currentStep ? { background: selBg, color: selColor } : { background: t.cardBgSubtle, color: t.textMuted }}>
                        {i < currentStep ? <Check className="w-4 h-4" /> : i + 1}
                      </div>
                      {i < steps.length - 1 && <div className="hidden sm:block w-6 lg:w-8 h-px mx-1" style={{ background: i < currentStep ? t.borderStrong : t.borderSubtle }} />}
                    </div>
                  ))}
                </div>
                <p className="text-sm mt-3 font-medium" style={{ color: t.textMuted }}>{steps[currentStep]}</p>
              </div>

              <div className="p-4 sm:p-5 min-h-[280px]">
                {currentStep === 0 && (
                  <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: t.cardBg, border: `1px solid ${t.borderSubtle}` }}>
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: t.cardBgSubtle }}>
                      <Scissors className="w-6 h-6" style={{ color: t.textLink }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold" style={{ color: t.textPrimary }}>{selectedService.title}</h3>
                      <p className="text-xs mt-0.5 truncate" style={{ color: t.textSecondary }}>{selectedService.subtitle || selectedService.duration}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="font-bold text-lg" style={{ color: t.textPrimary }}>R$ {selectedService.price}</span>
                        <span className="text-xs flex items-center gap-1" style={{ color: t.textSecondary }}><Clock className="w-3 h-3" /> {selectedService.duration}</span>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="space-y-2">
                    {barbers.map((b) => (
                      <button key={b.id} onClick={() => setSelectedBarber(b)}
                        className="w-full rounded-xl p-4 text-left transition-all"
                        style={{ background: selectedBarber?.id === b.id ? t.cardBgActive : t.cardBg, border: `1px solid ${selectedBarber?.id === b.id ? t.borderStrong : t.borderSubtle}` }}>
                        <div className="flex items-center gap-3">
                          {b.avatar_url ? (
                            <img src={b.avatar_url} alt={b.name} className="w-11 h-11 rounded-xl object-cover" />
                          ) : (
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm"
                              style={{ background: selectedBarber?.id === b.id ? selBg : t.cardBgSubtle, color: selectedBarber?.id === b.id ? selColor : t.textMuted }}>
                              {b.name.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold" style={{ color: t.textPrimary }}>{b.name}</h4>
                            <p className="text-xs truncate" style={{ color: t.textSecondary }}>{b.specialty || "Barbeiro"}</p>
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
                      <label className="text-sm font-semibold flex items-center gap-2 mb-3" style={{ color: t.textPrimary }}><Calendar className="w-4 h-4" style={{ color: t.textMuted }} /> Data</label>
                      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                        {dates.map((d) => (
                          <button key={d.value} onClick={() => { setSelectedDate(d.value); setSelectedTime(""); }}
                            className="shrink-0 w-16 py-3 rounded-xl text-center transition-all"
                            style={{ background: selectedDate === d.value ? selBg : t.cardBgSubtle, border: `1px solid ${selectedDate === d.value ? "transparent" : t.borderSubtle}`, color: selectedDate === d.value ? selColor : t.textMuted }}>
                            <span className="block text-[10px] uppercase font-medium opacity-70">{d.weekday}</span>
                            <span className="block text-sm font-bold mt-0.5">{d.day}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold flex items-center gap-2 mb-3" style={{ color: t.textPrimary }}><Clock className="w-4 h-4" style={{ color: t.textMuted }} /> Horário</label>
                      {loadingTimes ? (
                        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" style={{ color: t.textMuted }} /></div>
                      ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-40 overflow-y-auto scrollbar-hide">
                          {availableTimes.map((timeSlot) => {
                            const isBooked = bookedTimes.includes(timeSlot);
                            return (
                              <button key={timeSlot} onClick={() => !isBooked && setSelectedTime(timeSlot)} disabled={isBooked}
                                className="py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                style={{ background: selectedTime === timeSlot ? selBg : isBooked ? "hsl(0 60% 50% / 0.08)" : t.cardBgSubtle, border: `1px solid ${selectedTime === timeSlot ? "transparent" : t.borderSubtle}`, color: selectedTime === timeSlot ? selColor : isBooked ? "hsl(0 60% 55%)" : t.textMuted }}>
                                <span style={{ textDecoration: isBooked ? "line-through" : "none" }}>{timeSlot}</span>
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
                        <p className="text-xs" style={{ color: t.isLight ? "hsl(140 60% 35%)" : "hsl(140 60% 65%)" }}>Logado como <strong>{userName}</strong>. Seus dados foram preenchidos automaticamente.</p>
                      </div>
                    )}
                    {[
                      { label: "Nome", icon: <User className="w-4 h-4" />, type: "text", value: name, set: setName, placeholder: "Seu nome" },
                      { label: "Sobrenome", icon: <User className="w-4 h-4" />, type: "text", value: surname, set: setSurname, placeholder: "Seu sobrenome" },
                      { label: "WhatsApp", icon: <Send className="w-4 h-4" />, type: "tel", value: phone, set: setPhone, placeholder: "(27) 99999-9999" },
                      ...(!isLoggedIn ? [{ label: "Senha", icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, type: "password", value: password, set: setPassword, placeholder: "Crie uma senha (min. 6 caracteres)" }] : []),
                    ].map((field) => (
                      <div key={field.label}>
                        <label className="text-sm font-semibold flex items-center gap-2 mb-2" style={{ color: t.textPrimary }}>
                          <span style={{ color: t.textMuted }}>{field.icon}</span> {field.label}
                        </label>
                        <input type={field.type} value={field.value} onChange={(e) => field.set(e.target.value)} placeholder={field.placeholder}
                          className="w-full rounded-xl px-4 py-3 transition-all outline-none focus:ring-2"
                          style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} />
                      </div>
                    ))}
                    {!isLoggedIn && (
                      <p className="text-[11px] mt-1" style={{ color: t.textMuted }}>
                        Ao confirmar, sua conta será criada automaticamente para futuros agendamentos.
                      </p>
                    )}
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold mb-4" style={{ color: t.textPrimary }}>Resumo</h3>
                    {[
                      { label: "Serviço", value: selectedService.title },
                      { label: "Barbeiro", value: selectedBarber?.name || "" },
                      { label: "Data", value: selectedDate ? new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR") : "" },
                      { label: "Horário", value: selectedTime },
                      { label: "Nome", value: `${name} ${surname}` },
                      { label: "WhatsApp", value: phone },
                      { label: "Valor", value: `R$ ${selectedService.price}` },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between py-2.5" style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
                        <span className="text-sm" style={{ color: t.textSecondary }}>{item.label}</span>
                        <span className="text-sm font-semibold" style={{ color: t.textPrimary }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between" style={{ borderTop: `1px solid ${t.borderSubtle}` }}>
                <button onClick={currentStep === 0 ? closeBooking : () => setCurrentStep(currentStep - 1)}
                  className="flex items-center gap-2 px-4 sm:px-5 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{ background: t.btnGhostBg, border: `1px solid ${t.btnGhostBorder}`, color: t.btnGhostColor }}>
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
            style={{ background: t.overlayBg, backdropFilter: "blur(12px)" }}>
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }}
              className="w-full max-w-sm p-7 text-center space-y-5 rounded-2xl"
              style={{ background: t.modalCardBg, backdropFilter: t.isLight ? "none" : "blur(28px)", border: `1px solid ${t.border}` }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
                style={{ background: "hsl(140 60% 45% / 0.12)", border: "2px solid hsl(140 60% 45% / 0.3)" }}>
                <CheckCircle className="w-10 h-10" style={{ color: "hsl(140 60% 50%)" }} />
              </motion.div>
              <div>
                <h3 className="text-2xl font-black tracking-tight" style={{ color: t.textPrimary }}>Tudo Certo! 🎉</h3>
                <p className="text-base font-semibold mt-2" style={{ color: t.textPrimary }}>Seu agendamento foi confirmado!</p>
                <p className="text-sm mt-2" style={{ color: t.textSecondary }}>
                  Você receberá uma confirmação no seu WhatsApp com todos os detalhes.
                </p>
              </div>

              {/* Appointment summary */}
              <div className="p-4 rounded-xl space-y-2 text-left" style={{ background: t.cardBg, border: `1px solid ${t.borderSubtle}` }}>
                {[
                  { icon: "💈", text: selectedService?.title },
                  { icon: "✂️", text: selectedBarber?.name },
                  { icon: "📅", text: selectedDate ? new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) : "" },
                  { icon: "🕐", text: selectedTime ? `às ${selectedTime}` : "" },
                  { icon: "💰", text: selectedService ? `R$ ${selectedService.price.toFixed(2)}` : "" },
                ].filter(item => item.text).map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm">
                    <span>{item.icon}</span>
                    <span style={{ color: t.textSecondary }}>{item.text}</span>
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
