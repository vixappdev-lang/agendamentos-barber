import { createContext, useContext, ReactNode, useEffect, useRef } from "react";
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
  // CRÍTICO: ativar o bridge SINCRONAMENTE, antes dos children renderizarem,
  // pra garantir que QUALQUER `supabase.from(...)` em useEffect dos filhos
  // já encontre o tenant ativo. useEffect rodaria DEPOIS dos effects dos filhos.
  const ref = useRef<string | null>(null);
  const slug = value.profile?.slug || null;
  if (ref.current !== slug) {
    setActiveTenant({
      publicQuery: value.publicQuery,
      slug: slug || undefined,
    });
    ref.current = slug;
  }

  // Cleanup quando o provider for desmontado
  useEffect(() => {
    return () => {
      setActiveTenant(null);
      ref.current = null;
    };
  }, []);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useTenantSite = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTenantSite fora de TenantSiteProvider");
  return v;
};

// Helper para componentes que QUEREM o contexto se existir, mas funcionam sem ele.
export const useOptionalTenantSite = () => useContext(Ctx);
