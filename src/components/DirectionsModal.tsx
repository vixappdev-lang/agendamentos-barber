import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, MapPin, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface DirectionsModalProps {
  onClose: () => void;
}

const DirectionsModal = ({ onClose }: DirectionsModalProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
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

  useEffect(() => {
    if (loading || !mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap',
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const customIcon = L.divIcon({
      html: `<div style="width:32px;height:32px;background:hsl(245 60% 55%);border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);"></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      className: "",
    });

    L.marker([lat, lng], { icon: customIcon }).addTo(map);
    mapInstance.current = map;

    return () => { map.remove(); mapInstance.current = null; };
  }, [loading, lat, lng]);

  const openGPS = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'hsl(230 20% 7% / 0.85)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="glass-card-strong w-full sm:max-w-lg overflow-hidden rounded-t-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid hsl(0 0% 100% / 0.06)' }}>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" style={{ color: 'hsl(245 60% 65%)' }} />
            <h3 className="text-lg font-bold text-foreground">Como Chegar</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ background: 'hsl(0 0% 100% / 0.05)' }}>
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Address */}
        {address && (
          <div className="px-4 pt-3">
            <div className="glass-card p-3 flex items-start gap-2">
              <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/80">{address}</p>
            </div>
          </div>
        )}

        {/* Map */}
        <div className="p-4">
          <div ref={mapRef} className="w-full h-[280px] rounded-xl overflow-hidden" style={{ background: 'hsl(230 18% 11%)' }} />
        </div>

        {/* GPS Button */}
        <div className="px-4 pb-4">
          <button
            onClick={openGPS}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'hsl(245 60% 55%)', color: 'white', boxShadow: '0 4px 20px hsl(245 60% 55% / 0.25)' }}>
            <Navigation className="w-4 h-4" /> Abrir no GPS
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DirectionsModal;
