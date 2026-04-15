import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ThemeContextValue {
  themeMode: "dark" | "light";
  themeAreas: string[];
  isLightMode: boolean; // for current route
}

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: "dark",
  themeAreas: [],
  isLightMode: false,
});

export const useThemeContext = () => useContext(ThemeContext);

export const useIsLightMode = () => {
  const { isLightMode } = useThemeContext();
  return isLightMode;
};

function getAreaFromPath(pathname: string): string {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname === "/membro" || pathname === "/login" || pathname.startsWith("/vilanova/membro") || pathname.startsWith("/vilanova/login")) return "member";
  return "site";
}

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const [themeAreas, setThemeAreas] = useState<string[]>([]);
  const location = useLocation();

  // Fetch theme settings
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("business_settings")
        .select("key, value")
        .in("key", ["theme_mode", "theme_areas"]);
      if (data) {
        for (const row of data) {
          if (row.key === "theme_mode") setThemeMode((row.value as "dark" | "light") || "dark");
          if (row.key === "theme_areas") {
            try { setThemeAreas(JSON.parse(row.value || "[]")); } catch { setThemeAreas([]); }
          }
        }
      }
    };
    fetch();

    // Listen for realtime changes to business_settings
    const channel = supabase
      .channel("theme-settings")
      .on("postgres_changes", { event: "*", schema: "public", table: "business_settings" }, (payload: any) => {
        const row = payload.new;
        if (row?.key === "theme_mode") setThemeMode(row.value || "dark");
        if (row?.key === "theme_areas") {
          try { setThemeAreas(JSON.parse(row.value || "[]")); } catch { setThemeAreas([]); }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Determine if current route should be light
  const currentArea = getAreaFromPath(location.pathname);
  const isLightMode = themeMode === "light" && themeAreas.includes(currentArea);

  // Apply class to <html>
  useEffect(() => {
    const html = document.documentElement;
    if (isLightMode) {
      html.classList.add("light-theme");
    } else {
      html.classList.remove("light-theme");
    }
    return () => { html.classList.remove("light-theme"); };
  }, [isLightMode]);

  return (
    <ThemeContext.Provider value={{ themeMode, themeAreas, isLightMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
