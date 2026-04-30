import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Search, Trash2, Eye, EyeOff, Loader2, MessageSquare, Package } from "lucide-react";
import { toast } from "sonner";

interface ProductReview {
  id: string;
  product_id: string;
  order_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  rating: number;
  comment: string | null;
  status: string;
  is_public: boolean;
  created_at: string;
  product_title?: string;
}

const Stars = ({ n, size = 14 }: { n: number; size?: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className="shrink-0"
        style={{
          width: size,
          height: size,
          color: i <= n ? "hsl(45 95% 60%)" : "hsl(0 0% 25%)",
          fill: i <= n ? "currentColor" : "transparent",
        }}
      />
    ))}
  </div>
);

const ProductReviews = () => {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [products, setProducts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");

  const fetchData = async () => {
    setLoading(true);
    const [{ data: revData }, { data: prodData }] = await Promise.all([
      supabase.from("product_reviews").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id, title"),
    ]);
    const map: Record<string, string> = {};
    (prodData || []).forEach((p: any) => { map[p.id] = p.title; });
    setProducts(map);
    setReviews((revData as ProductReview[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("product-reviews-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "product_reviews" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => {
    let list = reviews;
    if (filter !== "all") list = list.filter((r) => r.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.customer_name.toLowerCase().includes(q) ||
          (r.comment || "").toLowerCase().includes(q) ||
          (products[r.product_id] || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [reviews, search, filter, products]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const approved = reviews.filter((r) => r.status === "approved").length;
    const pending = reviews.filter((r) => r.status === "pending").length;
    const avg = total ? (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : "0.0";
    return { total, approved, pending, avg };
  }, [reviews]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("product_reviews").update({ status }).eq("id", id);
    if (error) return toast.error("Erro ao atualizar");
    toast.success(status === "approved" ? "Aprovada" : status === "rejected" ? "Rejeitada" : "Atualizada");
  };

  const togglePublic = async (id: string, current: boolean) => {
    const { error } = await supabase.from("product_reviews").update({ is_public: !current }).eq("id", id);
    if (error) return toast.error("Erro");
    toast.success(!current ? "Visível ao público" : "Oculta do público");
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta avaliação?")) return;
    const { error } = await supabase.from("product_reviews").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Excluída");
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Package className="w-5 h-5" style={{ color: "hsl(245 60% 65%)" }} />
        <h2 className="text-lg font-bold text-foreground">Avaliações de Produtos</h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "Total", value: stats.total, color: "hsl(245 60% 70%)" },
          { label: "Aprovadas", value: stats.approved, color: "hsl(140 60% 60%)" },
          { label: "Pendentes", value: stats.pending, color: "hsl(45 90% 60%)" },
          { label: "Média ⭐", value: stats.avg, color: "hsl(45 90% 60%)" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="glass-input !pl-9 text-sm"
            placeholder="Buscar por cliente, produto ou comentário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "approved", "pending", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-2 rounded-lg text-[11px] font-semibold transition-all capitalize"
              style={{
                background: filter === f ? "hsl(245 60% 55% / 0.15)" : "hsl(0 0% 100% / 0.04)",
                color: filter === f ? "hsl(245 60% 70%)" : "hsl(0 0% 50%)",
                border: `1px solid ${filter === f ? "hsl(245 60% 55% / 0.3)" : "hsl(0 0% 100% / 0.08)"}`,
              }}
            >
              {f === "all" ? "Todas" : f === "approved" ? "Aprovadas" : f === "pending" ? "Pendentes" : "Rejeitadas"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="glass-card p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma avaliação encontrada</p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-2">
            {filtered.map((r) => (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass-card p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground">{r.customer_name}</h3>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase"
                        style={{
                          background:
                            r.status === "approved" ? "hsl(140 60% 45% / 0.15)"
                            : r.status === "rejected" ? "hsl(0 60% 50% / 0.15)"
                            : "hsl(45 90% 55% / 0.15)",
                          color:
                            r.status === "approved" ? "hsl(140 70% 70%)"
                            : r.status === "rejected" ? "hsl(0 70% 70%)"
                            : "hsl(45 90% 65%)",
                        }}
                      >
                        {r.status}
                      </span>
                      {!r.is_public && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase" style={{ background: "hsl(0 0% 100% / 0.06)", color: "hsl(0 0% 60%)" }}>
                          oculta
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {products[r.product_id] || "Produto removido"} · {formatDate(r.created_at)}
                    </p>
                  </div>
                  <Stars n={r.rating} size={14} />
                </div>

                {r.comment && (
                  <p className="text-xs text-foreground/80 leading-relaxed p-2 rounded-lg" style={{ background: "hsl(0 0% 100% / 0.03)" }}>
                    "{r.comment}"
                  </p>
                )}

                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {r.status !== "approved" && (
                    <button onClick={() => updateStatus(r.id, "approved")} className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold" style={{ background: "hsl(140 60% 45% / 0.15)", color: "hsl(140 70% 70%)" }}>
                      Aprovar
                    </button>
                  )}
                  {r.status !== "rejected" && (
                    <button onClick={() => updateStatus(r.id, "rejected")} className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold" style={{ background: "hsl(0 60% 50% / 0.15)", color: "hsl(0 70% 70%)" }}>
                      Rejeitar
                    </button>
                  )}
                  <button onClick={() => togglePublic(r.id, r.is_public)} className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold inline-flex items-center gap-1" style={{ background: "hsl(0 0% 100% / 0.05)", color: "hsl(0 0% 60%)" }}>
                    {r.is_public ? <><EyeOff className="w-3 h-3" /> Ocultar</> : <><Eye className="w-3 h-3" /> Mostrar</>}
                  </button>
                  <button onClick={() => remove(r.id)} className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold inline-flex items-center gap-1 ml-auto" style={{ background: "hsl(0 60% 50% / 0.1)", color: "hsl(0 60% 65%)" }}>
                    <Trash2 className="w-3 h-3" /> Excluir
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default ProductReviews;
