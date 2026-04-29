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
const CF_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN") ?? "";

// ===== Cloudflare helpers =====
async function cf(path: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${CF_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  return { ok: res.ok && body?.success !== false, status: res.status, body };
}

// Encontra a zona Cloudflare correspondente ao domínio (tenta o domínio inteiro
// e depois sobe um nível por vez). Retorna { id, name } ou null.
async function cfFindZone(domain: string) {
  const parts = domain.split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    const candidate = parts.slice(i).join(".");
    const r = await cf(`/zones?name=${encodeURIComponent(candidate)}&status=active`);
    const zone = r.body?.result?.[0];
    if (zone?.id) return { id: zone.id as string, name: zone.name as string };
  }
  return null;
}

// Apaga registros A/AAAA/CNAME do mesmo nome que conflitam, e cria os novos.
async function cfApplyRecords(zoneId: string, zoneName: string, domain: string, records: Array<{ type: "A" | "CNAME"; content: string }>) {
  // "name" para CF é o FQDN (ele aceita assim).
  const name = domain;
  // 1) listar existentes que conflitam
  const existing = await cf(`/zones/${zoneId}/dns_records?name=${encodeURIComponent(name)}`);
  const conflicts = (existing.body?.result || []).filter((r: any) =>
    ["A", "AAAA", "CNAME"].includes(r.type),
  );

  // 2) remover conflitos
  for (const c of conflicts) {
    await cf(`/zones/${zoneId}/dns_records/${c.id}`, { method: "DELETE" });
  }

  // 3) criar novos (proxied=false — Vercel exige DNS-only)
  const created: any[] = [];
  for (const rec of records) {
    const r = await cf(`/zones/${zoneId}/dns_records`, {
      method: "POST",
      body: JSON.stringify({
        type: rec.type,
        name,
        content: rec.content,
        ttl: 1, // automático
        proxied: false,
      }),
    });
    if (!r.ok) {
      return { ok: false, error: r.body?.errors?.[0]?.message || `CF error ${r.status}`, removed: conflicts.length, created };
    }
    created.push(r.body?.result);
  }

  return { ok: true, removed: conflicts.length, created, zone: zoneName };
}

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

function bestRecommendedA(config: any) {
  const rows = Array.isArray(config?.recommendedIPv4) ? config.recommendedIPv4 : [];
  const first = rows.find((row: any) => Array.isArray(row?.value) && row.value.length);
  return first?.value || ["76.76.21.21"];
}

function bestRecommendedCname(config: any) {
  const rows = Array.isArray(config?.recommendedCNAME) ? config.recommendedCNAME : [];
  return String(rows.find((row: any) => row?.value)?.value || "cname.vercel-dns.com").replace(/\.$/, "");
}

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
  if (configured.ok) {
    return { ok: true, id: configured.body?.id || VERCEL_PROJECT_ID, teamId: VERCEL_TEAM_ID || null } as const;
  }

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

      // A API da Vercel não é idempotente: se o domínio JÁ está neste mesmo
      // projeto, o POST pode devolver domain_already_in_use. Antes de criar,
      // consultamos o domínio no projeto alvo e tratamos como sucesso real.
      const current = await vercelProject(
        `/v9/projects/${project.id}/domains/${encodeURIComponent(domain)}`,
        {},
        project.teamId || "",
      );
      if (current.ok && current.body?.projectId === project.id) {
        return json({ ok: true, status: current.status, data: current.body, already_linked: true });
      }

      const tryAdd = async () =>
        vercelProject(`/v10/projects/${project.id}/domains`, {
          method: "POST",
          body: JSON.stringify({ name: domain }),
        }, project.teamId || "");

      let r = await tryAdd();

      // Caso o domínio já esteja em outro projeto da MESMA conta, removemos de lá
      // e re-tentamos automaticamente. Vercel devolve 409 com code "domain_already_in_use"
      // ou mensagem "already in use by one of your projects".
      const alreadyInUse =
        !r.ok &&
        (r.status === 409 || r.status === 400) &&
        /already in use|domain_already_in_use|used by another/i.test(
          JSON.stringify(r.body?.error || r.body || ""),
        );

      if (alreadyInUse) {
        const conflictProjectId = r.body?.error?.projectId || r.body?.error?.domain?.projectId;
        if (conflictProjectId === project.id) {
          return json({ ok: true, status: r.status, data: r.body?.error?.domain || r.body, already_linked: true });
        }

        // descobrir em qual projeto está e remover
        const projects = await listVisibleProjects();
        let movedFrom: string | null = null;
        if (conflictProjectId) {
          const conflict = projects.find((p) => p?.id === conflictProjectId);
          const del = await vercelProject(
            `/v9/projects/${conflictProjectId}/domains/${encodeURIComponent(domain)}`,
            { method: "DELETE" },
            conflict?.teamId || project.teamId || "",
          );
          if (del.ok) movedFrom = conflict?.name || conflictProjectId;
        }
        for (const p of projects) {
          if (movedFrom) break;
          if (!p?.id || p.id === project.id) continue;
          const del = await vercelProject(
            `/v9/projects/${p.id}/domains/${encodeURIComponent(domain)}`,
            { method: "DELETE" },
            p.teamId || "",
          );
          if (del.ok) { movedFrom = p.name || p.id; break; }
        }

        // também tenta remover de domínios "soltos" da conta
        if (!movedFrom) {
          await vercelProject(`/v6/domains/${encodeURIComponent(domain)}`, { method: "DELETE" }, project.teamId || "");
        }

        r = await tryAdd();
        if (r.ok) {
          return json({ ok: true, status: r.status, data: r.body, moved_from: movedFrom });
        }
      }

      if (!r.ok) {
        const msg =
          r.body?.error?.message ||
          r.body?.error?.code ||
          (typeof r.body === "string" ? r.body : null) ||
          `HTTP ${r.status}`;
        return json({ ok: false, status: r.status, error: msg, data: r.body });
      }
      return json({ ok: true, status: r.status, data: r.body });
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
      const aValues = bestRecommendedA(config.body);
      const cname = bestRecommendedCname(config.body);
      return json({
        ok: info.ok,
        domain,
        info: info.body,
        config: { ...(config.body || {}), live: !!info.body?.verified && config.body?.misconfigured === false },
        // Registros recomendados pra mostrar pro usuário
        recommended: {
          a_root: { type: "A", name: "@", value: aValues },
          cname_sub: { type: "CNAME", name: "<sub>", value: cname },
        },
      });
    }

    // LIST
    if (action === "list") {
      const project = await resolveProjectContext();
      if (project.ok) {
        const r = await vercelProject(`/v9/projects/${project.id}/domains`, {}, project.teamId || "");
        if (r.ok) return json({ ok: true, data: r.body, project });
      }

      // Fallback intencional: lista domínios da conta/team para o admin conseguir selecionar,
      // mesmo que o Project ID salvo esteja errado. Vincular ainda exige projeto válido.
      const account = await listAccountDomains();
      return json({
        ok: true,
        fallback: true,
        data: { domains: account.domains },
        warning: project.ok ? null : project.error,
      });
    }

    // DIAGNOSE — útil pra debug do admin
    if (action === "diagnose") {
      const [user, projects, target, accountDomains] = await Promise.all([
        vercel(`/v2/user`),
        listVisibleProjects(),
        vercelProject(`/v9/projects/${VERCEL_PROJECT_ID}`),
        listAccountDomains(),
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
        projects_visible: projects.map((p: any) => ({ id: p.id, name: p.name, teamId: p.teamId || null })),
        account_domains: accountDomains.domains.map((d: any) => ({ name: d.name, verified: !!d.verified })),
        target_project: target.body,
      });
    }

    // CF_APPLY — cria/atualiza registros DNS no Cloudflare apontando pra Vercel
    if (action === "cf_apply") {
      if (!CF_TOKEN) return json({ ok: false, error: "Cloudflare não configurada (CLOUDFLARE_API_TOKEN ausente)" });

      const project = await resolveProjectContext();
      if (!project.ok) return json({ ok: false, error: project.error });

      // Pega recomendações DNS reais da Vercel pra esse domínio.
      const config = await vercelProject(`/v6/domains/${encodeURIComponent(domain)}/config`, {}, project.teamId || "");
      const aValues = bestRecommendedA(config.body);
      const cname = bestRecommendedCname(config.body);

      // Encontra zona Cloudflare
      const zone = await cfFindZone(domain);
      if (!zone) {
        return json({
          ok: false,
          error: `Zona Cloudflare não encontrada para "${domain}". Verifique se o domínio está adicionado na sua conta Cloudflare e se o token tem acesso à zona.`,
        });
      }

      const isApex = zone.name === domain;
      const records: Array<{ type: "A" | "CNAME"; content: string }> = isApex
        ? aValues.map((v: string) => ({ type: "A" as const, content: v }))
        : [{ type: "CNAME" as const, content: cname }];

      const result = await cfApplyRecords(zone.id, zone.name, domain, records);
      if (!result.ok) return json({ ok: false, error: result.error, zone: zone.name });

      // Dispara verificação na Vercel pra acelerar a propagação
      await vercelProject(
        `/v9/projects/${project.id}/domains/${encodeURIComponent(domain)}/verify`,
        { method: "POST" },
        project.teamId || "",
      );

      return json({
        ok: true,
        zone: zone.name,
        applied: records,
        removed_conflicts: result.removed,
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
