import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Store, Phone, Clock, MapPin, CalendarOff, Map, ShoppingBag, CreditCard, Smartphone, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import LocationPickerModal from "@/components/LocationPickerModal";

const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const Settings = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from("business_settings").select("*");
    if (data) {
      const map: Record<string, string> = {};
      for (const row of data) map[row.key] = row.value || "";
      setSettings(map);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings({ ...settings, [key]: value });
  };

  const toggleDayOff = (dayIndex: number) => {
    const current = (settings.days_off || "").split(",").filter(Boolean);
    const dayStr = String(dayIndex);
    const updated = current.includes(dayStr) ? current.filter(d => d !== dayStr) : [...current, dayStr];
    updateSetting("days_off", updated.join(","));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const keysToSave = { ...settings };
    const allKeys = ["business_name", "address", "whatsapp_number", "opening_time", "closing_time", "lunch_start", "lunch_end", "days_off", "location_lat", "location_lng", "store_enabled", "store_order_mode", "pix_key", "pix_type"];
    
    const promises = Object.entries(keysToSave).map(([key, value]) =>
      supabase.from("business_settings").upsert({ key, value }, { onConflict: "key" })
    );
    await Promise.all(promises);
    setSaving(false);
    setSaved(true);
    toast.success("Configurações salvas com sucesso! ✅");
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLocationConfirm = (address: string, lat: string, lng: string) => {
    setSettings(prev => ({ ...prev, address, location_lat: lat, location_lng: lng }));
    setShowMap(false);
  };

  const daysOff = (settings.days_off || "").split(",").filter(Boolean);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-foreground">Configurações</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column: Dados da Barbearia */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, scale: saved ? [1, 1.02, 1] : 1, borderColor: saved ? 'hsl(140 60% 50% / 0.4)' : 'transparent' }} transition={{ duration: 0.4 }} className="glass-card p-5 space-y-5" style={{ border: '1px solid transparent' }}>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Store className="w-4 h-4" style={{ color: 'hsl(245 60% 65%)' }} /> Dados da Barbearia
          </h3>
          <div className="grid gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Nome da Barbearia</label>
              <input className="glass-input" value={settings.business_name || ""} onChange={(e) => updateSetting("business_name", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Endereço
              </label>
              <input className="glass-input" value={settings.address || ""} onChange={(e) => updateSetting("address", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block flex items-center gap-1">
                <Map className="w-3 h-3" /> Localização no Mapa
              </label>
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
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block flex items-center gap-1">
                <Phone className="w-3 h-3" /> WhatsApp (com DDI+DDD)
              </label>
              <input className="glass-input" value={settings.whatsapp_number || ""} onChange={(e) => updateSetting("whatsapp_number", e.target.value)} placeholder="5511999999999" />
            </div>
          </div>
        </motion.div>

        {/* Right column: Horário + Dias de Folga stacked */}
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, scale: saved ? [1, 1.02, 1] : 1, borderColor: saved ? 'hsl(140 60% 50% / 0.4)' : 'transparent' }} transition={{ delay: 0.1, duration: 0.4 }} className="glass-card p-5 space-y-5" style={{ border: '1px solid transparent' }}>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: 'hsl(245 60% 65%)' }} /> Horário de Funcionamento
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Abertura</label>
                <input type="time" className="glass-input" value={settings.opening_time || "09:00"} onChange={(e) => updateSetting("opening_time", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Fechamento</label>
                <input type="time" className="glass-input" value={settings.closing_time || "19:00"} onChange={(e) => updateSetting("closing_time", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Início Almoço</label>
                <input type="time" className="glass-input" value={settings.lunch_start || "12:00"} onChange={(e) => updateSetting("lunch_start", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Fim Almoço</label>
                <input type="time" className="glass-input" value={settings.lunch_end || "13:00"} onChange={(e) => updateSetting("lunch_end", e.target.value)} />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, scale: saved ? [1, 1.02, 1] : 1, borderColor: saved ? 'hsl(140 60% 50% / 0.4)' : 'transparent' }} transition={{ delay: 0.2, duration: 0.4 }} className="glass-card p-5 space-y-4" style={{ border: '1px solid transparent' }}>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CalendarOff className="w-4 h-4" style={{ color: 'hsl(245 60% 65%)' }} /> Dias de Folga
            </h3>
            <div className="flex gap-2">
              {dayLabels.map((label, i) => (
                <button key={i} onClick={() => toggleDayOff(i)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: daysOff.includes(String(i)) ? 'hsl(0 60% 50% / 0.15)' : 'hsl(0 0% 100% / 0.04)',
                    color: daysOff.includes(String(i)) ? 'hsl(0 60% 65%)' : 'hsl(0 0% 55%)',
                    border: `1px solid ${daysOff.includes(String(i)) ? 'hsl(0 60% 50% / 0.3)' : 'hsl(0 0% 100% / 0.06)'}`,
                  }}>
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">Clique nos dias em que a barbearia não funciona</p>
          </motion.div>
        </div>

        {/* Store Toggle */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="glass-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-4 h-4" style={{ color: 'hsl(245 60% 65%)' }} />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Loja / Marketplace</h3>
                <p className="text-[11px] text-muted-foreground">Ativar seção de produtos para venda</p>
              </div>
            </div>
            <button
              onClick={() => updateSetting("store_enabled", settings.store_enabled === "true" ? "false" : "true")}
              className="w-12 h-7 rounded-full transition-all duration-200 relative"
              style={{ background: settings.store_enabled === "true" ? 'hsl(245 60% 55%)' : 'hsl(0 0% 100% / 0.1)' }}>
              <div className="absolute top-1.5 w-4 h-4 rounded-full bg-white transition-all duration-200" style={{ left: settings.store_enabled === "true" ? '28px' : '4px' }} />
            </button>
          </div>
        </motion.div>

        {/* Store Order Mode */}
        {settings.store_enabled === "true" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="glass-card p-5 lg:col-span-2 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4" style={{ color: 'hsl(245 60% 65%)' }} /> Configurações da Loja
            </h3>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Modo de Pedido</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => updateSetting("store_order_mode", "ifood")}
                  className="flex items-center gap-2 p-3 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: settings.store_order_mode === "ifood" ? "hsl(245 60% 55% / 0.1)" : "hsl(0 0% 100% / 0.03)",
                    border: `1.5px solid ${settings.store_order_mode === "ifood" ? "hsl(245 60% 55% / 0.4)" : "hsl(0 0% 100% / 0.08)"}`,
                    color: settings.store_order_mode === "ifood" ? "hsl(245 60% 70%)" : "hsl(0 0% 55%)",
                  }}>
                  <ShoppingCart className="w-4 h-4" /> Similar ao iFood
                </button>
                <button onClick={() => updateSetting("store_order_mode", "whatsapp")}
                  className="flex items-center gap-2 p-3 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: settings.store_order_mode === "whatsapp" ? "hsl(245 60% 55% / 0.1)" : "hsl(0 0% 100% / 0.03)",
                    border: `1.5px solid ${settings.store_order_mode === "whatsapp" ? "hsl(245 60% 55% / 0.4)" : "hsl(0 0% 100% / 0.08)"}`,
                    color: settings.store_order_mode === "whatsapp" ? "hsl(245 60% 70%)" : "hsl(0 0% 55%)",
                  }}>
                  <Smartphone className="w-4 h-4" /> Via WhatsApp
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Tipo Chave PIX</label>
                <select className="glass-input text-sm" value={settings.pix_type || "cpf"} onChange={(e) => updateSetting("pix_type", e.target.value)}>
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="email">Email</option>
                  <option value="telefone">Telefone</option>
                  <option value="aleatoria">Chave Aleatória</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Chave PIX</label>
                <input className="glass-input text-sm" value={settings.pix_key || ""} onChange={(e) => updateSetting("pix_key", e.target.value)} placeholder="Sua chave PIX" />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <motion.button
        onClick={handleSave} disabled={saving}
        className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        style={{ 
          background: saved ? 'hsl(140 60% 45%)' : 'hsl(245 60% 55%)', 
          color: 'white', 
          boxShadow: saved ? '0 4px 20px hsl(140 60% 45% / 0.25)' : '0 4px 20px hsl(245 60% 55% / 0.25)' 
        }}
        animate={{ scale: saved ? [1, 1.03, 1] : 1 }}
        transition={{ duration: 0.3 }}
        whileTap={{ scale: 0.98 }}>
        <Save className="w-4 h-4" /> {saving ? "Salvando..." : saved ? "Salvo ✓" : "Salvar Configurações"}
      </motion.button>

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
