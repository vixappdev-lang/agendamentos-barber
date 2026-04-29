import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Globe, Palette, Image as ImageIcon, FileText, MapPin, Clock, Search,
  Copy, ExternalLink, Loader2, Check, Power, Sparkles, Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  settings: Record<string, string>;
  updateSetting: (key: string, value: string) => void;
  barbershopId?: string | null;
  barbershopSlug?: string | null;
  initialSiteMode?: "full" | "booking";
  initialSitePublished?: boolean;
}

const card = "rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-5 space-y-4";
const lbl = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";
const input = "w-full glass-input";

const SettingsSiteTab = ({
  settings, updateSetting, barbershopId, barbershopSlug,
  initialSiteMode = "full", initialSitePublished = true,
}: Props) => {
  const [siteMode, setSiteMode] = useState<"full" | "booking">(initialSiteMode);
  const [sitePublished, setSitePublished] = useState<boolean>(initialSitePublished);
  const [savingRouting, setSavingRouting] = useState(false);

  useEffect(() => { setSiteMode(initialSiteMode); }, [initialSiteMode]);
  useEffect(() => { setSitePublished(initialSitePublished); }, [initialSitePublished]);

  const publicUrl = barbershopSlug
    ? `${window.location.origin}/s/${barbershopSlug}`
    : "";

  const saveRouting = async () => {
    if (!barbershopId) { toast.error("Perfil ainda não vinculado"); return; }
    setSavingRouting(true);
    const { error } = await supabase
      .from("barbershop_profiles")
      .update({ site_mode: siteMode, site_published: sitePublished })
      .eq("id", barbershopId);
    setSavingRouting(false);
    if (error) toast.error(error.message);
    else toast.success("Publicação salva ✅");
  };

  const copyUrl = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link copiado");
  };

  const uploadImage = async (file: File, key: string) => {
    if (!file.type.startsWith("image/")) { toast.error("Arquivo inválido"); return; }
    if (file.size > 4 * 1024 * 1024) { toast.error("Máx 4MB"); return; }
    const ext = file.name.split(".").pop();
    const fileName = `site-${key}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("public-assets").upload(fileName, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data: u } = supabase.storage.from("public-assets").getPublicUrl(fileName);
    updateSetting(key, u.publicUrl);
    toast.success("Imagem enviada");
  };

  const colorField = (k: string, label: string) => (
    <label className="block">
      <span className={lbl}>{label}</span>
      <div className="mt-1.5 flex gap-2 items-center">
        <input type="color"
          value={settings[k] || "#6E59F2"}
          onChange={(e) => updateSetting(k, e.target.value)}
          className="w-12 h-10 rounded-lg border border-border bg-transparent cursor-pointer" />
        <input className={input} value={settings[k] || ""} onChange={(e) => updateSetting(k, e.target.value)} placeholder="#RRGGBB"/>
      </div>
    </label>
  );

  const text = (k: string, label: string, ph?: string) => (
    <label className="block">
      <span className={lbl}>{label}</span>
      <input className={`${input} mt-1.5`} value={settings[k] || ""} onChange={(e) => updateSetting(k, e.target.value)} placeholder={ph}/>
    </label>
  );

  const area = (k: string, label: string, ph?: string) => (
    <label className="block">
      <span className={lbl}>{label}</span>
      <textarea className={`${input} mt-1.5 min-h-[100px] resize-none`} value={settings[k] || ""} onChange={(e) => updateSetting(k, e.target.value)} placeholder={ph}/>
    </label>
  );

  const imageField = (k: string, label: string) => (
    <div>
      <span className={lbl}>{label}</span>
      <div className="mt-1.5 flex gap-3 items-start">
        <div className="w-20 h-20 rounded-xl border border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
          {settings[k] ? <img src={settings[k]} alt="" className="w-full h-full object-cover"/> : <ImageIcon className="w-6 h-6 text-muted-foreground"/>}
        </div>
        <div className="flex-1 space-y-2">
          <input className={input} value={settings[k] || ""} onChange={(e) => updateSetting(k, e.target.value)} placeholder="https://..."/>
          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card/60 text-xs cursor-pointer hover:bg-muted/40">
            <Upload className="w-3.5 h-3.5"/> Enviar
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, k); }}/>
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

      {/* PUBLICAÇÃO — vai para Cloud (roteamento) */}
      <div className={card}>
        <h3 className="text-sm font-semibold flex items-center gap-2"><Globe className="w-4 h-4"/> Publicação</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Power className="w-4 h-4"/><span className="text-sm font-medium">Site publicado</span>
              </div>
              <input type="checkbox" checked={sitePublished} onChange={(e) => setSitePublished(e.target.checked)} className="w-4 h-4"/>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setSiteMode("full")}
                className={`rounded-xl border p-3 text-left transition ${siteMode === "full" ? "border-primary/50 bg-primary/10" : "border-border bg-card/40 hover:bg-muted/30"}`}>
                <Sparkles className="w-4 h-4 mb-1"/>
                <p className="text-sm font-semibold">Site completo</p>
                <p className="text-[11px] text-muted-foreground">Landing + agenda + contato</p>
              </button>
              <button onClick={() => setSiteMode("booking")}
                className={`rounded-xl border p-3 text-left transition ${siteMode === "booking" ? "border-primary/50 bg-primary/10" : "border-border bg-card/40 hover:bg-muted/30"}`}>
                <Clock className="w-4 h-4 mb-1"/>
                <p className="text-sm font-semibold">Agendamento direto</p>
                <p className="text-[11px] text-muted-foreground">Abre direto na agenda</p>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <span className={lbl}>URL pública</span>
              <div className="mt-1.5 flex gap-2">
                <code className="flex-1 px-3 py-2.5 rounded-lg bg-muted/40 text-xs truncate">{publicUrl || "—"}</code>
                <button onClick={copyUrl} disabled={!publicUrl} className="p-2.5 rounded-lg border border-border hover:bg-muted/40 disabled:opacity-40"><Copy className="w-4 h-4"/></button>
                <a href={publicUrl || "#"} target="_blank" rel="noreferrer" className={`p-2.5 rounded-lg border border-border hover:bg-muted/40 ${!publicUrl ? "opacity-40 pointer-events-none" : ""}`}><ExternalLink className="w-4 h-4"/></a>
              </div>
            </div>
            <button onClick={saveRouting} disabled={savingRouting || !barbershopId}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {savingRouting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
              Salvar publicação
            </button>
          </div>
        </div>
      </div>

      {/* IDENTIDADE VISUAL */}
      <div className={card}>
        <h3 className="text-sm font-semibold flex items-center gap-2"><Palette className="w-4 h-4"/> Identidade Visual</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {imageField("site_logo_url", "Logo")}
          {imageField("site_favicon_url", "Favicon")}
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {colorField("site_primary", "Cor Primária")}
          {colorField("site_accent", "Cor de Acento")}
          {colorField("site_bg", "Cor de Fundo")}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {text("site_font_heading", "Fonte títulos", "Playfair Display")}
          {text("site_font_body", "Fonte corpo", "Inter")}
        </div>
      </div>

      {/* HERO */}
      <div className={card}>
        <h3 className="text-sm font-semibold flex items-center gap-2"><ImageIcon className="w-4 h-4"/> Hero (capa)</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {text("site_hero_title", "Título principal", "Bem-vindo")}
          {text("site_hero_subtitle", "Subtítulo", "Barbearia Premium")}
        </div>
        {area("site_hero_description", "Descrição curta", "Cortes modernos…")}
        {imageField("site_hero_images", "Imagem do hero (URL única no JSON)")}
      </div>

      {/* SOBRE + GALERIA */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className={card}>
          <h3 className="text-sm font-semibold flex items-center gap-2"><FileText className="w-4 h-4"/> Sobre</h3>
          {text("site_about_title", "Título", "Sobre nós")}
          {area("site_about_description", "Descrição", "Conte sua história…")}
        </div>
        <div className={card}>
          <h3 className="text-sm font-semibold flex items-center gap-2"><ImageIcon className="w-4 h-4"/> Galeria</h3>
          {area("site_gallery", "URLs das imagens (JSON array)", '["https://...", "https://..."]')}
          <p className="text-[11px] text-muted-foreground">Cole URLs separadas em formato JSON. Em breve: upload múltiplo.</p>
        </div>
      </div>

      {/* CONTATO + HORÁRIOS */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className={card}>
          <h3 className="text-sm font-semibold flex items-center gap-2"><MapPin className="w-4 h-4"/> Contato</h3>
          {text("whatsapp_number", "WhatsApp (DDI+DDD)", "5527999999999")}
          {text("instagram", "Instagram", "@suabarbearia")}
          {text("address", "Endereço", "Rua…, 100")}
          {text("google_maps_link", "Google Maps", "https://maps.app.goo.gl/...")}
        </div>
        <div className={card}>
          <h3 className="text-sm font-semibold flex items-center gap-2"><Clock className="w-4 h-4"/> Horários</h3>
          <div className="grid grid-cols-2 gap-3">
            {text("opening_time", "Abertura", "09:00")}
            {text("closing_time", "Fechamento", "19:00")}
            {text("lunch_start", "Almoço início", "12:00")}
            {text("lunch_end", "Almoço fim", "13:00")}
          </div>
          {text("days_off", "Dias off (ex: 0,6)", "0")}
        </div>
      </div>

      {/* SEO */}
      <div className={card}>
        <h3 className="text-sm font-semibold flex items-center gap-2"><Search className="w-4 h-4"/> SEO</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {text("site_seo_title", "Title (≤60)", "Nome | Barbearia em…")}
          {text("site_seo_og_image", "OG image (URL)", "https://...")}
        </div>
        {area("site_seo_description", "Description (≤160)", "Descrição para Google e redes sociais")}
      </div>

      <p className="text-[11px] text-muted-foreground text-center pt-2">
        Identidade, hero, contato, horários e SEO são salvos no botão geral “Salvar Configurações”.
        Só publicação/modo do site usam o botão dedicado acima.
      </p>
    </motion.div>
  );
};

export default SettingsSiteTab;
