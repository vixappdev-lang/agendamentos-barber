import { motion, AnimatePresence } from "framer-motion";

export interface StepInstruction {
  maneuver: string;
  modifier?: string;
  name: string;
  distance: number;
}

const MANEUVER_ICONS: Record<string, string> = {
  "turn-left": "↰",
  "turn-right": "↱",
  "sharp left": "↰",
  "sharp right": "↱",
  "slight left": "↲",
  "slight right": "↳",
  "straight": "↑",
  "uturn": "↩",
  "roundabout": "⟳",
  "rotary": "⟳",
  "merge": "⤨",
  "fork": "⑂",
  "depart": "▶",
  "arrive": "🏁",
};

const getIcon = (maneuver: string, modifier?: string): string => {
  if (maneuver === "arrive") return "🏁";
  if (maneuver === "depart") return "▶";
  if (modifier) {
    const key = modifier.replace(" ", "-");
    if (MANEUVER_ICONS[key]) return MANEUVER_ICONS[key];
  }
  if (MANEUVER_ICONS[maneuver]) return MANEUVER_ICONS[maneuver];
  return "↑";
};

const getLabel = (maneuver: string, modifier?: string): string => {
  if (maneuver === "arrive") return "Chegou ao destino";
  if (maneuver === "depart") return "Siga em frente";
  if (maneuver === "roundabout" || maneuver === "rotary") return "Na rotatória";
  const modLabels: Record<string, string> = {
    left: "Vire à esquerda",
    right: "Vire à direita",
    "sharp left": "Curva acentuada à esquerda",
    "sharp right": "Curva acentuada à direita",
    "slight left": "Mantenha-se à esquerda",
    "slight right": "Mantenha-se à direita",
    straight: "Siga em frente",
    uturn: "Retorne",
  };
  if (modifier && modLabels[modifier]) return modLabels[modifier];
  return "Siga em frente";
};

const formatDistance = (meters: number): string => {
  if (meters < 100) return `${Math.round(meters)} m`;
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

interface TurnInstructionProps {
  step: StepInstruction | null;
  nextStep?: StepInstruction | null;
}

const TurnInstruction = ({ step, nextStep }: TurnInstructionProps) => {
  if (!step) return null;

  const icon = getIcon(step.maneuver, step.modifier);
  const label = getLabel(step.maneuver, step.modifier);
  const dist = formatDistance(step.distance);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${step.maneuver}-${step.name}-${step.distance}`}
        initial={{ y: -20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -20, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="flex items-center gap-3 px-4 py-3 rounded-2xl"
        style={{
          background: "hsl(245 60% 55% / 0.2)",
          border: "1px solid hsl(245 60% 55% / 0.3)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
          style={{ background: "hsl(245 60% 55% / 0.3)" }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground/60 uppercase tracking-wider">{dist}</p>
          <p className="text-sm font-bold text-foreground truncate">{label}</p>
          {step.name && (
            <p className="text-xs text-muted-foreground truncate">{step.name}</p>
          )}
        </div>
      </motion.div>
      {nextStep && nextStep.maneuver !== "arrive" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          className="flex items-center gap-2 px-4 py-1.5 mt-1"
        >
          <span className="text-xs text-muted-foreground">
            Depois: {getLabel(nextStep.maneuver, nextStep.modifier)}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TurnInstruction;
