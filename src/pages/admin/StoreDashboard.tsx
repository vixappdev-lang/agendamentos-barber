import { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, Package, Settings, Tag, BarChart3 } from "lucide-react";
import Products from "./Products";
import Orders from "./Orders";
import StoreSettings from "./StoreSettings";
import Categories from "./Categories";
import StoreKPIs from "./StoreKPIs";

type Tab = "kpis" | "products" | "categories" | "orders" | "settings";

const tabs: { id: Tab; label: string; icon: typeof ShoppingBag }[] = [
  { id: "kpis", label: "KPIs", icon: BarChart3 },
  { id: "products", label: "Produtos", icon: ShoppingBag },
  { id: "categories", label: "Categorias", icon: Tag },
  { id: "orders", label: "Pedidos", icon: Package },
  { id: "settings", label: "Configurações", icon: Settings },
];

const StoreDashboard = () => {
  const [activeTab, setActiveTab] = useState<Tab>("kpis");

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Loja</h2>

      {/* Tab bar */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: activeTab === tab.id ? "hsl(245 60% 55% / 0.15)" : "hsl(0 0% 100% / 0.04)",
              color: activeTab === tab.id ? "hsl(245 60% 70%)" : "hsl(0 0% 50%)",
              border: `1px solid ${activeTab === tab.id ? "hsl(245 60% 55% / 0.3)" : "hsl(0 0% 100% / 0.08)"}`,
            }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {activeTab === "products" && <Products />}
        {activeTab === "categories" && <Categories />}
        {activeTab === "orders" && <Orders />}
        {activeTab === "settings" && <StoreSettings />}
      </motion.div>
    </div>
  );
};

export default StoreDashboard;
