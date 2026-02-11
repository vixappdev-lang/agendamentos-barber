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
      {/* Mobile: stack vertical / Desktop: horizontal */}
      <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-stretch">
        {/* Image */}
        <div className="h-36 min-[420px]:h-auto min-[420px]:w-24 sm:w-28 shrink-0 overflow-hidden rounded-t-2xl min-[420px]:rounded-t-none min-[420px]:rounded-l-2xl relative">
          <img
            src={service.image}
            alt={service.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b min-[420px]:bg-gradient-to-r from-transparent to-background/50" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col justify-center">
          <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-tight">
            {service.title}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
            {service.subtitle}
          </p>

          <div className="flex items-center justify-between mt-3 gap-3">
            <div className="flex items-center gap-3">
              <span className="gold-text text-lg font-bold">
                R$ {service.price}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {service.duration}
              </span>
            </div>

            <button className="hidden min-[420px]:flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs sm:text-sm whitespace-nowrap rounded-xl font-semibold transition-all duration-300" style={{ background: 'hsl(0 0% 12%)', color: 'hsl(0 0% 65%)', border: '1px solid hsl(0 0% 18%)' }}>
              Agendar <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Full-width button on small screens */}
          <button className="flex min-[420px]:hidden items-center justify-center gap-2 w-full mt-3 px-4 py-2.5 text-sm rounded-xl font-semibold transition-all duration-300" style={{ background: 'hsl(0 0% 12%)', color: 'hsl(0 0% 65%)', border: '1px solid hsl(0 0% 18%)' }}>
            Agendar Aqui <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ServiceCard;
