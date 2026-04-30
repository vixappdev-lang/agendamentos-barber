import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { MessageSquare, Save, Eye, Send, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type TemplateKey =
  | "confirmed_whatsapp_template"
  | "cancelled_whatsapp_template"
  | "completed_whatsapp_template"
  | "review_whatsapp_template"
  | "reminder_whatsapp_template";

interface TemplateDef {
  key: TemplateKey;
  label: string;
  description: string;
  defaultValue: string;
  vars: { name: string; description: string }[];
  enabledKey?: string;
}

const TEMPLATES: TemplateDef[] = [
  {
    key: "confirmed_whatsapp_template",
    label: "Agendamento Confirmado",
    description: "Enviado quando o admin confirma um agendamento.",
    defaultValue:
      "✅ Olá *{cliente}*! Seu agendamento na *{barbearia}* foi *CONFIRMADO*.\n\n📅 {data} às {hora}{barbeiro_linha}\n\nTe esperamos! 💈",
    vars: [
      { name: "{cliente}", description: "Nome do cliente" },
      { name: "{barbearia}", description: "Nome da barbearia" },
      { name: "{data}", description: "Data do agendamento" },
      { name: "{hora}", description: "Horário do agendamento" },
      { name: "{barbeiro_linha}", description: "Linha do barbeiro (vazio se não houver)" },
    ],
  },
  {
    key: "cancelled_whatsapp_template",
    label: "Agendamento Cancelado",
    description: "Enviado quando o admin cancela um agendamento.",
    defaultValue:
      "❌ Olá *{cliente}*, infelizmente seu agendamento na *{barbearia}* do dia {data} às {hora} foi *cancelado*.\n\nEntre em contato para reagendar.",
    vars: [
      { name: "{cliente}", description: "Nome do cliente" },
      { name: "{barbearia}", description: "Nome da barbearia" },
      { name: "{data}", description: "Data do agendamento" },
      { name: "{hora}", description: "Horário do agendamento" },
    ],
  },
  {
    key: "reminder_whatsapp_template",
    label: "Lembrete (24h antes)",
    description: "Enviado automaticamente todos os dias às 9h da manhã para clientes com agendamento no dia seguinte.",
    enabledKey: "reminder_send_enabled",
    defaultValue:
      "🔔 Olá *{cliente}*! Lembrando do seu agendamento amanhã na *{barbearia}*.\n\n📅 {data} às {hora}{barbeiro}\n\nTe esperamos! 💈",
    vars: [
      { name: "{cliente}", description: "Nome do cliente" },
      { name: "{barbearia}", description: "Nome da barbearia" },
      { name: "{data}", description: "Data do agendamento" },
      { name: "{hora}", description: "Horário do agendamento" },
      { name: "{barbeiro}", description: "Linha do barbeiro (vazio se não houver)" },
    ],
  },
  {
    key: "review_whatsapp_template",
    label: "Pedido de Avaliação",
    description: "Enviado quando o atendimento é concluído, com link para o cliente avaliar.",
    enabledKey: "review_send_enabled",
    defaultValue:
      "⭐ Olá *{cliente}*! Como foi seu atendimento na *{barbearia}*?\n\nDeixe sua avaliação: {link}\n\nSua opinião é muito importante 💈",
    vars: [
      { name: "{cliente}", description: "Nome do cliente" },
      { name: "{barbearia}", description: "Nome da barbearia" },
      { name: "{link}", description: "Link único de avaliação" },
    ],
  },
];

const SAMPLE_DATA: Record<string, string> = {
  "{cliente}": "João Silva",
  "{barbearia}": "Vila Nova Barber",
  "{data}": "15/05/2026",
  "{hora}": "14:30",
  "{barbeiro}": "\n💈 Barbeiro: Carlos",
  "{barbeiro_linha}": "\n💈 Barbeiro: Carlos",
  "{link}": "https://barbearia.com/avaliacao?token=abc123",
};

const renderPreview = (tmpl: string) => {
  let out = tmpl;
  Object.entries(SAMPLE_DATA).forEach(([k, v]) => {
    out = out.replaceAll(k, v);
  });
  return out;
};

// Renderiza WhatsApp markdown simples (*bold*, _italic_)
const formatWhatsApp = (text: string) => {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const parts: any[] = [];
    let remaining = line;
    let key = 0;
    const regex = /\*([^*]+)\*|_([^_]+)_/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) parts.push(<span key={key++}>{line.slice(lastIndex, match.index)}</span>);
      if (match[1]) parts.push(<strong key={key++}>{match[1]}</strong>);
      else if (match[2]) parts.push(<em key={key++}>{match[2]}</em>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < line.length) parts.push(<span key={key++}>{line.slice(lastIndex)}</span>);
    return (
      <div key={i} className="min-h-[1em]">
        {parts.length > 0 ? parts : <>&nbsp;</>}
      </div>
    );
  });
};

const WhatsAppTemplates = () => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TemplateKey>(TEMPLATES[0].key);
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [runningReminders, setRunningReminders] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const allKeys = TEMPLATES.flatMap((t) =>
      t.enabledKey ? [t.key, t.enabledKey] : [t.key]
    );
    const { data } = await supabase
      .from("business_settings")
      .select("key,value")
      .in("key", allKeys);
    const map: Record<string, string> = {};
    (data || []).forEach((row: any) => {
      map[row.key] = row.value || "";
    });
    const valuesNext: Record<string, string> = {};
    const enabledNext: Record<string, boolean> = {};
    TEMPLATES.forEach((t) => {
      valuesNext[t.key] = map[t.key] || t.defaultValue;
      if (t.enabledKey) {
        enabledNext[t.enabledKey] = map[t.enabledKey] !== "false";
      }
    });
    setValues(valuesNext);
    setEnabled(enabledNext);
    setLoading(false);
  };

  const upsertSetting = async (key: string, value: string) => {
    const { data: existing } = await supabase
      .from("business_settings")
      .select("id")
      .eq("key", key)
      .maybeSingle();
    if (existing) {
      await supabase.from("business_settings").update({ value }).eq("id", existing.id);
    } else {
      await supabase.from("business_settings").insert({ key, value });
    }
  };

  const saveTemplate = async (t: TemplateDef) => {
    setSaving(t.key);
    try {
      await upsertSetting(t.key, values[t.key] || "");
      if (t.enabledKey) {
        await upsertSetting(t.enabledKey, enabled[t.enabledKey] ? "true" : "false");
      }
      toast.success("Template salvo com sucesso");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e.message || ""));
    } finally {
      setSaving(null);
    }
  };

  const resetToDefault = (t: TemplateDef) => {
    setValues((v) => ({ ...v, [t.key]: t.defaultValue }));
    toast.info("Template restaurado ao padrão (clique em Salvar para aplicar)");
  };

  const insertVar = (key: TemplateKey, varName: string) => {
    setValues((v) => ({ ...v, [key]: (v[key] || "") + varName }));
  };

  const sendTestMessage = async (t: TemplateDef) => {
    if (!testPhone || testPhone.length < 10) {
      toast.error("Informe um telefone válido para teste (com DDD)");
      return;
    }
    setSendingTest(true);
    try {
      const message = renderPreview(values[t.key] || t.defaultValue);
      const { error } = await supabase.functions.invoke("chatpro", {
        body: { action: "send_message", phone: testPhone, message },
      });
      if (error) throw error;
      toast.success("Mensagem de teste enviada!");
    } catch (e: any) {
      toast.error("Erro ao enviar: " + (e.message || ""));
    } finally {
      setSendingTest(false);
    }
  };

  const runRemindersNow = async () => {
    setRunningReminders(true);
    try {
      const { data, error } = await supabase.functions.invoke("appointment-reminders", {
        body: {},
      });
      if (error) throw error;
      toast.success(`Lembretes processados: ${data?.sent ?? 0} enviados`);
    } catch (e: any) {
      toast.error("Erro: " + (e.message || ""));
    } finally {
      setRunningReminders(false);
    }
  };

  const current = TEMPLATES.find((t) => t.key === activeTab)!;

  if (loading) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Carregando templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" style={{ color: "hsl(140 60% 55%)" }} />
          <h2 className="text-lg font-bold text-foreground">Templates do WhatsApp</h2>
        </div>
        <button
          onClick={runRemindersNow}
          disabled={runningReminders}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40"
          style={{
            background: "hsl(40 70% 50% / 0.15)",
            color: "hsl(40 70% 60%)",
            border: "1px solid hsl(40 70% 50% / 0.3)",
          }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${runningReminders ? "animate-spin" : ""}`} />
          Disparar lembretes agora
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {TEMPLATES.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className="shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: activeTab === t.key ? "hsl(140 60% 50% / 0.15)" : "hsl(0 0% 100% / 0.04)",
              color: activeTab === t.key ? "hsl(140 60% 60%)" : "hsl(0 0% 50%)",
              border: `1px solid ${activeTab === t.key ? "hsl(140 60% 50% / 0.3)" : "hsl(0 0% 100% / 0.08)"}`,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        {/* Editor */}
        <div className="glass-card p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{current.label}</h3>
            <p className="text-xs text-muted-foreground mt-1">{current.description}</p>
          </div>

          {current.enabledKey && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled[current.enabledKey] ?? true}
                onChange={(e) =>
                  setEnabled((v) => ({ ...v, [current.enabledKey!]: e.target.checked }))
                }
                className="w-4 h-4 rounded accent-emerald-500"
              />
              <span className="text-xs text-foreground font-medium">Envio ativado</span>
            </label>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-muted-foreground">Mensagem</label>
              <button
                onClick={() => resetToDefault(current)}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Restaurar padrão
              </button>
            </div>
            <textarea
              value={values[current.key] || ""}
              onChange={(e) => setValues((v) => ({ ...v, [current.key]: e.target.value }))}
              rows={10}
              className="glass-input text-sm font-mono leading-relaxed w-full resize-y"
              placeholder="Sua mensagem..."
            />
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Use *texto* para <strong>negrito</strong>, _texto_ para <em>itálico</em>, e \n para
              quebra de linha (no editor basta apertar Enter).
            </p>
          </div>

          {/* Variables */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">
              Variáveis disponíveis (clique para inserir)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {current.vars.map((v) => (
                <button
                  key={v.name}
                  onClick={() => insertVar(current.key, v.name)}
                  title={v.description}
                  className="px-2 py-1 rounded-md text-[10px] font-mono transition-colors"
                  style={{
                    background: "hsl(245 60% 55% / 0.12)",
                    color: "hsl(245 60% 70%)",
                    border: "1px solid hsl(245 60% 55% / 0.25)",
                  }}
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>

          {/* Test send */}
          <div className="pt-3 border-t border-white/5 space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Enviar teste</label>
            <div className="flex gap-2">
              <input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="55119..."
                className="glass-input text-sm flex-1"
              />
              <button
                onClick={() => sendTestMessage(current)}
                disabled={sendingTest}
                className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40"
                style={{
                  background: "hsl(140 60% 50% / 0.15)",
                  color: "hsl(140 60% 60%)",
                  border: "1px solid hsl(140 60% 50% / 0.3)",
                }}
              >
                <Send className="w-3.5 h-3.5" />
                Enviar
              </button>
            </div>
          </div>

          <button
            onClick={() => saveTemplate(current)}
            disabled={saving === current.key}
            className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            style={{
              background: "hsl(245 60% 55%)",
              color: "white",
            }}
          >
            <Save className="w-4 h-4" />
            {saving === current.key ? "Salvando..." : "Salvar template"}
          </button>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Pré-visualização</h3>
          </div>

          {/* WhatsApp mockup */}
          <div
            className="rounded-2xl p-4 min-h-[400px]"
            style={{
              background: "#0b141a",
              backgroundImage:
                "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.02) 0, transparent 50%), radial-gradient(circle at 70% 80%, rgba(255,255,255,0.02) 0, transparent 50%)",
              border: "1px solid hsl(0 0% 100% / 0.08)",
            }}
          >
            <div className="flex justify-end">
              <div
                className="max-w-[85%] rounded-2xl rounded-tr-sm px-3 py-2 shadow"
                style={{ background: "#005c4b", color: "#e9edef" }}
              >
                <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {formatWhatsApp(renderPreview(values[current.key] || current.defaultValue))}
                </div>
                <div className="text-[10px] text-right mt-1 opacity-60">
                  {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ✓✓
                </div>
              </div>
            </div>
          </div>

          <div
            className="glass-card p-3 text-[10px] text-muted-foreground leading-relaxed"
          >
            💡 A pré-visualização usa dados de exemplo. As variáveis serão substituídas pelos dados reais
            do agendamento quando a mensagem for enviada.
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default WhatsAppTemplates;
