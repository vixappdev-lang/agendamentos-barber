import { useEffect } from "react";
import { Download, FileCode, CheckCircle } from "lucide-react";

const ZIP_URL = "https://vikabbqyfduibrykikvx.supabase.co/storage/v1/object/public/public-assets/barbearia-source.zip?v=20260408-1634";

const BaixarSource = () => {
  useEffect(() => {
    // Auto-download after 1.5s
    const timer = setTimeout(() => {
      window.location.href = ZIP_URL;
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
          <h1 className="text-2xl font-bold text-foreground mb-2">Código-fonte exato do projeto</h1>
          <p className="text-sm text-muted-foreground">Este ZIP contém a versão atual deste app, com o mesmo layout, modais, menu, admin, login e integração com o banco da Lovable Cloud.</p>
        </div>

        <div className="space-y-2 text-left p-4 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Conteúdo do pacote</p>
          {[
             "Página principal completa",
             "Mesmos modais, menu e navegação",
             "Sistema de agendamento atual",
             "Painel admin com login",
             "Serviços, barbeiros, cupons e pedidos",
             "Loja, roleta e configurações",
             "Código React + TypeScript + Tailwind",
             "Integração atual com Lovable Cloud",
             "Estrutura real deste projeto",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-xs text-foreground/80">
              <CheckCircle className="w-3 h-3 shrink-0" style={{ color: "hsl(160 60% 55%)" }} />
              {item}
            </div>
          ))}
        </div>

        <a href={ZIP_URL}
          className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
          style={{ background: "linear-gradient(135deg, hsl(245 60% 50%), hsl(265 60% 55%))", color: "white", boxShadow: "0 4px 20px hsl(245 60% 55% / 0.3)" }}>
          <Download className="w-5 h-5" /> Baixar Projeto Exato (.zip)
        </a>

        <p className="text-[10px] text-muted-foreground">O download iniciará automaticamente. Caso não inicie, clique no botão acima. Não é conversão para PHP: é o código atual deste projeto.</p>
      </div>
    </div>
  );
};

export default BaixarSource;
