import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save, Store, Phone, Clock, MapPin, CalendarOff, Map, Image, Palette,
  Database, Calendar, Settings2, Globe, Shield, Upload, CheckCircle,
  XCircle, Loader2, Eye, ChevronRight, Mail, Instagram, Type,
  AlarmClock, Timer, Ban, FileText, CreditCard, QrCode, Copy, Plus, Trash2
} from "lucide-react";
import { toast } from "sonner";
import LocationPickerModal from "@/components/LocationPickerModal";

const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type SettingsTab = "business" | "branding" | "hours" | "scheduling" | "payments" | "database" | "general";

const tabs: { id: SettingsTab; label: string; icon: typeof Store }[] = [
  { id: "business", label: "Dados", icon: Store },
  { id: "branding", label: "Visual", icon: Palette },
  { id: "hours", label: "Horários", icon: Clock },
  { id: "scheduling", label: "Agendamento", icon: Calendar },
  { id: "payments", label: "PIX / Pagamentos", icon: CreditCard },
  { id: "database", label: "Banco de Dados", icon: Database },
  { id: "general", label: "Geral", icon: Settings2 },
];

interface PixQrConfig {
  id: string;
  value: string;
  qr_image_url?: string;
}

const Settings = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("business");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [pixQrConfigs, setPixQrConfigs] = useState<PixQrConfig[]>([]);
  const [newPixValue, setNewPixValue] = useState("");

  // Database connection test
  const [dbTesting, setDbTesting] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from("business_settings").select("*");
    if (data) {
      const map: Record<string, string> = {};
      for (const row of data) map[row.key] = row.value || "";
      setSettings(map);
      if (map.logo_url) setLogoPreview(map.logo_url);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const toggleDayOff = (dayIndex: number) => {
    const current = (settings.days_off || "").split(",").filter(Boolean);
    const dayStr = String(dayIndex);
    const updated = current.includes(dayStr)
      ? current.filter((d) => d !== dayStr)
      : [...current, dayStr];
    updateSetting("days_off", updated.join(","));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    const promises = Object.entries(settings).map(([key, value]) =>
      supabase.from("business_settings").upsert({ key, value }, { onConflict: "key" })
    );
    await Promise.all(promises);

    setSaving(false);
    setSaved(true);
    toast.success("Configurações salvas com sucesso! ✅");
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLocationConfirm = (address: string, lat: string, lng: string) => {
    setSettings((prev) => ({ ...prev, address, location_lat: lat, location_lng: lng }));
    setShowMap(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem válido");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    setUploadingLogo(true);

    try {
      const ext = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${ext}`;

      const { data, error } = await supabase.storage
        .from("public-assets")
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("public-assets")
        .getPublicUrl(fileName);

      const logoUrl = urlData.publicUrl;
      setLogoPreview(logoUrl);
      updateSetting("logo_url", logoUrl);
      toast.success("Logo enviada com sucesso!");
    } catch (err) {
      toast.error("Erro ao enviar a logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleTestDbConnection = async () => {
    setDbTesting(true);
    setDbTestResult(null);

    const host = settings.db_host || "localhost";
    const port = settings.db_port || "3306";
    const dbName = settings.db_name || "";
    const user = settings.db_user || "";
    const pass = settings.db_pass || "";

    if (!dbName || !user) {
      setDbTestResult({ success: false, message: "Preencha todos os campos obrigatórios" });
      setDbTesting(false);
      return;
    }

    // If API is configured, test via API
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
      try {
        const response = await fetch(`${apiUrl}/api/database/test-connection`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ host, port, db_name: dbName, username: user, password: pass }),
        });
        const result = await response.json();
        setDbTestResult(result.data || result);
      } catch {
        setDbTestResult({ success: false, message: "Não foi possível conectar à API" });
      }
    } else {
      setDbTestResult({ success: false, message: "Configure a URL da API primeiro (VITE_API_URL)" });
    }

    setDbTesting(false);
  };

  const daysOff = (settings.days_off || "").split(",").filter(Boolean);

  const cardStyle = "glass-card p-5 space-y-5";
  const labelStyle = "text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block";
  const iconColor = "hsl(245 60% 65%)";

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-foreground">Configurações</h2>

      {/* Tab Navigation */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0"
            style={{
              background: activeTab === tab.id ? "hsl(245 60% 55% / 0.1)" : "hsl(0 0% 100% / 0.02)",
              color: activeTab === tab.id ? "hsl(245 60% 70%)" : "hsl(0 0% 50%)",
              border: `1px solid ${activeTab === tab.id ? "hsl(245 60% 55% / 0.2)" : "hsl(0 0% 100% / 0.04)"}`,
            }}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {/* ===== DADOS DA BARBEARIA ===== */}
          {activeTab === "business" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className={cardStyle}>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Store className="w-4 h-4" style={{ color: iconColor }} /> Informações Básicas
                </h3>
                <div className="grid gap-4">
                  <div>
                    <label className={labelStyle}>Nome da Barbearia</label>
                    <input className="glass-input" value={settings.business_name || ""} onChange={(e) => updateSetting("business_name", e.target.value)} />
                  </div>
                  <div>
                    <label className={labelStyle}>Slogan</label>
                    <input className="glass-input" value={settings.slogan || ""} onChange={(e) => updateSetting("slogan", e.target.value)} placeholder="Ex: Estilo que define você" />
                  </div>
                  <div>
                    <label className={labelStyle}>Descrição</label>
                    <textarea className="glass-input min-h-[70px] resize-none" value={settings.description || ""} onChange={(e) => updateSetting("description", e.target.value)} placeholder="Breve descrição da barbearia" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className={cardStyle}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4" style={{ color: iconColor }} /> Contato
                  </h3>
                  <div className="grid gap-4">
                    <div>
                      <label className={`${labelStyle} flex items-center gap-1`}><Phone className="w-3 h-3" /> WhatsApp (com DDI+DDD)</label>
                      <input className="glass-input" value={settings.whatsapp_number || ""} onChange={(e) => updateSetting("whatsapp_number", e.target.value)} placeholder="5527999999999" />
                    </div>
                    <div>
                      <label className={`${labelStyle} flex items-center gap-1`}><Mail className="w-3 h-3" /> Email</label>
                      <input className="glass-input" type="email" value={settings.email || ""} onChange={(e) => updateSetting("email", e.target.value)} placeholder="contato@barbearia.com" />
                    </div>
                    <div>
                      <label className={`${labelStyle} flex items-center gap-1`}><Instagram className="w-3 h-3" /> Instagram</label>
                      <input className="glass-input" value={settings.instagram || ""} onChange={(e) => updateSetting("instagram", e.target.value)} placeholder="@suabarbearia" />
                    </div>
                  </div>
                </div>

                <div className={cardStyle}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4" style={{ color: iconColor }} /> Endereço
                  </h3>
                  <div className="grid gap-3">
                    <div>
                      <label className={labelStyle}>Endereço Completo</label>
                      <input className="glass-input" value={settings.address || ""} onChange={(e) => updateSetting("address", e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelStyle}>Cidade</label>
                        <input className="glass-input" value={settings.city || ""} onChange={(e) => updateSetting("city", e.target.value)} />
                      </div>
                      <div>
                        <label className={labelStyle}>Estado</label>
                        <input className="glass-input" value={settings.state || ""} onChange={(e) => updateSetting("state", e.target.value)} placeholder="ES" />
                      </div>
                    </div>
                    <div>
                      <label className={labelStyle}>CEP</label>
                      <input className="glass-input" value={settings.cep || ""} onChange={(e) => updateSetting("cep", e.target.value)} placeholder="00000-000" />
                    </div>
                    <div>
                      <label className={`${labelStyle} flex items-center gap-1`}><Map className="w-3 h-3" /> Localização no Mapa</label>
                      <button
                        onClick={() => setShowMap(true)}
                        className="w-full glass-input text-left flex items-center gap-2 cursor-pointer"
                      >
                        <MapPin className="w-4 h-4 text-accent shrink-0" />
                        <span className="text-sm truncate">
                          {settings.location_lat && settings.location_lng
                            ? `${parseFloat(settings.location_lat).toFixed(4)}, ${parseFloat(settings.location_lng).toFixed(4)}`
                            : "Clique para selecionar no mapa"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== IDENTIDADE VISUAL ===== */}
          {activeTab === "branding" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className={cardStyle}>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Image className="w-4 h-4" style={{ color: iconColor }} /> Logo da Barbearia
                </h3>
                <div className="space-y-4">
                  {/* Preview */}
                  <div
                    className="w-full aspect-video rounded-xl flex items-center justify-center overflow-hidden"
                    style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px dashed hsl(0 0% 100% / 0.1)" }}
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <div className="text-center space-y-2">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                        <p className="text-xs text-muted-foreground">Nenhuma logo enviada</p>
                      </div>
                    )}
                  </div>
                  <label
                    className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all"
                    style={{
                      background: "hsl(245 60% 55% / 0.1)",
                      color: "hsl(245 60% 70%)",
                      border: "1px solid hsl(245 60% 55% / 0.2)",
                    }}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploadingLogo ? "Enviando..." : "Enviar Logo"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                  </label>
                  <p className="text-[10px] text-muted-foreground">Formatos: PNG, JPG, SVG. Máximo: 2MB</p>
                </div>
              </div>

              <div className={cardStyle}>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Palette className="w-4 h-4" style={{ color: iconColor }} /> Cores do Tema
                </h3>
                <div className="grid gap-4">
                  <div>
                    <label className={labelStyle}>Cor Principal</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={settings.primary_color || "#6C5CE7"}
                        onChange={(e) => updateSetting("primary_color", e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        className="glass-input flex-1"
                        value={settings.primary_color || "#6C5CE7"}
                        onChange={(e) => updateSetting("primary_color", e.target.value)}
                        placeholder="#6C5CE7"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelStyle}>Cor Secundária</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={settings.accent_color || "#A29BFE"}
                        onChange={(e) => updateSetting("accent_color", e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        className="glass-input flex-1"
                        value={settings.accent_color || "#A29BFE"}
                        onChange={(e) => updateSetting("accent_color", e.target.value)}
                        placeholder="#A29BFE"
                      />
                    </div>
                  </div>
                  {/* Preview */}
                  <div>
                    <label className={labelStyle}>Pré-visualização</label>
                    <div className="flex gap-3 items-center p-3 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.03)" }}>
                      <div className="w-12 h-12 rounded-xl" style={{ background: settings.primary_color || "#6C5CE7" }} />
                      <div className="w-12 h-12 rounded-xl" style={{ background: settings.accent_color || "#A29BFE" }} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: settings.primary_color || "#6C5CE7" }}>
                          {settings.business_name || "Nome da Barbearia"}
                        </p>
                        <p className="text-xs" style={{ color: settings.accent_color || "#A29BFE" }}>
                          {settings.slogan || "Slogan aqui"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== HORÁRIOS ===== */}
          {activeTab === "hours" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className={cardStyle}>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" style={{ color: iconColor }} /> Horário de Funcionamento
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelStyle}>Abertura</label>
                    <input type="time" className="glass-input" value={settings.opening_time || "09:00"} onChange={(e) => updateSetting("opening_time", e.target.value)} />
                  </div>
                  <div>
                    <label className={labelStyle}>Fechamento</label>
                    <input type="time" className="glass-input" value={settings.closing_time || "19:00"} onChange={(e) => updateSetting("closing_time", e.target.value)} />
                  </div>
                  <div>
                    <label className={labelStyle}>Início Almoço</label>
                    <input type="time" className="glass-input" value={settings.lunch_start || "12:00"} onChange={(e) => updateSetting("lunch_start", e.target.value)} />
                  </div>
                  <div>
                    <label className={labelStyle}>Fim Almoço</label>
                    <input type="time" className="glass-input" value={settings.lunch_end || "13:00"} onChange={(e) => updateSetting("lunch_end", e.target.value)} />
                  </div>
                </div>
              </div>

              <div className={cardStyle}>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CalendarOff className="w-4 h-4" style={{ color: iconColor }} /> Dias de Folga
                </h3>
                <div className="flex gap-2">
                  {dayLabels.map((label, i) => (
                    <button
                      key={i}
                      onClick={() => toggleDayOff(i)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        background: daysOff.includes(String(i)) ? "hsl(0 60% 50% / 0.15)" : "hsl(0 0% 100% / 0.04)",
                        color: daysOff.includes(String(i)) ? "hsl(0 60% 65%)" : "hsl(0 0% 55%)",
                        border: `1px solid ${daysOff.includes(String(i)) ? "hsl(0 60% 50% / 0.3)" : "hsl(0 0% 100% / 0.06)"}`,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">Clique nos dias em que a barbearia não funciona</p>
              </div>
            </div>
          )}

          {/* ===== AGENDAMENTO ===== */}
          {activeTab === "scheduling" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className={cardStyle}>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Timer className="w-4 h-4" style={{ color: iconColor }} /> Regras de Agendamento
                </h3>
                <div className="grid gap-4">
                  <div>
                    <label className={labelStyle}>Duração Padrão (minutos)</label>
                    <input type="number" className="glass-input" value={settings.default_duration || "30"} onChange={(e) => updateSetting("default_duration", e.target.value)} />
                  </div>
                  <div>
                    <label className={labelStyle}>Intervalo entre Agendamentos (minutos)</label>
                    <input type="number" className="glass-input" value={settings.interval_between || "0"} onChange={(e) => updateSetting("interval_between", e.target.value)} />
                  </div>
                  <div>
                    <label className={labelStyle}>Máximo por Horário</label>
                    <input type="number" className="glass-input" value={settings.max_per_slot || "1"} onChange={(e) => updateSetting("max_per_slot", e.target.value)} />
                  </div>
                  <div>
                    <label className={labelStyle}>Antecedência Mínima (horas)</label>
                    <input type="number" className="glass-input" value={settings.min_advance_hours || "1"} onChange={(e) => updateSetting("min_advance_hours", e.target.value)} />
                  </div>
                  <div>
                    <label className={labelStyle}>Antecedência Máxima (dias)</label>
                    <input type="number" className="glass-input" value={settings.max_advance_days || "30"} onChange={(e) => updateSetting("max_advance_days", e.target.value)} />
                  </div>
                </div>
              </div>

              <div className={cardStyle}>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" style={{ color: iconColor }} /> Políticas
                </h3>
                <div className="grid gap-4">
                  <div>
                    <label className={labelStyle}>Política de Cancelamento</label>
                    <textarea
                      className="glass-input min-h-[80px] resize-none"
                      value={settings.cancellation_policy || ""}
                      onChange={(e) => updateSetting("cancellation_policy", e.target.value)}
                      placeholder="Ex: Cancelamentos devem ser feitos com no mínimo 2 horas de antecedência"
                    />
                  </div>
                  <div>
                    <label className={labelStyle}>Política de Atraso</label>
                    <textarea
                      className="glass-input min-h-[80px] resize-none"
                      value={settings.late_policy || ""}
                      onChange={(e) => updateSetting("late_policy", e.target.value)}
                      placeholder="Ex: Tolerância de 10 minutos. Após isso, o horário será liberado"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== BANCO DE DADOS ===== */}
          {activeTab === "database" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className={cardStyle}>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Database className="w-4 h-4" style={{ color: iconColor }} /> Conexão MySQL
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  Configure os dados de acesso ao banco de dados da hospedagem (cPanel/PHPMyAdmin)
                </p>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelStyle}>Host</label>
                      <input className="glass-input" value={settings.db_host || ""} onChange={(e) => updateSetting("db_host", e.target.value)} placeholder="localhost" />
                    </div>
                    <div>
                      <label className={labelStyle}>Porta</label>
                      <input className="glass-input" value={settings.db_port || ""} onChange={(e) => updateSetting("db_port", e.target.value)} placeholder="3306" />
                    </div>
                  </div>
                  <div>
                    <label className={labelStyle}>Nome do Banco</label>
                    <input className="glass-input" value={settings.db_name || ""} onChange={(e) => updateSetting("db_name", e.target.value)} placeholder="barber_saas" />
                  </div>
                  <div>
                    <label className={labelStyle}>Usuário</label>
                    <input className="glass-input" value={settings.db_user || ""} onChange={(e) => updateSetting("db_user", e.target.value)} placeholder="root" />
                  </div>
                  <div>
                    <label className={labelStyle}>Senha</label>
                    <input type="password" className="glass-input" value={settings.db_pass || ""} onChange={(e) => updateSetting("db_pass", e.target.value)} placeholder="••••••••" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Test result */}
                {dbTestResult && (
                  <div
                    className="flex items-center gap-2 p-4 rounded-xl text-xs font-medium"
                    style={{
                      background: dbTestResult.success ? "hsl(140 60% 50% / 0.1)" : "hsl(0 60% 50% / 0.1)",
                      color: dbTestResult.success ? "hsl(140 60% 60%)" : "hsl(0 60% 65%)",
                      border: `1px solid ${dbTestResult.success ? "hsl(140 60% 50% / 0.2)" : "hsl(0 60% 50% / 0.2)"}`,
                    }}
                  >
                    {dbTestResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {dbTestResult.message}
                  </div>
                )}

                <div className={cardStyle}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Shield className="w-4 h-4" style={{ color: iconColor }} /> Ações
                  </h3>
                  <button
                    onClick={handleTestDbConnection}
                    disabled={dbTesting}
                    className="w-full py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: "hsl(200 70% 55% / 0.1)",
                      color: "hsl(200 70% 60%)",
                      border: "1px solid hsl(200 70% 55% / 0.2)",
                    }}
                  >
                    {dbTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                    {dbTesting ? "Testando..." : "Testar Conexão"}
                  </button>
                  <p className="text-[10px] text-muted-foreground">
                    O teste verificará se os dados de conexão estão corretos via sua API PHP
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ===== GERAL ===== */}
          {activeTab === "general" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className={cardStyle}>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4" style={{ color: iconColor }} /> Domínio e Identificação
                </h3>
                <div className="grid gap-4">
                  <div>
                    <label className={labelStyle}>Slug (identificador)</label>
                    <input className="glass-input" value={settings.tenant_slug || ""} onChange={(e) => updateSetting("tenant_slug", e.target.value)} placeholder="vilanova" />
                    <p className="text-[10px] text-muted-foreground mt-1">Identificador único usado internamente</p>
                  </div>
                  <div>
                    <label className={labelStyle}>Domínio Personalizado</label>
                    <input className="glass-input" value={settings.custom_domain || ""} onChange={(e) => updateSetting("custom_domain", e.target.value)} placeholder="www.suabarbearia.com.br" />
                  </div>
                </div>
              </div>

              <div className={cardStyle}>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Settings2 className="w-4 h-4" style={{ color: iconColor }} /> Preferências
                </h3>
                <div className="grid gap-4">
                  <div>
                    <label className={labelStyle}>Status do Site</label>
                    <div className="flex gap-3">
                      {["ativo", "inativo"].map((status) => (
                        <button
                          key={status}
                          onClick={() => updateSetting("site_status", status)}
                          className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all capitalize"
                          style={{
                            background: (settings.site_status || "ativo") === status
                              ? status === "ativo"
                                ? "hsl(140 60% 50% / 0.15)"
                                : "hsl(0 60% 50% / 0.15)"
                              : "hsl(0 0% 100% / 0.04)",
                            color: (settings.site_status || "ativo") === status
                              ? status === "ativo"
                                ? "hsl(140 60% 60%)"
                                : "hsl(0 60% 65%)"
                              : "hsl(0 0% 55%)",
                            border: `1px solid ${(settings.site_status || "ativo") === status
                              ? status === "ativo"
                                ? "hsl(140 60% 50% / 0.3)"
                                : "hsl(0 60% 50% / 0.3)"
                              : "hsl(0 0% 100% / 0.06)"}`,
                          }}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelStyle}>Link Google Maps</label>
                    <input className="glass-input" value={settings.google_maps_link || ""} onChange={(e) => updateSetting("google_maps_link", e.target.value)} placeholder="https://maps.google.com/..." />
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Save Button */}
      <motion.button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        style={{
          background: saved ? "hsl(140 60% 45%)" : "hsl(245 60% 55%)",
          color: "white",
          boxShadow: saved ? "0 4px 20px hsl(140 60% 45% / 0.25)" : "0 4px 20px hsl(245 60% 55% / 0.25)",
        }}
        animate={{ scale: saved ? [1, 1.03, 1] : 1 }}
        transition={{ duration: 0.3 }}
        whileTap={{ scale: 0.98 }}
      >
        <Save className="w-4 h-4" /> {saving ? "Salvando..." : saved ? "Salvo ✓" : "Salvar Configurações"}
      </motion.button>

      {/* Map Modal */}
      <AnimatePresence>
        {showMap && (
          <LocationPickerModal
            onClose={() => setShowMap(false)}
            onConfirm={handleLocationConfirm}
            initialAddress={settings.address}
            initialLat={settings.location_lat}
            initialLng={settings.location_lng}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
