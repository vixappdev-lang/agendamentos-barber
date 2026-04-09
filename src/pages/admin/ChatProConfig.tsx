import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save, Wifi, WifiOff, QrCode, RefreshCw, Trash2, CheckCircle,
  AlertCircle, Loader2, MessageSquare, Shield, Settings2,
} from "lucide-react";
import { toast } from "sonner";

type ConnectionStatus =
  | "not_configured"
  | "connecting"
  | "waiting_qr"
  | "connected"
  | "disconnected"
  | "auth_error"
  | "invalid_endpoint"
  | "session_expired"
  | "error";

const statusLabels: Record<ConnectionStatus, { label: string; color: string; icon: any }> = {
  not_configured: { label: "Não configurado", color: "hsl(0 0% 45%)", icon: WifiOff },
  connecting: { label: "Conectando...", color: "hsl(45 80% 55%)", icon: Loader2 },
  waiting_qr: { label: "Aguardando QR Code", color: "hsl(45 80% 55%)", icon: QrCode },
  connected: { label: "Conectado", color: "hsl(140 60% 50%)", icon: CheckCircle },
  disconnected: { label: "Desconectado", color: "hsl(0 60% 55%)", icon: WifiOff },
  auth_error: { label: "Erro de autenticação", color: "hsl(0 60% 55%)", icon: AlertCircle },
  invalid_endpoint: { label: "Endpoint inválido", color: "hsl(0 60% 55%)", icon: AlertCircle },
  session_expired: { label: "Sessão expirada", color: "hsl(30 80% 55%)", icon: AlertCircle },
  error: { label: "Erro", color: "hsl(0 60% 55%)", icon: AlertCircle },
};

const ChatProConfig = () => {
  const [instanceId, setInstanceId] = useState("");
  const [token, setToken] = useState("");
  const [endpoint, setEndpoint] = useState("https://v5.chatpro.com.br");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("not_configured");
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  const callChatPro = useCallback(async (action: string, config?: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Sessão expirada"); return null; }

    const res = await supabase.functions.invoke("chatpro", {
      body: { action, config },
    });

    if (res.error) {
      console.error("ChatPro error:", res.error);
      toast.error(res.error.message || "Erro ao comunicar com o servidor");
      return null;
    }

    return res.data;
  }, []);

  useEffect(() => {
    const loadConfig = async () => {
      const data = await callChatPro("get_config");
      if (data?.config) {
        setInstanceId(data.config.instance_id || "");
        setEndpoint(data.config.endpoint || "https://v5.chatpro.com.br");
        if (data.config.token) setToken(data.config.token); // masked token from server
        setConfigLoaded(true);
        checkStatus();
      } else {
        setConfigLoaded(true);
      }
    };
    loadConfig();
  }, []);

  const checkStatus = async () => {
    setLoading("status");
    const data = await callChatPro("status");
    setLoading(null);

    if (!data) { setStatus("error"); return; }

    if (data.status === 401) {
      setStatus("auth_error");
    } else if (data.status === 200) {
      const d = data.data;
      if (d?.connected === true || d?.status === "CONNECTED" || d?.accountStatus === "authenticated") {
        setStatus("connected");
        setQrCodeBase64(null);
      } else if (d?.status === "DISCONNECTED" || d?.connected === false) {
        setStatus("disconnected");
      } else if (d?.status === "WAITING_QR" || d?.status === "qrcode") {
        setStatus("waiting_qr");
      } else {
        setStatus("disconnected");
      }
    } else {
      setStatus("invalid_endpoint");
    }
  };

  const handleSave = async () => {
    if (!instanceId.trim() || !token.trim() || !endpoint.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);
    const data = await callChatPro("save_config", {
      instance_id: instanceId,
      token,
      endpoint,
    });
    setSaving(false);

    if (data?.success) {
      toast.success("Configuração salva com sucesso! ✅");
      checkStatus();
    }
  };

  const handleTestConnection = async () => {
    if (!instanceId.trim() || !token.trim()) {
      toast.error("Salve a configuração primeiro");
      return;
    }
    await checkStatus();
    if (status === "connected") toast.success("Instância conectada! ✅");
    else if (status === "auth_error") toast.error("Token inválido ou sem permissão");
    else if (status === "invalid_endpoint") toast.error("Endpoint inválido");
    else toast.info("Verifique o status da instância");
  };

  const handleGenerateQR = async () => {
    setLoading("qr");
    setQrCodeBase64(null);
    const data = await callChatPro("generate_qrcode");
    setLoading(null);

    if (!data) return;

    if (data.status === 401) {
      setStatus("auth_error");
      toast.error("Token inválido");
      return;
    }

    const d = data.data;
    if (d?.base64 || d?.qrcode || d?.data) {
      const qr = d.base64 || d.qrcode || d.data;
      setQrCodeBase64(qr);
      setStatus("waiting_qr");
      toast.success("QR Code gerado! Escaneie com o WhatsApp");
    } else if (d?.connected || d?.status === "CONNECTED") {
      setStatus("connected");
      toast.success("Já está conectado!");
    } else {
      toast.error("Não foi possível gerar o QR Code");
    }
  };

  const handleReload = async () => {
    setLoading("reload");
    await callChatPro("reload");
    setLoading(null);
    toast.success("Instância recarregada");
    setTimeout(() => checkStatus(), 2000);
  };

  const handleRemoveSession = async () => {
    setLoading("remove");
    await callChatPro("remove_session");
    setLoading(null);
    setStatus("disconnected");
    setQrCodeBase64(null);
    toast.success("Sessão removida");
  };

  const StatusIcon = statusLabels[status].icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "hsl(140 50% 45% / 0.12)", border: "1px solid hsl(140 50% 45% / 0.25)" }}>
          <MessageSquare className="w-5 h-5" style={{ color: "hsl(140 60% 55%)" }} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Integração ChatPro</h2>
          <p className="text-xs text-muted-foreground">Configure sua instância WhatsApp</p>
        </div>
      </div>

      {/* Status Panel */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5"
        style={{ border: `1px solid ${statusLabels[status].color}33` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${statusLabels[status].color}20` }}>
              <StatusIcon
                className={`w-5 h-5 ${status === "connecting" ? "animate-spin" : ""}`}
                style={{ color: statusLabels[status].color }}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Status da Instância</p>
              <p className="text-sm font-bold" style={{ color: statusLabels[status].color }}>
                {statusLabels[status].label}
              </p>
            </div>
          </div>
          <button
            onClick={checkStatus}
            disabled={loading === "status"}
            className="p-2.5 rounded-xl transition-all"
            style={{ background: "hsl(0 0% 100% / 0.04)", border: "1px solid hsl(0 0% 100% / 0.08)" }}
          >
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading === "status" ? "animate-spin" : ""}`} />
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Config Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-5 space-y-5"
          style={{ border: "1px solid transparent" }}
        >
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Settings2 className="w-4 h-4" style={{ color: "hsl(245 60% 65%)" }} />
            Configuração da Instância
          </h3>

          <div className="grid gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Código da Instância
              </label>
              <input
                className="glass-input"
                value={instanceId}
                onChange={(e) => setInstanceId(e.target.value)}
                placeholder="chatpro-fx5qbe2hah"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Encontre no painel ChatPro</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block flex items-center gap-1">
                <Shield className="w-3 h-3" /> Token de Autenticação
              </label>
              <input
                className="glass-input"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="••••••••••••"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Obtido em painel.chatpro.com.br</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Endpoint Base da API
              </label>
              <input
                className="glass-input"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://v5.chatpro.com.br"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <motion.button
              onClick={handleSave}
              disabled={saving}
              className="py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ background: "hsl(245 60% 55%)", color: "white", boxShadow: "0 4px 20px hsl(245 60% 55% / 0.25)" }}
              whileTap={{ scale: 0.98 }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Salvando..." : "Salvar"}
            </motion.button>

            <motion.button
              onClick={handleTestConnection}
              disabled={loading === "status"}
              className="py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ background: "hsl(0 0% 100% / 0.06)", color: "hsl(0 0% 85%)", border: "1px solid hsl(0 0% 100% / 0.1)" }}
              whileTap={{ scale: 0.98 }}
            >
              <Wifi className="w-4 h-4" /> Testar
            </motion.button>
          </div>
        </motion.div>

        {/* QR Code & Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-5 space-y-5"
          style={{ border: "1px solid transparent" }}
        >
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <QrCode className="w-4 h-4" style={{ color: "hsl(245 60% 65%)" }} />
            Conexão WhatsApp
          </h3>

          {/* QR Code display */}
          <div className="flex justify-center">
            <div
              className="w-56 h-56 rounded-2xl flex items-center justify-center overflow-hidden"
              style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.08)" }}
            >
              {loading === "qr" ? (
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              ) : qrCodeBase64 ? (
                <img
                  src={qrCodeBase64.startsWith("data:") ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`}
                  alt="QR Code WhatsApp"
                  className="w-full h-full object-contain p-3"
                  style={{ background: "white", borderRadius: "12px" }}
                />
              ) : status === "connected" ? (
                <div className="text-center space-y-2">
                  <CheckCircle className="w-12 h-12 mx-auto" style={{ color: "hsl(140 60% 50%)" }} />
                  <p className="text-xs font-semibold" style={{ color: "hsl(140 60% 55%)" }}>Conectado</p>
                </div>
              ) : (
                <div className="text-center space-y-2 p-4">
                  <QrCode className="w-10 h-10 mx-auto text-muted-foreground/30" />
                  <p className="text-[10px] text-muted-foreground">
                    Clique em "Gerar QR Code" para iniciar a conexão
                  </p>
                </div>
              )}
            </div>
          </div>

          {qrCodeBase64 && status === "waiting_qr" && (
            <div className="text-center p-3 rounded-xl" style={{ background: "hsl(45 80% 55% / 0.08)", border: "1px solid hsl(45 80% 55% / 0.2)" }}>
              <p className="text-xs font-semibold" style={{ color: "hsl(45 80% 65%)" }}>
                📱 Abra o WhatsApp → Configurações → Dispositivos conectados → Escanear QR Code
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-1 gap-2">
            <motion.button
              onClick={handleGenerateQR}
              disabled={loading === "qr" || !instanceId}
              className="py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ background: "hsl(140 50% 45%)", color: "white", boxShadow: "0 4px 20px hsl(140 50% 45% / 0.25)" }}
              whileTap={{ scale: 0.98 }}
            >
              {loading === "qr" ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
              Gerar QR Code
            </motion.button>

            <div className="grid grid-cols-2 gap-2">
              <motion.button
                onClick={handleReload}
                disabled={loading === "reload" || !instanceId}
                className="py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: "hsl(0 0% 100% / 0.06)", color: "hsl(0 0% 85%)", border: "1px solid hsl(0 0% 100% / 0.1)" }}
                whileTap={{ scale: 0.98 }}
              >
                {loading === "reload" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Recarregar
              </motion.button>

              <motion.button
                onClick={handleRemoveSession}
                disabled={loading === "remove" || !instanceId}
                className="py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: "hsl(0 60% 50% / 0.1)", color: "hsl(0 60% 65%)", border: "1px solid hsl(0 60% 50% / 0.2)" }}
                whileTap={{ scale: 0.98 }}
              >
                {loading === "remove" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Desconectar
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Future features info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-5"
        style={{ border: "1px solid hsl(245 60% 55% / 0.1)" }}
      >
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4" style={{ color: "hsl(245 60% 65%)" }} />
          Automações Futuras
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            "Confirmação automática de agendamento",
            "Lembrete de horário",
            "Aviso de cancelamento",
            "Mensagem pós-atendimento",
          ].map((item) => (
            <div
              key={item}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground"
              style={{ background: "hsl(0 0% 100% / 0.02)" }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(245 60% 55% / 0.4)" }} />
              {item}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          Essas funcionalidades serão habilitadas em atualizações futuras após a conexão ser configurada.
        </p>
      </motion.div>
    </div>
  );
};

export default ChatProConfig;
