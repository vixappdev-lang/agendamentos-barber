import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail, Scissors } from "lucide-react";
import { toast } from "sonner";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error("Credenciais inválidas");
      setLoading(false);
      return;
    }

    // Check admin role
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'hsl(230 20% 5%)' }}>
      
      {/* Animated background orb */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsl(245 80% 55% / 0.4), hsl(200 80% 50% / 0.2), transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -20, 30, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        initial={{ left: '5%', top: '20%' }}
      />

      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full opacity-20 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsl(280 70% 55% / 0.3), transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{
          x: [0, -20, 30, 0],
          y: [0, 30, -20, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        initial={{ right: '10%', bottom: '20%' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-5xl grid md:grid-cols-2 gap-0 glass-card-strong overflow-hidden relative z-10"
      >
        {/* Left - Branding */}
        <div className="hidden md:flex flex-col justify-center p-10 lg:p-14 relative overflow-hidden"
          style={{ background: 'hsl(0 0% 100% / 0.02)' }}>
          
          <div className="absolute inset-0 pointer-events-none">
            <motion.div
              className="absolute w-80 h-80 rounded-full"
              style={{
                background: 'radial-gradient(circle, hsl(245 80% 55% / 0.15), transparent 60%)',
                filter: 'blur(40px)',
                left: '-20%',
                top: '30%',
              }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="relative z-10"
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'hsl(245 60% 55% / 0.15)', border: '1px solid hsl(245 60% 55% / 0.3)' }}>
                <Scissors className="w-5 h-5" style={{ color: 'hsl(245 60% 70%)' }} />
              </div>
              <span className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: 'hsl(245 60% 70%)' }}>
                PAINEL ADMIN
              </span>
            </div>

            <h1 className="text-3xl lg:text-4xl font-extrabold text-foreground leading-tight mb-3">
              Gerencie sua{" "}
              <span style={{ color: 'hsl(245 60% 65%)' }}>Barbearia.</span>
            </h1>

            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              Controle total dos seus serviços, agendamentos, cupons e métricas — tudo em um só lugar.
            </p>
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
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'hsl(245 60% 55% / 0.15)', border: '1px solid hsl(245 60% 55% / 0.3)' }}>
                <Scissors className="w-5 h-5" style={{ color: 'hsl(245 60% 70%)' }} />
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Acesse sua conta</h2>
            <p className="text-muted-foreground text-sm mb-8">Bem-vindo de volta. Digite seus dados para entrar.</p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="glass-input pl-11"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="glass-input pl-11"
                    required
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, hsl(245 60% 50%), hsl(265 60% 55%))',
                  color: 'white',
                  boxShadow: '0 4px 20px hsl(245 60% 55% / 0.3)',
                }}
                whileHover={{ scale: 1.01, boxShadow: '0 8px 30px hsl(245 60% 55% / 0.4)' }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? "Entrando..." : "ENTRAR"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </motion.button>
            </form>

            <p className="text-center text-xs text-muted-foreground mt-6">
              Dificuldades no acesso? Contatar o suporte
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
