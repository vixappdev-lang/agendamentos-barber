import { useEffect, useState } from "react";
import { ArrowLeft, LogOut, Package, Phone, ShoppingBag, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { User as AuthUser } from "@supabase/supabase-js";
import type { useThemeColors } from "@/hooks/useThemeColors";

interface OrderRow {
  id: string;
  status: string;
  total_price: number;
  delivery_mode: string;
  payment_method: string | null;
  created_at: string;
}

const statusLabel: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  preparing: "Preparando",
  delivering: "Em entrega",
  completed: "Concluído",
  cancelled: "Cancelado",
};

interface Props {
  user: AuthUser;
  t: ReturnType<typeof useThemeColors>;
  onBack: () => void;
  onSignedOut: () => void;
}

const AccountInline = ({ user, t, onBack, onSignedOut }: Props) => {
  const [tab, setTab] = useState<"profile" | "orders">("profile");
  const [orders, setOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    if (!user.email) return;
    supabase
      .from("orders")
      .select("id,status,total_price,delivery_mode,payment_method,created_at")
      .eq("customer_email", user.email)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setOrders((data as OrderRow[]) || []));
  }, [user.email]);

  const phone = (user.user_metadata?.phone as string) || "";
  const name = (user.user_metadata?.full_name as string) || "Cliente";

  const signOut = async () => {
    await supabase.auth.signOut();
    onSignedOut();
  };

  return (
    <main className="w-full max-w-[900px] mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-28 sm:pb-10">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-xs font-semibold mb-5" style={{ color: t.textMuted }}>
        <ArrowLeft className="w-4 h-4" /> Voltar à loja
      </button>

      <div className="rounded-2xl p-5 mb-4 flex items-center gap-3" style={{ background: t.cardBg, border: `1px solid ${t.border}` }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: t.btnBg }}>
          <UserIcon className="w-6 h-6" style={{ color: t.btnColor }} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-black truncate" style={{ color: t.textPrimary }}>{name}</h1>
          <p className="text-xs truncate" style={{ color: t.textMuted }}>{user.email}</p>
        </div>
        <button onClick={signOut} aria-label="Sair"
          className="p-2.5 rounded-xl shrink-0" style={{ background: t.btnGhostBg, border: `1px solid ${t.btnGhostBorder}`, color: t.btnGhostColor }}>
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl mb-4" style={{ background: t.cardBgSubtle }}>
        {[
          { id: "profile" as const, label: "Perfil", icon: UserIcon },
          { id: "orders" as const, label: `Compras (${orders.length})`, icon: ShoppingBag },
        ].map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)}
            className="py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
            style={{ background: tab === item.id ? t.btnBg : "transparent", color: tab === item.id ? t.btnColor : t.textMuted }}>
            <item.icon className="w-3.5 h-3.5" /> {item.label}
          </button>
        ))}
      </div>

      {tab === "profile" ? (
        <div className="rounded-2xl p-5 space-y-3" style={{ background: t.cardBg, border: `1px solid ${t.border}` }}>
          <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: t.textMuted }}>Dados do cliente</p>
          <div className="space-y-2.5 text-sm">
            <p className="flex items-center gap-2.5" style={{ color: t.textPrimary }}>
              <UserIcon className="w-4 h-4 opacity-60" />{name}
            </p>
            <p className="flex items-center gap-2.5" style={{ color: t.textSecondary }}>
              <Phone className="w-4 h-4 opacity-60" />{phone || "—"}
            </p>
            <p className="flex items-center gap-2.5 break-all" style={{ color: t.textSecondary }}>
              <span className="text-xs opacity-60">@</span>{user.email}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.length === 0 ? (
            <div className="text-center py-12 rounded-2xl" style={{ background: t.cardBg, border: `1px solid ${t.border}` }}>
              <Package className="w-10 h-10 mx-auto mb-3 opacity-40" style={{ color: t.textMuted }} />
              <p className="text-sm font-bold mb-1" style={{ color: t.textPrimary }}>Sem compras ainda</p>
              <p className="text-xs" style={{ color: t.textMuted }}>Seus pedidos aparecerão aqui.</p>
            </div>
          ) : orders.map((order) => (
            <div key={order.id} className="rounded-2xl p-4 flex items-center justify-between gap-3" style={{ background: t.cardBg, border: `1px solid ${t.border}` }}>
              <div className="min-w-0">
                <p className="text-xs font-bold" style={{ color: t.textPrimary }}>#{order.id.slice(0, 8).toUpperCase()} · {statusLabel[order.status] || order.status}</p>
                <p className="text-[10px] mt-0.5" style={{ color: t.textMuted }}>{new Date(order.created_at).toLocaleString("pt-BR")}</p>
              </div>
              <p className="text-sm font-black shrink-0" style={{ color: t.textPrimary }}>R$ {Number(order.total_price).toFixed(2).replace(".", ",")}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

export default AccountInline;
