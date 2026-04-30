import { useState } from "react";
import { motion } from "framer-motion";
import { X, User, Phone, Lock, Loader2, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { useThemeColors } from "@/hooks/useThemeColors";

interface Props {
  onClose: () => void;
  onAuthenticated: () => void;
}

const onlyDigits = (v: string) => v.replace(/\D/g, "");
const phoneToEmail = (raw: string) => `${onlyDigits(raw)}@styllus.barber`;
const formatPhone = (raw: string) => {
  const d = onlyDigits(raw).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const phoneSchema = z.string().refine((v) => onlyDigits(v).length >= 10, "Telefone inválido");
const passwordSchema = z.string().min(6, "Mínimo 6 caracteres");
const nameSchema = z.string().trim().min(2, "Nome muito curto").max(80);

const AuthRequiredModal = ({ onClose, onAuthenticated }: Props) => {
  const t = useThemeColors();
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const p = phoneSchema.safeParse(phone);
    if (!p.success) return toast.error(p.error.errors[0].message);
    const pw = passwordSchema.safeParse(password);
    if (!pw.success) return toast.error(pw.error.errors[0].message);

    const email = phoneToEmail(phone);
    setLoading(true);

    try {
      if (mode === "existing") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error("Telefone ou senha incorretos");
          return;
        }
        toast.success("Bem-vindo de volta!");
        onAuthenticated();
      } else {
        const n = nameSchema.safeParse(name);
        if (!n.success) return toast.error(n.error.errors[0].message);
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name.trim(), phone: onlyDigits(phone) },
          },
        });
        if (error) {
          if (/registered|already/i.test(error.message)) {
            setMode("existing");
            toast.info("Você já tem conta. Digite sua senha.");
            return;
          }
          toast.error(error.message);
          return;
        }
        toast.success("Conta criada!");
        onAuthenticated();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: "hsl(0 0% 0% / 0.7)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0 }}
        className="w-full max-w-sm p-6 rounded-3xl space-y-5"
        style={{
          background: t.modalCardBg,
          border: `1px solid ${t.border}`,
          boxShadow: t.cardShadowLg,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ background: t.btnBg }}
            >
              <ShoppingBag className="w-5 h-5" style={{ color: t.btnColor }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>
                {mode === "new" ? "Crie sua conta" : "Entrar"}
              </h2>
              <p className="text-[11px]" style={{ color: t.textMuted }}>
                Para finalizar pedidos
              </p>
            </div>
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5" style={{ color: t.textMuted }} />
          </button>
        </div>

        <div className="flex p-1 rounded-xl" style={{ background: t.cardBgSubtle }}>
          {(["new", "existing"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
              style={{
                background: mode === m ? t.btnBg : "transparent",
                color: mode === m ? t.btnColor : t.textMuted,
              }}
            >
              {m === "new" ? "Criar" : "Já tenho"}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {mode === "new" && (
            <Field icon={<User className="w-4 h-4" />} placeholder="Nome completo" value={name} onChange={setName} />
          )}
          <Field
            icon={<Phone className="w-4 h-4" />}
            placeholder="(00) 00000-0000"
            value={phone}
            onChange={(v) => setPhone(formatPhone(v))}
            inputMode="tel"
          />
          <Field
            icon={<Lock className="w-4 h-4" />}
            placeholder="Senha (mín. 6)"
            value={password}
            onChange={setPassword}
            type="password"
          />
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          style={{ background: t.btnBg, color: t.btnColor }}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === "new" ? "Criar conta e continuar" : "Entrar e continuar"}
        </button>
      </motion.div>
    </motion.div>
  );
};

const Field = ({
  icon,
  placeholder,
  value,
  onChange,
  type = "text",
  inputMode,
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  inputMode?: any;
}) => {
  const t = useThemeColors();
  return (
    <div
      className="flex items-center gap-2.5 px-3.5 h-12 rounded-xl"
      style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}
    >
      <span style={{ color: t.textMuted }}>{icon}</span>
      <input
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent outline-none text-sm"
        style={{ color: t.textPrimary }}
      />
    </div>
  );
};

export default AuthRequiredModal;
