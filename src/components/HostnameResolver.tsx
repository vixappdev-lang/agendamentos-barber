import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { callPublic } from "./TenantResolver";
import { TenantSiteProvider, type TenantSiteValue } from "@/contexts/TenantSiteContext";
import TenantSite from "@/pages/tenant/TenantSite";

/**
 * Resolve barbearia pelo hostname atual (custom_domain ou subdomain).
 * Se nenhum perfil corresponde ao host, renderiza o fallback (landing principal).
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
      // Hosts internos do Lovable/Vercel — pula a tentativa
      const isInternal =
        host === "localhost" ||
        host.endsWith(".lovableproject.com") ||
        host.endsWith(".lovable.app") && !host.includes("--") === false; // mantém subdomínios "barbearia.lovable.app"

      // Tenta sempre — o backend devolve NOT_FOUND se não bater
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
      <TenantSite />
    </TenantSiteProvider>
  );
};

export default HostnameResolver;
