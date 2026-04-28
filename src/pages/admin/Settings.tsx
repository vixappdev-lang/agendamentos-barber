import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save, Store, Phone, Clock, MapPin, CalendarOff, Map, Image, Palette,
  Database, Calendar, Settings2, Globe, Shield, Upload, CheckCircle,
  XCircle, Loader2, Eye, ChevronRight, Mail, Instagram, Type,
  AlarmClock, Timer, Ban, FileText, CreditCard, QrCode, Copy, Plus, Trash2,
  AlertCircle, Wand2, ToggleLeft, Layout, ImageIcon, Sun, Moon, Monitor
} from "lucide-react";
import { toast } from "sonner";
import LocationPickerModal from "@/components/LocationPickerModal";
import { useThemeColors } from "@/hooks/useThemeColors";

const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type SettingsTab = "business" | "branding" | "hours" | "scheduling" | "payments" | "personalization" | "general";

const tabs: { id: SettingsTab; label: string; icon: typeof Store }[] = [
  { id: "business", label: "Dados", icon: Store },
  { id: "branding", label: "Visual", icon: Palette },
  { id: "personalization", label: "Personalização", icon: Wand2 },
  { id: "hours", label: "Horários", icon: Clock },
  { id: "scheduling", label: "Agendamento", icon: Calendar },
  { id: "payments", label: "PIX / Pagamentos", icon: CreditCard },
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
      if (map.pix_qr_configs) {
        try { setPixQrConfigs(JSON.parse(map.pix_qr_configs)); } catch {}
      }
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

    // Merge pix_qr_configs into settings before saving
    const allSettings = { ...settings, pix_qr_configs: JSON.stringify(pixQrConfigs) };

    const promises = Object.entries(allSettings).map(([key, value]) =>
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

          {/* ===== PERSONALIZAÇÃO ===== */}
          {activeTab === "personalization" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-4">
                {/* ── Tema / Aparência ── */}
                <div className={cardStyle}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sun className="w-4 h-4" style={{ color: iconColor }} /> Tema / Aparência
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Ative o modo claro para áreas específicas da plataforma
                  </p>
                  
                  {/* Master toggle */}
                  <button
                    onClick={() => updateSetting("theme_mode", (settings.theme_mode || "dark") === "dark" ? "light" : "dark")}
                    className="w-full flex items-center justify-between p-4 rounded-xl transition-all"
                    style={{
                      background: (settings.theme_mode || "dark") === "light" ? "hsl(245 60% 55% / 0.1)" : "hsl(0 0% 100% / 0.03)",
                      border: `1px solid ${(settings.theme_mode || "dark") === "light" ? "hsl(245 60% 55% / 0.25)" : "hsl(0 0% 100% / 0.06)"}`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {(settings.theme_mode || "dark") === "light" ? (
                        <Sun className="w-5 h-5" style={{ color: "hsl(40 80% 50%)" }} />
                      ) : (
                        <Moon className="w-5 h-5" style={{ color: "hsl(0 0% 50%)" }} />
                      )}
                      <div className="text-left">
                        <p className="text-sm font-semibold">Modo Claro</p>
                        <p className="text-[11px]" style={{ color: "hsl(0 0% 50%)" }}>
                          {(settings.theme_mode || "dark") === "light" ? "Ativado" : "Desativado"}
                        </p>
                      </div>
                    </div>
                    <div className="w-12 h-6 rounded-full flex items-center px-0.5 transition-all"
                      style={{
                        background: (settings.theme_mode || "dark") === "light" ? "hsl(245 60% 55%)" : "hsl(0 0% 25%)",
                        justifyContent: (settings.theme_mode || "dark") === "light" ? "flex-end" : "flex-start",
                      }}>
                      <div className="w-5 h-5 rounded-full bg-white transition-all" />
                    </div>
                  </button>

                  {/* Area checkboxes */}
                  {(settings.theme_mode || "dark") === "light" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Aplicar modo claro em:
                      </p>
                      {[
                        { key: "site", label: "Site Público", desc: "Landing page, loja, agendamento", icon: Globe },
                        { key: "admin", label: "Painel Admin", desc: "Dashboard, configurações, relatórios", icon: Monitor },
                        { key: "member", label: "Área do Cliente", desc: "Login, área de membro, PIX", icon: Eye },
                      ].map((area) => {
                        const currentAreas: string[] = (() => {
                          try { return JSON.parse(settings.theme_areas || "[]"); } catch { return []; }
                        })();
                        const isActive = currentAreas.includes(area.key);
                        return (
                          <button key={area.key}
                            onClick={() => {
                              const updated = isActive
                                ? currentAreas.filter((a: string) => a !== area.key)
                                : [...currentAreas, area.key];
                              updateSetting("theme_areas", JSON.stringify(updated));
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left"
                            style={{
                              background: isActive ? "hsl(245 60% 55% / 0.08)" : "hsl(0 0% 100% / 0.02)",
                              border: `1px solid ${isActive ? "hsl(245 60% 55% / 0.2)" : "hsl(0 0% 100% / 0.05)"}`,
                            }}>
                            <div className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0"
                              style={{
                                borderColor: isActive ? "hsl(245 60% 65%)" : "hsl(0 0% 30%)",
                                background: isActive ? "hsl(245 60% 55%)" : "transparent",
                              }}>
                              {isActive && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
                            <area.icon className="w-4 h-4 shrink-0" style={{ color: isActive ? "hsl(245 60% 65%)" : "hsl(0 0% 45%)" }} />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold">{area.label}</p>
                              <p className="text-[10px]" style={{ color: "hsl(0 0% 45%)" }}>{area.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </div>
                <div className={cardStyle}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Layout className="w-4 h-4" style={{ color: iconColor }} /> Modo do Site
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Escolha como seu site será exibido para os clientes
                  </p>
                  <div className="grid gap-2">
                    {[
                      { value: "full", label: "Site Completo", desc: "Landing page + agendamento + loja + área do cliente" },
                      { value: "booking", label: "Agendamento Direto", desc: "Apenas tela de agendamento sem landing page" },
                    ].map((mode) => (
                      <button key={mode.value} onClick={() => updateSetting("site_mode", mode.value)}
                        className="w-full text-left p-4 rounded-xl transition-all"
                        style={{
                          background: (settings.site_mode || "full") === mode.value ? "hsl(245 60% 55% / 0.1)" : "hsl(0 0% 100% / 0.03)",
                          border: `1px solid ${(settings.site_mode || "full") === mode.value ? "hsl(245 60% 55% / 0.25)" : "hsl(0 0% 100% / 0.06)"}`,
                        }}>
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                            style={{ borderColor: (settings.site_mode || "full") === mode.value ? "hsl(245 60% 65%)" : "hsl(0 0% 30%)" }}>
                            {(settings.site_mode || "full") === mode.value && (
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(245 60% 65%)" }} />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{mode.label}</p>
                            <p className="text-[11px]" style={{ color: "hsl(0 0% 50%)" }}>{mode.desc}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={cardStyle}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Type className="w-4 h-4" style={{ color: iconColor }} /> Textos do Site
                  </h3>
                  <div className="grid gap-4">
                    <div>
                      <label className={labelStyle}>Título Principal (Hero)</label>
                      <input className="glass-input" value={settings.hero_title || ""} onChange={(e) => updateSetting("hero_title", e.target.value)}
                        placeholder="Ex: GenesisBarber" />
                    </div>
                    <div>
                      <label className={labelStyle}>Subtítulo do Hero</label>
                      <input className="glass-input" value={settings.hero_subtitle || ""} onChange={(e) => updateSetting("hero_subtitle", e.target.value)}
                        placeholder="Ex: Barbearia Premium" />
                    </div>
                    <div>
                      <label className={labelStyle}>Descrição do Hero</label>
                      <textarea className="glass-input min-h-[70px] resize-none" value={settings.hero_description || ""} onChange={(e) => updateSetting("hero_description", e.target.value)}
                        placeholder="Ex: Mais do que um corte — uma experiência de transformação." />
                    </div>
                    <div>
                      <label className={labelStyle}>Título da Seção Sobre</label>
                      <input className="glass-input" value={settings.about_title || ""} onChange={(e) => updateSetting("about_title", e.target.value)}
                        placeholder="Ex: Onde estilo encontra atitude" />
                    </div>
                    <div>
                      <label className={labelStyle}>Descrição Sobre</label>
                      <textarea className="glass-input min-h-[70px] resize-none" value={settings.about_description || ""} onChange={(e) => updateSetting("about_description", e.target.value)}
                        placeholder="Texto descritivo sobre a barbearia" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className={cardStyle}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Palette className="w-4 h-4" style={{ color: iconColor }} /> Cores dos Botões
                  </h3>
                  <div className="grid gap-4">
                    <div>
                      <label className={labelStyle}>Botão Principal (Background)</label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={settings.btn_primary_bg || "#F2F2F2"} onChange={(e) => updateSetting("btn_primary_bg", e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />
                        <input className="glass-input flex-1" value={settings.btn_primary_bg || "#F2F2F2"} onChange={(e) => updateSetting("btn_primary_bg", e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className={labelStyle}>Botão Principal (Texto)</label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={settings.btn_primary_text || "#111111"} onChange={(e) => updateSetting("btn_primary_text", e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />
                        <input className="glass-input flex-1" value={settings.btn_primary_text || "#111111"} onChange={(e) => updateSetting("btn_primary_text", e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className={labelStyle}>Botão Secundário (Cor)</label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={settings.btn_secondary_color || "#6C5CE7"} onChange={(e) => updateSetting("btn_secondary_color", e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />
                        <input className="glass-input flex-1" value={settings.btn_secondary_color || "#6C5CE7"} onChange={(e) => updateSetting("btn_secondary_color", e.target.value)} />
                      </div>
                    </div>
                    {/* Preview */}
                    <div>
                      <label className={labelStyle}>Pré-visualização</label>
                      <div className="flex gap-3 items-center p-4 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.03)" }}>
                        <button className="px-5 py-2.5 rounded-xl text-sm font-bold"
                          style={{ background: settings.btn_primary_bg || "#F2F2F2", color: settings.btn_primary_text || "#111111" }}>
                          Agendar
                        </button>
                        <button className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                          style={{ background: settings.btn_secondary_color || "#6C5CE7" }}>
                          Adicionar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={cardStyle}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" style={{ color: iconColor }} /> Imagens do Slider (Hero)
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Envie até 3 imagens para o slider principal do site. Recomendado: 1920x1080px
                  </p>
                  <div className="grid gap-3">
                    {[1, 2, 3].map((i) => {
                      const key = `hero_image_${i}`;
                      return (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                          <div className="w-16 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center" style={{ background: "hsl(0 0% 100% / 0.05)" }}>
                            {settings[key] ? (
                              <img src={settings[key]} alt={`Hero ${i}`} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-4 h-4" style={{ color: "hsl(0 0% 35%)" }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold">Imagem {i}</p>
                            <p className="text-[10px] truncate" style={{ color: "hsl(0 0% 45%)" }}>
                              {settings[key] ? "Imagem configurada" : "Nenhuma imagem"}
                            </p>
                          </div>
                          <label className="px-3 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer transition-all shrink-0"
                            style={{ background: "hsl(245 60% 55% / 0.1)", color: "hsl(245 60% 70%)", border: "1px solid hsl(245 60% 55% / 0.2)" }}>
                            <Upload className="w-3 h-3 inline mr-1" /> Upload
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const ext = file.name.split(".").pop();
                                const fileName = `hero-${i}-${Date.now()}.${ext}`;
                                await supabase.storage.from("public-assets").upload(fileName, file, { upsert: true });
                                const { data: urlData } = supabase.storage.from("public-assets").getPublicUrl(fileName);
                                updateSetting(key, urlData.publicUrl);
                                toast.success(`Imagem ${i} enviada!`);
                              } catch { toast.error("Erro ao enviar imagem"); }
                            }} />
                          </label>
                          {settings[key] && (
                            <button onClick={() => updateSetting(key, "")} className="p-1.5 rounded-lg hover:bg-white/5">
                              <Trash2 className="w-3.5 h-3.5" style={{ color: "hsl(0 60% 55%)" }} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={cardStyle}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <ToggleLeft className="w-4 h-4" style={{ color: iconColor }} /> Módulos Visíveis
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Ative ou desative seções do site
                  </p>
                  <div className="grid gap-2">
                    {[
                      { key: "show_gallery", label: "Galeria de Fotos" },
                      { key: "show_about", label: "Seção Sobre" },
                      { key: "show_store", label: "Loja (menu)" },
                      { key: "show_cta", label: "Banner CTA" },
                    ].map((mod) => (
                      <button key={mod.key} onClick={() => updateSetting(mod.key, (settings[mod.key] || "true") === "true" ? "false" : "true")}
                        className="flex items-center justify-between p-3 rounded-xl transition-all"
                        style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                        <span className="text-xs font-medium">{mod.label}</span>
                        <div className="w-10 h-5 rounded-full flex items-center px-0.5 transition-all"
                          style={{
                            background: (settings[mod.key] || "true") === "true" ? "hsl(140 60% 45%)" : "hsl(0 0% 25%)",
                            justifyContent: (settings[mod.key] || "true") === "true" ? "flex-end" : "flex-start",
                          }}>
                          <div className="w-4 h-4 rounded-full bg-white transition-all" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== PIX / PAGAMENTOS ===== */}
          {activeTab === "payments" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className={cardStyle}>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CreditCard className="w-4 h-4" style={{ color: iconColor }} /> Chave PIX
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  Configure sua chave PIX para receber pagamentos dos clientes
                </p>
                <div className="grid gap-4">
                  <div>
                    <label className={labelStyle}>Tipo de Chave</label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { value: "cpf", label: "CPF" },
                        { value: "cnpj", label: "CNPJ" },
                        { value: "phone", label: "Telefone" },
                        { value: "email", label: "E-mail" },
                        { value: "random", label: "Aleatória" },
                      ].map((opt) => (
                        <button key={opt.value} onClick={() => updateSetting("pix_type", opt.value)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                          style={{
                            background: (settings.pix_type || "cpf") === opt.value ? "hsl(245 60% 55% / 0.15)" : "hsl(0 0% 100% / 0.04)",
                            color: (settings.pix_type || "cpf") === opt.value ? "hsl(245 60% 70%)" : "hsl(0 0% 55%)",
                            border: `1px solid ${(settings.pix_type || "cpf") === opt.value ? "hsl(245 60% 55% / 0.3)" : "hsl(0 0% 100% / 0.06)"}`,
                          }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelStyle}>Chave PIX</label>
                    <input className="glass-input" value={settings.pix_key || ""} onChange={(e) => updateSetting("pix_key", e.target.value)}
                      placeholder={
                        (settings.pix_type || "cpf") === "cpf" ? "000.000.000-00" :
                        (settings.pix_type || "cpf") === "cnpj" ? "00.000.000/0000-00" :
                        (settings.pix_type || "cpf") === "phone" ? "5527999999999" :
                        (settings.pix_type || "cpf") === "email" ? "email@exemplo.com" :
                        "Chave aleatória"
                      } />
                  </div>
                  <div>
                    <label className={labelStyle}>Nome do Beneficiário</label>
                    <input className="glass-input" value={settings.pix_name || ""} onChange={(e) => updateSetting("pix_name", e.target.value)} placeholder="Nome completo" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className={cardStyle}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <QrCode className="w-4 h-4" style={{ color: iconColor }} /> QR Codes por Valor
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Cadastre QR codes fixos para valores específicos. Seus clientes selecionam o valor do corte e recebem o QR code correspondente.
                  </p>
                  
                  {/* Add new QR config */}
                  <div className="flex gap-2">
                    <input className="glass-input flex-1" type="number" placeholder="Valor (R$)" value={newPixValue}
                      onChange={(e) => setNewPixValue(e.target.value)} min="0" step="0.01" />
                    <button onClick={() => {
                      if (!newPixValue || parseFloat(newPixValue) <= 0) { toast.error("Informe um valor válido"); return; }
                      setPixQrConfigs(prev => [...prev, { id: crypto.randomUUID(), value: newPixValue, qr_image_url: "" }]);
                      setNewPixValue("");
                    }} className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all"
                      style={{ background: "hsl(245 60% 55% / 0.1)", color: "hsl(245 60% 70%)", border: "1px solid hsl(245 60% 55% / 0.2)" }}>
                      <Plus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                  </div>

                  {/* QR list */}
                  <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-hide">
                    {pixQrConfigs.length === 0 ? (
                      <div className="text-center py-6 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.02)", border: "1px solid hsl(0 0% 100% / 0.04)" }}>
                        <QrCode className="w-8 h-8 mx-auto mb-2" style={{ color: "hsl(0 0% 30%)" }} />
                        <p className="text-xs" style={{ color: "hsl(0 0% 45%)" }}>Nenhum QR code cadastrado</p>
                      </div>
                    ) : (
                      pixQrConfigs.map((config) => (
                        <div key={config.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsl(0 0% 100% / 0.05)" }}>
                            {config.qr_image_url ? (
                              <img src={config.qr_image_url} alt="QR" className="w-full h-full object-contain rounded-lg" />
                            ) : (
                              <QrCode className="w-5 h-5" style={{ color: "hsl(0 0% 40%)" }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold">R$ {parseFloat(config.value).toFixed(2)}</p>
                            <label className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1">
                              <Upload className="w-3 h-3" /> Upload QR code
                              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  const ext = file.name.split(".").pop();
                                  const fileName = `pix-qr-${config.id}.${ext}`;
                                  await supabase.storage.from("public-assets").upload(fileName, file, { upsert: true });
                                  const { data: urlData } = supabase.storage.from("public-assets").getPublicUrl(fileName);
                                  setPixQrConfigs(prev => prev.map(c => c.id === config.id ? { ...c, qr_image_url: urlData.publicUrl } : c));
                                  updateSetting("pix_qr_configs", JSON.stringify(pixQrConfigs.map(c => c.id === config.id ? { ...c, qr_image_url: urlData.publicUrl } : c)));
                                  toast.success("QR code enviado!");
                                } catch { toast.error("Erro ao enviar QR code"); }
                              }} />
                            </label>
                          </div>
                          <button onClick={() => setPixQrConfigs(prev => prev.filter(c => c.id !== config.id))}
                            className="p-2 rounded-lg transition-all hover:bg-white/5" title="Remover">
                            <Trash2 className="w-4 h-4" style={{ color: "hsl(0 60% 55%)" }} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className={cardStyle}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Globe className="w-4 h-4" style={{ color: iconColor }} /> Mercado Pago (Opcional)
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Conecte com Mercado Pago para gerar PIX dinâmicos automaticamente (copia e cola)
                  </p>
                  <div className="grid gap-4">
                    <div>
                      <label className={labelStyle}>Access Token</label>
                      <input type="password" className="glass-input" value={settings.mp_access_token || ""} onChange={(e) => updateSetting("mp_access_token", e.target.value)}
                        placeholder="APP_USR-000000000000-000000-abcdefghij..." />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Encontre em: Mercado Pago → Seu Negócio → Configurações → Credenciais
                      </p>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-xl text-xs" style={{ background: "hsl(40 80% 50% / 0.08)", border: "1px solid hsl(40 80% 50% / 0.15)", color: "hsl(40 80% 60%)" }}>
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      Quando configurado, o sistema gera PIX automaticamente com valor exato
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* (Aba Banco de Dados removida — gerencie em /admin/barbershops) */}

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
