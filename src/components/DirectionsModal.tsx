import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Navigation, Layers, Plus, Minus, Crosshair, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface DirectionsModalProps {
  onClose: () => void;
}

const MAP_STYLES = [
  { id: "dark", label: "Escuro", url: "https://tiles.openfreemap.org/styles/dark", emoji: "🌙" },
  { id: "liberty", label: "Padrão", url: "https://tiles.openfreemap.org/styles/liberty", emoji: "🗺️" },
  { id: "positron", label: "Claro", url: "https://tiles.openfreemap.org/styles/positron", emoji: "☀️" },
];

const CTRL_STYLE = {
  background: 'hsl(0 0% 0% / 0.55)',
  backdropFilter: 'blur(12px)',
  border: '1px solid hsl(0 0% 100% / 0.08)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
};

const DirectionsModal = ({ onClose }: DirectionsModalProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const destMarkerRef = useRef<maplibregl.Marker | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const routeDrawnRef = useRef(false);
  const lastRouteCoordsRef = useRef<[number, number][] | null>(null);

  const [address, setAddress] = useState("");
  const [destLat, setDestLat] = useState(-23.5505);
  const [destLng, setDestLng] = useState(-46.6333);
  const [loading, setLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState("dark");
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(15);
  const [routeStatus, setRouteStatus] = useState<"idle" | "locating" | "routing" | "active" | "error">("idle");
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);

  // ─── Fetch business location ───
  useEffect(() => {
    const fetchLocation = async () => {
      const { data } = await supabase.from("business_settings").select("key, value").in("key", ["address", "location_lat", "location_lng"]);
      if (data) {
        for (const r of data) {
          if (r.key === "address") setAddress(r.value || "");
          if (r.key === "location_lat" && r.value) setDestLat(parseFloat(r.value));
          if (r.key === "location_lng" && r.value) setDestLng(parseFloat(r.value));
        }
      }
      setLoading(false);
    };
    fetchLocation();
  }, []);

  // ─── Destination Marker (clean, minimal) ───
  const createDestMarker = (map: maplibregl.Map, latitude: number, longitude: number) => {
    const el = document.createElement("div");
    el.innerHTML = `
      <div style="position:relative;width:40px;height:52px;cursor:pointer;">
        <div style="position:absolute;bottom:-3px;left:50%;transform:translateX(-50%);width:18px;height:6px;background:rgba(139,92,246,0.35);border-radius:50%;filter:blur(2px);"></div>
        <svg viewBox="0 0 40 52" width="40" height="52" style="filter:drop-shadow(0 4px 8px rgba(0,0,0,0.4));">
          <defs><linearGradient id="dg" x1="0" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stop-color="#a78bfa"/><stop offset="100%" stop-color="#7c3aed"/>
          </linearGradient></defs>
          <path d="M20 2C10 2 2 10 2 20c0 12 18 30 18 30s18-18 18-30C38 10 30 2 20 2z" fill="url(#dg)" stroke="white" stroke-width="2"/>
          <circle cx="20" cy="18" r="7" fill="white"/>
          <circle cx="20" cy="18" r="3.5" fill="#7c3aed"/>
        </svg>
      </div>
    `;
    return new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([longitude, latitude]).addTo(map);
  };

  // ─── User Location Marker (blue pulsing dot, Uber-style) ───
  const createUserMarker = (map: maplibregl.Map, latitude: number, longitude: number) => {
    const el = document.createElement("div");
    el.innerHTML = `
      <div style="position:relative;width:32px;height:32px;">
        <div style="position:absolute;inset:0;background:rgba(59,130,246,0.2);border-radius:50%;animation:user-pulse 2s ease-out infinite;"></div>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:14px;height:14px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(59,130,246,0.5);"></div>
      </div>
      <style>@keyframes user-pulse{0%{transform:scale(1);opacity:0.6}100%{transform:scale(2.5);opacity:0}}</style>
    `;
    return new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([longitude, latitude]).addTo(map);
  };

  // (3D buildings removed for cleaner flat map like Uber/99)

  // ─── Fetch Route from OSRM ───
  const fetchRoute = useCallback(async (fromLng: number, fromLat: number, toLng: number, toLat: number) => {
    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`
      );
      const data = await res.json();
      if (data.code !== "Ok" || !data.routes?.[0]) return null;
      const route = data.routes[0];
      const distKm = (route.distance / 1000).toFixed(1);
      const durMin = Math.ceil(route.duration / 60);
      return { geometry: route.geometry, distance: `${distKm} km`, duration: `${durMin} min` };
    } catch { return null; }
  }, []);

  // ─── Draw or update route on map ───
  const drawRoute = useCallback((map: maplibregl.Map, coordinates: [number, number][]) => {
    // Save coords for re-draw after style switch
    lastRouteCoordsRef.current = coordinates;

    const geojsonData: GeoJSON.Feature<GeoJSON.LineString> = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates },
    };

    // If source already exists, just update data
    const existingSource = map.getSource("route") as maplibregl.GeoJSONSource | undefined;
    if (existingSource) {
      existingSource.setData(geojsonData);
      return;
    }

    // Otherwise create source + layers from scratch
    map.addSource("route", { type: "geojson", data: geojsonData });

    map.addLayer({
      id: "route-glow",
      type: "line",
      source: "route",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#a78bfa", "line-width": 14, "line-opacity": 0.3, "line-blur": 6 },
    });
    map.addLayer({
      id: "route-casing",
      type: "line",
      source: "route",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#1e1b4b", "line-width": 7, "line-opacity": 0.9 },
    });
    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#7c3aed", "line-width": 4, "line-opacity": 1 },
    });
  }, []);

  // ─── Remove route layers (for style switch) ───
  const removeRouteLayers = useCallback((map: maplibregl.Map) => {
    ["route-glow", "route-casing", "route-line"].forEach(id => {
      try { if (map.getLayer(id)) map.removeLayer(id); } catch {}
    });
    try { if (map.getSource("route")) map.removeSource("route"); } catch {}
  }, []);

  // ─── Start Route Tracking ───
  const startRouteTracking = useCallback(() => {
    if (!mapInstance.current) return;
    if (!navigator.geolocation) { setRouteStatus("error"); return; }

    setRouteStatus("locating");

    const onPosition = async (pos: GeolocationPosition) => {
      const map = mapInstance.current;
      if (!map) return;

      const uLat = pos.coords.latitude;
      const uLng = pos.coords.longitude;
      setUserPos({ lat: uLat, lng: uLng });

      // Create or update user marker
      if (userMarkerRef.current) {
        userMarkerRef.current.setLngLat([uLng, uLat]);
      } else {
        userMarkerRef.current = createUserMarker(map, uLat, uLng);
      }

      // Fetch & draw route
      setRouteStatus("routing");
      const route = await fetchRoute(uLng, uLat, destLng, destLat);
      if (route) {
        setRouteInfo({ distance: route.distance, duration: route.duration });
        setRouteStatus("active");

        // Fit bounds to show entire route
        const coords = route.geometry.coordinates as [number, number][];
        const bounds = new maplibregl.LngLatBounds(coords[0], coords[0]);
        coords.forEach(c => bounds.extend(c));
        map.fitBounds(bounds, { padding: { top: 80, bottom: 100, left: 50, right: 50 }, pitch: 0, bearing: 0, duration: 1200 });

        // Draw route immediately
        drawRoute(map, coords);
      } else {
        setRouteStatus("error");
      }
    };

    // Initial position
    navigator.geolocation.getCurrentPosition(onPosition, () => setRouteStatus("error"), {
      enableHighAccuracy: true, timeout: 15000, maximumAge: 0,
    });

    // Watch for updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const map = mapInstance.current;
        if (!map) return;
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        setUserPos({ lat: uLat, lng: uLng });
        if (userMarkerRef.current) userMarkerRef.current.setLngLat([uLng, uLat]);

        // Re-fetch route silently & update polyline
        fetchRoute(uLng, uLat, destLng, destLat).then(route => {
          if (route) {
            setRouteInfo({ distance: route.distance, duration: route.duration });
            const coords = route.geometry.coordinates as [number, number][];
            drawRoute(map, coords);
          }
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  }, [destLat, destLng, fetchRoute, drawRoute]);

  // ─── Initialize Map ───
  useEffect(() => {
    if (loading || !mapRef.current || mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: MAP_STYLES[0].url,
      center: [destLng, destLat],
      zoom: 15,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    map.on("zoom", () => setCurrentZoom(Math.round(map.getZoom())));

    destMarkerRef.current = createDestMarker(map, destLat, destLng);
    mapInstance.current = map;

    // Start route tracking after map is fully loaded
    map.on("load", () => {
      setTimeout(() => startRouteTracking(), 500);
    });

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      map.remove();
      mapInstance.current = null;
    };
  }, [loading, destLat, destLng]);

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
    
    // Cache route coords before style wipes everything
    const cachedCoords = lastRouteCoordsRef.current;

    map.setStyle(style.url);
    map.once("style.load", () => {
      map.jumpTo({ center, zoom, pitch, bearing });

      // Re-create markers
      if (destMarkerRef.current) destMarkerRef.current.remove();
      destMarkerRef.current = createDestMarker(map, destLat, destLng);
      if (userPos && userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = createUserMarker(map, userPos.lat, userPos.lng);
      }
      
      // Re-draw route immediately from cached coordinates (no async fetch needed)
      if (cachedCoords && cachedCoords.length > 0) {
        drawRoute(map, cachedCoords);
      }
    });
  };

  const handleZoom = (delta: number) => {
    mapInstance.current?.easeTo({ zoom: (mapInstance.current?.getZoom() || 15) + delta, duration: 300 });
  };

  const handleRecenter = () => {
    if (!mapInstance.current) return;
    if (userPos) {
      const bounds = new maplibregl.LngLatBounds([userPos.lng, userPos.lat], [destLng, destLat]);
      mapInstance.current.fitBounds(bounds, { padding: 80, pitch: 0, bearing: 0, duration: 1200 });
    } else {
      mapInstance.current.flyTo({ center: [destLng, destLat], zoom: 15, pitch: 0, bearing: 0, duration: 1200 });
    }
  };

  const openGPS = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`, "_blank");
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
              <Navigation className="w-4 h-4" style={{ color: 'hsl(245 60% 65%)' }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Como Chegar</h3>
              {routeInfo ? (
                <p className="text-[10px] mt-0.5" style={{ color: 'hsl(245 60% 70%)' }}>
                  {routeInfo.distance} · {routeInfo.duration} de carro
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {routeStatus === "locating" ? "Buscando sua localização..." : routeStatus === "routing" ? "Calculando rota..." : "Rota em tempo real"}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors hover:bg-white/10" style={{ background: 'hsl(0 0% 100% / 0.05)' }}>
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Map */}
        <div className="relative">
          <div ref={mapRef} className="w-full h-[380px] sm:h-[420px]" style={{ background: 'hsl(230 18% 8%)' }} />

          {/* Loading overlay */}
          {(routeStatus === "locating" || routeStatus === "routing") && (
            <div className="absolute inset-0 flex items-center justify-center z-[5]" style={{ background: 'hsl(230 20% 7% / 0.5)' }}>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: 'hsl(0 0% 0% / 0.6)', backdropFilter: 'blur(8px)' }}>
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'hsl(245 60% 65%)' }} />
                <span className="text-xs font-medium text-foreground/80">
                  {routeStatus === "locating" ? "Localizando..." : "Calculando rota..."}
                </span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-[10]">
            <div className="relative">
              <button onClick={() => setShowStylePicker(!showStylePicker)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90" style={CTRL_STYLE}>
                <Layers className="w-3.5 h-3.5 text-foreground/80" />
              </button>
              <AnimatePresence>
                {showStylePicker && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, x: 10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: 10 }}
                    className="absolute top-0 right-10 flex gap-1 p-1 rounded-lg"
                    style={{ background: 'hsl(0 0% 0% / 0.7)', backdropFilter: 'blur(12px)', border: '1px solid hsl(0 0% 100% / 0.08)' }}>
                    {MAP_STYLES.map((s) => (
                      <button key={s.id} onClick={() => switchMapStyle(s.id)}
                        className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-md transition-all text-[9px] font-semibold whitespace-nowrap"
                        style={{
                          background: mapStyle === s.id ? 'hsl(245 60% 55% / 0.2)' : 'transparent',
                          color: mapStyle === s.id ? 'hsl(245 60% 70%)' : 'hsl(0 0% 55%)',
                        }}>
                        <span className="text-sm">{s.emoji}</span>
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button onClick={() => handleZoom(1)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90" style={CTRL_STYLE}>
              <Plus className="w-3.5 h-3.5 text-foreground/80" />
            </button>
            <button onClick={() => handleZoom(-1)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90" style={CTRL_STYLE}>
              <Minus className="w-3.5 h-3.5 text-foreground/80" />
            </button>
            <button onClick={handleRecenter} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90" style={CTRL_STYLE}>
              <Crosshair className="w-3.5 h-3.5 text-foreground/80" />
            </button>
          </div>

          {/* Route info pill */}
          {routeInfo && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-3 left-3 right-14 z-[10]">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'hsl(0 0% 0% / 0.6)', backdropFilter: 'blur(12px)', border: '1px solid hsl(0 0% 100% / 0.08)' }}>
                <div className="w-2 h-2 rounded-full" style={{ background: 'hsl(245 60% 60%)', boxShadow: '0 0 8px hsl(245 60% 60% / 0.5)' }} />
                <span className="text-[11px] font-semibold text-foreground/90">{routeInfo.duration}</span>
                <span className="text-[10px] text-foreground/50">·</span>
                <span className="text-[11px] text-foreground/60">{routeInfo.distance}</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Address + GPS */}
        <div className="p-4 flex flex-col gap-3">
          {address && (
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'hsl(245 60% 55% / 0.15)' }}>
                <MapPin className="w-3 h-3" style={{ color: 'hsl(245 60% 65%)' }} />
              </div>
              <p className="text-xs text-foreground/70 leading-relaxed">{address}</p>
            </div>
          )}
          <button
            onClick={openGPS}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
            style={{ background: 'hsl(245 60% 55%)', color: 'white', boxShadow: '0 4px 20px hsl(245 60% 55% / 0.25)' }}>
            <Navigation className="w-4 h-4" /> Abrir no GPS
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DirectionsModal;
