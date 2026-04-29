import { lazy, Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { callPublic } from "./TenantResolver";
import { TenantSiteProvider, type TenantSiteValue } from "@/contexts/TenantSiteContext";

const Index = lazy(() => import("@/pages/Index"));

/**
 * Resolve barbearia pelo hostname atual (custom_domain ou subdomain).
 * Quando bate, renderiza o site REAL (Index) sob o tenant.
 * Quando NÃO bate, renderiza o fallback (landing principal).
 */
const HostnameResolver = ({ fallback }: { fallback: React.ReactNode }) => {
  const [state, setState] = useState<{ loading: boolean; value: TenantSiteValue | null }>({
    loading: true,
    value: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const host = window.location.hostname.toLowerCase();
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

  if (state.loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!state.value) return <>{fallback}</>;

  return (
    <TenantSiteProvider value={state.value}>
      <Suspense fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-background">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      }>
        <Index />
      </Suspense>
    </TenantSiteProvider>
  );
};

export default HostnameResolver;
