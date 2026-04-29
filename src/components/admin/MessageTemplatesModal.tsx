import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Sparkles } from "lucide-react";
import { TEMPLATES, type TemplateCategory } from "@/lib/messageTemplates";

interface Props {
  open: boolean;
  category: TemplateCategory | null;
  onOpenChange: (v: boolean) => void;
  onPick: (body: string) => void;
}

const TITLES: Record<TemplateCategory, string> = {
  msg_on_book: "Templates — Mensagem ao Agendar",
  msg_on_confirm: "Templates — Mensagem ao Confirmar",
  msg_reminder: "Templates — Mensagem de Lembrete",
  review_whatsapp_template: "Templates — Mensagem de Avaliação",
  cancellation_policy: "Templates — Política de Cancelamento",
  late_policy: "Templates — Política de Atraso",
};

export const MessageTemplatesModal = ({ open, category, onOpenChange, onPick }: Props) => {
  if (!category) return null;
  const items = TEMPLATES[category] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[85vh] overflow-hidden p-0 border-0 shadow-2xl"
        style={{
          background: "hsl(220 25% 7% / 0.98)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Header */}
        <DialogHeader
          className="px-6 pt-5 pb-4"
          style={{
            background: "linear-gradient(135deg, hsl(245 60% 55% / 0.12), hsl(280 60% 55% / 0.04))",
            borderBottom: "1px solid hsl(0 0% 100% / 0.06)",
          }}
        >
          <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "hsl(245 60% 55% / 0.18)" }}
            >
              <Sparkles className="w-4 h-4" style={{ color: "hsl(245 60% 75%)" }} />
            </div>
            <span className="text-foreground">{TITLES[category]}</span>
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground mt-1 ml-[42px]">
            Escolha um modelo profissional para começar rápido.
          </p>
        </DialogHeader>

        {/* Lista */}
        <div className="p-5 grid gap-2.5 max-h-[65vh] overflow-y-auto scrollbar-hide">
          {items.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                onPick(t.body);
                onOpenChange(false);
              }}
              className="text-left group rounded-xl p-4 transition-all hover:scale-[1.005]"
              style={{
                background: "hsl(0 0% 100% / 0.025)",
                border: "1px solid hsl(0 0% 100% / 0.05)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "hsl(245 60% 55% / 0.06)";
                e.currentTarget.style.borderColor = "hsl(245 60% 55% / 0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "hsl(0 0% 100% / 0.025)";
                e.currentTarget.style.borderColor = "hsl(0 0% 100% / 0.05)";
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-sm font-bold text-foreground">{t.label}</h4>
                <span
                  className="text-[10px] px-2 py-1 rounded-full inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity font-semibold"
                  style={{
                    background: "hsl(245 60% 55% / 0.18)",
                    color: "hsl(245 60% 80%)",
                  }}
                >
                  <Check className="w-3 h-3" /> Usar este
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2.5 leading-relaxed">{t.preview}</p>
              <pre
                className="text-[11px] text-foreground/80 leading-relaxed whitespace-pre-wrap font-sans rounded-lg p-3 max-h-[140px] overflow-y-auto scrollbar-hide"
                style={{
                  background: "hsl(220 25% 4% / 0.5)",
                  border: "1px solid hsl(0 0% 100% / 0.04)",
                }}
              >
                {t.body}
              </pre>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
