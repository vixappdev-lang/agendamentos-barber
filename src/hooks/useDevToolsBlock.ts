import { useEffect } from "react";

/**
 * Bloqueia tentativas comuns de abrir o DevTools / inspecionar o código.
 * — F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S, menu de contexto
 * — Detecta abertura do devtools (delta de tamanho da janela)
 *
 * Observação: nada disso é "segurança real" — qualquer dev pode contornar.
 * É apenas uma camada de fricção solicitada pelo cliente.
 */
export const useDevToolsBlock = (enabled = true) => {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const onKey = (e: KeyboardEvent) => {
      const key = e.key?.toLowerCase();
      // F12
      if (key === "f12") {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I / J / C / K (Firefox)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c", "k"].includes(key)) {
        e.preventDefault();
        return false;
      }
      // Ctrl+U (view-source)
      if ((e.ctrlKey || e.metaKey) && key === "u") {
        e.preventDefault();
        return false;
      }
      // Ctrl+S (salvar página)
      if ((e.ctrlKey || e.metaKey) && key === "s") {
        e.preventDefault();
        return false;
      }
    };

    const onContext = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("contextmenu", onContext);

    // Detecção de devtools por delta de tamanho
    const threshold = 160;
    let warned = false;
    const detect = () => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      const open = widthDiff > threshold || heightDiff > threshold;
      if (open && !warned) {
        warned = true;
        // Limpa console pra dificultar debug visual
        try { console.clear(); } catch {}
      } else if (!open) {
        warned = false;
      }
    };
    const interval = window.setInterval(detect, 1000);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("contextmenu", onContext);
      window.clearInterval(interval);
    };
  }, [enabled]);
};
