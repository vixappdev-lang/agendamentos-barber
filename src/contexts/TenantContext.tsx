import { createContext, useContext, ReactNode } from "react";
import { useTenant, TenantData } from "@/hooks/useTenant";

interface TenantContextType {
  tenant: TenantData | null;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  loading: true,
  error: null,
  isConfigured: false,
});

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { tenant, loading, error } = useTenant();
  const isConfigured = !!import.meta.env.VITE_API_URL;

  return (
    <TenantContext.Provider value={{ tenant, loading, error, isConfigured }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenantContext = () => useContext(TenantContext);

export default TenantContext;
