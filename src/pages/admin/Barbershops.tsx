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
  XCircle,
  Circle,
  Loader2,
  AlertTriangle,
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
import { downloadProfileSQL } from "@/lib/profileSqlGenerator";

const PER_PAGE = 10;

const StatusBadge = ({ p }: { p: BarbershopProfile }) => {
  if (p.is_cloud) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20">
        <Cloud className="w-3 h-3" /> Lovable Cloud
      </span>
    );
  }
  if (!p.mysql_profile_id) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground border border-border">
        <Circle className="w-3 h-3" /> MySQL não configurado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-400 border border-green-500/20">
      <CheckCircle2 className="w-3 h-3" /> MySQL conectado
    </span>
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
  const [deleteTarget, setDeleteTarget] = useState<BarbershopProfile | null>(null);

  const totalPages = Math.max(1, Math.ceil(barbershops.length / PER_PAGE));
  const pageItems = useMemo(
    () => barbershops.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [barbershops, page],
  );

  if (!loadingAdmin && !isSuperAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 mx-auto text-amber-500" />
        <h2 className="text-xl font-bold text-foreground">Acesso restrito</h2>
        <p className="text-muted-foreground">
          Esta área é exclusiva do super admin.
        </p>
        <Button onClick={() => navigate("/admin")}>Voltar ao painel</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6" /> Perfis de Barbearias
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie barbearias clientes. Cada uma tem seu próprio MySQL e .sql para importar.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Nova Barbearia
        </Button>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : barbershops.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          Nenhuma barbearia cadastrada ainda.
        </div>
      ) : (
        <>
          <div className="grid gap-3">
            {pageItems.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate">{p.name}</h3>
                    {p.is_locked && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        <Lock className="w-3 h-3" /> Travado
                      </span>
                    )}
                    <StatusBadge p={p} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>slug: <code className="text-foreground/80">{p.slug}</code></span>
                    <span>•</span>
                    <span>{p.owner_email}</span>
                    {p.phone && (<><span>•</span><span>{p.phone}</span></>)}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditing(p); setFormOpen(true); }}
                    disabled={p.is_locked}
                    title={p.is_locked ? "Perfil travado" : "Editar"}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setMysqlFor(p)}
                    disabled={p.is_locked}
                    title={p.is_cloud ? "Roda no Lovable Cloud" : "Configurar MySQL"}
                  >
                    <Plug className="w-3.5 h-3.5 mr-1" /> MySQL
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
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
                    }}
                    disabled={p.is_cloud}
                    title={p.is_cloud ? "Cloud não exporta .sql" : "Baixar SQL para phpMyAdmin"}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> .sql
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteTarget(p)}
                    disabled={p.is_locked}
                    className="text-destructive hover:text-destructive"
                    title={p.is_locked ? "Perfil travado" : "Excluir"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
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

      <BarbershopFormModal open={formOpen} onOpenChange={setFormOpen} profile={editing} />
      {mysqlFor && (
        <MysqlConfigModal
          open={!!mysqlFor}
          onOpenChange={(v) => !v && setMysqlFor(null)}
          barbershop={mysqlFor}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir barbearia?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>Esta ação removerá permanentemente o perfil <b>{deleteTarget.name}</b>. O banco MySQL do cliente NÃO será apagado — apenas o vínculo no painel.</>
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
