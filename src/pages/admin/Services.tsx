import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, Save } from "lucide-react";
import { toast } from "sonner";

interface ServiceRow {
  id: string;
  title: string;
  subtitle: string | null;
  price: number;
  duration: string;
  image_url: string | null;
  active: boolean;
  sort_order: number;
}

const emptyForm = {
  title: "",
  subtitle: "",
  price: 0,
  duration: "",
  image_url: "",
  active: true,
  sort_order: 0,
};

const Services = () => {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    const { data } = await supabase.from("services").select("*").order("sort_order");
    setServices((data as ServiceRow[]) || []);
  };

  const handleSave = async () => {
    if (!form.title || !form.duration || form.price <= 0) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (editing) {
      const { error } = await supabase.from("services").update({
        title: form.title,
        subtitle: form.subtitle || null,
        price: form.price,
        duration: form.duration,
        image_url: form.image_url || null,
        active: form.active,
        sort_order: form.sort_order,
      }).eq("id", editing);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Serviço atualizado!");
    } else {
      const { error } = await supabase.from("services").insert({
        title: form.title,
        subtitle: form.subtitle || null,
        price: form.price,
        duration: form.duration,
        image_url: form.image_url || null,
        active: form.active,
        sort_order: form.sort_order,
      });
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Serviço criado!");
    }

    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
    fetchServices();
  };

  const handleEdit = (s: ServiceRow) => {
    setForm({
      title: s.title,
      subtitle: s.subtitle || "",
      price: Number(s.price),
      duration: s.duration,
      image_url: s.image_url || "",
      active: s.active,
      sort_order: s.sort_order,
    });
    setEditing(s.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este serviço?")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Serviço excluído!");
    fetchServices();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Serviços</h2>
        <button
          onClick={() => { setForm(emptyForm); setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{ background: 'hsl(245 60% 55%)', color: 'white' }}
        >
          <Plus className="w-4 h-4" /> Novo Serviço
        </button>
      </div>

      {/* Service list */}
      <div className="grid gap-3">
        {services.map((s) => (
          <motion.div
            key={s.id}
            layout
            className="glass-card p-4 flex items-center gap-4"
          >
            {s.image_url && (
              <img src={s.image_url} alt={s.title} className="w-14 h-14 rounded-xl object-cover shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground truncate">{s.title}</h3>
                {!s.active && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'hsl(0 60% 50% / 0.15)', color: 'hsl(0 60% 65%)' }}>
                    Inativo
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{s.subtitle}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm font-bold" style={{ color: 'hsl(245 60% 70%)' }}>R$ {Number(s.price).toFixed(2)}</span>
                <span className="text-xs text-muted-foreground">{s.duration}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => handleEdit(s)} className="p-2 rounded-lg transition-colors" style={{ background: 'hsl(0 0% 100% / 0.05)' }}>
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </button>
              <button onClick={() => handleDelete(s.id)} className="p-2 rounded-lg transition-colors" style={{ background: 'hsl(0 60% 50% / 0.1)' }}>
                <Trash2 className="w-4 h-4" style={{ color: 'hsl(0 60% 60%)' }} />
              </button>
            </div>
          </motion.div>
        ))}

        {services.length === 0 && (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum serviço cadastrado</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card-strong w-full max-w-md p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">
                  {editing ? "Editar Serviço" : "Novo Serviço"}
                </h3>
                <button onClick={() => setShowModal(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Nome *</label>
                  <input className="glass-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Corte Masculino" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Descrição</label>
                  <input className="glass-input" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Ex: Corte personalizado" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Preço (R$) *</label>
                    <input className="glass-input" type="number" min={0} step={0.01} value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Duração *</label>
                    <input className="glass-input" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="Ex: 40 min" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">URL da Imagem</label>
                  <input className="glass-input" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ativo</label>
                  <button
                    onClick={() => setForm({ ...form, active: !form.active })}
                    className="w-10 h-6 rounded-full transition-all duration-200 relative"
                    style={{ background: form.active ? 'hsl(245 60% 55%)' : 'hsl(0 0% 100% / 0.1)' }}
                  >
                    <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200"
                      style={{ left: form.active ? '22px' : '2px' }} />
                  </button>
                </div>
              </div>

              <button
                onClick={handleSave}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                style={{ background: 'hsl(245 60% 55%)', color: 'white' }}
              >
                <Save className="w-4 h-4" />
                {editing ? "Atualizar" : "Criar Serviço"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Services;
