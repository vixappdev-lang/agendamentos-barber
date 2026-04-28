import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Copy, Loader2, Link as LinkIcon, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const DEFAULT_TEMPLATE =
  "Olá {cliente}! 💈\n\nObrigado por escolher a *{barbearia}*!\n\nQue tal compartilhar como foi a sua experiência? Sua opinião é muito importante para nós ⭐\n\n👉 {link}";

export const ReviewSettingsModal = ({ open, onOpenChange }: Props) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [customDomain, setCustomDomain] = useState("");

  const baseDomain = customDomain.trim() || (typeof window !== "undefined" ? window.location.origin : "");
  const reviewUrl = `${baseDomain.replace(/\/$/, "")}/avaliacao`;

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("business_settings")
        .select("key, value")
        .in("key", ["reviews_enabled", "reviews_msg_template", "reviews_custom_domain"]);
      if (data) {
        const map: Record<string, string> = {};
        for (const r of data) map[r.key] = r.value || "";
        setEnabled(map.reviews_enabled !== "false");
        setTemplate(map.reviews_msg_template || DEFAULT_TEMPLATE);
        setCustomDomain(map.reviews_custom_domain || "");
      }
      setLoading(false);
    })();
  }, [open]);

  const save = async () => {
    setSaving(true);
    const upserts = [
      { key: "reviews_enabled", value: enabled ? "true" : "false" },
      { key: "reviews_msg_template", value: template },
      { key: "reviews_custom_domain", value: customDomain.trim() },
    ];
    await Promise.all(
      upserts.map((u) =>
        supabase.from("business_settings").upsert(u, { onConflict: "key" }),
      ),
    );
    setSaving(false);
    toast.success("Configurações de avaliação salvas");
    onOpenChange(false);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(reviewUrl);
    toast.success("Link copiado!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações de Avaliação</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Ativar */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/40">
              <div>
                <p className="text-sm font-semibold">Sistema de avaliações</p>
                <p className="text-xs text-muted-foreground">
                  Quando ativo, ao concluir um agendamento o cliente recebe o link no WhatsApp.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            {/* Domínio + Link */}
            <div>
              <Label className="text-xs flex items-center gap-1.5">
                <LinkIcon className="w-3 h-3" /> Domínio público da hospedagem (opcional)
              </Label>
              <Input
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder={typeof window !== "undefined" ? window.location.origin : "https://suabarbearia.com"}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Deixe em branco para detectar automaticamente o domínio atual.
              </p>
            </div>

            <div>
              <Label className="text-xs">Link público de avaliação</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input value={reviewUrl} readOnly className="flex-1 font-mono text-xs" />
                <Button type="button" variant="outline" size="sm" onClick={copyLink}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Mensagem */}
            <div>
              <Label className="text-xs flex items-center gap-1.5">
                <MessageCircle className="w-3 h-3" /> Mensagem do WhatsApp pós-corte
              </Label>
              <Textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                rows={7}
                className="mt-1 font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                Variáveis disponíveis:{" "}
                <code className="px-1 py-0.5 rounded bg-muted text-foreground">{"{cliente}"}</code>{" "}
                <code className="px-1 py-0.5 rounded bg-muted text-foreground">{"{barbearia}"}</code>{" "}
                <code className="px-1 py-0.5 rounded bg-muted text-foreground">{"{link}"}</code>
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
