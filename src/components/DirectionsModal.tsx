import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Navigation, Layers, Plus, Minus, Crosshair, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface DirectionsModalProps {
  onClose: () => void;
}

const MAP_STYLES = [
  { id: "dark", label: "Escuro", url: "https://tiles.openfreemap.org/styles/dark", emoji: "🌙" },
  { id: "liberty", label: "3D", url: "https://tiles.openfreemap.org/styles/liberty", emoji: "🏙️" },
  { id: "positron", label: "Claro", url: "https://tiles.openfreemap.org/styles/positron", emoji: "☀️" },
];

const DirectionsModal = ({ onClose }: DirectionsModalProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(-23.5505);
  const [lng, setLng] = useState(-46.6333);
  const [loading, setLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState("dark");
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(16);

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

  const createMarker = (map: maplibregl.Map, latitude: number, longitude: number) => {
    // Custom marker element
    const el = document.createElement("div");
    el.innerHTML = `
      <div style="position:relative;width:48px;height:60px;cursor:pointer;">
        <div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);width:22px;height:7px;background:rgba(139,92,246,0.4);border-radius:50%;filter:blur(3px);"></div>
        <div style="position:absolute;top:4px;left:4px;width:40px;height:40px;background:rgba(139,92,246,0.2);border-radius:50%;animation:ml-pulse 2s ease-out infinite;"></div>
        <svg viewBox="0 0 48 60" width="48" height="60" style="position:absolute;top:0;left:0;filter:drop-shadow(0 6px 12px rgba(139,92,246,0.5));">
          <defs>
            <linearGradient id="ml-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#a78bfa"/>
              <stop offset="100%" stop-color="#7c3aed"/>
            </linearGradient>
          </defs>
          <path d="M24 2C12 2 2 12 2 24c0 15 22 34 22 34s22-19 22-34C46 12 36 2 24 2z" fill="url(#ml-grad)" stroke="white" stroke-width="2.5"/>
          <circle cx="24" cy="22" r="9" fill="white" opacity="0.95"/>
          <circle cx="24" cy="22" r="4.5" fill="#8b5cf6"/>
        </svg>
      </div>
      <style>
        @keyframes ml-pulse{0%{transform:scale(1);opacity:0.7}50%{transform:scale(2);opacity:0}100%{transform:scale(2.5);opacity:0}}
      </style>
    `;

    const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
      .setLngLat([longitude, latitude])
      .addTo(map);

    return marker;
  };

  const add3DBuildings = (map: maplibregl.Map) => {
    const layers = map.getStyle().layers;
    if (!layers) return;

    // Find the first symbol/label layer to insert buildings below it
    let labelLayerId: string | undefined;
    for (const layer of layers) {
      if (layer.type === "symbol" && (layer as any).layout?.["text-field"]) {
        labelLayerId = layer.id;
        break;
      }
    }

    // Check if source exists
    const sources = map.getStyle().sources;
    const vectorSource = Object.keys(sources).find(key => {
      const src = sources[key];
      return src.type === "vector";
    });

    if (!vectorSource) return;

    if (map.getLayer("3d-buildings")) return;

    map.addLayer(
      {
        id: "3d-buildings",
        source: vectorSource,
        "source-layer": "building",
        filter: ["==", ["geometry-type"], "Polygon"],
        type: "fill-extrusion",
        minzoom: 14,
        paint: {
          "fill-extrusion-color": [
            "interpolate",
            ["linear"],
            ["get", "render_height"],
            0, "hsl(260, 20%, 18%)",
            50, "hsl(260, 25%, 25%)",
            100, "hsl(260, 30%, 35%)",
          ],
          "fill-extrusion-height": ["get", "render_height"],
          "fill-extrusion-base": ["get", "render_min_height"],
          "fill-extrusion-opacity": 0.7,
        },
      },
      labelLayerId
    );
  };

  useEffect(() => {
    if (loading || !mapRef.current || mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: MAP_STYLES[0].url,
      center: [lng, lat],
      zoom: 16,
      pitch: 55,
      bearing: -20,
      attributionControl: false,
    });

    map.on("load", () => {
      add3DBuildings(map);
    });

    map.on("zoom", () => setCurrentZoom(Math.round(map.getZoom())));

    markerRef.current = createMarker(map, lat, lng);
    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [loading, lat, lng]);

  const switchMapStyle = (styleId: string) => {
    setMapStyle(styleId);
    setShowStylePicker(false);
    const style = MAP_STYLES.find(s => s.id === styleId);
    if (!style || !mapInstance.current) return;

    const map = mapInstance.current;
    const center = map.getCenter();
    const zoom = map.getZoom();
    const pitch = map.getPitch();
    const bearing = map.getBearing();

    map.setStyle(style.url);

    map.once("style.load", () => {
      map.jumpTo({ center, zoom, pitch, bearing });
      add3DBuildings(map);

      // Re-add marker
      if (markerRef.current) markerRef.current.remove();
      markerRef.current = createMarker(map, lat, lng);
    });
  };

  const handleZoom = (delta: number) => {
    if (!mapInstance.current) return;
    mapInstance.current.easeTo({ zoom: mapInstance.current.getZoom() + delta, duration: 300 });
  };

  const handleRecenter = () => {
    mapInstance.current?.flyTo({ center: [lng, lat], zoom: 16, pitch: 55, bearing: -20, duration: 1500 });
  };

  const handleResetView = () => {
    mapInstance.current?.flyTo({ center: [lng, lat], zoom: 16, pitch: 0, bearing: 0, duration: 1000 });
  };

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
              <p className="text-[10px] text-muted-foreground mt-0.5">Mapa 3D interativo</p>
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
            <div ref={mapRef} className="w-full h-[320px]" style={{ background: 'hsl(230 18% 8%)' }} />

            {/* Map Controls */}
            <div className="absolute top-3 right-3 flex flex-col gap-2 z-[10]">
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
              <button onClick={handleResetView}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                style={{ background: 'hsl(230 15% 12% / 0.9)', backdropFilter: 'blur(8px)', border: '1px solid hsl(0 0% 100% / 0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
                <RotateCcw className="w-3.5 h-3.5 text-foreground" />
              </button>
            </div>

            {/* Zoom & Pitch indicator */}
            <div className="absolute bottom-3 left-3 z-[10] flex gap-2">
              <div className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-foreground/70"
                style={{ background: 'hsl(230 15% 12% / 0.8)', backdropFilter: 'blur(8px)' }}>
                Zoom: {currentZoom}x
              </div>
              <div className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-foreground/70"
                style={{ background: 'hsl(230 15% 12% / 0.8)', backdropFilter: 'blur(8px)' }}>
                3D
              </div>
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
