import { createContext, useContext, ReactNode, useEffect } from "react";
import { setActiveTenant } from "@/lib/tenantPublicBridge";

export interface TenantSiteProfile {
  id: string;
  slug: string;
  name: string;
  site_mode: "full" | "booking";
}

export interface TenantSiteValue {
  profile: TenantSiteProfile;
  source: "mysql" | "cloud";
  settings: Record<string, string>;
  publicQuery: (sub: string, payload?: any) => Promise<{ data: any; error: Error | null }>;
}

const Ctx = createContext<TenantSiteValue | null>(null);

export const TenantSiteProvider = ({ value, children }: { value: TenantSiteValue; children: ReactNode }) => {
  // Registra o tenant ativo no bridge global enquanto este provider estiver montado.
  useEffect(() => {
    setActiveTenant({
      publicQuery: value.publicQuery,
      slug: value.profile?.slug,
    });
    return () => setActiveTenant(null);
  }, [value.publicQuery, value.profile?.slug]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useTenantSite = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTenantSite fora de TenantSiteProvider");
  return v;
};

// Helper para componentes que QUEREM o contexto se existir, mas funcionam sem ele.
export const useOptionalTenantSite = () => useContext(Ctx);
