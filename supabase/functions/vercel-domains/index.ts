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

const withTeam = (path: string, teamId = VERCEL_TEAM_ID) => {
  if (!teamId) return path;
  return `${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(teamId)}`;
};

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

async function vercelProject(path: string, init: RequestInit = {}, teamId = VERCEL_TEAM_ID) {
  const first = await vercel(withTeam(path, teamId), init);
  if (first.ok || !teamId || first.status !== 404) return first;

  // Se o Team ID salvo estiver errado, tenta a conta padrão do token antes de falhar.
  const retryWithoutTeam = await vercel(path, init);
  return retryWithoutTeam.ok ? retryWithoutTeam : first;
}

const readList = (body: any, key: "domains" | "projects") => {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.[key])) return body[key];
  if (Array.isArray(body?.teams)) return body.teams;
  if (Array.isArray(body?.data)) return body.data;
  return [];
};

async function getTeamContexts() {
  const seen = new Set<string>();
  const contexts: Array<string | null> = [];
  const add = (id?: string | null) => {
    const key = id || "__personal__";
    if (seen.has(key)) return;
    seen.add(key);
    contexts.push(id || null);
  };
  add(VERCEL_TEAM_ID || null);
  add(null);

  const teams = await vercel("/v2/teams");
  const list = readList(teams.body, "projects");
  for (const team of list) add(team?.id || team?.teamId || null);
  return contexts;
}

async function listAccountDomains() {
  const contexts = await getTeamContexts();
  const rows = new Map<string, any>();
  const errors: string[] = [];

  for (const teamId of contexts) {
    const r = await vercel(withTeam("/v5/domains", teamId || ""));
    if (!r.ok) {
      const msg = r.body?.error?.message || r.body?.error?.code;
      if (msg) errors.push(String(msg));
      continue;
    }
    for (const d of readList(r.body, "domains")) {
      const name = String(d?.name || d?.domain || "").toLowerCase();
      if (name && DOMAIN_RE.test(name) && !name.endsWith(".vercel.app")) {
        rows.set(name, { ...d, name, source: teamId ? "team" : "personal" });
      }
    }
  }

  return { domains: [...rows.values()], errors };
}

async function listVisibleProjects() {
  const contexts = await getTeamContexts();
  const rows: any[] = [];
  for (const teamId of contexts) {
    const r = await vercel(withTeam("/v9/projects", teamId || ""));
    if (!r.ok) continue;
    for (const p of readList(r.body, "projects")) rows.push({ ...p, teamId });
  }
  return rows;
}

async function resolveProjectContext() {
  if (!VERCEL_PROJECT_ID) return { ok: false, error: "VERCEL_PROJECT_ID ausente" } as const;

  const configured = await vercelProject(`/v9/projects/${VERCEL_PROJECT_ID}`);
  if (configured.ok) return { ok: true, id: VERCEL_PROJECT_ID, teamId: VERCEL_TEAM_ID || null } as const;

  const projects = await listVisibleProjects();
  const exact = projects.find((p) => p?.id === VERCEL_PROJECT_ID || p?.name === VERCEL_PROJECT_ID);
  if (exact?.id || exact?.name) return { ok: true, id: exact.id || exact.name, teamId: exact.teamId || null } as const;
  if (projects.length === 1 && (projects[0]?.id || projects[0]?.name)) {
    return { ok: true, id: projects[0].id || projects[0].name, teamId: projects[0].teamId || null, auto: true } as const;
  }

  return {
    ok: false,
    error: `Projeto Vercel não encontrado. Projetos visíveis: ${projects.map((p) => `${p.name || "sem-nome"} (${p.id})`).slice(0, 8).join(", ") || "nenhum"}. Atualize VERCEL_PROJECT_ID/VERCEL_TEAM_ID com o projeto correto.`,
  } as const;
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
    const action = String(body.action || "").trim().toLowerCase();
    const domain = String(body.domain || "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/:\d+$/, "")
      .replace(/\.$/, "");
    const actionsWithoutDomain = new Set(["list", "diagnose"]);

    if (!action) return json({ error: "action obrigatório" }, 400);
    if (!actionsWithoutDomain.has(action) && (!domain || !DOMAIN_RE.test(domain))) {
      return json({ error: "Domínio inválido" }, 400);
    }

    // ADD
    if (action === "add") {
      const project = await resolveProjectContext();
      if (!project.ok) return json({ ok: false, error: project.error }, 200);
      const r = await vercelProject(`/v10/projects/${project.id}/domains`, {
        method: "POST",
        body: JSON.stringify({ name: domain }),
      }, project.teamId || "");
      return json({ ok: r.ok, status: r.status, data: r.body });
    }

    // REMOVE
    if (action === "remove") {
      const project = await resolveProjectContext();
      if (!project.ok) return json({ ok: false, error: project.error }, 200);
      const r = await vercelProject(
        `/v9/projects/${project.id}/domains/${encodeURIComponent(domain)}`,
        { method: "DELETE" },
        project.teamId || "",
      );
      return json({ ok: r.ok, status: r.status, data: r.body });
    }

    // VERIFY (dispara verificação)
    if (action === "verify") {
      const project = await resolveProjectContext();
      if (!project.ok) return json({ ok: false, error: project.error }, 200);
      const r = await vercelProject(
        `/v9/projects/${project.id}/domains/${encodeURIComponent(domain)}/verify`,
        { method: "POST" },
        project.teamId || "",
      );
      return json({ ok: r.ok, status: r.status, data: r.body });
    }

    // STATUS (config + domain info → registros DNS pendentes / verified)
    if (action === "status") {
      const project = await resolveProjectContext();
      if (!project.ok) return json({ ok: false, domain, info: {}, config: {}, error: project.error }, 200);
      const [info, config] = await Promise.all([
        vercelProject(`/v9/projects/${project.id}/domains/${encodeURIComponent(domain)}`, {}, project.teamId || ""),
        vercelProject(`/v6/domains/${encodeURIComponent(domain)}/config`, {}, project.teamId || ""),
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
      const r = await vercelProject(`/v9/projects/${VERCEL_PROJECT_ID}/domains`);
      if (!r.ok) {
        const apiErr = r.body?.error?.message || r.body?.error?.code || "Erro desconhecido";
        const hint =
          r.body?.error?.code === "not_found"
            ? `O VERCEL_PROJECT_ID (${VERCEL_PROJECT_ID}) não foi encontrado${VERCEL_TEAM_ID ? ` no team ${VERCEL_TEAM_ID}` : " na conta do token"}. Verifique: 1) Project ID em Vercel → Settings → General; 2) Team ID em Team Settings (deixe vazio se for conta pessoal); 3) o token tem acesso a esse team.`
            : "";
        return json({ ok: false, error: `Vercel: ${apiErr}${hint ? " — " + hint : ""}`, raw: r.body }, 200);
      }
      return json({ ok: true, data: r.body });
    }

    // DIAGNOSE — útil pra debug do admin
    if (action === "diagnose") {
      const [user, projects, target] = await Promise.all([
        vercel(`/v2/user`),
        vercel(withTeam(`/v9/projects`)),
        vercelProject(`/v9/projects/${VERCEL_PROJECT_ID}`),
      ]);
      return json({
        ok: target.ok,
        configured: {
          project_id: VERCEL_PROJECT_ID,
          team_id: VERCEL_TEAM_ID || null,
        },
        token_user: user.body?.user
          ? { id: user.body.user.id, email: user.body.user.email, defaultTeamId: user.body.user.defaultTeamId }
          : user.body,
        projects_visible: Array.isArray(projects.body?.projects)
          ? projects.body.projects.map((p: any) => ({ id: p.id, name: p.name }))
          : projects.body,
        target_project: target.body,
      });
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
