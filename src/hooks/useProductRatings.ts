import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProductRatingSummary {
  avg: number;
  count: number;
}

/**
 * Aggregate map { product_id: { avg, count } } of approved+public reviews.
 * Lazy: fetched after first paint via requestIdleCallback. No realtime
 * subscription on initial load — call refresh() (returned) when needed.
 */
export const useProductRatings = () => {
  const [ratings, setRatings] = useState<Record<string, ProductRatingSummary>>({});

  const fetchAll = useCallback(async () => {
    const { data } = await supabase
      .from("product_reviews")
      .select("product_id, rating")
      .eq("status", "approved")
      .eq("is_public", true);
    const acc: Record<string, { sum: number; count: number }> = {};
    (data || []).forEach((r: any) => {
      if (!acc[r.product_id]) acc[r.product_id] = { sum: 0, count: 0 };
      acc[r.product_id].sum += r.rating;
      acc[r.product_id].count += 1;
    });
    const out: Record<string, ProductRatingSummary> = {};
    Object.entries(acc).forEach(([k, v]) => {
      out[k] = { avg: v.sum / v.count, count: v.count };
    });
    setRatings(out);
  }, []);

  useEffect(() => {
    const idle = (cb: () => void) =>
      "requestIdleCallback" in window
        ? (window as any).requestIdleCallback(cb, { timeout: 4000 })
        : setTimeout(cb, 1500);
    const handle = idle(() => { fetchAll(); });
    return () => {
      if ("cancelIdleCallback" in window && typeof handle === "number") {
        (window as any).cancelIdleCallback(handle);
      }
    };
  }, [fetchAll]);

  return ratings;
};
