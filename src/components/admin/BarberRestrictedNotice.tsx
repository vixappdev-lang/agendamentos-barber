import { Lock } from "lucide-react";

interface Props {
  title?: string;
  message?: string;
}

const BarberRestrictedNotice = ({
  title = "Acesso restrito",
  message = "Este módulo é exclusivo para administradores e gerentes da barbearia.",
}: Props) => {
  return (
    <div className="flex items-center justify-center py-16 px-6">
      <div
        className="max-w-md w-full text-center rounded-2xl p-8"
        style={{ background: "hsl(0 0% 100% / 0.04)", border: "1px solid hsl(0 0% 100% / 0.08)" }}
      >
        <div
          className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "hsl(45 100% 50% / 0.15)", color: "hsl(45 100% 65%)" }}
        >
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-foreground mb-1">{title}</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">{message}</p>
      </div>
    </div>
  );
};

export default BarberRestrictedNotice;
