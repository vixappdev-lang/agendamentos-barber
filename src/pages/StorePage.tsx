import { useState, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, Search, Package, ArrowLeft, Sparkles, Truck, ShieldCheck, Star } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import CheckoutModal from "@/components/store/CheckoutModal";
import OrderTracker from "@/components/store/OrderTracker";
import AuthRequiredModal from "@/components/store/AuthRequiredModal";
import ProductDetailModal from "@/components/store/ProductDetailModal";
import CartDrawer from "@/components/store/CartDrawer";
import { useCart } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useThemeColors } from "@/hooks/useThemeColors";
import storeHero from "@/assets/styllus/store-hero.jpg";
import type { User as AuthUser } from "@supabase/supabase-js";

interface DBProduct {
  id: string; title: string; description: string | null; price: number;
  image_url: string | null; active: boolean; sort_order: number;
  category?: string | null;
  long_description?: string | null; brand?: string | null; weight?: string | null;
  stock?: number | null; highlights?: string[] | null; gallery?: string[] | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  cabelo: "Cabelo",
  barba: "Barba",
  pos_barba: "Pós-barba",
  combos: "Combos",
  acessorios: "Acessórios",
  fragrancias: "Fragrâncias",
  geral: "Outros",
};

const formatCategoryLabel = (key: string) =>
  CATEGORY_LABELS[key] ||
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const StorePage = () => {
  const navigate = useNavigate();
  const t = useThemeColors();
  const cartHook = useCart();
  const { items: cart, total: cartTotal, count: cartCount, add: cartAdd, updateQty, remove, clear, user: cartUser } = cartHook;

  const [products, setProducts] = useState<DBProduct[]>([]);
  const [search, setSearch] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [showOrderTracker, setShowOrderTracker] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [detailProduct, setDetailProduct] = useState<DBProduct | null>(null);
  const [storeEnabled, setStoreEnabled] = useState(true);
  const [storeOrderMode, setStoreOrderMode] = useState<"ifood" | "whatsapp">("whatsapp");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixType, setPixType] = useState("cpf");
  const [businessName, setBusinessName] = useState("BarberShop Styllus");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

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
    const q = search.toLowerCase();
    return products.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q) ||
      (p.brand || "").toLowerCase().includes(q)
    );
  }, [search, products]);

  // Group filtered products by category, preserving insertion order from sort_order
  const groupedProducts = useMemo(() => {
    const groups = new Map<string, DBProduct[]>();
    for (const p of filteredProducts) {
      const key = (p.category || "geral").toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    return Array.from(groups.entries());
  }, [filteredProducts]);

  const handleAddToCart = (product: DBProduct, qty: number = 1) => {
    cartAdd({ id: product.id, title: product.title, price: Number(product.price), image_url: product.image_url }, qty);
    setShowCart(true);
  };

  const openCheckout = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setShowAuthGate(true);
      return;
    }
    setUser(session.user);
    setShowCheckout(true);
  };

  const openOrders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) setUser(session.user);
    setShowOrderTracker(true);
  };

  const userPrefill = user ? {
    name: (user.user_metadata?.full_name as string) || "",
    phone: (user.user_metadata?.phone as string) || "",
    email: user.email || "",
  } : undefined;

  if (!loading && !storeEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: t.pageBg, color: t.textPrimary }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5" style={{ background: t.cardBgSubtle }}>
            <ShoppingBag className="w-7 h-7 opacity-60" />
          </div>
          <h1 className="text-2xl font-black mb-2">Loja indisponível</h1>
          <p className="text-sm opacity-60 mb-6">Nossa loja online está temporariamente fora do ar.</p>
          <button onClick={() => navigate("/")} className="px-5 py-3 rounded-xl text-sm font-bold" style={{ background: t.btnBg, color: t.btnColor }}>
            Voltar
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
              <span className="text-sm font-bold truncate">{businessName}</span>
            </div>
          </div>
          <button onClick={openOrders}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all shrink-0"
            style={{ background: t.btnGhostBg, color: t.btnGhostColor, border: `1px solid ${t.btnGhostBorder}` }}>
            <Package className="w-3.5 h-3.5" />
            <span>Pedidos</span>
          </button>
        </div>
      </header>

      {/* Hero compacto */}
      <section className="relative w-full">
        <div className="relative w-full h-[200px] sm:h-[260px] lg:h-[320px] overflow-hidden">
          <img src={storeHero} alt={businessName} className="absolute inset-0 w-full h-full object-cover" fetchPriority="high" />
          <div className="absolute inset-0" style={{
            background: "linear-gradient(180deg, hsl(220 20% 4% / 0.6) 0%, hsl(220 20% 4% / 0.4) 50%, hsl(220 20% 4% / 0.92) 100%)"
          }} />
          <div className="relative h-full w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 flex flex-col justify-end pb-7 sm:pb-10">
            <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-widest uppercase mb-2.5" style={{ background: "hsl(0 0% 100% / 0.12)", border: "1px solid hsl(0 0% 100% / 0.2)", color: "hsl(0 0% 95%)", backdropFilter: "blur(8px)" }}>
                <Sparkles className="w-3 h-3" /> Loja oficial
              </span>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.05]">
                {businessName}
              </h1>
            </motion.div>
          </div>
        </div>

        {/* Trust strip — responsivo, ícones sempre cabem */}
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 -mt-5 sm:-mt-7 relative z-10">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 rounded-2xl p-2.5 sm:p-4" style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow, backdropFilter: "blur(12px)" }}>
            {[
              { icon: Truck, label: "Entrega", sub: "Coqueiral" },
              { icon: ShieldCheck, label: "Pagamento", sub: "PIX/Entrega" },
              { icon: Star, label: "Avaliada 5★", sub: "Pelos clientes" },
            ].map((it) => (
              <div key={it.label} className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: t.cardBgSubtle }}>
                  <it.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: t.textLink }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-bold truncate" style={{ color: t.textPrimary }}>{it.label}</p>
                  <p className="text-[9px] sm:text-[10px] opacity-60 truncate" style={{ color: t.textSecondary }}>{it.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 py-7 sm:py-10">
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-50 mb-1">Catálogo</p>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">Produtos</h2>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: t.textMuted }} />
              <input type="text" placeholder="Buscar produtos..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-foreground/15"
                style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ background: t.cardBgSubtle, height: 220 }} />
              ))}
            </div>
          ) : groupedProducts.length > 0 ? (
            <>
              {/* Quick category jump (mobile-friendly horizontal chips) */}
              {groupedProducts.length > 1 && (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-2 -mx-1 px-1">
                  {groupedProducts.map(([key, items]) => (
                    <a
                      key={key}
                      href={`#cat-${key}`}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all hover:translate-y-[-1px]"
                      style={{ background: t.cardBgSubtle, color: t.textSecondary, border: `1px solid ${t.borderSubtle}` }}
                    >
                      {formatCategoryLabel(key)}
                      <span className="opacity-60">{items.length}</span>
                    </a>
                  ))}
                </div>
              )}

              <div className="space-y-10 sm:space-y-12">
                {groupedProducts.map(([catKey, items]) => (
                  <section key={catKey} id={`cat-${catKey}`} className="scroll-mt-20">
                    <div className="flex items-end justify-between gap-3 mb-3 sm:mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <h3 className="text-base sm:text-lg font-black tracking-tight truncate" style={{ color: t.textPrimary }}>
                          {formatCategoryLabel(catKey)}
                        </h3>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: t.cardBgSubtle, color: t.textMuted }}>
                          {items.length}
                        </span>
                      </div>
                      <div className="hidden sm:block flex-1 h-px" style={{ background: t.borderSubtle }} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                      {items.map((product, i) => (
                        <ProductCard
                          key={product.id}
                          product={{ ...product, description: product.description || "" }}
                          onSelect={() => setDetailProduct(product)}
                          index={i}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-2xl p-10 text-center" style={{ background: t.cardBg, border: `1px solid ${t.borderSubtle}` }}>
              <ShoppingBag className="w-10 h-10 mx-auto mb-3" style={{ color: t.textMuted }} />
              <p className="text-sm font-medium" style={{ color: t.textSecondary }}>Nenhum produto encontrado.</p>
            </div>
          )}
        </section>
      </main>

      {/* Floating cart — abre o drawer */}
      <AnimatePresence>
        {cartCount > 0 && !showCart && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="fixed bottom-4 sm:bottom-6 left-4 right-4 max-w-md sm:max-w-lg mx-auto z-40">
            <button onClick={() => setShowCart(true)}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl font-bold text-sm transition-all hover:translate-y-[-1px] active:scale-[0.99]"
              style={{ background: t.btnBg, color: t.btnColor, boxShadow: "0 12px 32px hsl(0 0% 0% / 0.25)" }}>
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                {cartCount} {cartCount === 1 ? "item" : "itens"} · ver carrinho
              </span>
              <span>R$ {cartTotal.toFixed(2).replace(".", ",")}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <CartDrawer
        open={showCart}
        onClose={() => setShowCart(false)}
        items={cart}
        total={cartTotal}
        count={cartCount}
        updateQty={updateQty}
        remove={remove}
        clear={clear}
        isLogged={!!cartUser}
        onCheckout={() => { setShowCart(false); openCheckout(); }}
      />


      <AnimatePresence>
        {detailProduct && (
          <ProductDetailModal
            product={{
              ...detailProduct,
              highlights: Array.isArray(detailProduct.highlights) ? detailProduct.highlights : [],
              gallery: Array.isArray(detailProduct.gallery) ? detailProduct.gallery : [],
            }}
            onClose={() => setDetailProduct(null)}
            onAdd={(qty) => handleAddToCart(detailProduct, qty)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAuthGate && (
          <AuthRequiredModal
            onClose={() => setShowAuthGate(false)}
            onAuthenticated={() => {
              setShowAuthGate(false);
              setShowCheckout(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOrderTracker && (
          <OrderTracker
            onClose={() => setShowOrderTracker(false)}
            customerPhone=""
            customerEmail={user?.email || undefined}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCheckout && (
          <CheckoutModal
            items={cart}
            onClose={() => setShowCheckout(false)}
            onSuccess={() => { setShowCheckout(false); clear(); }}
            mode={storeOrderMode}
            whatsappNumber={whatsappNumber}
            pixKey={pixKey}
            pixType={pixType}
            prefill={userPrefill}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default StorePage;
