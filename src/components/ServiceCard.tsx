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
      className="glass-card hover-lift cursor-pointer group overflow-hidden"
      onClick={() => onSelect(service)}
    >
      <div className="flex items-stretch">
        {/* Image */}
        <div className="w-28 sm:w-32 shrink-0 overflow-hidden rounded-l-2xl relative">
          <img
            src={service.image}
            alt={service.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/40" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-[15px] sm:text-lg font-bold text-foreground tracking-tight leading-snug">
              {service.title}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed line-clamp-1">
              {service.subtitle}
            </p>
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2.5">
              <span className="gold-text text-lg font-bold leading-none">
                R$ {service.price}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                {service.duration}
              </span>
            </div>

            <button
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs whitespace-nowrap rounded-xl font-semibold transition-all duration-300"
              style={{ background: 'hsl(0 0% 12%)', color: 'hsl(0 0% 65%)', border: '1px solid hsl(0 0% 18%)' }}
            >
              Agendar Aqui <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ServiceCard;
