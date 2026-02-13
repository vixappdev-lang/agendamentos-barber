import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Slice {
  id: string;
  label: string;
  icon: string;
  image_url?: string | null;
  discount_percent: number | null;
  discount_value: number | null;
  custom_prize: string | null;
  probability: number;
}

const ITEM_WIDTH = 100;
const VISIBLE_ITEMS = 5;

const PrizeWheel = ({ onClose }: { onClose: () => void }) => {
  const [slices, setSlices] = useState<Slice[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Slice | null>(null);
  const [offset, setOffset] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("prize_wheel_slices").select("*").eq("active", true).order("sort_order");
      if (data && data.length > 0) setSlices(data as Slice[]);
    };
    fetch();
  }, []);

  // Build a long repeated belt for infinite scroll illusion
  const beltItems = slices.length > 0 ? [...slices, ...slices, ...slices, ...slices, ...slices, ...slices, ...slices, ...slices] : [];
  const centerOffset = ITEM_WIDTH * (VISIBLE_ITEMS / 2 - 0.5);

  const spin = () => {
    if (spinning || slices.length === 0) return;
    setSpinning(true);
    setResult(null);
    setShowConfetti(false);

    // Weighted random
    const totalProb = slices.reduce((s, sl) => s + sl.probability, 0);
    let rand = Math.random() * totalProb;
    let winnerIndex = 0;
    for (let i = 0; i < slices.length; i++) {
      rand -= slices[i].probability;
      if (rand <= 0) { winnerIndex = i; break; }
    }

    // Calculate target position: 3 full cycles + winner position
    const fullCycles = 3;
    const targetIndex = fullCycles * slices.length + winnerIndex;
    const targetOffset = targetIndex * ITEM_WIDTH;

    // Animate with CSS transition via offset
    setOffset(targetOffset);

    // Wait for animation to complete
    setTimeout(() => {
      setSpinning(false);
      setResult(slices[winnerIndex]);
      setShowConfetti(true);
    }, 4000);
  };

  const getPrizeText = (slice: Slice) => {
    if (slice.discount_percent) return `${Number(slice.discount_percent)}% OFF`;
    if (slice.discount_value) return `R$ ${Number(slice.discount_value).toFixed(2)} OFF`;
    if (slice.custom_prize) return slice.custom_prize;
    return slice.label;
  };

  if (slices.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: "hsl(0 0% 0% / 0.85)", backdropFilter: "blur(16px)" }}>
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
        className="glass-card-strong w-full max-w-sm p-5 flex flex-col items-center gap-5 relative overflow-hidden">
        
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg z-10" style={{ background: "hsl(0 0% 100% / 0.05)" }}>
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5" style={{ color: "hsl(245 60% 65%)" }} />
          <h2 className="text-lg font-bold text-foreground">Roleta Premiada</h2>
        </div>

        {/* Double-style conveyor belt */}
        <div className="w-full relative" style={{ height: "130px" }}>
          {/* Center indicator */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 w-0.5 h-full" style={{ background: "hsl(245 60% 55%)", boxShadow: "0 0 12px hsl(245 60% 55% / 0.6)" }} />
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 w-3 h-3 rotate-45" style={{ background: "hsl(245 60% 55%)", boxShadow: "0 0 8px hsl(245 60% 55% / 0.5)" }} />

          {/* Side blur masks */}
          <div className="absolute inset-y-0 left-0 w-16 z-10 pointer-events-none" style={{ background: "linear-gradient(to right, hsl(0 0% 100% / 0.06), transparent)" }} />
          <div className="absolute inset-y-0 right-0 w-16 z-10 pointer-events-none" style={{ background: "linear-gradient(to left, hsl(0 0% 100% / 0.06), transparent)" }} />

          {/* Belt container */}
          <div ref={containerRef} className="w-full h-full overflow-hidden relative">
            <div className="flex h-full items-center absolute top-0"
              style={{
                transform: `translateX(${centerOffset - offset}px)`,
                transition: spinning ? "transform 4s cubic-bezier(0.15, 0.85, 0.25, 1)" : "none",
              }}>
              {beltItems.map((slice, i) => (
                <div key={`${slice.id}-${i}`}
                  className="flex flex-col items-center justify-center shrink-0 gap-1.5 p-2 rounded-xl mx-0.5"
                  style={{
                    width: `${ITEM_WIDTH - 4}px`,
                    height: "110px",
                    background: "hsl(0 0% 100% / 0.03)",
                    border: "1px solid hsl(0 0% 100% / 0.06)",
                  }}>
                  {slice.image_url ? (
                    <img src={slice.image_url} alt={slice.label} className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: "hsl(0 0% 100% / 0.05)" }}>
                      {slice.icon}
                    </div>
                  )}
                  <span className="text-[9px] font-bold text-foreground/80 leading-tight text-center line-clamp-2">{getPrizeText(slice)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Confetti */}
        <AnimatePresence>
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
              {Array.from({ length: 30 }).map((_, i) => (
                <motion.div key={i}
                  initial={{ y: -20, x: Math.random() * 300, opacity: 1, rotate: 0, scale: 1 }}
                  animate={{ y: 400, opacity: 0, rotate: Math.random() * 720 - 360, scale: Math.random() * 0.5 + 0.5 }}
                  transition={{ duration: 2 + Math.random() * 2, delay: Math.random() * 0.5 }}
                  className="absolute w-2 h-2 rounded-sm"
                  style={{
                    background: `hsl(${Math.random() * 360} 70% 60%)`,
                    left: `${Math.random() * 100}%`,
                  }}
                />
              ))}
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {result ? (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full text-center space-y-3">
              <div className="text-3xl">🎉</div>
              <h3 className="text-lg font-bold text-foreground">Parabéns!</h3>
              <p className="text-sm text-muted-foreground">Você ganhou:</p>
              <div className="py-3 px-4 rounded-xl" style={{ background: "hsl(245 60% 55% / 0.1)", border: "1px solid hsl(245 60% 55% / 0.2)" }}>
                <p className="text-base font-bold" style={{ color: "hsl(245 60% 70%)" }}>
                  {result.image_url ? <img src={result.image_url} alt="" className="w-8 h-8 rounded-lg inline-block mr-2 align-middle" /> : result.icon} {getPrizeText(result)}
                </p>
              </div>
              <button onClick={onClose} className="w-full py-3 rounded-xl font-semibold text-sm transition-all" style={{ background: "hsl(245 60% 55%)", color: "white" }}>
                Aproveitar!
              </button>
            </motion.div>
          ) : (
            <button onClick={spin} disabled={spinning}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all uppercase tracking-wider flex items-center justify-center gap-2"
              style={{
                background: spinning ? "hsl(0 0% 100% / 0.05)" : "hsl(245 60% 55%)",
                color: spinning ? "hsl(0 0% 50%)" : "white",
              }}>
              {spinning ? (
                <><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "hsl(0 0% 50%)", borderTopColor: "transparent" }} /> Sorteando...</>
              ) : "🎰 Girar Roleta"}
            </button>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default PrizeWheel;
