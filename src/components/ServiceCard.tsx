import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import type { Service } from "@/data/services";

interface ServiceCardProps {
  service: Service;
  onSelect: (service: Service) => void;
  index: number;
}

const ServiceCard = ({ service, onSelect, index }: ServiceCardProps) => {
  const Icon = service.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="glass-card p-5 hover-lift cursor-pointer group"
      onClick={() => onSelect(service)}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
          <Icon className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg font-semibold text-foreground">
            {service.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
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

            <button className="px-4 py-2 rounded-lg gold-gradient text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
              Agendar
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ServiceCard;
