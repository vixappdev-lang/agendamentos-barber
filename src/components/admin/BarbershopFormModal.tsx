import { useState, useEffect, useMemo } from "react";
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
        custom_domain: parsed.data.custom_domain ? parsed.data.custom_domain : null,
        subdomain: parsed.data.subdomain ? parsed.data.subdomain : null,
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
          const sub = form.subdomain.trim();
          const cd = form.custom_domain.trim();
          const copy = (txt: string) => { if (!txt) return; navigator.clipboard.writeText(txt); toast({ title: "Copiado" }); };
          return (
            <div className="px-6 py-5 space-y-5">
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <Info className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Vincule um <b>subdomínio gratuito</b> (ex: <code>cliente.lovable.app</code>) e/ou um
                  <b> domínio próprio</b> (que você comprou e adicionou na Vercel/Lovable).
                  O site público resolverá automaticamente para esta barbearia.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card/40 p-4 space-y-2">
                <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wide">
                  <Globe className="w-3 h-3" /> URL padrão (sempre disponível)
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
              </div>

              <div className="rounded-xl border border-border bg-card/40 p-4 space-y-2">
                <Label htmlFor="subdomain" className="flex items-center gap-1.5">
                  Subdomínio gratuito
                  <span className="text-[10px] text-muted-foreground font-normal">(.lovable.app / .vercel.app)</span>
                </Label>
                <Input
                  id="subdomain"
                  value={form.subdomain}
                  onChange={(e) => update("subdomain", e.target.value.trim().toLowerCase())}
                  placeholder="ex: barbearia-x.lovable.app"
                />
                {sub && (
                  <div className="flex items-center gap-2 pt-1">
                    <code className="flex-1 px-2.5 py-1.5 rounded-md text-[11px] bg-muted/40 border border-border truncate">
                      https://{sub}
                    </code>
                    <Button type="button" size="icon" variant="outline" onClick={() => copy(`https://${sub}`)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground leading-snug">
                  Configure no painel da Vercel/Lovable apontando este subdomínio para o projeto.
                  Quando o visitante acessar, o site desta barbearia carregará automaticamente.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card/40 p-4 space-y-2">
                <Label htmlFor="custom_domain">Domínio próprio (existente)</Label>
                <Input
                  id="custom_domain"
                  value={form.custom_domain}
                  onChange={(e) => update("custom_domain", e.target.value.trim().toLowerCase())}
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
                <div className="rounded-lg p-2.5 text-[10.5px] leading-snug bg-amber-500/5 border border-amber-500/15 text-amber-200/80 space-y-1">
                  <p className="font-semibold text-amber-300/90">Passo a passo na Vercel:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Vercel → Projeto → Settings → Domains → <b>Add Domain</b></li>
                    <li>Cole o domínio acima e siga as instruções DNS (CNAME ou A)</li>
                    <li>Aguarde SSL (Let's Encrypt) ser emitido (~1 min)</li>
                    <li>Salve aqui — o site público responderá automaticamente</li>
                  </ol>
                </div>
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
