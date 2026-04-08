import { useEffect } from "react";
import { Download, FileCode, CheckCircle } from "lucide-react";

const BaixarSource = () => {
  useEffect(() => {
    // Auto-download after 1.5s
    const timer = setTimeout(() => {
      const link = document.createElement("a");
      link.href = "/barbearia-source.zip";
      link.download = "barbearia-source.zip";
      link.click();
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "hsl(230 20% 5%)" }}>
      <div className="glass-card-strong p-8 max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: "hsl(245 60% 55% / 0.15)", border: "1px solid hsl(245 60% 55% / 0.3)" }}>
          <FileCode className="w-8 h-8" style={{ color: "hsl(245 60% 70%)" }} />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Código Fonte PHP</h1>
          <p className="text-sm text-muted-foreground">Clone completo do sistema em PHP/HTML com mesma interface e funcionalidades.</p>
        </div>

        <div className="space-y-2 text-left p-4 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Conteúdo do pacote</p>
          {[
            "Página principal (serviços + loja)",
            "Sistema de agendamento completo",
            "Painel Admin com login",
            "Dashboard com estatísticas",
            "CRUD de serviços, barbeiros, cupons",
            "Gerenciamento de pedidos com paginação",
            "Roleta premiada",
            "Configurações (horário, PIX, etc)",
            "CSS glassmorphism idêntico",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-xs text-foreground/80">
              <CheckCircle className="w-3 h-3 shrink-0" style={{ color: "hsl(160 60% 55%)" }} />
              {item}
            </div>
          ))}
        </div>

        <a href="/barbearia-source.zip" download
          className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
          style={{ background: "linear-gradient(135deg, hsl(245 60% 50%), hsl(265 60% 55%))", color: "white", boxShadow: "0 4px 20px hsl(245 60% 55% / 0.3)" }}>
          <Download className="w-5 h-5" /> Baixar Código Fonte (.zip)
        </a>

        <p className="text-[10px] text-muted-foreground">O download iniciará automaticamente. Caso não inicie, clique no botão acima.</p>
      </div>
    </div>
  );
};

export default BaixarSource;
