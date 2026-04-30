import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Calculate tomorrow's date (in UTC)
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("appointment_date", tomorrowStr)
      .in("status", ["pending", "confirmed"]);

    if (error) {
      console.error("Query error:", error);
      return jsonResponse({ error: error.message }, 500);
    }

    const list = appointments || [];
    if (list.length === 0) {
      return jsonResponse({ success: true, sent: 0, message: "Nenhum agendamento para amanhã" });
    }

    const { data: settings } = await supabase
      .from("business_settings")
      .select("key,value")
      .in("key", ["business_name", "reminder_whatsapp_template", "reminder_send_enabled"]);

    const map: Record<string, string> = {};
    (settings || []).forEach((s: any) => {
      map[s.key] = s.value || "";
    });

    if (map.reminder_send_enabled === "false") {
      return jsonResponse({ success: true, sent: 0, message: "Lembretes desativados" });
    }

    const businessName = map.business_name || "Barbearia";
    const tmpl =
      map.reminder_whatsapp_template ||
      `🔔 Olá *{cliente}*! Lembrando do seu agendamento amanhã na *{barbearia}*.\n\n📅 {data} às {hora}{barbeiro}\n\nTe esperamos! 💈`;

    let sent = 0;
    let failed = 0;

    for (const a of list) {
      if (!a.customer_phone) continue;
      const dateBR = new Date(a.appointment_date + "T00:00:00").toLocaleDateString("pt-BR");
      const time = (a.appointment_time || "").slice(0, 5);
      const message = tmpl
        .replace(/\{cliente\}/g, a.customer_name)
        .replace(/\{barbearia\}/g, businessName)
        .replace(/\{data\}/g, dateBR)
        .replace(/\{hora\}/g, time)
        .replace(/\{barbeiro\}/g, a.barber_name ? `\n💈 Barbeiro: ${a.barber_name}` : "");

      try {
        const { error: invokeErr } = await supabase.functions.invoke("chatpro", {
          body: { action: "send_message", phone: a.customer_phone, message },
        });
        if (invokeErr) {
          failed++;
          console.error("Send fail for", a.id, invokeErr);
        } else {
          sent++;
        }

        // Grava notificação para o cliente ver na área do membro
        await supabase.from("notifications").insert({
          customer_email: a.customer_email || null,
          customer_phone: a.customer_phone || null,
          title: "Lembrete de agendamento",
          message: `Você tem agendamento amanhã (${dateBR}) às ${time}.`,
          type: "reminder",
          appointment_id: a.id,
        });
      } catch (e) {
        failed++;
        console.error("Send exception:", e);
      }
    }

    return jsonResponse({ success: true, total: list.length, sent, failed });
  } catch (e: any) {
    console.error("Reminder error:", e);
    return jsonResponse({ error: e.message || "unknown error" }, 500);
  }
});
