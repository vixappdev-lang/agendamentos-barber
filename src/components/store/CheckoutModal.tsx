import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Truck, Store, QrCode, Banknote, Tag, Loader2 } from "lucide-react";
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
  prefill?: { name?: string; phone?: string; email?: string };
}

type DeliveryMode = "delivery" | "pickup";
type PaymentMethod = "pix" | "delivery";

const CheckoutModal = ({
  items, onClose, onSuccess, mode, whatsappNumber, pixKey, pixType, prefill,
}: CheckoutModalProps) => {
  const t = useThemeColors();
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("pickup");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [form, setForm] = useState({
    name: prefill?.name || "",
    phone: prefill?.phone || "",
    email: prefill?.email || "",
    address: "", number: "", complement: "", neighborhood: "", city: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Cupom
  const [couponInput, setCouponInput] = useState("");
  const [validating, setValidating] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    type: "percent" | "value";
    raw: number;
  } | null>(null);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount = appliedCoupon?.discount || 0;
  const total = Math.max(0, subtotal - discount);

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return toast.error("Digite um código");
    setValidating(true);
    const { data, error } = await supabase
      .from("coupons")
      .select("code, discount_percent, discount_value, max_uses, current_uses, expires_at, active")
      .eq("code", code)
      .eq("active", true)
      .maybeSingle();
    setValidating(false);

    if (error || !data) { toast.error("Cupom inválido"); return; }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      toast.error("Cupom expirado"); return;
    }
    if (data.max_uses != null && (data.current_uses ?? 0) >= data.max_uses) {
      toast.error("Cupom esgotado"); return;
    }

    let discountAmount = 0;
    let type: "percent" | "value" = "percent";
    let raw = 0;
    if (data.discount_percent && Number(data.discount_percent) > 0) {
      type = "percent";
      raw = Number(data.discount_percent);
      discountAmount = (subtotal * raw) / 100;
    } else if (data.discount_value && Number(data.discount_value) > 0) {
      type = "value";
      raw = Number(data.discount_value);
      discountAmount = raw;
    } else {
      toast.error("Cupom sem desconto configurado"); return;
    }

    setAppliedCoupon({ code: data.code, discount: discountAmount, type, raw });
    toast.success(`Cupom ${data.code} aplicado! 🎉`);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
  };

  const handleSubmit = async () => {
    if (!form.name || !form.phone) return toast.error("Preencha nome e telefone");
    if (deliveryMode === "delivery" && (!form.address || !form.neighborhood)) {
      return toast.error("Preencha o endereço completo");
    }

    const couponLine = appliedCoupon
      ? `\n🎟️ *Cupom:* ${appliedCoupon.code} (-R$ ${discount.toFixed(2)})`
      : "";
    const noteWithCoupon = appliedCoupon
      ? `${form.notes ? form.notes + " | " : ""}Cupom ${appliedCoupon.code} -R$ ${discount.toFixed(2)} (subtotal R$ ${subtotal.toFixed(2)})`
      : form.notes;

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
      notes: noteWithCoupon || null,
      total_price: total,
      status: "pending",
      payment_method: paymentMethod,
    }).select("id").single();

    if (error || !order) {
      toast.error("Erro ao criar pedido");
      setSubmitting(false);
      return;
    }

    const { error: itemsError } = await supabase.from("order_items").insert(items.map((i) => ({
      order_id: order.id,
      product_id: i.id,
      product_title: i.title,
      product_price: i.price,
      quantity: i.quantity,
    })));

    if (itemsError) {
      toast.error("Pedido criado, mas houve erro ao salvar os itens");
      setSubmitting(false);
      return;
    }

    // Incrementa uso do cupom (best-effort)
    if (appliedCoupon) {
      const { data: cur } = await supabase
        .from("coupons")
        .select("current_uses")
        .eq("code", appliedCoupon.code)
        .maybeSingle();
      if (cur) {
        await supabase
          .from("coupons")
          .update({ current_uses: (cur.current_uses ?? 0) + 1 })
          .eq("code", appliedCoupon.code);
      }
    }

    setSubmitting(false);

    // Mensagem profissional pro WhatsApp pedindo PIX/forma de pagto
    const itemsText = items.map((i) => `• ${i.quantity}x ${i.title} — R$ ${(i.price * i.quantity).toFixed(2).replace(".", ",")}`).join("\n");
    const deliveryText = deliveryMode === "delivery"
      ? `📍 *Entrega:* ${form.address}, ${form.number}${form.complement ? " — " + form.complement : ""}\n🏘️ ${form.neighborhood}${form.city ? " · " + form.city : ""}`
      : "🏪 *Retirada no local*";
    const payText = paymentMethod === "pix"
      ? "PIX (aguardando chave para pagamento)"
      : "Pagamento na entrega/retirada";
    const subtotalLine = appliedCoupon ? `Subtotal: R$ ${subtotal.toFixed(2).replace(".", ",")}\n` : "";
    const couponMsgLine = appliedCoupon ? `🎟️ Cupom: *${appliedCoupon.code}* (−R$ ${discount.toFixed(2).replace(".", ",")})\n` : "";
    const greeting = paymentMethod === "pix"
      ? `Oi! Acabei de finalizar minha compra na loja e gostaria de pagar via *PIX*. Pode me enviar a chave por favor?`
      : `Oi! Acabei de finalizar minha compra na loja e vou pagar *na entrega/retirada*. Pode confirmar?`;

    const msg = `${greeting}\n\n🛒 *Pedido #${String(order.id).slice(0, 8).toUpperCase()}*\n👤 ${form.name}\n📱 ${form.phone}\n\n📦 *Itens:*\n${itemsText}\n\n${subtotalLine}${couponMsgLine}💰 *Total: R$ ${total.toFixed(2).replace(".", ",")}*\n💳 ${payText}\n\n${deliveryText}${form.notes ? `\n\n📝 Obs: ${form.notes}` : ""}\n\nObrigado! 🙏`;

    setSubmitting(false);

    const target = whatsappNumber ? whatsappNumber.replace(/\D/g, "") : "";
    if (target) {
      window.open(`https://wa.me/${target}?text=${encodeURIComponent(msg)}`, "_blank");
    } else {
      // Sem número configurado, copia mensagem
      try { await navigator.clipboard.writeText(msg); } catch {}
      toast.error("Número da loja não configurado. Mensagem copiada.");
    }
    toast.success("Pedido enviado! Continue no WhatsApp.");
    onSuccess();
  };

  const labelCls = "text-[10px] font-semibold uppercase tracking-wider mb-1 block";
  const inputCls = "w-full rounded-xl px-4 py-3 text-sm outline-none transition-all";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: t.isLight ? "hsl(0 0% 0% / 0.45)" : "hsl(0 0% 0% / 0.78)", backdropFilter: "blur(18px)" }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.94, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
        className="w-full max-w-md p-5 space-y-4 max-h-[92vh] overflow-y-auto scrollbar-hide rounded-2xl"
        style={{
          background: t.isLight ? "hsl(0 0% 100% / 0.98)" : "hsl(220 22% 7% / 0.96)",
          border: `1px solid ${t.isLight ? "hsl(220 12% 88%)" : "hsl(0 0% 100% / 0.1)"}`,
          boxShadow: t.isLight ? "0 24px 60px hsl(220 20% 10% / 0.25)" : "0 24px 60px hsl(0 0% 0% / 0.6)",
          backdropFilter: "blur(24px)"
        }}
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>Finalizar Pedido</h2>
          <button onClick={onClose}><X className="w-5 h-5" style={{ color: t.textMuted }} /></button>
        </div>

        {true && (

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
              {appliedCoupon && (
                <>
                  <div className="flex items-center justify-between text-xs pt-2" style={{ borderTop: `1px solid ${t.borderSubtle}` }}>
                    <span style={{ color: t.textSecondary }}>Subtotal</span>
                    <span style={{ color: t.textPrimary }}>R$ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1" style={{ color: "hsl(140 60% 55%)" }}>
                      <Tag className="w-3 h-3" /> Cupom {appliedCoupon.code}
                      <span className="opacity-70">
                        ({appliedCoupon.type === "percent" ? `${appliedCoupon.raw}%` : `R$ ${appliedCoupon.raw.toFixed(2)}`})
                      </span>
                    </span>
                    <span className="font-semibold" style={{ color: "hsl(140 60% 55%)" }}>− R$ {discount.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="pt-2 flex items-center justify-between text-sm font-bold" style={{ borderTop: `1px solid ${t.borderSubtle}` }}>
                <span style={{ color: t.textPrimary }}>Total</span>
                <span style={{ color: t.accentPurple }}>R$ {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Cupom */}
            <div>
              <label className={labelCls} style={{ color: t.textMuted }}>Cupom de desconto</label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl"
                  style={{ background: "hsl(140 60% 45% / 0.1)", border: "1px solid hsl(140 60% 45% / 0.3)" }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsl(140 60% 45% / 0.2)" }}>
                      <Tag className="w-3.5 h-3.5" style={{ color: "hsl(140 60% 60%)" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: "hsl(140 60% 70%)" }}>{appliedCoupon.code}</p>
                      <p className="text-[10px] opacity-80" style={{ color: "hsl(140 60% 60%)" }}>
                        Você economizou R$ {discount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <button onClick={removeCoupon} className="text-[10px] font-semibold px-2 py-1 rounded-lg uppercase tracking-wider"
                    style={{ background: "hsl(0 0% 100% / 0.06)", color: t.textMuted }}>
                    Remover
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    className={inputCls + " flex-1 uppercase"}
                    style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }}
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCoupon(); } }}
                    placeholder="DIGITE O CÓDIGO"
                    maxLength={32}
                  />
                  <button onClick={applyCoupon} disabled={validating || !couponInput.trim()}
                    className="px-4 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
                    style={{ background: t.accentPurpleBg, color: t.accentPurple, border: `1px solid ${t.accentPurpleBorder}` }}>
                    {validating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Tag className="w-3.5 h-3.5" />}
                    Aplicar
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className={labelCls} style={{ color: t.textMuted }}>Nome *</label>
              <input className={inputCls} style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: t.textMuted }}>Telefone *</label>
                <input className={inputCls} style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
              </div>
              <div>
                <label className={labelCls} style={{ color: t.textMuted }}>Email</label>
                <input className={inputCls} style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@email.com" />
              </div>
            </div>

            <div>
              <label className={labelCls + " mb-2"} style={{ color: t.textMuted }}>Recebimento</label>
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
                    <opt.icon className="w-4 h-4" /> {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls + " mb-2"} style={{ color: t.textMuted }}>Pagamento *</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: "pix" as PaymentMethod, label: "PIX", icon: QrCode },
                  { id: "delivery" as PaymentMethod, label: "Na entrega", icon: Banknote },
                ] as const).map((opt) => (
                  <button key={opt.id} onClick={() => setPaymentMethod(opt.id)}
                    className="flex items-center gap-2 p-3 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: paymentMethod === opt.id ? t.accentPurpleBg : t.cardBgSubtle,
                      border: `1.5px solid ${paymentMethod === opt.id ? t.accentPurpleBorder : t.borderSubtle}`,
                      color: paymentMethod === opt.id ? t.accentPurple : t.textMuted,
                    }}>
                    <opt.icon className="w-4 h-4" /> {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {deliveryMode === "delivery" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-3 overflow-hidden">
                  <div>
                    <label className={labelCls} style={{ color: t.textMuted }}>Endereço *</label>
                    <input className={inputCls} style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rua, Avenida..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls} style={{ color: t.textMuted }}>Número</label>
                      <input className={inputCls} style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls} style={{ color: t.textMuted }}>Complemento</label>
                      <input className={inputCls} style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} value={form.complement} onChange={(e) => setForm({ ...form, complement: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls} style={{ color: t.textMuted }}>Bairro *</label>
                      <input className={inputCls} style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls} style={{ color: t.textMuted }}>Cidade</label>
                      <input className={inputCls} style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className={labelCls} style={{ color: t.textMuted }}>Observações</label>
              <textarea className={inputCls + " resize-none"} rows={2} style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            <button onClick={handleSubmit} disabled={submitting}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ background: t.btnBg, color: t.btnColor }}>
              {submitting ? "Enviando..." : "Enviar pelo WhatsApp"}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default CheckoutModal;
