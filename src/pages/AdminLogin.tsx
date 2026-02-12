import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail, Scissors, Sparkles } from "lucide-react";
import { toast } from "sonner";

const floatingOrbs = [
  { size: 500, x: ["0%", "3%", "-2%", "0%"], y: ["0%", "-2%", "3%", "0%"], duration: 8, color: "hsl(245 80% 55% / 0.25)", blur: 80, left: "5%", top: "15%" },
  { size: 350, x: ["0%", "-3%", "4%", "0%"], y: ["0%", "4%", "-2%", "0%"], duration: 12, color: "hsl(280 70% 50% / 0.15)", blur: 60, right: "5%", bottom: "15%" },
  { size: 200, x: ["0%", "5%", "-3%", "0%"], y: ["0%", "-4%", "2%", "0%"], duration: 10, color: "hsl(200 80% 50% / 0.12)", blur: 50, left: "40%", top: "60%" },
];

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error("Credenciais inválidas");
      setLoading(false);
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      toast.error("Acesso negado. Você não é administrador.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    toast.success("Bem-vindo ao painel!");
    navigate("/admin");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'hsl(230 20% 5%)' }}>
      {/* Animated floating orbs */}
      {floatingOrbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
            filter: `blur(${orb.blur}px)`,
            left: orb.left,
            right: (orb as any).right,
            top: orb.top,
            bottom: (orb as any).bottom,
          }}
          animate={{ x: orb.x, y: orb.y, scale: [1, 1.1, 0.95, 1] }}
          transition={{ duration: orb.duration, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Animated grid lines */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `
          linear-gradient(hsl(245 60% 55% / 0.03) 1px, transparent 1px),
          linear-gradient(90deg, hsl(245 60% 55% / 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute w-1 h-1 rounded-full pointer-events-none"
          style={{ background: 'hsl(245 60% 70% / 0.4)', left: `${15 + i * 14}%`, top: `${20 + (i % 3) * 25}%` }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.7 }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-5xl grid md:grid-cols-2 gap-0 glass-card-strong overflow-hidden relative z-10"
      >
        {/* Left - Branding */}
        <div className="hidden md:flex flex-col justify-center p-10 lg:p-14 relative overflow-hidden" style={{ background: 'hsl(0 0% 100% / 0.02)' }}>
          {/* Animated accent glow */}
          <motion.div
            className="absolute w-80 h-80 rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(245 80% 55% / 0.15), transparent 60%)',
              filter: 'blur(40px)', left: '-20%', top: '30%',
            }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 5, repeat: Infinity }}
          />

          {/* Rotating ring */}
          <motion.div
            className="absolute"
            style={{ right: '10%', top: '15%' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-20 h-20 rounded-full" style={{ border: '1px solid hsl(245 60% 55% / 0.15)' }} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="relative z-10"
          >
            <motion.div
              className="flex items-center gap-2 mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <motion.div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'hsl(245 60% 55% / 0.15)', border: '1px solid hsl(245 60% 55% / 0.3)' }}
                animate={{ boxShadow: ['0 0 0px hsl(245 60% 55% / 0)', '0 0 20px hsl(245 60% 55% / 0.3)', '0 0 0px hsl(245 60% 55% / 0)'] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Scissors className="w-6 h-6" style={{ color: 'hsl(245 60% 70%)' }} />
              </motion.div>
              <span className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: 'hsl(245 60% 70%)' }}>
                PAINEL ADMIN
              </span>
            </motion.div>

            <motion.h1
              className="text-3xl lg:text-4xl font-extrabold text-foreground leading-tight mb-3"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              Gerencie sua{" "}
              <motion.span
                style={{ color: 'hsl(245 60% 65%)' }}
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Barbearia.
              </motion.span>
            </motion.h1>

            <motion.p
              className="text-muted-foreground text-sm leading-relaxed max-w-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Controle total dos seus serviços, agendamentos, cupons e métricas — tudo em um só lugar.
            </motion.p>

            {/* Feature pills */}
            <motion.div
              className="flex flex-wrap gap-2 mt-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              {["Dashboard", "Serviços", "Agendamentos", "Cupons"].map((item, i) => (
                <motion.span
                  key={item}
                  className="glass-chip px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground rounded-lg"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                >
                  {item}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Right - Form */}
        <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-14">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {/* Mobile logo */}
            <div className="md:hidden flex items-center gap-2 mb-8">
              <motion.div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'hsl(245 60% 55% / 0.15)', border: '1px solid hsl(245 60% 55% / 0.3)' }}
                animate={{ boxShadow: ['0 0 0px hsl(245 60% 55% / 0)', '0 0 15px hsl(245 60% 55% / 0.3)', '0 0 0px hsl(245 60% 55% / 0)'] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Scissors className="w-5 h-5" style={{ color: 'hsl(245 60% 70%)' }} />
              </motion.div>
              <span className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: 'hsl(245 60% 70%)' }}>
                ADMIN
              </span>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">Acesse sua conta</h2>
                <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }}>
                  <Sparkles className="w-5 h-5" style={{ color: 'hsl(245 60% 65%)' }} />
                </motion.div>
              </div>
              <p className="text-muted-foreground text-sm mb-8">Bem-vindo de volta. Digite seus dados para entrar.</p>
            </motion.div>

            <form onSubmit={handleLogin} className="space-y-5">
              <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 }}>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">E-mail</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-[hsl(245_60%_65%)]" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="glass-input pl-11" required />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Senha</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-[hsl(245_60%_65%)]" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="glass-input pl-11" required />
                </div>
              </motion.div>

              <motion.button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, hsl(245 60% 50%), hsl(265 60% 55%))',
                  color: 'white',
                  boxShadow: '0 4px 20px hsl(245 60% 55% / 0.3)',
                }}
                whileHover={{ scale: 1.01, boxShadow: '0 8px 30px hsl(245 60% 55% / 0.4)' }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
              >
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.1), transparent)' }}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
                />
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? (
                    <>
                      <motion.div
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      />
                      Entrando...
                    </>
                  ) : (
                    <>
                      ENTRAR <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </span>
              </motion.button>
            </form>

            <motion.p
              className="text-center text-xs text-muted-foreground mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              Dificuldades no acesso? Contatar o suporte
            </motion.p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
