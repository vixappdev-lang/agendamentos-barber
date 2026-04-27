import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Navigation, ExternalLink } from "lucide-react";
import { useThemeColors } from "@/hooks/useThemeColors";

interface DirectionsModalSimpleProps {
  open: boolean;
  onClose: () => void;
  address: string;
  businessName?: string;
}

const DirectionsModalSimple = ({ open, onClose, address, businessName }: DirectionsModalSimpleProps) => {
  const t = useThemeColors();

  const openInMaps = () => {
    const encoded = encodeURIComponent(address);
    const ua = navigator.userAgent || navigator.vendor;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const url = isIOS
      ? `maps://?q=${encoded}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
    // Fallback to https if iOS scheme blocked
    if (isIOS) {
      const fallback = `https://maps.apple.com/?q=${encoded}`;
      window.location.href = url;
      setTimeout(() => { window.open(fallback, "_blank"); }, 400);
    } else {
      window.open(url, "_blank");
    }
  };

  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;

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
            className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
            style={{
              background: t.modalCardBg,
              border: `1px solid ${t.border}`,
              boxShadow: "0 8px 32px hsl(0 0% 0% / 0.4)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5" style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: t.cardBgSubtle }}>
                  <MapPin className="w-4 h-4" style={{ color: t.textLink }} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold truncate" style={{ color: t.textPrimary }}>Como chegar</h3>
                  <p className="text-[11px] truncate" style={{ color: t.textMuted }}>{businessName || "Barbearia"}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl shrink-0" style={{ background: t.cardBgSubtle }}>
                <X className="w-4 h-4" style={{ color: t.textMuted }} />
              </button>
            </div>

            {/* Map */}
            <div className="relative w-full aspect-[4/3] sm:aspect-video" style={{ background: t.cardBgSubtle }}>
              <iframe
                src={mapSrc}
                className="absolute inset-0 w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                title="Mapa da localização"
              />
            </div>

            {/* Address + Actions */}
            <div className="p-4 sm:p-5 space-y-3">
              <div className="p-3 rounded-xl" style={{ background: t.cardBgSubtle, border: `1px solid ${t.borderSubtle}` }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>Endereço</p>
                <p className="text-xs leading-relaxed" style={{ color: t.textPrimary }}>{address}</p>
              </div>

              <button
                onClick={openInMaps}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all hover:translate-y-[-1px] active:scale-[0.98]"
                style={{ background: t.btnBg, color: t.btnColor, boxShadow: t.cardShadow }}
              >
                <Navigation className="w-4 h-4" />
                Abrir GPS
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </button>

              <p className="text-[10px] text-center" style={{ color: t.textMuted }}>
                Abre no Google Maps (Android/PC) ou Apple Maps (iPhone)
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DirectionsModalSimple;
