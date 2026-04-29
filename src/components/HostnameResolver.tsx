import { lazy, Suspense, useEffect, useState, ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { callPublic } from "./TenantResolver";
import { TenantSiteProvider, type TenantSiteValue } from "@/contexts/TenantSiteContext";

const Index = lazy(() => import("@/pages/Index"));

interface Props {
  /**
   * Modo "raiz": quando o hostname NÃO resolve para um tenant, renderiza este
   * fallback (landing principal). Quando resolve, mostra o Index do tenant.
   *
   * Ignorado quando `mode="wrapper"`.
   */
  fallback?: ReactNode;
  /**
   * "root"   → comportamento histórico (renderiza Index do tenant ou fallback).
   * "wrapper"→ envolve um <Outlet/> sob TenantSiteProvider quando há tenant;
   *           se não houver tenant, apenas renderiza o <Outlet/> sem provider
   *           (rotas funcionam de forma "global" como antes).
   */
  mode?: "root" | "wrapper";
}

const Loader = () => (
  <div className="min-h-screen w-full flex items-center justify-center bg-background">
    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
  </div>
);

/**
 * Resolve barbearia pelo hostname atual (custom_domain ou subdomain).
 *
 * - mode="root": renderiza Index do tenant ou um fallback (landing global).
 * - mode="wrapper": envolve as rotas filhas em TenantSiteProvider quando há
 *   tenant; sem tenant, deixa as rotas funcionarem como o sistema global.
 */
const HostnameResolver = ({ fallback, mode = "root" }: Props) => {
  const [state, setState] = useState<{ loading: boolean; value: TenantSiteValue | null }>({
    loading: true,
    value: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const host = window.location.hostname.toLowerCase().replace(/^www\./, "");
      // Em previews lovable.app a raiz é landing global — não tentar resolver.
      const isLovablePreview = host.endsWith(".lovable.app") || host === "localhost" || host.startsWith("127.");
      if (isLovablePreview) {
        setState({ loading: false, value: null });
        return;
      }
      const { data } = await callPublic({ host }, "site_settings");
      if (cancelled) return;

      if (!data?.profile) {
        setState({ loading: false, value: null });
        return;
      }

      const settings = (data.data || {}) as Record<string, string>;
      const value: TenantSiteValue = {
        profile: data.profile,
        source: data.source,
        settings,
        publicQuery: (sub, payload) => callPublic({ host }, sub, payload),
      };
      setState({ loading: false, value });
    })();
    return () => { cancelled = true; };
  }, []);

  if (state.loading) return <Loader />;

  if (mode === "wrapper") {
    if (state.value) {
      return (
        <TenantSiteProvider value={state.value}>
          <Outlet />
        </TenantSiteProvider>
      );
    }
    return <Outlet />;
  }

  // mode === "root"
  if (!state.value) return <>{fallback}</>;

  return (
    <TenantSiteProvider value={state.value}>
      <Suspense fallback={<Loader />}>
        <Index />
      </Suspense>
    </TenantSiteProvider>
  );
};

export default HostnameResolver;
