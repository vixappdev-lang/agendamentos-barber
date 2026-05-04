import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import {
  Calendar,
  Smartphone,
  TrendingUp,
  Users,
  MessageCircle,
  Zap,
  Shield,
  Sparkles,
  ArrowRight,
  Check,
  Star,
  Clock,
  DollarSign,
  AlertTriangle,
  CalendarPlus,
  BellRing,
  Repeat,
} from "lucide-react";

import shotLanding from "@/assets/portfolio-shot-landing.png";
import shotLoja from "@/assets/portfolio-shot-loja.png";
import shotMembro from "@/assets/portfolio-shot-membro.png";
import shotAdmin from "@/assets/portfolio-shot-admin.png";
import shotAgenda from "@/assets/portfolio-shot-agenda.png";

const WHATSAPP_NUMBER = "5527981120322";
const WHATSAPP_MSG = encodeURIComponent(
  "Olá! Vi seu portfólio e quero um sistema completo para minha barbearia."
);

// Brand palette — alinhada ao painel (índigo/azul escuro)
const BRAND = "245 60% 60%"; // accent claro pra textos
const BRAND_DEEP = "245 65% 50%"; // base
const BRAND_DARK = "245 70% 38%"; // sombras

const pains = [
  {
    icon: Clock,
    title: "Agenda no caderno",
    text: "Horários perdidos, clientes esquecidos, faturamento que escapa pelos dedos.",
  },
  {
    icon: DollarSign,
    title: "Sem controle financeiro",
    text: "Você não sabe quanto ganhou hoje, nem qual serviço dá mais lucro.",
  },
  {
    icon: AlertTriangle,
    title: "WhatsApp lotado",
    text: "Respondendo agendamento o dia inteiro em vez de cuidar do cliente na cadeira.",
  },
];

const features = [
  { icon: Calendar, title: "Agendamento 24/7", text: "Cliente agenda sozinho. Confirmação automática no WhatsApp." },
  { icon: TrendingUp, title: "Dashboard Financeiro", text: "Faturamento em tempo real, comissões, relatórios PDF." },
  { icon: MessageCircle, title: "WhatsApp Integrado", text: "Lembretes, confirmações e mensagens no piloto automático." },
  { icon: Users, title: "Área do Cliente", text: "Histórico, fidelidade, reagendamento em 2 toques." },
  { icon: Shield, title: "Painel Admin Completo", text: "Caixa, comissões, estoque, cupons e avaliações num lugar só." },
  { icon: Smartphone, title: "100% Responsivo", text: "Funciona perfeito no celular, tablet e PC. Igual app nativo." },
];

const stats = [
  { value: "+300%", label: "agendamentos" },
  { value: "−80%", label: "no-shows" },
  { value: "24/7", label: "disponível" },
  { value: "100%", label: "no celular" },
];

// PhoneFrame — moldura fina e elegante, sem notch nem bisel preto grosso
function PhoneFrame({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return (
    <div
      className={`relative mx-auto ${className}`}
      style={{
        width: "100%",
        maxWidth: 300,
        aspectRatio: "9 / 19.5",
      }}
    >
      {/* glow azul atrás */}
      <div
        className="absolute -inset-8 rounded-[3rem] blur-3xl opacity-50 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 30% 20%, hsl(${BRAND} / 0.35), transparent 60%), radial-gradient(circle at 70% 80%, hsl(${BRAND_DEEP} / 0.25), transparent 60%)`,
        }}
      />
      {/* screen — sem bisel duplo, só uma borda fina */}
      <div
        className="relative h-full w-full overflow-hidden rounded-[2rem]"
        style={{
          background: "hsl(230 20% 5%)",
          border: "1px solid hsl(0 0% 100% / 0.08)",
          boxShadow: `0 30px 80px -20px hsl(${BRAND_DARK} / 0.45), 0 0 0 1px hsl(0 0% 100% / 0.04)`,
        }}
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="block h-full w-full object-cover object-top"
        />
      </div>
    </div>
  );
}

export default function Portifolio() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.2]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.title = "Portfólio · Sistema Completo para Barbearias";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "Sistema profissional para barbearia: agendamento online, financeiro, WhatsApp e painel completo. Veja o portfólio.";
    if (meta) meta.setAttribute("content", desc);
    else {
      const m = document.createElement("meta");
      m.name = "description"; m.content = desc; document.head.appendChild(m);
    }
  }, []);

  const screens = [
    { src: shotLanding, label: "Site da barbearia" },
    { src: shotAgenda, label: "Agendamento" },
    { src: shotMembro, label: "Área do cliente" },
    { src: shotLoja, label: "Loja online" },
    { src: shotAdmin, label: "Painel admin" },
  ];

  const roiItems = [
    {
      icon: CalendarPlus,
      metric: "+8 cortes",
      sub: "por semana",
      text: "Agenda 24/7 captura clientes que decidem marcar fora do horário comercial — antes iam pro concorrente que atende WhatsApp.",
    },
    {
      icon: BellRing,
      metric: "−14 no-shows",
      sub: "por mês",
      text: "Lembrete automático 24h e 2h antes derruba a falta de 18% pra menos de 4%. Cada falta evitada = R$ 45 a R$ 90 no caixa.",
    },
    {
      icon: Repeat,
      metric: "+32% retorno",
      sub: "em 60 dias",
      text: "Histórico, programa de fidelidade e reagendamento em 2 toques fazem o cliente voltar mais rápido. Cliente recorrente custa zero pra reconquistar.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ambient gradients — azul escuro */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div
          className="absolute -top-40 -left-40 w-[40vw] h-[40vw] min-w-[400px] min-h-[400px] rounded-full blur-[140px] opacity-25"
          style={{ background: `radial-gradient(circle, hsl(${BRAND_DEEP} / 0.55), transparent 70%)` }}
        />
        <div
          className="absolute top-1/3 -right-40 w-[40vw] h-[40vw] min-w-[400px] min-h-[400px] rounded-full blur-[160px] opacity-15"
          style={{ background: `radial-gradient(circle, hsl(${BRAND} / 0.4), transparent 70%)` }}
        />
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60vw] h-[40vw] min-w-[600px] min-h-[400px] rounded-full blur-[160px] opacity-10"
          style={{ background: `radial-gradient(circle, hsl(${BRAND_DEEP} / 0.5), transparent 70%)` }}
        />
      </div>

      {/* Top bar minimal */}
      <header className="relative z-20 px-5 sm:px-10 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, hsl(${BRAND}), hsl(${BRAND_DARK}))`,
              boxShadow: `0 8px 20px -8px hsl(${BRAND_DEEP} / 0.6)`,
            }}
          >
            <Sparkles className="w-4 h-4" style={{ color: "hsl(0 0% 100%)" }} />
          </div>
          <span className="text-sm font-semibold tracking-tight">Portfólio</span>
        </div>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs sm:text-sm px-4 py-2 rounded-full font-medium backdrop-blur-xl border transition-colors hover:bg-white/10"
          style={{ background: "hsl(0 0% 100% / 0.04)", borderColor: "hsl(0 0% 100% / 0.1)" }}
        >
          Falar agora
        </a>
      </header>

      {/* HERO */}
      <section ref={heroRef} className="relative px-5 sm:px-10 pt-8 pb-20 lg:pt-16 lg:pb-32">
        <motion.div
          style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
          className="relative max-w-7xl mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-center"
        >
          {/* left */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={mounted ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 backdrop-blur-xl border"
              style={{ background: "hsl(0 0% 100% / 0.04)", borderColor: "hsl(0 0% 100% / 0.1)" }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: `hsl(${BRAND})` }} />
              <span className="text-xs font-medium tracking-wide text-foreground/80">
                Disponível para 1 nova barbearia esse mês
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={mounted ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-bold leading-[1.02] tracking-tight"
              style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)" }}
            >
              O sistema que sua{" "}
              <span
                className="bg-clip-text text-transparent inline-block"
                style={{
                  backgroundImage: `linear-gradient(135deg, hsl(${BRAND}) 0%, hsl(${BRAND_DEEP}) 50%, hsl(${BRAND_DARK}) 100%)`,
                }}
              >
                barbearia
              </span>{" "}
              merece.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={mounted ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="mt-6 text-base sm:text-lg text-foreground/65 leading-relaxed max-w-xl mx-auto lg:mx-0"
            >
              Agendamento online, financeiro, WhatsApp e dashboard completo.
              Tudo num lugar só. Pronto pra rodar <span className="text-foreground font-medium">hoje</span>.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={mounted ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="mt-8 flex flex-col sm:flex-row items-center gap-3 lg:justify-start justify-center"
            >
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-semibold text-sm sm:text-base transition-all active:scale-[0.97] hover:opacity-95"
                style={{
                  background: "hsl(0 0% 100%)",
                  color: "hsl(0 0% 0%)",
                  boxShadow: `0 15px 50px -10px hsl(${BRAND_DEEP} / 0.45)`,
                }}
              >
                Quero esse sistema
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="#sistema"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-medium text-sm sm:text-base backdrop-blur-xl border transition-colors hover:bg-white/5"
                style={{ background: "hsl(0 0% 100% / 0.03)", borderColor: "hsl(0 0% 100% / 0.1)" }}
              >
                Ver o sistema
              </a>
            </motion.div>

            {/* stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={mounted ? { opacity: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mt-12 grid grid-cols-4 gap-2 max-w-md mx-auto lg:mx-0"
            >
              {stats.map((s, i) => (
                <div
                  key={i}
                  className="rounded-2xl py-3 px-2 backdrop-blur-xl border text-center"
                  style={{ background: "hsl(0 0% 100% / 0.03)", borderColor: "hsl(0 0% 100% / 0.08)" }}
                >
                  <div className="text-base sm:text-xl font-bold" style={{ color: `hsl(${BRAND})` }}>
                    {s.value}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-foreground/55 mt-0.5 leading-tight">
                    {s.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* right — phone mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40, rotate: -4 }}
            animate={mounted ? { opacity: 1, y: 0, rotate: 0 } : {}}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <PhoneFrame src={shotLanding} alt="Tela inicial real do sistema" className="lg:max-w-[320px]" />
          </motion.div>
        </motion.div>
      </section>

      {/* DOR */}
      <section className="relative px-5 sm:px-10 py-20 lg:py-32">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span
              className="text-xs font-medium tracking-widest uppercase"
              style={{ color: `hsl(${BRAND})` }}
            >
              Reconhece isso?
            </span>
            <h2
              className="mt-3 font-bold leading-tight"
              style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}
            >
              Toda barbearia perde dinheiro
              <br />
              <span className="text-foreground/40">sem perceber.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-3 sm:gap-4">
            {pains.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-2xl p-6 backdrop-blur-xl border"
                style={{ background: "hsl(0 0% 100% / 0.03)", borderColor: "hsl(0 0% 100% / 0.08)" }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{
                    background: "linear-gradient(135deg, hsl(0 60% 50% / 0.18), hsl(0 60% 50% / 0.05))",
                    color: "hsl(0 70% 70%)",
                  }}
                >
                  <p.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base">{p.title}</h3>
                <p className="mt-1.5 text-sm text-foreground/60 leading-relaxed">{p.text}</p>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center mt-10 text-sm sm:text-base text-foreground/55 italic max-w-xl mx-auto"
          >
            Cada cliente perdido = R$ 50, R$ 75, R$ 100 indo embora.
            <br />
            <span className="text-foreground/85 not-italic font-medium">
              Quanto isso dá no fim do mês?
            </span>
          </motion.p>
        </div>
      </section>

      {/* SISTEMA — telas reais */}
      <section id="sistema" className="relative px-5 sm:px-10 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <span
              className="text-xs font-medium tracking-widest uppercase"
              style={{ color: `hsl(${BRAND})` }}
            >
              O sistema por dentro
            </span>
            <h2
              className="mt-3 font-bold leading-tight"
              style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}
            >
              Cada tela. Cada detalhe.
              <br />
              <span style={{ color: `hsl(${BRAND})` }}>Em produção, agora.</span>
            </h2>
            <p className="mt-4 text-sm sm:text-base text-foreground/60 max-w-xl mx-auto">
              Capturas diretas do produto rodando no celular. Nada de protótipo.
            </p>
          </motion.div>

          {/* phones grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10 lg:gap-6">
            {screens.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                whileHover={{ y: -8 }}
                className="flex flex-col items-center gap-4"
              >
                <PhoneFrame src={s.src} alt={`Tela ${s.label}`} />
                <div
                  className="text-[11px] sm:text-xs font-medium tracking-wider uppercase px-3 py-1.5 rounded-full backdrop-blur-xl border"
                  style={{
                    background: "hsl(0 0% 100% / 0.03)",
                    borderColor: "hsl(0 0% 100% / 0.08)",
                    color: "hsl(0 0% 80%)",
                  }}
                >
                  {s.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative px-5 sm:px-10 py-20 lg:py-32">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span
              className="text-xs font-medium tracking-widest uppercase"
              style={{ color: `hsl(${BRAND})` }}
            >
              Tudo incluso
            </span>
            <h2
              className="mt-3 font-bold leading-tight"
              style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}
            >
              Funcionalidades que
              <br />
              <span className="text-foreground/40">fazem dinheiro.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                whileHover={{ y: -4 }}
                className="group rounded-2xl p-6 backdrop-blur-xl border transition-all"
                style={{ background: "hsl(0 0% 100% / 0.03)", borderColor: "hsl(0 0% 100% / 0.08)" }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 group-hover:rotate-3"
                  style={{
                    background: `linear-gradient(135deg, hsl(${BRAND_DEEP} / 0.25), hsl(${BRAND_DARK} / 0.05))`,
                    color: `hsl(${BRAND})`,
                    boxShadow: `inset 0 0 0 1px hsl(${BRAND_DEEP} / 0.2)`,
                  }}
                >
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base">{f.title}</h3>
                <p className="mt-1.5 text-sm text-foreground/60 leading-relaxed">{f.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* DIFERENCIAIS */}
      <section className="relative px-5 sm:px-10 py-20 lg:py-32">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl p-8 sm:p-12 backdrop-blur-xl border relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, hsl(0 0% 100% / 0.05), hsl(0 0% 100% / 0.02))",
              borderColor: `hsl(${BRAND_DEEP} / 0.22)`,
            }}
          >
            <div
              className="absolute -top-32 -right-32 w-80 h-80 rounded-full blur-[100px] opacity-25"
              style={{ background: `hsl(${BRAND_DEEP})` }}
            />

            <div className="relative">
              <div className="flex items-center gap-2 mb-5">
                <Zap className="w-5 h-5" style={{ color: `hsl(${BRAND})` }} />
                <span
                  className="text-xs font-semibold tracking-widest uppercase"
                  style={{ color: `hsl(${BRAND})` }}
                >
                  Por que comigo
                </span>
              </div>
              <h2
                className="font-bold leading-tight mb-8"
                style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.5rem)" }}
              >
                Não é só código.
                <br />
                É um <span style={{ color: `hsl(${BRAND})` }}>sócio digital</span>.
              </h2>

              <ul className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                {[
                  "Sistema pronto, rodando em horas — não em meses",
                  "Você é dono do código, sem mensalidade infinita",
                  "Suporte direto comigo, no WhatsApp, sem call center",
                  "Personalizado pra sua marca, sua cor, seu jeito",
                  "Atualizações gratuitas no primeiro mês",
                  "Treinamento incluso pra você e sua equipe",
                ].map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}
                    className="flex gap-3 text-sm sm:text-base"
                  >
                    <div
                      className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                      style={{ background: `hsl(${BRAND_DEEP} / 0.22)` }}
                    >
                      <Check className="w-3 h-3" style={{ color: `hsl(${BRAND})` }} />
                    </div>
                    <span className="text-foreground/85 leading-relaxed">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ROI INTELIGENTE */}
      <section className="relative px-5 sm:px-10 py-20 lg:py-32">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span
              className="text-xs font-medium tracking-widest uppercase"
              style={{ color: `hsl(${BRAND})` }}
            >
              ROI inteligente
            </span>
            <h2
              className="mt-3 font-bold leading-tight"
              style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}
            >
              Quanto o sistema
              <br />
              <span style={{ color: `hsl(${BRAND})` }}>devolve no seu bolso.</span>
            </h2>
            <p className="mt-4 text-sm sm:text-base text-foreground/60 max-w-xl mx-auto">
              Cenário real de barbearia média com 3 cadeiras, ticket médio R$ 55 e ~280 atendimentos/mês.
            </p>
          </motion.div>

          {/* Big metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
            {[
              { value: "+R$ 1.840", label: "faturamento extra/mês" },
              { value: "+48", label: "atendimentos/mês" },
              { value: "~22 dias", label: "pra pagar o investimento" },
            ].map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="rounded-2xl p-6 backdrop-blur-xl border text-center"
                style={{
                  background: `linear-gradient(135deg, hsl(${BRAND_DEEP} / 0.12), hsl(${BRAND_DEEP} / 0.03))`,
                  borderColor: `hsl(${BRAND_DEEP} / 0.25)`,
                }}
              >
                <div
                  className="text-3xl sm:text-4xl font-bold tracking-tight"
                  style={{ color: `hsl(${BRAND})` }}
                >
                  {m.value}
                </div>
                <div className="text-xs sm:text-sm text-foreground/60 mt-2 leading-tight">
                  {m.label}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Breakdown */}
          <div className="grid md:grid-cols-3 gap-3 sm:gap-4">
            {roiItems.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-2xl p-6 backdrop-blur-xl border"
                style={{ background: "hsl(0 0% 100% / 0.03)", borderColor: "hsl(0 0% 100% / 0.08)" }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{
                    background: `linear-gradient(135deg, hsl(${BRAND_DEEP} / 0.22), hsl(${BRAND_DARK} / 0.05))`,
                    color: `hsl(${BRAND})`,
                    boxShadow: `inset 0 0 0 1px hsl(${BRAND_DEEP} / 0.2)`,
                  }}
                >
                  <r.icon className="w-5 h-5" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-2xl font-bold tracking-tight"
                    style={{ color: `hsl(${BRAND})` }}
                  >
                    {r.metric}
                  </span>
                  <span className="text-xs text-foreground/50">{r.sub}</span>
                </div>
                <p className="mt-2 text-sm text-foreground/65 leading-relaxed">{r.text}</p>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center mt-10 text-sm sm:text-base text-foreground/65 max-w-2xl mx-auto"
          >
            Não é promessa de marketing. São números do mercado de barbearia
            cruzados com o que o sistema realmente entrega.
            <br />
            <span className="text-foreground font-semibold">
              No segundo mês, o sistema já paga ele mesmo — e ainda sobra.
            </span>
          </motion.p>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="relative px-5 sm:px-10 py-16 lg:py-24">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl p-8 sm:p-10 backdrop-blur-xl border"
            style={{ background: "hsl(0 0% 100% / 0.03)", borderColor: "hsl(0 0% 100% / 0.08)" }}
          >
            <div className="flex justify-center gap-1 mb-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" style={{ color: `hsl(${BRAND})` }} />
              ))}
            </div>
            <p className="text-base sm:text-xl text-foreground/85 italic leading-relaxed">
              "Triplicamos os agendamentos no primeiro mês. O cliente agenda sozinho de madrugada,
              sábado, domingo. Mudou o jogo."
            </p>
            <div className="mt-6 text-xs text-foreground/50 tracking-wider uppercase">
              Barbearia parceira · Vitória/ES
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative px-5 sm:px-10 py-24 lg:py-32">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="text-center"
          >
            <h2
              className="font-bold leading-tight"
              style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
            >
              Sua concorrência
              <br />
              <span style={{ color: `hsl(${BRAND})` }}>já está saindo na frente.</span>
            </h2>
            <p className="mt-6 text-base sm:text-lg text-foreground/65 leading-relaxed max-w-xl mx-auto">
              Cada dia sem sistema é dinheiro escapando. Vamos conversar agora —
              sem compromisso, só pra você ver na prática.
            </p>

            <div className="mt-10 flex flex-col items-center gap-3">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold text-base transition-all active:scale-[0.97] hover:opacity-95"
                style={{
                  background: "hsl(0 0% 100%)",
                  color: "hsl(0 0% 0%)",
                  boxShadow: `0 20px 60px -12px hsl(${BRAND_DEEP} / 0.5)`,
                }}
              >
                Falar no WhatsApp agora
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
              <p className="text-[11px] sm:text-xs text-foreground/40 mt-1">
                Resposta em minutos · Sem robô · Direto comigo
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <footer
        className="px-5 sm:px-10 py-8 text-center text-xs text-foreground/40 border-t"
        style={{ borderColor: "hsl(0 0% 100% / 0.06)" }}
      >
        © 2026 · Sistema desenvolvido sob medida para barbearias.
      </footer>
    </div>
  );
}
