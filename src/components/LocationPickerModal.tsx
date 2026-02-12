import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X, MapPin, Search, Check } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LocationPickerModalProps {
  onClose: () => void;
  onConfirm: (address: string, lat: string, lng: string) => void;
  initialAddress?: string;
  initialLat?: string;
  initialLng?: string;
}

const LocationPickerModal = ({ onClose, onConfirm, initialAddress, initialLat, initialLng }: LocationPickerModalProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [address, setAddress] = useState(initialAddress || "");
  const [lat, setLat] = useState(initialLat || "-23.5505");
  const [lng, setLng] = useState(initialLng || "-46.6333");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const initLat = parseFloat(lat) || -23.5505;
    const initLng = parseFloat(lng) || -46.6333;

    const map = L.map(mapRef.current, {
      center: [initLat, initLng],
      zoom: 15,
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

    const marker = L.marker([initLat, initLng], { draggable: true, icon: customIcon }).addTo(map);
    markerRef.current = marker;

    marker.on("dragend", async () => {
      const pos = marker.getLatLng();
      setLat(pos.lat.toFixed(6));
      setLng(pos.lng.toFixed(6));
      // Reverse geocode
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.lat}&lon=${pos.lng}&format=json`);
        const data = await res.json();
        if (data.display_name) setAddress(data.display_name);
      } catch {}
    });

    map.on("click", async (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      marker.setLatLng([clickLat, clickLng]);
      setLat(clickLat.toFixed(6));
      setLng(clickLng.toFixed(6));
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${clickLat}&lon=${clickLng}&format=json`);
        const data = await res.json();
        if (data.display_name) setAddress(data.display_name);
      } catch {}
    });

    mapInstance.current = map;

    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  const handleSearch = async () => {
    if (!address.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
      const data = await res.json();
      if (data[0]) {
        const newLat = parseFloat(data[0].lat);
        const newLng = parseFloat(data[0].lon);
        setLat(newLat.toFixed(6));
        setLng(newLng.toFixed(6));
        setAddress(data[0].display_name);
        mapInstance.current?.setView([newLat, newLng], 16);
        markerRef.current?.setLatLng([newLat, newLng]);
      }
    } catch {}
    setSearching(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'hsl(230 20% 7% / 0.9)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-card-strong w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid hsl(0 0% 100% / 0.06)' }}>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" style={{ color: 'hsl(245 60% 65%)' }} />
            <h3 className="text-lg font-bold text-foreground">Selecionar Localização</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ background: 'hsl(0 0% 100% / 0.05)' }}>
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 flex gap-2">
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
            className="px-4 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'hsl(245 60% 55%)', color: 'white' }}>
            {searching ? "..." : "Buscar"}
          </button>
        </div>

        {/* Map */}
        <div ref={mapRef} className="w-full h-[350px]" style={{ background: 'hsl(230 18% 11%)' }} />

        {/* Footer */}
        <div className="p-4 flex items-center justify-between" style={{ borderTop: '1px solid hsl(0 0% 100% / 0.06)' }}>
          <p className="text-xs text-muted-foreground truncate flex-1 mr-3">
            {address || "Clique no mapa ou busque um endereço"}
          </p>
          <button
            onClick={() => onConfirm(address, lat, lng)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'hsl(245 60% 55%)', color: 'white', boxShadow: '0 4px 16px hsl(245 60% 55% / 0.25)' }}>
            <Check className="w-4 h-4" /> Confirmar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LocationPickerModal;
