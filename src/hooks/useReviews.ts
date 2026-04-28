import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Review {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  rating: number;
  comment: string | null;
  status: "pending" | "approved" | "rejected" | string;
  appointment_id: string | null;
  review_token: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

const KEY_ALL = ["reviews", "all"] as const;
const KEY_PUBLIC = ["reviews", "public"] as const;

export const useAdminReviews = () =>
  useQuery({
    queryKey: KEY_ALL,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Review[];
    },
  });

export const usePublicReviews = (limit = 6) =>
  useQuery({
    queryKey: [...KEY_PUBLIC, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("status", "approved")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Review[];
    },
  });

export const useUpdateReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Review> }) => {
      const { error } = await supabase.from("reviews").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY_ALL });
      qc.invalidateQueries({ queryKey: KEY_PUBLIC });
    },
  });
};

export const useDeleteReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY_ALL });
      qc.invalidateQueries({ queryKey: KEY_PUBLIC });
    },
  });
};
