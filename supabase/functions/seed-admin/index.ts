import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateSecurePassword(length = 24) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*_+-=';
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map(x => charset[x % charset.length]).join('');
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check: require a valid admin token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller's token
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only existing admins can seed new admins
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if admin already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const adminExists = existingUsers?.users?.some(
      (u) => u.email === "admin-barber@gmail.com"
    );

    if (adminExists) {
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
        JSON.stringify({ message: "Admin already exists" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use env var or generate a secure password
    const password = Deno.env.get("INITIAL_ADMIN_PASSWORD") || generateSecurePassword();

    // Create admin user
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: "admin-barber@gmail.com",
        password,
        email_confirm: true,
      });

    if (createError) throw createError;

    // Assign admin role
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role: "admin" });

    return new Response(
      JSON.stringify({ message: "Admin created. Password was set from environment or generated securely." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
