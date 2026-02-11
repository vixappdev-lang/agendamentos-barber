import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Scissors, Star } from "lucide-react";
import Header from "@/components/Header";
import ServiceCard from "@/components/ServiceCard";
import BookingFlow from "@/components/BookingFlow";
import Footer from "@/components/Footer";
import { services, type Service } from "@/data/services";

const Index = () => {
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  return (
    <div className="min-h-screen min-h-[100dvh] relative">
      <div className="relative z-10">
        <Header />

        <main className="container mx-auto px-3 min-[375px]:px-4 py-8 min-[375px]:py-10 max-w-2xl">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8 min-[375px]:mb-12"
          >
            <div className="glass-chip inline-flex items-center gap-2 px-3 min-[375px]:px-4 py-1.5 rounded-full text-primary text-[11px] min-[375px]:text-xs font-semibold mb-4 min-[375px]:mb-5">
              <Star className="w-3 h-3" /> Agendamento Online
            </div>
            <h2 className="text-2xl min-[375px]:text-3xl sm:text-5xl font-extrabold text-foreground leading-tight tracking-tight">
              Estilo e precisão<br />
              <span className="gold-text">sob medida</span>
            </h2>
            <p className="text-muted-foreground mt-3 min-[375px]:mt-4 max-w-md mx-auto text-xs min-[375px]:text-sm sm:text-base leading-relaxed px-2">
              Escolha seu serviço, barbeiro e horário preferido. Agendamento rápido e confirmação instantânea pelo WhatsApp.
            </p>
          </motion.div>

          {/* Services label */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-4 min-[375px]:mb-6"
          >
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-primary" />
              <h3 className="text-[10px] min-[375px]:text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em]">Serviços</h3>
            </div>
          </motion.div>

          <div className="space-y-3 min-[375px]:space-y-4">
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

        <Footer />
      </div>

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
