/**
 * Catálogo único de permissões do painel admin de uma barbearia.
 * Usado em:
 *  - BarbershopFormModal (toggles)
 *  - profileSqlGenerator  (seed na tabela `user_permissions`)
 *  - AdminLayout (filtra rotas)
 */

export type PermissionKey =
  | "dashboard"
  | "finance"
  | "services"
  | "store"
  | "barbers"
  | "appointments"
  | "coupons"
  | "chatpro"
  | "reviews"
  | "settings";

export interface PermissionGroup {
  id: string;
  label: string;
  items: { key: PermissionKey; label: string; desc: string; lockedOn?: boolean }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "core",
    label: "Núcleo",
    items: [
      { key: "dashboard", label: "Dashboard", desc: "Visão geral e métricas", lockedOn: true },
      { key: "settings", label: "Configurações", desc: "Editar dados, visual, horários" },
    ],
  },
  {
    id: "operacional",
    label: "Operacional",
    items: [
      { key: "appointments", label: "Agendamentos", desc: "Lista e gestão de agendas" },
      { key: "services", label: "Serviços", desc: "Catálogo e preços" },
      { key: "barbers", label: "Barbeiros", desc: "Equipe e disponibilidade" },
      { key: "coupons", label: "Cupons", desc: "Descontos promocionais" },
    ],
  },
  {
    id: "comercial",
    label: "Comercial",
    items: [
      { key: "finance", label: "Financeiro", desc: "Receitas e relatórios" },
      { key: "store", label: "Loja", desc: "Produtos e pedidos" },
      { key: "reviews", label: "Avaliações", desc: "Depoimentos de clientes" },
    ],
  },
  {
    id: "integracoes",
    label: "Integrações",
    items: [
      { key: "chatpro", label: "ChatPro", desc: "Disparo automático WhatsApp" },
    ],
  },
];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_GROUPS.flatMap((g) =>
  g.items.map((i) => i.key),
);

export const DEFAULT_PERMISSIONS: Record<PermissionKey, boolean> = ALL_PERMISSION_KEYS.reduce(
  (acc, k) => ({ ...acc, [k]: true }),
  {} as Record<PermissionKey, boolean>,
);

export const sanitizePermissions = (
  raw: unknown,
): Record<PermissionKey, boolean> => {
  const out = { ...DEFAULT_PERMISSIONS };
  if (!raw || typeof raw !== "object") return out;
  for (const k of ALL_PERMISSION_KEYS) {
    const v = (raw as Record<string, unknown>)[k];
    if (typeof v === "boolean") out[k] = v;
  }
  // dashboard sempre on
  out.dashboard = true;
  return out;
};
