import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import MemberArea from "./MemberArea";
import { Loader2 } from "lucide-react";

/**
 * Rota de PREVIEW PÚBLICO da Área do Cliente para o portfólio.
 * Faz auto-login com uma conta demo idempotente e renderiza <MemberArea />.
 *
 * Pensada para ser embedada em <iframe> dentro de /portifolio.
 */
const DEMO_PHONE = "27999000111";
const DEMO_EMAIL = `${DEMO_PHONE}@genesis.barber`;
const DEMO_PASSWORD = "demo-portfolio-2026";
const DEMO_NAME = "Cliente Demo";

export default function MemberPreviewDemo() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function ensureSession() {
      try {
        // Já tem sessão? então só renderiza.
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user.email === DEMO_EMAIL) {
          if (!cancelled) setReady(true);
          return;
        }

        // Se tem sessão de OUTRO usuário, faz signOut antes pra não vazar.
        if (session && session.user.email !== DEMO_EMAIL) {
          await supabase.auth.signOut();
        }

        // Tenta logar com a conta demo
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
        });

        if (!loginErr) {
          if (!cancelled) setReady(true);
          return;
        }

        // Conta não existe ainda — cria
        const { error: signUpErr } = await supabase.auth.signUp({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
          options: {
            data: { full_name: DEMO_NAME, phone: DEMO_PHONE },
            emailRedirectTo: window.location.origin,
          },
        });

        if (signUpErr && !signUpErr.message?.toLowerCase().includes("already")) {
          if (!cancelled) setError("Não foi possível iniciar a demo.");
          return;
        }

        // Tenta logar novamente após signup
        const { error: loginErr2 } = await supabase.auth.signInWithPassword({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
        });

        if (loginErr2) {
          if (!cancelled) setError("Demo indisponível no momento.");
          return;
        }

        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) setError("Demo indisponível no momento.");
      }
    }

    ensureSession();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-foreground/70 px-6 text-center">
        {error}
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-foreground/60">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-xs uppercase tracking-wider">Carregando preview…</span>
      </div>
    );
  }

  return <MemberArea />;
}
