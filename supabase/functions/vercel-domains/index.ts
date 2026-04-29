// Vercel Domains integration — REST API v10
// Docs: https://vercel.com/docs/rest-api/endpoints/projects#add-a-domain-to-a-project
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VERCEL_TOKEN = Deno.env.get("VERCEL_API_TOKEN") ?? "";
const VERCEL_PROJECT_ID = Deno.env.get("VERCEL_PROJECT_ID") ?? "";
const VERCEL_TEAM_ID = Deno.env.get("VERCEL_TEAM_ID") ?? "";

const teamQuery = VERCEL_TEAM_ID ? `?teamId=${encodeURIComponent(VERCEL_TEAM_ID)}` : "";
const teamAmp = VERCEL_TEAM_ID ? `&teamId=${encodeURIComponent(VERCEL_TEAM_ID)}` : "";

async function vercel(path: string, init: RequestInit = {}) {
  const url = `https://api.vercel.com${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  return { ok: res.ok, status: res.status, body };
}

const DOMAIN_RE = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
      return json({ error: "Vercel não configurada (token/project ausente)" }, 500);
    }

    // Auth: somente admin pode chamar
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claims, error: claimsErr } = await supa.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);

    const { data: roleRow } = await supa
      .from("user_roles")
      .select("role")
      .eq("user_id", claims.claims.sub)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const domain = String(body.domain || "").trim().toLowerCase();

    if (!action) return json({ error: "action obrigatório" }, 400);
    if (action !== "list" && (!domain || !DOMAIN_RE.test(domain))) {
      return json({ error: "Domínio inválido" }, 400);
    }

    // ADD
    if (action === "add") {
      const r = await vercel(`/v10/projects/${VERCEL_PROJECT_ID}/domains${teamQuery}`, {
        method: "POST",
        body: JSON.stringify({ name: domain }),
      });
      return json({ ok: r.ok, status: r.status, data: r.body });
    }

    // REMOVE
    if (action === "remove") {
      const r = await vercel(
        `/v9/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(domain)}${teamQuery}`,
        { method: "DELETE" },
      );
      return json({ ok: r.ok, status: r.status, data: r.body });
    }

    // VERIFY (dispara verificação)
    if (action === "verify") {
      const r = await vercel(
        `/v9/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(domain)}/verify${teamQuery}`,
        { method: "POST" },
      );
      return json({ ok: r.ok, status: r.status, data: r.body });
    }

    // STATUS (config + domain info → registros DNS pendentes / verified)
    if (action === "status") {
      const [info, config] = await Promise.all([
        vercel(`/v9/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(domain)}${teamQuery}`),
        vercel(`/v6/domains/${encodeURIComponent(domain)}/config${teamQuery}`),
      ]);
      return json({
        ok: info.ok,
        domain,
        info: info.body,
        config: config.body,
        // Registros recomendados pra mostrar pro usuário
        recommended: {
          a_root: { type: "A", name: "@", value: "76.76.21.21" },
          cname_sub: { type: "CNAME", name: "<sub>", value: "cname.vercel-dns.com" },
        },
      });
    }

    // LIST
    if (action === "list") {
      const r = await vercel(`/v9/projects/${VERCEL_PROJECT_ID}/domains${teamQuery}`);
      return json({ ok: r.ok, data: r.body });
    }

    return json({ error: "action desconhecida" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
