/**
 * Comissões — regras por barbeiro (% sobre serviços) + cálculo do período
 *
 * Lógica:
 *  - Regras: scope=global (fallback geral), barber (% para um barbeiro),
 *    service (% para um serviço), barber_service (combinação).
 *  - Cálculo: para cada appointment confirmado/concluído no período, busca
 *    a regra mais específica (barber_service > barber > service > global).
 *  - Histórico de pagamentos persiste em commission_payouts.
 */
import { useEffect, useMemo, useState } from "react";
import { Plus, Loader2, Percent, Calculator, Trash2, X, Check } from "lucide-react";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
const supabase = supabaseTyped as any;
import { toast } from "sonner";
import { ModuleSection, Stat, EmptyState, PrimaryButton, GhostButton, TextField } from "@/components/admin/ModuleUI";

interface Rule {
  id: string;
  scope: "global" | "barber" | "service" | "barber_service";
  barber_id: string | null; barber_name: string | null;
  service_id: string | null;
  percent: number; active: boolean;
}
interface Payout {
  id: string; barber_name: string; period_start: string; period_end: string;
  gross_revenue: number; commission_amount: number;
  status: "pending" | "paid"; paid_at: string | null; payment_method: string | null; notes: string | null;
}
interface Barber { id: string; name: string; }
interface Service { id: string; title: string; }

const fmt = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const today = () => new Date().toISOString().split("T")[0];
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split("T")[0]; };

const Commissions = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const [showRule, setShowRule] = useState(false);
  const [ruleForm, setRuleForm] = useState({ scope: "barber" as Rule["scope"], barber_id: "", service_id: "", percent: "40" });

  const [periodStart, setPeriodStart] = useState(daysAgo(30));
  const [periodEnd, setPeriodEnd] = useState(today());
  const [calc, setCalc] = useState<{ name: string; revenue: number; commission: number; appointments: number }[]>([]);

  const load = async () => {
    setLoading(true);
    const [r, p, b, s] = await Promise.all([
      supabase.from("commission_rules").select("*").order("created_at", { ascending: false }),
      supabase.from("commission_payouts").select("*").order("period_end", { ascending: false }).limit(50),
      supabase.from("barbers").select("id, name").eq("active", true),
      supabase.from("services").select("id, title").eq("active", true),
    ]);
    setRules((r.data as Rule[]) || []);
    setPayouts((p.data as Payout[]) || []);
    setBarbers((b.data as Barber[]) || []);
    setServices((s.data as Service[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addRule = async () => {
    const pct = Number(ruleForm.percent);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return toast.error("Percentual inválido");
    const barber = barbers.find((b) => b.id === ruleForm.barber_id);
    const payload = {
      scope: ruleForm.scope,
      barber_id: ["barber", "barber_service"].includes(ruleForm.scope) ? ruleForm.barber_id || null : null,
      barber_name: ["barber", "barber_service"].includes(ruleForm.scope) ? barber?.name || null : null,
      service_id: ["service", "barber_service"].includes(ruleForm.scope) ? ruleForm.service_id || null : null,
      percent: pct, active: true,
    };
    const { error } = await supabase.from("commission_rules").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Regra criada");
    setShowRule(false);
    load();
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Excluir esta regra?")) return;
    const { error } = await supabase.from("commission_rules").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const findPercent = (barberName: string | null, serviceId: string | null): number => {
    const barber = barbers.find((b) => b.name === barberName);
    const candidates = rules.filter((r) => r.active);
    // Mais específico: barber_service
    const bs = candidates.find((r) => r.scope === "barber_service" && r.barber_id === barber?.id && r.service_id === serviceId);
    if (bs) return Number(bs.percent);
    const b = candidates.find((r) => r.scope === "barber" && r.barber_id === barber?.id);
    if (b) return Number(b.percent);
    const s = candidates.find((r) => r.scope === "service" && r.service_id === serviceId);
    if (s) return Number(s.percent);
    const g = candidates.find((r) => r.scope === "global");
    return g ? Number(g.percent) : 0;
  };

  const calculate = async () => {
    const { data, error } = await supabase.from("appointments")
      .select("*").gte("appointment_date", periodStart).lte("appointment_date", periodEnd)
      .in("status", ["confirmed", "completed"]);
    if (error) return toast.error(error.message);
    const list = (data as any[]) || [];
    const map = new Map<string, { name: string; revenue: number; commission: number; appointments: number }>();
    for (const a of list) {
      const name = a.barber_name || "Sem barbeiro";
      const total = Number(a.total_price) || 0;
      const pct = findPercent(a.barber_name, a.service_id);
      const cur = map.get(name) || { name, revenue: 0, commission: 0, appointments: 0 };
      cur.revenue += total;
      cur.commission += total * (pct / 100);
      cur.appointments += 1;
      map.set(name, cur);
    }
    setCalc([...map.values()].sort((a, b) => b.commission - a.commission));
    toast.success("Cálculo atualizado");
  };

  const registerPayout = async (row: { name: string; revenue: number; commission: number }) => {
    const { error } = await supabase.from("commission_payouts").insert({
      barber_name: row.name, period_start: periodStart, period_end: periodEnd,
      gross_revenue: row.revenue, commission_amount: row.commission, status: "pending",
    });
    if (error) return toast.error(error.message);
    toast.success("Comissão registrada");
    load();
  };

  const markPaid = async (p: Payout) => {
    // Lança como saída no caixa aberto, se houver
    const sess = await supabase.from("cash_sessions").select("id").eq("status", "open").limit(1).maybeSingle();
    if (sess.data?.id) {
      await supabase.from("cash_movements").insert({
        session_id: sess.data.id, kind: "withdrawal", amount: p.commission_amount,
        payment_method: "cash", description: `Comissão — ${p.barber_name}`,
        reference_type: "commission_payout", reference_id: p.id, barber_name: p.barber_name,
      });
    }
    const { error } = await supabase.from("commission_payouts").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Pagamento registrado");
    load();
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const totalCalc = calc.reduce((s, r) => s + r.commission, 0);
  const totalRev = calc.reduce((s, r) => s + r.revenue, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Regras ativas" value={String(rules.filter((r) => r.active).length)} />
        <Stat label="Pendentes" value={String(payouts.filter((p) => p.status === "pending").length)} tone="warning" />
        <Stat label="Pagos (50 últ.)" value={String(payouts.filter((p) => p.status === "paid").length)} tone="positive" />
        <Stat label="A pagar (cálculo)" value={fmt(totalCalc)} tone="warning" />
      </div>

      <ModuleSection title="Regras de comissão"
        description="Mais específico vence: barbeiro+serviço > barbeiro > serviço > global"
        actions={<PrimaryButton onClick={() => setShowRule(true)}><Plus className="w-3.5 h-3.5" /> Nova regra</PrimaryButton>}>
        {rules.length === 0 ? (
          <EmptyState icon={<Percent className="w-5 h-5" />} title="Sem regras" description="Crie ao menos uma regra global ou por barbeiro." />
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs min-w-[560px]">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">Escopo</th>
                  <th className="px-2 py-2 text-left font-medium">Barbeiro</th>
                  <th className="px-2 py-2 text-left font-medium">Serviço</th>
                  <th className="px-2 py-2 text-right font-medium">%</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => {
                  const svc = services.find((s) => s.id === r.service_id);
                  return (
                    <tr key={r.id} style={{ borderTop: "1px solid hsl(0 0% 100% / 0.05)" }}>
                      <td className="px-2 py-2 text-foreground">{r.scope}</td>
                      <td className="px-2 py-2 text-muted-foreground">{r.barber_name || "—"}</td>
                      <td className="px-2 py-2 text-muted-foreground">{svc?.title || "—"}</td>
                      <td className="px-2 py-2 text-right font-semibold text-foreground">{Number(r.percent)}%</td>
                      <td className="px-2 py-2 text-right">
                        <button onClick={() => deleteRule(r.id)} className="p-1 rounded hover:bg-white/5"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ModuleSection>

      <ModuleSection title="Cálculo do período" description="Aplica as regras sobre os agendamentos confirmados/concluídos">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 mb-4">
          <TextField label="De" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          <TextField label="Até" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          <div className="flex items-end"><PrimaryButton onClick={calculate}><Calculator className="w-3.5 h-3.5" /> Calcular</PrimaryButton></div>
        </div>
        {calc.length === 0 ? (
          <p className="text-xs text-muted-foreground">Clique em Calcular para gerar o relatório do período.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              <Stat label="Receita total" value={fmt(totalRev)} />
              <Stat label="Comissão total" value={fmt(totalCalc)} tone="warning" />
              <Stat label="Barbeiros" value={String(calc.length)} />
            </div>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs min-w-[560px]">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium">Barbeiro</th>
                    <th className="px-2 py-2 text-right font-medium">Atendimentos</th>
                    <th className="px-2 py-2 text-right font-medium">Receita</th>
                    <th className="px-2 py-2 text-right font-medium">Comissão</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {calc.map((r) => (
                    <tr key={r.name} style={{ borderTop: "1px solid hsl(0 0% 100% / 0.05)" }}>
                      <td className="px-2 py-2 text-foreground font-medium">{r.name}</td>
                      <td className="px-2 py-2 text-right text-muted-foreground">{r.appointments}</td>
                      <td className="px-2 py-2 text-right text-foreground">{fmt(r.revenue)}</td>
                      <td className="px-2 py-2 text-right font-semibold" style={{ color: "hsl(35 90% 65%)" }}>{fmt(r.commission)}</td>
                      <td className="px-2 py-2 text-right">
                        <GhostButton onClick={() => registerPayout(r)}>Registrar</GhostButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </ModuleSection>

      <ModuleSection title="Histórico de pagamentos">
        {payouts.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem pagamentos registrados ainda.</p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs min-w-[640px]">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">Barbeiro</th>
                  <th className="px-2 py-2 text-left font-medium">Período</th>
                  <th className="px-2 py-2 text-right font-medium">Receita</th>
                  <th className="px-2 py-2 text-right font-medium">Comissão</th>
                  <th className="px-2 py-2 text-left font-medium">Status</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} style={{ borderTop: "1px solid hsl(0 0% 100% / 0.05)" }}>
                    <td className="px-2 py-2 text-foreground font-medium">{p.barber_name}</td>
                    <td className="px-2 py-2 text-muted-foreground">{p.period_start} → {p.period_end}</td>
                    <td className="px-2 py-2 text-right text-muted-foreground">{fmt(p.gross_revenue)}</td>
                    <td className="px-2 py-2 text-right font-semibold text-foreground">{fmt(p.commission_amount)}</td>
                    <td className="px-2 py-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md"
                        style={{ background: p.status === "paid" ? "hsl(145 70% 50% / 0.15)" : "hsl(35 90% 65% / 0.15)",
                                 color: p.status === "paid" ? "hsl(145 70% 75%)" : "hsl(35 90% 75%)" }}>
                        {p.status === "paid" ? "Pago" : "Pendente"}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right">
                      {p.status === "pending" && <GhostButton onClick={() => markPaid(p)}><Check className="w-3.5 h-3.5" /> Marcar pago</GhostButton>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ModuleSection>

      {showRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowRule(false)}>
          <div className="w-full max-w-md rounded-2xl p-5"
            style={{ background: "hsl(220 25% 8%)", border: "1px solid hsl(0 0% 100% / 0.08)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Nova regra de comissão</h3>
              <button onClick={() => setShowRule(false)} className="p-1 rounded hover:bg-white/5"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">Escopo</span>
                <select value={ruleForm.scope} onChange={(e) => setRuleForm({ ...ruleForm, scope: e.target.value as Rule["scope"] })}
                  className="mt-1 w-full px-3 py-2 rounded-lg text-sm text-foreground bg-transparent outline-none"
                  style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.08)" }}>
                  <option value="global" className="bg-background">Global (fallback)</option>
                  <option value="barber" className="bg-background">Por barbeiro</option>
                  <option value="service" className="bg-background">Por serviço</option>
                  <option value="barber_service" className="bg-background">Barbeiro + serviço</option>
                </select>
              </label>
              {["barber", "barber_service"].includes(ruleForm.scope) && (
                <label className="block">
                  <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">Barbeiro</span>
                  <select value={ruleForm.barber_id} onChange={(e) => setRuleForm({ ...ruleForm, barber_id: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg text-sm text-foreground bg-transparent outline-none"
                    style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.08)" }}>
                    <option value="" className="bg-background">Selecione…</option>
                    {barbers.map((b) => <option key={b.id} value={b.id} className="bg-background">{b.name}</option>)}
                  </select>
                </label>
              )}
              {["service", "barber_service"].includes(ruleForm.scope) && (
                <label className="block">
                  <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">Serviço</span>
                  <select value={ruleForm.service_id} onChange={(e) => setRuleForm({ ...ruleForm, service_id: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg text-sm text-foreground bg-transparent outline-none"
                    style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.08)" }}>
                    <option value="" className="bg-background">Selecione…</option>
                    {services.map((s) => <option key={s.id} value={s.id} className="bg-background">{s.title}</option>)}
                  </select>
                </label>
              )}
              <TextField label="Percentual (%)" type="number" step="0.5" min={0} max={100} value={ruleForm.percent} onChange={(e) => setRuleForm({ ...ruleForm, percent: e.target.value })} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <GhostButton onClick={() => setShowRule(false)}>Cancelar</GhostButton>
              <PrimaryButton onClick={addRule}>Salvar regra</PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Commissions;
