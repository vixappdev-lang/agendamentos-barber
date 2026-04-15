import { motion } from "framer-motion";
import { ShoppingBag, Plus } from "lucide-react";
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
}

const ProductCard = ({ product, onSelect, index }: ProductCardProps) => {
  const t = useThemeColors();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="cursor-pointer group overflow-hidden rounded-2xl transition-all duration-300 hover:translate-y-[-3px]"
      style={{
        background: t.cardBg,
        border: `1px solid ${t.border}`,
        boxShadow: t.cardShadow,
      }}
      onClick={onSelect}
    >
      <div className="relative w-full h-40 sm:h-48 overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: t.cardBgSubtle }}>
            <ShoppingBag className="w-10 h-10" style={{ color: t.textSubtle }} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: 'hsl(0 0% 0% / 0.6)', backdropFilter: 'blur(8px)', color: 'hsl(0 0% 90%)' }}>
          <ShoppingBag className="w-3 h-3" /> Produto
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-base sm:text-lg font-bold tracking-tight leading-snug" style={{ color: t.textPrimary }}>{product.title}</h3>
        <p className="text-xs sm:text-sm mt-0.5 leading-relaxed line-clamp-2" style={{ color: t.textSecondary }}>{product.description}</p>
        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${t.border}` }}>
          <span className="text-lg sm:text-xl font-bold" style={{ color: t.textPrimary }}>R$ {Number(product.price).toFixed(2)}</span>
          <button className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm whitespace-nowrap rounded-xl font-semibold transition-all duration-300 uppercase tracking-wider"
            style={{ background: t.btnBg, color: t.btnColor }}
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
