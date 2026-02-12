import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Navigation, Layers, Plus, Minus, Crosshair } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface DirectionsModalProps {
  onClose: () => void;
}

const MAP_STYLES = [
  { id: "dark", label: "Escuro", url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", emoji: "🌙" },
  { id: "voyager", label: "Moderno", url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", emoji: "🗺️" },
  { id: "satellite", label: "Satélite", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", emoji: "🛰️" },
];

const LABELS_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

const MARKER_HTML = `
  <div style="position:relative;width:44px;height:56px;">
    <div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);width:20px;height:6px;background:rgba(0,0,0,0.3);border-radius:50%;filter:blur(2px);"></div>
    <div style="position:absolute;inset:2px 2px auto 2px;width:40px;height:40px;background:hsl(245 60% 55% / 0.2);border-radius:50%;animation:marker-pulse 2s ease-out infinite;"></div>
    <svg viewBox="0 0 44 56" width="44" height="56" style="position:absolute;top:0;left:0;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.4));">
      <defs>
        <linearGradient id="dpin-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="hsl(245 65% 65%)" />
          <stop offset="100%" stop-color="hsl(245 55% 42%)" />
        </linearGradient>
      </defs>
      <path d="M22 2C11 2 2 11 2 22c0 14 20 32 20 32s20-18 20-32C42 11 33 2 22 2z" fill="url(#dpin-grad)" stroke="white" stroke-width="2.5"/>
      <circle cx="22" cy="20" r="8" fill="white" opacity="0.95"/>
      <circle cx="22" cy="20" r="4" fill="hsl(245 60% 55%)"/>
    </svg>
  </div>
  <style>
    @keyframes marker-pulse{0%{transform:scale(1);opacity:0.6}50%{transform:scale(1.8);opacity:0}100%{transform:scale(2.2);opacity:0}}
  </style>
`;

const DirectionsModal = ({ onClose }: DirectionsModalProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(-23.5505);
  const [lng, setLng] = useState(-46.6333);
  const [loading, setLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState("dark");
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(17);

  useEffect(() => {
    const fetchLocation = async () => {
      const { data } = await supabase.from("business_settings").select("key, value").in("key", ["address", "location_lat", "location_lng"]);
      if (data) {
        for (const r of data) {
          if (r.key === "address") setAddress(r.value || "");
          if (r.key === "location_lat" && r.value) setLat(parseFloat(r.value));
          if (r.key === "location_lng" && r.value) setLng(parseFloat(r.value));
        }
      }
      setLoading(false);
    };
    fetchLocation();
  }, []);

  useEffect(() => {
    if (loading || !mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 17,
      zoomControl: false,
      attributionControl: false,
      minZoom: 3,
      maxZoom: 19,
    });

    const tile = L.tileLayer(MAP_STYLES[0].url, { maxZoom: 19, attribution: '' }).addTo(map);
    tileLayerRef.current = tile;
    labelsLayerRef.current = null;

    const customIcon = L.divIcon({
      html: MARKER_HTML,
      iconSize: [44, 56],
      iconAnchor: [22, 56],
      className: "",
    });

    L.marker([lat, lng], { icon: customIcon }).addTo(map);
    map.on("zoomend", () => setCurrentZoom(map.getZoom()));
    mapInstance.current = map;

    return () => { map.remove(); mapInstance.current = null; };
  }, [loading, lat, lng]);

  const switchMapStyle = (styleId: string) => {
    setMapStyle(styleId);
    setShowStylePicker(false);
    const style = MAP_STYLES.find(s => s.id === styleId);
    if (!style || !mapInstance.current) return;

    if (tileLayerRef.current) mapInstance.current.removeLayer(tileLayerRef.current);
    if (labelsLayerRef.current) mapInstance.current.removeLayer(labelsLayerRef.current);

    const newTile = L.tileLayer(style.url, { maxZoom: 19, attribution: '' }).addTo(mapInstance.current);
    tileLayerRef.current = newTile;

    if (styleId === "satellite") {
      const newLabels = L.tileLayer(LABELS_URL, { maxZoom: 19, attribution: '' }).addTo(mapInstance.current);
      labelsLayerRef.current = newLabels;
    } else {
      labelsLayerRef.current = null;
    }
  };

  const handleZoom = (delta: number) => mapInstance.current?.zoomIn(delta);
  const handleRecenter = () => mapInstance.current?.setView([lat, lng], 17, { animate: true });

  const openGPS = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'hsl(230 20% 5% / 0.92)', backdropFilter: 'blur(16px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="glass-card-strong w-full sm:max-w-lg overflow-hidden rounded-t-2xl sm:rounded-2xl"
        style={{ border: '1px solid hsl(0 0% 100% / 0.08)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid hsl(0 0% 100% / 0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'hsl(245 60% 55% / 0.15)' }}>
              <MapPin className="w-4 h-4" style={{ color: 'hsl(245 60% 65%)' }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Como Chegar</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Navegue até nosso local</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors hover:bg-white/10" style={{ background: 'hsl(0 0% 100% / 0.05)' }}>
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Address */}
        {address && (
          <div className="px-4 pt-3">
            <div className="glass-card p-3 flex items-start gap-2.5 rounded-xl" style={{ border: '1px solid hsl(0 0% 100% / 0.06)' }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'hsl(245 60% 55% / 0.15)' }}>
                <MapPin className="w-3 h-3" style={{ color: 'hsl(245 60% 65%)' }} />
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{address}</p>
            </div>
          </div>
        )}

        {/* Map */}
        <div className="p-4">
          <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid hsl(0 0% 100% / 0.06)' }}>
            <div ref={mapRef} className="w-full h-[300px]" style={{ background: 'hsl(230 18% 8%)' }} />

            {/* Map Controls */}
            <div className="absolute top-3 right-3 flex flex-col gap-2 z-[1000]">
              {/* Style Toggle */}
              <div className="relative">
                <button
                  onClick={() => setShowStylePicker(!showStylePicker)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                  style={{ background: 'hsl(230 15% 12% / 0.9)', backdropFilter: 'blur(8px)', border: '1px solid hsl(0 0% 100% / 0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
                  <Layers className="w-4 h-4 text-foreground" />
                </button>
                <AnimatePresence>
                  {showStylePicker && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, x: 10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9, x: 10 }}
                      className="absolute top-0 right-11 flex gap-1.5 p-1.5 rounded-xl"
                      style={{ background: 'hsl(230 15% 12% / 0.95)', backdropFilter: 'blur(12px)', border: '1px solid hsl(0 0% 100% / 0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                      {MAP_STYLES.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => switchMapStyle(s.id)}
                          className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all text-[10px] font-semibold whitespace-nowrap"
                          style={{
                            background: mapStyle === s.id ? 'hsl(245 60% 55% / 0.2)' : 'transparent',
                            color: mapStyle === s.id ? 'hsl(245 60% 70%)' : 'hsl(0 0% 60%)',
                            border: `1px solid ${mapStyle === s.id ? 'hsl(245 60% 55% / 0.3)' : 'transparent'}`,
                          }}>
                          {s.emoji}
                          <span>{s.label}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Zoom */}
              <button onClick={() => handleZoom(1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                style={{ background: 'hsl(230 15% 12% / 0.9)', backdropFilter: 'blur(8px)', border: '1px solid hsl(0 0% 100% / 0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
                <Plus className="w-4 h-4 text-foreground" />
              </button>
              <button onClick={() => handleZoom(-1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                style={{ background: 'hsl(230 15% 12% / 0.9)', backdropFilter: 'blur(8px)', border: '1px solid hsl(0 0% 100% / 0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
                <Minus className="w-4 h-4 text-foreground" />
              </button>
              <button onClick={handleRecenter}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                style={{ background: 'hsl(230 15% 12% / 0.9)', backdropFilter: 'blur(8px)', border: '1px solid hsl(0 0% 100% / 0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
                <Crosshair className="w-4 h-4 text-foreground" />
              </button>
            </div>

            {/* Zoom indicator */}
            <div className="absolute bottom-3 left-3 z-[1000] px-2.5 py-1 rounded-lg text-[10px] font-semibold text-foreground/70"
              style={{ background: 'hsl(230 15% 12% / 0.8)', backdropFilter: 'blur(8px)' }}>
              Zoom: {currentZoom}x
            </div>
          </div>
        </div>

        {/* GPS Button */}
        <div className="px-4 pb-4">
          <button
            onClick={openGPS}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, hsl(245 60% 55%), hsl(245 55% 45%))', color: 'white', boxShadow: '0 4px 24px hsl(245 60% 55% / 0.3)' }}>
            <Navigation className="w-4 h-4" /> Abrir no GPS
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DirectionsModal;
