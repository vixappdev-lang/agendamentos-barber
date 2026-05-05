import { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, Package, Settings, Tag, BarChart3, Star } from "lucide-react";
import Products from "./Products";
import Orders from "./Orders";
import StoreSettings from "./StoreSettings";
import Categories from "./Categories";
import StoreKPIs from "./StoreKPIs";
import ProductReviews from "./ProductReviews";

type Tab = "kpis" | "products" | "categories" | "orders" | "reviews" | "settings";

const tabs: { id: Tab; label: string; icon: typeof ShoppingBag }[] = [
  { id: "kpis", label: "KPIs", icon: BarChart3 },
  { id: "products", label: "Produtos", icon: ShoppingBag },
  { id: "categories", label: "Categorias", icon: Tag },
  { id: "orders", label: "Pedidos", icon: Package },
  { id: "reviews", label: "Avaliações", icon: Star },
  { id: "settings", label: "Configurações", icon: Settings },
];

const StoreDashboard = () => {
  const [activeTab, setActiveTab] = useState<Tab>("kpis");

  return (
    <div className="space-y-3 sm:space-y-4">
      <h2 className="text-base sm:text-lg font-bold text-foreground">Loja</h2>

      {/* Tab bar */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1 snap-x">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="shrink-0 snap-start flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap"
            style={{
              background: activeTab === tab.id ? "hsl(245 60% 55% / 0.15)" : "hsl(0 0% 100% / 0.04)",
              color: activeTab === tab.id ? "hsl(245 60% 70%)" : "hsl(0 0% 50%)",
              border: `1px solid ${activeTab === tab.id ? "hsl(245 60% 55% / 0.3)" : "hsl(0 0% 100% / 0.08)"}`,
            }}
          >
            <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div key={activeTab} initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
        {activeTab === "kpis" && <StoreKPIs />}
        {activeTab === "products" && <Products />}
        {activeTab === "categories" && <Categories />}
        {activeTab === "orders" && <Orders />}
        {activeTab === "reviews" && <ProductReviews />}
        {activeTab === "settings" && <StoreSettings />}
      </motion.div>
    </div>
  );
};

export default StoreDashboard;
