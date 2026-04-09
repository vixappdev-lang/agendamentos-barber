import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action, config, phone, message } = body;

    // === PUBLIC ACTION: send_message (no admin auth needed) ===
    if (action === "send_message") {
      if (!phone || !message) {
        return jsonResponse({ error: "Telefone e mensagem são obrigatórios" }, 400);
      }

      const { data: cfgRows } = await serviceClient
        .from("chatpro_config")
        .select("*")
        .limit(1);

      const cfg = cfgRows?.[0];
      if (!cfg || !cfg.instance_id || !cfg.token || !cfg.endpoint) {
        // Fallback: ChatPro not configured, skip silently
        return jsonResponse({ success: false, reason: "chatpro_not_configured" });
      }

      let endpoint = cfg.endpoint.replace(/\/$/, "");
      const baseUrl = endpoint.includes(cfg.instance_id)
        ? `${endpoint}/api/v1`
        : `${endpoint}/${cfg.instance_id}/api/v1`;
      const chatproHeaders = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": cfg.token,
      };

      try {
        const res = await fetch(`${baseUrl}/send_message`, {
          method: "POST",
          headers: chatproHeaders,
          body: JSON.stringify({
            number: phone.replace(/\D/g, ""),
            message: message,
          }),
        });
        const data = await res.json();
        console.log("ChatPro send_message response:", JSON.stringify(data));
        return jsonResponse({ success: true, data });
      } catch (err) {
        console.error("ChatPro send_message error:", err);
        return jsonResponse({ success: false, reason: "send_failed" });
      }
    }

    // === ADMIN ACTIONS: require authentication ===
    const authHeader = req.headers.get("Authorization");
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Não autenticado" }, 401);
    }

    const { data: roles } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return jsonResponse({ error: "Acesso negado" }, 403);
    }

    // Save config
    if (action === "save_config") {
      const { instance_id, token, endpoint } = config || {};
      if (!instance_id || !token || !endpoint) {
        return jsonResponse({ error: "Campos obrigatórios não preenchidos" }, 400);
      }

      await serviceClient.from("chatpro_config").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const { error: insertErr } = await serviceClient.from("chatpro_config").insert({
        instance_id: instance_id.trim(),
        token: token.trim(),
        endpoint: endpoint.trim().replace(/\/$/, ""),
      });

      if (insertErr) {
        return jsonResponse({ error: "Erro ao salvar: " + insertErr.message }, 500);
      }
      return jsonResponse({ success: true });
    }

    // Get config (without exposing token)
    if (action === "get_config") {
      const { data: cfgRows } = await serviceClient
        .from("chatpro_config")
        .select("instance_id, endpoint, token, created_at, updated_at")
        .limit(1);

      const cfg = cfgRows?.[0] || null;
      if (cfg) {
        // Return masked token so frontend knows it's set
        cfg.token = cfg.token ? "••••••••" + cfg.token.slice(-4) : "";
      }
      return jsonResponse({ config: cfg });
    }

    // For all other actions, load config
    const { data: cfgRows } = await serviceClient
      .from("chatpro_config")
      .select("*")
      .limit(1);

    const cfg = cfgRows?.[0];
    if (!cfg || !cfg.instance_id || !cfg.token || !cfg.endpoint) {
      return jsonResponse({ error: "ChatPro não configurado. Salve a configuração primeiro." }, 400);
    }

    // Build base URL, avoiding duplication if endpoint already contains the instance_id
    let endpoint = cfg.endpoint.replace(/\/$/, "");
    if (endpoint.endsWith(cfg.instance_id)) {
      // Endpoint already includes instance_id (e.g. https://v5.chatpro.com.br/chatpro-xxx)
      endpoint = endpoint; // keep as-is
    }
    const baseUrl = endpoint.includes(cfg.instance_id)
      ? `${endpoint}/api/v1`
      : `${endpoint}/${cfg.instance_id}/api/v1`;

    const chatproHeaders = {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": cfg.token,
    };

    // Helper to safely parse ChatPro response
    const safeFetch = async (url: string, options?: RequestInit) => {
      const res = await fetch(url, options);
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        return { status: res.status, data };
      } catch {
        console.error("ChatPro non-JSON response:", text.substring(0, 200));
        return { status: res.status, data: { error: "Resposta inválida da API ChatPro", raw: text.substring(0, 100) } };
      }
    };

    if (action === "test_connection" || action === "status") {
      const result = await safeFetch(`${baseUrl}/status`, { headers: chatproHeaders });
      return jsonResponse(result);
    }

    if (action === "generate_qrcode") {
      const result = await safeFetch(`${baseUrl}/generate_qrcode`, { headers: chatproHeaders });
      return jsonResponse(result);
    }

    if (action === "reload") {
      const result = await safeFetch(`${baseUrl}/reload`, { method: "GET", headers: chatproHeaders });
      return jsonResponse(result);
    }

    if (action === "remove_session") {
      const result = await safeFetch(`${baseUrl}/remove_session`, { method: "GET", headers: chatproHeaders });
      return jsonResponse(result);
    }

    return jsonResponse({ error: "Ação inválida" }, 400);
  } catch (err) {
    console.error("ChatPro edge function error:", err);
    return jsonResponse({ error: "Erro interno do servidor" }, 500);
  }
});
