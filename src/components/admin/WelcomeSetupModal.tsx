import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, Database, FileCode, Palette, Type, Clock, MessageSquare, Globe,
  ArrowRight, ArrowLeft, CheckCircle2, Clock3,
} from "lucide-react";
import { useSetupProgress } from "@/hooks/useSetupProgress";

interface Props {
  open: boolean;
  onClose: () => void;
  adminName?: string | null;
}

type Slide = {
  icon: typeof Sparkles;
  title: string;
  body: React.ReactNode;
  href?: string;
  cta?: string;
};

const WelcomeSetupModal = ({ open, onClose, adminName }: Props) => {
  const navigate = useNavigate();
  const { steps, completedCount, totalCount, markWelcomeSeen } = useSetupProgress(
    adminName ? `${adminName}@gmail.com` : null,
  );
  const [index, setIndex] = useState(0);

  // Bloqueia scroll
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Reset ao abrir
  useEffect(() => { if (open) setIndex(0); }, [open]);

  // Mapa de ícones por step id
  const ICON_MAP: Record<string, typeof Sparkles> = {
    mysql: Database, schema: FileCode, branding: Palette,
    site_content: Type, hours: Clock, messages: MessageSquare, publish: Globe,
  };

  const stepSlides: Slide[] = steps.map((s, i) => ({
    icon: ICON_MAP[s.id] || Sparkles,
    title: `${i + 1}. ${s.title}`,
    body: <p className="text-sm text-muted-foreground text-center">{s.desc}</p>,
    href: s.href,
    cta: s.id === "publish" ? "Publicar agora" : "Ir agora",
  }));

  const slides: Slide[] = [
    {
      icon: Sparkles,
      title: `Bem-vindo${adminName ? `, ${adminName}` : ""}! 👋`,
      body: (
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Vamos configurar seu site e painel em <strong className="text-foreground">{stepSlides.length} passos rápidos</strong>.
            Você pode pular agora e voltar depois pelo banner no topo.
          </p>
          <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground pt-2">
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "hsl(140 60% 55%)" }} />
            Progresso salvo automaticamente
          </div>
        </div>
      ),
    },
    ...stepSlides,
  ];

  const current = slides[index];
  const isFirst = index === 0;
  const isLast = index === slides.length - 1;

  const handleSkip = async () => { await markWelcomeSeen(); onClose(); };
  const handleNext = () => { if (!isLast) setIndex(index + 1); else handleSkip(); };
  const handlePrev = () => { if (!isFirst) setIndex(index - 1); };
  const handleAction = async () => {
    if (current.href) { await markWelcomeSeen(); onClose(); navigate(current.href); }
    else handleNext();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "hsl(220 25% 4% / 0.85)", backdropFilter: "blur(8px)" }}
        >
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0 }}
            className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: "hsl(220 25% 7% / 0.98)", border: "1px solid hsl(0 0% 100% / 0.08)", backdropFilter: "blur(20px)" }}
          >
            {/* Progress dots */}
            <div className="px-6 pt-5 pb-3 flex items-center gap-1.5">
              {slides.map((_, i) => (
                <div key={i} className="h-1 flex-1 rounded-full transition-all"
                  style={{ background: i <= index ? "hsl(245 60% 60%)" : "hsl(0 0% 100% / 0.06)" }} />
              ))}
            </div>

            {/* Slide */}
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="px-6 py-6"
              >
                <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-2xl mb-4"
                  style={{ background: "linear-gradient(135deg, hsl(245 60% 55% / 0.2), hsl(280 60% 55% / 0.1))", border: "1px solid hsl(245 60% 55% / 0.3)" }}>
                  <current.icon className="w-6 h-6" style={{ color: "hsl(245 60% 75%)" }} />
                </div>
                <h2 className="text-lg font-bold text-center text-foreground mb-3">{current.title}</h2>
                <div className="min-h-[80px] flex items-center justify-center px-2">{current.body}</div>
              </motion.div>
            </AnimatePresence>

            {/* Footer */}
            <div className="px-6 py-4 flex items-center justify-between gap-3" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.06)", background: "hsl(0 0% 100% / 0.02)" }}>
              <button
                onClick={isFirst ? handleSkip : handlePrev}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition"
              >
                {isFirst ? <><Clock3 className="w-3.5 h-3.5" /> Fazer depois</> : <><ArrowLeft className="w-3.5 h-3.5" /> Voltar</>}
              </button>

              <div className="flex items-center gap-2">
                {current.href && !isFirst && (
                  <button
                    onClick={handleAction}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition"
                    style={{ background: "hsl(245 60% 55%)", color: "white" }}
                  >
                    {current.cta || "Ir agora"} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition"
                  style={
                    current.href && !isFirst
                      ? { background: "hsl(0 0% 100% / 0.05)", color: "hsl(0 0% 80%)", border: "1px solid hsl(0 0% 100% / 0.08)" }
                      : { background: "hsl(245 60% 55%)", color: "white" }
                  }
                >
                  {isLast ? "Concluir" : "Próximo"} {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Mini progress info */}
            <div className="px-6 pb-3 text-center">
              <p className="text-[10px] text-muted-foreground">
                {completedCount}/{totalCount} configurações concluídas
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeSetupModal;
