import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Loader2, CheckCircle2 } from "lucide-react";
import { useTenantSite } from "@/contexts/TenantSiteContext";
import { toast } from "sonner";

interface ServiceRow { id: string; title: string; price: number; duration: string }
interface BarberRow { id: string; name: string }

const TenantBooking = () => {
  const { profile, settings, publicQuery } = useTenantSite();
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [barbers, setBarbers] = useState<BarberRow[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [barberName, setBarberName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    publicQuery("services").then(({ data }) => setServices((data?.data || []) as ServiceRow[]));
    publicQuery("barbers").then(({ data }) => setBarbers((data?.data || []) as BarberRow[]));
  }, [profile.id]);

  const service = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);
  const primary = settings.site_primary || "#6E59F2";
  const accent = settings.site_accent || "#8B7AFE";

  const submit = async () => {
    if (!serviceId || !date || !time || !name || !phone) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setSubmitting(true);
    const { error } = await publicQuery("create_appointment", {
      customer_name: name, customer_phone: phone,
      service_id: serviceId, barber_name: barberName || null,
      appointment_date: date, appointment_time: time,
      total_price: service?.price ?? null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: settings.site_bg }}>
        <div className="max-w-md w-full text-center space-y-4 p-8 rounded-3xl border border-white/10 bg-white/5">
          <CheckCircle2 className="w-14 h-14 mx-auto" style={{ color: accent }}/>
          <h2 className="text-2xl font-bold">Agendamento solicitado!</h2>
          <p className="text-muted-foreground">Em breve a barbearia entrará em contato para confirmar.</p>
          <button onClick={() => navigate(profile.site_mode === "full" ? ".." : ".")}
            className="mt-2 px-5 py-2.5 rounded-xl font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: settings.site_bg }}>
      <div className="max-w-xl mx-auto">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4"/> Voltar
        </button>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: settings.site_font_heading }}>
          {profile.name}
        </h1>
        <p className="text-muted-foreground mb-8 inline-flex items-center gap-2">
          <Calendar className="w-4 h-4"/> Agendar horário
        </p>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <Field label="Serviço *">
            <select className="w-full rounded-lg bg-black/30 border border-white/10 p-2.5" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">Selecione…</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.title} — R$ {Number(s.price).toFixed(2)}</option>)}
            </select>
          </Field>
          {barbers.length > 0 && (
            <Field label="Barbeiro (opcional)">
              <select className="w-full rounded-lg bg-black/30 border border-white/10 p-2.5" value={barberName} onChange={(e) => setBarberName(e.target.value)}>
                <option value="">Sem preferência</option>
                {barbers.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data *"><input type="date" className="w-full rounded-lg bg-black/30 border border-white/10 p-2.5" value={date} onChange={(e) => setDate(e.target.value)}/></Field>
            <Field label="Hora *"><input type="time" className="w-full rounded-lg bg-black/30 border border-white/10 p-2.5" value={time} onChange={(e) => setTime(e.target.value)}/></Field>
          </div>
          <Field label="Seu nome *"><input className="w-full rounded-lg bg-black/30 border border-white/10 p-2.5" value={name} onChange={(e) => setName(e.target.value)} maxLength={120}/></Field>
          <Field label="WhatsApp *"><input className="w-full rounded-lg bg-black/30 border border-white/10 p-2.5" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000"/></Field>

          <button onClick={submit} disabled={submitting}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Calendar className="w-4 h-4"/>}
            Confirmar agendamento
          </button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
    <div className="mt-1.5">{children}</div>
  </label>
);

export default TenantBooking;
