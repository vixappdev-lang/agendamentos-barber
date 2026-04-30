import { motion } from "framer-motion";
import { ShoppingBag, Plus, Star } from "lucide-react";
import { useThemeColors } from "@/hooks/useThemeColors";

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    description: string;
    price: number;
    image_url: string | null;
  };
  onSelect: () => void;
  index: number;
  rating?: { avg: number; count: number };
}

const ProductCard = ({ product, onSelect, index, rating }: ProductCardProps) => {
  const t = useThemeColors();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
      className="cursor-pointer group flex flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
      style={{
        background: t.cardBg,
        border: `1px solid ${t.border}`,
        boxShadow: t.cardShadow,
      }}
      onClick={onSelect}
    >
      {/* Imagem — proporção fixa para uniformidade */}
      <div className="relative w-full aspect-square overflow-hidden" style={{ background: t.cardBgSubtle }}>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-8 h-8" style={{ color: t.textSubtle }} />
          </div>
        )}
      </div>

      {/* Conteúdo — altura padronizada */}
      <div className="flex flex-col flex-1 p-2.5 sm:p-3.5 gap-1">
        <h3
          className="text-[12px] sm:text-sm font-bold tracking-tight leading-tight line-clamp-2 min-h-[2.4em]"
          style={{ color: t.textPrimary }}
        >
          {product.title}
        </h3>
        {rating && rating.count > 0 && (
          <div className="flex items-center gap-1 -mt-0.5">
            <Star className="w-3 h-3" style={{ color: "hsl(45 95% 60%)", fill: "hsl(45 95% 60%)" }} />
            <span className="text-[10px] font-semibold" style={{ color: t.textSecondary }}>
              {rating.avg.toFixed(1)} <span className="opacity-50">({rating.count})</span>
            </span>
          </div>
        )}
        <p
          className="hidden sm:block text-[11px] leading-snug line-clamp-2 opacity-70"
          style={{ color: t.textSecondary }}
        >
          {product.description}
        </p>

        <div className="flex items-center justify-between gap-2 mt-auto pt-2">
          <span
            className="text-sm sm:text-base font-black tracking-tight whitespace-nowrap"
            style={{ color: t.textPrimary }}
          >
            R$ {Number(product.price).toFixed(2).replace(".", ",")}
          </span>
          <button
            className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg shrink-0 transition-all hover:scale-105 active:scale-95"
            style={{ background: t.btnBg, color: t.btnColor }}
            aria-label="Adicionar ao carrinho"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
