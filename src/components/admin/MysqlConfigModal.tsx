import { useState, useEffect } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Plug } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { BarbershopProfile } from "@/hooks/useBarbershops";
import { useQueryClient } from "@tanstack/react-query";

// Sanitiza host: aceita "https://x.com/", "x.com:3306", "tcp://x.com" etc → "x.com"
const sanitizeHost = (raw: string): string => {
  let h = raw.trim();
  // remove protocolo
  h = h.replace(/^[a-zA-Z]+:\/\//, "");
  // remove path/query
  h = h.split("/")[0].split("?")[0];
  // remove porta (capturada em campo separado)
  h = h.split(":")[0];
  return h;
};

const HOSTNAME_RE = /^(?=.{1,253}$)([a-zA-Z0-9_]([a-zA-Z0-9-_]{0,61}[a-zA-Z0-9_])?)(\.[a-zA-Z0-9_]([a-zA-Z0-9-_]{0,61}[a-zA-Z0-9_])?)*$|^(\d{1,3}\.){3}\d{1,3}$/;

const schema = z.object({
  host: z
    .string()
    .trim()
    .min(1, "Host obrigatório")
    .max(255)
    .transform(sanitizeHost)
    .refine((v) => HOSTNAME_RE.test(v), {
      message: "Host inválido. Use apenas o domínio (ex: mysql.seudominio.com.br) — sem https:// nem barras.",
    }),
  port: z.coerce.number().int().min(1).max(65535),
  database_name: z.string().trim().min(1, "Banco obrigatório").max(64),
  username: z.string().trim().min(1, "Usuário obrigatório").max(64),
  password: z.string().min(1, "Senha obrigatória").max(255),
  ssl_enabled: z.boolean(),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  barbershop: BarbershopProfile;
}

export const MysqlConfigModal = ({ open, onOpenChange, barbershop }: Props) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    host: "",
    port: 3306,
    database_name: "",
    username: "",
    password: "",
    ssl_enabled: false,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [existingProfileId, setExistingProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTestResult(null);
    // carrega configuração MySQL atual se existir
    (async () => {
      if (barbershop.mysql_profile_id) {
        const { data } = await supabase
          .from("mysql_profiles")
          .select("*")
          .eq("id", barbershop.mysql_profile_id)
          .maybeSingle();
        if (data) {
          setForm({
            host: data.host,
            port: data.port,
            database_name: data.database_name,
            username: data.username,
            password: "", // nunca exibimos a senha decriptada
            ssl_enabled: data.ssl_enabled,
          });
          setExistingProfileId(data.id);
          return;
        }
      }
      setForm({ host: "", port: 3306, database_name: `barber_${barbershop.slug.replace(/-/g, "_")}`, username: "", password: "", ssl_enabled: false });
      setExistingProfileId(null);
    })();
  }, [open, barbershop]);

  const save = async (): Promise<string | null> => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Erro", description: parsed.error.issues[0].message, variant: "destructive" });
      return null;
    }
    setSaving(true);
    try {
      // Encripta a senha do MySQL via RPC
      const { data: encrypted, error: encErr } = await supabase.rpc("encrypt_mysql_password", {
        _plain: parsed.data.password,
      });
      if (encErr) throw encErr;

      const payload = {
        name: barbershop.name,
        host: parsed.data.host,
        port: parsed.data.port,
        database_name: parsed.data.database_name,
        username: parsed.data.username,
        password_encrypted: encrypted as string,
        ssl_enabled: parsed.data.ssl_enabled,
      };

      let profileId: string;
      if (existingProfileId) {
        const { error } = await supabase.from("mysql_profiles").update(payload).eq("id", existingProfileId);
        if (error) throw error;
        profileId = existingProfileId;
      } else {
        const { data, error } = await supabase.from("mysql_profiles").insert(payload).select("id").single();
        if (error) throw error;
        profileId = data.id;
      }

      // vincula no barbershop
      const { error: linkErr } = await supabase
        .from("barbershop_profiles")
        .update({ mysql_profile_id: profileId })
        .eq("id", barbershop.id);
      if (linkErr) throw linkErr;

      qc.invalidateQueries({ queryKey: ["barbershop_profiles"] });
      toast({ title: "Conexão MySQL salva" });
      setExistingProfileId(profileId);
      return profileId;
    } catch (e) {
      toast({
        title: "Erro ao salvar",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // garante que está salvo antes de testar
      let pid = existingProfileId;
      if (!pid || form.password) {
        pid = await save();
      }
      if (!pid) return;

      const { data, error } = await supabase.functions.invoke("mysql-proxy", {
        body: { action: "test", profile_id: pid },
      });
      if (error) throw error;
      if (!data?.success) {
        setTestResult({ ok: false, msg: data?.error || "Falha desconhecida" });
        return;
      }
      setTestResult({
        ok: true,
        msg: `Conectado! MySQL ${data.data?.version ?? "?"} • banco ${data.data?.database}`,
      });
    } catch (e) {
      setTestResult({ ok: false, msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plug className="w-5 h-5" />
            MySQL — {barbershop.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label htmlFor="host">Host *</Label>
              <Input id="host" value={form.host} onChange={(e) => setForm((p) => ({ ...p, host: e.target.value }))} placeholder="ex: mysql.cliente.com.br" />
            </div>
            <div>
              <Label htmlFor="port">Porta *</Label>
              <Input id="port" type="number" value={form.port} onChange={(e) => setForm((p) => ({ ...p, port: Number(e.target.value) }))} />
            </div>
          </div>

          <div>
            <Label htmlFor="db">Banco *</Label>
            <Input id="db" value={form.database_name} onChange={(e) => setForm((p) => ({ ...p, database_name: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="user">Usuário *</Label>
              <Input id="user" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="pwd">Senha {existingProfileId && "(em branco = manter)"}</Label>
              <Input id="pwd" type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="ssl">SSL</Label>
              <p className="text-xs text-muted-foreground">Use se o provedor exigir TLS.</p>
            </div>
            <Switch id="ssl" checked={form.ssl_enabled} onCheckedChange={(v) => setForm((p) => ({ ...p, ssl_enabled: v }))} />
          </div>

          {testResult && (
            <div
              className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                testResult.ok ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {testResult.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <XCircle className="w-4 h-4 mt-0.5" />}
              <span>{testResult.msg}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving || testing}>
            Fechar
          </Button>
          <Button variant="secondary" onClick={test} disabled={saving || testing}>
            {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Testar conexão
          </Button>
          <Button onClick={save} disabled={saving || testing}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
