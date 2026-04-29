import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  Sparkles, Zap, Calendar, DollarSign, ShoppingBag, Users, Gift, Globe,
  Star, Layers, Check, ArrowRight, MessageCircle, Smartphone, BarChart3,
  Scissors, ChevronDown, Shield, Clock, TrendingUp, Wand2,
} from "lucide-react";

import mobileHome from "@/assets/lynecloud/mobile-home.png";
import mobileBooking1 from "@/assets/lynecloud/mobile-booking-1.png";
import mobileBooking2 from "@/assets/lynecloud/mobile-booking-2.png";

/* ============================================================
   LyneCloud — landing comercial da plataforma
   Rota: /lynecloud
   ============================================================ */

const WHATSAPP = "5511999999999"; // placeholder — substituir pelo número comercial
const PRICE = 150;

const features = [
  { icon: Zap, title: "Automação inteligente", desc: "Confirmações, lembretes e fluxos disparados sozinhos no WhatsApp." },
  { icon: Calendar, title: "Agenda em tempo real", desc: "Multi-barbeiro, escala, bloqueios, intervalo de almoço e folgas." },
  { icon: DollarSign, title: "Financeiro completo", desc: "Caixa, comandas, comissões, créditos e relatórios em um lugar." },
  { icon: ShoppingBag, title: "Loja integrada", desc: "Produtos, delivery ou retirada, rastreio de pedido e cupons." },
  { icon: Gift, title: "Roleta de prêmios", desc: "Engaje clientes com sorteios, cupons e descontos automáticos." },
  { icon: Globe, title: "Site personalizado", desc: "Domínio próprio, identidade visual e SEO otimizado." },
  { icon: Star, title: "Avaliações públicas", desc: "Reputação que vende sozinha — clientes avaliam após cada visita." },
  { icon: Users, title: "Multi-barbeiro", desc: "Cada profissional com agenda, comissão e desempenho próprios." },
  { icon: Layers, title: "Estoque e fornecedores", desc: "Controle de produtos, entradas, baixas e alertas de mínimo." },
];

const planFeatures = [
  "Agenda inteligente com confirmação automática",
  "Notificações automatizadas para clientes",
  "Painel financeiro completo (caixa, comissões, créditos)",
  "Loja online integrada (delivery + retirada)",
  "Comandas e controle de estoque",
  "Roleta de prêmios e cupons",
  "Site personalizado com domínio próprio",
  "Avaliações públicas automáticas",
  "Multi-barbeiro com escalas e folgas",
  "Suporte prioritário e atualizações contínuas",
];

const faqs = [
  { q: "Preciso instalar alguma coisa?", a: "Não. É 100% online. Você acessa do navegador no computador, tablet ou celular." },
  { q: "Quanto tempo leva pra começar?", a: "Em até 24h sua conta está pronta, com identidade visual e domínio configurados." },
  { q: "Posso usar meu próprio domínio?", a: "Sim — apontando o DNS você publica seu site em minhas-barbearia.com.br." },
  { q: "Como funciona o cancelamento?", a: "Mensal e sem fidelidade. Cancele quando quiser direto pelo painel." },
  { q: "Os clientes precisam baixar app?", a: "Não — agendam direto pelo site, com experiência de aplicativo." },
];

const LyneCloud = () => {
  /* ----- SEO ----- */
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "LyneCloud — Gestão inteligente para barbearias";
    const meta = document.querySelector('meta[name="description"]') ||
      Object.assign(document.createElement("meta"), { name: "description" });
    (meta as HTMLMetaElement).content =
      "Plataforma all-in-one com agenda, financeiro, loja, automação e site personalizado. R$ 150/mês.";
    document.head.appendChild(meta);
    return () => { document.title = prevTitle; };
  }, []);

  /* ----- Parallax hero mockup ----- */
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const yMockup = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const opacityMockup = useTransform(scrollYProgress, [0, 1], [1, 0.4]);

  /* ----- Sticky nav blur ----- */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ----- Showcase tabs ----- */
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "finance", label: "Financeiro", icon: DollarSign },
    { id: "agenda", label: "Agenda", icon: Calendar },
  ];
  const [tab, setTab] = useState(tabs[0].id);

  const waUrl = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Olá! Quero conhecer a LyneCloud.")}`;

  return (
    <div className="min-h-screen text-foreground antialiased relative overflow-x-hidden"
         style={{ background: "hsl(220 25% 4%)" }}>

      {/* ambient background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-32 w-[500px] h-[500px] rounded-full opacity-30 blur-[120px]"
             style={{ background: "radial-gradient(circle, hsl(245 80% 55%), transparent 70%)" }} />
        <div className="absolute top-[600px] -right-32 w-[600px] h-[600px] rounded-full opacity-25 blur-[140px]"
             style={{ background: "radial-gradient(circle, hsl(280 70% 55%), transparent 70%)" }} />
      </div>

      {/* ============ NAV ============ */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "py-2.5" : "py-5"}`}
           style={{
             background: scrolled ? "hsl(220 25% 4% / 0.7)" : "transparent",
             backdropFilter: scrolled ? "blur(16px)" : "none",
             borderBottom: scrolled ? "1px solid hsl(0 0% 100% / 0.06)" : "1px solid transparent",
           }}>
        <div className="max-w-7xl mx-auto px-5 md:px-8 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                 style={{ background: "linear-gradient(135deg, hsl(245 80% 60%), hsl(280 70% 55%))" }}>
              <Wand2 className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">LyneCloud</span>
          </a>
          <div className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Recursos</a>
            <a href="#showcase" className="hover:text-foreground transition">Painel</a>
            <a href="#mobile" className="hover:text-foreground transition">Mobile</a>
            <a href="#pricing" className="hover:text-foreground transition">Plano</a>
            <a href="#faq" className="hover:text-foreground transition">FAQ</a>
          </div>
          <a href={waUrl} target="_blank" rel="noreferrer"
             className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02]"
             style={{ background: "linear-gradient(135deg, hsl(245 80% 60%), hsl(280 70% 55%))" }}>
            Começar <ArrowRight className="w-3.5 h-3.5"/>
          </a>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section id="top" ref={heroRef} className="relative pt-36 pb-24 md:pt-44 md:pb-32 px-5 md:px-8">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
                 style={{ background: "hsl(245 80% 60% / 0.12)", border: "1px solid hsl(245 80% 60% / 0.25)", color: "hsl(245 80% 75%)" }}>
              <Sparkles className="w-3.5 h-3.5"/> Plataforma all-in-one para barbearias
            </div>
            <h1 className="text-[2.6rem] sm:text-5xl lg:text-[4rem] font-bold leading-[1.05] tracking-tight">
              Gestão <span style={{
                background: "linear-gradient(135deg, hsl(245 90% 70%), hsl(290 80% 70%))",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>inteligente</span><br/>pra sua barbearia.
            </h1>
            <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
              Agenda, financeiro, loja online, comandas, comissões, automação e site
              personalizado em um só painel. Lance hoje, escale amanhã.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href={waUrl} target="_blank" rel="noreferrer"
                 className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold text-white shadow-2xl transition hover:scale-[1.03]"
                 style={{ background: "linear-gradient(135deg, hsl(245 80% 60%), hsl(280 70% 55%))",
                          boxShadow: "0 20px 60px -10px hsl(245 80% 55% / 0.6)" }}>
                Começar agora <ArrowRight className="w-4 h-4"/>
              </a>
              <a href="#showcase"
                 className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold transition hover:bg-white/5"
                 style={{ border: "1px solid hsl(0 0% 100% / 0.12)", color: "hsl(0 0% 90%)" }}>
                Ver o painel
              </a>
            </div>
            <div className="mt-8 flex items-center gap-5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Shield className="w-3.5 h-3.5"/> Sem fidelidade</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Setup em 24h</span>
              <span className="inline-flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5"/> Atualizações grátis</span>
            </div>
          </motion.div>

          {/* Hero panel mockup */}
          <motion.div style={{ y: yMockup, opacity: opacityMockup }}
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.7, delay: 0.15 }}>
            <PanelMockup variant="dashboard" />
          </motion.div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" className="relative py-24 px-5 md:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}
                      className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Tudo que sua barbearia precisa</h2>
            <p className="mt-3 text-muted-foreground">Recursos pensados pra reduzir o trabalho manual e aumentar o ticket médio.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div key={f.title}
                          initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.4, delay: i * 0.04 }}
                          whileHover={{ y: -4 }}
                          className="rounded-2xl p-5 transition group"
                          style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                <div className="w-11 h-11 rounded-xl mb-4 flex items-center justify-center transition group-hover:scale-110"
                     style={{ background: "linear-gradient(135deg, hsl(245 80% 60% / 0.18), hsl(280 70% 55% / 0.12))",
                              border: "1px solid hsl(245 80% 60% / 0.2)" }}>
                  <f.icon className="w-5 h-5" style={{ color: "hsl(245 80% 75%)" }}/>
                </div>
                <h3 className="font-semibold text-[15px] mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SHOWCASE PAINEL ============ */}
      <section id="showcase" className="relative py-24 px-5 md:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}
                      className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Um painel pra dominar a operação</h2>
            <p className="mt-3 text-muted-foreground">Interface moderna, rápida e desenhada pra quem decide.</p>
          </motion.div>

          {/* tabs */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex p-1 rounded-2xl"
                 style={{ background: "hsl(0 0% 100% / 0.04)", border: "1px solid hsl(0 0% 100% / 0.08)" }}>
              {tabs.map((tb) => (
                <button key={tb.id} onClick={() => setTab(tb.id)}
                        className={`relative px-4 py-2 text-sm font-semibold rounded-xl transition inline-flex items-center gap-2 ${
                          tab === tb.id ? "text-white" : "text-muted-foreground hover:text-foreground"
                        }`}>
                  {tab === tb.id && (
                    <motion.div layoutId="tab-bg" className="absolute inset-0 rounded-xl"
                                style={{ background: "linear-gradient(135deg, hsl(245 80% 60%), hsl(280 70% 55%))" }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}/>
                  )}
                  <span className="relative inline-flex items-center gap-2">
                    <tb.icon className="w-4 h-4"/> {tb.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <PanelMockup variant={tab as any}/>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ============ MOBILE APP-LIKE ============ */}
      <section id="mobile" className="relative py-24 px-5 md:px-8">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_1.1fr] gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5"
                 style={{ background: "hsl(280 70% 60% / 0.12)", border: "1px solid hsl(280 70% 60% / 0.25)", color: "hsl(280 70% 80%)" }}>
              <Smartphone className="w-3.5 h-3.5"/> Experiência de aplicativo
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Seus clientes agendam<br/>como se fosse um app.
            </h2>
            <p className="mt-4 text-muted-foreground max-w-md">
              Sem download, sem cadastro chato. Em 4 toques o agendamento está confirmado
              e o cliente recebe a mensagem no WhatsApp.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Sem app pra baixar — abre direto no navegador",
                "Confirmação automática via WhatsApp",
                "Calendário com horários reais e bloqueios",
                "Check-in, histórico e roleta de prêmios",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 mt-0.5 rounded-md flex items-center justify-center shrink-0"
                       style={{ background: "hsl(140 60% 45% / 0.15)", border: "1px solid hsl(140 60% 45% / 0.25)" }}>
                    <Check className="w-3 h-3" style={{ color: "hsl(140 70% 60%)" }}/>
                  </div>
                  <span className="text-muted-foreground">{line}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* phone frames with real screenshots */}
          <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}
                      className="relative h-[640px] flex items-center justify-center">
            <PhoneFrame src={mobileBooking2} className="absolute z-10 -rotate-[8deg] -translate-x-[58%]" />
            <PhoneFrame src={mobileHome} className="relative z-30 scale-[1.05]" />
            <PhoneFrame src={mobileBooking1} className="absolute z-20 rotate-[8deg] translate-x-[58%]" />
          </motion.div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" className="relative py-24 px-5 md:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}
                      className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Plano único, simples e completo</h2>
            <p className="mt-3 text-muted-foreground">Tudo incluso. Sem surpresa, sem upgrade escondido.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}
                      className="relative rounded-3xl p-[1.5px]"
                      style={{ background: "linear-gradient(135deg, hsl(245 80% 60%), hsl(280 70% 55%), hsl(245 80% 60%))" }}>
            <div className="relative rounded-3xl p-8 md:p-10 overflow-hidden"
                 style={{ background: "hsl(220 25% 5%)" }}>
              <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-30 blur-3xl"
                   style={{ background: "hsl(280 70% 55%)" }}/>

              <div className="relative grid md:grid-cols-[1.1fr_1fr] gap-10 items-start">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                        style={{ background: "hsl(245 80% 60% / 0.18)", color: "hsl(245 80% 80%)", border: "1px solid hsl(245 80% 60% / 0.3)" }}>
                    <Sparkles className="w-3 h-3"/> Mais popular
                  </span>
                  <h3 className="mt-3 text-2xl font-bold">LyneCloud Pro</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">Pra barbearias que querem crescer com previsibilidade.</p>

                  <div className="mt-6 flex items-baseline gap-2">
                    <span className="text-5xl font-bold tracking-tight">R${PRICE}</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Sem fidelidade. Cancele a qualquer momento.</p>

                  <a href={waUrl} target="_blank" rel="noreferrer"
                     className="mt-7 inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl text-sm font-bold text-white shadow-2xl transition hover:scale-[1.02]"
                     style={{ background: "linear-gradient(135deg, hsl(245 80% 60%), hsl(280 70% 55%))",
                              boxShadow: "0 20px 50px -10px hsl(245 80% 55% / 0.55)" }}>
                    Quero contratar <ArrowRight className="w-4 h-4"/>
                  </a>
                  <a href={waUrl} target="_blank" rel="noreferrer"
                     className="mt-2.5 inline-flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl text-sm font-semibold transition hover:bg-white/5"
                     style={{ border: "1px solid hsl(0 0% 100% / 0.12)", color: "hsl(0 0% 85%)" }}>
                    <MessageCircle className="w-4 h-4"/> Falar no WhatsApp
                  </a>
                </div>

                <ul className="space-y-3">
                  {planFeatures.map((line) => (
                    <li key={line} className="flex items-start gap-2.5 text-sm">
                      <div className="w-5 h-5 mt-0.5 rounded-md flex items-center justify-center shrink-0"
                           style={{ background: "hsl(140 60% 45% / 0.15)", border: "1px solid hsl(140 60% 45% / 0.25)" }}>
                        <Check className="w-3 h-3" style={{ color: "hsl(140 70% 60%)" }}/>
                      </div>
                      <span className="text-foreground/85">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="relative py-24 px-5 md:px-8">
        <div className="max-w-2xl mx-auto">
          <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true }} transition={{ duration: 0.5 }}
                     className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-10">
            Perguntas frequentes
          </motion.h2>
          <div className="space-y-3">
            {faqs.map((f, i) => <FaqItem key={i} {...f}/>)}
          </div>
        </div>
      </section>

      {/* ============ CTA FOOTER ============ */}
      <section className="relative py-20 px-5 md:px-8">
        <div className="max-w-4xl mx-auto rounded-3xl p-10 md:p-14 text-center relative overflow-hidden"
             style={{ background: "linear-gradient(135deg, hsl(245 80% 18%), hsl(280 70% 16%))",
                      border: "1px solid hsl(245 80% 60% / 0.25)" }}>
          <div className="absolute inset-0 opacity-30"
               style={{ background: "radial-gradient(circle at 30% 20%, hsl(245 80% 60%), transparent 60%)" }}/>
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Pronto pra modernizar sua barbearia?</h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
              Setup em 24h, sem instalação, sem fidelidade. Comece hoje.
            </p>
            <a href={waUrl} target="_blank" rel="noreferrer"
               className="mt-7 inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold text-white shadow-2xl transition hover:scale-[1.03]"
               style={{ background: "linear-gradient(135deg, hsl(245 80% 60%), hsl(280 70% 55%))",
                        boxShadow: "0 20px 60px -10px hsl(245 80% 55% / 0.6)" }}>
              Começar agora <ArrowRight className="w-4 h-4"/>
            </a>
          </div>
        </div>
      </section>

      <footer className="relative py-10 px-5 md:px-8 border-t" style={{ borderColor: "hsl(0 0% 100% / 0.06)" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                 style={{ background: "linear-gradient(135deg, hsl(245 80% 60%), hsl(280 70% 55%))" }}>
              <Wand2 className="w-3.5 h-3.5 text-white"/>
            </div>
            <span className="font-semibold text-foreground">LyneCloud</span>
            <span className="text-xs">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-5 text-xs">
            <a href="#features" className="hover:text-foreground">Recursos</a>
            <a href="#pricing" className="hover:text-foreground">Plano</a>
            <a href={waUrl} target="_blank" rel="noreferrer" className="hover:text-foreground">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

/* ============================================================
   FAQ ITEM (collapsible)
   ============================================================ */
const FaqItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen((o) => !o)}
            className="w-full text-left rounded-2xl p-5 transition"
            style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
      <div className="flex items-center justify-between gap-4">
        <span className="font-semibold text-[15px]">{q}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}/>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                      className="overflow-hidden">
            <p className="pt-3 text-sm text-muted-foreground leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};

/* ============================================================
   PHONE FRAME
   ============================================================ */
const PhoneFrame = ({ src, className = "" }: { src: string; className?: string }) => (
  <div className={`relative rounded-[2.4rem] p-2 shadow-2xl ${className}`}
       style={{
         background: "linear-gradient(180deg, hsl(220 20% 14%), hsl(220 20% 8%))",
         border: "1px solid hsl(0 0% 100% / 0.08)",
         width: 240, height: 500,
         boxShadow: "0 30px 80px -20px hsl(245 80% 50% / 0.5), 0 0 0 1px hsl(0 0% 100% / 0.04)",
       }}>
    <div className="w-full h-full rounded-[1.9rem] overflow-hidden relative" style={{ background: "hsl(220 25% 4%)" }}>
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full z-10" style={{ background: "hsl(220 20% 6%)" }}/>
      <img src={src} alt="" className="w-full h-full object-cover object-top"/>
    </div>
  </div>
);

/* ============================================================
   PANEL MOCKUP — high-fidelity replica of the real admin
   (uses same design tokens: hsl(220 25% 6%), accents, glassmorphism)
   ============================================================ */
const PanelMockup = ({ variant }: { variant: "dashboard" | "finance" | "agenda" }) => (
  <div className="rounded-2xl overflow-hidden shadow-2xl"
       style={{
         background: "hsl(220 25% 5%)",
         border: "1px solid hsl(0 0% 100% / 0.08)",
         boxShadow: "0 40px 100px -20px hsl(245 80% 50% / 0.4), 0 0 0 1px hsl(0 0% 100% / 0.04)",
       }}>
    {/* window chrome */}
    <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "hsl(220 25% 4%)", borderBottom: "1px solid hsl(0 0% 100% / 0.06)" }}>
      <div className="flex gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(0 70% 60%)" }}/>
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(40 80% 60%)" }}/>
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(140 60% 50%)" }}/>
      </div>
      <div className="flex-1 text-center text-[10px] text-muted-foreground font-mono">painel.lynecloud.app</div>
    </div>

    <div className="grid grid-cols-[180px_1fr]" style={{ minHeight: 420 }}>
      {/* sidebar */}
      <div className="p-3 space-y-1" style={{ background: "hsl(230 18% 6%)", borderRight: "1px solid hsl(0 0% 100% / 0.05)" }}>
        <div className="flex items-center gap-2 px-2 py-2.5 mb-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
               style={{ background: "linear-gradient(135deg, hsl(245 80% 60%), hsl(280 70% 55%))" }}>
            <Scissors className="w-3.5 h-3.5 text-white"/>
          </div>
          <span className="text-xs font-bold">LyneCloud</span>
        </div>
        {[
          { icon: BarChart3, label: "Dashboard", active: variant === "dashboard" },
          { icon: Calendar, label: "Agenda", active: variant === "agenda" },
          { icon: DollarSign, label: "Financeiro", active: variant === "finance" },
          { icon: Users, label: "Barbeiros" },
          { icon: ShoppingBag, label: "Loja" },
          { icon: Star, label: "Avaliações" },
          { icon: Gift, label: "Cupons" },
        ].map((it) => (
          <div key={it.label}
               className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition"
               style={{
                 background: it.active ? "linear-gradient(135deg, hsl(245 80% 60% / 0.18), hsl(280 70% 55% / 0.1))" : "transparent",
                 color: it.active ? "hsl(0 0% 95%)" : "hsl(0 0% 55%)",
                 border: it.active ? "1px solid hsl(245 80% 60% / 0.25)" : "1px solid transparent",
               }}>
            <it.icon className="w-3.5 h-3.5"/> {it.label}
          </div>
        ))}
      </div>

      {/* content */}
      <div className="p-5 space-y-4">
        {variant === "dashboard" && <DashboardMockup/>}
        {variant === "finance" && <FinanceMockup/>}
        {variant === "agenda" && <AgendaMockup/>}
      </div>
    </div>
  </div>
);

const DashboardMockup = () => (
  <>
    <div className="flex items-center justify-between">
      <div>
        <h4 className="text-sm font-bold">Dashboard</h4>
        <p className="text-[10px] text-muted-foreground">Visão geral · Hoje</p>
      </div>
      <div className="text-[10px] text-muted-foreground">29 abr 2026</div>
    </div>
    <div className="grid grid-cols-4 gap-2.5">
      {[
        { label: "Receita hoje", value: "R$ 2.840", trend: "+12%", color: "hsl(140 70% 60%)" },
        { label: "Agendamentos", value: "38", trend: "+5", color: "hsl(245 80% 70%)" },
        { label: "Ticket médio", value: "R$ 74", trend: "+R$3", color: "hsl(280 70% 70%)" },
        { label: "Avaliação", value: "4.9", trend: "★★★★★", color: "hsl(40 90% 60%)" },
      ].map((c) => (
        <div key={c.label} className="rounded-xl p-3"
             style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{c.label}</div>
          <div className="text-lg font-bold mt-1">{c.value}</div>
          <div className="text-[9px] mt-0.5" style={{ color: c.color }}>{c.trend}</div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-[2fr_1fr] gap-3">
      <div className="rounded-xl p-4" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
        <div className="text-[10px] font-semibold mb-3">Receita últimos 7 dias</div>
        <svg viewBox="0 0 200 80" className="w-full h-28">
          <defs>
            <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(245 80% 60%)" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="hsl(245 80% 60%)" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d="M0,60 L30,45 L60,55 L90,30 L120,40 L150,20 L180,28 L200,15 L200,80 L0,80 Z" fill="url(#g1)"/>
          <path d="M0,60 L30,45 L60,55 L90,30 L120,40 L150,20 L180,28 L200,15" fill="none" stroke="hsl(245 80% 70%)" strokeWidth="1.5"/>
        </svg>
      </div>
      <div className="rounded-xl p-4" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
        <div className="text-[10px] font-semibold mb-3">Próximos</div>
        {["09:00 · Daniel", "09:30 · Marcos", "10:00 · Júlio"].map((l) => (
          <div key={l} className="flex items-center gap-2 py-1.5 text-[10px] text-muted-foreground">
            <div className="w-1 h-1 rounded-full" style={{ background: "hsl(245 80% 60%)" }}/>
            {l}
          </div>
        ))}
      </div>
    </div>
  </>
);

const FinanceMockup = () => (
  <>
    <div className="flex items-center justify-between">
      <div>
        <h4 className="text-sm font-bold">Financeiro</h4>
        <p className="text-[10px] text-muted-foreground">Caixa · abril 2026</p>
      </div>
      <div className="px-2 py-1 rounded-md text-[9px] font-semibold"
           style={{ background: "hsl(140 60% 45% / 0.15)", color: "hsl(140 70% 65%)", border: "1px solid hsl(140 60% 45% / 0.25)" }}>
        Caixa aberto
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2.5">
      {[
        { label: "Entradas", value: "R$ 18.420", color: "hsl(140 70% 60%)" },
        { label: "Saídas", value: "R$ 3.150", color: "hsl(0 70% 65%)" },
        { label: "Saldo", value: "R$ 15.270", color: "hsl(245 80% 70%)" },
      ].map((c) => (
        <div key={c.label} className="rounded-xl p-3"
             style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{c.label}</div>
          <div className="text-lg font-bold mt-1" style={{ color: c.color }}>{c.value}</div>
        </div>
      ))}
    </div>
    <div className="rounded-xl overflow-hidden" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
      <div className="px-3 py-2 text-[10px] font-semibold border-b" style={{ borderColor: "hsl(0 0% 100% / 0.05)" }}>
        Movimentações recentes
      </div>
      {[
        { d: "Hoje 14:32", desc: "Corte + Barba — Daniel", v: "+R$ 75", c: "hsl(140 70% 60%)" },
        { d: "Hoje 13:10", desc: "Produto · Pomada", v: "+R$ 45", c: "hsl(140 70% 60%)" },
        { d: "Hoje 11:00", desc: "Comissão · Marcos", v: "-R$ 120", c: "hsl(0 70% 65%)" },
        { d: "Hoje 09:42", desc: "Corte Masculino", v: "+R$ 45", c: "hsl(140 70% 60%)" },
      ].map((r, i) => (
        <div key={i} className="flex items-center justify-between px-3 py-2 text-[10px]"
             style={{ borderTop: i ? "1px solid hsl(0 0% 100% / 0.04)" : "none" }}>
          <span className="text-muted-foreground">{r.d}</span>
          <span className="flex-1 px-3">{r.desc}</span>
          <span className="font-semibold" style={{ color: r.c }}>{r.v}</span>
        </div>
      ))}
    </div>
  </>
);

const AgendaMockup = () => {
  const hours = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];
  const slots = [
    { h: 0, b: 0, c: "Daniel · Corte", color: "hsl(245 80% 60%)" },
    { h: 1, b: 1, c: "Marcos · Combo", color: "hsl(280 70% 60%)" },
    { h: 2, b: 0, c: "Júlio · Barba", color: "hsl(140 60% 50%)" },
    { h: 3, b: 2, c: "Almoço", color: "hsl(40 80% 55%)" },
    { h: 4, b: 1, c: "Pedro · Corte", color: "hsl(245 80% 60%)" },
    { h: 5, b: 2, c: "Lucas · Combo", color: "hsl(280 70% 60%)" },
    { h: 6, b: 0, c: "Caio · Barba", color: "hsl(140 60% 50%)" },
  ];
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold">Agenda</h4>
          <p className="text-[10px] text-muted-foreground">Quarta · 29 abr</p>
        </div>
        <div className="flex gap-1.5">
          {["Daniel", "Marcos", "Júlio"].map((b, i) => (
            <span key={b} className="px-2 py-0.5 rounded-md text-[9px]"
                  style={{
                    background: ["hsl(245 80% 60% / 0.15)", "hsl(280 70% 60% / 0.15)", "hsl(140 60% 50% / 0.15)"][i],
                    color: ["hsl(245 80% 75%)", "hsl(280 70% 75%)", "hsl(140 60% 65%)"][i],
                  }}>{b}</span>
          ))}
        </div>
      </div>
      <div className="rounded-xl overflow-hidden grid grid-cols-[50px_1fr_1fr_1fr] text-[9px]"
           style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
        <div></div>
        {["Daniel", "Marcos", "Júlio"].map((b) => (
          <div key={b} className="px-2 py-1.5 text-center font-semibold border-l" style={{ borderColor: "hsl(0 0% 100% / 0.05)" }}>{b}</div>
        ))}
        {hours.map((h, hi) => (
          <>
            <div key={h} className="px-2 py-2.5 text-muted-foreground border-t" style={{ borderColor: "hsl(0 0% 100% / 0.04)" }}>{h}</div>
            {[0, 1, 2].map((bi) => {
              const slot = slots.find((s) => s.h === hi && s.b === bi);
              return (
                <div key={`${hi}-${bi}`} className="border-t border-l p-1" style={{ borderColor: "hsl(0 0% 100% / 0.04)" }}>
                  {slot && (
                    <div className="rounded-md px-1.5 py-1 text-[8px] font-medium"
                         style={{ background: `${slot.color.replace(")", " / 0.18)")}`, color: slot.color, border: `1px solid ${slot.color.replace(")", " / 0.3)")}` }}>
                      {slot.c}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </>
  );
};

export default LyneCloud;
