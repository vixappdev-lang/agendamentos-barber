/**
 * Estoque — itens (vinculados ou não a produtos), com movimentações
 * (entrada, saída, ajuste, perda) e alerta de mínimo.
 */
import { useEffect, useMemo, useState } from "react";
import { Plus, Loader2, Package, AlertTriangle, ArrowDown, ArrowUp, X, Trash2, Pencil } from "lucide-react";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
const supabase = supabaseTyped as any;
import { toast } from "sonner";
import { ModuleSection, Stat, EmptyState, PrimaryButton, GhostButton, TextField } from "@/components/admin/ModuleUI";

interface Item {
  id: string; product_id: string | null; supplier_id: string | null;
  name: string; sku: string | null; unit: string;
  cost_price: number | null; sale_price: number | null;
  quantity: number; min_quantity: number; active: boolean;
}
interface Movement {
  id: string; item_id: string;
  kind: "in" | "out" | "adjust" | "loss" | "sale";
  quantity: number; unit_cost: number | null; notes: string | null; created_at: string;
}
interface Supplier { id: string; name: string; }
interface Product { id: string; title: string; price: number; }

const KIND_LABEL: Record<Movement["kind"], string> = {
  in: "Entrada", out: "Saída", adjust: "Ajuste", loss: "Perda", sale: "Venda",
};

const fmt = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Inventory = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [movs, setMovs] = useState<Movement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [showItem, setShowItem] = useState(false);
  const [edit, setEdit] = useState<Item | null>(null);
  const [showMov, setShowMov] = useState<Item | null>(null);

  const [form, setForm] = useState({ name: "", sku: "", unit: "un", cost: "", sale: "", min: "0", supplier_id: "", product_id: "" });

  const [movKind, setMovKind] = useState<Movement["kind"]>("in");
  const [movQty, setMovQty] = useState("");
  const [movCost, setMovCost] = useState("");
  const [movNotes, setMovNotes] = useState("");

  const load = async () => {
    setLoading(true);
    const [it, mv, sp, pr] = await Promise.all([
      supabase.from("inventory_items").select("*").order("name", { ascending: true }).limit(500),
      supabase.from("inventory_movements").select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("suppliers").select("id, name").eq("active", true),
      supabase.from("products").select("id, title, price").eq("active", true),
    ]);
    setItems((it.data as Item[]) || []);
    setMovs((mv.data as Movement[]) || []);
    setSuppliers((sp.data as Supplier[]) || []);
    setProducts((pr.data as Product[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const lowStock = useMemo(() => items.filter((i) => Number(i.quantity) <= Number(i.min_quantity) && i.active), [items]);
  const totalValue = useMemo(() => items.reduce((s, i) => s + Number(i.quantity) * Number(i.cost_price || 0), 0), [items]);

  const openCreate = () => {
    setEdit(null);
    setForm({ name: "", sku: "", unit: "un", cost: "", sale: "", min: "0", supplier_id: "", product_id: "" });
    setShowItem(true);
  };
  const openEdit = (it: Item) => {
    setEdit(it);
    setForm({
      name: it.name, sku: it.sku || "", unit: it.unit,
      cost: String(it.cost_price ?? ""), sale: String(it.sale_price ?? ""),
      min: String(it.min_quantity), supplier_id: it.supplier_id || "", product_id: it.product_id || "",
    });
    setShowItem(true);
  };

  const saveItem = async () => {
    if (!form.name.trim()) return toast.error("Nome obrigatório");
    const payload = {
      name: form.name.trim(), sku: form.sku || null, unit: form.unit || "un",
      cost_price: form.cost ? Number(form.cost) : null,
      sale_price: form.sale ? Number(form.sale) : null,
      min_quantity: Number(form.min) || 0,
      supplier_id: form.supplier_id || null, product_id: form.product_id || null,
    };
    const { error } = edit
      ? await supabase.from("inventory_items").update(payload).eq("id", edit.id)
      : await supabase.from("inventory_items").insert({ ...payload, quantity: 0, active: true });
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    setShowItem(false);
    load();
  };

  const removeItem = async (id: string) => {
    if (!confirm("Excluir este item?")) return;
    const { error } = await supabase.from("inventory_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const addMov = async () => {
    if (!showMov) return;
    const qty = Number(movQty);
    if (!Number.isFinite(qty) || qty <= 0) return toast.error("Quantidade inválida");
    const { error } = await supabase.from("inventory_movements").insert({
      item_id: showMov.id, kind: movKind, quantity: qty,
      unit_cost: movCost ? Number(movCost) : null,
      notes: movNotes || null,
    });
    if (error) return toast.error(error.message);
    // Atualiza qty
    const sign = movKind === "in" ? 1 : movKind === "adjust" ? 0 : -1;
    let newQty: number;
    if (movKind === "adjust") newQty = qty;
    else newQty = Math.max(0, Number(showMov.quantity) + sign * qty);
    await supabase.from("inventory_items").update({ quantity: newQty }).eq("id", showMov.id);
    toast.success("Movimento registrado");
    setShowMov(null); setMovQty(""); setMovCost(""); setMovNotes(""); setMovKind("in");
    load();
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Itens cadastrados" value={String(items.length)} />
        <Stat label="Estoque baixo" value={String(lowStock.length)} tone={lowStock.length ? "warning" : "positive"} />
        <Stat label="Valor em estoque" value={fmt(totalValue)} hint="custo × qtd" />
        <Stat label="Movs (recentes)" value={String(movs.length)} />
      </div>

      {lowStock.length > 0 && (
        <ModuleSection title="Alerta — estoque baixo" description="Itens abaixo do mínimo configurado">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStock.map((it) => (
              <div key={it.id} className="rounded-xl p-3" style={{ background: "hsl(35 90% 50% / 0.08)", border: "1px solid hsl(35 90% 65% / 0.2)" }}>
                <div className="flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5" style={{ color: "hsl(35 90% 65%)" }} />
                  <p className="text-sm font-semibold text-foreground">{it.name}</p>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Atual: {Number(it.quantity)} {it.unit} · mínimo: {Number(it.min_quantity)}</p>
              </div>
            ))}
          </div>
        </ModuleSection>
      )}

      <ModuleSection title="Itens em estoque"
        actions={<PrimaryButton onClick={openCreate}><Plus className="w-3.5 h-3.5" /> Novo item</PrimaryButton>}>
        {items.length === 0 ? (
          <EmptyState icon={<Package className="w-5 h-5" />} title="Sem itens" description="Cadastre o primeiro item de estoque." />
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs min-w-[760px]">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">Item</th>
                  <th className="px-2 py-2 text-left font-medium">SKU</th>
                  <th className="px-2 py-2 text-right font-medium">Qtd</th>
                  <th className="px-2 py-2 text-right font-medium">Mínimo</th>
                  <th className="px-2 py-2 text-right font-medium">Custo</th>
                  <th className="px-2 py-2 text-right font-medium">Venda</th>
                  <th className="px-2 py-2 text-left font-medium">Fornecedor</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const low = Number(it.quantity) <= Number(it.min_quantity);
                  const sup = suppliers.find((s) => s.id === it.supplier_id);
                  return (
                    <tr key={it.id} style={{ borderTop: "1px solid hsl(0 0% 100% / 0.05)" }}>
                      <td className="px-2 py-2 text-foreground font-medium">{it.name}</td>
                      <td className="px-2 py-2 text-muted-foreground font-mono">{it.sku || "—"}</td>
                      <td className="px-2 py-2 text-right font-semibold" style={{ color: low ? "hsl(35 90% 65%)" : "hsl(145 70% 65%)" }}>
                        {Number(it.quantity)} <span className="text-[10px] text-muted-foreground">{it.unit}</span>
                      </td>
                      <td className="px-2 py-2 text-right text-muted-foreground">{Number(it.min_quantity)}</td>
                      <td className="px-2 py-2 text-right text-muted-foreground">{it.cost_price ? fmt(it.cost_price) : "—"}</td>
                      <td className="px-2 py-2 text-right text-foreground">{it.sale_price ? fmt(it.sale_price) : "—"}</td>
                      <td className="px-2 py-2 text-muted-foreground">{sup?.name || "—"}</td>
                      <td className="px-2 py-2 text-right whitespace-nowrap">
                        <button onClick={() => setShowMov(it)} className="p-1 rounded hover:bg-white/5" title="Movimento"><ArrowUp className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        <button onClick={() => openEdit(it)} className="p-1 rounded hover:bg-white/5"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        <button onClick={() => removeItem(it.id)} className="p-1 rounded hover:bg-white/5"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ModuleSection>

      <ModuleSection title="Últimas movimentações">
        {movs.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma movimentação registrada.</p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs min-w-[600px]">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">Data</th>
                  <th className="px-2 py-2 text-left font-medium">Item</th>
                  <th className="px-2 py-2 text-left font-medium">Tipo</th>
                  <th className="px-2 py-2 text-right font-medium">Qtd</th>
                  <th className="px-2 py-2 text-left font-medium">Obs</th>
                </tr>
              </thead>
              <tbody>
                {movs.slice(0, 50).map((m) => {
                  const it = items.find((x) => x.id === m.item_id);
                  const positive = m.kind === "in";
                  return (
                    <tr key={m.id} style={{ borderTop: "1px solid hsl(0 0% 100% / 0.05)" }}>
                      <td className="px-2 py-2 text-muted-foreground">{new Date(m.created_at).toLocaleString("pt-BR")}</td>
                      <td className="px-2 py-2 text-foreground">{it?.name || "—"}</td>
                      <td className="px-2 py-2 text-foreground flex items-center gap-1">
                        {positive ? <ArrowUp className="w-3 h-3" style={{ color: "hsl(145 70% 65%)" }} /> : <ArrowDown className="w-3 h-3" style={{ color: "hsl(0 75% 70%)" }} />}
                        {KIND_LABEL[m.kind]}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold text-foreground">{Number(m.quantity)}</td>
                      <td className="px-2 py-2 text-muted-foreground">{m.notes || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ModuleSection>

      {showItem && (
        <Modal title={edit ? "Editar item" : "Novo item"} onClose={() => setShowItem(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            <TextField label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            <TextField label="Unidade" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="un, ml, g" />
            <TextField label="Mínimo" type="number" step="0.01" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} />
            <TextField label="Custo (R$)" type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            <TextField label="Venda (R$)" type="number" step="0.01" value={form.sale} onChange={(e) => setForm({ ...form, sale: e.target.value })} />
            <Select label="Fornecedor" value={form.supplier_id} onChange={(v) => setForm({ ...form, supplier_id: v })}
              options={[{ value: "", label: "—" }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]} />
            <Select label="Vincular produto" value={form.product_id} onChange={(v) => setForm({ ...form, product_id: v })}
              options={[{ value: "", label: "—" }, ...products.map((p) => ({ value: p.id, label: p.title }))]} />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <GhostButton onClick={() => setShowItem(false)}>Cancelar</GhostButton>
            <PrimaryButton onClick={saveItem}>Salvar</PrimaryButton>
          </div>
        </Modal>
      )}

      {showMov && (
        <Modal title={`Movimento — ${showMov.name}`} onClose={() => setShowMov(null)}>
          <p className="text-xs text-muted-foreground mb-3">Estoque atual: <strong className="text-foreground">{Number(showMov.quantity)} {showMov.unit}</strong></p>
          <div className="space-y-3">
            <Select label="Tipo" value={movKind} onChange={(v) => setMovKind(v as Movement["kind"])}
              options={(Object.keys(KIND_LABEL) as Movement["kind"][]).map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
            <TextField label={movKind === "adjust" ? "Quantidade final" : "Quantidade"} type="number" step="0.01" value={movQty} onChange={(e) => setMovQty(e.target.value)} />
            {movKind === "in" && <TextField label="Custo unitário (R$)" type="number" step="0.01" value={movCost} onChange={(e) => setMovCost(e.target.value)} />}
            <TextField label="Observação" value={movNotes} onChange={(e) => setMovNotes(e.target.value)} />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <GhostButton onClick={() => setShowMov(null)}>Cancelar</GhostButton>
            <PrimaryButton onClick={addMov}>Registrar</PrimaryButton>
          </div>
        </Modal>
      )}
    </div>
  );
};

const Select = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) => (
  <label className="block">
    <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full px-3 py-2 rounded-lg text-sm text-foreground bg-transparent outline-none"
      style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.08)" }}>
      {options.map((o) => <option key={o.value} value={o.value} className="bg-background">{o.label}</option>)}
    </select>
  </label>
);

const Modal = ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
    <div className="w-full max-w-2xl rounded-2xl p-5 max-h-[90vh] overflow-y-auto"
      style={{ background: "hsl(220 25% 8%)", border: "1px solid hsl(0 0% 100% / 0.08)" }}
      onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/5"><X className="w-4 h-4 text-muted-foreground" /></button>
      </div>
      {children}
    </div>
  </div>
);

export default Inventory;
