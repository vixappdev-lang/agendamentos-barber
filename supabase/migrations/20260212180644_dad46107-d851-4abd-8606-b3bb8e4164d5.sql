
-- Fix 1: Add explicit deny policies for user_roles INSERT/UPDATE, and admin-only DELETE
CREATE POLICY "No direct role inserts" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "No role updates" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
