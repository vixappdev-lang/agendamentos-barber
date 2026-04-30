import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package, Clock, CheckCircle, Truck, Store, ChefHat, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useThemeColors } from "@/hooks/useThemeColors";

interface Order {
  id: string;
  customer_name: string;
  status: string;
  total_price: number;
  delivery_mode: string;
  created_at: string;
}

interface OrderItem {
  id: string;
  product_title: string;
  product_price: number;
  quantity: number;
}

const STATUSES = [
  { id: "pending", label: "Pendente", color: "hsl(45 80% 55%)", icon: Clock },
  { id: "confirmed", label: "Confirmado", color: "hsl(210 80% 55%)", icon: CheckCircle },
  { id: "preparing", label: "Preparando", color: "hsl(280 60% 55%)", icon: ChefHat },
  { id: "delivering", label: "Saiu p/ entrega", color: "hsl(200 80% 50%)", icon: Truck },
  { id: "completed", label: "Concluído", color: "hsl(140 60% 45%)", icon: CheckCircle },
  { id: "cancelled", label: "Cancelado", color: "hsl(0 60% 50%)", icon: XCircle },
];

interface OrderTrackerProps {
  onClose: () => void;
  customerPhone: string;
  customerEmail?: string;
}

const OrderTracker = ({ onClose, customerPhone, customerEmail }: OrderTrackerProps) => {
  const t = useThemeColors();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState(customerPhone);
  const [searched, setSearched] = useState(!!customerPhone || !!customerEmail);

  useEffect(() => {
    if (customerEmail) searchByEmail(customerEmail);
    else if (customerPhone) searchOrders(customerPhone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerEmail, customerPhone]);

  const searchByEmail = async (email: string) => {
    setLoading(true);
    setSearched(true);
    const { data } = await supabase.from("orders").select("*").eq("customer_email", email).order("created_at", { ascending: false }).limit(20);
    setOrders((data as Order[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    const channel = supabase.channel("order-tracker")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        setOrders((prev) => prev.map((o) => o.id === payload.new.id ? { ...o, ...payload.new } as Order : o));
        if (selectedOrder?.id === payload.new.id) setSelectedOrder((prev) => prev ? { ...prev, ...payload.new } as Order : prev);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedOrder]);

  const searchOrders = async (phoneNum: string) => {
    setLoading(true);
    setSearched(true);
    const { data } = await supabase.from("orders").select("*").eq("customer_phone", phoneNum).order("created_at", { ascending: false }).limit(10);
    setOrders((data as Order[]) || []);
    setLoading(false);
  };

  const viewOrder = async (order: Order) => {
    setSelectedOrder(order);
    const { data } = await supabase.from("order_items").select("*").eq("order_id", order.id);
    setItems((data as OrderItem[]) || []);
  };

  const getStatus = (s: string) => STATUSES.find((st) => st.id === s) || STATUSES[0];
  const getStepIndex = (s: string) => {
    const steps = ["pending", "confirmed", "preparing", "delivering", "completed"];
    return steps.indexOf(s);
  };
  const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: t.overlayBg, backdropFilter: "blur(12px)" }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto scrollbar-hide rounded-2xl"
        style={{ background: t.modalCardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadowLg, backdropFilter: t.isLight ? 'none' : 'blur(28px)' }}
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" style={{ color: t.accentPurple }} />
            <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>
              {selectedOrder ? "Acompanhar Pedido" : "Meus Pedidos"}
            </h2>
          </div>
          <button onClick={selectedOrder ? () => setSelectedOrder(null) : onClose}>
            <X className="w-5 h-5" style={{ color: t.textMuted }} />
          </button>
        </div>

        {!searched && (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: t.textMuted }}>Digite seu telefone para consultar seus pedidos:</p>
            <input className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
            <button onClick={() => searchOrders(phone)}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ background: t.btnBg, color: t.btnColor }}>
              Buscar Pedidos
            </button>
          </div>
        )}

        {searched && !selectedOrder && (
          <>
            {!loading && orders.length === 0 && (
              <div className="text-center py-6">
                <Package className="w-8 h-8 mx-auto mb-2" style={{ color: t.textSubtle }} />
                <p className="text-sm" style={{ color: t.textMuted }}>Nenhum pedido encontrado</p>
                <button onClick={() => { setSearched(false); setPhone(""); }} className="text-xs mt-2" style={{ color: t.accentPurple }}>
                  Tentar outro número
                </button>
              </div>
            )}
            {loading && (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: t.accentPurple, borderTopColor: "transparent" }} />
              </div>
            )}
            <div className="space-y-2">
              {orders.map((order) => {
                const status = getStatus(order.status);
                return (
                  <button key={order.id} onClick={() => viewOrder(order)}
                    className="w-full text-left p-4 flex items-center gap-3 transition-all rounded-xl"
                    style={{ background: t.cardBgSubtle, border: `1px solid ${t.borderSubtle}` }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${status.color.replace(")", " / 0.15)")}` }}>
                      <status.icon className="w-5 h-5" style={{ color: status.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: `${status.color.replace(")", " / 0.15)")}`, color: status.color }}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs" style={{ color: t.textMuted }}>{formatDate(order.created_at)}</span>
                        <span className="text-xs font-semibold" style={{ color: t.accentPurple }}>R$ {Number(order.total_price).toFixed(2)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {orders.length > 0 && (
              <button onClick={() => { setSearched(false); setPhone(""); }} className="text-xs w-full text-center py-2" style={{ color: t.accentPurple }}>
                Buscar outro número
              </button>
            )}
          </>
        )}

        {selectedOrder && (
          <div className="space-y-4">
            {selectedOrder.status !== "cancelled" && (
              <div className="relative px-2 pt-2">
                {/* Linha de fundo */}
                <div className="absolute top-[18px] left-[10%] right-[10%] h-[2px] rounded-full"
                  style={{ background: t.borderSubtle }} />
                {/* Linha de progresso animada */}
                <motion.div
                  className="absolute top-[18px] left-[10%] h-[2px] rounded-full"
                  style={{ background: "hsl(140 60% 45%)" }}
                  initial={{ width: "0%" }}
                  animate={{
                    width: `${Math.max(0, Math.min(100, (getStepIndex(selectedOrder.status) / 4) * 80))}%`,
                  }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
                <div className="relative flex items-start justify-between">
                  {["pending", "confirmed", "preparing", "delivering", "completed"].map((step, i) => {
                    const stepIdx = getStepIndex(selectedOrder.status);
                    const active = stepIdx >= i;
                    const current = stepIdx === i;
                    const st = getStatus(step);
                    return (
                      <div key={step} className="flex flex-col items-center gap-1.5 flex-1">
                        <motion.div
                          className="w-9 h-9 rounded-full flex items-center justify-center transition-all relative z-10"
                          style={{
                            background: active ? st.color : t.cardBgSubtle,
                            border: `2px solid ${active ? st.color : t.borderSubtle}`,
                            boxShadow: current ? `0 0 0 4px ${st.color.replace(")", " / 0.2)")}` : "none",
                          }}
                          animate={current ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                          transition={current ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
                        >
                          <st.icon className="w-4 h-4" style={{ color: active ? "white" : t.textSubtle }} />
                        </motion.div>
                        <span className="text-[8px] font-semibold text-center leading-tight px-0.5"
                          style={{ color: active ? st.color : t.textSubtle }}>
                          {st.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedOrder.status === "cancelled" && (
              <div className="p-4 rounded-xl text-center" style={{ background: "hsl(0 60% 50% / 0.1)", border: "1px solid hsl(0 60% 50% / 0.2)" }}>
                <XCircle className="w-6 h-6 mx-auto mb-1" style={{ color: "hsl(0 60% 60%)" }} />
                <p className="text-sm font-semibold" style={{ color: "hsl(0 60% 60%)" }}>Pedido Cancelado</p>
              </div>
            )}

            <div className="p-3 rounded-xl" style={{ background: t.cardBgSubtle, border: `1px solid ${t.borderSubtle}` }}>
              <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold" style={{ color: t.textMuted }}>Itens</p>
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs py-1">
                  <span style={{ color: t.textSecondary }}>{item.quantity}x {item.product_title}</span>
                  <span className="font-semibold" style={{ color: t.textPrimary }}>R$ {(item.product_price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="pt-2 mt-2 flex items-center justify-between text-sm font-bold" style={{ borderTop: `1px solid ${t.borderSubtle}` }}>
                <span style={{ color: t.textPrimary }}>Total</span>
                <span style={{ color: t.accentPurple }}>R$ {Number(selectedOrder.total_price).toFixed(2)}</span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-[10px]" style={{ color: t.textMuted }}>O status atualiza automaticamente em tempo real.</p>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default OrderTracker;
