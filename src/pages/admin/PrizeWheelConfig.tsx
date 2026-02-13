import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, Save, Gift, Upload, Image } from "lucide-react";
import { toast } from "sonner";

interface SliceRow {
  id: string;
  label: string;
  icon: string;
  image_url: string | null;
  discount_percent: number | null;
  discount_value: number | null;
  custom_prize: string | null;
  probability: number;
  active: boolean;
  sort_order: number;
}

const emptyForm = { label: "", icon: "🎁", image_url: "", discount_percent: 0, discount_value: 0, custom_prize: "", probability: 10, active: true, sort_order: 0 };

const PrizeWheelConfig = () => {
  const [slices, setSlices] = useState<SliceRow[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [wheelEnabled, setWheelEnabled] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchSlices(); fetchEnabled(); }, []);

  const fetchSlices = async () => {
    const { data } = await supabase.from("prize_wheel_slices").select("*").order("sort_order");
    setSlices((data as SliceRow[]) || []);
  };

  const fetchEnabled = async () => {
    const { data } = await supabase.from("business_settings").select("value").eq("key", "prize_wheel_enabled").maybeSingle();
    setWheelEnabled(data?.value === "true");
  };

  const toggleEnabled = async () => {
    const newVal = !wheelEnabled;
    await supabase.from("business_settings").update({ value: newVal ? "true" : "false" }).eq("key", "prize_wheel_enabled");
    setWheelEnabled(newVal);
    toast.success(newVal ? "Roleta ativada!" : "Roleta desativada!");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("prize-wheel-images").upload(path, file);
    if (error) { toast.error("Erro no upload"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("prize-wheel-images").getPublicUrl(path);
    setForm({ ...form, image_url: urlData.publicUrl });
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.label) { toast.error("Preencha o nome do prêmio"); return; }
    const payload: any = {
      label: form.label,
      icon: form.icon,
      image_url: form.image_url || null,
      discount_percent: form.discount_percent || null,
      discount_value: form.discount_value || null,
      custom_prize: form.custom_prize || null,
      probability: form.probability,
      active: form.active,
      sort_order: form.sort_order,
    };

    if (editing) {
      const { error } = await supabase.from("prize_wheel_slices").update(payload).eq("id", editing);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Prêmio atualizado!");
    } else {
      const { error } = await supabase.from("prize_wheel_slices").insert(payload);
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Prêmio criado!");
    }
    setShowModal(false); setEditing(null); setForm(emptyForm); fetchSlices();
  };

  const handleEdit = (s: SliceRow) => {
    setForm({
      label: s.label, icon: s.icon, image_url: s.image_url || "",
      discount_percent: Number(s.discount_percent) || 0,
      discount_value: Number(s.discount_value) || 0,
      custom_prize: s.custom_prize || "",
      probability: s.probability, active: s.active, sort_order: s.sort_order,
    });
    setEditing(s.id); setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este prêmio?")) return;
    const { error } = await supabase.from("prize_wheel_slices").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Prêmio excluído!"); fetchSlices();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-foreground">Roleta Premiada</h2>
          <button onClick={toggleEnabled}
            className="w-10 h-6 rounded-full transition-all duration-200 relative"
            style={{ background: wheelEnabled ? 'hsl(245 60% 55%)' : 'hsl(0 0% 100% / 0.1)' }}>
            <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200" style={{ left: wheelEnabled ? '22px' : '2px' }} />
          </button>
        </div>
        <button onClick={() => { setForm(emptyForm); setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{ background: 'hsl(245 60% 55%)', color: 'white' }}>
          <Plus className="w-4 h-4" /> Novo Prêmio
        </button>
      </div>

      <div className="grid gap-3">
        {slices.map((s) => (
          <motion.div key={s.id} layout className="glass-card p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 overflow-hidden" style={{ background: 'hsl(245 60% 55% / 0.1)' }}>
              {s.image_url ? (
                <img src={s.image_url} alt={s.label} className="w-full h-full object-cover rounded-xl" />
              ) : (
                s.icon
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground truncate">{s.label}</h3>
                {!s.active && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'hsl(0 60% 50% / 0.15)', color: 'hsl(0 60% 65%)' }}>Inativo</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                {s.discount_percent ? <span className="text-xs" style={{ color: 'hsl(245 60% 70%)' }}>{Number(s.discount_percent)}% desc.</span> : null}
                {s.discount_value ? <span className="text-xs" style={{ color: 'hsl(245 60% 70%)' }}>R$ {Number(s.discount_value).toFixed(2)} desc.</span> : null}
                {s.custom_prize ? <span className="text-xs text-muted-foreground">{s.custom_prize}</span> : null}
                <span className="text-[10px] text-muted-foreground">Prob: {s.probability}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => handleEdit(s)} className="p-2 rounded-lg" style={{ background: 'hsl(0 0% 100% / 0.05)' }}>
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </button>
              <button onClick={() => handleDelete(s.id)} className="p-2 rounded-lg" style={{ background: 'hsl(0 60% 50% / 0.1)' }}>
                <Trash2 className="w-4 h-4" style={{ color: 'hsl(0 60% 60%)' }} />
              </button>
            </div>
          </motion.div>
        ))}
        {slices.length === 0 && (
          <div className="glass-card p-8 text-center">
            <Gift className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum prêmio configurado</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card-strong w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto scrollbar-hide"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">{editing ? "Editar Prêmio" : "Novo Prêmio"}</h3>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Nome *</label>
                  <input className="glass-input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex: 10% OFF" />
                </div>

                {/* Image upload */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Imagem do Prêmio</label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center shrink-0"
                      style={{ background: "hsl(0 0% 100% / 0.04)", border: "1px solid hsl(0 0% 100% / 0.08)" }}>
                      {form.image_url ? (
                        <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">{form.icon}</span>
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                        style={{ background: "hsl(245 60% 55% / 0.1)", color: "hsl(245 60% 70%)", border: "1px solid hsl(245 60% 55% / 0.2)" }}>
                        <Upload className="w-3.5 h-3.5" />
                        {uploading ? "Enviando..." : "Upload Imagem"}
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                      </label>
                      {form.image_url && (
                        <button onClick={() => setForm({ ...form, image_url: "" })} className="text-[10px] text-destructive">Remover imagem</button>
                      )}
                      <p className="text-[9px] text-muted-foreground">Sem imagem, o ícone emoji será usado</p>
                    </div>
                  </div>
                </div>

                {/* Fallback icon if no image */}
                {!form.image_url && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Ícone (fallback)</label>
                    <input className="glass-input" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="🎁" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Desconto %</label>
                    <input className="glass-input" type="number" min={0} max={100} value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Desconto R$</label>
                    <input className="glass-input" type="number" min={0} step={0.01} value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Prêmio personalizado</label>
                  <input className="glass-input" value={form.custom_prize} onChange={(e) => setForm({ ...form, custom_prize: e.target.value })} placeholder="Ex: Corte grátis" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Probabilidade (peso)</label>
                  <input className="glass-input" type="number" min={1} max={100} value={form.probability} onChange={(e) => setForm({ ...form, probability: parseInt(e.target.value) || 1 })} />
                  <p className="text-[10px] text-muted-foreground mt-1">Quanto maior, mais chance de ser sorteado</p>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ativo</label>
                  <button onClick={() => setForm({ ...form, active: !form.active })}
                    className="w-10 h-6 rounded-full transition-all duration-200 relative"
                    style={{ background: form.active ? 'hsl(245 60% 55%)' : 'hsl(0 0% 100% / 0.1)' }}>
                    <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200" style={{ left: form.active ? '22px' : '2px' }} />
                  </button>
                </div>
              </div>

              <button onClick={handleSave}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                style={{ background: 'hsl(245 60% 55%)', color: 'white' }}>
                <Save className="w-4 h-4" /> {editing ? "Atualizar" : "Criar Prêmio"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PrizeWheelConfig;
