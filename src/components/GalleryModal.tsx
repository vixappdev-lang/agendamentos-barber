import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

interface GalleryModalProps {
  open: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  accentColor?: string;
}

export default function GalleryModal({ open, onClose, images, initialIndex = 0, accentColor = "hsl(0 0% 100%)" }: GalleryModalProps) {
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);

  useEffect(() => {
    if (open) setZoomIndex(null);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        if (zoomIndex !== null) setZoomIndex(null);
        else onClose();
      }
      if (zoomIndex !== null) {
        if (e.key === "ArrowRight") setZoomIndex((i) => (i === null ? 0 : (i + 1) % images.length));
        if (e.key === "ArrowLeft") setZoomIndex((i) => (i === null ? 0 : (i - 1 + images.length) % images.length));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, zoomIndex, images.length, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex flex-col"
          style={{ background: "hsl(0 0% 0% / 0.96)", backdropFilter: "blur(24px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">Galeria completa</h3>
              <p className="text-[11px] text-white/50">{images.length} imagens · clique para ampliar</p>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 gallery-scroll">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 max-w-[1600px] mx-auto">
              {images.map((src, i) => (
                <motion.button
                  key={`${src}-${i}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(i * 0.03, 0.4) }}
                  onClick={() => setZoomIndex(i)}
                  className="relative rounded-xl overflow-hidden aspect-square group border border-white/10"
                >
                  <img src={src} alt={`Galeria ${i + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <ZoomIn className="w-6 h-6 text-white" />
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Lightbox zoom */}
          <AnimatePresence>
            {zoomIndex !== null && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex items-center justify-center p-4"
                style={{ background: "hsl(0 0% 0% / 0.95)" }}
                onClick={() => setZoomIndex(null)}
              >
                <button
                  className="absolute top-5 right-5 p-2.5 rounded-xl bg-white/10 hover:bg-white/20"
                  onClick={(e) => { e.stopPropagation(); setZoomIndex(null); }}
                  aria-label="Fechar zoom"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                <button
                  className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20"
                  onClick={(e) => { e.stopPropagation(); setZoomIndex((i) => (i === null ? 0 : (i - 1 + images.length) % images.length)); }}
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button
                  className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20"
                  onClick={(e) => { e.stopPropagation(); setZoomIndex((i) => (i === null ? 0 : (i + 1) % images.length)); }}
                  aria-label="Próxima"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
                <motion.img
                  key={zoomIndex}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  src={images[zoomIndex]}
                  alt=""
                  className="max-w-full max-h-[85vh] rounded-2xl object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs">
                  {zoomIndex + 1} / {images.length}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
