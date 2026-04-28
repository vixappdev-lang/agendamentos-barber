/**
 * Super Admin
 * Apenas este e-mail tem acesso à aba "Banco de Dados" e à gestão de perfis MySQL.
 * Outros admins continuam usando normalmente o Lovable Cloud.
 */
export const SUPER_ADMIN_EMAIL = "admin-barber@gmail.com";

export const isSuperAdmin = (email?: string | null): boolean => {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
};
