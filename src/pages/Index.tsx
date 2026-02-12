import { useState, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Scissors, Search } from "lucide-react";
import Header from "@/components/Header";
import ServiceCard from "@/components/ServiceCard";
import BookingFlow from "@/components/BookingFlow";
import GoogleAuthModal from "@/components/GoogleAuthModal";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { stockImages } from "@/data/stockImages";

// Fallback images from static assets
import imgCorte from "@/assets/service-corte.jpg";
import imgBarba from "@/assets/service-barba.jpg";
import imgCombo from "@/assets/service-combo.jpg";
import imgSobrancelha from "@/assets/service-sobrancelha.jpg";
import imgHidratacao from "@/assets/service-hidratacao.jpg";
import imgPremium from "@/assets/service-premium.jpg";

const fallbackImages: Record<string, string> = {
  "Corte Masculino": imgCorte,
  "Barba": imgBarba,
  "Corte + Barba": imgCombo,
  "Sobrancelha": imgSobrancelha,
  "Hidratação Capilar": imgHidratacao,
  "Dia do Noivo": imgPremium,
};

interface DBService {
  id: string;
  title: string;
  subtitle: string | null;
  price: number;
  duration: string;
  image_url: string | null;
  active: boolean;
  sort_order: number | null;
}

const resolveImageUrl = (service: DBService): string => {
  const url = service.image_url;
  if (url && url.startsWith("stock://")) {
    const stockId = url.replace("stock://", "");
    const stock = stockImages.find(s => s.id === stockId);
    return stock?.src || fallbackImages[service.title] || imgCorte;
  }
  if (url && url.startsWith("http")) return url;
  return fallbackImages[service.title] || imgCorte;
};

const categories = [
  { id: "all", label: "Todos", icon: "✨" },
  { id: "cabelo", label: "Cabelo", icon: "✂️" },
  { id: "barba", label: "Barba", icon: "🪒" },
  { id: "combo", label: "Combos", icon: "👑" },
  { id: "extras", label: "Extras", icon: "💎" },
];

const guessCategoryFromTitle = (title: string): string => {
  const lower = title.toLowerCase();
  if (lower.includes("combo") || lower.includes("noivo") || (lower.includes("corte") && lower.includes("barba"))) return "combo";
  if (lower.includes("barba")) return "barba";
  if (lower.includes("corte") || lower.includes("degradê") || lower.includes("degrade") || lower.includes("cabelo")) return "cabelo";
  return "extras";
};

const Index = () => {
  const [services, setServices] = useState<DBService[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingService, setPendingService] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();

  useEffect(() => {
    const fetchServices = async () => {
      const { data } = await supabase.from("services").select("*").eq("active", true).order("sort_order");
      if (data) setServices(data as DBService[]);
    };
    fetchServices();
  }, []);

  const now = new Date();
  const weekday = now.toLocaleDateString("pt-BR", { weekday: "long" });
  const day = now.getDate();
  const month = now.toLocaleDateString("pt-BR", { month: "long" });
  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) || (s.subtitle || "").toLowerCase().includes(search.toLowerCase());
      const cat = guessCategoryFromTitle(s.title);
      const matchesCategory = activeCategory === "all" || cat === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory, services]);

  const handleServiceSelect = (service: DBService) => {
    const mapped = {
      id: service.id,
      title: service.title,
      subtitle: service.subtitle || "",
      price: service.price,
      duration: service.duration,
      image: resolveImageUrl(service),
    };
    if (user) {
      setSelectedService(mapped);
    } else {
      setPendingService(mapped);
      setShowAuthModal(true);
    }
  };

  const handleGoogleSignIn = async () => { await signInWithGoogle(); };

  if (user && pendingService && !selectedService) {
    setSelectedService(pendingService);
    setPendingService(null);
    setShowAuthModal(false);
  }

  return (
    <div className="min-h-screen min-h-[100dvh] relative">
      <div className="relative z-10">
        <Header user={user} onSignOut={signOut} onCategorySelect={setActiveCategory} />

        <main className="container mx-auto px-3 min-[375px]:px-4 py-6 min-[375px]:py-8 max-w-2xl">
          {/* Greeting */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6 min-[375px]:mb-8">
            <h2 className="text-xl min-[375px]:text-2xl sm:text-3xl font-extrabold text-foreground leading-tight tracking-tight">
              Olá, seja bem vindo!
            </h2>
            <p className="text-sm min-[375px]:text-base text-muted-foreground mt-1">
              {capitalizedWeekday}, {day} de {month}
            </p>
          </motion.div>

          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-5 min-[375px]:mb-6 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Faça a sua busca..." value={search} onChange={(e) => setSearch(e.target.value)} className="glass-input !pl-10" />
            </div>
          </motion.div>

          {/* Categories */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 min-[375px]:mb-8 pb-1">
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs min-[375px]:text-sm font-medium transition-all duration-200"
                style={{
                  background: activeCategory === cat.id ? 'hsl(0 0% 90%)' : 'hsl(0 0% 100% / 0.04)',
                  color: activeCategory === cat.id ? 'hsl(230 20% 7%)' : 'hsl(0 0% 55%)',
                  border: `1px solid ${activeCategory === cat.id ? 'transparent' : 'hsl(0 0% 100% / 0.08)'}`,
                }}
              >
                <span>{cat.icon}</span> {cat.label}
              </button>
            ))}
          </motion.div>

          {/* Services label */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-4 min-[375px]:mb-5">
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-primary" />
              <h3 className="text-[10px] min-[375px]:text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em]">Faça sua reserva</h3>
            </div>
          </motion.div>

          <div className="space-y-3 min-[375px]:space-y-4">
            {filteredServices.length > 0 ? (
              filteredServices.map((service, i) => (
                <ServiceCard
                  key={service.id}
                  service={{ ...service, subtitle: service.subtitle || "", image: resolveImageUrl(service), icon: Scissors }}
                  onSelect={() => handleServiceSelect(service)}
                  index={i}
                />
              ))
            ) : (
              <div className="glass-card p-8 text-center">
                <p className="text-muted-foreground text-sm">Nenhum serviço encontrado.</p>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>

      <AnimatePresence>
        {selectedService && <BookingFlow service={selectedService} onClose={() => setSelectedService(null)} user={user} />}
      </AnimatePresence>

      <AnimatePresence>
        {showAuthModal && (
          <GoogleAuthModal onClose={() => { setShowAuthModal(false); setPendingService(null); }} onSignIn={handleGoogleSignIn} loading={authLoading} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
