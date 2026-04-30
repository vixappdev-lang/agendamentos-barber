import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image_url: string | null;
}

const STORAGE_KEY = "styllus_cart_v1";

const readLocal = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

const writeLocal = (items: CartItem[]) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
};

/**
 * Carrinho persistente:
 * - Não logado → localStorage
 * - Logado → Supabase (user_carts) + localStorage como cache
 * - Ao fazer login, mescla carrinho local com remoto
 */
export const useCart = () => {
  const [items, setItems] = useState<CartItem[]>(() => readLocal());
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const skipNextSync = useRef(false);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Hydrate from remote on login + merge local
  useEffect(() => {
    const hydrate = async () => {
      if (!user) {
        setHydrated(true);
        return;
      }
      const { data } = await supabase.from("user_carts").select("items").eq("user_id", user.id).maybeSingle();
      const remote: CartItem[] = Array.isArray(data?.items) ? (data!.items as any) : [];
      const local = readLocal();
      // Merge: soma quantidades por id; produtos só locais entram
      const map = new Map<string, CartItem>();
      for (const it of remote) map.set(it.id, { ...it });
      for (const it of local) {
        const ex = map.get(it.id);
        if (ex) ex.quantity = ex.quantity + it.quantity;
        else map.set(it.id, { ...it });
      }
      const merged = Array.from(map.values());
      skipNextSync.current = false;
      setItems(merged);
      setHydrated(true);
    };
    hydrate();
  }, [user?.id]);

  // Persist (local sempre, remoto se logado)
  useEffect(() => {
    if (!hydrated) return;
    writeLocal(items);
    if (skipNextSync.current) { skipNextSync.current = false; return; }
    if (!user) return;
    const t = setTimeout(async () => {
      await supabase.from("user_carts").upsert({
        user_id: user.id,
        items: items as any,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    }, 400);
    return () => clearTimeout(t);
  }, [items, user?.id, hydrated]);

  const add = useCallback((product: Omit<CartItem, "quantity">, qty: number = 1) => {
    setItems((prev) => {
      const ex = prev.find((i) => i.id === product.id);
      if (ex) return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + qty } : i);
      return [...prev, { ...product, quantity: qty }];
    });
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    setItems((prev) => qty <= 0 ? prev.filter((i) => i.id !== id) : prev.map((i) => i.id === id ? { ...i, quantity: qty } : i));
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(async () => {
    setItems([]);
    if (user) {
      await supabase.from("user_carts").update({ items: [] }).eq("user_id", user.id);
    }
  }, [user?.id]);

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return { items, add, updateQty, remove, clear, total, count, hydrated, user };
};
