import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Plug,
  Download,
  Lock,
  Cloud,
  CheckCircle2,
  Circle,
  Loader2,
  AlertTriangle,
  BarChart3,
  Database as DbIcon,
  Mail,
  Phone as PhoneIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useBarbershops, useDeleteBarbershop, type BarbershopProfile } from "@/hooks/useBarbershops";
import { BarbershopFormModal } from "@/components/admin/BarbershopFormModal";
import { MysqlConfigModal } from "@/components/admin/MysqlConfigModal";
import { BarbershopMonitorModal } from "@/components/admin/BarbershopMonitorModal";
import { downloadProfileSQL } from "@/lib/profileSqlGenerator";

const PER_PAGE = 10;

const StatusBadge = ({ p }: { p: BarbershopProfile }) => {
  if (p.is_cloud) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
        <Cloud className="w-3 h-3" /> Lovable Cloud
      </span>
    );
  }
  if (!p.mysql_profile_id) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
        <Circle className="w-3 h-3" /> MySQL pendente
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">
      <CheckCircle2 className="w-3 h-3" /> MySQL conectado
    </span>
  );
};

interface OverviewCardProps {
  label: string;
  value: string | number;
  icon: typeof Building2;
  tone?: "primary" | "info" | "success" | "muted";
}

const OverviewCard = ({ label, value, icon: Icon, tone = "primary" }: OverviewCardProps) => {
  const tones: Record<string, { bg: string; fg: string }> = {
    primary: { bg: "hsl(245 60% 55% / 0.12)", fg: "hsl(245 60% 70%)" },
    info: { bg: "hsl(200 70% 55% / 0.12)", fg: "hsl(200 70% 65%)" },
    success: { bg: "hsl(140 60% 50% / 0.12)", fg: "hsl(140 60% 60%)" },
    muted: { bg: "hsl(0 0% 100% / 0.05)", fg: "hsl(0 0% 75%)" },
  };
  const t = tones[tone];
  return (
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4 flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: t.bg }}
      >
        <Icon className="w-5 h-5" style={{ color: t.fg }} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
      </div>
    </div>
  );
};

const Barbershops = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, loading: loadingAdmin } = useSuperAdmin();
  const { data: barbershops = [], isLoading } = useBarbershops();
  const deleteMut = useDeleteBarbershop();

  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BarbershopProfile | null>(null);
  const [mysqlFor, setMysqlFor] = useState<BarbershopProfile | null>(null);
  const [monitorFor, setMonitorFor] = useState<BarbershopProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BarbershopProfile | null>(null);

  const totalPages = Math.max(1, Math.ceil(barbershops.length / PER_PAGE));
  const pageItems = useMemo(
    () => barbershops.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [barbershops, page],
  );

  const overview = useMemo(() => {
    const total = barbershops.length;
    const cloud = barbershops.filter((b) => b.is_cloud).length;
    const mysql = barbershops.filter((b) => !b.is_cloud && b.mysql_profile_id).length;
    const pending = barbershops.filter((b) => !b.is_cloud && !b.mysql_profile_id).length;
    return { total, cloud, mysql, pending };
  }, [barbershops]);

  if (!loadingAdmin && !isSuperAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 mx-auto text-amber-500" />
        <h2 className="text-xl font-bold text-foreground">Acesso restrito</h2>
        <p className="text-muted-foreground">Esta área é exclusiva do super admin.</p>
        <Button onClick={() => navigate("/admin")}>Voltar ao painel</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6" /> Perfis de Barbearias
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie barbearias clientes — cada uma com seu próprio MySQL e SQL para importar.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Nova Barbearia
        </Button>
      </header>

      {/* Dashboard de overview */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <OverviewCard label="Total" value={overview.total} icon={Building2} tone="primary" />
        <OverviewCard label="No Cloud" value={overview.cloud} icon={Cloud} tone="info" />
        <OverviewCard label="MySQL ativo" value={overview.mysql} icon={DbIcon} tone="success" />
        <OverviewCard label="Pendentes" value={overview.pending} icon={Circle} tone="muted" />
      </section>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : barbershops.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground rounded-xl border border-dashed border-border">
          Nenhuma barbearia cadastrada ainda.
        </div>
      ) : (
        <>
          <div className="grid gap-3">
            {pageItems.map((p) => (
              <article
                key={p.id}
                className="group rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4 transition-all hover:border-primary/30 hover:bg-card/80"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Avatar + Info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-base font-bold uppercase"
                      style={{
                        background: p.is_cloud
                          ? "hsl(200 70% 55% / 0.12)"
                          : "hsl(245 60% 55% / 0.12)",
                        color: p.is_cloud ? "hsl(200 70% 65%)" : "hsl(245 60% 70%)",
                        border: `1px solid ${p.is_cloud ? "hsl(200 70% 55% / 0.25)" : "hsl(245 60% 55% / 0.25)"}`,
                      }}
                    >
                      {p.name.slice(0, 2)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground truncate">{p.name}</h3>
                        {p.is_locked && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <Lock className="w-3 h-3" /> Travado
                          </span>
                        )}
                        <StatusBadge p={p} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                          <span className="opacity-60">slug:</span>
                          <code className="text-foreground/80 px-1.5 py-0.5 rounded bg-muted/50 text-[11px]">
                            {p.slug}
                          </code>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {p.owner_email}
                        </span>
                        {p.phone && (
                          <span className="inline-flex items-center gap-1">
                            <PhoneIcon className="w-3 h-3" /> {p.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações — somente ícones, hover neutro (sem amarelo) */}
                  <div className="flex items-center gap-1 lg:justify-end shrink-0">
                    {[
                      {
                        icon: BarChart3,
                        label: "Monitorar",
                        onClick: () => setMonitorFor(p),
                        disabled: false,
                        tone: "default" as const,
                      },
                      {
                        icon: Pencil,
                        label: p.is_locked ? "Perfil travado" : "Editar",
                        onClick: () => { setEditing(p); setFormOpen(true); },
                        disabled: p.is_locked,
                        tone: "default" as const,
                      },
                      {
                        icon: Plug,
                        label: p.is_cloud ? "Roda no Lovable Cloud" : "Configurar MySQL",
                        onClick: () => setMysqlFor(p),
                        disabled: p.is_locked,
                        tone: "default" as const,
                      },
                      {
                        icon: Download,
                        label: p.is_cloud ? "Cloud não exporta .sql" : "Baixar SQL para phpMyAdmin",
                        onClick: () => {
                          try {
                            downloadProfileSQL(p);
                            toast({ title: "Download iniciado", description: `barber-${p.slug}.sql` });
                          } catch (e) {
                            toast({
                              title: "Erro",
                              description: e instanceof Error ? e.message : String(e),
                              variant: "destructive",
                            });
                          }
                        },
                        disabled: p.is_cloud,
                        tone: "default" as const,
                      },
                      {
                        icon: Trash2,
                        label: p.is_locked ? "Perfil travado" : "Excluir",
                        onClick: () => setDeleteTarget(p),
                        disabled: p.is_locked,
                        tone: "danger" as const,
                      },
                    ].map((a, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={a.onClick}
                        disabled={a.disabled}
                        title={a.label}
                        aria-label={a.label}
                        className={
                          "w-9 h-9 inline-flex items-center justify-center rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed " +
                          (a.tone === "danger"
                            ? "border-border bg-card/40 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                            : "border-border bg-card/40 text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:border-border")
                        }
                      >
                        <a.icon className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => { e.preventDefault(); setPage((v) => Math.max(1, v - 1)); }}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <PaginationItem key={n}>
                    <PaginationLink
                      href="#"
                      isActive={n === page}
                      onClick={(e) => { e.preventDefault(); setPage(n); }}
                    >
                      {n}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => { e.preventDefault(); setPage((v) => Math.min(totalPages, v + 1)); }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      {/* Modais */}
      <BarbershopFormModal open={formOpen} onOpenChange={setFormOpen} profile={editing} />
      {mysqlFor && (
        <MysqlConfigModal
          open={!!mysqlFor}
          onOpenChange={(v) => !v && setMysqlFor(null)}
          barbershop={mysqlFor}
        />
      )}
      {monitorFor && (
        <BarbershopMonitorModal
          open={!!monitorFor}
          onOpenChange={(v) => !v && setMonitorFor(null)}
          barbershop={monitorFor}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir barbearia?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  Esta ação removerá permanentemente o perfil <b>{deleteTarget.name}</b>. O banco
                  MySQL do cliente NÃO será apagado — apenas o vínculo no painel.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  await deleteMut.mutateAsync(deleteTarget.id);
                  toast({ title: "Excluído" });
                } catch (e) {
                  toast({
                    title: "Erro",
                    description: e instanceof Error ? e.message : String(e),
                    variant: "destructive",
                  });
                }
                setDeleteTarget(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Barbershops;
