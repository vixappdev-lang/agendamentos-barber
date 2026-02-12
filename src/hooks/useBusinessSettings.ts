import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useBusinessSettings = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("business_settings").select("key, value");
      if (data) {
        const map: Record<string, string> = {};
        for (const r of data) map[r.key] = r.value || "";
        setSettings(map);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const formatSchedule = () => {
    const opening = settings.opening_time || "09:00";
    const closing = settings.closing_time || "19:00";
    const daysOff = (settings.days_off || "0").split(",").map(Number);
    
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const workDays = [0, 1, 2, 3, 4, 5, 6].filter(d => !daysOff.includes(d));
    
    if (workDays.length === 0) return "";
    
    // Find contiguous ranges
    const ranges: string[] = [];
    let start = workDays[0];
    let end = workDays[0];
    for (let i = 1; i < workDays.length; i++) {
      if (workDays[i] === end + 1) {
        end = workDays[i];
      } else {
        ranges.push(start === end ? dayNames[start] : `${dayNames[start]}–${dayNames[end]}`);
        start = workDays[i];
        end = workDays[i];
      }
    }
    ranges.push(start === end ? dayNames[start] : `${dayNames[start]}–${dayNames[end]}`);
    
    const oh = opening.replace(/:00$/, "h").replace(":", "h");
    const ch = closing.replace(/:00$/, "h").replace(":", "h");
    
    return `${ranges.join(", ")} · ${oh}–${ch}`;
  };

  const formatPhone = () => {
    const raw = settings.whatsapp_number || "";
    // Format Brazilian phone: 55 27 98112-0322
    const digits = raw.replace(/\D/g, "");
    if (digits.length >= 12) {
      const ddd = digits.slice(2, 4);
      const part1 = digits.slice(4, 9);
      const part2 = digits.slice(9, 13);
      return `(${ddd}) ${part1}-${part2}`;
    }
    return raw;
  };

  return { settings, loading, formatSchedule, formatPhone };
};
