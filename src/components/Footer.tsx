import { Scissors, MapPin, Phone, Clock } from "lucide-react";

const Footer = () => {
  return (
    <footer className="mt-16" style={{
      background: 'hsl(0 0% 100% / 0.02)',
      borderTop: '1px solid hsl(0 0% 100% / 0.06)',
      backdropFilter: 'blur(16px)',
    }}>
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="flex flex-col items-center text-center gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gold-gradient flex items-center justify-center" style={{ boxShadow: '0 4px 16px hsl(0 0% 100% / 0.08)' }}>
              <Scissors className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">SuaBarbearia</span>
          </div>

          {/* Info pills */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: MapPin, text: "Rua Exemplo, 123 — SP" },
              { icon: Phone, text: "(11) 99999-9999" },
              { icon: Clock, text: "Seg–Sáb · 9h–19h" },
            ].map((item) => (
              <span
                key={item.text}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground glass-surface"
              >
                <item.icon className="w-3 h-3 text-primary/60" />
                {item.text}
              </span>
            ))}
          </div>

          <div className="w-12 h-px" style={{ background: 'hsl(0 0% 100% / 0.06)' }} />

          <p className="text-[11px] text-muted-foreground/50">
            © {new Date().getFullYear()} SuaBarbearia. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
