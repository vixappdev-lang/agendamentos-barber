import { useEffect, useMemo, useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TenantSiteProvider, type TenantSiteValue } from "@/contexts/TenantSiteContext";

export const callPublic = async (
  identifier: { slug?: string; host?: string },
  sub: string,
  payload?: any,
) => {
  const { data, error } = await supabase.functions.invoke("mysql-proxy", {
    body: { action: "public_query", ...identifier, sub, payload },
  });
  if (error) return { data: null, error };
  if (data?.success === false) return { data: null, error: new Error(data.code || data.error || "Erro") };
  return { data, error: null };
};

const setMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}='${name}']`) as HTMLMetaElement | null;
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
  el.content = content;
};

const applyTheme = (s: Record<string, string>, profileName: string, slug: string) => {
  const root = document.documentElement;
  if (s.site_primary) root.style.setProperty("--tenant-primary", s.site_primary);
  if (s.site_accent) root.style.setProperty("--tenant-accent", s.site_accent);
  if (s.site_bg) root.style.setProperty("--tenant-bg", s.site_bg);

  const title = s.site_seo_title || s.business_name || profileName;
  document.title = title;
  setMeta("description", s.site_seo_description || s.description || "");
  setMeta("og:title", title, "property");
  setMeta("og:description", s.site_seo_description || s.description || "", "property");
  setMeta("og:url", `${window.location.origin}/s/${slug}`, "property");
  if (s.site_seo_og_image) setMeta("og:image", s.site_seo_og_image, "property");

  if (s.site_favicon_url) {
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = s.site_favicon_url;
  }
};

const NotFound = ({ slug }: { slug: string }) => (
  <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
    <h1 className="text-2xl font-bold mb-2">Site não encontrado</h1>
    <p className="text-muted-foreground">A barbearia <code className="px-1.5 py-0.5 rounded bg-muted">{slug}</code> não existe ou não está publicada.</p>
  </div>
);

const TenantResolver = () => {
  const { slug = "" } = useParams();
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    value: TenantSiteValue | null;
  }>({ loading: true, error: null, value: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState({ loading: true, error: null, value: null });
      const { data, error } = await callPublic(slug, "site_settings");
      if (cancelled) return;
      if (error || !data?.profile) {
        setState({ loading: false, error: "not_found", value: null });
        return;
      }
      const settings = (data.data || {}) as Record<string, string>;
      applyTheme(settings, data.profile?.name || slug, slug);
      const value: TenantSiteValue = {
        profile: data.profile,
        source: data.source,
        settings,
        publicQuery: (sub, payload) => callPublic(slug, sub, payload),
      };
      setState({ loading: false, error: null, value });
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const ctx = useMemo(() => state.value, [state.value]);

  if (state.loading) {
    return <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>;
  }
  if (state.error || !ctx) return <NotFound slug={slug} />;

  return (
    <TenantSiteProvider value={ctx}>
      <Outlet />
    </TenantSiteProvider>
  );
};

export default TenantResolver;
