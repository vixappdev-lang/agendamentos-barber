import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProductRatingSummary {
  avg: number;
  count: number;
}

/**
 * Returns an aggregate { product_id: { avg, count } } map of approved + public reviews.
 * Refreshes when realtime emits changes on product_reviews.
 */
export const useProductRatings = () => {
  const [ratings, setRatings] = useState<Record<string, ProductRatingSummary>>({});

  const fetchAll = async () => {
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
  };

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("public-product-reviews")
      .on("postgres_changes", { event: "*", schema: "public", table: "product_reviews" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return ratings;
};
