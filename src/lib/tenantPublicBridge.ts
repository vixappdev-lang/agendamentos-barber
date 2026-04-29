/**
 * Tenant Public Bridge
 *
 * Quando uma página está renderizada dentro de TenantSiteProvider, este bridge
 * intercepta `supabase.from(table)` para tabelas de leitura/escrita pública e
 * roteia tudo para a edge function `mysql-proxy` via action="public_query"
 * usando o slug/host atual. Assim, pages como /agenda, /loja, /avaliacao,
 * /membro funcionam idênticas ao que já estavam, mas lendo o MySQL da
 * barbearia certa — sem precisar reescrever cada componente.
 *
 * O bridge é registrado pelo TenantSiteProvider no mount e desregistrado
 * no unmount. O bridge convive com o adminMysqlSession bridge: o admin
 * sempre tem prioridade quando o path é /admin.
 */

import { supabase } from "@/integrations/supabase/client";

type PublicQuery = (sub: string, payload?: any) => Promise<{ data: any; error: Error | null }>;

interface TenantContext {
  publicQuery: PublicQuery;
  slug?: string;
  host?: string;
}

let activeTenant: TenantContext | null = null;

export const setActiveTenant = (ctx: TenantContext | null) => {
  activeTenant = ctx;
};

export const getActiveTenant = () => activeTenant;

/* ---------- Mapeamento tabela → sub do public_query ---------- */

const READ_SUBS: Record<string, string> = {
  services: "services",
  barbers: "barbers",
  products: "products",
  prize_wheel_slices: "prize_wheel_slices",
  business_settings: "business_settings_all",
  reviews: "reviews_public",
};

/* ---------- Implementação do query builder público ---------- */

type Where = { column: string; op: string; value: unknown };

class PublicSelectQuery {
  private where: Where[] = [];
  private orderCol?: string;
  private orderAsc = true;
  private rowLimit?: number;
  private singleMode: "none" | "single" | "maybe" = "none";

  constructor(private table: string, private columns?: string, private options?: any) {}

  eq(c: string, v: unknown) { this.where.push({ column: c, op: "=", value: v }); return this; }
  gte(c: string, v: unknown) { this.where.push({ column: c, op: ">=", value: v }); return this; }
  lte(c: string, v: unknown) { this.where.push({ column: c, op: "<=", value: v }); return this; }
  in(c: string, v: unknown[]) { this.where.push({ column: c, op: "in", value: v }); return this; }
  order(col: string, opts?: { ascending?: boolean }) { this.orderCol = col; this.orderAsc = opts?.ascending !== false; return this; }
  limit(n: number) { this.rowLimit = n; return this; }
  single() { this.singleMode = "single"; this.rowLimit = 1; return this.execute(); }
  maybeSingle() { this.singleMode = "maybe"; this.rowLimit = 1; return this.execute(); }

  private filterAndShape(data: any[]): any[] {
    let rows = Array.isArray(data) ? [...data] : [];
    // Aplica filtros locais. Para listas públicas, o servidor já entrega apenas
    // registros ativos; alguns endpoints não retornam a coluna `active`, então
    // não podemos remover tudo quando a página encadeia `.eq("active", true)`.
    for (const w of this.where) {
      if (w.op === "=") {
        rows = rows.filter((r) => {
          if (w.column === "active" && w.value === true && !("active" in r)) return true;
          return String(r[w.column]) === String(w.value);
        });
      }
      else if (w.op === "in" && Array.isArray(w.value)) {
        const set = new Set((w.value as any[]).map((x) => String(x)));
        rows = rows.filter((r) => set.has(String(r[w.column])));
      } else if (w.op === ">=") rows = rows.filter((r) => r[w.column] >= (w.value as any));
      else if (w.op === "<=") rows = rows.filter((r) => r[w.column] <= (w.value as any));
    }
    if (this.orderCol) {
      const k = this.orderCol;
      rows.sort((a, b) => {
        const av = a[k]; const bv = b[k];
        if (av === bv) return 0;
        return (av > bv ? 1 : -1) * (this.orderAsc ? 1 : -1);
      });
    }
    if (this.rowLimit) rows = rows.slice(0, this.rowLimit);
    return rows;
  }

  async execute(): Promise<any> {
    const t = activeTenant;
    if (!t) return { data: null, error: new Error("Tenant não disponível") };

    // Casos especiais: tabelas com leitura pública parametrizada
    if (this.table === "appointments") {
      const emailFilter = this.where.find((w) => w.column === "customer_email" && w.op === "=");
      if (!emailFilter) return { data: null, error: new Error("appointments público requer filtro por customer_email") };
      const { data, error } = await t.publicQuery("appointments_by_email", { email: emailFilter.value });
      if (error) return { data: null, error, count: null };
      const rows = this.filterAndShape((data?.data || data || []) as any[]);
      const final = this.singleMode === "none" ? rows : rows[0] ?? null;
      return { data: final, error: null, count: rows.length };
    }
    if (this.table === "orders") {
      const phoneFilter = this.where.find((w) => w.column === "customer_phone" && w.op === "=");
      if (!phoneFilter) return { data: null, error: new Error("orders público requer filtro por customer_phone") };
      const { data, error } = await t.publicQuery("orders_by_phone", { phone: phoneFilter.value });
      if (error) return { data: null, error, count: null };
      const rows = this.filterAndShape((data?.data || data || []) as any[]);
      const final = this.singleMode === "none" ? rows : rows[0] ?? null;
      return { data: final, error: null, count: rows.length };
    }
    if (this.table === "order_items") {
      const orderFilter = this.where.find((w) => w.column === "order_id" && w.op === "=");
      if (!orderFilter) return { data: null, error: new Error("order_items público requer filtro por order_id") };
      const { data, error } = await t.publicQuery("order_items", { order_id: orderFilter.value });
      if (error) return { data: null, error, count: null };
      const rows = (data?.data || data || []) as any[];
      const final = this.singleMode === "none" ? rows : rows[0] ?? null;
      return { data: final, error: null, count: rows.length };
    }

    // Tabelas com sub específica (lista pública)
    const sub = READ_SUBS[this.table];
    if (sub) {
      const { data, error } = await t.publicQuery(sub);
      if (error) return { data: null, error, count: null };
      const rows = this.filterAndShape((data?.data || data || []) as any[]);
      const final = this.singleMode === "none" ? rows : rows[0] ?? null;
      // suporte head:true count
      if (this.options?.head === true && this.options?.count) {
        return { data: null, error: null, count: rows.length };
      }
      return { data: final, error: null, count: rows.length };
    }

    // Tabelas sem leitura pública (appointments, orders, etc.) — não suportado aqui
    return { data: null, error: new Error(`Leitura pública não suportada para "${this.table}"`) };
  }

  then(resolve: any, reject: any) { return this.execute().then(resolve, reject); }
}

class PublicInsertQuery {
  constructor(private table: string, private values: any) {}

  private toPayload(): { sub: string; payload: any } | null {
    if (this.table === "appointments") {
      const v = Array.isArray(this.values) ? this.values[0] : this.values;
      return { sub: "create_appointment", payload: v };
    }
    if (this.table === "reviews") {
      const v = Array.isArray(this.values) ? this.values[0] : this.values;
      return { sub: "create_review", payload: v };
    }
    if (this.table === "orders") {
      const v = Array.isArray(this.values) ? this.values[0] : this.values;
      // CheckoutModal envia o order sem items; items virão no insert seguinte
      // em order_items. Suporta também v.items inline.
      return { sub: "create_order", payload: v };
    }
    if (this.table === "order_items") {
      const arr = Array.isArray(this.values) ? this.values : [this.values];
      const order_id = arr[0]?.order_id;
      return { sub: "add_order_items", payload: { order_id, items: arr } };
    }
    return null;
  }

  async execute() {
    const t = activeTenant;
    if (!t) return { data: null, error: new Error("Tenant não disponível") };
    const map = this.toPayload();
    if (!map) return { data: null, error: new Error(`Insert público não suportado para "${this.table}"`) };
    const { data, error } = await t.publicQuery(map.sub, map.payload);
    if (error) return { data: null, error };
    return { data: data?.data || data, error: null };
  }

  // Suporta .select() encadeado pra retornar o registro criado (chain compatível com supabase)
  select(_cols?: string) {
    const exec = this.execute();
    return {
      single: async () => {
        const r = await exec;
        return r.error ? r : { data: r.data, error: null };
      },
      then: (resolve: any, reject: any) => exec.then(resolve, reject),
    };
  }

  then(resolve: any, reject: any) { return this.execute().then(resolve, reject); }
}

/**
 * Update no modo público — só suporta cancelamento de appointment do próprio
 * usuário (precisa do customer_email para validar no servidor).
 *
 * Uso esperado: supabase.from("appointments").update({ status: "cancelled" })
 *   .eq("id", aptId).eq("customer_email", email)
 */
class PublicUpdateQuery {
  private where: Where[] = [];
  constructor(private table: string, private values: any) {}
  eq(c: string, v: unknown) { this.where.push({ column: c, op: "=", value: v }); return this; }
  async execute() {
    const t = activeTenant;
    if (!t) return { data: null, error: new Error("Tenant não disponível") };
    if (this.table === "appointments" && this.values?.status === "cancelled") {
      const id = this.where.find((w) => w.column === "id")?.value;
      const email = this.where.find((w) => w.column === "customer_email")?.value;
      if (!id) return { data: null, error: new Error("id obrigatório") };
      // Se não passou email, exige um já presente em sessão futura (por ora barra).
      if (!email) return { data: null, error: new Error("customer_email obrigatório para cancelar") };
      const { data, error } = await t.publicQuery("cancel_appointment", { id, email });
      if (error) return { data: null, error };
      return { data, error: null };
    }
    return { data: null, error: new Error(`Update público não suportado para "${this.table}"`) };
  }
  then(resolve: any, reject: any) { return this.execute().then(resolve, reject); }
}

class PublicTableProxy {
  constructor(private table: string) {}
  select(columns = "*", options?: any) { return new PublicSelectQuery(this.table, columns, options); }
  insert(values: any) { return new PublicInsertQuery(this.table, values); }
  upsert(_v: any, _o?: any) { return { then: (_r: any, j: any) => j(new Error(`upsert público não permitido para "${this.table}"`)) }; }
  update(values: any) { return new PublicUpdateQuery(this.table, values); }
  delete() { return { eq: () => ({ then: (_r: any, j: any) => j(new Error(`delete público não permitido`)) }) }; }
}

/* ---------- Tabelas redirecionadas em modo público ---------- */

const PUBLIC_TABLES = new Set([
  "services",
  "barbers",
  "products",
  "prize_wheel_slices",
  "business_settings",
  "reviews",
  "appointments", // só insert (booking)
  "orders",
  "order_items",
]);

// Caminhos do site público (sem admin) onde devemos interceptar.
const isPublicSitePath = (path: string) => {
  if (path.startsWith("/admin")) return false;
  if (path.startsWith("/s/")) {
    const seg = path.split("/").slice(1);
    if (seg[2] === "admin") return false;
    return true; // /s/:slug e tudo abaixo (exceto /admin)
  }
  return true; // raiz e demais rotas públicas
};

export const shouldProxyPublicTable = (table: string) => {
  if (typeof window === "undefined") return false;
  if (!activeTenant) return false;
  if (!isPublicSitePath(window.location.pathname)) return false;
  return PUBLIC_TABLES.has(table);
};

export const installTenantPublicBridge = () => {
  const client = supabase as any;
  if (client.__tenantPublicBridgeInstalled) return;
  const previousFrom = client.from.bind(client); // pode ser o original ou o adminBridge
  client.from = (table: string) => {
    if (shouldProxyPublicTable(table)) return new PublicTableProxy(table);
    return previousFrom(table);
  };
  client.__tenantPublicBridgeInstalled = true;
};
