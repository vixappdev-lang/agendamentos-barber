import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown, Quote, Star, Award } from "lucide-react";
import { useThemeColors } from "@/hooks/useThemeColors";
import { usePublicReviews } from "@/hooks/useReviews";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DBBarber {
  id: string;
  name: string;
  specialty: string | null;
  avatar_url: string | null;
}

const testimonials = [
  {
    name: "Lucas Almeida",
    role: "Cliente há 2 anos",
    text: "Atendimento impecável, ambiente top e o resultado sempre supera a expectativa. Não troco por nenhuma outra.",
    rating: 5,
  },
  {
    name: "Ricardo Mendes",
    role: "Cliente fiel",
    text: "Profissionalismo do início ao fim. Cada visita parece uma experiência exclusiva. Recomendo de olhos fechados.",
    rating: 5,
  },
  {
    name: "Paulo Henrique",
    role: "Cliente recente",
    text: "Cheguei meio inseguro com o estilo, sai outro homem. Eles entendem do assunto de verdade.",
    rating: 5,
  },
];

const faqs = [
  {
    q: "Preciso agendar com antecedência?",
    a: "Recomendamos agendar com pelo menos 24h de antecedência para garantir o melhor horário com seu barbeiro preferido. Aceitamos walk-ins quando há disponibilidade.",
  },
  {
    q: "Quais formas de pagamento vocês aceitam?",
    a: "Aceitamos PIX, dinheiro, cartão de débito e crédito (todas as bandeiras). O pagamento é feito após o atendimento.",
  },
  {
    q: "Posso reagendar ou cancelar meu horário?",
    a: "Sim, basta entrar na sua área de cliente ou nos chamar no WhatsApp. Pedimos avisar com pelo menos 2h de antecedência.",
  },
  {
    q: "Atendem crianças?",
    a: "Atendemos a partir de 4 anos. Temos profissionais experientes em cortes infantis e um ambiente acolhedor.",
  },
  {
    q: "Vocês fazem coloração e descoloração?",
    a: "Sim, oferecemos coloração, mechas e descoloração com produtos profissionais. Agende uma consulta para avaliarmos o melhor resultado para você.",
  },
];

export const TeamSection = ({ barbers }: { barbers: DBBarber[] }) => {
  const t = useThemeColors();
  if (!barbers.length) return null;

  return (
    <section id="equipe" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8" style={{ background: t.pageBg }}>
      <div className="max-w-[1600px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12 sm:mb-16">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="w-10 h-px" style={{ background: t.borderSubtle }} />
            <span className="text-[11px] font-bold uppercase tracking-[0.35em]" style={{ color: t.textMuted }}>Nossa equipe</span>
            <div className="w-10 h-px" style={{ background: t.borderSubtle }} />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight" style={{ color: t.textPrimary }}>
            Profissionais que fazem a diferença
          </h2>
          <p className="text-sm sm:text-base mt-4 max-w-md mx-auto" style={{ color: t.textSecondary }}>
            Especialistas certificados, prontos para entregar o melhor de você.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {barbers.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl overflow-hidden text-center p-6 group transition-all hover:translate-y-[-4px]"
              style={{
                background: t.cardBg,
                border: `1px solid ${t.borderSubtle}`,
                boxShadow: t.cardShadow,
              }}
            >
              <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden flex items-center justify-center" style={{ background: t.cardBgSubtle, border: `2px solid ${t.borderSubtle}` }}>
                {b.avatar_url ? (
                  <img src={b.avatar_url} alt={b.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <span className="text-3xl font-black" style={{ color: t.textPrimary }}>{b.name.charAt(0)}</span>
                )}
              </div>
              <h3 className="font-bold text-lg" style={{ color: t.textPrimary }}>{b.name}</h3>
              <p className="text-xs mt-1" style={{ color: t.textSecondary }}>{b.specialty || "Barbeiro profissional"}</p>
              <div className="flex items-center justify-center gap-1 mt-3">
                {[...Array(5)].map((_, idx) => (
                  <Star key={idx} className="w-3.5 h-3.5 fill-current" style={{ color: t.isLight ? "hsl(45 90% 50%)" : "hsl(45 90% 60%)" }} />
                ))}
              </div>
              <div className="mt-4 pt-4 flex items-center justify-center gap-2 text-[11px] font-medium" style={{ borderTop: `1px solid ${t.borderSubtle}`, color: t.textMuted }}>
                <Award className="w-3.5 h-3.5" /> Certificado
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const TestimonialsSection = () => {
  const t = useThemeColors();
  const { data: reviews = [] } = usePublicReviews(6);

  const items = reviews.length
    ? reviews.map((r) => ({
        name: r.customer_name,
        role: format(new Date(r.created_at), "MMMM yyyy", { locale: ptBR }),
        text: r.comment || "Excelente atendimento!",
        rating: r.rating,
      }))
    : testimonials;

  if (!items.length) return null;

  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8" style={{ background: t.pageBgAlt }}>
      <div className="max-w-[1600px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12 sm:mb-16">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="w-10 h-px" style={{ background: t.borderSubtle }} />
            <span className="text-[11px] font-bold uppercase tracking-[0.35em]" style={{ color: t.textMuted }}>Depoimentos</span>
            <div className="w-10 h-px" style={{ background: t.borderSubtle }} />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight" style={{ color: t.textPrimary }}>
            O que dizem nossos clientes
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          {items.slice(0, 6).map((t2, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl p-6 relative"
              style={{
                background: t.cardBg,
                border: `1px solid ${t.borderSubtle}`,
                boxShadow: t.cardShadow,
              }}
            >
              <Quote className="w-7 h-7 mb-3" style={{ color: t.textMuted, opacity: 0.4 }} />
              <p className="text-sm leading-relaxed mb-5" style={{ color: t.textSecondary }}>
                {t2.text}
              </p>
              <div className="flex items-center gap-1 mb-3">
                {[...Array(t2.rating)].map((_, idx) => (
                  <Star key={idx} className="w-3.5 h-3.5 fill-current" style={{ color: t.isLight ? "hsl(45 90% 50%)" : "hsl(45 90% 60%)" }} />
                ))}
              </div>
              <div className="flex items-center gap-3 pt-4" style={{ borderTop: `1px solid ${t.borderSubtle}` }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: t.cardBgSubtle, color: t.textPrimary }}>
                  {t2.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: t.textPrimary }}>{t2.name}</p>
                  <p className="text-[11px]" style={{ color: t.textMuted }}>{t2.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const FAQSection = () => {
  const t = useThemeColors();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8" style={{ background: t.pageBg }}>
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12 sm:mb-16">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="w-10 h-px" style={{ background: t.borderSubtle }} />
            <span className="text-[11px] font-bold uppercase tracking-[0.35em]" style={{ color: t.textMuted }}>Dúvidas comuns</span>
            <div className="w-10 h-px" style={{ background: t.borderSubtle }} />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight" style={{ color: t.textPrimary }}>
            Perguntas frequentes
          </h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((f, i) => {
            const open = openIndex === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: t.cardBg,
                  border: `1px solid ${t.borderSubtle}`,
                  boxShadow: t.cardShadow,
                }}
              >
                <button
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left transition-all"
                >
                  <span className="font-bold text-sm sm:text-base pr-4" style={{ color: t.textPrimary }}>{f.q}</span>
                  <ChevronDown
                    className="w-5 h-5 shrink-0 transition-transform"
                    style={{
                      color: t.textMuted,
                      transform: open ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  />
                </button>
                {open && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.2 }}
                    className="px-5 pb-5"
                  >
                    <p className="text-sm leading-relaxed" style={{ color: t.textSecondary }}>{f.a}</p>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
