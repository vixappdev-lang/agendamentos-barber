/**
 * HelpModal — botão "Como funciona?" reutilizável no canto superior direito
 * de cada módulo. Abre um modal seguindo o design system do admin
 * (glassmorphism, dark, mesma respiração).
 */
import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X, Check } from "lucide-react";

export interface HelpStep {
  title: string;
  description: string;
}

export interface HelpModalProps {
  title: string;
  intro: string;
  steps: HelpStep[];
  tips?: string[];
}

export const HelpButton = ({ title, intro, steps, tips }: HelpModalProps) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors hover:bg-white/[0.06]"
        style={{
          background: "hsl(0 0% 100% / 0.03)",
          color: "hsl(0 0% 75%)",
          border: "1px solid hsl(0 0% 100% / 0.08)",
        }}
        aria-label="Como funciona"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        Como funciona
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 max-h-[85vh] overflow-y-auto scrollbar-hidden"
              style={{
                background: "hsl(230 18% 9%)",
                border: "1px solid hsl(0 0% 100% / 0.08)",
                boxShadow: "0 30px 80px -20px hsl(0 0% 0% / 0.6)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <div
                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl mb-2"
                    style={{
                      background: "hsl(245 60% 55% / 0.15)",
                      border: "1px solid hsl(245 60% 55% / 0.25)",
                    }}
                  >
                    <HelpCircle className="w-4 h-4" style={{ color: "hsl(245 60% 75%)" }} />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{intro}</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ol className="space-y-2.5 mt-4">
                {steps.map((s, i) => (
                  <li
                    key={i}
                    className="flex gap-3 p-3 rounded-xl"
                    style={{
                      background: "hsl(0 0% 100% / 0.025)",
                      border: "1px solid hsl(0 0% 100% / 0.05)",
                    }}
                  >
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{
                        background: "hsl(245 60% 55% / 0.18)",
                        color: "hsl(245 60% 80%)",
                      }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">{s.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        {s.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              {tips && tips.length > 0 && (
                <div className="mt-4 p-3 rounded-xl" style={{ background: "hsl(145 70% 50% / 0.08)", border: "1px solid hsl(145 70% 50% / 0.18)" }}>
                  <p className="text-[10.5px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "hsl(145 70% 70%)" }}>
                    Dicas
                  </p>
                  <ul className="space-y-1">
                    {tips.map((t, i) => (
                      <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                        <Check className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "hsl(145 70% 70%)" }} />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/**
 * Header padrão de página de módulo: título + descrição + botão Como funciona.
 * Usa-se no topo de Cashier, Commands, Credit, Inventory, Suppliers, Commissions.
 */
export const ModuleHeader = ({
  title,
  description,
  help,
  actions,
}: {
  title: string;
  description?: string;
  help: HelpModalProps;
  actions?: ReactNode;
}) => (
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div className="min-w-0">
      <h1 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h1>
      {description && <p className="text-xs sm:text-sm text-muted-foreground mt-1">{description}</p>}
    </div>
    <div className="flex items-center gap-2 flex-shrink-0">
      {actions}
      <HelpButton {...help} />
    </div>
  </div>
);
