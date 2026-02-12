import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, Save, Tag } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Coupon {
  id: string;
  code: string;
  discount_percent: number | null;
  discount_value: number | null;
  active: boolean;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number;
}

const emptyForm = {
  code: "",
  discount_percent: 0,
  discount_value: 0,
  active: true,
  expires_at: "",
  max_uses: 0,
};

const Coupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [discountType, setDiscountType] = useState<"percent" | "value">("percent");

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    setCoupons((data as Coupon[]) || []);
  };

  const handleSave = async () => {
    if (!form.code) {
      toast.error("Informe o código do cupom");
      return;
    }

    const payload = {
      code: form.code.toUpperCase(),
      discount_percent: discountType === "percent" ? form.discount_percent : null,
      discount_value: discountType === "value" ? form.discount_value : null,
      active: form.active,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      max_uses: form.max_uses > 0 ? form.max_uses : null,
    };

    if (editing) {
      const { error } = await supabase.from("coupons").update(payload).eq("id", editing);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Cupom atualizado!");
    } else {
      const { error } = await supabase.from("coupons").insert(payload);
      if (error) { toast.error(error.message.includes("duplicate") ? "Código já existe" : "Erro ao criar"); return; }
      toast.success("Cupom criado!");
    }

    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
    fetchCoupons();
  };

  const handleEdit = (c: Coupon) => {
    setForm({
      code: c.code,
      discount_percent: Number(c.discount_percent) || 0,
      discount_value: Number(c.discount_value) || 0,
      active: c.active,
      expires_at: c.expires_at ? format(new Date(c.expires_at), "yyyy-MM-dd") : "",
      max_uses: c.max_uses || 0,
    });
    setDiscountType(c.discount_percent ? "percent" : "value");
    setEditing(c.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cupom?")) return;
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Cupom excluído!");
    fetchCoupons();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Cupons</h2>
        <button
          onClick={() => { setForm(emptyForm); setEditing(null); setDiscountType("percent"); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{ background: 'hsl(245 60% 55%)', color: 'white' }}
        >
          <Plus className="w-4 h-4" /> Novo Cupom
        </button>
      </div>

      <div className="grid gap-3">
        {coupons.map((c) => (
          <motion.div key={c.id} layout className="glass-card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'hsl(245 60% 55% / 0.12)' }}>
              <Tag className="w-5 h-5" style={{ color: 'hsl(245 60% 65%)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground tracking-wider">{c.code}</h3>
                {!c.active && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'hsl(0 60% 50% / 0.15)', color: 'hsl(0 60% 65%)' }}>
                    Inativo
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                <span className="font-semibold" style={{ color: 'hsl(160 60% 55%)' }}>
                  {c.discount_percent ? `${Number(c.discount_percent)}% off` : `R$ ${Number(c.discount_value).toFixed(2)} off`}
                </span>
                {c.max_uses && <span>{c.current_uses}/{c.max_uses} usos</span>}
                {c.expires_at && <span>Exp: {format(new Date(c.expires_at), "dd/MM/yyyy")}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => handleEdit(c)} className="p-2 rounded-lg" style={{ background: 'hsl(0 0% 100% / 0.05)' }}>
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </button>
              <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg" style={{ background: 'hsl(0 60% 50% / 0.1)' }}>
                <Trash2 className="w-4 h-4" style={{ color: 'hsl(0 60% 60%)' }} />
              </button>
            </div>
          </motion.div>
        ))}

        {coupons.length === 0 && (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum cupom cadastrado</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card-strong w-full max-w-md p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">
                  {editing ? "Editar Cupom" : "Novo Cupom"}
                </h3>
                <button onClick={() => setShowModal(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Código *</label>
                  <input className="glass-input uppercase" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Ex: PROMO20" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Tipo de Desconto</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDiscountType("percent")}
                      className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                      style={discountType === "percent" ? { background: 'hsl(245 60% 55% / 0.15)', color: 'hsl(245 60% 70%)', border: '1px solid hsl(245 60% 55% / 0.3)' } : { background: 'hsl(0 0% 100% / 0.05)', color: 'hsl(0 0% 60%)', border: '1px solid transparent' }}
                    >
                      Porcentagem (%)
                    </button>
                    <button
                      onClick={() => setDiscountType("value")}
                      className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                      style={discountType === "value" ? { background: 'hsl(245 60% 55% / 0.15)', color: 'hsl(245 60% 70%)', border: '1px solid hsl(245 60% 55% / 0.3)' } : { background: 'hsl(0 0% 100% / 0.05)', color: 'hsl(0 0% 60%)', border: '1px solid transparent' }}
                    >
                      Valor Fixo (R$)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                    {discountType === "percent" ? "Desconto (%)" : "Valor (R$)"}
                  </label>
                  <input
                    className="glass-input"
                    type="number"
                    min={0}
                    step={discountType === "percent" ? 1 : 0.01}
                    value={discountType === "percent" ? form.discount_percent : form.discount_value}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setForm(discountType === "percent" ? { ...form, discount_percent: val } : { ...form, discount_value: val });
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Validade</label>
                    <input className="glass-input text-sm" type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Limite de Usos</label>
                    <input className="glass-input" type="number" min={0} value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ativo</label>
                  <button
                    onClick={() => setForm({ ...form, active: !form.active })}
                    className="w-10 h-6 rounded-full transition-all duration-200 relative"
                    style={{ background: form.active ? 'hsl(245 60% 55%)' : 'hsl(0 0% 100% / 0.1)' }}
                  >
                    <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200"
                      style={{ left: form.active ? '22px' : '2px' }} />
                  </button>
                </div>
              </div>

              <button
                onClick={handleSave}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                style={{ background: 'hsl(245 60% 55%)', color: 'white' }}
              >
                <Save className="w-4 h-4" />
                {editing ? "Atualizar" : "Criar Cupom"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Coupons;
