/**
 * Wrapper de UI compartilhado entre as páginas dos novos módulos
 * (Caixa, Comandas, Fiados, Estoque). Mantém consistência visual
 * com o resto do painel admin (mesmos tokens, mesma respiração).
 */
import { ReactNode } from "react";
import { motion } from "framer-motion";

export const ModuleSection = ({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) => (
  <motion.section
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
    className="rounded-2xl p-5 sm:p-6"
    style={{
      background: "hsl(0 0% 100% / 0.025)",
      border: "1px solid hsl(0 0% 100% / 0.06)",
    }}
  >
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
    {children}
  </motion.section>
);

export const Stat = ({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "positive" | "negative" | "warning";
}) => {
  const colors: Record<string, string> = {
    neutral: "hsl(0 0% 90%)",
    positive: "hsl(145 70% 65%)",
    negative: "hsl(0 75% 70%)",
    warning: "hsl(35 90% 65%)",
  };
  return (
    <div
      className="rounded-xl px-4 py-3.5"
      style={{
        background: "hsl(0 0% 100% / 0.025)",
        border: "1px solid hsl(0 0% 100% / 0.05)",
      }}
    >
      <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className="text-xl font-bold mt-1 truncate" style={{ color: colors[tone] }}>
        {value}
      </p>
      {hint && <p className="text-[10.5px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
};

export const EmptyState = ({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="rounded-xl p-10 text-center"
    style={{ background: "hsl(0 0% 100% / 0.02)", border: "1px dashed hsl(0 0% 100% / 0.08)" }}>
    {icon && <div className="mx-auto mb-3 w-12 h-12 rounded-2xl flex items-center justify-center"
      style={{ background: "hsl(0 0% 100% / 0.04)", color: "hsl(0 0% 70%)" }}>{icon}</div>}
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    {description && <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">{description}</p>}
    {action && <div className="mt-4 inline-flex">{action}</div>}
  </div>
);

export const PrimaryButton = ({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none"
    style={{
      background: "hsl(245 60% 55%)",
      color: "white",
      border: "1px solid hsl(245 60% 55%)",
    }}
  >
    {children}
  </button>
);

export const GhostButton = ({
  children,
  onClick,
  type = "button",
  tone = "neutral",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  tone?: "neutral" | "danger";
}) => (
  <button
    type={type}
    onClick={onClick}
    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
    style={{
      background: "hsl(0 0% 100% / 0.04)",
      color: tone === "danger" ? "hsl(0 75% 70%)" : "hsl(0 0% 80%)",
      border: `1px solid ${tone === "danger" ? "hsl(0 75% 70% / 0.25)" : "hsl(0 0% 100% / 0.08)"}`,
    }}
  >
    {children}
  </button>
);

export const TextField = ({
  label,
  ...rest
}: {
  label: string;
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <label className="block">
    <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">
      {label}
    </span>
    <input
      {...rest}
      className="mt-1 w-full px-3 py-2 rounded-lg text-sm text-foreground bg-transparent outline-none transition-colors focus:border-primary/50"
      style={{
        background: "hsl(0 0% 100% / 0.03)",
        border: "1px solid hsl(0 0% 100% / 0.08)",
      }}
    />
  </label>
);
