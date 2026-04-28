import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_PERMISSIONS,
  sanitizePermissions,
  type PermissionKey,
} from "@/lib/barbershopPermissions";

export interface BarbershopProfile {
  id: string;
  slug: string;
  name: string;
  owner_name: string | null;
  owner_email: string;
  owner_password: string; // bcrypt hash
  phone: string | null;
  address: string | null;
  mysql_profile_id: string | null;
  is_cloud: boolean;
  is_locked: boolean;
  is_active: boolean;
  permissions: Record<PermissionKey, boolean>;
  created_at: string;
  updated_at: string;
}

export interface BarbershopInput {
  slug: string;
  name: string;
  owner_name?: string;
  owner_email: string;
  password?: string; // plain — será hasheada via RPC
  phone?: string;
  address?: string;
  permissions?: Record<PermissionKey, boolean>;
}

const KEY = ["barbershop_profiles"] as const;

export const useBarbershops = () => {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barbershop_profiles")
        .select("*")
        .order("is_locked", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row,
        permissions: sanitizePermissions(row.permissions),
      })) as BarbershopProfile[];
    },
  });
};

export const useCreateBarbershop = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BarbershopInput) => {
      if (!input.password) throw new Error("Senha obrigatória");
      const { data: hash, error: hashErr } = await supabase.rpc("hash_owner_password", {
        _plain: input.password,
      });
      if (hashErr) throw hashErr;
      const perms = sanitizePermissions(input.permissions ?? DEFAULT_PERMISSIONS);
      const { data, error } = await supabase
        .from("barbershop_profiles")
        .insert({
          slug: input.slug,
          name: input.name,
          owner_name: input.owner_name ?? null,
          owner_email: input.owner_email,
          owner_password: hash as string,
          phone: input.phone ?? null,
          address: input.address ?? null,
          permissions: perms as any,
        })
        .select()
        .single();
      if (error) throw error;
      return { ...(data as any), permissions: perms } as BarbershopProfile;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useUpdateBarbershop = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<BarbershopInput> }) => {
      const patch: Record<string, unknown> = {
        slug: input.slug,
        name: input.name,
        owner_name: input.owner_name ?? null,
        owner_email: input.owner_email,
        phone: input.phone ?? null,
        address: input.address ?? null,
      };
      if (input.permissions) {
        patch.permissions = sanitizePermissions(input.permissions) as any;
      }
      if (input.password && input.password.length > 0) {
        const { data: hash, error: hashErr } = await supabase.rpc("hash_owner_password", {
          _plain: input.password,
        });
        if (hashErr) throw hashErr;
        patch.owner_password = hash as string;
      }
      Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);
      const { data, error } = await supabase
        .from("barbershop_profiles")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { ...(data as any), permissions: sanitizePermissions((data as any).permissions) } as BarbershopProfile;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useDeleteBarbershop = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("barbershop_profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useLinkMysqlProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mysql_profile_id }: { id: string; mysql_profile_id: string | null }) => {
      const { error } = await supabase
        .from("barbershop_profiles")
        .update({ mysql_profile_id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};
