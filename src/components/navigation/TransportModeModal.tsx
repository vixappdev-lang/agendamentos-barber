import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export type TransportMode = "driving" | "motorcycle" | "cycling" | "walking";

interface TransportOption {
  id: TransportMode;
  label: string;
  emoji: string;
  description: string;
  osrmProfile: string;
}

const TRANSPORT_OPTIONS: TransportOption[] = [
  { id: "driving", label: "Carro", emoji: "🚗", description: "Rota mais rápida por vias principais", osrmProfile: "driving" },
  { id: "motorcycle", label: "Moto", emoji: "🏍️", description: "Rotas curtas e alternativas", osrmProfile: "driving" },
  { id: "cycling", label: "Bicicleta", emoji: "🚲", description: "Trajetos seguros e ciclovias", osrmProfile: "cycling" },
  { id: "walking", label: "A pé", emoji: "🚶", description: "Menor distância, caminhos diretos", osrmProfile: "foot" },
];

interface TransportModeModalProps {
  onSelect: (mode: TransportMode, osrmProfile: string) => void;
}

export const getOsrmProfile = (mode: TransportMode): string => {
  return TRANSPORT_OPTIONS.find(o => o.id === mode)?.osrmProfile || "driving";
};

export const getModeConfig = (mode: TransportMode) => {
  const configs: Record<TransportMode, { avgSpeed: number; zoomLevel: number; pitch: number; cameraDistance: number; transitionSpeed: number }> = {
    driving: { avgSpeed: 40, zoomLevel: 17, pitch: 72, cameraDistance: 200, transitionSpeed: 1200 },
    motorcycle: { avgSpeed: 35, zoomLevel: 17.2, pitch: 70, cameraDistance: 180, transitionSpeed: 1000 },
    cycling: { avgSpeed: 15, zoomLevel: 17.8, pitch: 62, cameraDistance: 120, transitionSpeed: 1800 },
    walking: { avgSpeed: 5, zoomLevel: 18.5, pitch: 55, cameraDistance: 80, transitionSpeed: 2200 },
  };
  return configs[mode];
};

const TransportModeModal = ({ onSelect }: TransportModeModalProps) => {
  const [selected, setSelected] = useState<TransportMode | null>(null);

  const handleSelect = (option: TransportOption) => {
    setSelected(option.id);
    setTimeout(() => onSelect(option.id, option.osrmProfile), 400);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      style={{ background: "hsl(230 20% 5% / 0.95)", backdropFilter: "blur(20px)" }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-sm pb-safe"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: "hsl(245 60% 55% / 0.15)", border: "1px solid hsl(245 60% 55% / 0.2)" }}
          >
            <span className="text-3xl">🧭</span>
          </motion.div>
          <h2 className="text-xl font-bold text-foreground mb-1">Como você vai?</h2>
          <p className="text-sm text-muted-foreground">Escolha o meio de transporte para personalizar sua rota</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {TRANSPORT_OPTIONS.map((option, i) => (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              onClick={() => handleSelect(option)}
              className="relative flex flex-col items-center gap-2 p-5 rounded-2xl transition-all active:scale-95"
              style={{
                background: selected === option.id
                  ? "hsl(245 60% 55% / 0.2)"
                  : "hsl(0 0% 100% / 0.05)",
                border: `1px solid ${selected === option.id ? "hsl(245 60% 55% / 0.4)" : "hsl(0 0% 100% / 0.08)"}`,
                boxShadow: selected === option.id ? "0 0 20px hsl(245 60% 55% / 0.15)" : "none",
              }}
            >
              <span className="text-4xl">{option.emoji}</span>
              <span className="text-sm font-semibold text-foreground">{option.label}</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{option.description}</span>
              {selected === option.id && (
                <motion.div
                  layoutId="selected-ring"
                  className="absolute inset-0 rounded-2xl"
                  style={{ border: "2px solid hsl(245 60% 55%)", pointerEvents: "none" }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TransportModeModal;
