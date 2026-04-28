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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" />
            {TITLES[category]}
          </DialogTitle>
        </DialogHeader>

        <div className="p-5 grid gap-3">
          {items.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                onPick(t.body);
                onOpenChange(false);
              }}
              className="text-left group rounded-xl border border-border bg-card/40 hover:bg-card/70 hover:border-primary/40 transition-all p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-foreground">{t.label}</h4>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: "hsl(245 60% 55% / 0.12)",
                    color: "hsl(245 60% 70%)",
                  }}
                >
                  <Check className="w-3 h-3" /> Usar
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2">{t.preview}</p>
              <pre className="text-[11px] text-foreground/80 leading-relaxed whitespace-pre-wrap font-sans bg-background/40 rounded-lg p-3 border border-border/60 max-h-[160px] overflow-y-auto">
                {t.body}
              </pre>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
