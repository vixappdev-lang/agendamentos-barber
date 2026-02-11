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
        {/* Realistic image */}
        <div className="w-20 min-[375px]:w-24 sm:w-28 shrink-0 overflow-hidden rounded-l-2xl relative">
          <img
            src={service.image}
            alt={service.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/40" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-3 min-[375px]:p-4 sm:p-5 flex flex-col justify-center">
          <h3 className="text-sm min-[375px]:text-base sm:text-lg font-bold text-foreground tracking-tight leading-tight">
            {service.title}
          </h3>
          <p className="text-[11px] min-[375px]:text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed line-clamp-1">
            {service.subtitle}
          </p>

          <div className="flex items-center justify-between mt-2 min-[375px]:mt-3 gap-2">
            <div className="flex items-center gap-2 min-[375px]:gap-3">
              <span className="gold-text text-base min-[375px]:text-lg font-bold">
                R$ {service.price}
              </span>
              <span className="flex items-center gap-1 text-[10px] min-[375px]:text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {service.duration}
              </span>
            </div>

            <button className="flex items-center justify-center gap-1.5 px-4 py-2 min-[375px]:px-5 min-[375px]:py-2.5 text-[11px] min-[375px]:text-xs sm:text-sm whitespace-nowrap rounded-xl w-full sm:w-auto font-semibold transition-all duration-300" style={{ background: 'hsl(220 30% 18%)', color: 'hsl(220 20% 85%)' }}>
              Agendar Aqui <ArrowRight className="w-3 h-3 min-[375px]:w-3.5 min-[375px]:h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ServiceCard;
