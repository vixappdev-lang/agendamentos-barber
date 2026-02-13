import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, RotateCcw } from "lucide-react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import TransportModeModal, { type TransportMode, getModeConfig } from "@/components/navigation/TransportModeModal";
import TurnInstruction, { type StepInstruction } from "@/components/navigation/TurnInstruction";

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// ── 3D Buildings Layer ──
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

  if (map.getSource("openmaptiles") && !map.getLayer("3d-buildings")) {
    map.addLayer(
      {
        id: "3d-buildings",
        source: "openmaptiles",
        "source-layer": "building",
        type: "fill-extrusion",
        minzoom: 14,
        paint: {
          "fill-extrusion-color": [
            "interpolate", ["linear"], ["get", "render_height"],
            0, "hsl(230, 20%, 16%)",
            50, "hsl(230, 15%, 22%)",
            200, "hsl(230, 12%, 28%)",
          ],
          "fill-extrusion-height": [
            "interpolate", ["linear"], ["zoom"],
            14, 0,
            16, ["get", "render_height"],
          ],
          "fill-extrusion-base": [
            "interpolate", ["linear"], ["zoom"],
            14, 0,
            16, ["get", "render_min_height"],
          ],
          "fill-extrusion-opacity": 0.8,
        },
      },
      labelLayerId
    );
  }
};

const Navigation = () => {
  const [searchParams] = useSearchParams();
  const destLat = parseFloat(searchParams.get("lat") || "-23.5505");
  const destLng = parseFloat(searchParams.get("lng") || "-46.6333");
  const destAddress = searchParams.get("address") || "Destino";

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const destMarkerRef = useRef<maplibregl.Marker | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastBearingRef = useRef(0);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastSpeedRef = useRef(0);
  const routeVersionRef = useRef(0);
  const routeCoordsRef = useRef<[number, number][] | null>(null);
  const stepsRef = useRef<any[] | null>(null);

  const [transportMode, setTransportMode] = useState<TransportMode | null>(null);
  const [osrmProfile, setOsrmProfile] = useState("driving");
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string; eta: string } | null>(null);
  const [currentStreet, setCurrentStreet] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<StepInstruction | null>(null);
  const [nextStep, setNextStep] = useState<StepInstruction | null>(null);
  const [status, setStatus] = useState<"choosing" | "locating" | "routing" | "active" | "arrived" | "error">("choosing");
  const [errorMsg, setErrorMsg] = useState("");
  const [mapReady, setMapReady] = useState(false);

  // ── Destination marker ──
  const createDestMarker = useCallback((map: maplibregl.Map) => {
    const el = document.createElement("div");
    el.innerHTML = `
      <div style="position:relative;width:48px;height:62px;">
        <div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);width:22px;height:8px;background:rgba(139,92,246,0.4);border-radius:50%;filter:blur(3px);"></div>
        <svg viewBox="0 0 40 52" width="48" height="62" style="filter:drop-shadow(0 6px 12px rgba(0,0,0,0.5));">
          <defs><linearGradient id="ng" x1="0" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stop-color="#a78bfa"/><stop offset="100%" stop-color="#7c3aed"/>
          </linearGradient></defs>
          <path d="M20 2C10 2 2 10 2 20c0 12 18 30 18 30s18-18 18-30C38 10 30 2 20 2z" fill="url(#ng)" stroke="white" stroke-width="2"/>
          <circle cx="20" cy="18" r="7" fill="white"/><circle cx="20" cy="18" r="3.5" fill="#7c3aed"/>
        </svg>
      </div>`;
    return new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([destLng, destLat]).addTo(map);
  }, [destLat, destLng]);

  // ── User marker (navigation arrow) ──
  const createUserMarker = useCallback((map: maplibregl.Map, lat: number, lng: number) => {
    const el = document.createElement("div");
    el.innerHTML = `
      <div style="position:relative;width:52px;height:52px;" id="nav-arrow-container">
        <div style="position:absolute;inset:0;background:rgba(59,130,246,0.15);border-radius:50%;animation:nav-pulse 2s ease-out infinite;"></div>
        <div style="position:absolute;inset:4px;background:rgba(59,130,246,0.08);border-radius:50%;"></div>
        <svg viewBox="0 0 48 48" width="52" height="52" style="position:absolute;inset:0;filter:drop-shadow(0 3px 10px rgba(59,130,246,0.6));" id="nav-arrow-svg">
          <circle cx="24" cy="24" r="15" fill="#2563eb" stroke="white" stroke-width="3"/>
          <path d="M24 10 L31 29 L24 24 L17 29 Z" fill="white"/>
        </svg>
      </div>
      <style>@keyframes nav-pulse{0%{transform:scale(1);opacity:0.6}100%{transform:scale(2.8);opacity:0}}</style>`;
    return new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([lng, lat]).addTo(map);
  }, []);

  // ── Rotate user arrow ──
  const rotateArrow = useCallback((bearing: number) => {
    const svg = document.getElementById("nav-arrow-svg");
    if (svg) svg.style.transform = `rotate(${bearing}deg)`;
  }, []);

  // ── Calculate bearing ──
  const calcBearing = useCallback((from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
    const dLng = ((to.lng - from.lng) * Math.PI) / 180;
    const lat1 = (from.lat * Math.PI) / 180;
    const lat2 = (to.lat * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }, []);

  // ── Parse OSRM steps into instructions ──
  const parseSteps = useCallback((steps: any[]): StepInstruction[] => {
    return steps.map((s: any) => ({
      maneuver: s.maneuver?.type || "straight",
      modifier: s.maneuver?.modifier,
      name: s.name || "",
      distance: s.distance || 0,
    }));
  }, []);

  // ── Find current step based on user position ──
  const findCurrentStep = useCallback((userLat: number, userLng: number, steps: any[]) => {
    if (!steps || steps.length === 0) return;

    // Find closest step by checking maneuver locations
    let minDist = Infinity;
    let closestIdx = 0;

    for (let i = 0; i < steps.length; i++) {
      const loc = steps[i].maneuver?.location;
      if (!loc) continue;
      const d = Math.sqrt(Math.pow(userLat - loc[1], 2) + Math.pow(userLng - loc[0], 2));
      if (d < minDist) {
        minDist = d;
        closestIdx = i;
      }
    }

    // If we're very close to current step maneuver, show next step
    const threshold = 0.0003; // ~30m
    if (minDist < threshold && closestIdx < steps.length - 1) {
      closestIdx++;
    }

    const parsed = parseSteps(steps);
    setCurrentStep(parsed[closestIdx] || null);
    setNextStep(parsed[closestIdx + 1] || null);
  }, [parseSteps]);

  // ── Fetch route ──
  const fetchRoute = useCallback(async (fromLng: number, fromLat: number, profile: string) => {
    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/${profile}/${fromLng},${fromLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`
      );
      const data = await res.json();
      if (data.code !== "Ok" || !data.routes?.[0]) return null;
      const route = data.routes[0];
      const distKm = (route.distance / 1000).toFixed(1);
      const durMin = Math.ceil(route.duration / 60);
      const now = new Date();
      now.setMinutes(now.getMinutes() + durMin);
      const eta = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      let street: string | null = null;
      const steps = route.legs?.[0]?.steps || [];
      if (steps[0]?.name) street = steps[0].name || null;

      stepsRef.current = steps;

      return {
        geometry: route.geometry,
        distance: `${distKm} km`,
        duration: `${durMin} min`,
        eta,
        street,
        distanceMeters: route.distance,
        steps,
      };
    } catch {
      return null;
    }
  }, [destLat, destLng]);

  // ── Draw route ──
  const drawRoute = useCallback((map: maplibregl.Map, coordinates: [number, number][]) => {
    routeCoordsRef.current = coordinates;
    const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates },
    };

    const src = map.getSource("nav-route") as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(geojson);
      return;
    }

    map.addSource("nav-route", { type: "geojson", data: geojson });
    map.addLayer({
      id: "nav-route-glow", type: "line", source: "nav-route",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#a78bfa", "line-width": 20, "line-opacity": 0.2, "line-blur": 10 },
    });
    map.addLayer({
      id: "nav-route-casing", type: "line", source: "nav-route",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#1e1b4b", "line-width": 9, "line-opacity": 0.9 },
    });
    map.addLayer({
      id: "nav-route-line", type: "line", source: "nav-route",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#7c3aed", "line-width": 5.5, "line-opacity": 1 },
    });
  }, []);

  // ── Redraw route on style change ──
  const redrawRouteOnStyle = useCallback((map: maplibregl.Map) => {
    if (routeCoordsRef.current) {
      // Force re-add source/layers
      try { map.removeLayer("nav-route-glow"); } catch {}
      try { map.removeLayer("nav-route-casing"); } catch {}
      try { map.removeLayer("nav-route-line"); } catch {}
      try { map.removeSource("nav-route"); } catch {}
      drawRoute(map, routeCoordsRef.current);
    }
  }, [drawRoute]);

  // ── Speed-adaptive camera parameters ──
  const getAdaptiveCamera = useCallback((mode: TransportMode, speedMs: number) => {
    const config = getModeConfig(mode);
    const speedKmh = speedMs * 3.6;

    // Adjust zoom: faster = zoom out slightly for better overview
    let zoom = config.zoomLevel;
    if (mode === "driving" || mode === "motorcycle") {
      if (speedKmh > 60) zoom = config.zoomLevel - 0.5;
      else if (speedKmh > 40) zoom = config.zoomLevel - 0.3;
      else if (speedKmh < 10) zoom = config.zoomLevel + 0.3;
    }

    // Adjust offset: faster = look further ahead
    let offsetDist = 0.0004;
    if (speedKmh > 60) offsetDist = 0.0008;
    else if (speedKmh > 30) offsetDist = 0.0006;
    else if (speedKmh < 5) offsetDist = 0.0002;

    return { zoom, offsetDist, pitch: config.pitch, transitionSpeed: config.transitionSpeed };
  }, []);

  // ── Initialize map ──
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: MAP_STYLE,
      center: [destLng, destLat],
      zoom: 16,
      pitch: 65,
      bearing: 0,
      attributionControl: false,
      maxPitch: 85,
    });

    map.on("load", () => {
      add3DBuildings(map);
      destMarkerRef.current = createDestMarker(map);
      mapInstance.current = map;
      setMapReady(true);
    });

    map.on("style.load", () => {
      add3DBuildings(map);
      redrawRouteOnStyle(map);
    });

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      map.remove();
      mapInstance.current = null;
    };
  }, [destLat, destLng, createDestMarker, redrawRouteOnStyle]);

  // ── Start navigation ──
  const startNavigation = useCallback(async (mode: TransportMode, profile: string) => {
    const map = mapInstance.current;
    if (!map || !navigator.geolocation) {
      setStatus("error");
      setErrorMsg("Geolocalização não disponível");
      return;
    }

    setStatus("locating");
    const isFirstFix = { value: true };

    const processPosition = async (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const heading = pos.coords.heading;
      const speed = pos.coords.speed || 0;
      const currentPos = { lat, lng };

      lastSpeedRef.current = speed;

      // Calculate bearing
      let bearing = lastBearingRef.current;
      if (isFirstFix.value) {
        bearing = calcBearing(currentPos, { lat: destLat, lng: destLng });
      } else if (heading != null && !isNaN(heading) && heading >= 0) {
        bearing = heading;
      } else if (lastPositionRef.current) {
        const dist = Math.sqrt(
          Math.pow(lat - lastPositionRef.current.lat, 2) + Math.pow(lng - lastPositionRef.current.lng, 2)
        );
        if (dist > 0.00003) {
          bearing = calcBearing(lastPositionRef.current, currentPos);
        }
      }
      lastBearingRef.current = bearing;
      lastPositionRef.current = currentPos;

      // Update/create user marker
      if (userMarkerRef.current) {
        userMarkerRef.current.setLngLat([lng, lat]);
      } else {
        userMarkerRef.current = createUserMarker(map, lat, lng);
      }
      rotateArrow(bearing);

      // Adaptive camera
      const cam = getAdaptiveCamera(mode, speed);
      const bearingRad = (bearing * Math.PI) / 180;
      const offsetLat = lat + Math.cos(bearingRad) * cam.offsetDist;
      const offsetLng = lng + Math.sin(bearingRad) * cam.offsetDist;

      if (isFirstFix.value) {
        isFirstFix.value = false;
        map.flyTo({
          center: [offsetLng, offsetLat],
          zoom: cam.zoom,
          pitch: cam.pitch,
          bearing,
          duration: 2500,
          essential: true,
        });
      } else {
        map.easeTo({
          center: [offsetLng, offsetLat],
          zoom: cam.zoom,
          pitch: cam.pitch,
          bearing,
          duration: cam.transitionSpeed,
          easing: (t) => t * (2 - t),
        });
      }

      // Check if arrived (within 50m)
      const distToDest = Math.sqrt(Math.pow(lat - destLat, 2) + Math.pow(lng - destLng, 2)) * 111000;
      if (distToDest < 50) {
        setStatus("arrived");
        return;
      }

      // Fetch and draw route
      const version = ++routeVersionRef.current;
      const route = await fetchRoute(lng, lat, profile);
      if (version !== routeVersionRef.current) return;
      if (route) {
        setRouteInfo({ distance: route.distance, duration: route.duration, eta: route.eta });
        setCurrentStreet(route.street);
        setStatus("active");
        drawRoute(map, route.geometry.coordinates as [number, number][]);
        findCurrentStep(lat, lng, route.steps);
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => processPosition(pos),
      (err) => {
        setStatus("error");
        setErrorMsg(err.code === 1 ? "Permissão de localização negada" : "Erro ao obter localização");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => processPosition(pos),
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 }
    );
  }, [destLat, destLng, fetchRoute, drawRoute, createUserMarker, rotateArrow, calcBearing, getAdaptiveCamera, findCurrentStep]);

  // ── Transport mode selected ──
  const handleTransportSelect = (mode: TransportMode, profile: string) => {
    setTransportMode(mode);
    setOsrmProfile(profile);
    if (mapReady) startNavigation(mode, profile);
  };

  useEffect(() => {
    if (mapReady && transportMode && status === "choosing") {
      startNavigation(transportMode, osrmProfile);
    }
  }, [mapReady, transportMode, osrmProfile, status, startNavigation]);

  const handleRecenter = () => {
    const map = mapInstance.current;
    const pos = lastPositionRef.current;
    if (!map || !pos || !transportMode) return;
    const cam = getAdaptiveCamera(transportMode, lastSpeedRef.current);
    const bearingRad = (lastBearingRef.current * Math.PI) / 180;
    map.flyTo({
      center: [pos.lng + Math.sin(bearingRad) * cam.offsetDist, pos.lat + Math.cos(bearingRad) * cam.offsetDist],
      zoom: cam.zoom,
      pitch: cam.pitch,
      bearing: lastBearingRef.current,
      duration: 1000,
    });
  };

  const handleZoom = (delta: number) => {
    const map = mapInstance.current;
    if (!map) return;
    map.easeTo({ zoom: map.getZoom() + delta, duration: 300 });
  };

  const handleClose = () => {
    window.close();
    window.location.href = "/";
  };

  const modeLabel: Record<TransportMode, string> = {
    driving: "🚗 Carro",
    motorcycle: "🏍️ Moto",
    cycling: "🚲 Bicicleta",
    walking: "🚶 A pé",
  };

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] overflow-hidden touch-none" style={{ background: "hsl(230 18% 6%)" }}>
      {/* Fullscreen map */}
      <div ref={mapRef} className="absolute inset-0 w-full h-full" />

      <style>{`
        @viewport { width: device-width; height: device-height; }
        html, body, #root { overflow: hidden !important; height: 100dvh !important; }
      `}</style>

      {/* Transport mode selection */}
      <AnimatePresence>
        {!transportMode && <TransportModeModal onSelect={handleTransportSelect} />}
      </AnimatePresence>

      {/* Top bar - turn instructions + street */}
      <AnimatePresence>
        {status === "active" && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            className="absolute top-0 left-0 right-0 z-20 safe-area-top"
          >
            <div className="mx-3 mt-3 space-y-2">
              {/* Turn instruction */}
              <TurnInstruction step={currentStep} nextStep={nextStep} />

              {/* Street + mode indicator */}
              <div
                className="px-4 py-2.5 rounded-2xl flex items-center gap-3"
                style={{
                  background: "hsl(0 0% 0% / 0.65)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid hsl(0 0% 100% / 0.06)",
                }}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#7c3aed", boxShadow: "0 0 8px #7c3aed" }} />
                <div className="flex-1 min-w-0">
                  {currentStreet && (
                    <p className="text-sm font-bold text-foreground truncate">{currentStreet}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {transportMode && modeLabel[transportMode]} · Navegando
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "hsl(0 0% 100% / 0.08)" }}
                >
                  <X className="w-4 h-4 text-foreground/70" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom info panel */}
      <AnimatePresence>
        {status === "active" && routeInfo && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 z-20 safe-area-bottom"
          >
            <div
              className="mx-3 mb-3 px-5 py-4 rounded-2xl"
              style={{
                background: "hsl(0 0% 0% / 0.75)",
                backdropFilter: "blur(16px)",
                border: "1px solid hsl(0 0% 100% / 0.08)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-foreground">{routeInfo.duration}</span>
                  <span className="text-sm text-muted-foreground">{routeInfo.distance}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Chegada</p>
                  <p className="text-lg font-bold" style={{ color: "hsl(245 60% 70%)" }}>{routeInfo.eta}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "hsl(0 0% 100% / 0.1)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #7c3aed, #a78bfa)" }}
                    initial={{ width: "0%" }}
                    animate={{ width: "20%" }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{destAddress}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right controls */}
      {transportMode && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
          {[
            { icon: <Plus className="w-4 h-4" />, action: () => handleZoom(1) },
            { icon: <Minus className="w-4 h-4" />, action: () => handleZoom(-1) },
            { icon: <RotateCcw className="w-4 h-4" />, action: handleRecenter },
          ].map((btn, i) => (
            <button
              key={i}
              onClick={btn.action}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90"
              style={{
                background: "hsl(0 0% 0% / 0.55)",
                backdropFilter: "blur(12px)",
                border: "1px solid hsl(0 0% 100% / 0.08)",
              }}
            >
              <span className="text-foreground/80">{btn.icon}</span>
            </button>
          ))}
        </div>
      )}

      {/* Loading / Error states */}
      <AnimatePresence>
        {(status === "locating" || status === "routing") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center"
            style={{ background: "hsl(230 20% 5% / 0.6)" }}
          >
            <div className="flex flex-col items-center gap-3 px-6 py-5 rounded-2xl" style={{ background: "hsl(0 0% 0% / 0.7)", backdropFilter: "blur(12px)" }}>
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "hsl(245 60% 60%)", borderTopColor: "transparent" }} />
              <p className="text-sm font-medium text-foreground/80">
                {status === "locating" ? "Localizando..." : "Calculando rota..."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {status === "error" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: "hsl(230 20% 5% / 0.8)" }}>
          <div className="flex flex-col items-center gap-4 px-8 py-6 rounded-2xl max-w-xs text-center" style={{ background: "hsl(0 0% 0% / 0.7)" }}>
            <span className="text-4xl">📍</span>
            <p className="text-sm text-foreground/80">{errorMsg || "Erro na navegação"}</p>
            <button
              onClick={handleClose}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "hsl(245 60% 55%)", color: "white" }}
            >
              Voltar
            </button>
          </div>
        </div>
      )}

      {/* Arrived */}
      {status === "arrived" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: "hsl(230 20% 5% / 0.8)" }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-4 px-8 py-8 rounded-2xl max-w-xs text-center"
            style={{ background: "hsl(0 0% 0% / 0.7)", backdropFilter: "blur(16px)" }}
          >
            <span className="text-5xl">🎉</span>
            <h2 className="text-xl font-bold text-foreground">Você chegou!</h2>
            <p className="text-sm text-muted-foreground">{destAddress}</p>
            <button
              onClick={handleClose}
              className="w-full px-6 py-3 rounded-xl text-sm font-semibold"
              style={{ background: "hsl(245 60% 55%)", color: "white" }}
            >
              Fechar navegação
            </button>
          </motion.div>
        </div>
      )}

      <style>{`
        .safe-area-top { padding-top: env(safe-area-inset-top, 0px); }
        .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
      `}</style>
    </div>
  );
};

export default Navigation;
