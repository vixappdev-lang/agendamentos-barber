import { supabase } from "@/integrations/supabase/client";

export const ADMIN_MYSQL_SESSION_KEY = "admin_mysql_session";

export interface AdminMysqlSession {
  token: string;
  profile_id: string;
  barbershop_id: string;
  name?: string;
  email: string;
  role: string;
  permissions?: Record<string, boolean>;
  source: "mysql";
}

export const getAdminMysqlSession = (): AdminMysqlSession | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ADMIN_MYSQL_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminMysqlSession;
    if (!parsed?.token || !parsed.profile_id || parsed.source !== "mysql") return null;
    return parsed;
  } catch {
    return null;
  }
};

export const setAdminMysqlSession = (session: AdminMysqlSession) => {
  window.localStorage.setItem(ADMIN_MYSQL_SESSION_KEY, JSON.stringify(session));
};

export const clearAdminMysqlSession = () => {
  window.localStorage.removeItem(ADMIN_MYSQL_SESSION_KEY);
};

const MYSQL_TABLES = new Set([
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
  "user_permissions",
  "reviews",
  // Novos módulos (Caixa, Comandas, Comissões, Fiados, Estoque, Fornecedores)
  "cash_sessions",
  "cash_movements",
  "commands",
  "command_items",
  "commission_rules",
  "commission_payouts",
  "credit_accounts",
  "credit_entries",
  "suppliers",
  "inventory_items",
  "inventory_movements",
]);

type Where = { column: string; op: string; value: unknown };
type Order = { column: string; ascending?: boolean };

const isAdminPath = (path: string) => {
  if (path.startsWith("/admin")) return true;
  // suporta /s/:slug/admin
  if (path.startsWith("/s/")) {
    const seg = path.split("/").slice(1); // ["s", slug, ...]
    if (seg[2] === "admin") return true;
  }
  return false;
};

const shouldProxyTable = (table: string) => {
  if (typeof window === "undefined") return false;
  return isAdminPath(window.location.pathname) && !!getAdminMysqlSession() && MYSQL_TABLES.has(table);
};

const normalizeColumns = (columns?: string) => {
  const raw = (columns || "*").trim();
  if (raw === "*" || raw.includes("(") || raw.includes(")")) return undefined;
  return raw.split(",").map((c) => c.trim()).filter(Boolean);
};

const withIds = (values: any) => {
  const addId = (row: any) => ({ id: row?.id || crypto.randomUUID(), ...row });
  return Array.isArray(values) ? values.map(addId) : addId(values || {});
};

class MysqlSelectQuery {
  private where: Where[] = [];
  private orders: Order[] = [];
  private rowLimit?: number;
  private singleMode: "none" | "single" | "maybe" = "none";

  constructor(private table: string, private columns?: string, private options?: any) {}

  eq(column: string, value: unknown) { this.where.push({ column, op: "=", value }); return this; }
  gte(column: string, value: unknown) { this.where.push({ column, op: ">=", value }); return this; }
  lte(column: string, value: unknown) { this.where.push({ column, op: "<=", value }); return this; }
  in(column: string, value: unknown[]) { this.where.push({ column, op: "in", value }); return this; }
  order(column: string, opts?: { ascending?: boolean }) { this.orders.push({ column, ascending: opts?.ascending !== false }); return this; }
  limit(n: number) { this.rowLimit = n; return this; }
  single() { this.singleMode = "single"; this.rowLimit = 1; return this.execute(); }
  maybeSingle() { this.singleMode = "maybe"; this.rowLimit = 1; return this.execute(); }

  async execute() {
    const countOnly = this.options?.head === true && this.options?.count;
    const body: Record<string, unknown> = countOnly
      ? { action: "count", table: this.table, where: this.where }
      : {
          action: "select",
          table: this.table,
          columns: normalizeColumns(this.columns),
          where: this.where,
          order: this.orders,
          limit: this.rowLimit,
        };
    const res = await mysqlInvoke(body);
    if (res.error) return countOnly ? { data: null, count: 0, error: res.error } : res;
    if (countOnly) return { data: null, count: res.data?.count ?? 0, error: null };

    let data = (res.data || []) as any[];
    if (this.table === "appointments" && this.columns?.includes("services(")) {
      const serviceIds = [...new Set(data.map((a) => a.service_id).filter(Boolean))];
      if (serviceIds.length) {
        const services = await mysqlInvoke({ action: "select", table: "services", columns: ["id", "title"], where: [{ column: "id", op: "in", value: serviceIds }] });
        const map = new Map(((services.data || []) as any[]).map((s) => [s.id, s]));
        data = data.map((a) => ({ ...a, services: a.service_id ? map.get(a.service_id) || null : null }));
      }
    }
    const finalData = this.singleMode === "none" ? data : data[0] ?? null;
    return { data: finalData, error: null };
  }

  then(resolve: any, reject: any) { return this.execute().then(resolve, reject); }
}

class MysqlMutationQuery {
  private where: Where[] = [];
  constructor(private body: Record<string, unknown>) {}
  eq(column: string, value: unknown) { this.where.push({ column, op: "=", value }); return this; }
  async execute() { return mysqlInvoke({ ...this.body, where: this.where }); }
  then(resolve: any, reject: any) { return this.execute().then(resolve, reject); }
}

class MysqlTableProxy {
  constructor(private table: string) {}
  select(columns = "*", options?: any) { return new MysqlSelectQuery(this.table, columns, options); }
  insert(values: any) { return new MysqlMutationQuery({ action: "insert", table: this.table, values: withIds(values) }); }
  update(values: any) { return new MysqlMutationQuery({ action: "update", table: this.table, values }); }
  delete() { return new MysqlMutationQuery({ action: "delete", table: this.table }); }
  upsert(values: any, opts?: { onConflict?: string }) {
    return new MysqlMutationQuery({ action: "upsert", table: this.table, values: withIds(values), on_conflict: opts?.onConflict || "id" });
  }
}

const mysqlInvoke = async (body: Record<string, unknown>) => {
  const session = getAdminMysqlSession();
  if (!session) return { data: null, error: new Error("Sessão MySQL ausente") };
  const { data, error } = await supabase.functions.invoke("mysql-proxy", {
    body: { ...body, mysql_session: session.token, profile_id: session.profile_id },
  });
  if (error) return { data: null, error };
  if (data?.success === false) return { data: null, error: new Error(data.error || "Erro no MySQL") };
  return { data: data?.data ?? null, error: null };
};

export const installAdminMysqlBridge = () => {
  const client = supabase as any;
  if (client.__adminMysqlBridgeInstalled) return;
  const originalFrom = client.from.bind(client);
  client.from = (table: string) => (shouldProxyTable(table) ? new MysqlTableProxy(table) : originalFrom(table));
  client.__adminMysqlBridgeInstalled = true;
};