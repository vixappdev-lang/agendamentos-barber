import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save, Store, Phone, Clock, MapPin, CalendarOff, Map, Image, Palette,
  Database, Calendar, Settings2, Globe, Shield, Upload, CheckCircle,
  XCircle, Loader2, Eye, ChevronRight, Mail, Instagram, Type,
  AlarmClock, Timer, Ban, FileText, CreditCard, QrCode, Copy, Plus, Trash2,
  AlertCircle, Wand2, ToggleLeft, Layout, ImageIcon, Sun, Moon, Monitor, Send
} from "lucide-react";
import { toast } from "sonner";
import LocationPickerModal from "@/components/LocationPickerModal";
import { useThemeColors } from "@/hooks/useThemeColors";
import { MessageTemplatesModal } from "@/components/admin/MessageTemplatesModal";
import { getAdminMysqlSession } from "@/lib/adminMysqlSession";
import type { TemplateCategory } from "@/lib/messageTemplates";

// Toggle card padrão (substitui checkboxes feios da aba Agendamento)
const ToggleCard = ({
  active,
  onToggle,
  title,
  description,
  icon,
}: {
  active: boolean;
  onToggle: () => void;
  title: string;
  description: string;
  icon?: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onToggle}
    className="w-full text-left p-3.5 rounded-xl transition-all flex items-start gap-3 group"
    style={{
      background: active ? "hsl(245 60% 55% / 0.1)" : "hsl(0 0% 100% / 0.025)",
      border: `1px solid ${active ? "hsl(245 60% 55% / 0.3)" : "hsl(0 0% 100% / 0.05)"}`,
    }}
  >
    {icon && (
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors"
        style={{
          background: active ? "hsl(245 60% 55% / 0.15)" : "hsl(0 0% 100% / 0.04)",
          color: active ? "hsl(245 60% 70%)" : "hsl(0 0% 50%)",
        }}
      >
        {icon}
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-foreground leading-tight">{title}</p>
      <p className="text-[10.5px] text-muted-foreground leading-snug mt-0.5">{description}</p>
    </div>
    <div
      className="w-9 h-5 rounded-full flex items-center px-0.5 transition-all shrink-0 mt-1"
      style={{
        background: active ? "hsl(245 60% 55%)" : "hsl(0 0% 22%)",
        justifyContent: active ? "flex-end" : "flex-start",
      }}
    >
      <div className="w-4 h-4 rounded-full bg-white transition-all shadow" />
    </div>
  </button>
);

// Botão "Templates" reutilizável
const TemplatePickerBtn = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="text-[10px] font-semibold inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors"
    style={{
      background: "hsl(245 60% 55% / 0.1)",
      color: "hsl(245 60% 75%)",
      border: "1px solid hsl(245 60% 55% / 0.25)",
    }}
  >
    <Wand2 className="w-3 h-3" /> Templates
  </button>
);

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

  // Templates picker
  const [templateCategory, setTemplateCategory] = useState<TemplateCategory | null>(null);

  // Cloud routing (publicação do site) — sincronizado no handleSave
  const adminSession = getAdminMysqlSession();
  const barbershopId = adminSession?.barbershop_id || null;
  const publicSlug = settings.tenant_slug || settings.business_slug || "";
  const currentHost = typeof window !== "undefined" ? window.location.host : "";
  const customDomain = (settings.custom_domain || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const publicUrl = customDomain
    ? `https://${customDomain}`
    : publicSlug ? `${window.location.origin}/s/${publicSlug}` : "";
  const sitePublished = settings.site_published !== "false";

  // Auto-detecta domínio atual da hospedagem (útil pra preencher custom_domain)
  useEffect(() => {
    if (!settings.detected_host && currentHost) {
      // Apenas guarda local pra exibir, não persiste sem ação do usuário
      setSettings((p) => ({ ...p, detected_host: currentHost }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentHost]);

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

  const uploadAsset = async (file: File, prefix: string): Promise<string | null> => {
    if (!file.type.startsWith("image/")) { toast.error("Arquivo inválido"); return null; }
    if (file.size > 4 * 1024 * 1024) { toast.error("Máx 4MB"); return null; }
    const ext = file.name.split(".").pop();
    const fileName = `${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("public-assets").upload(fileName, file, { upsert: true });
    if (error) { toast.error(error.message); return null; }
    const { data: u } = supabase.storage.from("public-assets").getPublicUrl(fileName);
    return u.publicUrl;
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

    // Sincroniza roteamento Cloud (site_mode + site_published) automaticamente
    if (barbershopId) {
      await supabase
        .from("barbershop_profiles")
        .update({
          site_mode: ((settings.site_mode as "full" | "booking") || "full"),
          site_published: settings.site_published !== "false",
        })
        .eq("id", barbershopId);
    }

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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              {/* Coluna esquerda — Identidade + Endereço */}
              <div className="space-y-4 flex flex-col">
                <div className={`${cardStyle} lg:min-h-[330px]`}>
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
                      <textarea className="glass-input min-h-[110px] resize-none" value={settings.description || ""} onChange={(e) => updateSetting("description", e.target.value)} placeholder="Breve descrição da barbearia" />
                    </div>
                  </div>
                </div>

                <div className={`${cardStyle} flex-1 flex flex-col`}>
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

              {/* Coluna direita — Contato + Redes & Links */}
              <div className="space-y-4 flex flex-col">
                <div className={`${cardStyle} lg:min-h-[330px]`}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4" style={{ color: iconColor }} /> Contato
                  </h3>
                  <div className="grid gap-4">
                    <div>
                      <label className={`${labelStyle} flex items-center gap-1`}><Phone className="w-3 h-3" /> WhatsApp (com DDI+DDD)</label>
                      <input className="glass-input" value={settings.whatsapp_number || ""} onChange={(e) => updateSetting("whatsapp_number", e.target.value)} placeholder="5527999999999" />
                    </div>
                    <div>
                      <label className={`${labelStyle} flex items-center gap-1`}><Phone className="w-3 h-3" /> Telefone Fixo (opcional)</label>
                      <input className="glass-input" value={settings.phone_number || ""} onChange={(e) => updateSetting("phone_number", e.target.value)} placeholder="(27) 3333-3333" />
                    </div>
                    <div>
                      <label className={`${labelStyle} flex items-center gap-1`}><Mail className="w-3 h-3" /> Email</label>
                      <input className="glass-input" type="email" value={settings.email || ""} onChange={(e) => updateSetting("email", e.target.value)} placeholder="contato@barbearia.com" />
                    </div>
                  </div>
                </div>

                <div className={`${cardStyle} flex-1 flex flex-col`}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Globe className="w-4 h-4" style={{ color: iconColor }} /> Redes Sociais & Links
                  </h3>
                  <div className="grid gap-4">
                    <div>
                      <label className={`${labelStyle} flex items-center gap-1`}><Instagram className="w-3 h-3" /> Instagram</label>
                      <input className="glass-input" value={settings.instagram || ""} onChange={(e) => updateSetting("instagram", e.target.value)} placeholder="@suabarbearia" />
                    </div>
                    <div>
                      <label className={`${labelStyle} flex items-center gap-1`}><Globe className="w-3 h-3" /> Facebook</label>
                      <input className="glass-input" value={settings.facebook || ""} onChange={(e) => updateSetting("facebook", e.target.value)} placeholder="facebook.com/suabarbearia" />
                    </div>
                    <div>
                      <label className={`${labelStyle} flex items-center gap-1`}><Globe className="w-3 h-3" /> TikTok</label>
                      <input className="glass-input" value={settings.tiktok || ""} onChange={(e) => updateSetting("tiktok", e.target.value)} placeholder="@suabarbearia" />
                    </div>
                    <div>
                      <label className={`${labelStyle} flex items-center gap-1`}><Map className="w-3 h-3" /> Link do Google Maps</label>
                      <input className="glass-input" value={settings.google_maps_link || ""} onChange={(e) => updateSetting("google_maps_link", e.target.value)} placeholder="https://maps.app.goo.gl/..." />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}



          {/* ===== IDENTIDADE VISUAL ===== */}
          {activeTab === "branding" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              {/* LOGO — compacta e alinhada */}
              <div className={`${cardStyle} h-full flex flex-col`}>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Image className="w-4 h-4" style={{ color: iconColor }} /> Logo da Barbearia
                </h3>
                <div className="flex items-center gap-4">
                  {/* Preview compacto */}
                  <div
                    className="w-24 h-24 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
                    style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px dashed hsl(0 0% 100% / 0.12)" }}
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  {/* Ações */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <label
                      className="w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all"
                      style={{
                        background: "hsl(245 60% 55% / 0.1)",
                        color: "hsl(245 60% 70%)",
                        border: "1px solid hsl(245 60% 55% / 0.2)",
                      }}
                    >
                      {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {uploadingLogo ? "Enviando..." : logoPreview ? "Trocar logo" : "Enviar logo"}
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                    </label>
                    {logoPreview && (
                      <button
                        type="button"
                        onClick={() => { setLogoPreview(null); updateSetting("logo_url", ""); }}
                        className="w-full py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-destructive transition"
                        style={{ border: "1px solid hsl(0 0% 100% / 0.06)" }}
                      >
                        Remover
                      </button>
                    )}
                    <p className="text-[10px] text-muted-foreground leading-snug">PNG, JPG ou SVG · Máx 2MB · ideal quadrado</p>
                  </div>
                </div>

                {/* Favicon */}
                <div className="mt-auto pt-4 border-t border-white/5">
                  <label className={labelStyle}>Favicon (URL)</label>
                  <input
                    className="glass-input"
                    value={settings.site_favicon_url || ""}
                    onChange={(e) => updateSetting("site_favicon_url", e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* CORES */}
              <div className={`${cardStyle} h-full flex flex-col`}>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Palette className="w-4 h-4" style={{ color: iconColor }} /> Cores do Tema
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelStyle}>Cor Principal</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.primary_color || "#6C5CE7"}
                        onChange={(e) => updateSetting("primary_color", e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent shrink-0"
                      />
                      <input
                        className="glass-input flex-1 min-w-0"
                        value={settings.primary_color || "#6C5CE7"}
                        onChange={(e) => updateSetting("primary_color", e.target.value)}
                        placeholder="#6C5CE7"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelStyle}>Cor Secundária</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.accent_color || "#A29BFE"}
                        onChange={(e) => updateSetting("accent_color", e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent shrink-0"
                      />
                      <input
                        className="glass-input flex-1 min-w-0"
                        value={settings.accent_color || "#A29BFE"}
                        onChange={(e) => updateSetting("accent_color", e.target.value)}
                        placeholder="#A29BFE"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-auto">
                  <label className={labelStyle}>Pré-visualização</label>
                  <div className="flex gap-3 items-center p-3 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.03)" }}>
                    <div className="w-10 h-10 rounded-lg shrink-0" style={{ background: settings.primary_color || "#6C5CE7" }} />
                    <div className="w-10 h-10 rounded-lg shrink-0" style={{ background: settings.accent_color || "#A29BFE" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: settings.primary_color || "#6C5CE7" }}>
                        {settings.business_name || "Nome da Barbearia"}
                      </p>
                      <p className="text-xs truncate" style={{ color: settings.accent_color || "#A29BFE" }}>
                        {settings.slogan || "Slogan aqui"}
                      </p>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              {/* ---------- COLUNA ESQUERDA ---------- */}
              <div className="space-y-4 flex flex-col">
                {/* Modo de Confirmação */}
                <div className={cardStyle}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" style={{ color: iconColor }} /> Modo de Confirmação
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: "auto", label: "Automática", desc: "Cliente agenda → status Confirmado. Mensagem enviada na hora." },
                      { id: "manual", label: "Manual", desc: "Status Pendente. Cliente recebe 'pedido recebido' e admin confirma." },
                    ].map((opt) => {
                      const active = (settings.confirmation_mode || "auto") === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => updateSetting("confirmation_mode", opt.id)}
                          className="text-left p-3.5 rounded-xl transition-all"
                          style={{
                            background: active ? "hsl(245 60% 55% / 0.12)" : "hsl(0 0% 100% / 0.025)",
                            border: `1px solid ${active ? "hsl(245 60% 55% / 0.35)" : "hsl(0 0% 100% / 0.06)"}`,
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="w-3.5 h-3.5 rounded-full border flex items-center justify-center"
                              style={{
                                borderColor: active ? "hsl(245 60% 70%)" : "hsl(0 0% 40%)",
                                background: active ? "hsl(245 60% 70%)" : "transparent",
                              }}
                            >
                              {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </span>
                            <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-snug">{opt.desc}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Toggles WhatsApp ligados ao modo de confirmação */}
                  <div className="grid gap-2 pt-2 border-t border-white/5">
                    <ToggleCard
                      active={settings.send_whatsapp_on_book === "true"}
                      onToggle={() =>
                        updateSetting("send_whatsapp_on_book", settings.send_whatsapp_on_book === "true" ? "false" : "true")
                      }
                      title="Enviar WhatsApp ao agendar"
                      description="Notifica o cliente assim que o agendamento é criado."
                      icon={<Send className="w-4 h-4" />}
                    />
                    <ToggleCard
                      active={settings.send_whatsapp_on_confirm === "true"}
                      onToggle={() =>
                        updateSetting("send_whatsapp_on_confirm", settings.send_whatsapp_on_confirm === "true" ? "false" : "true")
                      }
                      title="Enviar WhatsApp ao confirmar"
                      description="Útil quando a confirmação é manual pelo admin."
                      icon={<CheckCircle className="w-4 h-4" />}
                    />
                    <ToggleCard
                      active={settings.send_whatsapp_reminder === "true"}
                      onToggle={() =>
                        updateSetting("send_whatsapp_reminder", settings.send_whatsapp_reminder === "true" ? "false" : "true")
                      }
                      title="Lembrete antes do horário"
                      description="Envia lembrete X horas antes (configurar abaixo)."
                      icon={<AlarmClock className="w-4 h-4" />}
                    />
                    <div>
                      <label className={labelStyle}>Lembrete — quantas horas antes?</label>
                      <input
                        type="number"
                        min={0}
                        className="glass-input"
                        value={settings.reminder_hours_before || "2"}
                        onChange={(e) => updateSetting("reminder_hours_before", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Regras */}
                <div className={cardStyle}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Timer className="w-4 h-4" style={{ color: iconColor }} /> Regras de Agendamento
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelStyle}>Duração padrão (min)</label>
                      <input type="number" className="glass-input" value={settings.default_duration || "30"} onChange={(e) => updateSetting("default_duration", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelStyle}>Intervalo entre (min)</label>
                      <input type="number" className="glass-input" value={settings.interval_between || "0"} onChange={(e) => updateSetting("interval_between", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelStyle}>Máx. por horário</label>
                      <input type="number" className="glass-input" value={settings.max_per_slot || "1"} onChange={(e) => updateSetting("max_per_slot", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelStyle}>Antec. mín. (horas)</label>
                      <input type="number" className="glass-input" value={settings.min_advance_hours || "1"} onChange={(e) => updateSetting("min_advance_hours", e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelStyle}>Antecedência máxima (dias)</label>
                      <input type="number" className="glass-input" value={settings.max_advance_days || "30"} onChange={(e) => updateSetting("max_advance_days", e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Comportamento do Cliente */}
                <div className={`${cardStyle} flex-1 flex flex-col`}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Settings2 className="w-4 h-4" style={{ color: iconColor }} /> Comportamento do Cliente
                  </h3>
                  <div className="grid gap-2">
                    <ToggleCard
                      active={settings.allow_cancel_by_client === "true"}
                      onToggle={() => updateSetting("allow_cancel_by_client", settings.allow_cancel_by_client === "true" ? "false" : "true")}
                      title="Permitir cliente cancelar"
                      description="Cliente pode cancelar pelo painel dele (Área do Cliente)."
                      icon={<Ban className="w-4 h-4" />}
                    />
                    <ToggleCard
                      active={settings.allow_reschedule_by_client === "true"}
                      onToggle={() => updateSetting("allow_reschedule_by_client", settings.allow_reschedule_by_client === "true" ? "false" : "true")}
                      title="Permitir reagendamento"
                      description="Cliente pode mudar a data/hora pela própria área."
                      icon={<Calendar className="w-4 h-4" />}
                    />
                    <ToggleCard
                      active={settings.require_login_to_book === "true"}
                      onToggle={() => updateSetting("require_login_to_book", settings.require_login_to_book === "true" ? "false" : "true")}
                      title="Exigir login para agendar"
                      description="Bloqueia agendamento anônimo — cliente precisa criar conta."
                      icon={<Shield className="w-4 h-4" />}
                    />
                    <ToggleCard
                      active={settings.allow_choose_barber === "true"}
                      onToggle={() => updateSetting("allow_choose_barber", settings.allow_choose_barber === "true" ? "false" : "true")}
                      title="Cliente escolhe barbeiro"
                      description="Senão o sistema atribui automaticamente o primeiro disponível."
                      icon={<Eye className="w-4 h-4" />}
                    />
                    <div>
                      <label className={labelStyle}>Cancelamento permitido até (horas antes)</label>
                      <input
                        type="number"
                        min={0}
                        className="glass-input"
                        value={settings.cancel_until_hours || "2"}
                        onChange={(e) => updateSetting("cancel_until_hours", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ---------- COLUNA DIREITA ---------- */}
              <div className="space-y-4 flex flex-col">
                {/* Mensagens (templates inline) */}
                <div className={cardStyle}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Send className="w-4 h-4" style={{ color: iconColor }} /> Mensagens (WhatsApp)
                  </h3>
                  <div className="grid gap-4">
                    {([
                      { key: "msg_on_book", label: "Mensagem ao Agendar" },
                      { key: "msg_on_confirm", label: "Mensagem ao Confirmar" },
                      { key: "msg_reminder", label: "Mensagem de Lembrete" },
                      { key: "review_whatsapp_template", label: "Mensagem de Avaliação (pós-corte)" },
                    ] as { key: TemplateCategory; label: string }[]).map((m) => (
                      <div key={m.key}>
                        <div className="flex items-center justify-between mb-1">
                          <label className={labelStyle + " mb-0"}>{m.label}</label>
                          <TemplatePickerBtn onClick={() => setTemplateCategory(m.key)} />
                        </div>
                        <textarea
                          className="glass-input min-h-[80px] resize-none"
                          value={settings[m.key] || ""}
                          onChange={(e) => updateSetting(m.key, e.target.value)}
                          placeholder="Clique em 'Templates' para usar um modelo profissional"
                        />
                      </div>
                    ))}
                    <p className="text-[10px] text-muted-foreground">
                      Variáveis: <code>{"{cliente}"}</code> <code>{"{servico}"}</code> <code>{"{data}"}</code> <code>{"{hora}"}</code> <code>{"{barbearia}"}</code> <code>{"{barbeiro}"}</code> <code>{"{valor}"}</code> <code>{"{link}"}</code>
                    </p>
                    <ToggleCard
                      active={settings.review_send_enabled !== "false"}
                      onToggle={() => updateSetting("review_send_enabled", settings.review_send_enabled !== "false" ? "false" : "true")}
                      title="Enviar avaliação automaticamente ao concluir"
                      description="Gera token único e envia link no WhatsApp ao marcar agendamento como concluído."
                      icon={<Wand2 className="w-4 h-4" />}
                    />
                  </div>
                </div>

                {/* Políticas */}
                <div className={cardStyle}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4" style={{ color: iconColor }} /> Políticas
                  </h3>
                  <div className="grid gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className={labelStyle + " mb-0"}>Política de Cancelamento</label>
                        <TemplatePickerBtn onClick={() => setTemplateCategory("cancellation_policy")} />
                      </div>
                      <textarea
                        className="glass-input min-h-[80px] resize-none"
                        value={settings.cancellation_policy || ""}
                        onChange={(e) => updateSetting("cancellation_policy", e.target.value)}
                        placeholder="Clique em 'Templates' para escolher um modelo"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className={labelStyle + " mb-0"}>Política de Atraso</label>
                        <TemplatePickerBtn onClick={() => setTemplateCategory("late_policy")} />
                      </div>
                      <textarea
                        className="glass-input min-h-[80px] resize-none"
                        value={settings.late_policy || ""}
                        onChange={(e) => updateSetting("late_policy", e.target.value)}
                        placeholder="Clique em 'Templates' para escolher um modelo"
                      />
                    </div>
                  </div>
                </div>

                {/* Configurações Avançadas */}
                <div className={`${cardStyle} flex-1 flex flex-col`}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Timer className="w-4 h-4" style={{ color: iconColor }} /> Configurações Avançadas
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelStyle}>Buffer mesmo barbeiro (min)</label>
                      <input
                        type="number"
                        min={0}
                        className="glass-input"
                        value={settings.buffer_same_barber || "0"}
                        onChange={(e) => updateSetting("buffer_same_barber", e.target.value)}
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Tempo extra entre clientes do mesmo profissional.</p>
                    </div>
                    <div>
                      <label className={labelStyle}>No-show automático após (min)</label>
                      <input
                        type="number"
                        min={0}
                        className="glass-input"
                        value={settings.no_show_minutes || "15"}
                        onChange={(e) => updateSetting("no_show_minutes", e.target.value)}
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Marca como falta após X minutos de atraso.</p>
                    </div>
                    <div className="col-span-2">
                      <label className={labelStyle}>Dias com agenda fechada</label>
                      <input
                        type="text"
                        className="glass-input"
                        placeholder="Ex: 2026-12-25, 2027-01-01"
                        value={settings.closed_days || ""}
                        onChange={(e) => updateSetting("closed_days", e.target.value)}
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Datas (AAAA-MM-DD) separadas por vírgula.</p>
                    </div>
                    <div className="col-span-2">
                      <ToggleCard
                        active={settings.auto_no_show === "true"}
                        onToggle={() => updateSetting("auto_no_show", settings.auto_no_show === "true" ? "false" : "true")}
                        title="Marcar no-show automaticamente"
                        description="Sistema marca como falta sem ação manual após o tempo configurado."
                        icon={<XCircle className="w-4 h-4" />}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== PERSONALIZAÇÃO ===== */}
          {activeTab === "personalization" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              {/* ---------- COLUNA ESQUERDA ---------- */}
              <div className="space-y-4 flex flex-col">
                {/* Modo do Site */}
                <div className={cardStyle}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Layout className="w-4 h-4" style={{ color: iconColor }} /> Modo do Site
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    O efeito é aplicado imediatamente ao salvar — o visitante verá conforme escolhido.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { value: "full", label: "Site Completo", desc: "Landing + agenda + contato. Tudo visível." },
                      { value: "booking", label: "Agendamento Direto", desc: "Abre direto na tela de agendar." },
                    ].map((mode) => {
                      const active = (settings.site_mode || "full") === mode.value;
                      return (
                        <button key={mode.value} onClick={() => updateSetting("site_mode", mode.value)}
                          className="text-left p-3.5 rounded-xl transition-all"
                          style={{
                            background: active ? "hsl(245 60% 55% / 0.12)" : "hsl(0 0% 100% / 0.025)",
                            border: `1px solid ${active ? "hsl(245 60% 55% / 0.35)" : "hsl(0 0% 100% / 0.06)"}`,
                          }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-3.5 h-3.5 rounded-full border flex items-center justify-center"
                              style={{ borderColor: active ? "hsl(245 60% 70%)" : "hsl(0 0% 40%)", background: active ? "hsl(245 60% 70%)" : "transparent" }}>
                              {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </span>
                            <span className="text-sm font-semibold text-foreground">{mode.label}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-snug">{mode.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Publicação */}
                <div className={cardStyle}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Globe className="w-4 h-4" style={{ color: iconColor }} /> Publicação do Site
                  </h3>
                  <ToggleCard
                    active={sitePublished}
                    onToggle={() => updateSetting("site_published", sitePublished ? "false" : "true")}
                    title={sitePublished ? "Site publicado" : "Site oculto"}
                    description={sitePublished
                      ? "Visitantes podem acessar a URL pública agora."
                      : "URL pública retorna página de manutenção até reativar."}
                    icon={<CheckCircle className="w-4 h-4" />}
                  />
                  <div>
                    <label className={labelStyle}>URL pública</label>
                    <div className="flex gap-2">
                      <code className="flex-1 px-3 py-2.5 rounded-lg text-xs truncate" style={{ background: "hsl(0 0% 100% / 0.04)" }}>
                        {publicUrl || "Defina o slug em Geral"}
                      </code>
                      <button
                        type="button"
                        onClick={() => { if (publicUrl) { navigator.clipboard.writeText(publicUrl); toast.success("Link copiado"); } }}
                        disabled={!publicUrl}
                        className="px-3 rounded-lg disabled:opacity-40"
                        style={{ background: "hsl(245 60% 55% / 0.1)", border: "1px solid hsl(245 60% 55% / 0.2)", color: "hsl(245 60% 70%)" }}
                        title="Copiar"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={publicUrl || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className={`px-3 flex items-center rounded-lg ${!publicUrl ? "opacity-40 pointer-events-none" : ""}`}
                        style={{ background: "hsl(245 60% 55% / 0.1)", border: "1px solid hsl(245 60% 55% / 0.2)", color: "hsl(245 60% 70%)" }}
                        title="Abrir"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Ao clicar em <strong>Salvar Configurações</strong> o status e o modo são publicados automaticamente no roteamento.
                  </p>
                </div>

                {/* Imagem do Hero — compacta inline */}
                <div className={`${cardStyle} flex-1 flex flex-col`}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" style={{ color: iconColor }} /> Imagem do Hero
                  </h3>
                  {(() => {
                    let imgs: string[] = [];
                    try { imgs = JSON.parse(settings.site_hero_images || "[]"); } catch {}
                    const heroImg = imgs[0];
                    return (
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
                          style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px dashed hsl(0 0% 100% / 0.12)" }}>
                          {heroImg ? <img src={heroImg} alt="" className="w-full h-full object-cover"/> : <ImageIcon className="w-5 h-5 text-muted-foreground"/>}
                        </div>
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <label className="flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all"
                            style={{ background: "hsl(245 60% 55% / 0.1)", color: "hsl(245 60% 70%)", border: "1px solid hsl(245 60% 55% / 0.2)" }}>
                            <Upload className="w-3.5 h-3.5" /> {heroImg ? "Trocar" : "Enviar"}
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              const f = e.target.files?.[0]; if (!f) return;
                              const url = await uploadAsset(f, "hero");
                              if (url) { updateSetting("site_hero_images", JSON.stringify([url])); toast.success("Hero atualizado"); }
                            }}/>
                          </label>
                          {heroImg && (
                            <button type="button" onClick={() => updateSetting("site_hero_images", "[]")}
                              className="px-3 py-2 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-destructive transition"
                              style={{ border: "1px solid hsl(0 0% 100% / 0.06)" }}>Remover</button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  <p className="text-[10px] text-muted-foreground">Formato 4:5 funciona melhor · Máx 4MB</p>
                </div>
              </div>

              {/* ---------- COLUNA DIREITA ---------- */}
              <div className="space-y-4 flex flex-col">
                {/* Textos do Site */}
                <div className={cardStyle}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Type className="w-4 h-4" style={{ color: iconColor }} /> Textos do Site
                  </h3>
                  <div className="grid gap-3">
                    <div>
                      <label className={labelStyle}>Título Principal (Hero)</label>
                      <input className="glass-input" value={settings.hero_title || ""} onChange={(e) => updateSetting("hero_title", e.target.value)} placeholder="Ex: GenesisBarber" />
                    </div>
                    <div>
                      <label className={labelStyle}>Subtítulo do Hero</label>
                      <input className="glass-input" value={settings.hero_subtitle || ""} onChange={(e) => updateSetting("hero_subtitle", e.target.value)} placeholder="Ex: Barbearia Premium" />
                    </div>
                    <div>
                      <label className={labelStyle}>Descrição do Hero</label>
                      <textarea className="glass-input min-h-[70px] resize-none" value={settings.hero_description || ""} onChange={(e) => updateSetting("hero_description", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelStyle}>Título Sobre</label>
                      <input className="glass-input" value={settings.about_title || ""} onChange={(e) => updateSetting("about_title", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelStyle}>Descrição Sobre</label>
                      <textarea className="glass-input min-h-[80px] resize-none" value={settings.about_description || ""} onChange={(e) => updateSetting("about_description", e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Galeria (upload múltiplo) */}
                <div className={cardStyle}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" style={{ color: iconColor }} /> Galeria
                  </h3>
                  {(() => {
                    let gallery: string[] = [];
                    try { gallery = JSON.parse(settings.site_gallery || "[]"); if (!Array.isArray(gallery)) gallery = []; } catch { gallery = []; }
                    return (
                      <>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {gallery.map((url, i) => (
                            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden"
                              style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                              <img src={url} alt="" className="w-full h-full object-cover" />
                              <button type="button"
                                onClick={() => updateSetting("site_gallery", JSON.stringify(gallery.filter((_, j) => j !== i)))}
                                className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                                style={{ background: "hsl(0 0% 0% / 0.7)" }}>
                                <Trash2 className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          ))}
                          <label className="aspect-square rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer transition hover:bg-white/5"
                            style={{ background: "hsl(0 0% 100% / 0.025)", border: "1px dashed hsl(0 0% 100% / 0.15)" }}>
                            <Plus className="w-5 h-5 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">Enviar</span>
                            <input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
                              const files = Array.from(e.target.files || []);
                              const uploaded: string[] = [];
                              for (const f of files) {
                                const url = await uploadAsset(f, "gallery");
                                if (url) uploaded.push(url);
                              }
                              if (uploaded.length) {
                                updateSetting("site_gallery", JSON.stringify([...gallery, ...uploaded]));
                                toast.success(`${uploaded.length} imagem(ns) adicionada(s)`);
                              }
                              e.target.value = "";
                            }}/>
                          </label>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{gallery.length} imagem(ns) · clique no X para remover</p>
                      </>
                    );
                  })()}
                </div>

                {/* SEO */}
                <div className={`${cardStyle} flex-1 flex flex-col`}>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Globe className="w-4 h-4" style={{ color: iconColor }} /> SEO
                  </h3>
                  <div className="grid gap-3">
                    <div>
                      <label className={labelStyle}>SEO Title (≤60 caracteres)</label>
                      <input
                        className="glass-input"
                        maxLength={60}
                        value={settings.site_seo_title || ""}
                        onChange={(e) => updateSetting("site_seo_title", e.target.value)}
                        placeholder="Nome | Barbearia em..."
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">{(settings.site_seo_title || "").length}/60</p>
                    </div>
                    <div>
                      <label className={labelStyle}>SEO Description (≤160 caracteres)</label>
                      <textarea
                        className="glass-input min-h-[60px] resize-none"
                        maxLength={160}
                        value={settings.site_seo_description || ""}
                        onChange={(e) => updateSetting("site_seo_description", e.target.value)}
                        placeholder="Descrição para Google e redes sociais"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">{(settings.site_seo_description || "").length}/160</p>
                    </div>
                    <div>
                      <label className={labelStyle}>OG Image</label>
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
                          style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px dashed hsl(0 0% 100% / 0.12)" }}>
                          {settings.site_seo_og_image
                            ? <img src={settings.site_seo_og_image} alt="" className="w-full h-full object-cover"/>
                            : <ImageIcon className="w-5 h-5 text-muted-foreground"/>}
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <label className="w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all"
                            style={{ background: "hsl(245 60% 55% / 0.1)", color: "hsl(245 60% 70%)", border: "1px solid hsl(245 60% 55% / 0.2)" }}>
                            <Upload className="w-3.5 h-3.5" /> {settings.site_seo_og_image ? "Trocar OG image" : "Enviar OG image"}
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              const f = e.target.files?.[0]; if (!f) return;
                              const url = await uploadAsset(f, "og");
                              if (url) { updateSetting("site_seo_og_image", url); toast.success("OG image atualizada"); }
                            }}/>
                          </label>
                          {settings.site_seo_og_image && (
                            <button type="button" onClick={() => updateSetting("site_seo_og_image", "")}
                              className="w-full py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-destructive transition"
                              style={{ border: "1px solid hsl(0 0% 100% / 0.06)" }}>Remover</button>
                          )}
                          <p className="text-[10px] text-muted-foreground leading-snug">Recomendado 1200×630 · Máx 4MB</p>
                        </div>
                      </div>
                    </div>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              <div className={`${cardStyle} h-full flex flex-col`}>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4" style={{ color: iconColor }} /> Domínio e Identificação
                </h3>
                <div className="grid gap-4 flex-1">
                  <div>
                    <label className={labelStyle}>Slug (identificador)</label>
                    <input
                      className="glass-input"
                      value={settings.tenant_slug || ""}
                      onChange={(e) => updateSetting("tenant_slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="vilanova"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Apenas letras minúsculas, números e hífens. Identificador único do tenant.
                    </p>
                    {settings.tenant_slug && !/^[a-z0-9-]+$/.test(settings.tenant_slug) && (
                      <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Formato inválido
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={labelStyle}>Domínio Personalizado</label>
                    <input
                      className="glass-input"
                      value={settings.custom_domain || ""}
                      onChange={(e) => updateSetting("custom_domain", e.target.value.trim().toLowerCase())}
                      placeholder="www.suabarbearia.com.br"
                    />
                    {settings.custom_domain && (
                      <a
                        href={`https://${settings.custom_domain.replace(/^https?:\/\//, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-muted-foreground hover:text-foreground mt-1 inline-flex items-center gap-1"
                      >
                        <Globe className="w-3 h-3" /> Abrir domínio
                      </a>
                    )}
                  </div>
                  <div className="rounded-xl p-3" style={{ background: "hsl(0 0% 100% / 0.025)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                    <label className={labelStyle}>Domínio atual da hospedagem</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-[11px] px-2.5 py-2 rounded-lg truncate" style={{ background: "hsl(0 0% 100% / 0.04)" }}>
                        {currentHost || "—"}
                      </code>
                      <button
                        type="button"
                        onClick={() => { if (currentHost) { navigator.clipboard.writeText(currentHost); toast.success("Copiado"); } }}
                        className="px-2.5 py-2 rounded-lg"
                        style={{ background: "hsl(245 60% 55% / 0.1)", color: "hsl(245 60% 70%)", border: "1px solid hsl(245 60% 55% / 0.2)" }}
                        title="Copiar"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (currentHost) updateSetting("custom_domain", currentHost); }}
                        className="px-2.5 py-2 rounded-lg text-[11px] font-semibold"
                        style={{ background: "hsl(140 60% 45% / 0.12)", color: "hsl(140 60% 65%)", border: "1px solid hsl(140 60% 45% / 0.25)" }}
                      >
                        Usar
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
                      Detectado automaticamente. Use somente se este domínio aponta para esta barbearia.
                    </p>
                  </div>
                </div>
              </div>

              <div className={`${cardStyle} h-full flex flex-col`}>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Settings2 className="w-4 h-4" style={{ color: iconColor }} /> Preferências
                </h3>
                <div className="grid gap-4 flex-1">
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
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {(settings.site_status || "ativo") === "inativo"
                        ? "Site público exibirá página de manutenção."
                        : "Site público acessível normalmente."}
                    </p>
                  </div>
                  <div>
                    <label className={labelStyle}>Link Google Maps</label>
                    <input
                      className="glass-input"
                      value={settings.google_maps_link || ""}
                      onChange={(e) => updateSetting("google_maps_link", e.target.value.trim())}
                      placeholder="https://maps.google.com/..."
                    />
                    {settings.google_maps_link && (
                      <a
                        href={settings.google_maps_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-muted-foreground hover:text-foreground mt-1 inline-flex items-center gap-1"
                      >
                        <MapPin className="w-3 h-3" /> Testar link
                      </a>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Usado no botão "Como chegar" no rodapé do site.
                    </p>
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

      <MessageTemplatesModal
        open={!!templateCategory}
        category={templateCategory}
        onOpenChange={(v) => { if (!v) setTemplateCategory(null); }}
        onPick={(body) => { if (templateCategory) updateSetting(templateCategory, body); }}
      />
    </div>
  );
};

export default Settings;
