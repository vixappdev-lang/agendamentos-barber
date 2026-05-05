// Baileys WhatsApp server — pronto para Render.com Free tier
// Salva sessão no Supabase para sobreviver a cold starts.
// Endpoints:
//   GET  /health           — keepalive (use cron-job.org pingando a cada 10min)
//   GET  /status           — status conexão
//   GET  /qr               — QR Code base64 (escanear no celular)
//   POST /send             — { secret, phone, message }
//   POST /logout           — encerra sessão
//   POST /restart          — reinicia socket
import express from "express";
import qrcode from "qrcode";
import pino from "pino";
import { createClient } from "@supabase/supabase-js";
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";

const PORT = process.env.PORT || 10000;
const SHARED_SECRET = process.env.SHARED_SECRET || "";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";
const AUTH_DIR = "/tmp/baileys_auth";

if (!SHARED_SECRET) console.warn("[WARN] SHARED_SECRET não configurado");

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
    : null;

const logger = pino({ level: "warn" });

let sock = null;
let currentQR = null;
let connectionStatus = "disconnected"; // disconnected | qr | connecting | connected

// ---------- Persistência da sessão no Supabase ----------
async function loadAuthFromSupabase() {
  if (!supabase) return;
  try {
    const { data } = await supabase
      .from("render_baileys_session")
      .select("auth_state")
      .eq("id", 1)
      .maybeSingle();
    if (data?.auth_state) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
      const files = data.auth_state;
      for (const [name, content] of Object.entries(files)) {
        fs.writeFileSync(path.join(AUTH_DIR, name), content);
      }
      console.log("[auth] sessão restaurada do Supabase");
    }
  } catch (e) {
    console.error("[auth] erro ao carregar:", e.message);
  }
}

async function saveAuthToSupabase() {
  if (!supabase) return;
  try {
    if (!fs.existsSync(AUTH_DIR)) return;
    const files = {};
    for (const f of fs.readdirSync(AUTH_DIR)) {
      files[f] = fs.readFileSync(path.join(AUTH_DIR, f), "utf-8");
    }
    await supabase
      .from("render_baileys_session")
      .upsert({ id: 1, auth_state: files, updated_at: new Date().toISOString() });
  } catch (e) {
    console.error("[auth] erro ao salvar:", e.message);
  }
}

// ---------- Baileys ----------
async function startSock() {
  await loadAuthFromSupabase();
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ["Lovable", "Chrome", "1.0"],
  });

  connectionStatus = "connecting";

  sock.ev.on("creds.update", async () => {
    await saveCreds();
    saveAuthToSupabase();
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      currentQR = await qrcode.toDataURL(qr);
      connectionStatus = "qr";
      console.log("[qr] novo QR Code gerado");
    }
    if (connection === "open") {
      connectionStatus = "connected";
      currentQR = null;
      console.log("[ok] WhatsApp conectado");
      saveAuthToSupabase();
    }
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      connectionStatus = "disconnected";
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log("[close] code=", code, "reconectar?", shouldReconnect);
      if (shouldReconnect) setTimeout(startSock, 3000);
    }
  });
}

// ---------- Express ----------
const app = express();
app.use(express.json({ limit: "1mb" }));

const auth = (req, res, next) => {
  const provided = req.headers["x-secret"] || req.body?.secret;
  if (!SHARED_SECRET || provided !== SHARED_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
};

app.get("/health", (_, res) => res.json({ ok: true, status: connectionStatus }));

app.get("/status", auth, (_, res) =>
  res.json({ status: connectionStatus, hasQR: !!currentQR })
);

app.get("/qr", auth, (_, res) => {
  if (!currentQR) return res.json({ qr: null, status: connectionStatus });
  res.json({ qr: currentQR, status: connectionStatus });
});

app.post("/send", auth, async (req, res) => {
  try {
    const { phone, message } = req.body || {};
    if (!phone || !message) return res.status(400).json({ error: "phone e message" });
    if (connectionStatus !== "connected") return res.status(503).json({ error: "not_connected" });
    let num = String(phone).replace(/\D/g, "");
    if (!num.startsWith("55") && num.length <= 11) num = "55" + num;
    const jid = `${num}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text: message });
    res.json({ success: true });
  } catch (e) {
    console.error("[send] erro:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post("/logout", auth, async (_, res) => {
  try {
    if (sock) await sock.logout().catch(() => {});
    if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    if (supabase) await supabase.from("render_baileys_session").delete().eq("id", 1);
    connectionStatus = "disconnected";
    currentQR = null;
    setTimeout(startSock, 1500);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/restart", auth, async (_, res) => {
  try {
    if (sock) sock.end();
    setTimeout(startSock, 1500);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`[server] escutando porta ${PORT}`);
  startSock().catch((e) => console.error("[boot]", e));
});
