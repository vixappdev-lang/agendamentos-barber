import { useState, useEffect } from "react";
import { api } from "@/services/api";

export interface TenantData {
  id: string | number;
  slug: string;
  domain: string | null;
  business_name: string;
  slogan: string | null;
  description: string | null;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  whatsapp_number: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  google_maps_link: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  hero_images: string[] | null;
  gallery_images: string[] | null;
  opening_time: string;
  closing_time: string;
  lunch_start: string;
  lunch_end: string;
  days_off: string;
  plan_type: "start" | "pro" | "whitelabel";
  active: boolean;
}

export const useTenant = () => {
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const detectTenant = async () => {
      try {
        const hostname = window.location.hostname;

        // Try domain detection first
        const response = await api.getTenantByDomain(hostname);

        if (response.success && response.data) {
          const tenantData = response.data as TenantData;
          setTenant(tenantData);
          api.setTenantId(String(tenantData.id));
        } else {
          // Fallback: try slug from URL path
          const pathSlug = window.location.pathname.split("/")[1];
          if (pathSlug) {
            const slugResponse = await api.getTenantBySlug(pathSlug);
            if (slugResponse.success && slugResponse.data) {
              const tenantData = slugResponse.data as TenantData;
              setTenant(tenantData);
              api.setTenantId(String(tenantData.id));
            }
          }
        }
      } catch (err) {
        console.warn("Tenant detection failed, using fallback mode:", err);
        setError("Não foi possível detectar o tenant");
      } finally {
        setLoading(false);
      }
    };

    // Only attempt detection if API URL is configured
    if (import.meta.env.VITE_API_URL) {
      detectTenant();
    } else {
      // Fallback mode: no external API configured yet
      setLoading(false);
    }
  }, []);

  return { tenant, loading, error };
};
