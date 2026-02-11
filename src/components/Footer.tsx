import { Scissors, MapPin, Phone, Clock } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-white/5 mt-16">
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="flex flex-col items-center text-center gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gold-gradient flex items-center justify-center">
              <Scissors className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">SuaBarbearia</span>
          </div>

          {/* Info */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary/70" />
              Rua Exemplo, 123 — São Paulo
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-primary/70" />
              (11) 99999-9999
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary/70" />
              Seg–Sáb · 9h–19h
            </span>
          </div>

          <div className="w-16 h-px bg-white/10" />

          <p className="text-[11px] text-muted-foreground/60">
            © {new Date().getFullYear()} SuaBarbearia. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
