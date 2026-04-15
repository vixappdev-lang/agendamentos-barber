import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package, Truck, Store, QrCode, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useThemeColors } from "@/hooks/useThemeColors";

interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image_url: string | null;
}

interface CheckoutModalProps {
  items: CartItem[];
  onClose: () => void;
  onSuccess: () => void;
  mode: "ifood" | "whatsapp";
  whatsappNumber: string;
  pixKey: string;
  pixType: string;
}

type DeliveryMode = "delivery" | "pickup";
type Step = "info" | "payment" | "confirmed";

const CheckoutModal = ({ items, onClose, onSuccess, mode, whatsappNumber, pixKey, pixType }: CheckoutModalProps) => {
  const t = useThemeColors();
  const [step, setStep] = useState<Step>("info");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("pickup");
  const [form, setForm] = useState({
    name: "", phone: "", email: "",
    address: "", number: "", complement: "", neighborhood: "", city: "",
    notes: "",
  });
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const handleSubmit = async () => {
    if (!form.name || !form.phone) {
      toast.error("Preencha nome e telefone");
      return;
    }
    if (deliveryMode === "delivery" && (!form.address || !form.neighborhood)) {
      toast.error("Preencha o endereço completo");
      return;
    }

    if (mode === "whatsapp") {
      const itemsText = items.map(i => `• ${i.quantity}x ${i.title} - R$ ${(i.price * i.quantity).toFixed(2)}`).join("\n");
      const deliveryText = deliveryMode === "delivery"
        ? `\n📍 *Endereço:* ${form.address}, ${form.number} ${form.complement ? `- ${form.complement}` : ""}\n🏘️ *Bairro:* ${form.neighborhood}\n🏙️ *Cidade:* ${form.city}`
        : "\n🏪 *Retirada no local*";
      const msg = `🛒 *Novo Pedido*\n\n👤 *Nome:* ${form.name}\n📱 *Telefone:* ${form.phone}\n\n📦 *Itens:*\n${itemsText}\n\n💰 *Total:* R$ ${total.toFixed(2)}${deliveryText}\n\n📝 *Obs:* ${form.notes || "Nenhuma"}`;
      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`, "_blank");
      onSuccess();
      return;
    }

    setSubmitting(true);
    const { data: order, error } = await supabase.from("orders").insert({
      customer_name: form.name,
      customer_phone: form.phone,
      customer_email: form.email || null,
      delivery_mode: deliveryMode,
      address: deliveryMode === "delivery" ? form.address : null,
      address_number: deliveryMode === "delivery" ? form.number : null,
      address_complement: form.complement || null,
      neighborhood: deliveryMode === "delivery" ? form.neighborhood : null,
      city: deliveryMode === "delivery" ? form.city : null,
      notes: form.notes || null,
      total_price: total,
      status: "pending",
    }).select("id").single();

    if (error || !order) {
      toast.error("Erro ao criar pedido");
      setSubmitting(false);
      return;
    }

    const orderItems = items.map(i => ({
      order_id: order.id,
      product_id: i.id,
      product_title: i.title,
      product_price: i.price,
      quantity: i.quantity,
    }));

    await supabase.from("order_items").insert(orderItems);
    setSubmitting(false);
    setStep("payment");
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    toast.success("Chave PIX copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmPayment = () => {
    setStep("confirmed");
    toast.success("Pedido realizado com sucesso! 🎉");
    setTimeout(() => onSuccess(), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: t.overlayBg, backdropFilter: "blur(12px)" }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto scrollbar-hide rounded-2xl"
        style={{ background: t.modalCardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadowLg, backdropFilter: t.isLight ? 'none' : 'blur(28px)' }}
        onClick={(e) => e.stopPropagation()}>
        
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>
            {step === "info" ? "Finalizar Pedido" : step === "payment" ? "Pagamento PIX" : "Pedido Confirmado!"}
          </h2>
          <button onClick={onClose}><X className="w-5 h-5" style={{ color: t.textMuted }} /></button>
        </div>

        {step === "info" && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl space-y-2" style={{ background: t.cardBgSubtle, border: `1px solid ${t.borderSubtle}` }}>
              <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: t.textMuted }}>Resumo</p>
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <span style={{ color: t.textSecondary }}>{item.quantity}x {item.title}</span>
                  <span className="font-semibold" style={{ color: t.textPrimary }}>R$ {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="pt-2 flex items-center justify-between text-sm font-bold" style={{ borderTop: `1px solid ${t.borderSubtle}` }}>
                <span style={{ color: t.textPrimary }}>Total</span>
                <span style={{ color: t.accentPurple }}>R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: t.textMuted }}>Nome *</label>
              <input className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Seu nome completo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: t.textMuted }}>Telefone *</label>
                <input className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: t.textMuted }}>Email</label>
                <input className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@email.com" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: t.textMuted }}>Recebimento</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: "pickup" as DeliveryMode, label: "Retirar no local", icon: Store },
                  { id: "delivery" as DeliveryMode, label: "Entrega", icon: Truck },
                ] as const).map((opt) => (
                  <button key={opt.id} onClick={() => setDeliveryMode(opt.id)}
                    className="flex items-center gap-2 p-3 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: deliveryMode === opt.id ? t.accentPurpleBg : t.cardBgSubtle,
                      border: `1.5px solid ${deliveryMode === opt.id ? t.accentPurpleBorder : t.borderSubtle}`,
                      color: deliveryMode === opt.id ? t.accentPurple : t.textMuted,
                    }}>
                    <opt.icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {deliveryMode === "delivery" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="space-y-3 overflow-hidden">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: t.textMuted }}>Endereço *</label>
                    <input className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rua, Avenida..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: t.textMuted }}>Número</label>
                      <input className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="123" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: t.textMuted }}>Complemento</label>
                      <input className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} value={form.complement} onChange={(e) => setForm({ ...form, complement: e.target.value })} placeholder="Apto, Bloco..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: t.textMuted }}>Bairro *</label>
                      <input className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} placeholder="Centro" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: t.textMuted }}>Cidade</label>
                      <input className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="São Paulo" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: t.textMuted }}>Observações</label>
              <textarea className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-all" rows={2} style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Alguma observação..." />
            </div>

            <button onClick={handleSubmit} disabled={submitting}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ background: t.btnBg, color: t.btnColor }}>
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: t.btnColor, borderTopColor: "transparent" }} /> Enviando...</>
              ) : mode === "whatsapp" ? "📱 Enviar pelo WhatsApp" : "Confirmar Pedido"}
            </button>
          </div>
        )}

        {step === "payment" && (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: t.accentPurpleBg }}>
              <QrCode className="w-8 h-8" style={{ color: t.accentPurple }} />
            </div>
            <div>
              <p className="text-sm mb-1" style={{ color: t.textMuted }}>Valor a pagar:</p>
              <p className="text-2xl font-bold" style={{ color: t.accentPurple }}>R$ {total.toFixed(2)}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: t.cardBgSubtle, border: `1px solid ${t.borderSubtle}` }}>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>Chave PIX ({pixType})</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-mono flex-1 truncate" style={{ color: t.textPrimary }}>{pixKey || "Não configurada"}</p>
                {pixKey && (
                  <button onClick={handleCopyPix} className="p-2 rounded-lg shrink-0" style={{ background: t.accentPurpleBg }}>
                    {copied ? <Check className="w-4 h-4" style={{ color: "hsl(140 60% 55%)" }} /> : <Copy className="w-4 h-4" style={{ color: t.accentPurple }} />}
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px]" style={{ color: t.textMuted }}>Após realizar o pagamento, clique em confirmar abaixo.</p>
            <button onClick={handleConfirmPayment}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all"
              style={{ background: "hsl(140 60% 45%)", color: "white" }}>
              ✅ Já paguei!
            </button>
          </div>
        )}

        {step === "confirmed" && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-3 py-4">
            <div className="text-5xl">🎉</div>
            <h3 className="text-lg font-bold" style={{ color: t.textPrimary }}>Pedido Realizado!</h3>
            <p className="text-sm" style={{ color: t.textMuted }}>Seu pedido foi recebido e está sendo processado.</p>
            <div className="p-3 rounded-xl" style={{ background: t.accentPurpleBg, border: `1px solid ${t.accentPurpleBorder}` }}>
              <p className="text-xs" style={{ color: t.accentPurple }}>Status: Pendente</p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default CheckoutModal;
