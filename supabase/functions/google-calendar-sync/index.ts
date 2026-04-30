// supabase/functions/google-calendar-sync/index.ts
// Cria, atualiza ou remove eventos no Google Calendar do barbeiro

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncBody {
  appointment_id: string;
  action: "create" | "update" | "delete";
}

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Refresh token failed: ${await res.text()}`);
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SyncBody = await req.json();
    if (!body.appointment_id || !body.action) {
      return new Response(JSON.stringify({ error: "appointment_id e action são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: appt, error: apptErr } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", body.appointment_id)
      .maybeSingle();
    if (apptErr || !appt) {
      return new Response(JSON.stringify({ error: "Agendamento não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!appt.barber_name) {
      return new Response(JSON.stringify({ skipped: true, reason: "Sem barbeiro" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pega tokens pelo nome do barbeiro
    const { data: tokenRow } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("barber_name", appt.barber_name)
      .maybeSingle();

    if (!tokenRow) {
      return new Response(JSON.stringify({ skipped: true, reason: "Barbeiro sem Google conectado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Renova token se expirado
    let accessToken = tokenRow.access_token;
    if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
      const refreshed = await refreshAccessToken(tokenRow.refresh_token);
      accessToken = refreshed.access_token;
      const newExpiresAt = new Date(Date.now() + (refreshed.expires_in - 60) * 1000).toISOString();
      await supabase
        .from("google_calendar_tokens")
        .update({ access_token: accessToken, expires_at: newExpiresAt })
        .eq("id", tokenRow.id);
    }

    const calId = encodeURIComponent(tokenRow.calendar_id || "primary");

    // DELETE
    if (body.action === "delete") {
      if (!appt.google_event_id) {
        return new Response(JSON.stringify({ skipped: true, reason: "Sem evento" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const delRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${appt.google_event_id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (delRes.status !== 204 && delRes.status !== 410 && delRes.status !== 404) {
        const txt = await delRes.text();
        throw new Error(`Delete falhou: ${txt}`);
      }
      await supabase.from("appointments").update({ google_event_id: null }).eq("id", appt.id);
      return new Response(JSON.stringify({ ok: true, action: "deleted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE / UPDATE — monta o evento
    const startDateTime = `${appt.appointment_date}T${appt.appointment_time}`;
    const startDate = new Date(`${startDateTime}-03:00`); // BRT
    const endDate = new Date(startDate.getTime() + 45 * 60 * 1000); // 45 min default

    const eventBody = {
      summary: `💈 ${appt.customer_name}`,
      description: [
        `Cliente: ${appt.customer_name}`,
        appt.customer_phone ? `Telefone: ${appt.customer_phone}` : "",
        appt.notes ? `Obs: ${appt.notes}` : "",
        `Status: ${appt.status}`,
      ]
        .filter(Boolean)
        .join("\n"),
      start: { dateTime: startDate.toISOString(), timeZone: "America/Sao_Paulo" },
      end: { dateTime: endDate.toISOString(), timeZone: "America/Sao_Paulo" },
      reminders: { useDefault: true },
    };

    let eventId = appt.google_event_id;
    let resp;
    if (eventId && body.action === "update") {
      resp = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${eventId}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(eventBody),
        },
      );
    } else {
      resp = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calId}/events`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(eventBody),
        },
      );
    }

    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(`Google API: ${JSON.stringify(data)}`);
    }

    eventId = data.id;
    await supabase
      .from("appointments")
      .update({ google_event_id: eventId, google_calendar_barber_id: tokenRow.barber_id })
      .eq("id", appt.id);

    return new Response(JSON.stringify({ ok: true, event_id: eventId, link: data.htmlLink }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[google-calendar-sync] error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
