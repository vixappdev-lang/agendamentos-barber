import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, Save, Tag, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

interface CategoryRow {
  id: string;
  slug: string;
  label: string;
  icon: string | null;
  sort_order: number;
  active: boolean;
}

const slugify = (s: string) =>
  s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "categoria";

const empty = { slug: "", label: "", icon: "📦", sort_order: 0, active: true };

const Categories = () => {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);
  const [loading, setLoading] = useState(true);

  const fetchRows = async () => {
    const { data } = await (supabase as any).from("product_categories").select("*").order("sort_order");
    setRows((data as CategoryRow[]) || []);
    setLoading(false);
  };
  useEffect(() => { fetchRows(); }, []);

  const open = (row?: CategoryRow) => {
    if (row) {
      setEditing(row.id);
      setForm({ slug: row.slug, label: row.label, icon: row.icon || "📦", sort_order: row.sort_order, active: row.active });
    } else {
      setEditing(null);
      setForm({ ...empty, sort_order: rows.length });
    }
    setShowModal(true);
  };

  const save = async () => {
    if (!form.label.trim()) { toast.error("Informe o nome"); return; }
    const slug = (form.slug || slugify(form.label)).trim();
    if (editing) {
      const { error } = await (supabase as any).from("product_categories").update({
        slug, label: form.label.trim(), icon: form.icon, sort_order: form.sort_order, active: form.active,
      }).eq("id", editing);
      if (error) { toast.error(error.message); return; }
      toast.success("Categoria atualizada");
    } else {
      const { error } = await (supabase as any).from("product_categories").insert({
        slug, label: form.label.trim(), icon: form.icon, sort_order: form.sort_order, active: form.active,
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Categoria criada");
    }
    setShowModal(false);
    fetchRows();
  };

  const remove = async (id: string, slug: string) => {
    if (slug === "geral") { toast.error("A categoria 'Outros' não pode ser excluída"); return; }
    if (!confirm("Excluir esta categoria? Produtos vinculados ficarão sem categoria.")) return;
    const { error } = await (supabase as any).from("product_categories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Excluída");
    fetchRows();
  };

  const toggleActive = async (row: CategoryRow) => {
    await (supabase as any).from("product_categories").update({ active: !row.active }).eq("id", row.id);
    fetchRows();
  };

  const move = async (row: CategoryRow, dir: -1 | 1) => {
    const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((r) => r.id === row.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    await Promise.all([
      (supabase as any).from("product_categories").update({ sort_order: swap.sort_order }).eq("id", row.id),
      (supabase as any).from("product_categories").update({ sort_order: row.sort_order }).eq("id", swap.id),
    ]);
    fetchRows();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-foreground">Categorias da loja</h3>
          <p className="text-[11px] text-muted-foreground">Organize seus produtos em grupos visíveis na loja.</p>
        </div>
        <button
          onClick={() => open()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{ background: "hsl(245 60% 55%)", color: "white" }}
        >
          <Plus className="w-4 h-4" /> Nova
        </button>
      </div>

      {loading ? (
        <div className="grid gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "hsl(0 0% 100% / 0.04)" }} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row, i) => (
            <motion.div
              key={row.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: "hsl(0 0% 100% / 0.04)", border: "1px solid hsl(0 0% 100% / 0.08)" }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                style={{ background: "hsl(245 60% 55% / 0.15)" }}
              >
                {row.icon || "📦"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground truncate">{row.label}</p>
                  {!row.active && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                      style={{ background: "hsl(0 60% 50% / 0.15)", color: "hsl(0 60% 70%)" }}>Inativa</span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">{row.slug}</p>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={() => move(row, -1)} disabled={i === 0}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                  style={{ background: "hsl(0 0% 100% / 0.06)", color: "hsl(0 0% 70%)" }}>
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => move(row, 1)} disabled={i === rows.length - 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                  style={{ background: "hsl(0 0% 100% / 0.06)", color: "hsl(0 0% 70%)" }}>
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => toggleActive(row)}
                  className="px-2.5 h-8 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                  style={{
                    background: row.active ? "hsl(140 50% 45% / 0.15)" : "hsl(0 0% 100% / 0.06)",
                    color: row.active ? "hsl(140 60% 70%)" : "hsl(0 0% 60%)",
                  }}>
                  {row.active ? "On" : "Off"}
                </button>
                <button onClick={() => open(row)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{ background: "hsl(245 60% 55% / 0.15)", color: "hsl(245 60% 75%)" }}>
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => remove(row.id, row.slug)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{ background: "hsl(0 60% 50% / 0.15)", color: "hsl(0 60% 70%)" }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
          {rows.length === 0 && (
            <div className="rounded-xl p-8 text-center" style={{ background: "hsl(0 0% 100% / 0.04)" }}>
              <Tag className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">Nenhuma categoria. Clique em "Nova".</p>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "hsl(0 0% 0% / 0.7)", backdropFilter: "blur(8px)" }}
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl p-5 space-y-4"
              style={{ background: "hsl(230 20% 9%)", border: "1px solid hsl(0 0% 100% / 0.1)" }}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold">{editing ? "Editar categoria" : "Nova categoria"}</h3>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "hsl(0 0% 100% / 0.06)" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-[80px_1fr] gap-3">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Ícone</label>
                  <input className="glass-input text-center text-xl" value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="📦" maxLength={4} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Nome *</label>
                  <input className="glass-input" value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })}
                    placeholder="Ex: Pomadas" autoFocus />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Slug (id interno)</label>
                <input className="glass-input font-mono text-sm" value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                  placeholder="pomadas" />
                <p className="text-[10px] text-muted-foreground mt-1">Usado internamente para vincular produtos.</p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.04)" }}>
                <span className="text-xs font-semibold">Ativa na loja</span>
                <button onClick={() => setForm({ ...form, active: !form.active })}
                  className="w-11 h-6 rounded-full relative transition-all"
                  style={{ background: form.active ? "hsl(140 50% 45%)" : "hsl(0 0% 100% / 0.1)" }}>
                  <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                    style={{ left: form.active ? "24px" : "4px" }} />
                </button>
              </div>

              <button onClick={save} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                style={{ background: "hsl(245 60% 55%)", color: "white" }}>
                <Save className="w-4 h-4" /> Salvar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Categories;
