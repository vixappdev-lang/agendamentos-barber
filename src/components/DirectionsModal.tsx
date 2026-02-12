import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Navigation, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface DirectionsModalProps {
  onClose: () => void;
}

const STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

const DirectionsModal = ({ onClose }: DirectionsModalProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const orbitalRef = useRef<number | null>(null);
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(-23.5505);
  const [lng, setLng] = useState(-46.6333);
  const [loading, setLoading] = useState(true);

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
    const el = document.createElement("div");
    el.className = "uber-marker";
    el.innerHTML = `
      <div class="uber-marker-root">
        <div class="uber-marker-pulse"></div>
        <div class="uber-marker-dot"></div>
      </div>
    `;
    return new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat([longitude, latitude])
      .addTo(map);
  };

  const stopOrbital = useCallback(() => {
    if (orbitalRef.current) {
      cancelAnimationFrame(orbitalRef.current);
      orbitalRef.current = null;
    }
  }, []);

  const startOrbitalAnimation = (map: maplibregl.Map) => {
    let startTime: number | null = null;
    const duration = 6000;
    const startBearing = map.getBearing();
    const startPitch = 0;
    const targetPitch = 45;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Smooth ease-in-out
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      map.setBearing((startBearing + eased * 360) % 360);
      // Gradually tilt to 45° during first half, stay there
      const pitchProgress = Math.min(progress * 2, 1);
      map.setPitch(startPitch + (targetPitch - startPitch) * pitchProgress);

      if (progress < 1) {
        orbitalRef.current = requestAnimationFrame(animate);
      } else {
        orbitalRef.current = null;
      }
    };

    orbitalRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (loading || !mapRef.current || mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: STYLE_URL,
      center: [lng, lat],
      zoom: 15.5,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      // antialias via canvas
    });

    map.on("load", () => {
      setTimeout(() => startOrbitalAnimation(map), 800);
    });

    const stop = () => stopOrbital();
    map.on("mousedown", stop);
    map.on("touchstart", stop);
    map.on("wheel", stop);

    markerRef.current = createMarker(map, lat, lng);
    mapInstance.current = map;

    return () => {
      stopOrbital();
      map.remove();
      mapInstance.current = null;
    };
  }, [loading, lat, lng]);

  const handleZoom = (delta: number) => {
    if (!mapInstance.current) return;
    stopOrbital();
    mapInstance.current.easeTo({ zoom: mapInstance.current.getZoom() + delta, duration: 400, easing: t => 1 - Math.pow(1 - t, 3) });
  };

  const handleRecenter = () => {
    stopOrbital();
    mapInstance.current?.flyTo({ center: [lng, lat], zoom: 15.5, pitch: 0, bearing: 0, duration: 1200 });
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
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-full sm:max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl"
        style={{ background: 'hsl(0 0% 8%)', border: '1px solid hsl(0 0% 100% / 0.06)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'hsl(0 0% 100% / 0.15)' }} />
        </div>

        {/* Map - full width, no padding */}
        <div className="relative">
          <div ref={mapRef} className="w-full h-[280px] sm:h-[300px]" style={{ background: 'hsl(0 0% 6%)' }} />

          {/* Close button on map */}
          <button onClick={onClose}
            className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'hsl(0 0% 10% / 0.85)', backdropFilter: 'blur(12px)', border: '1px solid hsl(0 0% 100% / 0.08)' }}>
            <X className="w-4 h-4 text-white/80" />
          </button>

          {/* Zoom controls */}
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
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Address */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'hsl(0 0% 100% / 0.06)' }}>
              <MapPin className="w-5 h-5 text-white/70" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-white/40 mb-0.5">Endereço</p>
              <p className="text-[15px] text-white/90 leading-snug">
                {address || "Carregando..."}
              </p>
            </div>
          </div>

          {/* GPS Button */}
          <button
            onClick={openGPS}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-[15px] font-semibold transition-all active:scale-[0.98]"
            style={{ background: 'white', color: 'hsl(0 0% 8%)' }}>
            <Navigation className="w-4 h-4" /> Como chegar
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

export default DirectionsModal;
