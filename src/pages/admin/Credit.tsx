/**
 * Fiados — clientes em conta corrente
 * Cada cliente tem uma conta com saldo (balance = soma de débitos − pagamentos)
 */
import { useEffect, useMemo, useState } from "react";
import { Plus, Loader2, Wallet, CreditCard, X, ChevronRight } from "lucide-react";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
const supabase = supabaseTyped as any;
import { toast } from "sonner";
import { ModuleSection, Stat, EmptyState, PrimaryButton, GhostButton, TextField } from "@/components/admin/ModuleUI";
import { ModuleHeader } from "@/components/admin/HelpModal";

interface Account {
  id: string; customer_name: string; customer_phone: string | null;
  limit_amount: number | null; balance: number; status: "active" | "blocked"; notes: string | null;
}
interface Entry {
  id: string; account_id: string; kind: "debit" | "payment";
  amount: number; description: string | null; payment_method: string | null;
  due_date: string | null; paid_at: string | null; created_at: string;
}

const fmt = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

import { usePanelSession } from "@/hooks/usePanelSession";
import BarberRestrictedNotice from "@/components/admin/BarberRestrictedNotice";

const Credit = () => {
  const session = usePanelSession();
  if (session.isBarberOnly) {
    return <BarberRestrictedNotice title="Fiados restrito" message="Apenas administradores e gerentes podem gerenciar fiados." />;
  }
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [openAcc, setOpenAcc] = useState<Account | null>(null);
  const [showEntry, setShowEntry] = useState<"debit" | "payment" | null>(null);

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newLimit, setNewLimit] = useState("");

  const [entryAmount, setEntryAmount] = useState("");
  const [entryDesc, setEntryDesc] = useState("");
  const [entryMethod, setEntryMethod] = useState("cash");

  const load = async () => {
    setLoading(true);
    const [a, e] = await Promise.all([
      supabase.from("credit_accounts").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("credit_entries").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    setAccounts((a.data as Account[]) || []);
    setEntries((e.data as Entry[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const totalOwed = useMemo(() => accounts.reduce((s, a) => s + Math.max(0, Number(a.balance)), 0), [accounts]);
  const owingCount = accounts.filter((a) => Number(a.balance) > 0).length;

  const accEntries = (id: string) => entries.filter((e) => e.account_id === id);

  const createAccount = async () => {
    if (!newName.trim()) return toast.error("Nome obrigatório");
    const { error } = await supabase.from("credit_accounts").insert({
      customer_name: newName.trim(), customer_phone: newPhone || null,
      limit_amount: newLimit ? Number(newLimit) : null, balance: 0, status: "active",
    });
    if (error) return toast.error(error.message);
    toast.success("Cliente cadastrado");
    setShowNew(false); setNewName(""); setNewPhone(""); setNewLimit("");
    load();
  };

  const recalc = async (accId: string) => {
    const fresh = (await supabase.from("credit_entries").select("*").eq("account_id", accId)).data as Entry[] || [];
    const balance = fresh.reduce((s, e) => s + (e.kind === "debit" ? Number(e.amount) : -Number(e.amount)), 0);
    await supabase.from("credit_accounts").update({ balance }).eq("id", accId);
    await load();
    if (openAcc?.id === accId) {
      const updated = (await supabase.from("credit_accounts").select("*").eq("id", accId).maybeSingle()).data as Account | null;
      if (updated) setOpenAcc(updated);
    }
  };

  const addEntry = async () => {
    if (!openAcc || !showEntry) return;
    const amt = Number(entryAmount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error("Valor inválido");
    const { error } = await supabase.from("credit_entries").insert({
      account_id: openAcc.id, kind: showEntry, amount: amt,
      description: entryDesc || null, payment_method: showEntry === "payment" ? entryMethod : null,
      paid_at: showEntry === "payment" ? new Date().toISOString() : null,
    });
    if (error) return toast.error(error.message);

    // Se pagamento e caixa aberto, lança como entrada no caixa
    if (showEntry === "payment") {
      const sess = await supabase.from("cash_sessions").select("id").eq("status", "open").limit(1).maybeSingle();
      if (sess.data?.id) {
        await supabase.from("cash_movements").insert({
          session_id: sess.data.id, kind: "deposit", amount: amt, payment_method: entryMethod,
          description: `Pagto fiado — ${openAcc.customer_name}`,
          reference_type: "credit", reference_id: openAcc.id,
        });
      }
    }

    toast.success(showEntry === "debit" ? "Débito lançado" : "Pagamento registrado");
    setShowEntry(null); setEntryAmount(""); setEntryDesc("");
    await recalc(openAcc.id);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Fiados"
        description="Clientes em conta corrente — controle débitos, pagamentos e limites."
        help={{
          title: "Como funcionam os Fiados",
          intro: "Cada cliente tem uma 'conta'. Toda vez que ele consome sem pagar, vira débito. Ao pagar, abate o saldo.",
          steps: [
            { title: "Cadastrar cliente", description: "Nome + telefone. Defina um limite de crédito (opcional) — o sistema avisa se ultrapassar." },
            { title: "Lançar débito", description: "Manualmente ou automaticamente quando uma comanda é fechada como 'fiado'." },
            { title: "Receber pagamento", description: "Informe o valor e o método. O sistema cria entrada no caixa aberto e abate do saldo do cliente." },
            { title: "Bloquear/desbloquear", description: "Cliente que não paga pode ser bloqueado pra novos fiados (mas o histórico fica)." },
          ],
          tips: [
            "Defina limite por cliente — o sistema alerta antes de estourar.",
            "Saldo positivo = cliente deve. Saldo zero = quitado.",
            "Pagamentos parciais são aceitos.",
          ],
        }}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Total a receber" value={fmt(totalOwed)} tone={totalOwed > 0 ? "warning" : "positive"} />
        <Stat label="Clientes devendo" value={String(owingCount)} />
        <Stat label="Cadastrados" value={String(accounts.length)} />
        <Stat label="Bloqueados" value={String(accounts.filter((a) => a.status === "blocked").length)} tone="negative" />
      </div>

      <ModuleSection title="Contas de fiado" description="Gerencie clientes em conta corrente"
        actions={<PrimaryButton onClick={() => setShowNew(true)}><Plus className="w-3.5 h-3.5" /> Novo cliente</PrimaryButton>}>
        {accounts.length === 0 ? (
          <EmptyState icon={<Wallet className="w-5 h-5" />} title="Nenhum cliente em fiado" description="Cadastre clientes para liberar compras a prazo." />
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs min-w-[640px]">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">Cliente</th>
                  <th className="px-2 py-2 text-left font-medium">Telefone</th>
                  <th className="px-2 py-2 text-right font-medium">Limite</th>
                  <th className="px-2 py-2 text-right font-medium">Saldo</th>
                  <th className="px-2 py-2 text-left font-medium">Status</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => {
                  const owed = Number(a.balance) > 0;
                  return (
                    <tr key={a.id} style={{ borderTop: "1px solid hsl(0 0% 100% / 0.05)" }} className="hover:bg-white/[0.02] cursor-pointer" onClick={() => setOpenAcc(a)}>
                      <td className="px-2 py-2 text-foreground font-medium">{a.customer_name}</td>
                      <td className="px-2 py-2 text-muted-foreground">{a.customer_phone || "—"}</td>
                      <td className="px-2 py-2 text-right text-muted-foreground">{a.limit_amount ? fmt(a.limit_amount) : "—"}</td>
                      <td className="px-2 py-2 text-right font-semibold" style={{ color: owed ? "hsl(0 75% 70%)" : "hsl(145 70% 65%)" }}>{fmt(a.balance)}</td>
                      <td className="px-2 py-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: a.status === "active" ? "hsl(145 70% 50% / 0.15)" : "hsl(0 75% 60% / 0.15)", color: a.status === "active" ? "hsl(145 70% 75%)" : "hsl(0 75% 75%)" }}>
                          {a.status === "active" ? "Ativo" : "Bloqueado"}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right"><ChevronRight className="w-3.5 h-3.5 text-muted-foreground inline" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ModuleSection>

      {showNew && (
        <Modal title="Novo cliente em fiado" onClose={() => setShowNew(false)}>
          <div className="space-y-3">
            <TextField label="Nome" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
            <TextField label="Telefone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            <TextField label="Limite (R$, opcional)" type="number" step="0.01" value={newLimit} onChange={(e) => setNewLimit(e.target.value)} />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <GhostButton onClick={() => setShowNew(false)}>Cancelar</GhostButton>
            <PrimaryButton onClick={createAccount}>Cadastrar</PrimaryButton>
          </div>
        </Modal>
      )}

      {openAcc && !showEntry && (
        <Modal title={openAcc.customer_name} onClose={() => setOpenAcc(null)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Stat label="Saldo devedor" value={fmt(openAcc.balance)} tone={Number(openAcc.balance) > 0 ? "negative" : "positive"} />
              <Stat label="Limite" value={openAcc.limit_amount ? fmt(openAcc.limit_amount) : "Sem limite"} />
              <Stat label="Lançamentos" value={String(accEntries(openAcc.id).length)} />
            </div>
            <div className="flex gap-2">
              <PrimaryButton onClick={() => setShowEntry("debit")}><Plus className="w-3.5 h-3.5" /> Lançar débito</PrimaryButton>
              <GhostButton onClick={() => setShowEntry("payment")}><CreditCard className="w-3.5 h-3.5" /> Receber pagamento</GhostButton>
            </div>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs min-w-[560px]">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium">Data</th>
                    <th className="px-2 py-2 text-left font-medium">Tipo</th>
                    <th className="px-2 py-2 text-left font-medium">Descrição</th>
                    <th className="px-2 py-2 text-left font-medium">Pgto</th>
                    <th className="px-2 py-2 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {accEntries(openAcc.id).length === 0 ? (
                    <tr><td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">Sem movimentações</td></tr>
                  ) : accEntries(openAcc.id).map((e) => (
                    <tr key={e.id} style={{ borderTop: "1px solid hsl(0 0% 100% / 0.05)" }}>
                      <td className="px-2 py-2 text-muted-foreground">{new Date(e.created_at).toLocaleString("pt-BR")}</td>
                      <td className="px-2 py-2 text-foreground">{e.kind === "debit" ? "Débito" : "Pagamento"}</td>
                      <td className="px-2 py-2 text-muted-foreground">{e.description || "—"}</td>
                      <td className="px-2 py-2 text-muted-foreground">{e.payment_method || "—"}</td>
                      <td className="px-2 py-2 text-right font-semibold" style={{ color: e.kind === "debit" ? "hsl(0 75% 70%)" : "hsl(145 70% 65%)" }}>
                        {e.kind === "debit" ? "+" : "−"}{fmt(e.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {openAcc && showEntry && (
        <Modal title={showEntry === "debit" ? "Lançar débito" : "Receber pagamento"} onClose={() => setShowEntry(null)}>
          <div className="space-y-3">
            <TextField label="Valor (R$)" type="number" step="0.01" value={entryAmount} onChange={(e) => setEntryAmount(e.target.value)} autoFocus />
            <TextField label="Descrição" value={entryDesc} onChange={(e) => setEntryDesc(e.target.value)} />
            {showEntry === "payment" && (
              <label className="block">
                <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">Forma de pagamento</span>
                <select value={entryMethod} onChange={(e) => setEntryMethod(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg text-sm text-foreground bg-transparent outline-none"
                  style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.08)" }}>
                  <option value="cash" className="bg-background">Dinheiro</option>
                  <option value="pix" className="bg-background">Pix</option>
                  <option value="card" className="bg-background">Cartão</option>
                </select>
              </label>
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <GhostButton onClick={() => setShowEntry(null)}>Cancelar</GhostButton>
            <PrimaryButton onClick={addEntry}>Confirmar</PrimaryButton>
          </div>
        </Modal>
      )}
    </div>
  );
};

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

export default Credit;
