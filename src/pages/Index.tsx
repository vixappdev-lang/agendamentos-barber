import { useState, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Scissors, Search, ShoppingBag, Package } from "lucide-react";
import Header from "@/components/Header";
import ServiceCard from "@/components/ServiceCard";
import ProductCard from "@/components/ProductCard";
import BookingFlow from "@/components/BookingFlow";
import GoogleAuthModal from "@/components/GoogleAuthModal";
import Footer from "@/components/Footer";
import DirectionsModal from "@/components/DirectionsModal";
import PrizeWheel from "@/components/PrizeWheel";
import CheckoutModal from "@/components/store/CheckoutModal";
import OrderTracker from "@/components/store/OrderTracker";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { stockImages } from "@/data/stockImages";

import imgCorte from "@/assets/service-corte.jpg";
import imgBarba from "@/assets/service-barba.jpg";
import imgCombo from "@/assets/service-combo.jpg";
import imgSobrancelha from "@/assets/service-sobrancelha.jpg";
import imgHidratacao from "@/assets/service-hidratacao.jpg";
import imgPremium from "@/assets/service-premium.jpg";

const fallbackImages: Record<string, string> = {
  "Corte Masculino": imgCorte, "Barba": imgBarba, "Corte + Barba": imgCombo,
  "Sobrancelha": imgSobrancelha, "Hidratação Capilar": imgHidratacao, "Dia do Noivo": imgPremium,
};

interface DBService {
  id: string; title: string; subtitle: string | null; price: number;
  duration: string; image_url: string | null; active: boolean; sort_order: number | null;
}

interface DBProduct {
  id: string; title: string; description: string | null; price: number;
  image_url: string | null; active: boolean; sort_order: number;
}

interface CartItem {
  id: string; title: string; price: number; quantity: number; image_url: string | null;
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

type MainTab = "services" | "store";

const Index = () => {
  const [services, setServices] = useState<DBService[]>([]);
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingService, setPendingService] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showDirections, setShowDirections] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>("services");
  const [storeEnabled, setStoreEnabled] = useState(false);
  const [wheelEnabled, setWheelEnabled] = useState(false);
  const [showWheel, setShowWheel] = useState(false);
  const [storeOrderMode, setStoreOrderMode] = useState<"ifood" | "whatsapp">("whatsapp");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showOrderTracker, setShowOrderTracker] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixType, setPixType] = useState("cpf");
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();

  useEffect(() => {
    const fetchAll = async () => {
      const [servicesRes, productsRes, settingsRes] = await Promise.all([
        supabase.from("services").select("*").eq("active", true).order("sort_order"),
        supabase.from("products").select("*").eq("active", true).order("sort_order"),
        supabase.from("business_settings").select("*"),
      ]);
      if (servicesRes.data) setServices(servicesRes.data as DBService[]);
      if (productsRes.data) setProducts(productsRes.data as DBProduct[]);
      if (settingsRes.data) {
        const map: Record<string, string> = {};
        for (const row of settingsRes.data) map[row.key] = row.value || "";
        setStoreEnabled(map.store_enabled === "true");
        setWheelEnabled(map.prize_wheel_enabled === "true");
        setStoreOrderMode((map.store_order_mode as any) || "whatsapp");
        setWhatsappNumber(map.whatsapp_number || "");
        setPixKey(map.pix_key || "");
        setPixType(map.pix_type || "cpf");
      }
    };
    fetchAll();
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

  const filteredProducts = useMemo(() => {
    if (!search) return products;
    return products.filter((p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) || (p.description || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [search, products]);

  const handleServiceSelect = (service: DBService) => {
    const mapped = {
      id: service.id, title: service.title, subtitle: service.subtitle || "",
      price: service.price, duration: service.duration, image: resolveImageUrl(service),
    };
    if (user) { setSelectedService(mapped); }
    else { setPendingService(mapped); setShowAuthModal(true); }
  };

  const handleAddToCart = (product: DBProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id: product.id, title: product.title, price: product.price, quantity: 1, image_url: product.image_url }];
    });
  };

  const handleGoogleSignIn = async () => { await signInWithGoogle(); };

  if (user && pendingService && !selectedService) {
    setSelectedService(pendingService);
    setPendingService(null);
    setShowAuthModal(false);
  }

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="min-h-screen min-h-[100dvh] relative">
      <div className="relative z-10">
        <Header user={user} onSignOut={signOut} onCategorySelect={setActiveCategory} onDirections={() => setShowDirections(true)} onOpenWheel={() => setShowWheel(true)} />

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

          {/* Main Tabs */}
          {storeEnabled && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 mb-5">
              {([
                { id: "services" as MainTab, label: "Agendar", icon: <Scissors className="w-4 h-4" /> },
                { id: "store" as MainTab, label: "Loja", icon: <ShoppingBag className="w-4 h-4" /> },
              ]).map((tab) => (
                <button key={tab.id} onClick={() => setMainTab(tab.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={{
                    background: mainTab === tab.id ? 'hsl(0 0% 90%)' : 'hsl(0 0% 100% / 0.04)',
                    color: mainTab === tab.id ? 'hsl(230 20% 7%)' : 'hsl(0 0% 55%)',
                    border: `1px solid ${mainTab === tab.id ? 'transparent' : 'hsl(0 0% 100% / 0.08)'}`,
                  }}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </motion.div>
          )}

          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-5 min-[375px]:mb-6 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Faça a sua busca..." value={search} onChange={(e) => setSearch(e.target.value)} className="glass-input !pl-10" />
            </div>
          </motion.div>

          {mainTab === "services" ? (
            <>
              {/* Categories */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 min-[375px]:mb-8 pb-1">
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs min-[375px]:text-sm font-medium transition-all duration-200"
                    style={{
                      background: activeCategory === cat.id ? 'hsl(0 0% 90%)' : 'hsl(0 0% 100% / 0.04)',
                      color: activeCategory === cat.id ? 'hsl(230 20% 7%)' : 'hsl(0 0% 55%)',
                      border: `1px solid ${activeCategory === cat.id ? 'transparent' : 'hsl(0 0% 100% / 0.08)'}`,
                    }}>
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
            </>
          ) : (
            <>
              {/* Store header with order tracker */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 min-[375px]:mb-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-primary" />
                    <h3 className="text-[10px] min-[375px]:text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em]">Nossos Produtos</h3>
                  </div>
                  <button onClick={() => setShowOrderTracker(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all"
                    style={{ background: "hsl(45 100% 50% / 0.1)", color: "hsl(45 100% 55%)", border: "1px solid hsl(45 100% 50% / 0.2)" }}>
                    <Package className="w-3.5 h-3.5" /> Meus Pedidos
                  </button>
                </div>
              </motion.div>

              <div className="space-y-3 min-[375px]:space-y-4">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product, i) => (
                    <ProductCard
                      key={product.id}
                      product={{ ...product, description: product.description || "" }}
                      onSelect={() => handleAddToCart(product)}
                      index={i}
                    />
                  ))
                ) : (
                  <div className="glass-card p-8 text-center">
                    <p className="text-muted-foreground text-sm">Nenhum produto encontrado.</p>
                  </div>
                )}
              </div>

              {/* Floating cart bar */}
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                    className="fixed bottom-6 left-4 right-4 max-w-2xl mx-auto z-40">
                    <button onClick={() => setShowCheckout(true)}
                      className="w-full flex items-center justify-between px-5 py-4 rounded-2xl font-bold text-sm transition-all"
                      style={{ background: "hsl(45 100% 50%)", color: "hsl(0 0% 0%)", boxShadow: "0 8px 32px hsl(45 100% 50% / 0.4)" }}>
                      <span className="flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5" />
                        {cartCount} {cartCount === 1 ? "item" : "itens"}
                      </span>
                      <span>R$ {cartTotal.toFixed(2)}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
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

      <AnimatePresence>
        {showDirections && <DirectionsModal onClose={() => setShowDirections(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showWheel && <PrizeWheel onClose={() => setShowWheel(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showOrderTracker && (
          <OrderTracker onClose={() => setShowOrderTracker(false)} customerPhone="" />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCheckout && (
          <CheckoutModal
            items={cart}
            onClose={() => setShowCheckout(false)}
            onSuccess={() => { setShowCheckout(false); setCart([]); }}
            mode={storeOrderMode}
            whatsappNumber={whatsappNumber}
            pixKey={pixKey}
            pixType={pixType}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
