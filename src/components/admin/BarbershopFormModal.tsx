import { useState, useEffect } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import {
  useCreateBarbershop,
  useUpdateBarbershop,
  type BarbershopProfile,
} from "@/hooks/useBarbershops";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

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
  });
  const [showPwd, setShowPwd] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

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
      });
      setSlugTouched(true);
    } else {
      setForm({ name: "", slug: "", owner_name: "", owner_email: "", password: "", phone: "", address: "" });
      setSlugTouched(false);
    }
  }, [profile, open]);

  const update = (k: keyof typeof form, v: string) => {
    setForm((p) => {
      const next = { ...p, [k]: v };
      if (k === "name" && !slugTouched && !isEdit) next.slug = slugify(v);
      return next;
    });
  };

  const submit = async () => {
    const schema = isEdit ? updateSchema : createSchema;
    const parsed = schema.safeParse({
      ...form,
      owner_name: form.owner_name || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
      password: form.password || undefined,
    });
    if (!parsed.success) {
      toast({
        title: "Erro de validação",
        description: parsed.error.issues[0].message,
        variant: "destructive",
      });
      return;
    }

    try {
      if (isEdit && profile) {
        await updateMut.mutateAsync({ id: profile.id, input: parsed.data as any });
        toast({ title: "Perfil atualizado" });
      } else {
        await createMut.mutateAsync(parsed.data as any);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Barbearia" : "Nova Barbearia"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="name">Nome da barbearia *</Label>
            <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Ex: Vila Nova Barbershop" />
          </div>

          <div>
            <Label htmlFor="slug">Slug (identificador único) *</Label>
            <Input
              id="slug"
              value={form.slug}
              onChange={(e) => { setSlugTouched(true); update("slug", e.target.value.toLowerCase()); }}
              placeholder="vila-nova"
            />
            <p className="text-xs text-muted-foreground mt-1">Apenas letras minúsculas, números e hífens.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="owner_name">Nome do dono</Label>
              <Input id="owner_name" value={form.owner_name} onChange={(e) => update("owner_name", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(11) 99999-9999" />
            </div>
          </div>

          <div>
            <Label htmlFor="owner_email">Email de login *</Label>
            <Input id="owner_email" type="email" value={form.owner_email} onChange={(e) => update("owner_email", e.target.value)} placeholder="dono@barbearia.com" />
          </div>

          <div>
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
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Será criptografada com bcrypt. Vai junto no .sql exportado.
            </p>
          </div>

          <div>
            <Label htmlFor="address">Endereço</Label>
            <Input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
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
