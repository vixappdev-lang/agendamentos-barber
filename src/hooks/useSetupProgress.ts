import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminMysqlSession } from "@/lib/adminMysqlSession";
import { isSuperAdmin } from "@/lib/superAdmin";

export interface SetupStep {
  id: string;
  title: string;
  desc: string;
  href: string;
  done: boolean;
  superAdminOnly?: boolean;
}

const STEP_DEFS: Omit<SetupStep, "done">[] = [
  { id: "mysql", title: "Banco MySQL conectado", desc: "Configure o servidor MySQL do seu perfil.", href: "/admin/barbershops", superAdminOnly: true },
  { id: "schema", title: "Schema importado", desc: "Importe o SQL inicial das tabelas.", href: "/admin/barbershops", superAdminOnly: true },
  { id: "branding", title: "Logo e cores definidas", desc: "Personalize a identidade visual.", href: "/admin/settings" },
  { id: "site_content", title: "Conteúdo do site", desc: "Hero, sobre e textos principais.", href: "/admin/settings" },
  { id: "hours", title: "Horários configurados", desc: "Abertura, fechamento e dias off.", href: "/admin/settings" },
  { id: "messages", title: "Mensagens do WhatsApp", desc: "Defina templates de notificação.", href: "/admin/settings" },
  { id: "publish", title: "Site publicado", desc: "Ative o site para o mundo ver.", href: "/admin/settings" },
];

const computeFromSettings = (s: Record<string, string>, hasMysql: boolean): SetupStep[] => {
  return STEP_DEFS.map((d) => {
    let done = false;
    switch (d.id) {
      case "mysql": done = hasMysql; break;
      case "schema": done = s.schema_imported === "true" || hasMysql; break;
      case "branding": done = !!(s.logo_url || s.primary_color); break;
      case "site_content": done = !!(s.hero_title || s.about_description); break;
      case "hours": done = !!(s.opening_time && s.closing_time); break;
      case "messages": done = !!(s.msg_on_book || s.msg_on_confirm); break;
      case "publish": done = s.site_published === "true"; break;
    }
    return { ...d, done };
  });
};

export const useSetupProgress = (adminEmail?: string | null) => {
  const [steps, setSteps] = useState<SetupStep[]>(STEP_DEFS.map((d) => ({ ...d, done: false })));
  const [welcomeSeen, setWelcomeSeen] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const session = getAdminMysqlSession();
    const hasMysql = !!session?.barbershop_id;

    const { data } = await supabase.from("business_settings").select("key, value");
    const map: Record<string, string> = {};
    for (const r of data || []) map[r.key] = r.value || "";

    const all = computeFromSettings(map, hasMysql);
    const filtered = isSuperAdmin(adminEmail) ? all : all.filter((s) => !s.superAdminOnly);
    setSteps(filtered);
    setWelcomeSeen(map.welcome_seen === "true");
    setLoading(false);
  }, [adminEmail]);

  useEffect(() => { refresh(); }, [refresh]);

  const markWelcomeSeen = useCallback(async () => {
    await supabase.from("business_settings").upsert({ key: "welcome_seen", value: "true" }, { onConflict: "key" });
    setWelcomeSeen(true);
  }, []);

  const completedCount = steps.filter((s) => s.done).length;
  const totalCount = steps.length;
  const allDone = totalCount > 0 && completedCount === totalCount;

  return { steps, completedCount, totalCount, allDone, welcomeSeen, loading, refresh, markWelcomeSeen };
};
