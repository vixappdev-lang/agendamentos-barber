import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, ShoppingBag, Check, Package, Tag, Info, Star } from "lucide-react";
import { useThemeColors } from "@/hooks/useThemeColors";
import { supabase } from "@/integrations/supabase/client";

export interface DetailedProduct {
  id: string;
  title: string;
  description: string | null;
  long_description?: string | null;
  price: number;
  image_url: string | null;
  brand?: string | null;
  weight?: string | null;
  stock?: number | null;
  highlights?: string[] | null;
  gallery?: string[] | null;
}

interface Props {
  product: DetailedProduct;
  onClose: () => void;
  onAdd: (qty: number) => void;
}

interface ReviewRow {
  id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

const ProductDetailModal = ({ product, onClose, onAdd }: Props) => {
  const t = useThemeColors();
  const [qty, setQty] = useState(1);
  const images = [product.image_url, ...(product.gallery || [])].filter(Boolean) as string[];
  const [activeImg, setActiveImg] = useState(images[0] || null);
  const inStock = product.stock == null || product.stock > 0;

  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  useEffect(() => {
    supabase
      .from("product_reviews")
      .select("id, customer_name, rating, comment, created_at")
      .eq("product_id", product.id)
      .eq("status", "approved")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setReviews((data as ReviewRow[]) || []));
  }, [product.id]);

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const handleAdd = () => {
    onAdd(qty);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: t.isLight ? "hsl(0 0% 0% / 0.45)" : "hsl(0 0% 0% / 0.78)", backdropFilter: "blur(18px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-hide rounded-t-3xl sm:rounded-3xl"
        style={{
          background: t.isLight ? "hsl(0 0% 100% / 0.98)" : "hsl(220 22% 7% / 0.97)",
          border: `1px solid ${t.isLight ? "hsl(220 12% 88%)" : "hsl(0 0% 100% / 0.1)"}`,
          boxShadow: t.isLight ? "0 24px 60px hsl(220 20% 10% / 0.25)" : "0 24px 60px hsl(0 0% 0% / 0.6)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 sm:px-5"
          style={{ background: t.isLight ? "hsl(0 0% 100% / 0.92)" : "hsl(220 22% 7% / 0.92)", borderBottom: `1px solid ${t.borderSubtle}`, backdropFilter: "blur(16px)" }}>
          <div className="flex items-center gap-2 min-w-0">
            <Info className="w-4 h-4 shrink-0" style={{ color: t.textLink }} />
            <span className="text-xs font-semibold uppercase tracking-wider truncate" style={{ color: t.textMuted }}>Detalhes do produto</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" aria-label="Fechar">
            <X className="w-5 h-5" style={{ color: t.textMuted }} />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Imagem principal + thumbs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative w-full sm:w-1/2 aspect-square rounded-2xl overflow-hidden" style={{ background: t.cardBgSubtle }}>
              {activeImg ? (
                <img src={activeImg} alt={product.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Package className="w-10 h-10" style={{ color: t.textSubtle }} /></div>
              )}
              {!inStock && (
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: "hsl(0 60% 50% / 0.9)", color: "white" }}>Esgotado</div>
              )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col">
              {product.brand && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: t.textLink }}>
                  <Tag className="w-3 h-3" /> {product.brand}
                </span>
              )}
              <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight" style={{ color: t.textPrimary }}>
                {product.title}
              </h2>
              {product.weight && (
                <p className="text-xs mt-1 opacity-60" style={{ color: t.textSecondary }}>{product.weight}</p>
              )}
              {reviews.length > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className="w-3.5 h-3.5"
                        style={{
                          color: i <= Math.round(avgRating) ? "hsl(45 95% 60%)" : t.textSubtle,
                          fill: i <= Math.round(avgRating) ? "hsl(45 95% 60%)" : "transparent",
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold" style={{ color: t.textSecondary }}>
                    {avgRating.toFixed(1)} <span className="opacity-60">({reviews.length})</span>
                  </span>
                </div>
              )}
              {product.description && (
                <p className="text-sm mt-2 leading-relaxed" style={{ color: t.textSecondary }}>{product.description}</p>
              )}
              <div className="mt-auto pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60" style={{ color: t.textMuted }}>Preço</p>
                <p className="text-3xl font-black tracking-tight" style={{ color: t.textPrimary }}>
                  R$ {Number(product.price).toFixed(2).replace(".", ",")}
                </p>
              </div>
            </div>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
              {images.map((src) => (
                <button key={src} onClick={() => setActiveImg(src)}
                  className="w-14 h-14 rounded-xl overflow-hidden shrink-0 transition-all"
                  style={{ border: `2px solid ${activeImg === src ? t.textPrimary : t.borderSubtle}`, opacity: activeImg === src ? 1 : 0.6 }}>
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Highlights */}
          {product.highlights && product.highlights.length > 0 && (
            <div className="rounded-2xl p-3.5" style={{ background: t.cardBgSubtle, border: `1px solid ${t.borderSubtle}` }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: t.textMuted }}>Destaques</p>
              <ul className="space-y-1.5">
                {product.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: t.textSecondary }}>
                    <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: t.textLink }} />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Long description */}
          {product.long_description && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>Descrição completa</p>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: t.textSecondary }}>
                {product.long_description}
              </p>
            </div>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: t.textMuted }}>
                Avaliações ({reviews.length})
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide pr-1">
                {reviews.map((r) => (
                  <div key={r.id} className="rounded-xl p-3" style={{ background: t.cardBgSubtle, border: `1px solid ${t.borderSubtle}` }}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-semibold truncate" style={{ color: t.textPrimary }}>{r.customer_name}</p>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} className="w-3 h-3" style={{
                            color: i <= r.rating ? "hsl(45 95% 60%)" : t.textSubtle,
                            fill: i <= r.rating ? "hsl(45 95% 60%)" : "transparent",
                          }} />
                        ))}
                      </div>
                    </div>
                    {r.comment && (
                      <p className="text-xs leading-relaxed" style={{ color: t.textSecondary }}>"{r.comment}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quantidade + add */}
          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: t.cardBgSubtle, border: `1px solid ${t.borderSubtle}` }}>
              <button onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
                style={{ color: t.textPrimary }}>
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center text-sm font-bold" style={{ color: t.textPrimary }}>{qty}</span>
              <button onClick={() => setQty(qty + 1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: t.textPrimary }}>
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <button onClick={handleAdd} disabled={!inStock}
              className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ background: t.btnBg, color: t.btnColor }}>
              <ShoppingBag className="w-4 h-4" />
              {inStock ? `Adicionar — R$ ${(Number(product.price) * qty).toFixed(2).replace(".", ",")}` : "Indisponível"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProductDetailModal;
