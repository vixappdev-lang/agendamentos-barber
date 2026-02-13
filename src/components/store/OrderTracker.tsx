import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package, Clock, CheckCircle, Truck, Store, ChefHat, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
}

const OrderTracker = ({ onClose, customerPhone }: OrderTrackerProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState(customerPhone);
  const [searched, setSearched] = useState(!!customerPhone);

  useEffect(() => {
    if (customerPhone) searchOrders(customerPhone);
  }, [customerPhone]);

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
      style={{ background: "hsl(0 0% 0% / 0.75)", backdropFilter: "blur(12px)" }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="glass-card-strong w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto scrollbar-hide"
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" style={{ color: "hsl(245 60% 65%)" }} />
            <h2 className="text-base font-bold text-foreground">
              {selectedOrder ? "Acompanhar Pedido" : "Meus Pedidos"}
            </h2>
          </div>
          <button onClick={selectedOrder ? () => setSelectedOrder(null) : onClose}>
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {!searched && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Digite seu telefone para consultar seus pedidos:</p>
            <input className="glass-input text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
            <button onClick={() => searchOrders(phone)}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ background: "hsl(245 60% 55%)", color: "white" }}>
              Buscar Pedidos
            </button>
          </div>
        )}

        {searched && !selectedOrder && (
          <>
            {!loading && orders.length === 0 && (
              <div className="text-center py-6">
                <Package className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum pedido encontrado</p>
                <button onClick={() => { setSearched(false); setPhone(""); }} className="text-xs mt-2" style={{ color: "hsl(245 60% 70%)" }}>
                  Tentar outro número
                </button>
              </div>
            )}
            {loading && (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "hsl(245 60% 55%)", borderTopColor: "transparent" }} />
              </div>
            )}
            <div className="space-y-2">
              {orders.map((order) => {
                const status = getStatus(order.status);
                return (
                  <button key={order.id} onClick={() => viewOrder(order)}
                    className="w-full text-left glass-card p-4 flex items-center gap-3 transition-all">
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
                        <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
                        <span className="text-xs font-semibold" style={{ color: "hsl(245 60% 70%)" }}>R$ {Number(order.total_price).toFixed(2)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {orders.length > 0 && (
              <button onClick={() => { setSearched(false); setPhone(""); }} className="text-xs w-full text-center py-2" style={{ color: "hsl(245 60% 70%)" }}>
                Buscar outro número
              </button>
            )}
          </>
        )}

        {selectedOrder && (
          <div className="space-y-4">
            {/* Progress steps */}
            {selectedOrder.status !== "cancelled" && (
              <div className="flex items-center justify-between px-2">
                {["pending", "confirmed", "preparing", "delivering", "completed"].map((step, i) => {
                  const active = getStepIndex(selectedOrder.status) >= i;
                  const st = getStatus(step);
                  return (
                    <div key={step} className="flex flex-col items-center gap-1 flex-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                        style={{ background: active ? `${st.color.replace(")", " / 0.2)")}` : "hsl(0 0% 100% / 0.05)" }}>
                        <st.icon className="w-4 h-4" style={{ color: active ? st.color : "hsl(0 0% 30%)" }} />
                      </div>
                      <span className="text-[8px] font-semibold text-center" style={{ color: active ? st.color : "hsl(0 0% 30%)" }}>
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedOrder.status === "cancelled" && (
              <div className="p-4 rounded-xl text-center" style={{ background: "hsl(0 60% 50% / 0.1)", border: "1px solid hsl(0 60% 50% / 0.2)" }}>
                <XCircle className="w-6 h-6 mx-auto mb-1" style={{ color: "hsl(0 60% 60%)" }} />
                <p className="text-sm font-semibold" style={{ color: "hsl(0 60% 60%)" }}>Pedido Cancelado</p>
              </div>
            )}

            {/* Items */}
            <div className="p-3 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Itens</p>
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs py-1">
                  <span className="text-foreground/80">{item.quantity}x {item.product_title}</span>
                  <span className="text-foreground font-semibold">R$ {(item.product_price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="pt-2 mt-2 flex items-center justify-between text-sm font-bold" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.06)" }}>
                <span>Total</span>
                <span style={{ color: "hsl(245 60% 70%)" }}>R$ {Number(selectedOrder.total_price).toFixed(2)}</span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">O status atualiza automaticamente em tempo real.</p>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default OrderTracker;
