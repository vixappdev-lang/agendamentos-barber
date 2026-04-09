import { Scissors, Phone, Clock } from "lucide-react";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

const Footer = () => {
  const { settings, loading, formatSchedule, formatPhone } = useBusinessSettings();

  const businessName = settings.business_name || "Barbearia";
  const address = settings.address || "";
  const phone = formatPhone();
  const schedule = formatSchedule();

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
            <div className="w-9 h-9 rounded-xl gold-gradient flex items-center justify-center" style={{ boxShadow: '0 4px 16px hsl(45 100% 50% / 0.2)' }}>
              <Scissors className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">{businessName}</span>
          </div>

          {/* Info pills */}
          {!loading && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {phone && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground glass-surface">
                  <Phone className="w-3 h-3 text-primary/60" />
                  {phone}
                </span>
              )}
              {schedule && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground glass-surface">
                  <Clock className="w-3 h-3 text-primary/60" />
                  {schedule}
                </span>
              )}
            </div>
          )}

          <div className="w-12 h-px" style={{ background: 'hsl(0 0% 100% / 0.06)' }} />

          <p className="text-[11px] text-muted-foreground/50">
            © {new Date().getFullYear()} {businessName}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
