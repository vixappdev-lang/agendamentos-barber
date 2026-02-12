import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Search, Check, Plus, Minus, Navigation } from "lucide-react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface LocationPickerModalProps {
  onClose: () => void;
  onConfirm: (address: string, lat: string, lng: string) => void;
  initialAddress?: string;
  initialLat?: string;
  initialLng?: string;
}

const STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

const LocationPickerModal = ({ onClose, onConfirm, initialAddress, initialLat, initialLng }: LocationPickerModalProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const orbitalRef = useRef<number | null>(null);
  const [address, setAddress] = useState(initialAddress || "");
  const [lat, setLat] = useState(initialLat || "-23.5505");
  const [lng, setLng] = useState(initialLng || "-46.6333");
  const [searching, setSearching] = useState(false);

  const stopOrbital = useCallback(() => {
    if (orbitalRef.current) {
      cancelAnimationFrame(orbitalRef.current);
      orbitalRef.current = null;
    }
  }, []);

  const createMarker = (map: maplibregl.Map, latitude: number, longitude: number, draggable = true) => {
    const el = document.createElement("div");
    el.className = "uber-marker";
    el.innerHTML = `
      <div class="uber-marker-root">
        <div class="uber-marker-pulse"></div>
        <div class="uber-marker-dot"></div>
      </div>
    `;
    return new maplibregl.Marker({ element: el, anchor: "center", draggable })
      .setLngLat([longitude, latitude])
      .addTo(map);
  };

  const startOrbitalAnimation = (map: maplibregl.Map) => {
    let startTime: number | null = null;
    const duration = 5000;
    const startBearing = map.getBearing();

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      map.setBearing((startBearing + eased * 360) % 360);

      if (progress < 1) {
        orbitalRef.current = requestAnimationFrame(animate);
      } else {
        orbitalRef.current = null;
        // Reset to flat after orbit
        map.easeTo({ pitch: 0, bearing: 0, duration: 800 });
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
      style: STYLE_URL,
      center: [initLng, initLat],
      zoom: 15.5,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      // antialias via canvas
    });

    map.on("load", () => {
      setTimeout(() => startOrbitalAnimation(map), 600);
    });

    const stop = () => stopOrbital();
    map.on("mousedown", stop);
    map.on("touchstart", stop);
    map.on("wheel", stop);

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

  const handleZoom = (delta: number) => {
    if (!mapInstance.current) return;
    stopOrbital();
    mapInstance.current.easeTo({ zoom: mapInstance.current.getZoom() + delta, duration: 400, easing: t => 1 - Math.pow(1 - t, 3) });
  };

  const handleRecenter = () => {
    stopOrbital();
    const curLat = parseFloat(lat) || -23.5505;
    const curLng = parseFloat(lng) || -46.6333;
    mapInstance.current?.flyTo({ center: [curLng, curLat], zoom: 15.5, pitch: 0, bearing: 0, duration: 1200 });
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
        mapInstance.current?.flyTo({ center: [newLng, newLat], zoom: 15.5, duration: 1500 });
        if (markerRef.current) markerRef.current.setLngLat([newLng, newLat]);
      }
    } catch {}
    setSearching(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-full max-w-xl overflow-hidden rounded-3xl"
        style={{ background: 'hsl(0 0% 8%)', border: '1px solid hsl(0 0% 100% / 0.06)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h3 className="text-[17px] font-bold text-white">Selecionar local</h3>
            <p className="text-[12px] text-white/40 mt-0.5">Toque no mapa ou arraste o pin</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'hsl(0 0% 100% / 0.06)' }}>
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pb-3 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              className="w-full h-11 pl-10 pr-4 rounded-2xl text-sm text-white placeholder:text-white/30 outline-none transition-all focus:ring-2 focus:ring-white/10"
              style={{ background: 'hsl(0 0% 100% / 0.06)', border: '1px solid hsl(0 0% 100% / 0.06)' }}
              placeholder="Buscar endereço..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <button onClick={handleSearch} disabled={searching}
            className="h-11 px-5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: 'white', color: 'hsl(0 0% 8%)' }}>
            {searching ? "..." : "Buscar"}
          </button>
        </div>

        {/* Map */}
        <div className="relative">
          <div ref={mapRef} className="w-full h-[320px] sm:h-[360px]" style={{ background: 'hsl(0 0% 6%)' }} />

          {/* Zoom */}
          <div className="absolute top-3 right-3 z-10 flex flex-col rounded-2xl overflow-hidden"
            style={{ background: 'hsl(0 0% 10% / 0.85)', backdropFilter: 'blur(12px)', border: '1px solid hsl(0 0% 100% / 0.08)' }}>
            <button onClick={() => handleZoom(1)} className="w-9 h-9 flex items-center justify-center transition-all active:scale-90 border-b" style={{ borderColor: 'hsl(0 0% 100% / 0.06)' }}>
              <Plus className="w-3.5 h-3.5 text-white/80" />
            </button>
            <button onClick={() => handleZoom(-1)} className="w-9 h-9 flex items-center justify-center transition-all active:scale-90">
              <Minus className="w-3.5 h-3.5 text-white/80" />
            </button>
          </div>

          {/* Recenter */}
          <button onClick={handleRecenter}
            className="absolute bottom-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'hsl(0 0% 10% / 0.85)', backdropFilter: 'blur(12px)', border: '1px solid hsl(0 0% 100% / 0.08)' }}>
            <Navigation className="w-3.5 h-3.5 text-white/80" />
          </button>

          {/* Coordinates pill */}
          <div className="absolute bottom-3 left-3 z-10 px-3 py-1.5 rounded-full text-[10px] font-mono text-white/50"
            style={{ background: 'hsl(0 0% 10% / 0.85)', backdropFilter: 'blur(12px)' }}>
            {parseFloat(lat).toFixed(4)}, {parseFloat(lng).toFixed(4)}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/30 mb-0.5">Local selecionado</p>
            <p className="text-[13px] text-white/70 truncate">
              {address || "Toque no mapa para selecionar"}
            </p>
          </div>
          <button onClick={() => onConfirm(address, lat, lng)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl text-[15px] font-semibold transition-all active:scale-95 shrink-0"
            style={{ background: 'white', color: 'hsl(0 0% 8%)' }}>
            <Check className="w-4 h-4" /> Confirmar
          </button>
        </div>

        {/* Marker styles */}
        <style>{`
          .uber-marker-root {
            position: relative;
            width: 80px;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .uber-marker-pulse {
            position: absolute;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: hsl(245 60% 55% / 0.12);
            animation: uber-pulse 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
          .uber-marker-dot {
            position: relative;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: hsl(245 60% 60%);
            box-shadow: 0 0 0 4px hsl(0 0% 100% / 0.95), 0 0 20px hsl(245 60% 55% / 0.5), 0 2px 8px rgba(0,0,0,0.3);
          }
          @keyframes uber-pulse {
            0% { transform: scale(0.5); opacity: 0.8; }
            70% { transform: scale(1.2); opacity: 0; }
            100% { transform: scale(1.2); opacity: 0; }
          }
        `}</style>
      </motion.div>
    </motion.div>
  );
};

export default LocationPickerModal;
