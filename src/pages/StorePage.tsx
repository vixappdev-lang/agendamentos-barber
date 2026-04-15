import { useState, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, Search, Package, Scissors, ArrowLeft } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import CheckoutModal from "@/components/store/CheckoutModal";
import OrderTracker from "@/components/store/OrderTracker";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface DBProduct {
  id: string; title: string; description: string | null; price: number;
  image_url: string | null; active: boolean; sort_order: number;
}

interface CartItem {
  id: string; title: string; price: number; quantity: number; image_url: string | null;
}

const StorePage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOrderTracker, setShowOrderTracker] = useState(false);
  const [storeOrderMode, setStoreOrderMode] = useState<"ifood" | "whatsapp">("whatsapp");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixType, setPixType] = useState("cpf");
  const [businessName, setBusinessName] = useState("GenesisBarber");

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
        setStoreOrderMode((map.store_order_mode as any) || "whatsapp");
        setWhatsappNumber(map.whatsapp_number || "");
        setPixKey(map.pix_key || "");
        setPixType(map.pix_type || "cpf");
        if (map.business_name) setBusinessName(map.business_name);
      }
    };
    fetchAll();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!search) return products;
    return products.filter((p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) || (p.description || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [search, products]);

  const handleAddToCart = (product: DBProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id: product.id, title: product.title, price: product.price, quantity: 1, image_url: product.image_url }];
    });
  };

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="min-h-screen min-h-[100dvh]" style={{ background: "hsl(220 20% 4%)", color: "hsl(0 0% 93%)", fontFamily: "'Montserrat', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 w-full" style={{ background: "hsl(220 20% 4% / 0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid hsl(0 0% 100% / 0.08)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-white" style={{ color: "hsl(0 0% 50%)" }}>
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <div className="w-px h-5" style={{ background: "hsl(0 0% 100% / 0.08)" }} />
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" style={{ color: "hsl(0 0% 60%)" }} />
              <span className="text-sm font-bold">Loja</span>
            </div>
          </div>
          <button onClick={() => setShowOrderTracker(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all"
            style={{ background: "hsl(0 0% 100% / 0.06)", color: "hsl(0 0% 70%)", border: "1px solid hsl(0 0% 100% / 0.1)" }}>
            <Package className="w-3.5 h-3.5" /> Meus Pedidos
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-8 lg:py-12">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Nossa Loja</h1>
          <p className="text-sm mt-1" style={{ color: "hsl(0 0% 50%)" }}>Produtos profissionais selecionados para você</p>
        </motion.div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md lg:max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(0 0% 40%)" }} />
            <input type="text" placeholder="Buscar produtos..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-white/15"
              style={{ background: "hsl(0 0% 100% / 0.04)", border: "1px solid hsl(0 0% 100% / 0.08)", color: "hsl(0 0% 93%)" }} />
          </div>
        </div>

        {/* Products grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
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
            <div className="col-span-full rounded-2xl p-12 text-center" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
              <ShoppingBag className="w-10 h-10 mx-auto mb-3" style={{ color: "hsl(0 0% 30%)" }} />
              <p className="text-sm font-medium" style={{ color: "hsl(0 0% 50%)" }}>Nenhum produto encontrado.</p>
            </div>
          )}
        </div>
      </main>

      {/* Floating cart */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto z-40">
            <button onClick={() => setShowCheckout(true)}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl font-bold text-sm transition-all"
              style={{ background: "hsl(0 0% 90%)", color: "hsl(0 0% 0%)", boxShadow: "0 8px 32px hsl(0 0% 100% / 0.15)" }}>
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                {cartCount} {cartCount === 1 ? "item" : "itens"}
              </span>
              <span>R$ {cartTotal.toFixed(2)}</span>
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
