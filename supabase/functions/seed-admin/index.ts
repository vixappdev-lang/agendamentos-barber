import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if admin already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const adminExists = existingUsers?.users?.some(
      (u) => u.email === "admin-barber@gmail.com"
    );

    if (adminExists) {
      // Ensure role exists
      const adminUser = existingUsers?.users?.find(
        (u) => u.email === "admin-barber@gmail.com"
      );
      if (adminUser) {
        await supabaseAdmin
          .from("user_roles")
          .upsert(
            { user_id: adminUser.id, role: "admin" },
            { onConflict: "user_id,role" }
          );
      }
      return new Response(
        JSON.stringify({ message: "Admin already exists", userId: adminUser?.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin user
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: "admin-barber@gmail.com",
        password: "admin@2026",
        email_confirm: true,
      });

    if (createError) throw createError;

    // Assign admin role
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role: "admin" });

    return new Response(
      JSON.stringify({ message: "Admin created", userId: newUser.user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
