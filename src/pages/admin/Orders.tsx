import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Search, ChevronLeft, ChevronRight, Trash2, Eye, X, Truck, Store, Clock, CheckCircle, XCircle, ChefHat } from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  delivery_mode: string;
  address: string | null;
  address_number: string | null;
  address_complement: string | null;
  neighborhood: string | null;
  city: string | null;
  notes: string | null;
  status: string;
  total_price: number;
  payment_method: string | null;
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

const ITEMS_PER_PAGE = 10;

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchOrders(); setupRealtime(); }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    setOrders((data as Order[]) || []);
    setLoading(false);
  };

  const setupRealtime = () => {
    const channel = supabase.channel("orders-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch = !search || o.customer_name.toLowerCase().includes(search.toLowerCase()) || o.customer_phone?.includes(search) || o.id.includes(search);
      const matchStatus = filterStatus === "all" || o.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [orders, search, filterStatus]);

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const updateStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) { toast.error("Erro ao atualizar"); return; }
    toast.success(`Status: ${STATUSES.find(s => s.id === status)?.label}`);
    if (selectedOrder?.id === orderId) setSelectedOrder({ ...selectedOrder, status });
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm("Excluir este pedido?")) return;
    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Pedido excluído");
    setSelectedOrder(null);
  };

  const viewOrder = async (order: Order) => {
    setSelectedOrder(order);
    const { data } = await supabase.from("order_items").select("*").eq("order_id", order.id);
    setOrderItems((data as OrderItem[]) || []);
  };

  const getStatusInfo = (status: string) => STATUSES.find(s => s.id === status) || STATUSES[0];

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5" style={{ color: "hsl(245 60% 65%)" }} />
          <h2 className="text-lg font-bold text-foreground">Pedidos</h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "hsl(245 60% 55% / 0.1)", color: "hsl(245 60% 70%)" }}>
            {orders.length}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input className="glass-input !pl-9 text-sm" placeholder="Buscar por nome, telefone ou ID..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          <button onClick={() => { setFilterStatus("all"); setPage(1); }}
            className="shrink-0 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all"
            style={{ background: filterStatus === "all" ? "hsl(245 60% 55% / 0.15)" : "hsl(0 0% 100% / 0.04)", color: filterStatus === "all" ? "hsl(245 60% 70%)" : "hsl(0 0% 50%)", border: `1px solid ${filterStatus === "all" ? "hsl(245 60% 55% / 0.3)" : "hsl(0 0% 100% / 0.08)"}` }}>
            Todos
          </button>
          {STATUSES.map((s) => (
            <button key={s.id} onClick={() => { setFilterStatus(s.id); setPage(1); }}
              className="shrink-0 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all"
              style={{ background: filterStatus === s.id ? `${s.color} / 0.15)`.replace(")", "") : "hsl(0 0% 100% / 0.04)", color: filterStatus === s.id ? s.color : "hsl(0 0% 50%)", border: `1px solid ${filterStatus === s.id ? `${s.color} / 0.3)`.replace(")", "") : "hsl(0 0% 100% / 0.08)"}` }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="glass-card p-8 text-center">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: "hsl(245 60% 55%)", borderTopColor: "transparent" }} />
        </div>
      ) : paginatedOrders.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Package className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedOrders.map((order) => {
            const status = getStatusInfo(order.status);
            return (
              <motion.div key={order.id} layout className="glass-card p-4 flex items-center gap-3 cursor-pointer hover:border-accent/20 transition-all"
                onClick={() => viewOrder(order)}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${status.color.replace(")", " / 0.15)")}` }}>
                  <status.icon className="w-5 h-5" style={{ color: status.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground truncate">{order.customer_name}</h3>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0" style={{ background: `${status.color.replace(")", " / 0.15)")}`, color: status.color }}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
                    <span className="text-xs font-semibold" style={{ color: "hsl(245 60% 70%)" }}>R$ {Number(order.total_price).toFixed(2)}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      {order.delivery_mode === "delivery" ? <><Truck className="w-3 h-3" /> Entrega</> : <><Store className="w-3 h-3" /> Retirada</>}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); viewOrder(order); }} className="p-2 rounded-lg" style={{ background: "hsl(0 0% 100% / 0.05)" }}>
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteOrder(order.id); }} className="p-2 rounded-lg" style={{ background: "hsl(0 60% 50% / 0.1)" }}>
                    <Trash2 className="w-4 h-4" style={{ color: "hsl(0 60% 60%)" }} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-lg disabled:opacity-30 transition-all" style={{ background: "hsl(0 0% 100% / 0.05)" }}>
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 3), page + 2).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className="w-8 h-8 rounded-lg text-xs font-semibold transition-all"
              style={{ background: page === p ? "hsl(245 60% 55%)" : "hsl(0 0% 100% / 0.05)", color: page === p ? "white" : "hsl(0 0% 55%)" }}>
              {p}
            </button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-2 rounded-lg disabled:opacity-30 transition-all" style={{ background: "hsl(0 0% 100% / 0.05)" }}>
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
        </div>
      )}

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedOrder(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card-strong w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto scrollbar-hide"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">Detalhes do Pedido</h3>
                <button onClick={() => setSelectedOrder(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Cliente</p>
                  <p className="text-sm font-semibold text-foreground">{selectedOrder.customer_name}</p>
                  {selectedOrder.customer_phone && <p className="text-xs text-muted-foreground">{selectedOrder.customer_phone}</p>}
                  {selectedOrder.customer_email && <p className="text-xs text-muted-foreground">{selectedOrder.customer_email}</p>}
                </div>

                {selectedOrder.delivery_mode === "delivery" && selectedOrder.address && (
                  <div className="p-3 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Endereço de Entrega</p>
                    <p className="text-xs text-foreground">
                      {selectedOrder.address}, {selectedOrder.address_number} {selectedOrder.address_complement ? `- ${selectedOrder.address_complement}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">{selectedOrder.neighborhood} - {selectedOrder.city}</p>
                  </div>
                )}

                <div className="p-3 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Itens</p>
                  {orderItems.map((item) => (
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

                {selectedOrder.notes && (
                  <div className="p-3 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Observações</p>
                    <p className="text-xs text-foreground">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* Status changer */}
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Alterar Status</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {STATUSES.map((s) => (
                      <button key={s.id} onClick={() => updateStatus(selectedOrder.id, s.id)}
                        className="flex items-center justify-center gap-1 p-2 rounded-lg text-[10px] font-semibold transition-all"
                        style={{
                          background: selectedOrder.status === s.id ? `${s.color.replace(")", " / 0.2)")}` : "hsl(0 0% 100% / 0.04)",
                          color: selectedOrder.status === s.id ? s.color : "hsl(0 0% 50%)",
                          border: `1px solid ${selectedOrder.status === s.id ? `${s.color.replace(")", " / 0.4)")}` : "hsl(0 0% 100% / 0.08)"}`,
                        }}>
                        <s.icon className="w-3 h-3" />
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={() => deleteOrder(selectedOrder.id)}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{ background: "hsl(0 60% 50% / 0.1)", color: "hsl(0 60% 60%)", border: "1px solid hsl(0 60% 50% / 0.2)" }}>
                  <Trash2 className="w-3.5 h-3.5" /> Excluir Pedido
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Orders;
