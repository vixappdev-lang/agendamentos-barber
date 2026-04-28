/**
 * Catálogo de templates profissionais de mensagens WhatsApp.
 * Variáveis disponíveis: {cliente} {servico} {data} {hora} {barbearia} {barbeiro} {link} {valor}
 */

export type TemplateCategory =
  | "msg_on_book"
  | "msg_on_confirm"
  | "msg_reminder"
  | "review_whatsapp_template"
  | "cancellation_policy"
  | "late_policy";

export interface MessageTemplate {
  id: string;
  label: string;
  preview: string;
  body: string;
}

const T = (s: string) => s.trim();

export const TEMPLATES: Record<TemplateCategory, MessageTemplate[]> = {
  msg_on_book: [
    {
      id: "book_classic",
      label: "Clássico",
      preview: "Confirmação simples e direta.",
      body: T(`Olá *{cliente}*! 👋

Recebemos seu agendamento de *{servico}* para *{data}* às *{hora}*.

Em breve confirmaremos seu horário. Obrigado por escolher *{barbearia}* 💈`),
    },
    {
      id: "book_premium",
      label: "Premium",
      preview: "Tom mais sofisticado.",
      body: T(`✨ *{barbearia}* agradece a preferência, {cliente}!

📅 *Serviço:* {servico}
🗓 *Data:* {data} às {hora}
✂️ *Profissional:* {barbeiro}

Seu horário foi reservado e está aguardando confirmação.`),
    },
    {
      id: "book_friendly",
      label: "Descontraído",
      preview: "Mais informal e amigável.",
      body: T(`E aí, {cliente}! 🤙

Bombou aqui — seu *{servico}* tá marcado pra *{data}* às *{hora}*.
Já já a gente te confirma. Valeu! 💈`),
    },
  ],

  msg_on_confirm: [
    {
      id: "confirm_classic",
      label: "Confirmação Clássica",
      preview: "Mensagem direta de confirmação.",
      body: T(`✅ *Agendamento Confirmado!*

Olá {cliente}, seu horário em *{barbearia}* está confirmado:

📅 *Data:* {data}
🕐 *Hora:* {hora}
✂️ *Serviço:* {servico}

Te esperamos! 💈`),
    },
    {
      id: "confirm_premium",
      label: "Confirmação Premium",
      preview: "Detalhada com lembrete.",
      body: T(`✅ *Confirmado, {cliente}!*

Sua reserva em *{barbearia}* foi confirmada com sucesso.

🗓 {data} às {hora}
✂️ {servico} com {barbeiro}
💰 Valor: R$ {valor}

⚠️ Em caso de imprevisto, avise com pelo menos 2h de antecedência.`),
    },
    {
      id: "confirm_short",
      label: "Confirmação Rápida",
      preview: "Curta e objetiva.",
      body: T(`✅ Tudo certo, {cliente}! Te esperamos *{data}* às *{hora}* na *{barbearia}*. 💈`),
    },
  ],

  msg_reminder: [
    {
      id: "rem_24h",
      label: "Lembrete 24h",
      preview: "Para envios no dia anterior.",
      body: T(`⏰ *Lembrete de Agendamento*

Oi {cliente}! Passando pra lembrar do seu horário amanhã:

🗓 {data} às {hora}
✂️ {servico}

Te esperamos na *{barbearia}* 💈`),
    },
    {
      id: "rem_short",
      label: "Lembrete Curto",
      preview: "Para envios próximos do horário.",
      body: T(`⏰ {cliente}, seu horário na *{barbearia}* é hoje às *{hora}*. Até já! 💈`),
    },
    {
      id: "rem_premium",
      label: "Lembrete Premium",
      preview: "Mais elaborado com instruções.",
      body: T(`⏰ *{barbearia}* lembra:

Olá {cliente}, seu *{servico}* com *{barbeiro}* está agendado para hoje às *{hora}*.

📍 Por favor, chegue com 5 minutos de antecedência.
❌ Caso não possa comparecer, avise pelo WhatsApp.

Até já! ✂️`),
    },
  ],

  review_whatsapp_template: [
    {
      id: "rev_classic",
      label: "Avaliação Clássica",
      preview: "Pedido cordial de avaliação.",
      body: T(`⭐ Olá *{cliente}*! Como foi seu atendimento na *{barbearia}*?

Sua opinião é muito importante pra gente. Avalie em 1 minuto:
👉 {link}

Obrigado! 💈`),
    },
    {
      id: "rev_premium",
      label: "Avaliação Premium",
      preview: "Personalizada e profissional.",
      body: T(`✨ {cliente}, foi um prazer te atender hoje!

Esperamos que tenha gostado do seu *{servico}*.
Sua avaliação nos ajuda a melhorar sempre:

⭐ {link}

Até a próxima! — *{barbearia}*`),
    },
    {
      id: "rev_short",
      label: "Avaliação Curta",
      preview: "Direta ao ponto.",
      body: T(`⭐ {cliente}, avalie seu atendimento em 1 clique: {link}`),
    },
  ],

  cancellation_policy: [
    {
      id: "cancel_2h",
      label: "Tolerância 2 horas",
      preview: "Política padrão de cancelamento.",
      body: T(`Cancelamentos devem ser feitos com no mínimo *2 horas* de antecedência pelo WhatsApp. Cancelamentos fora desse prazo poderão ser cobrados.`),
    },
    {
      id: "cancel_24h",
      label: "Tolerância 24 horas",
      preview: "Mais rigorosa.",
      body: T(`Para cancelar ou reagendar, avise com pelo menos *24 horas* de antecedência. Cancelamentos no mesmo dia podem gerar uma taxa de 50% do serviço.`),
    },
    {
      id: "cancel_flex",
      label: "Política Flexível",
      preview: "Sem cobrança.",
      body: T(`Você pode cancelar ou reagendar quando quiser pelo WhatsApp. Apenas pedimos que avise o quanto antes para liberar o horário para outro cliente.`),
    },
  ],

  late_policy: [
    {
      id: "late_10",
      label: "Tolerância 10 min",
      preview: "Padrão da maioria das barbearias.",
      body: T(`Tolerância de *10 minutos* de atraso. Após esse período, o horário será liberado para outro cliente e o atendimento poderá não ser realizado.`),
    },
    {
      id: "late_15",
      label: "Tolerância 15 min",
      preview: "Mais flexível.",
      body: T(`Toleramos até *15 minutos* de atraso. Após isso, o horário poderá ser remarcado conforme disponibilidade.`),
    },
    {
      id: "late_strict",
      label: "Sem Tolerância",
      preview: "Rigorosa.",
      body: T(`Pedimos pontualidade. Atrasos superiores a *5 minutos* podem comprometer o atendimento, pois nossa agenda é fechada.`),
    },
  ],
};

export const renderTemplate = (
  body: string,
  vars: Record<string, string | number | undefined>,
): string => {
  let out = body;
  Object.entries(vars).forEach(([k, v]) => {
    out = out.replace(new RegExp(`\\{${k}\\}`, "g"), v == null ? "" : String(v));
  });
  return out;
};
