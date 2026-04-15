import { Scissors, Phone, Clock } from "lucide-react";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useThemeColors } from "@/hooks/useThemeColors";

const Footer = () => {
  const { settings, loading, formatSchedule, formatPhone } = useBusinessSettings();
  const t = useThemeColors();

  const businessName = settings.business_name || "Barbearia";
  const phone = formatPhone();
  const schedule = formatSchedule();

  return (
    <footer className="mt-16" style={{
      background: t.cardBg,
      borderTop: `1px solid ${t.border}`,
      backdropFilter: t.isLight ? 'none' : 'blur(16px)',
    }}>
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: t.btnBg, boxShadow: t.cardShadow }}>
              <Scissors className="w-4 h-4" style={{ color: t.btnColor }} />
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ color: t.textPrimary }}>{businessName}</span>
          </div>

          {!loading && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {phone && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs glass-surface" style={{ color: t.textSecondary }}>
                  <Phone className="w-3 h-3" style={{ color: t.textMuted }} />
                  {phone}
                </span>
              )}
              {schedule && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs glass-surface" style={{ color: t.textSecondary }}>
                  <Clock className="w-3 h-3" style={{ color: t.textMuted }} />
                  {schedule}
                </span>
              )}
            </div>
          )}

          <div className="w-12 h-px" style={{ background: t.border }} />

          <p className="text-[11px]" style={{ color: t.textMuted }}>
            © {new Date().getFullYear()} {businessName}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
