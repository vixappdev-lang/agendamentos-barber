import { useState, useMemo, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, Search, Package, ArrowLeft, ChevronLeft, ChevronRight, Sparkles, Truck, ShieldCheck, Star } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import CheckoutModal from "@/components/store/CheckoutModal";
import OrderTracker from "@/components/store/OrderTracker";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useThemeColors } from "@/hooks/useThemeColors";
import storeHero from "@/assets/styllus/store-hero.jpg";

interface DBProduct {
  id: string; title: string; description: string | null; price: number;
  image_url: string | null; active: boolean; sort_order: number;
}

interface CartItem {
  id: string; title: string; price: number; quantity: number; image_url: string | null;
}

const StorePage = () => {
  const navigate = useNavigate();
  const t = useThemeColors();
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOrderTracker, setShowOrderTracker] = useState(false);
  const [storeEnabled, setStoreEnabled] = useState(true);
  const [storeOrderMode, setStoreOrderMode] = useState<"ifood" | "whatsapp">("whatsapp");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixType, setPixType] = useState("cpf");
  const [businessName, setBusinessName] = useState("Barbearia Styllus");
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const fetchAll = async () => {
      const [productsRes, settingsRes] = await Promise.all([
        supabase.from("products").select("*").eq("active", true).order("sort_order"),
        supabase.from("business_settings").select("*"),
      ]);
      if (productsRes.data) setProducts(productsRes.data as DBProduct[]);
      if (settingsRes.data) {
        const map: Record<string, string> = {};
        for (const row of settingsRes.data) map[row.key] = row.value || "";
        setStoreEnabled(map.store_enabled !== "false");
        setStoreOrderMode((map.store_order_mode as any) || "whatsapp");
        setWhatsappNumber(map.whatsapp_number || "");
        setPixKey(map.pix_key || "");
        setPixType(map.pix_type || "cpf");
        if (map.business_name) setBusinessName(map.business_name);
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!search) return products;
    return products.filter((p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [search, products]);

  // Slider auto-rotate
  const featured = useMemo(() => products.slice(0, Math.min(4, products.length)), [products]);
  const slideRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (featured.length <= 1) return;
    if (slideRef.current) clearTimeout(slideRef.current);
    slideRef.current = setTimeout(() => setSlide((s) => (s + 1) % featured.length), 5000);
    return () => { if (slideRef.current) clearTimeout(slideRef.current); };
  }, [slide, featured.length]);

  const handleAddToCart = (product: DBProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id: product.id, title: product.title, price: product.price, quantity: 1, image_url: product.image_url }];
    });
  };

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  // ─── Loja desativada ───
  if (!loading && !storeEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: t.pageBg, color: t.textPrimary }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5" style={{ background: t.cardBgSubtle }}>
            <ShoppingBag className="w-7 h-7 opacity-60" />
          </div>
          <h1 className="text-2xl font-black mb-2">Loja indisponível</h1>
          <p className="text-sm opacity-60 mb-6">Nossa loja online está temporariamente fora do ar. Volte em breve!</p>
          <button onClick={() => navigate("/")} className="px-5 py-3 rounded-xl text-sm font-bold" style={{ background: t.btnBg, color: t.btnColor }}>
            Voltar ao site
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh]" style={{ background: t.pageBg, color: t.textPrimary, fontFamily: "'Montserrat', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 w-full" style={{ background: t.headerBg, backdropFilter: "blur(20px)", borderBottom: `1px solid ${t.border}` }}>
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 h-14 sm:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80 shrink-0" style={{ color: t.textSecondary }} aria-label="Voltar">
              <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Voltar</span>
            </button>
            <div className="w-px h-5 hidden sm:block" style={{ background: t.border }} />
            <div className="flex items-center gap-2 min-w-0">
              <ShoppingBag className="w-4 h-4 shrink-0" style={{ color: t.textLink }} />
              <span className="text-sm font-bold truncate">{businessName} · Loja</span>
            </div>
          </div>
          <button onClick={() => setShowOrderTracker(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all shrink-0"
            style={{ background: t.btnGhostBg, color: t.btnGhostColor, border: `1px solid ${t.btnGhostBorder}` }}>
            <Package className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Meus Pedidos</span>
          </button>
        </div>
      </header>

      {/* ── HERO BANNER ── */}
      <section className="relative w-full">
        <div className="relative w-full h-[280px] sm:h-[360px] lg:h-[440px] overflow-hidden">
          <img src={storeHero} alt="Loja Styllus" className="absolute inset-0 w-full h-full object-cover" fetchPriority="high" />
          <div className="absolute inset-0" style={{
            background: "linear-gradient(180deg, hsl(220 20% 4% / 0.55) 0%, hsl(220 20% 4% / 0.4) 50%, hsl(220 20% 4% / 0.85) 100%)"
          }} />
          <div className="relative h-full w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 flex flex-col justify-end pb-8 sm:pb-12">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-semibold tracking-widest uppercase mb-3 sm:mb-4" style={{ background: "hsl(0 0% 100% / 0.1)", border: "1px solid hsl(0 0% 100% / 0.2)", color: "hsl(0 0% 95%)", backdropFilter: "blur(8px)" }}>
                <Sparkles className="w-3 h-3" /> Coleção exclusiva
              </span>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-2xl leading-[1.05]">
                Produtos premium para o<br />verdadeiro cavalheiro
              </h1>
              <p className="text-sm sm:text-base text-white/80 mt-3 sm:mt-4 max-w-lg">
                Pomadas, óleos e fragrâncias selecionadas pelos nossos barbeiros. Qualidade profissional, agora em casa.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Trust strip */}
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 -mt-6 sm:-mt-8 relative z-10">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 rounded-2xl p-3 sm:p-4" style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow, backdropFilter: "blur(12px)" }}>
            {[
              { icon: Truck, label: "Entrega rápida", sub: "Coqueiral e região" },
              { icon: ShieldCheck, label: "Pagamento seguro", sub: "PIX & WhatsApp" },
              { icon: Star, label: "Avaliados 5★", sub: "Pelos clientes" },
            ].map((it) => (
              <div key={it.label} className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: t.cardBgSubtle }}>
                  <it.icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: t.textLink }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-sm font-bold truncate" style={{ color: t.textPrimary }}>{it.label}</p>
                  <p className="text-[9px] sm:text-[11px] opacity-60 truncate" style={{ color: t.textSecondary }}>{it.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 py-8 sm:py-12">
        {/* ── DESTAQUES SLIDER ── */}
        {featured.length > 1 && (
          <section className="mb-10 sm:mb-14">
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-50 mb-1">Em destaque</p>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">Mais procurados</h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setSlide((s) => (s - 1 + featured.length) % featured.length)} className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95" style={{ background: t.cardBgSubtle, border: `1px solid ${t.border}` }} aria-label="Anterior">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setSlide((s) => (s + 1) % featured.length)} className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95" style={{ background: t.cardBgSubtle, border: `1px solid ${t.border}` }} aria-label="Próximo">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl" style={{ background: t.cardBgSubtle, border: `1px solid ${t.border}` }}>
              <AnimatePresence mode="wait">
                {featured[slide] && (
                  <motion.div
                    key={featured[slide].id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="grid grid-cols-1 md:grid-cols-2 items-center"
                  >
                    <div className="relative h-64 sm:h-80 md:h-96 overflow-hidden">
                      {featured[slide].image_url && (
                        <img src={featured[slide].image_url!} alt={featured[slide].title} className="w-full h-full object-cover" loading="lazy" />
                      )}
                    </div>
                    <div className="p-6 sm:p-8 md:p-10">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3" style={{ background: t.cardBg, border: `1px solid ${t.border}`, color: t.textLink }}>
                        <Sparkles className="w-3 h-3" /> Premium
                      </span>
                      <h3 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight mb-2">{featured[slide].title}</h3>
                      <p className="text-sm opacity-70 mb-5 line-clamp-3 max-w-md">{featured[slide].description}</p>
                      <div className="flex items-center gap-4 mb-6">
                        <p className="text-3xl sm:text-4xl font-black">R$ {Number(featured[slide].price).toFixed(2).replace(".", ",")}</p>
                      </div>
                      <button onClick={() => handleAddToCart(featured[slide])} className="px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all hover:translate-y-[-1px] active:scale-[0.98]" style={{ background: t.btnBg, color: t.btnColor, boxShadow: t.btnShadow }}>
                        Adicionar ao carrinho
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {featured.map((_, i) => (
                  <button key={i} onClick={() => setSlide(i)} className="h-1.5 rounded-full transition-all" style={{
                    width: i === slide ? 22 : 6,
                    background: i === slide ? t.textPrimary : `${t.textPrimary}40`,
                  }} aria-label={`Ir ao destaque ${i + 1}`} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── PRODUTOS ── */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5 sm:mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-50 mb-1">Catálogo</p>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">Todos os produtos</h2>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: t.textMuted }} />
              <input type="text" placeholder="Buscar produtos..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-foreground/15"
                style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ background: t.cardBgSubtle, height: 280 }} />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {filteredProducts.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={{ ...product, description: product.description || "" }}
                  onSelect={() => handleAddToCart(product)}
                  index={i}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl p-12 text-center" style={{ background: t.cardBg, border: `1px solid ${t.borderSubtle}` }}>
              <ShoppingBag className="w-10 h-10 mx-auto mb-3" style={{ color: t.textMuted }} />
              <p className="text-sm font-medium" style={{ color: t.textSecondary }}>Nenhum produto encontrado.</p>
            </div>
          )}
        </section>
      </main>

      {/* Floating cart */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="fixed bottom-4 sm:bottom-6 left-4 right-4 max-w-md sm:max-w-lg mx-auto z-40">
            <button onClick={() => setShowCheckout(true)}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl font-bold text-sm transition-all hover:translate-y-[-1px] active:scale-[0.99]"
              style={{ background: t.btnBg, color: t.btnColor, boxShadow: "0 12px 32px hsl(0 0% 0% / 0.25)" }}>
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                {cartCount} {cartCount === 1 ? "item" : "itens"}
              </span>
              <span>R$ {cartTotal.toFixed(2).replace(".", ",")}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOrderTracker && <OrderTracker onClose={() => setShowOrderTracker(false)} customerPhone="" />}
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

export default StorePage;
