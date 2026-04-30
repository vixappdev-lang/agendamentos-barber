import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Navigation, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useThemeColors } from "@/hooks/useThemeColors";

interface Props {
  open: boolean;
  onClose: () => void;
  address: string;
  businessName?: string;
}

interface Coords {
  lat: number;
  lon: number;
}

const MapLibreDirections = ({ open, onClose, address, businessName }: Props) => {
  const t = useThemeColors();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Geocode via Nominatim (gratuito, sem API key)
  useEffect(() => {
    if (!open || !address) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCoords(null);

    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`,
      { headers: { Accept: "application/json" } }
    )
      .then((r) => r.json())
      .then((data: Array<{ lat: string; lon: string }>) => {
        if (cancelled) return;
        if (!data?.length) {
          setError("Endereço não encontrado.");
          setLoading(false);
          return;
        }
        setCoords({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Falha ao carregar mapa.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, address]);

  // Inicializa o mapa
  useEffect(() => {
    if (!open || !coords || !containerRef.current) return;
    if (mapRef.current) return;

    const dark = !t.isLight;
    // Tile sources (raster, clean)
    const tilesUrl = dark
      ? "https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png"
      : "https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png";

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          carto: {
            type: "raster",
            tiles: ["a", "b", "c"].map((s) => tilesUrl.replace("{s}", s)),
            tileSize: 256,
            attribution: "© OpenStreetMap · © CARTO",
          },
        },
        layers: [{ id: "carto-tiles", type: "raster", source: "carto" }],
      },
      center: [coords.lon, coords.lat],
      zoom: 16,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

    // Marker custom
    const el = document.createElement("div");
    el.style.cssText = `
      width: 36px; height: 36px; border-radius: 50%;
      background: hsl(0 80% 55%); display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 14px hsl(0 0% 0% / 0.4), 0 0 0 4px hsl(0 0% 100% / 0.95);
      cursor: pointer;
    `;
    el.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>`;

    new maplibregl.Marker({ element: el })
      .setLngLat([coords.lon, coords.lat])
      .addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [open, coords, t.isLight]);

  // Cleanup quando fecha
  useEffect(() => {
    if (!open && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
  }, [open]);

  const openExternalGPS = () => {
    const encoded = encodeURIComponent(address);
    const ua = navigator.userAgent || navigator.vendor;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    if (coords) {
      // OSM directions (gratuito)
      const url = isIOS
        ? `maps://?daddr=${coords.lat},${coords.lon}`
        : `https://www.openstreetmap.org/directions?from=&to=${coords.lat}%2C${coords.lon}`;
      window.open(url, "_blank");
    } else {
      const url = `https://www.openstreetmap.org/search?query=${encoded}`;
      window.open(url, "_blank");
    }
  };

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
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
            style={{
              background: t.modalCardBg,
              backdropFilter: "blur(28px) saturate(140%)",
              WebkitBackdropFilter: "blur(28px) saturate(140%)",
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
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin opacity-50" />
                </div>
              )}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center text-center px-6">
                  <p className="text-xs opacity-60">{error}</p>
                </div>
              )}
              <div ref={containerRef} className="absolute inset-0 w-full h-full" />
            </div>

            {/* Address + Actions */}
            <div className="p-4 sm:p-5 space-y-3">
              <div className="p-3 rounded-xl" style={{ background: t.cardBgSubtle, border: `1px solid ${t.borderSubtle}` }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>Endereço</p>
                <p className="text-xs leading-relaxed" style={{ color: t.textPrimary }}>{address}</p>
              </div>

              <button
                onClick={openExternalGPS}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all hover:translate-y-[-1px] active:scale-[0.98]"
                style={{ background: t.btnBg, color: t.btnColor, boxShadow: t.cardShadow }}
              >
                <Navigation className="w-4 h-4" />
                Abrir rota
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </button>

              <p className="text-[10px] text-center" style={{ color: t.textMuted }}>
                Mapa via OpenStreetMap · Sem custo
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MapLibreDirections;
