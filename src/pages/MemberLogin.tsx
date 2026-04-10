import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, Eye, EyeOff, ArrowRight, Loader2, User, Phone, Lock, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import heroImg1 from "@/assets/vilanova-hero-1.jpg";
import heroImg2 from "@/assets/vilanova-hero-2.jpg";
import heroImg3 from "@/assets/vilanova-hero-3.jpg";

const slides = [
  { img: heroImg1, title: "Tradição & Estilo", desc: "Mais de 5 anos cuidando do seu visual" },
  { img: heroImg2, title: "Profissionais Top", desc: "Equipe certificada e atualizada" },
  { img: heroImg3, title: "Experiência Premium", desc: "Ambiente confortável e acolhedor" },
];

const MemberLogin = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [slideIndex, setSlideIndex] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // Auth redirect is handled by LoginRedirectGuard

  useEffect(() => {
    const interval = setInterval(() => setSlideIndex((p) => (p + 1) % slides.length), 4000);
    return () => clearInterval(interval);
  }, []);

  const getEmail = (ph: string) => `${ph.replace(/\D/g, "")}@vilanova.barber`;

  const handleLogin = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) { toast.error("Telefone inválido."); return; }
    if (password.length < 6) { toast.error("Senha deve ter no mínimo 6 caracteres."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: getEmail(phone), password });
    if (error) { toast.error("Telefone ou senha incorretos."); setLoading(false); return; }
    toast.success("Bem-vindo de volta!");
    navigate("/vilanova/membro", { replace: true });
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!name.trim() || name.trim().length < 2) { toast.error("Nome inválido."); return; }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) { toast.error("Telefone inválido."); return; }
    if (password.length < 6) { toast.error("Senha deve ter no mínimo 6 caracteres."); return; }
    setLoading(true);
    const fullName = `${name.trim()} ${surname.trim()}`.trim();
    const { data, error } = await supabase.auth.signUp({
      email: getEmail(phone),
      password,
      options: { data: { full_name: fullName, phone } },
    });
    if (error) {
      if (error.message?.includes("already")) {
        toast.error("Este telefone já está cadastrado. Faça login.");
        setMode("login");
      } else {
        toast.error("Erro ao criar conta.");
      }
      setLoading(false);
      return;
    }
    if (data.user) {
      toast.success("Conta criada com sucesso! Bem-vindo!");
      navigate("/vilanova/membro", { replace: true });
    }
    setLoading(false);
  };

  const bg = "hsl(220 20% 4%)";
  const cardBg = "hsl(0 0% 100% / 0.03)";
  const borderColor = "hsl(0 0% 100% / 0.08)";
  const btnBg = "hsl(0 0% 95%)";
  const btnColor = "hsl(220 20% 7%)";

  return (
    <div className="min-h-screen w-full flex" style={{ background: bg, color: "hsl(0 0% 93%)", fontFamily: "'Montserrat', sans-serif" }}>
      {/* Left - Slider (desktop only) */}
      <div className="hidden lg:block lg:w-[50%] xl:w-[52%] relative overflow-hidden" style={{ minHeight: "100vh" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={slideIndex}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            <img src={slides[slideIndex].img} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, hsl(220 20% 4% / 0.7) 0%, hsl(220 20% 4% / 0.3) 50%, hsl(220 20% 4% / 0.8) 100%)" }} />
          </motion.div>
        </AnimatePresence>
        {/* Gradient fade right edge for seamless transition */}
        <div className="absolute inset-y-0 right-0 z-20 pointer-events-none" style={{ width: "120px", background: "linear-gradient(to right, transparent, hsl(220 20% 4%))" }} />

        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full">
          <a href="/vilanova" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: btnBg }}>
              <Scissors className="w-4 h-4" style={{ color: btnColor }} />
            </div>
            <span className="text-lg font-extrabold tracking-tight">Vila Nova</span>
          </a>

          <div>
            <AnimatePresence mode="wait">
              <motion.div key={slideIndex} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}>
                <h2 className="text-4xl xl:text-5xl font-black tracking-tight mb-3">{slides[slideIndex].title}</h2>
                <p className="text-base xl:text-lg" style={{ color: "hsl(0 0% 100% / 0.5)" }}>{slides[slideIndex].desc}</p>
              </motion.div>
            </AnimatePresence>
            <div className="flex gap-2 mt-8">
              {slides.map((_, i) => (
                <button key={i} onClick={() => setSlideIndex(i)} className="h-1 rounded-full transition-all duration-500"
                  style={{ background: i === slideIndex ? "hsl(0 0% 90%)" : "hsl(0 0% 100% / 0.15)", width: i === slideIndex ? 32 : 12 }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:pl-16 xl:pl-20">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <a href="/vilanova" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: btnBg }}>
                <Scissors className="w-4 h-4" style={{ color: btnColor }} />
              </div>
              <span className="text-lg font-extrabold tracking-tight">Vila Nova</span>
            </a>
          </div>

          <a href="/vilanova" className="inline-flex items-center gap-1.5 text-xs font-medium mb-8 transition-colors hover:text-white"
            style={{ color: "hsl(0 0% 50%)" }}>
            <ChevronLeft className="w-3.5 h-3.5" /> Voltar ao site
          </a>

          <motion.div key={mode} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
              {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
            </h1>
            <p className="text-sm mb-8" style={{ color: "hsl(0 0% 50%)" }}>
              {mode === "login" ? "Acesse sua área de membro." : "Cadastre-se para gerenciar seus agendamentos."}
            </p>

            <div className="space-y-4">
              {mode === "register" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold flex items-center gap-1.5 mb-2" style={{ color: "hsl(0 0% 65%)" }}>
                      <User className="w-3.5 h-3.5" /> Nome
                    </label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="João"
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-white/15"
                      style={{ background: cardBg, border: `1px solid ${borderColor}`, color: "hsl(0 0% 93%)" }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold flex items-center gap-1.5 mb-2" style={{ color: "hsl(0 0% 65%)" }}>
                      <User className="w-3.5 h-3.5" /> Sobrenome
                    </label>
                    <input type="text" value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="Silva"
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-white/15"
                      style={{ background: cardBg, border: `1px solid ${borderColor}`, color: "hsl(0 0% 93%)" }} />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold flex items-center gap-1.5 mb-2" style={{ color: "hsl(0 0% 65%)" }}>
                  <Phone className="w-3.5 h-3.5" /> WhatsApp
                </label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(27) 99999-9999"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-white/15"
                  style={{ background: cardBg, border: `1px solid ${borderColor}`, color: "hsl(0 0% 93%)" }} />
              </div>

              <div>
                <label className="text-xs font-semibold flex items-center gap-1.5 mb-2" style={{ color: "hsl(0 0% 65%)" }}>
                  <Lock className="w-3.5 h-3.5" /> Senha
                </label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                    className="w-full rounded-xl px-4 py-3 pr-12 text-sm outline-none transition-all focus:ring-2 focus:ring-white/15"
                    style={{ background: cardBg, border: `1px solid ${borderColor}`, color: "hsl(0 0% 93%)" }} />
                  <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors"
                    style={{ color: "hsl(0 0% 45%)" }}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button onClick={mode === "login" ? handleLogin : handleRegister} disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all hover:translate-y-[-1px] disabled:opacity-50 mt-2"
                style={{ background: btnBg, color: btnColor }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {loading ? "Processando..." : mode === "login" ? "Entrar" : "Criar Conta"}
              </button>
            </div>

            <p className="text-center text-xs mt-6" style={{ color: "hsl(0 0% 45%)" }}>
              {mode === "login" ? "Não tem conta? " : "Já tem conta? "}
              <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setPassword(""); }}
                className="font-semibold transition-colors hover:text-white" style={{ color: "hsl(0 0% 70%)" }}>
                {mode === "login" ? "Cadastre-se" : "Fazer login"}
              </button>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default MemberLogin;
