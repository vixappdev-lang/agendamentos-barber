/**
 * Caixa — abertura/fechamento + sangrias/suprimentos + visão consolidada
 * Tabelas: cash_sessions, cash_movements
 */
import { useEffect, useMemo, useState } from "react";
import { Wallet, Lock, Unlock, Plus, ArrowDown, ArrowUp, Loader2, Receipt } from "lucide-react";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
// Tabelas dos novos módulos vivem só no MySQL do tenant — bridge intercepta em runtime.
const supabase = supabaseTyped as any;
import { toast } from "sonner";
import { ModuleSection, Stat, EmptyState, PrimaryButton, GhostButton, TextField } from "@/components/admin/ModuleUI";

interface Session {
  id: string;
  status: "open" | "closed";
  opened_at: string;
  closed_at: string | null;
  opening_balance: number;
  closing_balance: number | null;
  expected_balance: number | null;
  difference: number | null;
  notes: string | null;
}

interface Movement {
  id: string;
  session_id: string;
  kind: "sale" | "withdrawal" | "deposit" | "expense" | "tip" | "refund" | "other";
  amount: number;
  payment_method: string | null;
  description: string | null;
  barber_name: string | null;
  created_at: string;
}

const KIND_LABEL: Record<Movement["kind"], string> = {
  sale: "Venda",
  withdrawal: "Sangria",
  deposit: "Suprimento",
  expense: "Despesa",
  tip: "Gorjeta",
  refund: "Estorno",
  other: "Outro",
};

const fmt = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Cashier = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpen, setShowOpen] = useState(false);
  const [showMov, setShowMov] = useState(false);
  const [showClose, setShowClose] = useState(false);

  const [opening, setOpening] = useState("0");
  const [movKind, setMovKind] = useState<Movement["kind"]>("sale");
  const [movAmount, setMovAmount] = useState("");
  const [movDesc, setMovDesc] = useState("");
  const [movBarber, setMovBarber] = useState("");
  const [movMethod, setMovMethod] = useState("cash");
  const [closeBalance, setCloseBalance] = useState("");

  const current = useMemo(() => sessions.find((s) => s.status === "open") || null, [sessions]);

  const load = async () => {
    setLoading(true);
    const [s, m] = await Promise.all([
      supabase.from("cash_sessions").select("*").order("opened_at", { ascending: false }).limit(50),
      supabase.from("cash_movements").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setSessions((s.data as Session[]) || []);
    setMovements((m.data as Movement[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openSession = async () => {
    const { error } = await supabase.from("cash_sessions").insert({
      opening_balance: Number(opening) || 0,
      status: "open",
    });
    if (error) return toast.error(error.message);
    toast.success("Caixa aberto");
    setShowOpen(false);
    setOpening("0");
    load();
  };

  const addMovement = async () => {
    if (!current) return toast.error("Abra o caixa primeiro");
    const amt = Number(movAmount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error("Valor inválido");
    const { error } = await supabase.from("cash_movements").insert({
      session_id: current.id,
      kind: movKind,
      amount: amt,
      payment_method: movMethod || null,
      description: movDesc || null,
      barber_name: movBarber || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Movimento registrado");
    setShowMov(false); setMovAmount(""); setMovDesc(""); setMovBarber(""); setMovKind("sale");
    load();
  };

  const closeSession = async () => {
    if (!current) return;
    const closing = Number(closeBalance);
    if (!Number.isFinite(closing)) return toast.error("Valor inválido");
    const movs = movements.filter((m) => m.session_id === current.id);
    const expected = Number(current.opening_balance) + movs.reduce((s, m) => {
      const sign = ["sale", "deposit", "tip"].includes(m.kind) ? 1 : -1;
      return s + sign * Number(m.amount);
    }, 0);
    const { error } = await supabase.from("cash_sessions")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
        closing_balance: closing,
        expected_balance: expected,
        difference: closing - expected,
      })
      .eq("id", current.id);
    if (error) return toast.error(error.message);
    toast.success("Caixa fechado");
    setShowClose(false); setCloseBalance("");
    load();
  };

  const currentMovs = current ? movements.filter((m) => m.session_id === current.id) : [];
  const totalIn = currentMovs.filter((m) => ["sale", "deposit", "tip"].includes(m.kind))
    .reduce((s, m) => s + Number(m.amount), 0);
  const totalOut = currentMovs.filter((m) => ["withdrawal", "expense", "refund"].includes(m.kind))
    .reduce((s, m) => s + Number(m.amount), 0);
  const expected = current ? Number(current.opening_balance) + totalIn - totalOut : 0;

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Status" value={current ? "Aberto" : "Fechado"} tone={current ? "positive" : "neutral"} />
        <Stat label="Saldo inicial" value={fmt(current?.opening_balance || 0)} />
        <Stat label="Entradas" value={fmt(totalIn)} tone="positive" />
        <Stat label="Saídas" value={fmt(totalOut)} tone="negative" />
      </div>

      <ModuleSection
        title="Sessão atual"
        description={current ? "Caixa aberto. Registre vendas avulsas, sangrias e suprimentos." : "Nenhum caixa aberto. Clique para abrir."}
        actions={
          current ? (
            <>
              <PrimaryButton onClick={() => setShowMov(true)}><Plus className="w-3.5 h-3.5" /> Movimento</PrimaryButton>
              <GhostButton onClick={() => { setShowClose(true); setCloseBalance(String(expected.toFixed(2))); }}><Lock className="w-3.5 h-3.5" /> Fechar caixa</GhostButton>
            </>
          ) : (
            <PrimaryButton onClick={() => setShowOpen(true)}><Unlock className="w-3.5 h-3.5" /> Abrir caixa</PrimaryButton>
          )
        }
      >
        {current ? (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <Stat label="Saldo esperado" value={fmt(expected)} hint="Inicial + entradas − saídas" />
              <Stat label="Movimentos" value={String(currentMovs.length)} />
            </div>
            {currentMovs.length === 0 ? (
              <EmptyState icon={<Receipt className="w-5 h-5" />} title="Nenhum movimento ainda"
                description="Use o botão Movimento acima para registrar uma venda avulsa, gorjeta, sangria ou despesa." />
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-xs min-w-[640px]">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium">Hora</th>
                      <th className="px-2 py-2 text-left font-medium">Tipo</th>
                      <th className="px-2 py-2 text-left font-medium">Descrição</th>
                      <th className="px-2 py-2 text-left font-medium">Barbeiro</th>
                      <th className="px-2 py-2 text-right font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentMovs.map((m) => {
                      const positive = ["sale", "deposit", "tip"].includes(m.kind);
                      return (
                        <tr key={m.id} style={{ borderTop: "1px solid hsl(0 0% 100% / 0.05)" }}>
                          <td className="px-2 py-2 text-muted-foreground">{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</td>
                          <td className="px-2 py-2 text-foreground flex items-center gap-1.5">
                            {positive ? <ArrowUp className="w-3 h-3" style={{ color: "hsl(145 70% 65%)" }} /> : <ArrowDown className="w-3 h-3" style={{ color: "hsl(0 75% 70%)" }} />}
                            {KIND_LABEL[m.kind]}
                          </td>
                          <td className="px-2 py-2 text-foreground">{m.description || "—"}</td>
                          <td className="px-2 py-2 text-muted-foreground">{m.barber_name || "—"}</td>
                          <td className="px-2 py-2 text-right font-semibold" style={{ color: positive ? "hsl(145 70% 65%)" : "hsl(0 75% 70%)" }}>
                            {positive ? "+" : "−"}{fmt(m.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <EmptyState icon={<Wallet className="w-5 h-5" />} title="Caixa fechado" description="Abra um caixa para começar a registrar movimentações do dia." />
        )}
      </ModuleSection>

      <ModuleSection title="Histórico de sessões" description="Últimos fechamentos">
        {sessions.filter((s) => s.status === "closed").length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum caixa fechado ainda.</p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs min-w-[640px]">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">Aberto em</th>
                  <th className="px-2 py-2 text-left font-medium">Fechado em</th>
                  <th className="px-2 py-2 text-right font-medium">Esperado</th>
                  <th className="px-2 py-2 text-right font-medium">Conferido</th>
                  <th className="px-2 py-2 text-right font-medium">Diferença</th>
                </tr>
              </thead>
              <tbody>
                {sessions.filter((s) => s.status === "closed").map((s) => (
                  <tr key={s.id} style={{ borderTop: "1px solid hsl(0 0% 100% / 0.05)" }}>
                    <td className="px-2 py-2 text-muted-foreground">{new Date(s.opened_at).toLocaleString("pt-BR")}</td>
                    <td className="px-2 py-2 text-muted-foreground">{s.closed_at ? new Date(s.closed_at).toLocaleString("pt-BR") : "—"}</td>
                    <td className="px-2 py-2 text-right text-foreground">{fmt(s.expected_balance || 0)}</td>
                    <td className="px-2 py-2 text-right text-foreground">{fmt(s.closing_balance || 0)}</td>
                    <td className="px-2 py-2 text-right font-semibold" style={{ color: (s.difference || 0) === 0 ? "hsl(145 70% 65%)" : "hsl(0 75% 70%)" }}>
                      {fmt(s.difference || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ModuleSection>

      {showOpen && (
        <Modal title="Abrir caixa" onClose={() => setShowOpen(false)}>
          <TextField label="Saldo inicial (R$)" type="number" step="0.01" value={opening} onChange={(e) => setOpening(e.target.value)} autoFocus />
          <div className="mt-4 flex justify-end gap-2">
            <GhostButton onClick={() => setShowOpen(false)}>Cancelar</GhostButton>
            <PrimaryButton onClick={openSession}>Abrir</PrimaryButton>
          </div>
        </Modal>
      )}

      {showMov && (
        <Modal title="Novo movimento" onClose={() => setShowMov(false)}>
          <div className="space-y-3">
            <label className="block">
              <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">Tipo</span>
              <select value={movKind} onChange={(e) => setMovKind(e.target.value as Movement["kind"])}
                className="mt-1 w-full px-3 py-2 rounded-lg text-sm text-foreground bg-transparent outline-none"
                style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.08)" }}>
                {(Object.keys(KIND_LABEL) as Movement["kind"][]).map((k) => (
                  <option key={k} value={k} className="bg-background">{KIND_LABEL[k]}</option>
                ))}
              </select>
            </label>
            <TextField label="Valor (R$)" type="number" step="0.01" value={movAmount} onChange={(e) => setMovAmount(e.target.value)} />
            <TextField label="Descrição" value={movDesc} onChange={(e) => setMovDesc(e.target.value)} />
            <TextField label="Barbeiro (opcional)" value={movBarber} onChange={(e) => setMovBarber(e.target.value)} />
            <TextField label="Forma de pagamento" value={movMethod} onChange={(e) => setMovMethod(e.target.value)} placeholder="cash | pix | card" />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <GhostButton onClick={() => setShowMov(false)}>Cancelar</GhostButton>
            <PrimaryButton onClick={addMovement}>Registrar</PrimaryButton>
          </div>
        </Modal>
      )}

      {showClose && (
        <Modal title="Fechar caixa" onClose={() => setShowClose(false)}>
          <p className="text-xs text-muted-foreground mb-3">
            Saldo esperado: <span className="text-foreground font-semibold">{fmt(expected)}</span>
          </p>
          <TextField label="Valor conferido (R$)" type="number" step="0.01" value={closeBalance} onChange={(e) => setCloseBalance(e.target.value)} autoFocus />
          <div className="mt-4 flex justify-end gap-2">
            <GhostButton onClick={() => setShowClose(false)}>Cancelar</GhostButton>
            <PrimaryButton onClick={closeSession}>Confirmar fechamento</PrimaryButton>
          </div>
        </Modal>
      )}
    </div>
  );
};

const Modal = ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
    <div className="w-full max-w-md rounded-2xl p-5"
      style={{ background: "hsl(220 25% 8%)", border: "1px solid hsl(0 0% 100% / 0.08)" }}
      onClick={(e) => e.stopPropagation()}>
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      {children}
    </div>
  </div>
);

export default Cashier;
