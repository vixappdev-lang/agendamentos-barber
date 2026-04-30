// supabase/functions/google-oauth-callback/index.ts
// Recebe o ?code do Google, troca por tokens e salva em google_calendar_tokens

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const html = (msg: string, ok: boolean, returnTo?: string) => `
    <!doctype html><html><head><meta charset="utf-8"><title>Google Calendar</title>
    <style>body{font-family:system-ui;background:#0f1115;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
    .box{background:#1a1d24;padding:32px;border-radius:16px;max-width:420px;text-align:center;border:1px solid #2a2d34}
    h1{margin:0 0 12px;font-size:20px}p{color:#aaa;margin:0 0 16px}a{color:#7c8cff;text-decoration:none;font-weight:600}</style>
    </head><body><div class="box">
    <div style="font-size:48px;margin-bottom:12px">${ok ? "✅" : "❌"}</div>
    <h1>${ok ? "Conta conectada!" : "Erro"}</h1><p>${msg}</p>
    ${returnTo ? `<a href="${returnTo}">Voltar ao painel</a>` : ""}
    <script>setTimeout(()=>{ ${returnTo ? `window.location.href=${JSON.stringify(returnTo)}` : "window.close()"} }, 2500)</script>
    </div></body></html>`;

  if (error) {
    return new Response(html(`Google retornou erro: ${error}`, false), {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }
  if (!code || !stateRaw) {
    return new Response(html("Faltou code/state na resposta do Google.", false), {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }

  let state: { barber_id: string; barber_name: string; return_to?: string };
  try {
    state = JSON.parse(atob(stateRaw));
  } catch {
    return new Response(html("State inválido.", false), {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI")!;

  // Troca code por tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    return new Response(html(`Erro do Google: ${tokenData.error_description || tokenData.error}`, false, state.return_to), {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }

  // Pega email do usuário
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userInfo = await userRes.json();

  const expiresAt = new Date(Date.now() + (tokenData.expires_in - 60) * 1000).toISOString();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { error: dbErr } = await supabase
    .from("google_calendar_tokens")
    .upsert(
      {
        barber_id: state.barber_id,
        barber_name: state.barber_name,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        google_email: userInfo.email,
        calendar_id: "primary",
      },
      { onConflict: "barber_id" },
    );

  if (dbErr) {
    return new Response(html(`Erro ao salvar: ${dbErr.message}`, false, state.return_to), {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }

  return new Response(
    html(`Conectado como ${userInfo.email} para o barbeiro ${state.barber_name}.`, true, state.return_to),
    { headers: { ...corsHeaders, "Content-Type": "text/html" } },
  );
});
