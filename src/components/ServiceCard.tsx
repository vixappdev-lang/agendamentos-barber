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
      <div className="flex items-center gap-0">
        {/* Realistic image */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 overflow-hidden rounded-l-2xl">
          <img
            src={service.image}
            alt={service.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-4 sm:p-5">
          <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
            {service.title}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed line-clamp-1">
            {service.subtitle}
          </p>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3">
              <span className="gold-text text-lg font-bold">
                R$ {service.price}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {service.duration}
              </span>
            </div>

            <button className="btn-primary flex items-center gap-1.5 !px-4 !py-2 text-xs sm:text-sm">
              Agendar <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ServiceCard;
