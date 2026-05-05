import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Save, Wifi, WifiOff, QrCode, RefreshCw, Trash2, CheckCircle,
  AlertCircle, Loader2, Send, Server, ExternalLink, Eye, EyeOff,
} from "lucide-react";
import { toast } from "sonner";

type Status = "disconnected" | "qr" | "connecting" | "connected" | "not_configured" | "error";

const STATUS_META: Record<Status, { label: string; color: string; icon: any }> = {
  not_configured: { label: "Não configurado", color: "hsl(0 0% 45%)", icon: WifiOff },
  connecting: { label: "Conectando...", color: "hsl(45 80% 55%)", icon: Loader2 },
  qr: { label: "Aguardando QR Code", color: "hsl(45 80% 55%)", icon: QrCode },
  connected: { label: "Conectado", color: "hsl(140 60% 50%)", icon: CheckCircle },
  disconnected: { label: "Desconectado", color: "hsl(0 60% 55%)", icon: WifiOff },
  error: { label: "Erro", color: "hsl(0 60% 55%)", icon: AlertCircle },
};

const RenderConfig = () => {
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>("not_configured");
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testMsg, setTestMsg] = useState("🧪 Teste do servidor Render funcionando!");
  const [configured, setConfigured] = useState(false);

  const call = useCallback(async (action: string, body?: any) => {
    const res = await supabase.functions.invoke("render-whatsapp", {
      body: { action, ...body },
    });
    if (res.error) {
      toast.error(res.error.message || "Erro de comunicação");
      return null;
    }
    return res.data;
  }, []);

  const loadConfig = useCallback(async () => {
    const data = await call("get_config");
    if (data?.config) {
      setUrl(data.config.url || "");
      setSecret(data.config.shared_secret || "");
      setEnabled(data.config.enabled !== false);
      setConfigured(true);
      checkStatus();
    }
  }, [call]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const checkStatus = async () => {
    setLoading("status");
    const data = await call("status");
    setLoading(null);
    if (data?.data?.status) setStatus(data.data.status as Status);
    else if (data?.error) setStatus("error");
  };

  const fetchQR = async () => {
    setLoading("qr");
    const data = await call("qr");
    setLoading(null);
    if (data?.data?.qr) {
      setQr(data.data.qr);
      setStatus("qr");
    } else if (data?.data?.status === "connected") {
      setStatus("connected");
      setQr(null);
      toast.success("WhatsApp já está conectado!");
    } else {
      toast.info("QR ainda não disponível. Tente novamente em alguns segundos.");
    }
  };

  const save = async () => {
    if (!url.trim() || !secret.trim()) {
      toast.error("Preencha URL e segredo compartilhado");
      return;
    }
    if (secret.includes("••")) {
      toast.error("Cole o segredo completo (não o mascarado)");
      return;
    }
    setSaving(true);
    const data = await call("save_config", { config: { url, shared_secret: secret, enabled } });
    setSaving(false);
    if (data?.success) {
      toast.success("Configuração salva");
      setConfigured(true);
      setTimeout(() => { loadConfig(); checkStatus(); }, 500);
    }
  };

  const logout = async () => {
    if (!confirm("Desconectar WhatsApp do servidor?")) return;
    setLoading("logout");
    await call("logout");
    setLoading(null);
    setStatus("disconnected");
    setQr(null);
    toast.success("Desconectado. Aguarde para escanear novo QR.");
    setTimeout(checkStatus, 3000);
  };

  const restart = async () => {
    setLoading("restart");
    await call("restart");
    setLoading(null);
    toast.info("Servidor reiniciando...");
    setTimeout(checkStatus, 3000);
  };

  const sendTest = async () => {
    if (!testPhone || testPhone.replace(/\D/g, "").length < 10) {
      toast.error("Telefone inválido");
      return;
    }
    setLoading("send");
    const data = await call("send_message", { phone: testPhone, message: testMsg });
    setLoading(null);
    if (data?.success) toast.success("Mensagem enviada!");
    else toast.error("Falha: " + (data?.reason || data?.data?.error || "erro"));
  };

  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className="glass-card p-4 flex items-center justify-between flex-wrap gap-3"
        style={{ background: "hsl(245 60% 55% / 0.04)", border: "1px solid hsl(245 60% 55% / 0.15)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "hsl(245 60% 55% / 0.15)" }}
          >
            <Server className="w-5 h-5" style={{ color: "hsl(245 60% 70%)" }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Render.com (Baileys)</h3>
            <p className="text-[11px] text-muted-foreground">
              WhatsApp 24/7 grátis em servidor próprio (Free Tier)
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: `${meta.color} / 0.12)`, color: meta.color, border: `1px solid ${meta.color}` }}
        >
          <Icon className={`w-3.5 h-3.5 ${status === "connecting" ? "animate-spin" : ""}`} />
          {meta.label}
        </div>
      </div>

      {/* Setup guide if not configured */}
      {!configured && (
        <div className="glass-card p-5 space-y-3" style={{ background: "hsl(40 70% 50% / 0.05)", border: "1px solid hsl(40 70% 50% / 0.2)" }}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" style={{ color: "hsl(40 80% 60%)" }} />
            <h4 className="text-sm font-bold text-foreground">Setup necessário (10 min)</h4>
          </div>
          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal pl-5">
            <li>Pegue a pasta <code className="px-1 py-0.5 rounded bg-white/5 text-foreground">render-deploy/</code> deste projeto e suba num repositório novo no GitHub.</li>
            <li>Em <a href="https://render.com" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-1">render.com <ExternalLink className="w-3 h-3" /></a> → New Web Service → conecte o repositório.</li>
            <li>Configure as 3 variáveis: <code className="px-1 rounded bg-white/5">SHARED_SECRET</code>, <code className="px-1 rounded bg-white/5">SUPABASE_URL</code>, <code className="px-1 rounded bg-white/5">SUPABASE_SERVICE_KEY</code>.</li>
            <li>Após o deploy, copie a URL gerada e o SHARED_SECRET, cole abaixo e salve.</li>
            <li>Configure ping a cada 10min em <a href="https://cron-job.org" target="_blank" rel="noreferrer" className="text-primary underline">cron-job.org</a> para o endpoint <code className="px-1 rounded bg-white/5">/health</code> (free tier dorme após 15min).</li>
          </ol>
          <p className="text-[10px] text-muted-foreground">📖 Passo-a-passo completo no arquivo <code>render-deploy/README.md</code>.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Config */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-bold text-foreground">Conexão</h3>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              URL do servidor Render
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://meu-app.onrender.com"
              className="glass-input text-sm w-full"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              SHARED_SECRET
            </label>
            <div className="relative">
              <input
                type={showSecret ? "text" : "password"}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="senha forte definida no Render"
                className="glass-input text-sm w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 rounded accent-emerald-500"
            />
            <span className="text-xs text-foreground font-medium">Provedor ativado</span>
          </label>

          <button
            onClick={save}
            disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            style={{ background: "hsl(245 60% 55%)", color: "white" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar configuração
          </button>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
            <button
              onClick={checkStatus}
              disabled={!configured || loading === "status"}
              className="py-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all disabled:opacity-40"
              style={{ background: "hsl(0 0% 100% / 0.05)", border: "1px solid hsl(0 0% 100% / 0.08)", color: "hsl(0 0% 80%)" }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading === "status" ? "animate-spin" : ""}`} />
              Status
            </button>
            <button
              onClick={restart}
              disabled={!configured || loading === "restart"}
              className="py-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all disabled:opacity-40"
              style={{ background: "hsl(40 70% 50% / 0.1)", border: "1px solid hsl(40 70% 50% / 0.2)", color: "hsl(40 70% 60%)" }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading === "restart" ? "animate-spin" : ""}`} />
              Restart
            </button>
            <button
              onClick={logout}
              disabled={!configured || loading === "logout"}
              className="py-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all disabled:opacity-40"
              style={{ background: "hsl(0 60% 55% / 0.1)", border: "1px solid hsl(0 60% 55% / 0.2)", color: "hsl(0 60% 65%)" }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>

        {/* QR + Test */}
        <div className="space-y-4">
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">QR Code</h3>
              <button
                onClick={fetchQR}
                disabled={!configured || loading === "qr"}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40"
                style={{ background: "hsl(245 60% 55% / 0.15)", color: "hsl(245 60% 70%)", border: "1px solid hsl(245 60% 55% / 0.3)" }}
              >
                <RefreshCw className={`w-3 h-3 ${loading === "qr" ? "animate-spin" : ""}`} />
                Atualizar
              </button>
            </div>
            <div
              className="rounded-xl flex items-center justify-center min-h-[220px]"
              style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px dashed hsl(0 0% 100% / 0.1)" }}
            >
              {qr ? (
                <img src={qr} alt="QR" className="w-48 h-48 rounded-lg" />
              ) : status === "connected" ? (
                <div className="text-center p-6">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2" style={{ color: "hsl(140 60% 50%)" }} />
                  <p className="text-sm font-semibold text-foreground">WhatsApp conectado</p>
                </div>
              ) : (
                <div className="text-center p-6 text-xs text-muted-foreground">
                  Configure e clique em <strong>Atualizar</strong> para gerar QR Code
                </div>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Abra WhatsApp → Configurações → Aparelhos conectados → Conectar aparelho
            </p>
          </div>

          <div className="glass-card p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground">Enviar mensagem teste</h3>
            <input
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="55 11 9 9999-9999"
              className="glass-input text-sm w-full"
            />
            <textarea
              value={testMsg}
              onChange={(e) => setTestMsg(e.target.value)}
              rows={3}
              className="glass-input text-sm w-full resize-y"
            />
            <button
              onClick={sendTest}
              disabled={loading === "send" || status !== "connected"}
              className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              style={{ background: "hsl(140 60% 50%)", color: "white" }}
            >
              {loading === "send" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar via Render
            </button>
            {status !== "connected" && (
              <p className="text-[10px] text-center text-muted-foreground">
                Conecte o WhatsApp antes de enviar
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RenderConfig;
