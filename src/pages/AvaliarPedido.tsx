import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Star, CheckCircle2, Loader2, Package } from "lucide-react";
import { toast } from "sonner";

interface OrderItem {
  id: string;
  product_id: string | null;
  product_title: string;
  product_price: number;
  quantity: number;
}

interface OrderInfo {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  reviewed: boolean;
  review_token: string | null;
}

interface ReviewState {
  rating: number;
  comment: string;
}

const AvaliarPedido = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [reviews, setReviews] = useState<Record<string, ReviewState>>({});
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: orderData } = await supabase
        .from("orders")
        .select("id, customer_name, customer_phone, reviewed, review_token")
        .eq("review_token", token)
        .maybeSingle();

      if (!orderData) {
        setLoading(false);
        return;
      }
      setOrder(orderData as OrderInfo);

      if (orderData.reviewed) {
        setDone(true);
        setLoading(false);
        return;
      }

      const { data: itemsData } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderData.id);

      const productItems = ((itemsData || []) as OrderItem[]).filter((i) => i.product_id);
      setItems(productItems);
      const initial: Record<string, ReviewState> = {};
      productItems.forEach((i) => {
        initial[i.id] = { rating: 0, comment: "" };
      });
      setReviews(initial);
      setLoading(false);
    })();
  }, [token]);

  const setRating = (itemId: string, rating: number) => {
    setReviews((r) => ({ ...r, [itemId]: { ...r[itemId], rating } }));
  };

  const setComment = (itemId: string, comment: string) => {
    setReviews((r) => ({ ...r, [itemId]: { ...r[itemId], comment } }));
  };

  const handleSubmit = async () => {
    if (!order) return;
    const toSubmit = items.filter((i) => reviews[i.id]?.rating > 0);
    if (toSubmit.length === 0) {
      toast.error("Selecione pelo menos uma avaliação com estrelas");
      return;
    }

    setSubmitting(true);
    const payload = toSubmit.map((i) => ({
      product_id: i.product_id,
      order_id: order.id,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      rating: reviews[i.id].rating,
      comment: reviews[i.id].comment.trim() || null,
    }));

    const { error } = await supabase.from("product_reviews").insert(payload);
    if (error) {
      toast.error("Erro ao enviar avaliação");
      setSubmitting(false);
      return;
    }

    await supabase.from("orders").update({ reviewed: true }).eq("id", order.id);
    setDone(true);
    setSubmitting(false);
    toast.success("Avaliação enviada! Muito obrigado 💚");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="glass-card p-8 max-w-sm text-center space-y-3">
          <Package className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <h1 className="text-lg font-bold text-foreground">Link inválido</h1>
          <p className="text-sm text-muted-foreground">
            Este link de avaliação não foi encontrado ou expirou.
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-2 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 max-w-sm text-center space-y-4"
        >
          <CheckCircle2 className="w-14 h-14 mx-auto" style={{ color: "hsl(140 60% 55%)" }} />
          <h1 className="text-xl font-bold text-foreground">Obrigado!</h1>
          <p className="text-sm text-muted-foreground">
            Sua avaliação foi registrada e ajuda muito nosso trabalho. 💚
          </p>
          <button
            onClick={() => navigate("/loja")}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground"
          >
            Ver loja
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-5">
        <header className="text-center space-y-2 pt-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl"
            style={{ background: "hsl(245 60% 55% / 0.15)" }}
          >
            <Star className="w-7 h-7" style={{ color: "hsl(245 60% 70%)" }} />
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground">Como foi sua experiência?</h1>
          <p className="text-sm text-muted-foreground">
            Olá <strong className="text-foreground">{order.customer_name}</strong>, avalie os produtos do seu pedido
          </p>
        </header>

        {items.length === 0 ? (
          <div className="glass-card p-6 text-center text-sm text-muted-foreground">
            Este pedido não contém produtos para avaliar.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => {
              const review = reviews[item.id] || { rating: 0, comment: "" };
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="glass-card p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {item.product_title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.quantity}x · R$ {Number(item.product_price).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 py-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(item.id, n)}
                        className="transition-transform active:scale-90"
                      >
                        <Star
                          className="w-8 h-8 transition-all"
                          style={{
                            fill: n <= review.rating ? "hsl(45 90% 60%)" : "transparent",
                            color: n <= review.rating ? "hsl(45 90% 60%)" : "hsl(0 0% 30%)",
                          }}
                        />
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={review.comment}
                    onChange={(e) => setComment(item.id, e.target.value)}
                    placeholder="Conte-nos mais (opcional)"
                    rows={2}
                    maxLength={1000}
                    className="glass-input resize-none text-sm"
                  />
                </motion.div>
              );
            })}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, hsl(245 60% 55%), hsl(265 60% 55%))",
                color: "white",
              }}
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
                </span>
              ) : (
                "Enviar avaliação"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvaliarPedido;
