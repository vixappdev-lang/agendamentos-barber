import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Search, Check, Layers, Plus, Minus, Crosshair, RotateCcw } from "lucide-react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface LocationPickerModalProps {
  onClose: () => void;
  onConfirm: (address: string, lat: string, lng: string) => void;
  initialAddress?: string;
  initialLat?: string;
  initialLng?: string;
}

const MAP_STYLES = [
  { id: "dark", label: "Escuro", url: "https://tiles.openfreemap.org/styles/dark", emoji: "🌙" },
  { id: "liberty", label: "3D", url: "https://tiles.openfreemap.org/styles/liberty", emoji: "🏙️" },
  { id: "positron", label: "Claro", url: "https://tiles.openfreemap.org/styles/positron", emoji: "☀️" },
];

const LocationPickerModal = ({ onClose, onConfirm, initialAddress, initialLat, initialLng }: LocationPickerModalProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const orbitalRef = useRef<number | null>(null);
  const [address, setAddress] = useState(initialAddress || "");
  const [lat, setLat] = useState(initialLat || "-23.5505");
  const [lng, setLng] = useState(initialLng || "-46.6333");
  const [searching, setSearching] = useState(false);
  const [mapStyle, setMapStyle] = useState("dark");
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(16);

  const stopOrbital = useCallback(() => {
    if (orbitalRef.current) {
      cancelAnimationFrame(orbitalRef.current);
      orbitalRef.current = null;
    }
  }, []);

  const createMarker = (map: maplibregl.Map, latitude: number, longitude: number, draggable = true) => {
    const el = document.createElement("div");
    el.innerHTML = `
      <div style="position:relative;width:48px;height:60px;cursor:${draggable ? 'grab' : 'pointer'};">
        <div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);width:22px;height:7px;background:rgba(139,92,246,0.4);border-radius:50%;filter:blur(3px);"></div>
        <div style="position:absolute;top:4px;left:4px;width:40px;height:40px;background:rgba(139,92,246,0.2);border-radius:50%;animation:ml-pulse 2s ease-out infinite;"></div>
        <svg viewBox="0 0 48 60" width="48" height="60" style="position:absolute;top:0;left:0;filter:drop-shadow(0 6px 12px rgba(139,92,246,0.5));">
          <defs><linearGradient id="ml-grad-pick" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#a78bfa"/><stop offset="100%" stop-color="#7c3aed"/>
          </linearGradient></defs>
          <path d="M24 2C12 2 2 12 2 24c0 15 22 34 22 34s22-19 22-34C46 12 36 2 24 2z" fill="url(#ml-grad-pick)" stroke="white" stroke-width="2.5"/>
          <circle cx="24" cy="22" r="9" fill="white" opacity="0.95"/>
          <circle cx="24" cy="22" r="4.5" fill="#8b5cf6"/>
        </svg>
      </div>
      <style>@keyframes ml-pulse{0%{transform:scale(1);opacity:0.7}50%{transform:scale(2);opacity:0}100%{transform:scale(2.5);opacity:0}}</style>
    `;

    const marker = new maplibregl.Marker({ element: el, anchor: "bottom", draggable })
      .setLngLat([longitude, latitude])
      .addTo(map);

    return marker;
  };

  const add3DBuildings = (map: maplibregl.Map) => {
    const layers = map.getStyle().layers;
    if (!layers) return;

    let labelLayerId: string | undefined;
    for (const layer of layers) {
      if (layer.type === "symbol" && (layer as any).layout?.["text-field"]) {
        labelLayerId = layer.id;
        break;
      }
    }

    const sources = map.getStyle().sources;
    const vectorSource = Object.keys(sources).find(key => sources[key].type === "vector");
    if (!vectorSource || map.getLayer("3d-buildings")) return;

    map.addLayer({
      id: "3d-buildings",
      source: vectorSource,
      "source-layer": "building",
      filter: ["==", ["geometry-type"], "Polygon"],
      type: "fill-extrusion",
      minzoom: 14,
      paint: {
        "fill-extrusion-color": [
          "interpolate", ["linear"], ["get", "render_height"],
          0, "hsl(260, 20%, 18%)", 50, "hsl(260, 25%, 25%)", 100, "hsl(260, 30%, 35%)",
        ],
        "fill-extrusion-height": ["get", "render_height"],
        "fill-extrusion-base": ["get", "render_min_height"],
        "fill-extrusion-opacity": 0.7,
      },
    }, labelLayerId);
  };

  const startOrbitalAnimation = (map: maplibregl.Map) => {
    let startTime: number | null = null;
    const duration = 4000; // 4s orbit
    const startBearing = map.getBearing();

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const bearing = startBearing + eased * 360;
      
      map.setBearing(bearing % 360);

      if (progress < 1) {
        orbitalRef.current = requestAnimationFrame(animate);
      } else {
        orbitalRef.current = null;
      }
    };

    orbitalRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const initLat = parseFloat(lat) || -23.5505;
    const initLng = parseFloat(lng) || -46.6333;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: MAP_STYLES[0].url,
      center: [initLng, initLat],
      zoom: 16,
      pitch: 55,
      bearing: -20,
      attributionControl: false,
    });

    map.on("load", () => {
      add3DBuildings(map);
      // Start orbital animation after load
      setTimeout(() => startOrbitalAnimation(map), 500);
    });

    map.on("zoom", () => setCurrentZoom(Math.round(map.getZoom())));

    // Stop orbital on any user interaction
    const stopOnInteraction = () => stopOrbital();
    map.on("mousedown", stopOnInteraction);
    map.on("touchstart", stopOnInteraction);
    map.on("wheel", stopOnInteraction);

    const marker = createMarker(map, initLat, initLng, true);
    markerRef.current = marker;

    marker.on("dragend", async () => {
      stopOrbital();
      const pos = marker.getLngLat();
      setLat(pos.lat.toFixed(6));
      setLng(pos.lng.toFixed(6));
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.lat}&lon=${pos.lng}&format=json`);
        const data = await res.json();
        if (data.display_name) setAddress(data.display_name);
      } catch {}
    });

    map.on("click", async (e) => {
      stopOrbital();
      const { lat: clickLat, lng: clickLng } = e.lngLat;
      marker.setLngLat([clickLng, clickLat]);
      setLat(clickLat.toFixed(6));
      setLng(clickLng.toFixed(6));
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${clickLat}&lon=${clickLng}&format=json`);
        const data = await res.json();
        if (data.display_name) setAddress(data.display_name);
      } catch {}
    });

    mapInstance.current = map;
    return () => {
      stopOrbital();
      map.remove();
      mapInstance.current = null;
    };
  }, []);

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
      if (markerRef.current) markerRef.current.remove();
      markerRef.current = createMarker(map, parseFloat(lat), parseFloat(lng), true);
      markerRef.current.on("dragend", async () => {
        const pos = markerRef.current!.getLngLat();
        setLat(pos.lat.toFixed(6));
        setLng(pos.lng.toFixed(6));
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.lat}&lon=${pos.lng}&format=json`);
          const data = await res.json();
          if (data.display_name) setAddress(data.display_name);
        } catch {}
      });
    });
  };

  const handleZoom = (delta: number) => {
    if (!mapInstance.current) return;
    stopOrbital();
    mapInstance.current.easeTo({ zoom: mapInstance.current.getZoom() + delta, duration: 300 });
  };

  const handleRecenter = () => {
    stopOrbital();
    const curLat = parseFloat(lat) || -23.5505;
    const curLng = parseFloat(lng) || -46.6333;
    mapInstance.current?.flyTo({ center: [curLng, curLat], zoom: 16, pitch: 55, bearing: -20, duration: 1500 });
  };

  const handleResetView = () => {
    stopOrbital();
    mapInstance.current?.flyTo({ center: [parseFloat(lng), parseFloat(lat)], zoom: 16, pitch: 0, bearing: 0, duration: 1000 });
  };

  const handleSearch = async () => {
    if (!address.trim()) return;
    setSearching(true);
    stopOrbital();
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
      const data = await res.json();
      if (data[0]) {
        const newLat = parseFloat(data[0].lat);
        const newLng = parseFloat(data[0].lon);
        setLat(newLat.toFixed(6));
        setLng(newLng.toFixed(6));
        setAddress(data[0].display_name);
        mapInstance.current?.flyTo({ center: [newLng, newLat], zoom: 16, pitch: 55, bearing: -20, duration: 1500 });
        if (markerRef.current) markerRef.current.setLngLat([newLng, newLat]);
      }
    } catch {}
    setSearching(false);
  };

  const ctrlBtnStyle = {
    background: 'hsl(230 15% 12% / 0.9)',
    backdropFilter: 'blur(8px)',
    border: '1px solid hsl(0 0% 100% / 0.1)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4"
      style={{ background: 'hsl(230 20% 5% / 0.92)', backdropFilter: 'blur(16px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="glass-card-strong w-full max-w-2xl overflow-hidden rounded-2xl"
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
              <h3 className="text-base font-bold text-foreground">Selecionar Localização</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Clique no mapa ou arraste o pin</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors hover:bg-white/10" style={{ background: 'hsl(0 0% 100% / 0.05)' }}>
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 sm:p-4 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              className="glass-input !pl-10"
              placeholder="Buscar endereço..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <button onClick={handleSearch} disabled={searching}
            className="px-4 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: 'hsl(245 60% 55%)', color: 'white' }}>
            {searching ? "..." : "Buscar"}
          </button>
        </div>

        {/* Map Container */}
        <div className="relative mx-3 sm:mx-4 rounded-xl overflow-hidden" style={{ border: '1px solid hsl(0 0% 100% / 0.06)' }}>
          <div ref={mapRef} className="w-full h-[350px] sm:h-[400px]" style={{ background: 'hsl(230 18% 8%)' }} />

          {/* Map Controls */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 z-[10]">
            <div className="relative">
              <button onClick={() => setShowStylePicker(!showStylePicker)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90" style={ctrlBtnStyle}>
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
                      <button key={s.id} onClick={() => switchMapStyle(s.id)}
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

            <button onClick={() => handleZoom(1)} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90" style={ctrlBtnStyle}>
              <Plus className="w-4 h-4 text-foreground" />
            </button>
            <button onClick={() => handleZoom(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90" style={ctrlBtnStyle}>
              <Minus className="w-4 h-4 text-foreground" />
            </button>
            <button onClick={handleRecenter} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90" style={ctrlBtnStyle}>
              <Crosshair className="w-4 h-4 text-foreground" />
            </button>
            <button onClick={handleResetView} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90" style={ctrlBtnStyle}>
              <RotateCcw className="w-3.5 h-3.5 text-foreground" />
            </button>
          </div>

          {/* Indicators */}
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

        {/* Coordinates */}
        <div className="mx-3 sm:mx-4 mt-2 flex gap-2">
          <div className="flex-1 px-3 py-1.5 rounded-lg text-[10px] font-mono text-muted-foreground flex items-center gap-1.5"
            style={{ background: 'hsl(0 0% 100% / 0.03)', border: '1px solid hsl(0 0% 100% / 0.05)' }}>
            <span style={{ color: 'hsl(245 60% 65%)' }}>LAT</span> {parseFloat(lat).toFixed(6)}
          </div>
          <div className="flex-1 px-3 py-1.5 rounded-lg text-[10px] font-mono text-muted-foreground flex items-center gap-1.5"
            style={{ background: 'hsl(0 0% 100% / 0.03)', border: '1px solid hsl(0 0% 100% / 0.05)' }}>
            <span style={{ color: 'hsl(245 60% 65%)' }}>LNG</span> {parseFloat(lng).toFixed(6)}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 flex items-center justify-between" style={{ borderTop: '1px solid hsl(0 0% 100% / 0.06)', marginTop: '12px' }}>
          <p className="text-[11px] text-muted-foreground truncate flex-1 mr-3">
            {address || "Clique no mapa ou busque um endereço"}
          </p>
          <button onClick={() => onConfirm(address, lat, lng)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: 'hsl(245 60% 55%)', color: 'white', boxShadow: '0 4px 20px hsl(245 60% 55% / 0.3)' }}>
            <Check className="w-4 h-4" /> Confirmar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LocationPickerModal;
