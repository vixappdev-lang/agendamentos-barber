/**
 * Comandas — abre comandas por cliente, adiciona serviços/produtos,
 * fecha gerando movimento no caixa atual (se aberto) ou marca como pago.
 */
import { useEffect, useMemo, useState } from "react";
import { Plus, Loader2, Receipt, X, Trash2, Lock } from "lucide-react";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
const supabase = supabaseTyped as any;
import { toast } from "sonner";
import { ModuleSection, Stat, EmptyState, PrimaryButton, GhostButton, TextField } from "@/components/admin/ModuleUI";
import { ModuleHeader } from "@/components/admin/HelpModal";

interface Command {
  id: string;
  number: number;
  customer_name: string;
  customer_phone: string | null;
  barber_name: string | null;
  status: "open" | "closed" | "cancelled";
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string | null;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
}

interface CommandItem {
  id: string;
  command_id: string;
  kind: "service" | "product";
  reference_id: string | null;
  title: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  barber_name: string | null;
}

interface Service { id: string; title: string; price: number; }
interface Product { id: string; title: string; price: number; }
interface Barber { id: string; name: string; }

const fmt = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Commands = () => {
  const [commands, setCommands] = useState<Command[]>([]);
  const [items, setItems] = useState<CommandItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [openCmd, setOpenCmd] = useState<Command | null>(null);
  const [showClose, setShowClose] = useState(false);

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newBarber, setNewBarber] = useState("");

  const [addKind, setAddKind] = useState<"service" | "product">("service");
  const [addRef, setAddRef] = useState("");
  const [addQty, setAddQty] = useState("1");
  const [discount, setDiscount] = useState("0");
  const [payMethod, setPayMethod] = useState("cash");

  const load = async () => {
    setLoading(true);
    const [c, i, s, p, b] = await Promise.all([
      supabase.from("commands").select("*").order("opened_at", { ascending: false }).limit(100),
      supabase.from("command_items").select("*").order("created_at", { ascending: true }).limit(500),
      supabase.from("services").select("id, title, price").eq("active", true),
      supabase.from("products").select("id, title, price").eq("active", true),
      supabase.from("barbers").select("id, name").eq("active", true),
    ]);
    setCommands((c.data as Command[]) || []);
    setItems((i.data as CommandItem[]) || []);
    setServices((s.data as Service[]) || []);
    setProducts((p.data as Product[]) || []);
    setBarbers((b.data as Barber[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const opens = commands.filter((c) => c.status === "open");
  const closeds = commands.filter((c) => c.status === "closed");
  const totalOpen = opens.reduce((s, c) => s + Number(c.total || 0), 0);

  const cmdItems = (id: string) => items.filter((it) => it.command_id === id);

  const createCommand = async () => {
    if (!newName.trim()) return toast.error("Nome do cliente é obrigatório");
    const { error } = await supabase.from("commands").insert({
      customer_name: newName.trim(),
      customer_phone: newPhone || null,
      barber_name: newBarber || null,
      status: "open", subtotal: 0, discount: 0, total: 0,
    });
    if (error) return toast.error(error.message);
    toast.success("Comanda aberta");
    setShowNew(false); setNewName(""); setNewPhone(""); setNewBarber("");
    load();
  };

  const addItem = async () => {
    if (!openCmd || !addRef) return;
    const list = addKind === "service" ? services : products;
    const ref = list.find((x) => x.id === addRef);
    if (!ref) return toast.error("Selecione um item");
    const qty = Math.max(1, Number(addQty) || 1);
    const price = Number(ref.price) || 0;
    const subtotal = price * qty;
    const { error } = await supabase.from("command_items").insert({
      command_id: openCmd.id, kind: addKind, reference_id: ref.id,
      title: ref.title, unit_price: price, quantity: qty, subtotal,
      barber_name: openCmd.barber_name,
    });
    if (error) return toast.error(error.message);
    await recalc(openCmd.id);
    setAddRef(""); setAddQty("1");
    toast.success("Item adicionado");
  };

  const removeItem = async (id: string, cmdId: string) => {
    const { error } = await supabase.from("command_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await recalc(cmdId);
  };

  const recalc = async (cmdId: string) => {
    const fresh = await supabase.from("command_items").select("*").eq("command_id", cmdId);
    const list = (fresh.data as CommandItem[]) || [];
    const subtotal = list.reduce((s, it) => s + Number(it.subtotal || 0), 0);
    const cmd = commands.find((c) => c.id === cmdId);
    const disc = Number(cmd?.discount || 0);
    const total = Math.max(0, subtotal - disc);
    await supabase.from("commands").update({ subtotal, total }).eq("id", cmdId);
    await load();
    if (openCmd?.id === cmdId) {
      const updated = (await supabase.from("commands").select("*").eq("id", cmdId).maybeSingle()).data as Command | null;
      if (updated) setOpenCmd(updated);
    }
  };

  const closeCommand = async () => {
    if (!openCmd) return;
    const disc = Number(discount) || 0;
    const total = Math.max(0, Number(openCmd.subtotal) - disc);

    const { error } = await supabase.from("commands").update({
      status: "closed", closed_at: new Date().toISOString(),
      discount: disc, total, payment_method: payMethod,
    }).eq("id", openCmd.id);
    if (error) return toast.error(error.message);

    // Lança no caixa aberto, se houver
    const sess = await supabase.from("cash_sessions").select("id").eq("status", "open").limit(1).maybeSingle();
    if (sess.data?.id) {
      await supabase.from("cash_movements").insert({
        session_id: sess.data.id, kind: "sale", amount: total, payment_method: payMethod,
        description: `Comanda #${openCmd.number} — ${openCmd.customer_name}`,
        reference_type: "command", reference_id: openCmd.id, barber_name: openCmd.barber_name,
      });
    }

    toast.success("Comanda fechada");
    setShowClose(false); setOpenCmd(null); setDiscount("0"); setPayMethod("cash");
    load();
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Comandas"
        description="Abra comandas por cliente, adicione serviços e produtos, e feche gerando lançamento automático no caixa."
        help={{
          title: "Como funciona Comandas",
          intro: "Comanda é a 'conta' do cliente enquanto ele está sendo atendido. Você adiciona itens em tempo real e fecha quando terminar.",
          steps: [
            { title: "Abrir comanda", description: "Informe o nome do cliente (e barbeiro, se quiser). O sistema atribui um número sequencial." },
            { title: "Adicionar itens", description: "Inclua serviços e produtos. O subtotal é calculado automaticamente." },
            { title: "Aplicar desconto (opcional)", description: "Use cupom ou ajuste manual antes de fechar." },
            { title: "Fechar comanda", description: "Escolha pagamento (dinheiro, pix, cartão, fiado). Se houver caixa aberto, gera entrada automática. Se for fiado, cria lançamento na conta do cliente." },
          ],
          tips: [
            "Comandas em aberto aparecem em destaque pra você não esquecer.",
            "Pagamento como 'fiado' exige cliente cadastrado em Fiados.",
            "O total vai automaticamente pro Caixa quando você fecha (se houver caixa aberto).",
          ],
        }}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Comandas abertas" value={String(opens.length)} tone={opens.length ? "warning" : "neutral"} />
        <Stat label="Total em aberto" value={fmt(totalOpen)} tone="warning" />
        <Stat label="Fechadas hoje" value={String(closeds.filter((c) => c.closed_at && new Date(c.closed_at).toDateString() === new Date().toDateString()).length)} />
        <Stat label="Receita do dia" value={fmt(closeds.filter((c) => c.closed_at && new Date(c.closed_at).toDateString() === new Date().toDateString()).reduce((s, c) => s + Number(c.total), 0))} tone="positive" />
      </div>

      <ModuleSection title="Comandas em aberto" description="Em andamento — clique para adicionar itens e fechar"
        actions={<PrimaryButton onClick={() => setShowNew(true)}><Plus className="w-3.5 h-3.5" /> Nova comanda</PrimaryButton>}>
        {opens.length === 0 ? (
          <EmptyState icon={<Receipt className="w-5 h-5" />} title="Nenhuma comanda aberta" description="Crie a primeira clicando em Nova comanda." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {opens.map((c) => (
              <button key={c.id} onClick={() => setOpenCmd(c)} className="text-left rounded-xl p-3.5 transition-colors hover:bg-white/5"
                style={{ background: "hsl(0 0% 100% / 0.025)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-mono text-muted-foreground">#{c.number}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: "hsl(35 90% 65% / 0.15)", color: "hsl(35 90% 75%)" }}>aberta</span>
                </div>
                <p className="text-sm font-semibold text-foreground mt-1">{c.customer_name}</p>
                <p className="text-[11px] text-muted-foreground">{c.barber_name || "Sem barbeiro"} · {cmdItems(c.id).length} itens</p>
                <p className="text-base font-bold mt-2" style={{ color: "hsl(145 70% 65%)" }}>{fmt(c.total)}</p>
              </button>
            ))}
          </div>
        )}
      </ModuleSection>

      <ModuleSection title="Histórico de comandas fechadas">
        {closeds.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma comanda fechada ainda.</p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs min-w-[640px]">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">#</th>
                  <th className="px-2 py-2 text-left font-medium">Cliente</th>
                  <th className="px-2 py-2 text-left font-medium">Barbeiro</th>
                  <th className="px-2 py-2 text-left font-medium">Fechada</th>
                  <th className="px-2 py-2 text-left font-medium">Pgto</th>
                  <th className="px-2 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {closeds.slice(0, 50).map((c) => (
                  <tr key={c.id} style={{ borderTop: "1px solid hsl(0 0% 100% / 0.05)" }}>
                    <td className="px-2 py-2 font-mono text-muted-foreground">#{c.number}</td>
                    <td className="px-2 py-2 text-foreground">{c.customer_name}</td>
                    <td className="px-2 py-2 text-muted-foreground">{c.barber_name || "—"}</td>
                    <td className="px-2 py-2 text-muted-foreground">{c.closed_at ? new Date(c.closed_at).toLocaleString("pt-BR") : "—"}</td>
                    <td className="px-2 py-2 text-muted-foreground">{c.payment_method || "—"}</td>
                    <td className="px-2 py-2 text-right font-semibold text-foreground">{fmt(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ModuleSection>

      {showNew && (
        <Modal title="Nova comanda" onClose={() => setShowNew(false)}>
          <div className="space-y-3">
            <TextField label="Cliente" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
            <TextField label="Telefone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            <Select label="Barbeiro" value={newBarber} onChange={setNewBarber} options={[{ value: "", label: "—" }, ...barbers.map((b) => ({ value: b.name, label: b.name }))]} />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <GhostButton onClick={() => setShowNew(false)}>Cancelar</GhostButton>
            <PrimaryButton onClick={createCommand}>Abrir</PrimaryButton>
          </div>
        </Modal>
      )}

      {openCmd && !showClose && (
        <Modal title={`Comanda #${openCmd.number} — ${openCmd.customer_name}`} onClose={() => setOpenCmd(null)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Itens" value={String(cmdItems(openCmd.id).length)} />
              <Stat label="Subtotal" value={fmt(openCmd.subtotal)} />
              <Stat label="Desconto" value={fmt(openCmd.discount)} />
              <Stat label="Total" value={fmt(openCmd.total)} tone="positive" />
            </div>

            <div className="rounded-xl p-3" style={{ background: "hsl(0 0% 100% / 0.025)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
              <p className="text-[10.5px] font-semibold text-muted-foreground uppercase mb-2">Adicionar item</p>
              <div className="grid grid-cols-1 sm:grid-cols-[110px_1fr_80px_auto] gap-2">
                <Select label="Tipo" value={addKind} onChange={(v) => { setAddKind(v as any); setAddRef(""); }}
                  options={[{ value: "service", label: "Serviço" }, { value: "product", label: "Produto" }]} compact />
                <Select label={addKind === "service" ? "Serviço" : "Produto"} value={addRef} onChange={setAddRef}
                  options={[{ value: "", label: "Selecione…" }, ...((addKind === "service" ? services : products).map((x) => ({ value: x.id, label: `${x.title} — ${fmt(x.price)}` })))]} compact />
                <TextField label="Qtd" type="number" min={1} value={addQty} onChange={(e) => setAddQty(e.target.value)} />
                <div className="flex items-end"><PrimaryButton onClick={addItem}>Adicionar</PrimaryButton></div>
              </div>
            </div>

            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs min-w-[560px]">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium">Item</th>
                    <th className="px-2 py-2 text-left font-medium">Tipo</th>
                    <th className="px-2 py-2 text-right font-medium">Qtd</th>
                    <th className="px-2 py-2 text-right font-medium">Unit.</th>
                    <th className="px-2 py-2 text-right font-medium">Subtotal</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {cmdItems(openCmd.id).length === 0 ? (
                    <tr><td colSpan={6} className="px-2 py-4 text-center text-muted-foreground">Nenhum item ainda</td></tr>
                  ) : cmdItems(openCmd.id).map((it) => (
                    <tr key={it.id} style={{ borderTop: "1px solid hsl(0 0% 100% / 0.05)" }}>
                      <td className="px-2 py-2 text-foreground">{it.title}</td>
                      <td className="px-2 py-2 text-muted-foreground">{it.kind === "service" ? "Serviço" : "Produto"}</td>
                      <td className="px-2 py-2 text-right text-foreground">{it.quantity}</td>
                      <td className="px-2 py-2 text-right text-muted-foreground">{fmt(it.unit_price)}</td>
                      <td className="px-2 py-2 text-right font-semibold text-foreground">{fmt(it.subtotal)}</td>
                      <td className="px-2 py-2 text-right">
                        <button onClick={() => removeItem(it.id, openCmd.id)} className="p-1 rounded hover:bg-white/5"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <GhostButton onClick={() => setOpenCmd(null)}>Fechar painel</GhostButton>
              <PrimaryButton onClick={() => { setDiscount(String(openCmd.discount || 0)); setShowClose(true); }} disabled={cmdItems(openCmd.id).length === 0}>
                <Lock className="w-3.5 h-3.5" /> Encerrar comanda
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      )}

      {openCmd && showClose && (
        <Modal title="Encerrar comanda" onClose={() => setShowClose(false)}>
          <p className="text-xs text-muted-foreground mb-3">
            Subtotal: <span className="text-foreground font-semibold">{fmt(openCmd.subtotal)}</span>
          </p>
          <div className="space-y-3">
            <TextField label="Desconto (R$)" type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            <Select label="Forma de pagamento" value={payMethod} onChange={setPayMethod}
              options={[{ value: "cash", label: "Dinheiro" }, { value: "pix", label: "Pix" }, { value: "card", label: "Cartão" }, { value: "credit", label: "Fiado" }]} />
            <div className="text-sm text-foreground">
              Total a cobrar: <strong>{fmt(Math.max(0, Number(openCmd.subtotal) - (Number(discount) || 0)))}</strong>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <GhostButton onClick={() => setShowClose(false)}>Voltar</GhostButton>
            <PrimaryButton onClick={closeCommand}>Confirmar</PrimaryButton>
          </div>
        </Modal>
      )}
    </div>
  );
};

const Select = ({ label, value, onChange, options, compact }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; compact?: boolean;
}) => (
  <label className="block">
    <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className={`mt-1 w-full px-3 ${compact ? "py-2" : "py-2"} rounded-lg text-sm text-foreground bg-transparent outline-none`}
      style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.08)" }}>
      {options.map((o) => <option key={o.value} value={o.value} className="bg-background">{o.label}</option>)}
    </select>
  </label>
);

const Modal = ({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
    <div className={`w-full ${wide ? "max-w-3xl" : "max-w-md"} rounded-2xl p-5 max-h-[90vh] overflow-y-auto`}
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

export default Commands;
