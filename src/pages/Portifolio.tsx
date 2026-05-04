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
  ChevronDown,
} from "lucide-react";

import mockup1 from "@/assets/portfolio-mockup-1.jpg";
import mockup2 from "@/assets/portfolio-mockup-2.jpg";
import mockup3 from "@/assets/portfolio-mockup-3.jpg";

const WHATSAPP_NUMBER = "5527999999999"; // ajuste depois
const WHATSAPP_MSG = encodeURIComponent(
  "Olá! Vi seu portfólio e quero um sistema completo para minha barbearia."
);

const pains = [
  {
    icon: Clock,
    title: "Agenda no caderno?",
    text: "Horários perdidos, clientes esquecidos, faturamento que escapa pelos dedos.",
  },
  {
    icon: DollarSign,
    title: "Sem controle financeiro?",
    text: "Você não sabe quanto ganhou hoje, quanto cada barbeiro produziu, nem qual serviço dá mais lucro.",
  },
  {
    icon: AlertTriangle,
    title: "WhatsApp lotado?",
    text: "Respondendo agendamento o dia inteiro em vez de cuidar do que importa: o cliente na cadeira.",
  },
];

const features = [
  {
    icon: Calendar,
    title: "Agendamento Online 24/7",
    text: "Cliente agenda sozinho, escolhe barbeiro e horário. Confirmação automática no WhatsApp.",
  },
  {
    icon: TrendingUp,
    title: "Dashboard Financeiro",
    text: "Faturamento em tempo real, comissão por barbeiro, relatórios PDF prontos pra contabilidade.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Integrado",
    text: "Lembretes automáticos, confirmações, mensagens de aniversário. Tudo no piloto automático.",
  },
  {
    icon: Users,
    title: "Área do Cliente",
    text: "Histórico, pontos de fidelidade, reagendamento em 2 toques. Cliente volta sempre.",
  },
  {
    icon: Shield,
    title: "Painel Admin Completo",
    text: "Caixa, comissões, estoque, fornecedores, cupons, avaliações. Tudo num lugar só.",
  },
  {
    icon: Smartphone,
    title: "100% Mobile",
    text: "Funciona perfeito no celular, tablet e PC. Cliente agenda do sofá, você gerencia da cadeira.",
  },
];

const stats = [
  { value: "+300%", label: "agendamentos" },
  { value: "-80%", label: "no-shows" },
  { value: "24/7", label: "disponível" },
  { value: "0", label: "papel" },
];

export default function Portifolio() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.title = "Portfólio · Sistema Completo para Barbearias";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "Sistema profissional para barbearia: agendamento online, financeiro, WhatsApp e dashboard. Veja o portfólio e fale conosco.";
    if (meta) meta.setAttribute("content", desc);
    else {
      const m = document.createElement("meta");
      m.name = "description"; m.content = desc; document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ambient gradients */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full blur-[140px] opacity-20"
          style={{ background: "radial-gradient(circle, hsl(45 100% 50% / 0.6), transparent 70%)" }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full blur-[140px] opacity-15"
          style={{ background: "radial-gradient(circle, hsl(220 100% 60% / 0.5), transparent 70%)" }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[160px] opacity-10"
          style={{ background: "radial-gradient(circle, hsl(45 100% 50% / 0.4), transparent 70%)" }} />
      </div>

      {/* HERO */}
      <section ref={heroRef} className="relative min-h-[100svh] flex flex-col items-center justify-center px-5 pt-16 pb-10">
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 w-full max-w-md mx-auto text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 backdrop-blur-xl border"
            style={{ background: "hsl(0 0% 100% / 0.04)", borderColor: "hsl(0 0% 100% / 0.1)" }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: "hsl(45 100% 60%)" }} />
            <span className="text-xs font-medium tracking-wide text-foreground/80">Portfólio · 2026</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-bold leading-[1.05] tracking-tight"
            style={{ fontSize: "clamp(2.5rem, 9vw, 4rem)" }}
          >
            O sistema que sua{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, hsl(45 100% 60%), hsl(45 100% 45%))" }}
            >
              barbearia merece
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-5 text-base sm:text-lg text-foreground/65 leading-relaxed px-2"
          >
            Agendamento online, financeiro, WhatsApp e dashboard.
            <br className="hidden sm:block" />
            Tudo num só lugar. Pronto pra rodar hoje.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-8 flex flex-col items-center gap-3"
          >
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-semibold text-sm sm:text-base transition-all active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, hsl(45 100% 55%), hsl(45 100% 45%))",
                color: "hsl(0 0% 0%)",
                boxShadow: "0 10px 40px -10px hsl(45 100% 50% / 0.5)",
              }}
            >
              Quero esse sistema
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a href="#sistema" className="text-xs text-foreground/50 inline-flex items-center gap-1 mt-1">
              Ver o sistema funcionando <ChevronDown className="w-3 h-3 animate-bounce" />
            </a>
          </motion.div>

          {/* stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={mounted ? { opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-12 grid grid-cols-4 gap-2"
          >
            {stats.map((s, i) => (
              <div
                key={i}
                className="rounded-2xl py-3 backdrop-blur-xl border"
                style={{ background: "hsl(0 0% 100% / 0.03)", borderColor: "hsl(0 0% 100% / 0.08)" }}
              >
                <div
                  className="text-base sm:text-lg font-bold"
                  style={{ color: "hsl(45 100% 60%)" }}
                >
                  {s.value}
                </div>
                <div className="text-[10px] sm:text-[11px] text-foreground/55 mt-0.5">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* DOR */}
      <section className="relative px-5 py-20">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <span className="text-xs font-medium tracking-widest uppercase" style={{ color: "hsl(45 100% 60%)" }}>
              Reconhece isso?
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold leading-tight">
              Toda barbearia perde dinheiro<br />
              <span className="text-foreground/50">sem perceber.</span>
            </h2>
          </motion.div>

          <div className="space-y-3">
            {pains.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-2xl p-5 backdrop-blur-xl border flex gap-4"
                style={{ background: "hsl(0 0% 100% / 0.03)", borderColor: "hsl(0 0% 100% / 0.08)" }}
              >
                <div
                  className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "hsl(0 60% 50% / 0.12)", color: "hsl(0 70% 65%)" }}
                >
                  <p.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">{p.title}</h3>
                  <p className="mt-1 text-sm text-foreground/60 leading-relaxed">{p.text}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center mt-8 text-sm text-foreground/50 italic"
          >
            Cada cliente perdido = R$ 50, R$ 75, R$ 100 indo embora.<br />
            <span className="text-foreground/80 not-italic font-medium">Quanto isso dá no fim do mês?</span>
          </motion.p>
        </div>
      </section>

      {/* SISTEMA - mockups */}
      <section id="sistema" className="relative px-5 py-20">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <span className="text-xs font-medium tracking-widest uppercase" style={{ color: "hsl(45 100% 60%)" }}>
              A solução
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold leading-tight">
              Um sistema feito<br />
              <span style={{ color: "hsl(45 100% 60%)" }}>pra barbearia de verdade.</span>
            </h2>
            <p className="mt-4 text-sm text-foreground/60">
              Não é template genérico. Cada tela foi desenhada pro fluxo real de quem corta cabelo.
            </p>
          </motion.div>

          <div className="space-y-8">
            {[
              { img: mockup3, title: "Site profissional", desc: "Sua barbearia com cara de marca. Cliente confia antes mesmo de agendar." },
              { img: mockup1, title: "Agendamento intuitivo", desc: "3 toques pro cliente reservar. Sem cadastro chato, sem fricção." },
              { img: mockup2, title: "Painel completo", desc: "Você vê tudo: faturamento, agenda, comissões. No celular, em tempo real." },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="relative"
              >
                <div
                  className="rounded-3xl p-5 backdrop-blur-xl border overflow-hidden"
                  style={{ background: "hsl(0 0% 100% / 0.03)", borderColor: "hsl(0 0% 100% / 0.08)" }}
                >
                  <div className="relative rounded-2xl overflow-hidden mb-5"
                    style={{ boxShadow: "0 30px 60px -20px hsl(0 0% 0% / 0.6)" }}>
                    <img
                      src={item.img}
                      alt={item.title}
                      loading="lazy"
                      width={1024}
                      height={1024}
                      className="w-full h-auto block"
                    />
                  </div>
                  <h3 className="text-xl font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm text-foreground/60 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative px-5 py-20">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <span className="text-xs font-medium tracking-widest uppercase" style={{ color: "hsl(45 100% 60%)" }}>
              Tudo incluso
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold leading-tight">
              Funcionalidades que<br />
              <span className="text-foreground/50">fazem dinheiro.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                whileHover={{ y: -4 }}
                className="rounded-2xl p-5 backdrop-blur-xl border group"
                style={{ background: "hsl(0 0% 100% / 0.03)", borderColor: "hsl(0 0% 100% / 0.08)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{
                    background: "linear-gradient(135deg, hsl(45 100% 55% / 0.2), hsl(45 100% 45% / 0.05))",
                    color: "hsl(45 100% 65%)",
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
      <section className="relative px-5 py-20">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl p-7 backdrop-blur-xl border relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, hsl(0 0% 100% / 0.05), hsl(0 0% 100% / 0.02))",
              borderColor: "hsl(45 100% 50% / 0.2)",
            }}
          >
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[80px] opacity-20"
              style={{ background: "hsl(45 100% 50%)" }} />

            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5" style={{ color: "hsl(45 100% 60%)" }} />
                <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "hsl(45 100% 60%)" }}>
                  Por que comigo
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold leading-tight mb-6">
                Não é só código.<br />
                É um <span style={{ color: "hsl(45 100% 60%)" }}>sócio digital</span>.
              </h2>

              <ul className="space-y-3">
                {[
                  "Sistema pronto, rodando em horas — não em meses",
                  "Você vira dono do código, sem mensalidade infinita",
                  "Suporte direto comigo, no WhatsApp, sem call center",
                  "Personalizado pra sua marca, sua cor, seu jeito",
                  "Atualizações gratuitas no primeiro mês",
                ].map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="flex gap-3 text-sm"
                  >
                    <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "hsl(45 100% 60%)" }} />
                    <span className="text-foreground/85 leading-relaxed">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="relative px-5 py-16">
        <div className="max-w-md mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl p-8 backdrop-blur-xl border"
            style={{ background: "hsl(0 0% 100% / 0.03)", borderColor: "hsl(0 0% 100% / 0.08)" }}
          >
            <div className="flex justify-center gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" style={{ color: "hsl(45 100% 60%)" }} />
              ))}
            </div>
            <p className="text-base sm:text-lg text-foreground/85 italic leading-relaxed">
              "Triplicamos os agendamentos no primeiro mês. O cliente agenda sozinho de madrugada, sábado, domingo. Mudou o jogo."
            </p>
            <div className="mt-5 text-xs text-foreground/50">
              Barbearia parceira · Vitória/ES
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative px-5 py-24">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="text-center"
          >
            <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
              Sua concorrência<br />
              <span style={{ color: "hsl(45 100% 60%)" }}>já tá saindo na frente.</span>
            </h2>
            <p className="mt-5 text-base text-foreground/65 leading-relaxed">
              Cada dia sem sistema é dinheiro escapando.
              Vamos conversar agora — sem compromisso, só pra você ver na prática.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group w-full inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-semibold text-base transition-all active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, hsl(45 100% 55%), hsl(45 100% 45%))",
                  color: "hsl(0 0% 0%)",
                  boxShadow: "0 15px 50px -10px hsl(45 100% 50% / 0.6)",
                }}
              >
                Falar no WhatsApp agora
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
              <p className="text-[11px] text-foreground/40 mt-1">
                Resposta em minutos · Sem robô · Direto comigo
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="px-5 py-8 text-center text-xs text-foreground/40 border-t" style={{ borderColor: "hsl(0 0% 100% / 0.06)" }}>
        © 2026 · Sistema desenvolvido sob medida para barbearias.
      </footer>
    </div>
  );
}
