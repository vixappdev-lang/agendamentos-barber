import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, MapPin, Phone, Instagram, Clock, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useTenantSite } from "@/contexts/TenantSiteContext";

interface ServiceRow { id: string; title: string; subtitle?: string; price: number; duration: string; image_url?: string }
interface ReviewRow { id: string; customer_name: string; rating: number; comment?: string }

const TenantSite = () => {
  const { profile, settings, publicQuery } = useTenantSite();
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);

  if (profile.site_mode === "booking") {
    return <Navigate to="agenda" replace />;
  }

  useEffect(() => {
    publicQuery("services").then(({ data }) => setServices((data?.data || []) as ServiceRow[]));
    publicQuery("reviews_public").then(({ data }) => setReviews((data?.data || []) as ReviewRow[]));
  }, [profile.id]);

  let heroImages: string[] = [];
  try { heroImages = JSON.parse(settings.site_hero_images || "[]"); } catch {}
  const heroImg = heroImages[0] || settings.site_logo_url;

  const primary = settings.site_primary || "#6E59F2";
  const accent = settings.site_accent || "#8B7AFE";
  const bg = settings.site_bg || "#0F1117";

  const wa = (settings.whatsapp_number || "").replace(/\D/g, "");

  return (
    <div className="min-h-screen text-foreground" style={{ background: bg }}>
      {/* HERO */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{
          background: `radial-gradient(ellipse at top, ${primary}55, transparent 60%)`,
        }} />
        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-20 grid md:grid-cols-2 gap-10 items-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {settings.site_logo_url && (
              <img src={settings.site_logo_url} alt={profile.name} className="h-14 mb-6 object-contain" />
            )}
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-3"
                style={{ fontFamily: settings.site_font_heading || "inherit" }}>
              {settings.site_hero_title || profile.name}
            </h1>
            {settings.site_hero_subtitle && (
              <p className="text-lg mb-3" style={{ color: accent }}>{settings.site_hero_subtitle}</p>
            )}
            {settings.site_hero_description && (
              <p className="text-muted-foreground mb-8 max-w-lg">{settings.site_hero_description}</p>
            )}
            <div className="flex flex-wrap gap-3">
              <button onClick={() => navigate("agenda")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-lg transition hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
                <Calendar className="w-4 h-4" /> Agendar agora
              </button>
              {wa && (
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"
                   className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border border-white/10 hover:bg-white/5">
                  <Phone className="w-4 h-4" /> WhatsApp
                </a>
              )}
            </div>
          </motion.div>
          {heroImg && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
              className="rounded-3xl overflow-hidden aspect-[4/5] shadow-2xl border border-white/10">
              <img src={heroImg} alt="" className="w-full h-full object-cover" />
            </motion.div>
          )}
        </div>
      </header>

      {/* SERVICES */}
      {services.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-8" style={{ fontFamily: settings.site_font_heading }}>
            Nossos serviços
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((s) => (
              <article key={s.id} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 hover:border-white/20 transition">
                {s.image_url && <img src={s.image_url} alt={s.title} className="w-full h-40 object-cover rounded-xl mb-4"/>}
                <h3 className="font-semibold text-lg">{s.title}</h3>
                {s.subtitle && <p className="text-sm text-muted-foreground mb-3">{s.subtitle}</p>}
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="w-3 h-3"/> {s.duration}</span>
                  <span className="font-bold" style={{ color: accent }}>R$ {Number(s.price).toFixed(2)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ABOUT */}
      {(settings.site_about_title || settings.site_about_description) && (
        <section className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ fontFamily: settings.site_font_heading }}>
            {settings.site_about_title || "Sobre nós"}
          </h2>
          <p className="text-muted-foreground whitespace-pre-line">{settings.site_about_description}</p>
        </section>
      )}

      {/* REVIEWS */}
      {reviews.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-8" style={{ fontFamily: settings.site_font_heading }}>
            O que dizem
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviews.slice(0, 6).map((r) => (
              <article key={r.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-1 mb-2" style={{ color: accent }}>
                  {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="w-4 h-4 fill-current"/>)}
                </div>
                {r.comment && <p className="text-sm mb-3">{r.comment}</p>}
                <p className="text-xs text-muted-foreground">— {r.customer_name}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* CONTACT */}
      <footer className="border-t border-white/10 mt-10">
        <div className="max-w-6xl mx-auto px-6 py-10 grid sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
          <div>
            <h3 className="font-semibold mb-2">{profile.name}</h3>
            {settings.address && <p className="text-muted-foreground inline-flex gap-1.5 items-start"><MapPin className="w-4 h-4 mt-0.5"/> {settings.address}</p>}
          </div>
          <div className="space-y-1.5 text-muted-foreground">
            {settings.opening_time && <p className="inline-flex gap-1.5 items-center"><Clock className="w-4 h-4"/> {settings.opening_time} – {settings.closing_time}</p>}
            {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="inline-flex gap-1.5 items-center hover:text-foreground"><Phone className="w-4 h-4"/> WhatsApp</a>}
            {settings.instagram && <a href={`https://instagram.com/${settings.instagram.replace("@","")}`} target="_blank" rel="noreferrer" className="inline-flex gap-1.5 items-center hover:text-foreground"><Instagram className="w-4 h-4"/> {settings.instagram}</a>}
          </div>
          <div className="md:text-right">
            <button onClick={() => navigate("agenda")}
              className="px-5 py-2.5 rounded-xl font-semibold text-white"
              style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
              Reservar horário
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TenantSite;
