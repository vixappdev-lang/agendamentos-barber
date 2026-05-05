import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail, Scissors, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useThemeColors } from "@/hooks/useThemeColors";
import { clearAdminMysqlSession, setAdminMysqlSession } from "@/lib/adminMysqlSession";
import { clearPanelUserSession, setPanelUserSession } from "@/hooks/usePanelSession";

const AdminLogin = () => {
  const t = useThemeColors();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    clearAdminMysqlSession();
    clearPanelUserSession();

    // 1. Tenta login multi-perfil (panel_users) — admin/manager/barber
    try {
      const { data: panelRows, error: panelErr } = await (supabase as any)
        .rpc("verify_panel_login", { _email: email, _plain: password });
      if (!panelErr && Array.isArray(panelRows) && panelRows.length > 0) {
        const u = panelRows[0];
        let barberName: string | null = null;
        if (u.barber_id) {
          const { data: b } = await supabase.from("barbers").select("name").eq("id", u.barber_id).maybeSingle();
          barberName = b?.name || null;
        }
        setPanelUserSession({
          id: u.id, email: u.email, full_name: u.full_name,
          role: (u.role as any) || "manager",
          barber_id: u.barber_id, barber_name: barberName,
          permissions: u.permissions || {},
          source: "panel_users",
        });
        await supabase.auth.signOut();
        toast.success(`Bem-vindo, ${u.full_name}!`);
        navigate("/admin");
        setLoading(false);
        return;
      }
    } catch (_) { /* segue para próximos métodos */ }

    const { data: mysqlLogin } = await supabase.functions.invoke("mysql-proxy", {
      body: { action: "login", email, password },
    });

    if (mysqlLogin?.success && mysqlLogin.data?.token) {
      setAdminMysqlSession(mysqlLogin.data);
      await supabase.auth.signOut();
      toast.success("Bem-vindo ao painel Genesis!");
      navigate("/admin");
      setLoading(false);
      return;
    }

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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: t.pageBg }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-5xl grid md:grid-cols-2 gap-0 glass-card-strong overflow-hidden relative z-10"
      >
        {/* Left - Branding */}
        <div className="hidden md:flex flex-col justify-center p-10 lg:p-14 relative overflow-hidden" style={{ background: t.cardBgSubtle }}>
          <div className="absolute w-80 h-80 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, hsl(245 60% 55% / 0.06), transparent 70%)', filter: 'blur(40px)', left: '-20%', top: '30%' }} />


          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: t.accentPurpleBg, border: `1px solid ${t.accentPurpleBorder}` }}>
                <Scissors className="w-6 h-6" style={{ color: t.accentPurpleLight }} />
              </div>
              <span className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: t.accentPurpleLight }}>PAINEL ADMIN</span>
            </div>

            <motion.h1 className="text-3xl lg:text-4xl font-extrabold text-foreground leading-tight mb-3"
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              Gerencie sua{" "}
              <span style={{ color: t.accentPurple }}>Barbearia.</span>
            </motion.h1>

            <motion.p className="text-muted-foreground text-sm leading-relaxed max-w-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              Controle total dos seus serviços, agendamentos, cupons e métricas — tudo em um só lugar.
            </motion.p>

            <motion.div className="flex flex-wrap gap-2 mt-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              {["Dashboard", "Serviços", "Agendamentos", "Cupons"].map((item, i) => (
                <motion.span key={item} className="glass-chip px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground rounded-lg"
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8 + i * 0.1 }}>
                  {item}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Right - Form */}
        <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-14">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
            <div className="md:hidden flex items-center gap-2 mb-8">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: t.accentPurpleBg, border: `1px solid ${t.accentPurpleBorder}` }}>
                <Scissors className="w-5 h-5" style={{ color: t.accentPurpleLight }} />
              </div>
              <span className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: t.accentPurpleLight }}>ADMIN</span>
            </div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">Acesse sua conta</h2>
                <Sparkles className="w-5 h-5" style={{ color: t.accentPurple }} />
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

              <motion.button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
                style={{ background: 'hsl(245 55% 50%)', color: 'white' }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
                <span className="flex items-center gap-2">
                  {loading ? (
                    <>
                      <motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                      Entrando...
                    </>
                  ) : (
                    <>ENTRAR <ArrowRight className="w-4 h-4" /></>
                  )}
                </span>
              </motion.button>
            </form>

            <motion.p className="text-center text-xs text-muted-foreground mt-6"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
              Dificuldades no acesso? Contatar o suporte
            </motion.p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
