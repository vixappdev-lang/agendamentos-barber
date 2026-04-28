import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Send, CheckCircle2, Loader2, Scissors, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useThemeColors } from "@/hooks/useThemeColors";
import { toast } from "sonner";

const Avaliacao = () => {
  const t = useThemeColors();
  const [params] = useSearchParams();
  const token = params.get("token");

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [presetName, setPresetName] = useState<string>("");
  const [validating, setValidating] = useState<boolean>(!!token);
  const [tokenUsed, setTokenUsed] = useState(false);

  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Carrega settings da barbearia (cores/nome) e valida token se houver
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("business_settings").select("key, value");
      if (data) {
        const map: Record<string, string> = {};
        for (const r of data) map[r.key] = r.value || "";
        setSettings(map);
      }

      if (token) {
        // 1. checa se já existe review com este token (evita duplicata)
        const { data: existing } = await supabase
          .from("reviews")
          .select("id")
          .eq("review_token", token)
          .maybeSingle();
        if (existing) {
          setTokenUsed(true);
          setValidating(false);
          return;
        }
        // 2. busca o agendamento para pré-preencher o nome
        const { data: appt } = await supabase
          .from("appointments")
          .select("customer_name")
          .eq("review_token", token)
          .maybeSingle();
        if (appt?.customer_name) {
          const first = appt.customer_name.split(" ")[0];
          setPresetName(appt.customer_name);
          setName(first);
        }
        setValidating(false);
      }
    })();
  }, [token]);

  const businessName = settings.business_name || "Barbearia";
  const accentBg = settings.btn_primary_bg || (t.isLight ? "hsl(220 20% 12%)" : "hsl(0 0% 95%)");
  const accentColor = settings.btn_primary_text || (t.isLight ? "hsl(0 0% 98%)" : "hsl(230 20% 7%)");

  const ratingLabels = useMemo(
    () => ["", "Péssimo", "Ruim", "Bom", "Muito Bom", "Excelente"],
    [],
  );

  const submit = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return toast.error("Informe seu nome.");
    if (!rating) return toast.error("Selecione uma nota.");

    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      customer_name: presetName || trimmed,
      rating,
      comment: comment.trim() || null,
      review_token: token || null,
      status: "approved",
      is_public: true,
    } as any);

    setSubmitting(false);
    if (error) {
      toast.error("Não foi possível enviar sua avaliação. Tente novamente.");
      return;
    }
    setSubmitted(true);
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: t.pageBg }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: t.textMuted }} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{ background: t.pageBg, color: t.textPrimary, fontFamily: "'Montserrat', sans-serif" }}
    >
      {/* Header simples */}
      <header className="px-4 sm:px-8 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: accentBg }}
          >
            <Scissors className="w-4 h-4" style={{ color: accentColor }} />
          </div>
          <span className="text-base font-extrabold tracking-tight">{businessName}</span>
        </Link>
        <Link
          to="/"
          className="text-xs font-medium flex items-center gap-1.5 hover:opacity-70 transition-opacity"
          style={{ color: t.textSecondary }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao site
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="thanks"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="rounded-3xl p-10 text-center"
                style={{
                  background: t.cardBg,
                  border: `1px solid ${t.borderSubtle}`,
                  boxShadow: t.cardShadow,
                }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-5"
                  style={{ background: "hsl(140 60% 50% / 0.12)" }}
                >
                  <CheckCircle2 className="w-8 h-8" style={{ color: "hsl(140 60% 55%)" }} />
                </motion.div>
                <h1 className="text-2xl sm:text-3xl font-black mb-3" style={{ color: t.textPrimary }}>
                  Obrigado{name ? `, ${name}` : ""}!
                </h1>
                <p className="text-sm leading-relaxed" style={{ color: t.textSecondary }}>
                  Sua avaliação foi enviada e em breve aparecerá nos depoimentos da {businessName}.
                </p>
                <Link
                  to="/"
                  className="inline-block mt-7 px-6 py-3 rounded-xl text-sm font-bold transition-transform hover:translate-y-[-1px]"
                  style={{ background: accentBg, color: accentColor }}
                >
                  Voltar ao site
                </Link>
              </motion.div>
            ) : tokenUsed ? (
              <motion.div
                key="used"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-3xl p-10 text-center"
                style={{ background: t.cardBg, border: `1px solid ${t.borderSubtle}` }}
              >
                <h1 className="text-xl font-bold mb-2" style={{ color: t.textPrimary }}>
                  Avaliação já registrada
                </h1>
                <p className="text-sm" style={{ color: t.textSecondary }}>
                  Este link de avaliação já foi utilizado. Obrigado!
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="rounded-3xl p-7 sm:p-9"
                style={{
                  background: t.cardBg,
                  border: `1px solid ${t.borderSubtle}`,
                  boxShadow: t.cardShadow,
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-px" style={{ background: t.borderSubtle }} />
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.35em]"
                    style={{ color: t.textMuted }}
                  >
                    Avaliação
                  </span>
                </div>
                <h1
                  className="text-2xl sm:text-3xl font-black tracking-tight mb-2"
                  style={{ color: t.textPrimary }}
                >
                  Como foi sua experiência?
                </h1>
                <p className="text-sm leading-relaxed mb-7" style={{ color: t.textSecondary }}>
                  Sua opinião ajuda a {businessName} a continuar melhorando. Leva menos de 30s.
                </p>

                {/* Estrelas */}
                <div className="flex items-center justify-center gap-2 mb-2">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = (hover || rating) >= n;
                    return (
                      <motion.button
                        key={n}
                        type="button"
                        whileTap={{ scale: 0.85 }}
                        whileHover={{ scale: 1.15 }}
                        onMouseEnter={() => setHover(n)}
                        onMouseLeave={() => setHover(0)}
                        onClick={() => setRating(n)}
                        className="p-1 transition-colors"
                        aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
                      >
                        <Star
                          className="w-10 h-10 sm:w-12 sm:h-12 transition-all"
                          fill={active ? "currentColor" : "none"}
                          style={{
                            color: active
                              ? t.isLight
                                ? "hsl(45 95% 50%)"
                                : "hsl(45 95% 60%)"
                              : t.borderSubtle,
                            filter: active
                              ? "drop-shadow(0 4px 12px hsl(45 95% 55% / 0.4))"
                              : undefined,
                          }}
                        />
                      </motion.button>
                    );
                  })}
                </div>
                <p
                  className="text-center text-xs font-semibold h-5 mb-6"
                  style={{ color: t.textMuted }}
                >
                  {ratingLabels[hover || rating] || "Toque numa estrela"}
                </p>

                {/* Nome */}
                {!presetName && (
                  <div className="mb-4">
                    <label
                      className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
                      style={{ color: t.textMuted }}
                    >
                      Seu nome
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={120}
                      placeholder="Como devemos te chamar?"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                      style={{
                        background: t.cardBgSubtle,
                        border: `1px solid ${t.borderSubtle}`,
                        color: t.textPrimary,
                      }}
                    />
                  </div>
                )}

                {/* Comentário */}
                <AnimatePresence>
                  {rating > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-5"
                    >
                      <label
                        className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
                        style={{ color: t.textMuted }}
                      >
                        Conte mais (opcional)
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        maxLength={1000}
                        rows={4}
                        placeholder={
                          rating >= 4
                            ? "O que mais te marcou?"
                            : "Como podemos melhorar?"
                        }
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none transition-colors"
                        style={{
                          background: t.cardBgSubtle,
                          border: `1px solid ${t.borderSubtle}`,
                          color: t.textPrimary,
                        }}
                      />
                      <p
                        className="text-[10px] mt-1 text-right"
                        style={{ color: t.textMuted }}
                      >
                        {comment.length}/1000
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={submit}
                  disabled={submitting || !rating}
                  className="w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:translate-y-[-1px]"
                  style={{ background: accentBg, color: accentColor }}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {submitting ? "Enviando..." : "Enviar avaliação"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default Avaliacao;
