import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LogOut, Package, Phone, ShoppingBag, User, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useThemeColors } from "@/hooks/useThemeColors";
import type { User as AuthUser } from "@supabase/supabase-js";

interface Props {
  user: AuthUser;
  onClose: () => void;
  onSignedOut: () => void;
}

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

const StoreAccountModal = ({ user, onClose, onSignedOut }: Props) => {
  const t = useThemeColors();
  const [tab, setTab] = useState<"profile" | "orders">("profile");
  const [orders, setOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    if (!user.email) return;
    supabase
      .from("orders")
      .select("id,status,total_price,delivery_mode,payment_method,created_at")
      .eq("customer_email", user.email)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => setOrders((data as OrderRow[]) || []));
  }, [user.email]);

  const phone = (user.user_metadata?.phone as string) || user.email?.split("@")[0] || "";
  const name = (user.user_metadata?.full_name as string) || "Cliente Genesis";

  const signOut = async () => {
    await supabase.auth.signOut();
    onSignedOut();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: t.overlayBg, backdropFilter: "blur(14px)" }} onClick={onClose}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[92vh] overflow-y-auto scrollbar-hide"
        style={{ background: t.modalCardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadowLg }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: t.btnBg }}>
              <User className="w-5 h-5" style={{ color: t.btnColor }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black truncate" style={{ color: t.textPrimary }}>Minha conta</h2>
              <p className="text-[11px] truncate" style={{ color: t.textMuted }}>{name}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar"><X className="w-5 h-5" style={{ color: t.textMuted }} /></button>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl" style={{ background: t.cardBgSubtle }}>
          {[
            { id: "profile" as const, label: "Perfil", icon: User },
            { id: "orders" as const, label: "Compras", icon: ShoppingBag },
          ].map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)} className="py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
              style={{ background: tab === item.id ? t.btnBg : "transparent", color: tab === item.id ? t.btnColor : t.textMuted }}>
              <item.icon className="w-3.5 h-3.5" /> {item.label}
            </button>
          ))}
        </div>

        {tab === "profile" ? (
          <div className="space-y-3">
            <div className="rounded-2xl p-4" style={{ background: t.cardBgSubtle, border: `1px solid ${t.borderSubtle}` }}>
              <p className="text-[10px] uppercase tracking-wider font-bold mb-3" style={{ color: t.textMuted }}>Dados do cliente</p>
              <div className="space-y-2 text-sm">
                <p style={{ color: t.textPrimary }}><User className="inline w-4 h-4 mr-2" />{name}</p>
                <p style={{ color: t.textSecondary }}><Phone className="inline w-4 h-4 mr-2" />{phone}</p>
                <p className="text-xs" style={{ color: t.textMuted }}>{user.email}</p>
              </div>
            </div>
            <button onClick={signOut} className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              style={{ background: t.btnGhostBg, color: t.btnGhostColor, border: `1px solid ${t.btnGhostBorder}` }}>
              <LogOut className="w-4 h-4" /> Sair da conta
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.length === 0 ? (
              <div className="text-center py-8 rounded-2xl" style={{ background: t.cardBgSubtle, border: `1px solid ${t.borderSubtle}` }}>
                <Package className="w-8 h-8 mx-auto mb-2" style={{ color: t.textSubtle }} />
                <p className="text-sm" style={{ color: t.textMuted }}>Nenhuma compra encontrada.</p>
              </div>
            ) : orders.map((order) => (
              <div key={order.id} className="rounded-2xl p-3 flex items-center justify-between gap-3" style={{ background: t.cardBgSubtle, border: `1px solid ${t.borderSubtle}` }}>
                <div className="min-w-0">
                  <p className="text-xs font-bold" style={{ color: t.textPrimary }}>{statusLabel[order.status] || order.status}</p>
                  <p className="text-[10px]" style={{ color: t.textMuted }}>{new Date(order.created_at).toLocaleString("pt-BR")}</p>
                </div>
                <p className="text-sm font-black shrink-0" style={{ color: t.textPrimary }}>R$ {Number(order.total_price).toFixed(2).replace(".", ",")}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default StoreAccountModal;