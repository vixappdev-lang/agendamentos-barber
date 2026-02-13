import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Save, ShoppingBag, CreditCard, Smartphone, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

const StoreSettings = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("business_settings").select("*");
      if (data) {
        const map: Record<string, string> = {};
        for (const row of data) map[row.key] = row.value || "";
        setSettings(map);
      }
    };
    fetch();
  }, []);

  const update = (key: string, value: string) => setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const keys = ["store_enabled", "store_order_mode", "pix_key", "pix_type"];
    const promises = keys.map((key) =>
      supabase.from("business_settings").upsert({ key, value: settings[key] || "" }, { onConflict: "key" })
    );
    await Promise.all(promises);
    setSaving(false);
    setSaved(true);
    toast.success("Configurações da loja salvas! ✅");
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Store toggle */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-4 h-4" style={{ color: "hsl(245 60% 65%)" }} />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Loja / Marketplace</h3>
              <p className="text-[11px] text-muted-foreground">Ativar seção de produtos para venda</p>
            </div>
          </div>
          <button
            onClick={() => update("store_enabled", settings.store_enabled === "true" ? "false" : "true")}
            className="w-12 h-7 rounded-full transition-all duration-200 relative"
            style={{ background: settings.store_enabled === "true" ? "hsl(245 60% 55%)" : "hsl(0 0% 100% / 0.1)" }}
          >
            <div
              className="absolute top-1.5 w-4 h-4 rounded-full bg-white transition-all duration-200"
              style={{ left: settings.store_enabled === "true" ? "28px" : "4px" }}
            />
          </button>
        </div>
      </motion.div>

      {/* Order mode */}
      {settings.store_enabled === "true" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="w-4 h-4" style={{ color: "hsl(245 60% 65%)" }} /> Modo de Pedido & PIX
          </h3>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Modo de Pedido</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => update("store_order_mode", "ifood")}
                className="flex items-center gap-2 p-3 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: settings.store_order_mode === "ifood" ? "hsl(245 60% 55% / 0.1)" : "hsl(0 0% 100% / 0.03)",
                  border: `1.5px solid ${settings.store_order_mode === "ifood" ? "hsl(245 60% 55% / 0.4)" : "hsl(0 0% 100% / 0.08)"}`,
                  color: settings.store_order_mode === "ifood" ? "hsl(245 60% 70%)" : "hsl(0 0% 55%)",
                }}
              >
                <ShoppingCart className="w-4 h-4" /> Similar ao iFood
              </button>
              <button
                onClick={() => update("store_order_mode", "whatsapp")}
                className="flex items-center gap-2 p-3 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: settings.store_order_mode === "whatsapp" ? "hsl(245 60% 55% / 0.1)" : "hsl(0 0% 100% / 0.03)",
                  border: `1.5px solid ${settings.store_order_mode === "whatsapp" ? "hsl(245 60% 55% / 0.4)" : "hsl(0 0% 100% / 0.08)"}`,
                  color: settings.store_order_mode === "whatsapp" ? "hsl(245 60% 70%)" : "hsl(0 0% 55%)",
                }}
              >
                <Smartphone className="w-4 h-4" /> Via WhatsApp
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Tipo Chave PIX</label>
              <select
                className="glass-input text-sm"
                value={settings.pix_type || "cpf"}
                onChange={(e) => update("pix_type", e.target.value)}
              >
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
                <option value="email">Email</option>
                <option value="telefone">Telefone</option>
                <option value="aleatoria">Chave Aleatória</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Chave PIX</label>
              <input
                className="glass-input text-sm"
                value={settings.pix_key || ""}
                onChange={(e) => update("pix_key", e.target.value)}
                placeholder="Sua chave PIX"
              />
            </div>
          </div>
        </motion.div>
      )}

      <motion.button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        style={{
          background: saved ? "hsl(140 60% 45%)" : "hsl(245 60% 55%)",
          color: "white",
        }}
        animate={{ scale: saved ? [1, 1.03, 1] : 1 }}
        whileTap={{ scale: 0.98 }}
      >
        <Save className="w-4 h-4" /> {saving ? "Salvando..." : saved ? "Salvo ✓" : "Salvar Configurações"}
      </motion.button>
    </div>
  );
};

export default StoreSettings;
