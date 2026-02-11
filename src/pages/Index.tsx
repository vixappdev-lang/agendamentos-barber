import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Header from "@/components/Header";
import ServiceCard from "@/components/ServiceCard";
import BookingFlow from "@/components/BookingFlow";
import { services, type Service } from "@/data/services";

const Index = () => {
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Nossos <span className="gold-text">Serviços</span>
          </h2>
          <p className="text-muted-foreground mt-2">
            Escolha o serviço ideal e agende seu horário
          </p>
        </motion.div>

        <div className="space-y-4">
          {services.map((service, i) => (
            <ServiceCard
              key={service.id}
              service={service}
              onSelect={setSelectedService}
              index={i}
            />
          ))}
        </div>
      </main>

      <AnimatePresence>
        {selectedService && (
          <BookingFlow
            service={selectedService}
            onClose={() => setSelectedService(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
