import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, ShoppingBag, Trash2, ArrowRight, Package } from "lucide-react";
import { useThemeColors } from "@/hooks/useThemeColors";
import type { CartItem } from "@/hooks/useCart";

interface Props {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  count: number;
  updateQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  onCheckout: () => void;
  isLogged: boolean;
}

const CartDrawer = ({ open, onClose, items, total, count, updateQty, remove, clear, onCheckout, isLogged }: Props) => {
  const t = useThemeColors();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70]"
            style={{ background: t.isLight ? "hsl(0 0% 0% / 0.4)" : "hsl(0 0% 0% / 0.7)", backdropFilter: "blur(10px)" }}
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="fixed top-0 right-0 bottom-0 z-[71] w-full sm:max-w-md flex flex-col"
            style={{
              background: t.isLight ? "hsl(0 0% 100% / 0.98)" : "hsl(220 22% 7% / 0.98)",
              borderLeft: `1px solid ${t.border}`,
              backdropFilter: "blur(24px)",
              boxShadow: "-12px 0 40px hsl(0 0% 0% / 0.3)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: t.cardBgSubtle }}>
                  <ShoppingBag className="w-4 h-4" style={{ color: t.textLink }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: t.textPrimary }}>Seu carrinho</p>
                  <p className="text-[10px] uppercase tracking-wider opacity-60" style={{ color: t.textMuted }}>
                    {count} {count === 1 ? "item" : "itens"}
                    {isLogged && " · sincronizado"}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:opacity-70" aria-label="Fechar">
                <X className="w-5 h-5" style={{ color: t.textMuted }} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{ background: t.cardBgSubtle }}>
                    <Package className="w-7 h-7 opacity-50" style={{ color: t.textMuted }} />
                  </div>
                  <p className="text-sm font-bold mb-1" style={{ color: t.textPrimary }}>Carrinho vazio</p>
                  <p className="text-xs opacity-60" style={{ color: t.textSecondary }}>Adicione produtos para continuar.</p>
                </div>
              ) : (
                items.map((it) => (
                  <motion.div
                    key={it.id}
                    layout
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: t.cardBgSubtle, border: `1px solid ${t.borderSubtle}` }}
                  >
                    <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0" style={{ background: t.cardBg }}>
                      {it.image_url ? (
                        <img src={it.image_url} alt={it.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5" style={{ color: t.textSubtle }} /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: t.textPrimary }}>{it.title}</p>
                      <p className="text-sm font-black mt-0.5" style={{ color: t.textPrimary }}>
                        R$ {(it.price * it.quantity).toFixed(2).replace(".", ",")}
                      </p>
                      <div className="flex items-center gap-1 mt-1.5 rounded-lg w-fit p-0.5" style={{ background: t.cardBg, border: `1px solid ${t.borderSubtle}` }}>
                        <button onClick={() => updateQty(it.id, it.quantity - 1)}
                          className="w-6 h-6 rounded-md flex items-center justify-center hover:opacity-70" style={{ color: t.textPrimary }}>
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center text-[11px] font-bold" style={{ color: t.textPrimary }}>{it.quantity}</span>
                        <button onClick={() => updateQty(it.id, it.quantity + 1)}
                          className="w-6 h-6 rounded-md flex items-center justify-center hover:opacity-70" style={{ color: t.textPrimary }}>
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <button onClick={() => remove(it.id)} className="p-2 rounded-lg shrink-0 self-start"
                      style={{ background: "hsl(0 60% 50% / 0.1)" }} aria-label="Remover">
                      <Trash2 className="w-3.5 h-3.5" style={{ color: "hsl(0 60% 60%)" }} />
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="px-5 py-4 space-y-3" style={{ borderTop: `1px solid ${t.borderSubtle}`, background: t.cardBgSubtle }}>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider opacity-60" style={{ color: t.textMuted }}>Total</p>
                    <p className="text-2xl font-black tracking-tight" style={{ color: t.textPrimary }}>
                      R$ {total.toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                  <button onClick={clear} className="text-[10px] uppercase tracking-wider font-semibold opacity-60 hover:opacity-100"
                    style={{ color: t.textMuted }}>
                    Limpar
                  </button>
                </div>
                <button onClick={onCheckout}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all hover:translate-y-[-1px] active:scale-[0.99]"
                  style={{ background: t.btnBg, color: t.btnColor, boxShadow: "0 12px 32px hsl(0 0% 0% / 0.25)" }}>
                  Finalizar pedido <ArrowRight className="w-4 h-4" />
                </button>
                {!isLogged && (
                  <p className="text-[10px] text-center opacity-60" style={{ color: t.textMuted }}>
                    💡 Faça login para salvar seu carrinho em qualquer dispositivo.
                  </p>
                )}
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
