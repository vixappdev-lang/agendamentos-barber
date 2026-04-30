import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, ArrowRight, Scissors, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { useThemeColors } from "@/hooks/useThemeColors";
import { findStockImage } from "@/data/stockImages";

interface DBService {
  id: string;
  title: string;
  subtitle: string | null;
  price: number;
  duration: string;
  image_url: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  services: DBService[];
  onPick: (s: DBService) => void;
  selBg: string;
  selColor: string;
}

const AllServicesModal = ({ open, onClose, services, onPick, selBg, selColor }: Props) => {
  const t = useThemeColors();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.subtitle || "").toLowerCase().includes(q)
    );
  }, [search, services]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4"
          style={{ background: t.overlayBg, backdropFilter: "blur(12px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-2xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden"
            style={{
              background: t.modalCardBg,
              backdropFilter: "blur(28px) saturate(140%)",
              WebkitBackdropFilter: "blur(28px) saturate(140%)",
              border: `1px solid ${t.border}`,
              boxShadow: "0 8px 40px hsl(0 0% 0% / 0.4)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 sm:p-5 shrink-0"
              style={{ borderBottom: `1px solid ${t.borderSubtle}` }}
            >
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold truncate" style={{ color: t.textPrimary }}>
                  Todos os serviços
                </h3>
                <p className="text-[11px]" style={{ color: t.textMuted }}>
                  {services.length} disponíveis
                </p>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl shrink-0" style={{ background: t.cardBgSubtle }}>
                <X className="w-4 h-4" style={{ color: t.textMuted }} />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 sm:px-5 pt-4">
              <div
                className="flex items-center gap-3 px-4 h-11 rounded-2xl"
                style={{
                  background: t.isLight ? "hsl(220 14% 96%)" : "hsl(0 0% 100% / 0.04)",
                  border: `1px solid ${t.borderSubtle}`,
                }}
              >
                <Search className="w-4 h-4 opacity-50" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar serviço…"
                  className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-40"
                  style={{ color: t.textPrimary }}
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 scrollbar-hide">
              {filtered.length === 0 && (
                <p className="text-sm text-center py-12 opacity-60" style={{ color: t.textMuted }}>
                  Nenhum serviço encontrado.
                </p>
              )}
              {filtered.map((s) => {
                const stock = findStockImage(s.title)?.src || null;
                const imgSrc = s.image_url || stock;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      onPick(s);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 sm:gap-4 p-3 rounded-2xl text-left transition-all hover:translate-y-[-1px] group"
                    style={{
                      background: t.cardBg,
                      border: `1px solid ${t.borderSubtle}`,
                    }}
                  >
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={s.title}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover flex-shrink-0"
                        decoding="async"
                      />
                    ) : (
                      <div
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: t.cardBgSubtle }}
                      >
                        <Scissors className="w-6 h-6 opacity-50" style={{ color: t.textLink }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm sm:text-[15px] leading-tight truncate" style={{ color: t.textPrimary }}>
                        {s.title}
                      </h4>
                      {s.subtitle && (
                        <p className="text-xs opacity-60 mt-1 line-clamp-2 leading-snug" style={{ color: t.textSecondary }}>
                          {s.subtitle}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="inline-flex items-center gap-1 opacity-60" style={{ color: t.textMuted }}>
                          <Clock className="w-3 h-3" /> {s.duration}
                        </span>
                        <span className="font-bold text-sm" style={{ color: t.textPrimary }}>
                          R$ {s.price}
                        </span>
                      </div>
                    </div>
                    <span
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-transform group-hover:translate-x-0.5 shrink-0"
                      style={{ background: selBg, color: selColor }}
                    >
                      Agendar <ArrowRight className="w-3 h-3" />
                    </span>
                    <ArrowRight
                      className="sm:hidden w-5 h-5 opacity-30 shrink-0"
                      style={{ color: t.textMuted }}
                    />
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AllServicesModal;
