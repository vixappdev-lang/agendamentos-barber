import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, Database, FileCode, Palette, Globe, ArrowRight, CheckCircle2, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onComplete: () => void;
  adminName?: string | null;
}

const steps = [
  { icon: Database, title: "Banco MySQL conectado", desc: "Configure o MySQL do seu perfil em Perfis Barbearias.", href: "/admin/barbershops" },
  { icon: FileCode, title: "Schema importado", desc: "Importe o SQL inicial para criar as tabelas necessárias.", href: "/admin/barbershops" },
  { icon: Palette, title: "Personalize seu site", desc: "Defina cores, logo, hero, sobre e SEO em Configurações → Personalização.", href: "/admin/settings" },
  { icon: Globe, title: "Publique seu site", desc: "Escolha o modo (Site Completo ou Agendamento Direto) e ative.", href: "/admin/settings" },
];

const WelcomeSetupModal = ({ open, onComplete, adminName }: Props) => {
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  // Bloqueia scroll do body
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  const markCompleted = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("business_settings")
      .upsert({ key: "welcome_completed", value: "true" }, { onConflict: "key" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tudo pronto! Bem-vindo(a) ao painel ✨");
    onComplete();
  };

  const goAndDismiss = async (href: string) => {
    await markCompleted();
    navigate(href);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "hsl(220 25% 4% / 0.85)", backdropFilter: "blur(8px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0 }}
            className="w-full max-w-xl rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-border" style={{ background: "linear-gradient(135deg, hsl(245 60% 55% / 0.15), hsl(280 60% 55% / 0.08))" }}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: "hsl(245 60% 55% / 0.2)", border: "1px solid hsl(245 60% 55% / 0.35)" }}>
                  <Sparkles className="w-5 h-5" style={{ color: "hsl(245 60% 75%)" }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Bem-vindo{adminName ? `, ${adminName}` : ""}! 👋</h2>
                  <p className="text-xs text-muted-foreground">Vamos configurar seu site em poucos passos.</p>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="p-6 space-y-3">
              {steps.map((s, i) => (
                <button
                  key={i}
                  onClick={() => goAndDismiss(s.href)}
                  disabled={saving}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all hover:bg-muted/40 disabled:opacity-50"
                  style={{ background: "hsl(0 0% 100% / 0.025)", border: "1px solid hsl(0 0% 100% / 0.06)" }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "hsl(245 60% 55% / 0.12)", color: "hsl(245 60% 75%)" }}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{i + 1}. {s.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">{s.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "hsl(140 60% 55%)" }} />
                Você pode revisitar depois em Configurações.
              </p>
              <button
                onClick={markCompleted}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{ background: "hsl(245 60% 55%)", color: "white" }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Entendi, vamos lá
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeSetupModal;
