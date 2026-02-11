import { motion } from "framer-motion";
import { Clock, ArrowRight } from "lucide-react";
import type { Service } from "@/data/services";

interface ServiceCardProps {
  service: Service;
  onSelect: (service: Service) => void;
  index: number;
}

const ServiceCard = ({ service, onSelect, index }: ServiceCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="glass-card hover-lift cursor-pointer group overflow-hidden rounded-2xl"
      onClick={() => onSelect(service)}
    >
      {/* Image on top */}
      <div className="relative w-full h-40 sm:h-48 overflow-hidden">
        <img
          src={service.image}
          alt={service.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
        {/* Price badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: 'hsl(0 0% 0% / 0.6)', backdropFilter: 'blur(8px)', color: 'hsl(0 0% 90%)' }}>
          <Clock className="w-3 h-3" />
          {service.duration}
        </div>
      </div>

      {/* Content below */}
      <div className="p-4">
        <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-snug">
          {service.title}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
          {service.subtitle}
        </p>

        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid hsl(0 0% 100% / 0.06)' }}>
          <span className="gold-text text-lg sm:text-xl font-bold">
            R$ {service.price}
          </span>
          <button
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm whitespace-nowrap rounded-xl font-semibold transition-all duration-300 uppercase tracking-wider"
            style={{ background: 'hsl(0 0% 12%)', color: 'hsl(0 0% 65%)', border: '1px solid hsl(0 0% 18%)' }}
          >
            Agendar Aqui <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ServiceCard;
