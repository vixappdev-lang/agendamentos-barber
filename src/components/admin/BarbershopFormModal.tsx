import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Shield, Lock, Check, Globe, Copy, ExternalLink, Info, Link2, RefreshCw, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  useCreateBarbershop,
  useUpdateBarbershop,
  type BarbershopProfile,
} from "@/hooks/useBarbershops";
import {
  PERMISSION_GROUPS,
  DEFAULT_PERMISSIONS,
  sanitizePermissions,
  type PermissionKey,
} from "@/lib/barbershopPermissions";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const DOMAIN_RE = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;
const cleanDomain = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");

const baseSchema = {
  name: z.string().trim().min(2, "Nome muito curto").max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífens")
    .min(2)
    .max(60),
  owner_name: z.string().trim().max(120).optional(),
  owner_email: z.string().trim().email("Email inválido").max(255),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(255).optional(),
  custom_domain: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => v === "" || DOMAIN_RE.test(v), "Domínio inválido (ex: barbearia.com.br)")
    .optional(),
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => v === "" || DOMAIN_RE.test(v), "Subdomínio inválido (ex: barbearia.lovable.app)")
    .optional(),
};

const createSchema = z.object({
  ...baseSchema,
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
});

const updateSchema = z.object({
  ...baseSchema,
  password: z.string().max(72).optional(),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile?: BarbershopProfile | null;
}

export const BarbershopFormModal = ({ open, onOpenChange, profile }: Props) => {
  const isEdit = !!profile;
  const queryClient = useQueryClient();
  const createMut = useCreateBarbershop();
  const updateMut = useUpdateBarbershop();
  const loading = createMut.isPending || updateMut.isPending;

  const [form, setForm] = useState({
    name: "",
    slug: "",
    owner_name: "",
    owner_email: "",
    password: "",
    phone: "",
    address: "",
    custom_domain: "",
    subdomain: "",
  });
  const [permissions, setPermissions] = useState<Record<PermissionKey, boolean>>(DEFAULT_PERMISSIONS);
  const [showPwd, setShowPwd] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [tab, setTab] = useState<"info" | "domain" | "perms">("info");

  // ==== Vercel API integration ====
  type VercelStatus = {
    loading: boolean;
    verified?: boolean;
    misconfigured?: boolean;
    nameservers?: string[];
    aValues?: string[];
    cnames?: string[];
    recommendedAValues?: string[];
    recommendedCname?: string;
    apexName?: string;
    error?: string;
  };
  const [vercelBusy, setVercelBusy] = useState<"add" | "verify" | "remove" | null>(null);
  const [statusByDomain, setStatusByDomain] = useState<Record<string, VercelStatus>>({});
  const [vercelDomains, setVercelDomains] = useState<{ name: string; verified?: boolean }[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(false);

  const loadVercelDomains = async () => {
    setLoadingDomains(true);
    try {
      const { data, error } = await supabase.functions.invoke("vercel-domains", { body: { action: "list", domain: "" } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.warning) {
        toast({ title: "Domínios listados com aviso", description: data.warning });
      }

      const inner = data?.data ?? data;
      if (inner && typeof inner === "object" && inner.error) {
        throw new Error(inner.error?.message || inner.error?.code || "Erro Vercel");
      }
      let list: any[] = [];
      if (Array.isArray(inner)) list = inner;
      else if (Array.isArray(inner?.domains)) list = inner.domains;
      else if (Array.isArray(inner?.data)) list = inner.data;

      const cleaned = list
        .map((d: any) => ({ name: String(d?.name || d?.domain || ""), verified: !!d?.verified }))
        .filter((d) => d.name && !d.name.endsWith(".vercel.app"));
      setVercelDomains(cleaned);
      if (!cleaned.length) toast({ title: "Nenhum domínio próprio na Vercel", description: "Adicione um abaixo ou no painel da Vercel." });
    } catch (e: any) {
      toast({ title: "Erro ao listar domínios", description: e?.message || String(e), variant: "destructive" });
    } finally { setLoadingDomains(false); }
  };

  const diagnoseVercel = async () => {
    setLoadingDomains(true);
    try {
      const { data, error } = await supabase.functions.invoke("vercel-domains", { body: { action: "diagnose", domain: "" } });
      if (error) throw new Error(error.message);
      const visible = Array.isArray(data?.projects_visible) ? data.projects_visible : [];
      const domains = Array.isArray(data?.account_domains) ? data.account_domains : [];
      const cfg = data?.configured || {};
      const targetOk = !!data?.ok;
      const summary = [
        `Project ID: ${cfg.project_id || "(vazio)"}`,
        `Team ID: ${cfg.team_id || "(vazio)"}`,
        `Token: ${data?.token_user?.email || "?"}`,
        `Encontrado: ${targetOk ? "SIM" : "NÃO"}`,
        `Projetos visíveis (${visible.length}): ${visible.slice(0, 5).map((p: any) => p.name).join(", ") || "nenhum"}`,
        `Domínios visíveis: ${domains.length}`,
      ].join(" • ");
      toast({
        title: targetOk ? "Vercel OK" : "Vercel mal configurada",
        description: summary,
        variant: targetOk ? "default" : "destructive",
      });
       
      console.log("[vercel diagnose]", data);
    } catch (e: any) {
      toast({ title: "Erro no diagnóstico", description: e?.message || String(e), variant: "destructive" });
    } finally { setLoadingDomains(false); }
  };

  const callVercel = async (action: "add" | "remove" | "verify" | "status", domain: string) => {
    const normalizedDomain = cleanDomain(domain);
    if (!DOMAIN_RE.test(normalizedDomain)) throw new Error("Domínio inválido (ex: barbearia.com.br)");
    const { data, error } = await supabase.functions.invoke("vercel-domains", { body: { action, domain: normalizedDomain } });
    if (error) throw new Error(error.message);
    return data as any;
  };

  const refreshStatus = async (domain: string) => {
    if (!domain) return;
    setStatusByDomain((p) => ({ ...p, [domain]: { ...(p[domain] || {}), loading: true } }));
    try {
      const r = await callVercel("status", domain);
      if (r?.error) throw new Error(r.error);
      const info = r?.info || {};
      const config = r?.config || {};
      setStatusByDomain((p) => ({
        ...p,
        [domain]: {
          loading: false,
          verified: !!info.verified,
          misconfigured: !!config.misconfigured,
          nameservers: config.nameservers,
          aValues: config.aValues,
          cnames: config.cnames,
          recommendedAValues: Array.isArray(config.recommendedIPv4?.[0]?.value) ? config.recommendedIPv4[0].value : undefined,
          recommendedCname: config.recommendedCNAME?.[0]?.value ? String(config.recommendedCNAME[0].value).replace(/\.$/, "") : undefined,
          apexName: info.apexName,
        },
      }));
    } catch (e: any) {
      setStatusByDomain((p) => ({ ...p, [domain]: { loading: false, error: e?.message || "Erro" } }));
    }
  };

  const handleVercelAdd = async (domain: string, field?: "custom_domain" | "subdomain") => {
    if (!domain) { toast({ title: "Informe o domínio primeiro", variant: "destructive" }); return; }
    const normalizedDomain = cleanDomain(domain);
    setVercelBusy("add");
    try {
      const r = await callVercel("add", normalizedDomain);
      if (r?.ok) {
        if (field) update(field, normalizedDomain);
        if (isEdit && profile) {
          const patch = field === "subdomain"
            ? { subdomain: normalizedDomain }
            : { custom_domain: normalizedDomain };
          const { error: saveErr } = await supabase.from("barbershop_profiles").update(patch).eq("id", profile.id);
          if (saveErr) throw saveErr;
          await queryClient.invalidateQueries({ queryKey: ["barbershop_profiles"] });
        }
        const desc = r?.already_linked
          ? "Esse domínio já estava vinculado ao projeto correto e foi salvo neste perfil."
          : r?.moved_from
          ? `Removido do projeto "${r.moved_from}", vinculado aqui e salvo neste perfil.`
          : "Domínio vinculado e salvo neste perfil. Configure o DNS se ainda aparecer pendente.";
        toast({ title: r?.already_linked ? "Domínio já vinculado" : "Domínio vinculado", description: desc });
      } else {
        const raw = r?.error || r?.data?.error?.message || "Erro Vercel";
        const friendly = /already in use/i.test(String(raw))
          ? "Esse domínio já está em outro projeto Vercel da sua conta e não pôde ser movido automaticamente (token sem permissão). Remova-o no dashboard da Vercel e tente novamente."
          : raw;
        toast({ title: "Falha ao vincular", description: friendly, variant: "destructive" });
      }
      await refreshStatus(normalizedDomain);
    } catch (e: any) {
      toast({ title: "Erro Vercel", description: e?.message, variant: "destructive" });
    } finally { setVercelBusy(null); }
  };

  const handleVercelVerify = async (domain: string) => {
    setVercelBusy("verify");
    try { await callVercel("verify", domain); await refreshStatus(domain); toast({ title: "Verificação solicitada" }); }
    catch (e: any) { toast({ title: "Erro", description: e?.message, variant: "destructive" }); }
    finally { setVercelBusy(null); }
  };

  const handleVercelRemove = async (domain: string) => {
    if (!domain || !confirm(`Remover ${domain} da Vercel?`)) return;
    setVercelBusy("remove");
    try {
      const r = await callVercel("remove", domain);
      if (r?.ok) { toast({ title: "Removido" }); setStatusByDomain((p) => { const n = { ...p }; delete n[domain]; return n; }); }
      else toast({ title: "Falha", description: r?.data?.error?.message, variant: "destructive" });
    } catch (e: any) { toast({ title: "Erro", description: e?.message, variant: "destructive" }); }
    finally { setVercelBusy(null); }
  };

  // Auto-status quando aba Domínio abre — pula *.vercel.app (não suportado pela API)
  useEffect(() => {
    if (tab !== "domain") return;
    const sub = form.subdomain.trim();
    const cd = form.custom_domain.trim();
    if (sub && !sub.endsWith(".vercel.app")) refreshStatus(sub);
    if (cd && !cd.endsWith(".vercel.app")) refreshStatus(cd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, profile?.id]);

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name,
        slug: profile.slug,
        owner_name: profile.owner_name ?? "",
        owner_email: profile.owner_email,
        password: "",
        phone: profile.phone ?? "",
        address: profile.address ?? "",
        custom_domain: profile.custom_domain ?? "",
        subdomain: profile.subdomain ?? "",
      });
      setPermissions(sanitizePermissions(profile.permissions));
      setSlugTouched(true);
    } else {
      setForm({ name: "", slug: "", owner_name: "", owner_email: "", password: "", phone: "", address: "", custom_domain: "", subdomain: "" });
      setPermissions({ ...DEFAULT_PERMISSIONS });
      setSlugTouched(false);
    }
    setTab("info");
  }, [profile, open]);

  const update = (k: keyof typeof form, v: string) => {
    setForm((p) => {
      const next = { ...p, [k]: v };
      if (k === "name" && !slugTouched && !isEdit) next.slug = slugify(v);
      return next;
    });
  };

  const togglePerm = (key: PermissionKey, locked?: boolean) => {
    if (locked) return;
    setPermissions((p) => ({ ...p, [key]: !p[key] }));
  };

  const submit = async () => {
    const schema = isEdit ? updateSchema : createSchema;
    const parsed = schema.safeParse({
      ...form,
      owner_name: form.owner_name || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
      password: form.password || undefined,
      custom_domain: form.custom_domain || "",
      subdomain: form.subdomain || "",
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      toast({
        title: "Erro de validação",
        description: issue.message,
        variant: "destructive",
      });
      const path = String(issue.path[0] || "");
      if (path === "custom_domain" || path === "subdomain") setTab("domain");
      else setTab("info");
      return;
    }

    try {
      const cleaned = {
        ...parsed.data,
        custom_domain: parsed.data.custom_domain ? cleanDomain(parsed.data.custom_domain) : null,
        subdomain: parsed.data.subdomain ? cleanDomain(parsed.data.subdomain) : null,
      };
      const payload = { ...cleaned, permissions: sanitizePermissions(permissions) } as any;
      if (isEdit && profile) {
        await updateMut.mutateAsync({ id: profile.id, input: payload });
        toast({ title: "Perfil atualizado", description: "Permissões e dados salvos." });
      } else {
        await createMut.mutateAsync(payload);
        toast({ title: "Barbearia criada", description: "Configure o MySQL e baixe o .sql" });
      }
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Erro ao salvar",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const enabledCount = Object.values(permissions).filter(Boolean).length;
  const totalCount = Object.keys(permissions).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? "Editar Barbearia" : "Nova Barbearia"}
            <span className="text-xs font-normal text-muted-foreground">
              · {enabledCount}/{totalCount} permissões ativas
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="px-6 pt-3 flex gap-2 flex-wrap">
          {[
            { id: "info" as const, label: "Dados & Acesso" },
            { id: "domain" as const, label: "Domínio do Site" },
            { id: "perms" as const, label: "Permissões do Painel" },
          ].map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className="px-3 py-2 rounded-lg text-xs font-semibold transition-colors border"
                style={{
                  background: active ? "hsl(245 60% 55% / 0.12)" : "transparent",
                  color: active ? "hsl(245 60% 70%)" : "hsl(var(--muted-foreground))",
                  borderColor: active ? "hsl(245 60% 55% / 0.3)" : "hsl(var(--border))",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* INFO */}
        {tab === "info" && (
          <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome da barbearia *</Label>
              <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Ex: Barbearia do João" />
            </div>
            <div>
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => { setSlugTouched(true); update("slug", e.target.value.toLowerCase()); }}
                placeholder="barbearia-do-joao"
              />
            </div>

            <div>
              <Label htmlFor="owner_name">Nome do dono</Label>
              <Input id="owner_name" value={form.owner_name} onChange={(e) => update("owner_name", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(11) 99999-9999" />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="owner_email">Email de login *</Label>
              <Input id="owner_email" type="email" value={form.owner_email} onChange={(e) => update("owner_email", e.target.value)} placeholder="dono@barbearia.com" />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="password">
                {isEdit ? "Nova senha (deixe em branco para manter)" : "Senha de login *"}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder={isEdit ? "•••••••• (manter atual)" : "Mínimo 8 caracteres"}
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Bcrypt — exportada no .sql para login no painel PHP/MySQL.</p>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} />
            </div>
          </div>
        )}

        {/* DOMAIN */}
        {tab === "domain" && (() => {
          const slugUrl = form.slug ? `${window.location.origin}/s/${form.slug}` : "";
          const sub = cleanDomain(form.subdomain);
          const cd = cleanDomain(form.custom_domain);
          const copy = (txt: string) => { if (!txt) return; navigator.clipboard.writeText(txt); toast({ title: "Copiado" }); };

          const StatusBadge = ({ domain }: { domain: string }) => {
            const s = statusByDomain[domain];
            if (!s) return null;
            if (s.loading) return <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Verificando…</span>;
            if (s.error) return <span className="text-[10px] text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> {s.error}</span>;
            if (s.verified && !s.misconfigured) return <span className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Ativo · SSL OK</span>;
            if (s.verified && s.misconfigured) return <span className="text-[10px] text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Verificado · DNS pendente</span>;
            return <span className="text-[10px] text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Aguardando DNS</span>;
          };

          const DnsHelper = ({ domain }: { domain: string }) => {
            const s = statusByDomain[domain];
            if (!s || s.loading || s.error) return null;
            const isApex = !s.apexName || domain === s.apexName;
            const aValues = s.recommendedAValues?.length ? s.recommendedAValues : ["76.76.21.21"];
            const cnameValue = s.recommendedCname || "cname.vercel-dns.com";
            return (
              <div className="rounded-lg p-2.5 mt-2 text-[10.5px] leading-snug bg-amber-500/5 border border-amber-500/15 text-amber-200/85 space-y-1.5">
                <p className="font-semibold text-amber-300/90">Configure o DNS no seu provedor:</p>
                {isApex ? (
                  <div className="font-mono text-[10px]">
                    {aValues.map((value) => <div key={value}>Tipo: <b>A</b> · Nome: <b>@</b> · Valor: <b>{value}</b></div>)}
                  </div>
                ) : (
                  <div className="font-mono text-[10px]">
                    <div>Tipo: <b>CNAME</b> · Nome: <b>{domain.split(".")[0]}</b> · Valor: <b>{cnameValue}</b></div>
                  </div>
                )}
                {s.aValues?.length ? <div className="font-mono text-[10px] opacity-70">A atual: {s.aValues.join(", ")}</div> : null}
                {s.cnames?.length ? <div className="font-mono text-[10px] opacity-70">CNAME atual: {s.cnames.join(", ")}</div> : null}
                <p className="opacity-80">SSL é emitido automaticamente após DNS propagar (~1 min).</p>
              </div>
            );
          };

          const VercelActions = ({ domain, field }: { domain: string; field: "custom_domain" | "subdomain" }) => (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" size="sm" variant="default" disabled={!domain || vercelBusy !== null} onClick={() => handleVercelAdd(domain, field)}>
                {vercelBusy === "add" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin"/> : <Link2 className="w-3.5 h-3.5 mr-1.5"/>}
                Vincular e salvar
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={!domain || vercelBusy !== null} onClick={() => handleVercelVerify(domain)}>
                {vercelBusy === "verify" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin"/> : <RefreshCw className="w-3.5 h-3.5 mr-1.5"/>}
                Verificar status
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={!domain || vercelBusy !== null} onClick={() => handleVercelRemove(domain)}>
                {vercelBusy === "remove" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin"/> : <Trash2 className="w-3.5 h-3.5 mr-1.5"/>}
                Remover
              </Button>
            </div>
          );

          // Detecta se o "subdomínio" digitado é da própria Vercel (não pode ser criado via API)
          const isVercelApp = sub.endsWith(".vercel.app");

          return (
            <div className="px-6 py-5 space-y-5">
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <Info className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <b>URL padrão</b> abaixo já funciona sempre — use-a para o subdomínio gratuito da Vercel via path.
                  Para um <b>domínio próprio</b> (.com.br, .com…), preencha o campo correspondente e clique em
                  <b> Vincular na Vercel</b>: a API adiciona, verifica DNS e emite SSL automaticamente.
                </p>
              </div>

              {/* URL padrão (sempre disponível) */}
              <div className="rounded-xl border border-border bg-card/40 p-4 space-y-2">
                <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wide">
                  <Globe className="w-3 h-3" /> URL padrão (sempre disponível · grátis)
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-2.5 py-2 rounded-lg text-[11px] truncate bg-muted/40 border border-border">
                    {slugUrl || "Defina o slug primeiro"}
                  </code>
                  <Button type="button" size="icon" variant="outline" disabled={!slugUrl} onClick={() => copy(slugUrl)}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button type="button" size="icon" variant="outline" disabled={!slugUrl} asChild>
                    <a href={slugUrl} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5" /></a>
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Servida pelo domínio padrão do projeto Vercel (<code>.vercel.app</code>) — não exige DNS nem configuração.
                </p>
              </div>

              {/* Selecionar de domínios JÁ EXISTENTES na Vercel */}
              <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wide">
                    <Link2 className="w-3 h-3" /> Domínios já cadastrados na Vercel
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button type="button" size="sm" variant="ghost" disabled={loadingDomains} onClick={diagnoseVercel} title="Verifica se token, project_id e team_id estão corretos">
                      Diagnosticar
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled={loadingDomains} onClick={loadVercelDomains}>
                      {loadingDomains ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                      {vercelDomains.length ? "Atualizar lista" : "Listar domínios"}
                    </Button>
                  </div>
                </div>
                {vercelDomains.length > 0 ? (
                  <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto pr-1">
                    {vercelDomains.map((d) => {
                      const isPicked = form.custom_domain === d.name || form.subdomain === d.name;
                      return (
                        <div key={d.name} className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${isPicked ? "border-primary/50 bg-primary/5" : "border-border bg-muted/20"}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            {d.verified ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                            <code className="truncate">{d.name}</code>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[10.5px]" onClick={() => update("custom_domain", cleanDomain(d.name))}>
                              Usar como próprio
                            </Button>
                            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[10.5px]" onClick={() => update("subdomain", cleanDomain(d.name))}>
                              Usar como sub
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10.5px] text-muted-foreground">
                    Clique em <b>Listar domínios</b> para puxar todos os domínios já vinculados ao seu projeto Vercel e atribuir um para esta barbearia. Se vier vazia, adicione abaixo digitando o domínio e clicando <b>Vincular na Vercel</b>.
                  </p>
                )}
              </div>

              {/* Subdomínio personalizado (sub do SEU domínio principal — NUNCA *.vercel.app arbitrário) */}
              <div className="rounded-xl border border-border bg-card/40 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="subdomain" className="flex items-center gap-1.5">
                    Subdomínio do seu domínio principal
                    <span className="text-[10px] text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <StatusBadge domain={sub} />
                </div>
                <Input
                  id="subdomain"
                  value={form.subdomain}
                  onChange={(e) => update("subdomain", cleanDomain(e.target.value))}
                  placeholder="ex: barbearia-x.meusistema.com.br"
                />
                <p className="text-[10px] text-muted-foreground">
                  Se você tem um domínio principal (ex: <code>meusistema.com.br</code>), pode criar um subdomínio para cada barbearia.
                  Subdomínios <code>*.vercel.app</code> arbitrários <b>não podem ser criados pela API</b> — use a URL padrão acima.
                </p>
                {isVercelApp && (
                  <div className="rounded-lg p-2.5 text-[10.5px] bg-amber-500/5 border border-amber-500/15 text-amber-200/85">
                    A Vercel não permite criar subdomínios <code>*.vercel.app</code> via API. Para esta barbearia use a <b>URL padrão</b>
                    acima ou um <b>domínio próprio</b> abaixo.
                  </div>
                )}
                {sub && !isVercelApp && (
                  <div className="flex items-center gap-2 pt-1">
                    <code className="flex-1 px-2.5 py-1.5 rounded-md text-[11px] bg-muted/40 border border-border truncate">
                      https://{sub}
                    </code>
                    <Button type="button" size="icon" variant="outline" onClick={() => copy(`https://${sub}`)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
                {sub && !isVercelApp && <VercelActions domain={sub} field="subdomain" />}
                {sub && !isVercelApp && <DnsHelper domain={sub} />}
              </div>

              {/* Domínio próprio */}
              <div className="rounded-xl border border-border bg-card/40 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="custom_domain">Domínio próprio</Label>
                  <StatusBadge domain={cd} />
                </div>
                <Input
                  id="custom_domain"
                  value={form.custom_domain}
                  onChange={(e) => update("custom_domain", cleanDomain(e.target.value))}
                  placeholder="ex: barbearia-x.com.br"
                />
                {cd && (
                  <div className="flex items-center gap-2 pt-1">
                    <code className="flex-1 px-2.5 py-1.5 rounded-md text-[11px] bg-muted/40 border border-border truncate">
                      https://{cd}
                    </code>
                    <Button type="button" size="icon" variant="outline" onClick={() => copy(`https://${cd}`)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
                {cd && <VercelActions domain={cd} field="custom_domain" />}
                {cd && <DnsHelper domain={cd} />}
              </div>
            </div>
          );
        })()}

        {/* PERMISSIONS */}
        {tab === "perms" && (
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <Shield className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Defina o que esta barbearia <b>pode visualizar e acessar</b> no painel admin.
                As permissões são gravadas na tabela <code className="text-foreground">user_permissions</code> do
                .sql exportado e aplicadas em tempo real no painel quando ele se conectar via MySQL.
              </p>
            </div>

            {PERMISSION_GROUPS.map((group) => (
              <div key={group.id} className="rounded-xl border border-border bg-card/40 p-4">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  {group.label}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.items.map((it) => {
                    const on = permissions[it.key];
                    const locked = !!it.lockedOn;
                    return (
                      <button
                        key={it.key}
                        type="button"
                        onClick={() => togglePerm(it.key, locked)}
                        disabled={locked}
                        className="text-left p-3 rounded-lg border transition-all disabled:cursor-not-allowed"
                        style={{
                          background: on ? "hsl(245 60% 55% / 0.08)" : "transparent",
                          borderColor: on ? "hsl(245 60% 55% / 0.3)" : "hsl(var(--border))",
                          opacity: locked ? 0.7 : 1,
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className="w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border"
                            style={{
                              background: on ? "hsl(245 60% 55%)" : "transparent",
                              borderColor: on ? "hsl(245 60% 55%)" : "hsl(var(--border))",
                            }}
                          >
                            {on && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                              {it.label}
                              {locked && <Lock className="w-3 h-3 text-muted-foreground" />}
                            </p>
                            <p className="text-[11px] text-muted-foreground leading-snug">{it.desc}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Salvar alterações" : "Criar barbearia"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
