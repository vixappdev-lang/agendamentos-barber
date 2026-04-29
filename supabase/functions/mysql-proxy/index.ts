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
    const body = await req.json();
    const { action, profile_id, table, values, where, columns, order, limit, sql_text } =
      body as Record<string, any>;
    if (!action) throw new Error("Missing action");

    // Use service role for profile/password reads (bypass RLS for the proxy)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

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
          const [permRows] = await loginConn.query(
            "SELECT permission_key, enabled FROM `user_permissions` WHERE `user_id` = ?",
            [user.id],
          );
          const permissions = Object.fromEntries(
            (permRows as any[]).map((p) => [String(p.permission_key), Number(p.enabled) === 1]),
          );
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
                permissions,
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

    // ============================================================
    //  PUBLIC SITE QUERY  — sem JWT, whitelist rígida de sub-actions
    // ============================================================
    if (action === "public_query") {
      const slug = String(body.slug || "").toLowerCase().trim();
      const host = String(body.host || "").toLowerCase().trim().replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
      const sub = String(body.sub || "").trim();

      if (slug && !/^[a-z0-9-]{1,64}$/.test(slug)) throw new Error("slug inválido");
      if (host && !/^[a-z0-9.-]{1,253}$/.test(host)) throw new Error("host inválido");
      if (!slug && !host) throw new Error("slug ou host obrigatório");

      const SITE_KEYS = [
        "business_name","slogan","description","logo_url","whatsapp_number","phone_number","email",
        "instagram","facebook","tiktok","google_maps_link","address","city","state","cep",
        "location_lat","location_lng","opening_time","closing_time","lunch_start","lunch_end","days_off",
        "site_mode","site_published","site_hero_title","site_hero_subtitle","site_hero_description",
        "site_hero_images","site_about_title","site_about_description","site_gallery","site_primary",
        "site_accent","site_bg","site_font_heading","site_font_body","site_logo_url","site_favicon_url",
        "site_seo_title","site_seo_description","site_seo_og_image",
      ];

      const SUBS = new Set([
        "site_settings","services","barbers","products","reviews_public",
        "business_settings_all","prize_wheel_slices","coupon_validate",
        "create_appointment","create_order","create_review",
        "appointments_by_email","cancel_appointment","orders_by_phone","order_items",
      ]);
      if (!SUBS.has(sub)) throw new Error("sub não permitida");

      // Resolução: 1) por slug 2) por host (custom_domain ou subdomain)
      let shop: any = null;
      let shopErr: any = null;
      if (slug) {
        const r = await admin
          .from("barbershop_profiles")
          .select("id, slug, name, mysql_profile_id, is_active, site_published, is_cloud, site_mode, custom_domain, subdomain")
          .eq("slug", slug)
          .maybeSingle();
        shop = r.data; shopErr = r.error;
      } else {
        const r = await admin
          .from("barbershop_profiles")
          .select("id, slug, name, mysql_profile_id, is_active, site_published, is_cloud, site_mode, custom_domain, subdomain")
          .or(`custom_domain.eq.${host},subdomain.eq.${host}`)
          .maybeSingle();
        shop = r.data; shopErr = r.error;
      }
      if (shopErr) throw new Error(`shop lookup: ${shopErr.message}`);
      if (!shop || !shop.is_active || !shop.site_published) {
        return new Response(JSON.stringify({ success: false, code: "NOT_FOUND" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!shop || !shop.is_active || !shop.site_published) {
        return new Response(JSON.stringify({ success: false, code: "NOT_FOUND" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (shop.is_cloud) {
        return new Response(JSON.stringify({
          success: true, source: "cloud",
          profile: { id: shop.id, slug: shop.slug, name: shop.name, site_mode: shop.site_mode },
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!shop.mysql_profile_id) {
        return new Response(JSON.stringify({ success: false, code: "NOT_CONFIGURED" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const pubProfile = await getProfile(admin, shop.mysql_profile_id);
      const pubPassword = await decryptPassword(admin, pubProfile.password_encrypted);
      let pubConn: any = null;
      try {
        pubConn = await connectMysql(pubProfile, pubPassword);

        if (sub === "site_settings") {
          const placeholders = SITE_KEYS.map(() => "?").join(",");
          const [rows] = await pubConn.query(
            `SELECT \`key\`, \`value\` FROM business_settings WHERE \`key\` IN (${placeholders})`,
            SITE_KEYS,
          );
          const map: Record<string, string> = {};
          for (const r of rows as any[]) map[String(r.key)] = r.value == null ? "" : String(r.value);
          return new Response(JSON.stringify({
            success: true, source: "mysql",
            profile: { id: shop.id, slug: shop.slug, name: shop.name, site_mode: shop.site_mode },
            data: map,
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (sub === "services") {
          const [rows] = await pubConn.query(
            "SELECT id, title, subtitle, duration, price, image_url, sort_order FROM services WHERE active = 1 ORDER BY sort_order ASC, title ASC",
          );
          return new Response(JSON.stringify({ success: true, data: rows }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (sub === "barbers") {
          const [rows] = await pubConn.query(
            "SELECT id, name, specialty, avatar_url, sort_order FROM barbers WHERE active = 1 ORDER BY sort_order ASC, name ASC",
          );
          return new Response(JSON.stringify({ success: true, data: rows }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (sub === "products") {
          const [rows] = await pubConn.query(
            "SELECT id, title, description, price, image_url, sort_order FROM products WHERE active = 1 ORDER BY sort_order ASC, title ASC",
          );
          return new Response(JSON.stringify({ success: true, data: rows }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (sub === "reviews_public") {
          const [rows] = await pubConn.query(
            "SELECT id, customer_name, rating, comment, created_at FROM reviews WHERE status = 'approved' AND is_public = 1 ORDER BY created_at DESC LIMIT 30",
          );
          return new Response(JSON.stringify({ success: true, data: rows }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (sub === "create_appointment") {
          const p = body.payload || {};
          const customer_name = requireText(p.customer_name, "Nome", 120);
          const customer_phone = String(p.customer_phone || "").replace(/\D/g, "").slice(0, 20) || null;
          const customer_email = p.customer_email ? requireText(p.customer_email, "E-mail", 255) : null;
          const service_id = p.service_id ? String(p.service_id).slice(0, 36) : null;
          const barber_name = p.barber_name ? String(p.barber_name).slice(0, 120) : null;
          const date = String(p.appointment_date || "");
          const time = String(p.appointment_time || "");
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Data inválida");
          if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) throw new Error("Hora inválida");
          const total_price = p.total_price != null && p.total_price !== "" ? Number(p.total_price) : null;
          if (total_price != null && (!Number.isFinite(total_price) || total_price < 0 || total_price > 99999)) {
            throw new Error("Preço inválido");
          }
          const notes = p.notes ? String(p.notes).slice(0, 500) : null;
          const id = crypto.randomUUID();
          await pubConn.query(
            `INSERT INTO appointments (id, customer_name, customer_phone, customer_email, service_id, barber_name, appointment_date, appointment_time, status, total_price, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
            [id, customer_name, customer_phone, customer_email, service_id, barber_name, date, time, total_price, notes],
          );
          return new Response(JSON.stringify({ success: true, data: { id } }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (sub === "create_review") {
          const p = body.payload || {};
          const customer_name = requireText(p.customer_name, "Nome", 120);
          const rating = Number(p.rating);
          if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Nota inválida");
          const comment = p.comment ? String(p.comment).slice(0, 1000) : null;
          const customer_phone = p.customer_phone ? String(p.customer_phone).slice(0, 50) : null;
          const id = crypto.randomUUID();
          await pubConn.query(
            `INSERT INTO reviews (id, customer_name, customer_phone, rating, comment, status, is_public) VALUES (?, ?, ?, ?, ?, 'approved', 1)`,
            [id, customer_name, customer_phone, rating, comment],
          );
          return new Response(JSON.stringify({ success: true, data: { id } }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (sub === "create_order") {
          const p = body.payload || {};
          const customer_name = requireText(p.customer_name, "Nome", 120);
          const customer_phone = String(p.customer_phone || "").replace(/\D/g, "").slice(0, 20) || null;
          const total_price = Number(p.total_price);
          if (!Number.isFinite(total_price) || total_price < 0) throw new Error("Total inválido");
          const items = Array.isArray(p.items) ? p.items : [];
          if (items.length === 0 || items.length > 50) throw new Error("Itens inválidos");
          const id = crypto.randomUUID();
          await pubConn.query(
            `INSERT INTO orders (id, customer_name, customer_phone, delivery_mode, payment_method, total_price, status) VALUES (?, ?, ?, 'pickup', 'pix', ?, 'pending')`,
            [id, customer_name, customer_phone, total_price],
          );
          for (const it of items) {
            const pid = it.product_id ? String(it.product_id).slice(0, 36) : null;
            const ptitle = String(it.product_title || "").slice(0, 255);
            const pprice = Number(it.product_price) || 0;
            const qty = Math.max(1, Math.min(99, Number(it.quantity) || 1));
            if (!ptitle) continue;
            await pubConn.query(
              `INSERT INTO order_items (id, order_id, product_id, product_title, product_price, quantity) VALUES (?, ?, ?, ?, ?, ?)`,
              [crypto.randomUUID(), id, pid, ptitle, pprice, qty],
            );
          }
          return new Response(JSON.stringify({ success: true, data: { id } }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (sub === "business_settings_all") {
          const [rows] = await pubConn.query("SELECT `key`, `value` FROM business_settings");
          return new Response(JSON.stringify({ success: true, data: rows }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (sub === "prize_wheel_slices") {
          const [rows] = await pubConn.query(
            "SELECT id, label, icon, image_url, discount_percent, discount_value, custom_prize, probability, sort_order FROM prize_wheel_slices WHERE active = 1 ORDER BY sort_order ASC",
          );
          return new Response(JSON.stringify({ success: true, data: rows }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (sub === "coupon_validate") {
          const code = String(body.payload?.code || "").trim().toUpperCase().slice(0, 50);
          if (!code) throw new Error("Cupom obrigatório");
          const [rows] = await pubConn.query(
            "SELECT id, code, discount_percent, discount_value, max_uses, current_uses, expires_at, active FROM coupons WHERE UPPER(code) = ? AND active = 1 LIMIT 1",
            [code],
          );
          const row = (rows as any[])[0];
          if (!row) return new Response(JSON.stringify({ success: false, code: "NOT_FOUND" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          if (row.expires_at && new Date(row.expires_at) < new Date()) {
            return new Response(JSON.stringify({ success: false, code: "EXPIRED" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          if (row.max_uses != null && Number(row.current_uses) >= Number(row.max_uses)) {
            return new Response(JSON.stringify({ success: false, code: "EXHAUSTED" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          return new Response(JSON.stringify({ success: true, data: row }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (sub === "appointments_by_email") {
          const email = String(body.payload?.email || "").trim().toLowerCase().slice(0, 255);
          if (!email) throw new Error("E-mail obrigatório");
          const [rows] = await pubConn.query(
            "SELECT id, customer_name, customer_email, customer_phone, service_id, barber_name, appointment_date, appointment_time, status, total_price, notes, created_at FROM appointments WHERE LOWER(customer_email) = ? ORDER BY appointment_date DESC, appointment_time DESC LIMIT 100",
            [email],
          );
          return new Response(JSON.stringify({ success: true, data: rows }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (sub === "cancel_appointment") {
          const id = String(body.payload?.id || "").slice(0, 64);
          const email = String(body.payload?.email || "").trim().toLowerCase().slice(0, 255);
          if (!id || !email) throw new Error("Dados inválidos");
          const [result]: any = await pubConn.query(
            "UPDATE appointments SET status = 'cancelled' WHERE id = ? AND LOWER(customer_email) = ? AND status IN ('pending','confirmed')",
            [id, email],
          );
          return new Response(JSON.stringify({ success: true, data: { affected: result?.affectedRows || 0 } }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (sub === "orders_by_phone") {
          const phone = String(body.payload?.phone || "").replace(/\D/g, "").slice(0, 20);
          if (!phone) throw new Error("Telefone obrigatório");
          const [rows] = await pubConn.query(
            "SELECT id, customer_name, customer_phone, delivery_mode, status, total_price, payment_method, created_at FROM orders WHERE customer_phone = ? ORDER BY created_at DESC LIMIT 30",
            [phone],
          );
          return new Response(JSON.stringify({ success: true, data: rows }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (sub === "order_items") {
          const orderId = String(body.payload?.order_id || "").slice(0, 64);
          if (!orderId) throw new Error("order_id obrigatório");
          const [rows] = await pubConn.query(
            "SELECT id, order_id, product_id, product_title, product_price, quantity FROM order_items WHERE order_id = ?",
            [orderId],
          );
          return new Response(JSON.stringify({ success: true, data: rows }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        throw new Error("sub não implementada");
      } finally {
        try { await pubConn?.end(); } catch { /* ignore */ }
      }
    }

    const isMysqlSessionRequest = action !== "save_profile" && Boolean(body.mysql_session);
    let mysqlSession: MysqlAdminSession | null = null;
    if (isMysqlSessionRequest) {
      mysqlSession = await verifySession(body.mysql_session);
      if (profile_id && profile_id !== mysqlSession.profile_id) throw new Error("Perfil MySQL inválido para esta sessão");
      body.profile_id = mysqlSession.profile_id;
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!mysqlSession && !authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!mysqlSession) {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } },
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

    const isSuperAdminRequest = authEmail.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    if (!isSuperAdminRequest) {
      return new Response(
        JSON.stringify({ success: false, error: "Only the super admin can use MySQL" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    }

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

        // Detalhes adicionais (best-effort, ignora se tabela não existir)
        const extras: Record<string, number> = {
          appointments_today: 0,
          appointments_pending: 0,
          appointments_completed: 0,
          appointments_cancelled: 0,
          orders_pending: 0,
          orders_completed: 0,
          revenue_total: 0,
          revenue_today: 0,
          revenue_week: 0,
          revenue_month: 0,
          avg_ticket: 0,
          completion_rate: 0,
          reviews_avg: 0,
          reviews_5: 0,
          reviews_4: 0,
          reviews_3: 0,
          reviews_2: 0,
          reviews_1: 0,
          users_total: 0,
          orders_revenue_total: 0,
        };
        const lists: Record<string, any[]> = {
          top_services: [],
          top_barbers: [],
          upcoming: [],
          recent_orders: [],
        };
        const safeNum = async (sql: string, key: string, mapper: (v: any) => number = (v) => Number(v) || 0) => {
          try {
            const [rows] = await conn.query(sql);
            extras[key] = mapper((rows as any[])[0]);
          } catch { /* ignore */ }
        };
        const safeList = async (sql: string, key: string) => {
          try {
            const [rows] = await conn.query(sql);
            lists[key] = rows as any[];
          } catch { /* ignore */ }
        };
        await safeNum(`SELECT COUNT(*) AS c FROM appointments WHERE appointment_date = CURDATE()`, "appointments_today", (r) => Number(r?.c) || 0);
        await safeNum(`SELECT COUNT(*) AS c FROM appointments WHERE status = 'pending'`, "appointments_pending", (r) => Number(r?.c) || 0);
        await safeNum(`SELECT COUNT(*) AS c FROM appointments WHERE status = 'completed'`, "appointments_completed", (r) => Number(r?.c) || 0);
        await safeNum(`SELECT COUNT(*) AS c FROM appointments WHERE status = 'cancelled'`, "appointments_cancelled", (r) => Number(r?.c) || 0);
        await safeNum(`SELECT COUNT(*) AS c FROM orders WHERE status = 'pending'`, "orders_pending", (r) => Number(r?.c) || 0);
        await safeNum(`SELECT COUNT(*) AS c FROM orders WHERE status = 'completed'`, "orders_completed", (r) => Number(r?.c) || 0);
        await safeNum(`SELECT COALESCE(SUM(total_price),0) AS s FROM appointments WHERE status = 'completed'`, "revenue_total", (r) => Number(r?.s) || 0);
        await safeNum(`SELECT COALESCE(SUM(total_price),0) AS s FROM appointments WHERE status = 'completed' AND appointment_date = CURDATE()`, "revenue_today", (r) => Number(r?.s) || 0);
        await safeNum(`SELECT COALESCE(SUM(total_price),0) AS s FROM appointments WHERE status = 'completed' AND appointment_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`, "revenue_week", (r) => Number(r?.s) || 0);
        await safeNum(`SELECT COALESCE(SUM(total_price),0) AS s FROM appointments WHERE status = 'completed' AND appointment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`, "revenue_month", (r) => Number(r?.s) || 0);
        await safeNum(`SELECT COALESCE(AVG(total_price),0) AS s FROM appointments WHERE status = 'completed' AND total_price > 0`, "avg_ticket", (r) => Number(r?.s) || 0);
        await safeNum(`SELECT COALESCE(SUM(total_price),0) AS s FROM orders WHERE status = 'completed'`, "orders_revenue_total", (r) => Number(r?.s) || 0);
        await safeNum(`SELECT COALESCE(AVG(rating),0) AS s FROM reviews`, "reviews_avg", (r) => Number(r?.s) || 0);
        await safeNum(`SELECT COUNT(*) AS c FROM reviews WHERE rating = 5`, "reviews_5", (r) => Number(r?.c) || 0);
        await safeNum(`SELECT COUNT(*) AS c FROM reviews WHERE rating = 4`, "reviews_4", (r) => Number(r?.c) || 0);
        await safeNum(`SELECT COUNT(*) AS c FROM reviews WHERE rating = 3`, "reviews_3", (r) => Number(r?.c) || 0);
        await safeNum(`SELECT COUNT(*) AS c FROM reviews WHERE rating = 2`, "reviews_2", (r) => Number(r?.c) || 0);
        await safeNum(`SELECT COUNT(*) AS c FROM reviews WHERE rating = 1`, "reviews_1", (r) => Number(r?.c) || 0);
        await safeNum(`SELECT COUNT(*) AS c FROM users`, "users_total", (r) => Number(r?.c) || 0);

        const totalDone = extras.appointments_completed;
        const totalAll = totalDone + extras.appointments_cancelled + extras.appointments_pending;
        extras.completion_rate = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;

        await safeList(
          `SELECT COALESCE(s.title, a.service_name, 'Serviço') AS name, COUNT(*) AS total, COALESCE(SUM(a.total_price),0) AS revenue
           FROM appointments a LEFT JOIN services s ON s.id = a.service_id
           WHERE a.status = 'completed'
           GROUP BY name ORDER BY total DESC LIMIT 5`,
          "top_services",
        );
        await safeList(
          `SELECT COALESCE(barber_name, 'Sem barbeiro') AS name, COUNT(*) AS total, COALESCE(SUM(total_price),0) AS revenue
           FROM appointments WHERE status = 'completed'
           GROUP BY name ORDER BY total DESC LIMIT 5`,
          "top_barbers",
        );
        await safeList(
          `SELECT customer_name, appointment_date, appointment_time, barber_name, status
           FROM appointments
           WHERE appointment_date >= CURDATE() AND status IN ('pending','confirmed')
           ORDER BY appointment_date ASC, appointment_time ASC LIMIT 5`,
          "upcoming",
        );
        await safeList(
          `SELECT customer_name, total_price, status, created_at
           FROM orders ORDER BY created_at DESC LIMIT 5`,
          "recent_orders",
        );

        // Versão MySQL e nome do banco para info
        let mysql_version = "";
        try {
          const [vr] = await conn.query(`SELECT VERSION() AS v`);
          mysql_version = String((vr as any[])[0]?.v ?? "");
        } catch { /* ignore */ }

        return new Response(JSON.stringify({
          success: true,
          data: stats,
          extras,
          lists,
          info: {
            mysql_version,
            database: profile.database_name,
            host: profile.host,
            checked_at: new Date().toISOString(),
          },
        }), {
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
        const orderList = Array.isArray(order) ? order : order ? [order] : [];
        if (orderList.length) {
          sql += ` ORDER BY ${orderList
            .filter((o: any) => o?.column)
            .map((o: any) => `${ident(o.column)} ${o.ascending === false ? "DESC" : "ASC"}`)
            .join(", ")}`;
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
