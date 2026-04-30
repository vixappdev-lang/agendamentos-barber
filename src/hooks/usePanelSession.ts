/**
 * usePanelSession — sessão unificada do painel admin.
 *
 * Une 3 origens possíveis:
 *  1. panel_users (RPC verify_panel_login) → multi-perfil (admin/manager/barber)
 *  2. mysql-proxy session (legado por barbearia)
 *  3. supabase.auth + user_roles=admin (super admin original)
 *
 * Expõe role, barberId, barberName, permissions e helpers de permissão
 * para que páginas filtrem dados pelo barbeiro logado.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminMysqlSession } from "@/lib/adminMysqlSession";
import { isSuperAdmin } from "@/lib/superAdmin";

const PANEL_USER_KEY = "panel_user_session";

export interface PanelUserSession {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "manager" | "barber";
  barber_id: string | null;
  barber_name?: string | null;
  permissions: Record<string, boolean>;
  source: "panel_users";
}

export const getPanelUserSession = (): PanelUserSession | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PANEL_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PanelUserSession;
  } catch { return null; }
};

export const setPanelUserSession = (s: PanelUserSession) => {
  window.localStorage.setItem(PANEL_USER_KEY, JSON.stringify(s));
};

export const clearPanelUserSession = () => {
  window.localStorage.removeItem(PANEL_USER_KEY);
};

export interface PanelSession {
  loading: boolean;
  email: string | null;
  role: "admin" | "manager" | "barber" | "superadmin";
  barberId: string | null;
  barberName: string | null;
  permissions: Record<string, boolean>;
  isSuper: boolean;
  can: (key: string) => boolean;
  isBarberOnly: boolean;
}

const ALL_TRUE = new Proxy({} as Record<string, boolean>, { get: () => true });

export const usePanelSession = (): PanelSession => {
  const [state, setState] = useState<PanelSession>({
    loading: true,
    email: null,
    role: "admin",
    barberId: null,
    barberName: null,
    permissions: ALL_TRUE,
    isSuper: false,
    can: () => true,
    isBarberOnly: false,
  });

  useEffect(() => {
    const resolve = async () => {
      // 1. panel_users
      const panel = getPanelUserSession();
      if (panel) {
        let barberName = panel.barber_name || null;
        if (panel.barber_id && !barberName) {
          const { data } = await supabase.from("barbers").select("name").eq("id", panel.barber_id).maybeSingle();
          barberName = data?.name || null;
        }
        const perms = panel.permissions || {};
        setState({
          loading: false,
          email: panel.email,
          role: panel.role,
          barberId: panel.barber_id,
          barberName,
          permissions: perms,
          isSuper: panel.role === "admin" && isSuperAdmin(panel.email),
          can: (k) => perms[k] !== false,
          isBarberOnly: panel.role === "barber",
        });
        return;
      }

      // 2. mysql session
      const mysql = getAdminMysqlSession();
      if (mysql) {
        const perms = mysql.permissions || ALL_TRUE;
        setState({
          loading: false,
          email: mysql.email,
          role: (mysql.role as any) || "admin",
          barberId: null,
          barberName: null,
          permissions: perms,
          isSuper: isSuperAdmin(mysql.email),
          can: (k) => perms[k] !== false,
          isBarberOnly: mysql.role === "barber",
        });
        return;
      }

      // 3. supabase auth
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user.email || null;
      setState({
        loading: false,
        email,
        role: "admin",
        barberId: null,
        barberName: null,
        permissions: ALL_TRUE,
        isSuper: isSuperAdmin(email),
        can: () => true,
        isBarberOnly: false,
      });
    };
    resolve();
  }, []);

  return state;
};
