import { useAuth } from "./useAuth";
import { isSuperAdmin } from "@/lib/superAdmin";

export const useSuperAdmin = () => {
  const { user, loading } = useAuth();
  return {
    isSuperAdmin: isSuperAdmin(user?.email),
    loading,
    email: user?.email ?? null,
  };
};
