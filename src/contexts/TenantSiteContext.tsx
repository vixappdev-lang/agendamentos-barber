import { createContext, useContext, ReactNode } from "react";

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

export const TenantSiteProvider = ({ value, children }: { value: TenantSiteValue; children: ReactNode }) => (
  <Ctx.Provider value={value}>{children}</Ctx.Provider>
);

export const useTenantSite = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTenantSite fora de TenantSiteProvider");
  return v;
};
