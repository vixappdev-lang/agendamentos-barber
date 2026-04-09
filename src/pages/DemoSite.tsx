import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Scissors, MapPin, Phone, Clock, Instagram, Facebook, ChevronLeft, ChevronRight, Star, Menu, X, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PHONE = "5531992268984";
const PHONE_DISPLAY = "(31) 99226-8984";
const ADDRESS = "Av. Amazonas, 931, Próximo ao Mercado Central - Centro, Belo Horizonte - MG";
const GOOGLE_MAPS_URL = "https://www.google.com/maps/place/Jack+Hair+%26+Barber/@-19.9217537,-43.9455316,17z";
const INSTAGRAM = "https://instagram.com/jackhairbarber";
const FACEBOOK = "https://www.facebook.com/jackhairbarber";
const LOGO = "https://salaojack.com.br/wp-content/uploads/2023/11/logo-jack-png.png";

const portfolioImages = [
  "https://salaojack.com.br/wp-content/uploads/2023/11/WhatsApp-Image-2023-11-13-at-17.12.43.jpeg",
  "https://salaojack.com.br/wp-content/uploads/2023/11/WhatsApp-Image-2023-11-13-at-16.00.53.jpeg",
  "https://salaojack.com.br/wp-content/uploads/2023/11/WhatsApp-Image-2023-11-13-at-16.12.49.jpeg",
  "https://salaojack.com.br/wp-content/uploads/2023/11/WhatsApp-Image-2023-11-13-at-16.20.17.jpeg",
  "https://salaojack.com.br/wp-content/uploads/2023/11/WhatsApp-Image-2023-11-13-at-16.40.31.jpeg",
  "https://salaojack.com.br/wp-content/uploads/2023/11/WhatsApp-Image-2023-11-13-at-16.56.40.jpeg",
];

const services = [
  { name: "Cabelo & Barba", icon: "https://salaojack.com.br/wp-content/uploads/2023/11/haircut.png" },
  { name: "Relaxamento", icon: "https://salaojack.com.br/wp-content/uploads/2023/11/hair.png" },
  { name: "Barbaterapia", icon: "https://salaojack.com.br/wp-content/uploads/2023/11/beard.png" },
  { name: "Progressiva", icon: "https://salaojack.com.br/wp-content/uploads/2023/11/hair-iron.png" },
  { name: "Platinado", icon: "https://salaojack.com.br/wp-content/uploads/2023/11/hair-dye.png" },
  { name: "Tintura de Cabelo", icon: "https://salaojack.com.br/wp-content/uploads/2023/11/paint.png" },
  { name: "Unha (Pé e Mão)", icon: "https://salaojack.com.br/wp-content/uploads/2023/11/nail-polish.png" },
  { name: "Sobrancelha", icon: "https://salaojack.com.br/wp-content/uploads/2023/11/eyebrow.png" },
  { name: "Luzes e Mechas", icon: "https://salaojack.com.br/wp-content/uploads/2023/11/hairdresser.png" },
  { name: "Limpeza de Pele", icon: "https://salaojack.com.br/wp-content/uploads/2023/11/cleansing.png" },
  { name: "Hidratação", icon: "https://salaojack.com.br/wp-content/uploads/2023/11/hairdresser.png" },
  { name: "Botox Capilar", icon: "https://salaojack.com.br/wp-content/uploads/2023/11/hairdresser.png" },
];

const reviews = [
  { name: "Carlos M.", text: "Melhor barbearia de BH! Atendimento impecável e corte perfeito.", rating: 5 },
  { name: "Rafael S.", text: "Ambiente incrível, profissionais de primeira. Sempre saio satisfeito!", rating: 5 },
  { name: "Pedro H.", text: "Serviço excelente, barba feita com perfeição. Recomendo demais!", rating: 5 },
  { name: "Lucas A.", text: "Frequento há 2 anos e nunca me decepcionou. Top demais!", rating: 5 },
];

const DemoSite = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const headerOpacity = useTransform(scrollYProgress, [0, 0.05], [0, 1]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((p) => (p + 1) % portfolioImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const scrollToSection = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const goToBooking = () => navigate("/");

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden">
      {/* Fixed Header */}
      <motion.header
        style={{ opacity: headerOpacity }}
        className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <img src={LOGO} alt="Jack Hair" className="h-10 sm:h-14 w-auto" />
          <nav className="hidden md:flex items-center gap-8">
            {["Serviços", "Portfólio", "Sobre", "Local"].map((item) => (
              <button key={item} onClick={() => scrollToSection(item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))}
                className="text-sm font-medium text-white/70 hover:text-[hsl(45,100%,50%)] transition-colors tracking-wide uppercase">
                {item}
              </button>
            ))}
            <button onClick={goToBooking}
              className="px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all hover:scale-105"
              style={{ background: "hsl(45 100% 50%)", color: "#000" }}>
              Agendar
            </button>
          </nav>
          <button onClick={() => setMenuOpen(true)} className="md:hidden p-2">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-72 z-[70] bg-[hsl(0,0%,8%)] border-l border-white/10 flex flex-col p-6">
              <button onClick={() => setMenuOpen(false)} className="self-end p-2 mb-8"><X className="w-5 h-5" /></button>
              {["Serviços", "Portfólio", "Sobre", "Local"].map((item) => (
                <button key={item} onClick={() => scrollToSection(item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))}
                  className="text-left py-3 text-lg font-medium text-white/80 hover:text-[hsl(45,100%,50%)] transition-colors border-b border-white/5">
                  {item}
                </button>
              ))}
              <button onClick={() => { setMenuOpen(false); goToBooking(); }}
                className="mt-6 w-full py-3 rounded-xl text-base font-bold uppercase tracking-wider"
                style={{ background: "hsl(45 100% 50%)", color: "#000" }}>
                Agendar Agora
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://salaojack.com.br/wp-content/uploads/2023/11/Fotos-barbearia-2.png"
            alt="Jack Hair & Barber"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-xl"
          >
            <img src={LOGO} alt="Jack Hair" className="h-16 sm:h-20 w-auto mb-6 sm:mb-8" />
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight">
              Que tal andar sempre{" "}
              <span style={{ color: "hsl(45 100% 50%)" }}>Bonito?</span>
            </h1>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-white/70 leading-relaxed max-w-md">
              A barbearia Jack pode realçar a sua beleza, pois deixar uma boa impressão é fundamental para o seu sucesso, seja qual for a ocasião.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <motion.button
                onClick={goToBooking}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 rounded-xl text-base sm:text-lg font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                style={{ background: "hsl(45 100% 50%)", color: "#000", boxShadow: "0 8px 30px hsl(45 100% 50% / 0.3)" }}
              >
                <Scissors className="w-5 h-5" />
                Agendar Agora!
              </motion.button>
              <a href={`https://api.whatsapp.com/send?phone=${PHONE}`} target="_blank" rel="noreferrer"
                className="px-8 py-4 rounded-xl text-base font-semibold border border-white/20 text-white/80 hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                <Phone className="w-5 h-5" /> WhatsApp
              </a>
            </div>
          </motion.div>
        </div>
        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[hsl(45,100%,50%)]" />
        </motion.div>
      </section>

      {/* Portfolio Section */}
      <section id="portfolio" className="py-16 sm:py-24 bg-[hsl(0,0%,4%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10 sm:mb-14">
            <span className="text-sm font-bold uppercase tracking-[0.3em]" style={{ color: "hsl(45 100% 50%)" }}>Portfólio</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold mt-2 sm:mt-3">Veja nossos serviços</h2>
          </motion.div>
          <div className="relative">
            <div ref={carouselRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4">
              {portfolioImages.map((img, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="snap-center shrink-0 w-64 sm:w-72 lg:w-80 aspect-[3/4] rounded-2xl overflow-hidden relative group"
                >
                  <img src={img} alt={`Portfolio ${i + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicos" className="py-16 sm:py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10 sm:mb-14">
            <span className="text-sm font-bold uppercase tracking-[0.3em]" style={{ color: "hsl(45 100% 50%)" }}>Nossos Serviços</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold mt-2 sm:mt-3">Como podemos te ajudar hoje?</h2>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {services.map((s, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -5, borderColor: "hsl(45 100% 50% / 0.3)" }}
                className="flex flex-col items-center gap-3 sm:gap-4 p-4 sm:p-6 rounded-2xl border border-white/5 bg-white/[0.02] cursor-pointer transition-all hover:bg-white/[0.04]"
                onClick={goToBooking}
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center" style={{ background: "hsl(45 100% 50% / 0.08)" }}>
                  <img src={s.icon} alt={s.name} className="w-7 h-7 sm:w-9 sm:h-9" loading="lazy" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-center text-white/80">{s.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="relative py-16 sm:py-20 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, hsl(45 100% 50%), hsl(40 100% 42%))" }} />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0zMCAzMG0tMiAwYTIgMiAwIDEgMCA0IDBhMiAyIDAgMSAwLTQgMCIgZmlsbD0icmdiYSgwLDAsMCwwLjA1KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')] opacity-30" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-black leading-tight">
              Pronto para ficar no estilo?
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-black/70 max-w-xl mx-auto">
              Agende agora mesmo e garanta o seu horário na melhor barbearia de BH.
            </p>
            <motion.button
              onClick={goToBooking}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="mt-6 sm:mt-8 px-8 sm:px-10 py-4 rounded-xl text-base sm:text-lg font-bold uppercase tracking-wider bg-black text-white hover:bg-black/90 transition-all flex items-center gap-2 mx-auto"
              style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.3)" }}
            >
              Agendar Agora <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Reviews */}
      <section className="py-16 sm:py-24 bg-[hsl(0,0%,4%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10 sm:mb-14">
            <span className="text-sm font-bold uppercase tracking-[0.3em]" style={{ color: "hsl(45 100% 50%)" }}>Depoimentos</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold mt-2 sm:mt-3">O que dizem nossos clientes</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {reviews.map((r, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-5 sm:p-6 rounded-2xl border border-white/5 bg-white/[0.02]"
              >
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: r.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-[hsl(45,100%,50%)]" style={{ color: "hsl(45 100% 50%)" }} />
                  ))}
                </div>
                <p className="text-sm text-white/70 leading-relaxed mb-4">"{r.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "hsl(45 100% 50% / 0.1)", color: "hsl(45 100% 50%)" }}>
                    {r.name.charAt(0)}
                  </div>
                  <span className="text-sm font-semibold text-white/90">{r.name}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="sobre" className="py-16 sm:py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="relative rounded-3xl overflow-hidden aspect-[4/3]">
                <img src="https://salaojack.com.br/wp-content/uploads/2023/11/Fotos-barbearia-2.png" alt="Barbearia Jack" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <span className="text-sm font-bold uppercase tracking-[0.3em]" style={{ color: "hsl(45 100% 50%)" }}>Barbearia Jack Hair & Barber</span>
              <h2 className="text-2xl sm:text-4xl font-extrabold mt-2 sm:mt-3 leading-tight">Sobre Nós</h2>
              <p className="mt-4 sm:mt-6 text-sm sm:text-base text-white/60 leading-relaxed">
                Nossa história começa com uma paixão profunda pela barbearia e tudo o que ela representa. Somos apreciadores do ofício e da cultura que envolvem esse espaço único, onde cada corte de cabelo e barba é uma oportunidade para transformar não apenas a aparência, mas também a experiência de vida.
              </p>
              <p className="mt-3 sm:mt-4 text-sm sm:text-base text-white/60 leading-relaxed">
                O sonho da Barbearia Jack teve início nas movimentadas ruas de Belo Horizonte. Desde o primeiro dia, nossa missão foi clara: gerar uma experiência inesquecível para nossos clientes. Acreditamos que uma ida à barbearia deve ser mais do que uma tarefa a ser cumprida; deve ser um momento especial.
              </p>
              <motion.button
                onClick={goToBooking}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="mt-6 sm:mt-8 px-8 py-4 rounded-xl text-base font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                style={{ background: "hsl(45 100% 50%)", color: "#000" }}
              >
                Agendar Agora <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Loyalty Program */}
      <section className="py-12 sm:py-16 bg-[hsl(0,0%,4%)] border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 p-6 sm:p-8 rounded-3xl border border-[hsl(45,100%,50%,0.15)]"
            style={{ background: "hsl(45 100% 50% / 0.03)" }}>
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "hsl(45 100% 50% / 0.1)" }}>
              <span className="text-3xl sm:text-4xl">💈</span>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h3 className="text-lg sm:text-xl font-bold">Receba benefícios em cada real gasto</h3>
              <p className="mt-1 text-sm text-white/60">Seja Cliente Fidelidade — O oitavo CORTE é totalmente de GRAÇA! ✂️</p>
            </div>
            <button onClick={goToBooking} className="shrink-0 px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider"
              style={{ background: "hsl(45 100% 50%)", color: "#000" }}>
              Participar
            </button>
          </motion.div>
        </div>
      </section>

      {/* Location Section */}
      <section id="local" className="py-16 sm:py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <span className="text-sm font-bold uppercase tracking-[0.3em]" style={{ color: "hsl(45 100% 50%)" }}>Localização</span>
              <h2 className="text-2xl sm:text-4xl font-extrabold mt-2 sm:mt-3">Localização e Horários</h2>
              <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-5">
                <a href={`tel:+${PHONE}`} className="flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "hsl(45 100% 50% / 0.1)" }}>
                    <Phone className="w-5 h-5" style={{ color: "hsl(45 100% 50%)" }} />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Telefone</p>
                    <p className="text-sm sm:text-base font-semibold text-white/90 group-hover:text-[hsl(45,100%,50%)] transition-colors">{PHONE_DISPLAY}</p>
                  </div>
                </a>
                <a href={GOOGLE_MAPS_URL} target="_blank" rel="noreferrer" className="flex items-start gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(45 100% 50% / 0.1)" }}>
                    <MapPin className="w-5 h-5" style={{ color: "hsl(45 100% 50%)" }} />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Endereço</p>
                    <p className="text-sm sm:text-base font-semibold text-white/90 group-hover:text-[hsl(45,100%,50%)] transition-colors">{ADDRESS}</p>
                  </div>
                </a>
                <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "hsl(45 100% 50% / 0.1)" }}>
                    <Clock className="w-5 h-5" style={{ color: "hsl(45 100% 50%)" }} />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Horário</p>
                    <p className="text-sm sm:text-base font-semibold text-white/90">Segunda à Sábado — 09h às 19h</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <a href={INSTAGRAM} target="_blank" rel="noreferrer"
                  className="w-12 h-12 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all hover:border-[hsl(45,100%,50%,0.3)]">
                  <Instagram className="w-5 h-5 text-white/60" />
                </a>
                <a href={FACEBOOK} target="_blank" rel="noreferrer"
                  className="w-12 h-12 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all hover:border-[hsl(45,100%,50%,0.3)]">
                  <Facebook className="w-5 h-5 text-white/60" />
                </a>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
              <div className="rounded-3xl overflow-hidden border border-white/10 h-80 sm:h-96 lg:h-full min-h-[300px]">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3750.8!2d-43.9429567!3d-19.9217537!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xa699e26fd2b1a3%3A0xe437ada272207621!2sJack%20Hair%20%26%20Barber!5e0!3m2!1sen!2sbr!4v1700000000000!5m2!1sen!2sbr"
                  className="w-full h-full border-0 grayscale contrast-125 invert-[0.9]"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Localização Jack Hair & Barber"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[hsl(0,0%,3%)] border-t border-white/5 py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={LOGO} alt="Jack Hair" className="h-10 sm:h-12 w-auto" />
              <div>
                <span className="text-base font-bold">Jack Hair & Barber</span>
                <p className="text-xs text-white/40">Premium Grooming</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="text-white/40 hover:text-[hsl(45,100%,50%)] transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href={FACEBOOK} target="_blank" rel="noreferrer" className="text-white/40 hover:text-[hsl(45,100%,50%)] transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href={`https://api.whatsapp.com/send?phone=${PHONE}`} target="_blank" rel="noreferrer" className="text-white/40 hover:text-[hsl(45,100%,50%)] transition-colors">
                <Phone className="w-5 h-5" />
              </a>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-white/30">© {new Date().getFullYear()} Jack Hair & Barber. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DemoSite;
