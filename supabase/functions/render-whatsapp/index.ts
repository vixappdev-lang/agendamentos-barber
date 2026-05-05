import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (b: object, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action, config, phone, message } = body;

    // ---------- PUBLIC: send_message ----------
    if (action === "send_message") {
      if (!phone || !message) return json({ error: "phone e message obrigatórios" }, 400);

      const { data: rows } = await service.from("render_config").select("*").limit(1);
      const cfg = rows?.[0];
      if (!cfg || !cfg.url || !cfg.shared_secret || !cfg.enabled) {
        return json({ success: false, reason: "render_not_configured" });
      }

      try {
        const r = await fetch(`${cfg.url.replace(/\/$/, "")}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            secret: cfg.shared_secret,
            phone: phone.replace(/\D/g, ""),
            message,
          }),
        });
        const data = await r.json().catch(() => ({}));
        return json({ success: r.ok, data });
      } catch (e) {
        console.error("Render send error:", e);
        return json({ success: false, reason: "send_failed" });
      }
    }

    // ---------- ADMIN AUTH ----------
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Não autenticado" }, 401);

    const { data: roles } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");
    if (!roles || roles.length === 0) return json({ error: "Acesso negado" }, 403);

    if (action === "save_config") {
      const { url, shared_secret, enabled } = config || {};
      if (!url || !shared_secret) return json({ error: "URL e segredo obrigatórios" }, 400);
      await service.from("render_config").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const { error } = await service.from("render_config").insert({
        url: url.trim().replace(/\/$/, ""),
        shared_secret: shared_secret.trim(),
        enabled: enabled !== false,
      });
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "get_config") {
      const { data: rows } = await service.from("render_config").select("*").limit(1);
      const cfg = rows?.[0] || null;
      if (cfg) cfg.shared_secret = cfg.shared_secret ? "••••••" + cfg.shared_secret.slice(-4) : "";
      return json({ config: cfg });
    }

    // For status/qr/logout — proxy to Render server
    const { data: rows } = await service.from("render_config").select("*").limit(1);
    const cfg = rows?.[0];
    if (!cfg || !cfg.url) return json({ error: "Render não configurado" }, 400);
    const base = cfg.url.replace(/\/$/, "");

    const proxy = async (path: string, method = "GET") => {
      try {
        const r = await fetch(`${base}${path}`, {
          method,
          headers: { "x-secret": cfg.shared_secret, "Content-Type": "application/json" },
        });
        const text = await r.text();
        try {
          return json({ status: r.status, data: JSON.parse(text) });
        } catch {
          return json({ status: r.status, data: { raw: text.slice(0, 200) } });
        }
      } catch (e: any) {
        return json({ status: 0, error: e?.message || "fetch_failed" });
      }
    };

    if (action === "status") return proxy("/status");
    if (action === "qr") return proxy("/qr");
    if (action === "logout") return proxy("/logout", "POST");
    if (action === "restart") return proxy("/restart", "POST");

    return json({ error: "Ação inválida" }, 400);
  } catch (e: any) {
    console.error("render-whatsapp error:", e);
    return json({ error: e?.message || "Erro interno" }, 500);
  }
});
