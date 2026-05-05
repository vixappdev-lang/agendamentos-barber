import { useState } from "react";
import { MessageSquare, Server } from "lucide-react";
import ChatProConfig from "./ChatProConfig";
import RenderConfig from "./RenderConfig";

type Tab = "chatpro" | "render";

const WhatsAppProviders = () => {
  const [tab, setTab] = useState<Tab>("chatpro");

  const tabs: { key: Tab; label: string; icon: any; color: string }[] = [
    { key: "chatpro", label: "ChatPro", icon: MessageSquare, color: "hsl(140 60% 55%)" },
    { key: "render", label: "Render", icon: Server, color: "hsl(245 60% 65%)" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 snap-x">
        {tabs.map((t) => {
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="shrink-0 snap-start px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap"
              style={{
                background: active ? `${t.color.replace(")", " / 0.15)")}` : "hsl(0 0% 100% / 0.04)",
                color: active ? t.color : "hsl(0 0% 55%)",
                border: `1px solid ${active ? t.color.replace(")", " / 0.3)") : "hsl(0 0% 100% / 0.08)"}`,
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "chatpro" && <ChatProConfig />}
      {tab === "render" && <RenderConfig />}
    </div>
  );
};

export default WhatsAppProviders;
