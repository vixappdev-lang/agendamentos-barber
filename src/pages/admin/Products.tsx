import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, Save, Upload, ShoppingBag, Loader2, Tag, Package2, ImagePlus } from "lucide-react";
import { toast } from "sonner";

interface ProductRow {
  id: string;
  title: string;
  description: string | null;
  long_description: string | null;
  brand: string | null;
  weight: string | null;
  stock: number | null;
  highlights: string[] | null;
  gallery: string[] | null;
  price: number;
  image_url: string | null;
  active: boolean;
  sort_order: number;
  category: string | null;
}

const PRODUCT_CATEGORIES: { value: string; label: string }[] = [
  { value: "cabelo", label: "Cabelo" },
  { value: "barba", label: "Barba" },
  { value: "pos_barba", label: "Pós-barba" },
  { value: "combos", label: "Combos" },
  { value: "acessorios", label: "Acessórios" },
  { value: "fragrancias", label: "Fragrâncias" },
  { value: "geral", label: "Outros" },
];

const emptyForm = {
  title: "", description: "", long_description: "", brand: "", weight: "",
  stock: 0, highlights: [] as string[], gallery: [] as string[],
  price: 0, image_url: "", active: true, sort_order: 0,
  category: "geral",
};

const Products = () => {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [highlightDraft, setHighlightDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("sort_order");
    setProducts((data as any[]) as ProductRow[] || []);
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const fileName = `product-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("service-images").upload(fileName, file);
    if (error) { toast.error("Erro no upload"); return null; }
    return supabase.storage.from("service-images").getPublicUrl(fileName).data.publicUrl;
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    const url = await uploadFile(file);
    if (url) { setForm({ ...form, image_url: url }); toast.success("Imagem enviada!"); }
    setUploading(false);
  };

  const handleGalleryUpload = async (files: FileList) => {
    setUploadingGallery(true);
    const urls: string[] = [];
    for (const f of Array.from(files)) {
      const u = await uploadFile(f);
      if (u) urls.push(u);
    }
    setForm({ ...form, gallery: [...form.gallery, ...urls] });
    setUploadingGallery(false);
    if (urls.length) toast.success(`${urls.length} imagem(ns) adicionada(s)!`);
  };

  const addHighlight = () => {
    const v = highlightDraft.trim();
    if (!v) return;
    setForm({ ...form, highlights: [...form.highlights, v] });
    setHighlightDraft("");
  };

  const handleSave = async () => {
    if (!form.title || form.price <= 0) { toast.error("Preencha nome e preço"); return; }
    const payload = {
      title: form.title,
      description: form.description || null,
      long_description: form.long_description || null,
      brand: form.brand || null,
      weight: form.weight || null,
      stock: form.stock,
      highlights: form.highlights,
      gallery: form.gallery,
      price: form.price,
      image_url: form.image_url || null,
      active: form.active,
      sort_order: form.sort_order,
      category: form.category || "geral",
    };

    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Produto atualizado!");
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Produto criado!");
    }
    setShowModal(false); setEditing(null); setForm(emptyForm); fetchProducts();
  };

  const handleEdit = (p: ProductRow) => {
    setForm({
      title: p.title, description: p.description || "", long_description: p.long_description || "",
      brand: p.brand || "", weight: p.weight || "", stock: p.stock ?? 0,
      highlights: Array.isArray(p.highlights) ? p.highlights : [],
      gallery: Array.isArray(p.gallery) ? p.gallery : [],
      price: Number(p.price), image_url: p.image_url || "", active: p.active, sort_order: p.sort_order,
      category: p.category || "geral",
    });
    setEditing(p.id); setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Produto excluído!"); fetchProducts();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Produtos / Loja</h2>
        <button onClick={() => { setForm(emptyForm); setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{ background: 'hsl(245 60% 55%)', color: 'white' }}>
          <Plus className="w-4 h-4" /> Novo Produto
        </button>
      </div>

      <div className="grid gap-3">
        {products.map((p) => (
          <motion.div key={p.id} layout className="glass-card p-4 flex items-center gap-4">
            {p.image_url ? (
              <img src={p.image_url} alt={p.title} className="w-14 h-14 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center" style={{ background: 'hsl(0 0% 100% / 0.05)' }}>
                <ShoppingBag className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground truncate">{p.title}</h3>
                {p.brand && <span className="text-[9px] px-1.5 py-0.5 rounded-md uppercase tracking-wider font-bold" style={{ background: 'hsl(245 60% 55% / 0.12)', color: 'hsl(245 60% 75%)' }}>{p.brand}</span>}
                {!p.active && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'hsl(0 60% 50% / 0.15)', color: 'hsl(0 60% 65%)' }}>Inativo</span>}
                {p.stock != null && p.stock <= 0 && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'hsl(40 80% 50% / 0.15)', color: 'hsl(40 80% 60%)' }}>Sem estoque</span>}
              </div>
              <p className="text-xs text-muted-foreground truncate">{p.description}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm font-bold" style={{ color: 'hsl(245 60% 70%)' }}>R$ {Number(p.price).toFixed(2)}</span>
                {p.stock != null && <span className="text-[10px] text-muted-foreground">Estoque: {p.stock}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => handleEdit(p)} className="p-2 rounded-lg" style={{ background: 'hsl(0 0% 100% / 0.05)' }}>
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </button>
              <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg" style={{ background: 'hsl(0 60% 50% / 0.1)' }}>
                <Trash2 className="w-4 h-4" style={{ color: 'hsl(0 60% 60%)' }} />
              </button>
            </div>
          </motion.div>
        ))}
        {products.length === 0 && (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum produto cadastrado</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card-strong w-full max-w-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto scrollbar-hide"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">{editing ? "Editar Produto" : "Novo Produto"}</h3>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>

              <div className="space-y-4">
                {/* Básico */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Nome *</label>
                    <input className="glass-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Pomada Modeladora" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Marca</label>
                    <input className="glass-input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Ex: Styllus" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Peso / Volume</label>
                    <input className="glass-input" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="Ex: 100ml" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Preço (R$) *</label>
                    <input className="glass-input" type="number" min={0} step={0.01} value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Estoque</label>
                    <input className="glass-input" type="number" min={0} step={1} value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Descrição curta</label>
                  <input className="glass-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Aparece no card e no topo do detalhe" />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Descrição completa</label>
                  <textarea className="glass-input min-h-[100px] resize-none" value={form.long_description} onChange={(e) => setForm({ ...form, long_description: e.target.value })} placeholder="Texto longo com modo de uso, benefícios, ingredientes…" />
                </div>

                {/* Destaques */}
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Destaques (lista)</label>
                  <div className="flex gap-2">
                    <input className="glass-input flex-1" value={highlightDraft} onChange={(e) => setHighlightDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHighlight(); } }}
                      placeholder="Ex: Fixação forte" />
                    <button type="button" onClick={addHighlight}
                      className="px-4 rounded-xl text-xs font-bold" style={{ background: 'hsl(245 60% 55%)', color: 'white' }}>
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {form.highlights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.highlights.map((h, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg"
                          style={{ background: 'hsl(245 60% 55% / 0.12)', color: 'hsl(245 60% 75%)', border: '1px solid hsl(245 60% 55% / 0.2)' }}>
                          {h}
                          <button onClick={() => setForm({ ...form, highlights: form.highlights.filter((_, j) => j !== i) })}>
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Imagem principal */}
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Foto principal</label>
                  {form.image_url && (
                    <div className="relative mb-2 rounded-xl overflow-hidden" style={{ border: '1px solid hsl(0 0% 100% / 0.08)' }}>
                      <img src={form.image_url} alt="Preview" className="w-full h-40 object-cover" />
                      <button onClick={() => setForm({ ...form, image_url: "" })} className="absolute top-2 right-2 p-1 rounded-lg" style={{ background: 'hsl(0 0% 0% / 0.6)' }}>
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  )}
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold"
                    style={{ background: 'hsl(0 0% 100% / 0.05)', border: '1px solid hsl(0 0% 100% / 0.08)', color: 'hsl(0 0% 70%)' }}>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploading ? "Enviando..." : "Upload da foto principal"}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }} />
                </div>

                {/* Galeria */}
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Galeria adicional</label>
                  {form.gallery.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {form.gallery.map((url, i) => (
                        <div key={url} className="relative aspect-square rounded-lg overflow-hidden" style={{ border: '1px solid hsl(0 0% 100% / 0.08)' }}>
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => setForm({ ...form, gallery: form.gallery.filter((_, j) => j !== i) })}
                            className="absolute top-1 right-1 p-1 rounded-md" style={{ background: 'hsl(0 0% 0% / 0.7)' }}>
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => galleryInputRef.current?.click()} disabled={uploadingGallery}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold"
                    style={{ background: 'hsl(0 0% 100% / 0.05)', border: '1px solid hsl(0 0% 100% / 0.08)', color: 'hsl(0 0% 70%)' }}>
                    {uploadingGallery ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                    {uploadingGallery ? "Enviando..." : "Adicionar imagens à galeria"}
                  </button>
                  <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => { if (e.target.files) handleGalleryUpload(e.target.files); }} />
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ativo</label>
                  <button onClick={() => setForm({ ...form, active: !form.active })}
                    className="w-10 h-6 rounded-full transition-all relative"
                    style={{ background: form.active ? 'hsl(245 60% 55%)' : 'hsl(0 0% 100% / 0.1)' }}>
                    <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: form.active ? '22px' : '2px' }} />
                  </button>
                </div>
              </div>

              <button onClick={handleSave}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                style={{ background: 'hsl(245 60% 55%)', color: 'white' }}>
                <Save className="w-4 h-4" /> {editing ? "Atualizar" : "Criar Produto"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Products;
