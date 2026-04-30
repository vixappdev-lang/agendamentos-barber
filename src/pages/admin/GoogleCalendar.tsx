import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { CalendarCheck, Link2, Loader2, Trash2, RefreshCw, Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Barber { id: string; name: string; }
interface TokenRow {
  id: string;
  barber_id: string;
  barber_name: string;
  google_email: string | null;
  expires_at: string;
  calendar_id: string;
  created_at: string;
}

const GoogleCalendar = () => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [bRes, tRes] = await Promise.all([
      supabase.from("barbers").select("id, name").eq("active", true).order("sort_order"),
      supabase.from("google_calendar_tokens").select("*"),
    ]);
    setBarbers((bRes.data as any) ?? []);
    setTokens((tRes.data as any) ?? []);
    setLoading(false);
  };

  const connect = async (barber: Barber) => {
    setConnectingId(barber.id);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = new URL(`https://${projectId}.supabase.co/functions/v1/google-oauth-start`);
      url.searchParams.set("barber_id", barber.id);
      url.searchParams.set("barber_name", barber.name);
      url.searchParams.set("return_to", window.location.href);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Falha ao iniciar OAuth");
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e.message);
      setConnectingId(null);
    }
  };

  const disconnect = async (tokenId: string) => {
    if (!confirm("Desconectar essa conta Google?")) return;
    const { error } = await supabase.from("google_calendar_tokens").delete().eq("id", tokenId);
    if (error) toast.error(error.message);
    else { toast.success("Desconectado"); fetchAll(); }
  };

  const tokenForBarber = (id: string) => tokens.find((t) => t.barber_id === id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-primary" /> Google Calendar
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Cada barbeiro pode conectar a própria agenda Google. Quando um agendamento for confirmado, ele aparece automaticamente lá.
          </p>
        </div>
        <button
          onClick={fetchAll}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
          style={{ background: "hsl(0 0% 100% / 0.05)", border: "1px solid hsl(0 0% 100% / 0.1)" }}
        >
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      <div
        className="p-4 rounded-xl flex items-start gap-3"
        style={{ background: "hsl(35 80% 55% / 0.08)", border: "1px solid hsl(35 80% 55% / 0.25)" }}
      >
        <AlertCircle className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
        <div className="text-xs text-muted-foreground">
          <p className="text-foreground font-semibold mb-1">Configuração necessária (admin)</p>
          As credenciais do Google (CLIENT_ID, CLIENT_SECRET e REDIRECT_URI) precisam estar definidas como secrets do backend.
          A REDIRECT_URI deve ser: <code className="px-1.5 py-0.5 rounded bg-black/30">https://{import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/google-oauth-callback</code>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {barbers.map((b, i) => {
            const tk = tokenForBarber(b.id);
            const connected = !!tk;
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card p-4 flex items-center gap-3"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: connected ? "hsl(140 60% 50% / 0.15)" : "hsl(0 0% 100% / 0.05)",
                    border: `1px solid ${connected ? "hsl(140 60% 50% / 0.3)" : "hsl(0 0% 100% / 0.1)"}`,
                  }}
                >
                  <CalendarIcon className={`w-4 h-4 ${connected ? "text-green-400" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{b.name}</p>
                  {connected ? (
                    <p className="text-[11px] text-green-400 truncate">✓ {tk.google_email}</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Não conectado</p>
                  )}
                </div>
                {connected ? (
                  <button
                    onClick={() => disconnect(tk.id)}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Desconectar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => connect(b)}
                    disabled={connectingId === b.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                    style={{
                      background: "hsl(245 60% 55% / 0.15)",
                      color: "hsl(245 60% 75%)",
                      border: "1px solid hsl(245 60% 55% / 0.3)",
                    }}
                  >
                    {connectingId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                    Conectar
                  </button>
                )}
              </motion.div>
            );
          })}
          {barbers.length === 0 && (
            <p className="text-xs text-muted-foreground col-span-full text-center py-8">
              Nenhum barbeiro cadastrado.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default GoogleCalendar;
