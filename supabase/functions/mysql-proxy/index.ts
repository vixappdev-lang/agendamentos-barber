/**
 * MySQL Proxy Edge Function
 *
 * Recebe ações do painel admin e executa no MySQL do cliente (perfil ativo).
 * Apenas o super admin pode chamar (validado por e-mail no JWT).
 *
 * Ações suportadas:
 *   - test          → SELECT 1 + versão MySQL
 *   - install_schema→ executa o SQL de schema enviado
 *   - select        → { table, columns?, where?, order?, limit? }
 *   - insert        → { table, values }                   (1 ou N linhas)
 *   - update        → { table, values, where }
 *   - delete        → { table, where }
 *   - upsert        → { table, values, on_conflict }
 *   - count         → { table, where? }
 *   - stats         → conta linhas das tabelas conhecidas
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import mysql from "npm:mysql2@3.11.3/promise";
import bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-profile-id",
};

const SUPER_ADMIN_EMAIL = "admin-barber@gmail.com";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

const ALLOWED_TABLES = new Set([
  "services",
  "barbers",
  "appointments",
  "products",
  "orders",
  "order_items",
  "coupons",
  "business_settings",
  "chatpro_config",
  "prize_wheel_slices",
  "user_roles",
  "user_permissions",
  "reviews",
]);

const sanitizeHost = (raw: unknown): string => {
  let h = String(raw ?? "").trim();
  h = h.replace(/^[a-zA-Z]+:\/\//, "");
  h = h.split("/")[0].split("?")[0];
  h = h.split(":")[0];
  return h;
};

const HOSTNAME_RE = /^(?=.{1,253}$)([a-zA-Z0-9_]([a-zA-Z0-9-_]{0,61}[a-zA-Z0-9_])?)(\.[a-zA-Z0-9_]([a-zA-Z0-9-_]{0,61}[a-zA-Z0-9_])?)*$|^(\d{1,3}\.){3}\d{1,3}$/;

interface MysqlAdminSession {
  profile_id: string;
  barbershop_id: string;
  user_id: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const b64url = (value: string | Uint8Array) => {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const fromB64url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return new Uint8Array([...binary].map((ch) => ch.charCodeAt(0)));
};

const sessionSecret = () =>
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("LOVABLE_API_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";

const hmac = async (data: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data))));
};

const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
};

const signSession = async (payload: Omit<MysqlAdminSession, "iat" | "exp">) => {
  const now = Math.floor(Date.now() / 1000);
  const encoded = b64url(JSON.stringify({ ...payload, iat: now, exp: now + SESSION_TTL_SECONDS }));
  return `${encoded}.${await hmac(encoded)}`;
};

const verifySession = async (token: unknown): Promise<MysqlAdminSession> => {
  const raw = String(token || "");
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) throw new Error("Sessão MySQL inválida");
  const expected = await hmac(payload);
  if (!safeEqual(signature, expected)) throw new Error("Sessão MySQL inválida");
  const parsed = JSON.parse(decoder.decode(fromB64url(payload))) as MysqlAdminSession;
  if (!parsed.profile_id || !parsed.user_id || !parsed.email || parsed.role !== "admin") {
    throw new Error("Sessão MySQL sem permissão de admin");
  }
  if (parsed.exp <= Math.floor(Date.now() / 1000)) throw new Error("Sessão MySQL expirada");
  return parsed;
};

const requireText = (value: unknown, label: string, max = 255): string => {
  const out = String(value ?? "").trim();
  if (!out) throw new Error(`${label} obrigatório`);
  if (out.length > max) throw new Error(`${label} muito longo`);
  return out;
};

const ident = (name: string): string => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid identifier: ${name}`);
  }
  return `\`${name}\``;
};

const ALLOWED_OPERATORS = new Set([
  "=",
  "!=",
  "<>",
  ">",
  "<",
  ">=",
  "<=",
  "in",
  "not in",
  "like",
  "is",
  "is not",
]);

interface WhereClause {
  column: string;
  op: string;
  value: unknown;
}

const buildWhere = (
  where?: WhereClause[],
): { sql: string; params: unknown[] } => {
  if (!where || where.length === 0) return { sql: "", params: [] };
  const parts: string[] = [];
  const params: unknown[] = [];
  for (const w of where) {
    const op = (w.op || "=").toLowerCase();
    if (!ALLOWED_OPERATORS.has(op)) throw new Error(`Operator not allowed: ${op}`);
    if (op === "in" || op === "not in") {
      const arr = Array.isArray(w.value) ? w.value : [w.value];
      if (arr.length === 0) {
        parts.push("1=0");
      } else {
        parts.push(
          `${ident(w.column)} ${op.toUpperCase()} (${arr.map(() => "?").join(",")})`,
        );
        params.push(...arr);
      }
    } else if (op === "is" || op === "is not") {
      parts.push(`${ident(w.column)} ${op.toUpperCase()} NULL`);
    } else {
      parts.push(`${ident(w.column)} ${op} ?`);
      params.push(w.value);
    }
  }
  return { sql: " WHERE " + parts.join(" AND "), params };
};

async function getProfile(supabase: any, profileId?: string) {
  let query = supabase.from("mysql_profiles").select("*");
  if (profileId) query = query.eq("id", profileId);
  else query = query.eq("is_active", true);
  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw new Error(`Profile lookup failed: ${error.message}`);
  if (!data) throw new Error("No active MySQL profile");
  return data;
}

async function decryptPassword(supabase: any, encrypted: string): Promise<string> {
  // pgsodium decrypt RPC (configured below)
  const { data, error } = await supabase.rpc("decrypt_mysql_password", {
    _encrypted: encrypted,
  });
  if (error) throw new Error(`Decrypt failed: ${error.message}`);
  return data as string;
}

async function connectMysql(profile: any, password: string) {
  return await mysql.createConnection({
    host: profile.host,
    port: Number(profile.port) || 3306,
    user: profile.username,
    password,
    database: profile.database_name,
    ssl: profile.ssl_enabled ? { rejectUnauthorized: false } : undefined,
    connectTimeout: 10_000,
  });
}

async function recordTest(supabase: any, profileId: string, ok: boolean, msg: string) {
  await supabase
    .from("mysql_profiles")
    .update({
      last_test_at: new Date().toISOString(),
      last_test_status: ok ? "ok" : "fail",
      last_test_message: msg.slice(0, 500),
    })
    .eq("id", profileId);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ success: false, error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authEmail = (userData.user.email as string | undefined) || "";
    const body = await req.json();
    const { action, profile_id, table, values, where, columns, order, limit, sql_text } =
      body as Record<string, any>;

    const isSuperAdminRequest = authEmail.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    const isMysqlSessionRequest = action !== "save_profile" && action !== "login" && Boolean(body.mysql_session);
    let mysqlSession: MysqlAdminSession | null = null;
    if (isMysqlSessionRequest) {
      mysqlSession = await verifySession(body.mysql_session);
      if (profile_id && profile_id !== mysqlSession.profile_id) throw new Error("Perfil MySQL inválido para esta sessão");
      body.profile_id = mysqlSession.profile_id;
    } else if (!isSuperAdminRequest) {
      return new Response(
        JSON.stringify({ success: false, error: "Only the super admin can use MySQL" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Use service role for profile/password reads (bypass RLS for the proxy)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (!action) throw new Error("Missing action");

    if (action === "save_profile") {
      const host = sanitizeHost(body.host);
      if (!HOSTNAME_RE.test(host)) {
        throw new Error("Host inválido. Informe apenas domínio ou IP, sem https://, barra ou caminho.");
      }
      const port = Number(body.port) || 3306;
      if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Porta inválida");
      const database_name = requireText(body.database_name, "Banco", 64);
      const username = requireText(body.username, "Usuário", 64);
      const name = requireText(body.name || "MySQL", "Nome", 255);
      const barbershop_id = body.barbershop_id ? String(body.barbershop_id) : null;
      let password_encrypted: string | null = null;

      if (body.password) {
        const { data: encrypted, error: encErr } = await admin.rpc("encrypt_mysql_password", {
          _plain: String(body.password),
        });
        if (encErr) throw new Error(`Encrypt failed: ${encErr.message}`);
        password_encrypted = encrypted as string;
      } else if (profile_id) {
        const { data: existing, error: existingErr } = await admin
          .from("mysql_profiles")
          .select("password_encrypted")
          .eq("id", profile_id)
          .maybeSingle();
        if (existingErr) throw new Error(`Profile lookup failed: ${existingErr.message}`);
        password_encrypted = existing?.password_encrypted ?? null;
      }

      if (!password_encrypted) throw new Error("Senha obrigatória para salvar a conexão MySQL");

      const payload = {
        name,
        host,
        port,
        database_name,
        username,
        password_encrypted,
        ssl_enabled: Boolean(body.ssl_enabled),
      };

      let savedId = profile_id as string | undefined;
      if (savedId) {
        const { error } = await admin.from("mysql_profiles").update(payload).eq("id", savedId);
        if (error) throw new Error(`Save failed: ${error.message}`);
      } else {
        const { data, error } = await admin.from("mysql_profiles").insert(payload).select("id").single();
        if (error) throw new Error(`Save failed: ${error.message}`);
        savedId = data.id;
      }

      if (barbershop_id) {
        const { error: linkErr } = await admin
          .from("barbershop_profiles")
          .update({ mysql_profile_id: savedId })
          .eq("id", barbershop_id);
        if (linkErr) throw new Error(`Link failed: ${linkErr.message}`);
      }

      return new Response(JSON.stringify({ success: true, data: { profile_id: savedId, host, database_name } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "login") {
      const email = requireText(body.email, "E-mail", 255).toLowerCase();
      const passwordInput = requireText(body.password, "Senha", 255);
      const slug = String(body.slug || "").trim().toLowerCase();
      const barbershopId = body.barbershop_id ? String(body.barbershop_id) : "";

      let barbershopQuery = admin
        .from("barbershop_profiles")
        .select("id, slug, name, owner_email, mysql_profile_id, is_active, is_cloud")
        .eq("is_active", true)
        .eq("is_cloud", false)
        .not("mysql_profile_id", "is", null);
      if (barbershopId) barbershopQuery = barbershopQuery.eq("id", barbershopId);
      else if (slug) barbershopQuery = barbershopQuery.eq("slug", slug);
      const { data: shops, error: shopsErr } = await barbershopQuery.limit(25);
      if (shopsErr) throw new Error(`Profile lookup failed: ${shopsErr.message}`);

      for (const shop of shops || []) {
        const linkedProfile = await getProfile(admin, shop.mysql_profile_id);
        const linkedPassword = await decryptPassword(admin, linkedProfile.password_encrypted);
        let loginConn: any = null;
        try {
          loginConn = await connectMysql(linkedProfile, linkedPassword);
          const [rows] = await loginConn.query(
            "SELECT id, email, password_hash, name, role, active FROM `users` WHERE LOWER(`email`) = LOWER(?) LIMIT 1",
            [email],
          );
          const user = (rows as any[])[0];
          if (!user || Number(user.active) !== 1 || user.role !== "admin") continue;
          const ok = await bcrypt.compare(passwordInput, String(user.password_hash || ""));
          if (!ok) continue;
          await loginConn.query("UPDATE `users` SET `last_login_at` = CURRENT_TIMESTAMP WHERE `id` = ?", [user.id]);
          const token = await signSession({
            profile_id: linkedProfile.id,
            barbershop_id: shop.id,
            user_id: String(user.id),
            email: String(user.email),
            role: String(user.role),
          });
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                token,
                profile_id: linkedProfile.id,
                barbershop_id: shop.id,
                name: user.name || shop.name,
                email: user.email,
                role: user.role,
                source: "mysql",
              },
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        } catch (loginErr) {
          console.error("[mysql-proxy] login profile failed", linkedProfile.id, loginErr instanceof Error ? loginErr.message : String(loginErr));
        } finally {
          try { await loginConn?.end(); } catch { /* ignore */ }
        }
      }

      return new Response(JSON.stringify({ success: false, error: "Credenciais inválidas", code: "INVALID_LOGIN" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const effectiveProfileId = mysqlSession?.profile_id || profile_id;
    const profile = await getProfile(admin, effectiveProfileId);
    const password = await decryptPassword(admin, profile.password_encrypted);

    let conn;
    try {
      conn = await connectMysql(profile, password);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await recordTest(admin, profile.id, false, msg);
      return new Response(JSON.stringify({ success: false, error: msg, code: "CONN_FAIL" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      if (action === "test") {
        const [versionRows] = await conn.query("SELECT VERSION() AS version");
        const [pingRows] = await conn.query("SELECT 1 AS ok");
        await recordTest(admin, profile.id, true, "OK");
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              version: (versionRows as any[])[0]?.version,
              ping: (pingRows as any[])[0]?.ok === 1,
              host: profile.host,
              database: profile.database_name,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (action === "install_schema") {
        if (!sql_text || typeof sql_text !== "string") {
          throw new Error("sql_text required");
        }
        // mysql2 supports multipleStatements via flag — reconnect with it on
        await conn.end();
        conn = await mysql.createConnection({
          host: profile.host,
          port: Number(profile.port) || 3306,
          user: profile.username,
          password,
          database: profile.database_name,
          ssl: profile.ssl_enabled ? { rejectUnauthorized: false } : undefined,
          multipleStatements: true,
          connectTimeout: 30_000,
        });
        await conn.query(sql_text);
        return new Response(JSON.stringify({ success: true, data: { installed: true } }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "stats") {
        const stats: Record<string, number> = {};
        for (const t of ALLOWED_TABLES) {
          try {
            const [rows] = await conn.query(`SELECT COUNT(*) AS c FROM ${ident(t)}`);
            stats[t] = (rows as any[])[0]?.c ?? 0;
          } catch {
            stats[t] = -1; // table missing
          }
        }
        return new Response(JSON.stringify({ success: true, data: stats }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!table || !ALLOWED_TABLES.has(table)) {
        throw new Error(`Table not allowed: ${table}`);
      }

      if (action === "select") {
        const cols =
          Array.isArray(columns) && columns.length > 0
            ? columns.map(ident).join(",")
            : "*";
        const w = buildWhere(where);
        let sql = `SELECT ${cols} FROM ${ident(table)}${w.sql}`;
        if (order && order.column) {
          sql += ` ORDER BY ${ident(order.column)} ${order.ascending === false ? "DESC" : "ASC"}`;
        }
        if (limit && Number.isFinite(Number(limit))) {
          sql += ` LIMIT ${Number(limit)}`;
        }
        const [rows] = await conn.query(sql, w.params);
        return new Response(JSON.stringify({ success: true, data: rows }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "insert") {
        const arr = Array.isArray(values) ? values : [values];
        if (arr.length === 0) throw new Error("No values");
        const allKeys = Array.from(new Set(arr.flatMap((r: any) => Object.keys(r))));
        const colsSql = allKeys.map(ident).join(",");
        const placeholders = arr
          .map(() => `(${allKeys.map(() => "?").join(",")})`)
          .join(",");
        const params = arr.flatMap((r: any) => allKeys.map((k) => r[k] ?? null));
        const sql = `INSERT INTO ${ident(table)} (${colsSql}) VALUES ${placeholders}`;
        const [result] = await conn.query(sql, params);
        return new Response(
          JSON.stringify({ success: true, data: { affected: (result as any).affectedRows } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (action === "update") {
        if (!values || typeof values !== "object") throw new Error("values required");
        const keys = Object.keys(values);
        const setSql = keys.map((k) => `${ident(k)} = ?`).join(",");
        const w = buildWhere(where);
        const sql = `UPDATE ${ident(table)} SET ${setSql}${w.sql}`;
        const params = [...keys.map((k) => (values as any)[k]), ...w.params];
        const [result] = await conn.query(sql, params);
        return new Response(
          JSON.stringify({ success: true, data: { affected: (result as any).affectedRows } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (action === "delete") {
        const w = buildWhere(where);
        if (!w.sql) throw new Error("DELETE requires where");
        const sql = `DELETE FROM ${ident(table)}${w.sql}`;
        const [result] = await conn.query(sql, w.params);
        return new Response(
          JSON.stringify({ success: true, data: { affected: (result as any).affectedRows } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (action === "upsert") {
        const arr = Array.isArray(values) ? values : [values];
        const conflict = body.on_conflict as string | undefined;
        if (arr.length === 0) throw new Error("No values");
        const allKeys = Array.from(new Set(arr.flatMap((r: any) => Object.keys(r))));
        const colsSql = allKeys.map(ident).join(",");
        const placeholders = arr
          .map(() => `(${allKeys.map(() => "?").join(",")})`)
          .join(",");
        const updateKeys = allKeys.filter((k) => k !== conflict && k !== "id");
        const updateSql = updateKeys
          .map((k) => `${ident(k)} = VALUES(${ident(k)})`)
          .join(",");
        const params = arr.flatMap((r: any) => allKeys.map((k) => r[k] ?? null));
        const sql = `INSERT INTO ${ident(table)} (${colsSql}) VALUES ${placeholders}${
          updateSql ? ` ON DUPLICATE KEY UPDATE ${updateSql}` : ""
        }`;
        const [result] = await conn.query(sql, params);
        return new Response(
          JSON.stringify({ success: true, data: { affected: (result as any).affectedRows } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (action === "count") {
        const w = buildWhere(where);
        const sql = `SELECT COUNT(*) AS c FROM ${ident(table)}${w.sql}`;
        const [rows] = await conn.query(sql, w.params);
        return new Response(
          JSON.stringify({ success: true, data: { count: (rows as any[])[0]?.c ?? 0 } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      throw new Error(`Unknown action: ${action}`);
    } finally {
      try {
        await conn.end();
      } catch {
        /* ignore */
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[mysql-proxy]", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
