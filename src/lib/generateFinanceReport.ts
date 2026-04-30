import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface FinanceReportData {
  businessName: string;
  ownerName: string;
  monthLabel: string; // "Outubro de 2026"
  stats: {
    revenue: number;
    expenses: number;
    netProfit: number;
    totalAttendances: number;
    avgTicket: number;
    productSales: number;
  };
  topServices: { title: string; count: number; revenue: number }[];
  barberRanking: { name: string; count: number; revenue: number }[];
  dailyRevenue: { date: string; receita: number; atendimentos: number }[];
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export function generateFinanceReport(data: FinanceReportData): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 18;

  // Header
  doc.setFillColor(20, 22, 30);
  doc.rect(0, 0, pageW, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(data.businessName, 14, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Relatório Financeiro Mensal", 14, 22);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(data.monthLabel, pageW - 14, 22, { align: "right" });

  y = 42;

  // Resumo cards (grid 3x2)
  doc.setTextColor(40, 40, 50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Resumo do Período", 14, y);
  y += 5;

  const cards = [
    { label: "Faturamento", value: fmt(data.stats.revenue) },
    { label: "Lucro Líquido", value: fmt(data.stats.netProfit) },
    { label: "Cancelados (perda)", value: fmt(data.stats.expenses) },
    { label: "Atendimentos", value: String(data.stats.totalAttendances) },
    { label: "Ticket Médio", value: fmt(data.stats.avgTicket) },
    { label: "Vendas Loja", value: String(data.stats.productSales) },
  ];
  const cardW = (pageW - 28 - 10) / 3;
  const cardH = 18;
  cards.forEach((c, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 14 + col * (cardW + 5);
    const cy = y + row * (cardH + 4);
    doc.setDrawColor(220, 220, 230);
    doc.setFillColor(248, 248, 252);
    doc.roundedRect(x, cy, cardW, cardH, 2, 2, "FD");
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 120);
    doc.setFont("helvetica", "normal");
    doc.text(c.label.toUpperCase(), x + 3, cy + 6);
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 30);
    doc.setFont("helvetica", "bold");
    doc.text(c.value, x + 3, cy + 14);
  });
  y += cardH * 2 + 4 + 8;

  // Receita por dia
  if (data.dailyRevenue.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Data", "Receita", "Atendimentos"]],
      body: data.dailyRevenue.map((d) => [d.date, fmt(d.receita), String(d.atendimentos)]),
      theme: "striped",
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Top serviços
  if (data.topServices.length > 0) {
    if (y > 230) { doc.addPage(); y = 18; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 50);
    doc.text("Serviços Mais Lucrativos", 14, y);
    y += 3;
    autoTable(doc, {
      startY: y,
      head: [["#", "Serviço", "Atendimentos", "Receita"]],
      body: data.topServices.map((s, i) => [
        String(i + 1),
        s.title,
        String(s.count),
        fmt(s.revenue),
      ]),
      theme: "grid",
      headStyles: { fillColor: [251, 146, 60], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Ranking barbeiros
  if (data.barberRanking.length > 0) {
    if (y > 230) { doc.addPage(); y = 18; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 50);
    doc.text("Ranking de Barbeiros", 14, y);
    y += 3;
    autoTable(doc, {
      startY: y,
      head: [["#", "Barbeiro", "Atendimentos", "Faturamento"]],
      body: data.barberRanking.map((b, i) => [
        String(i + 1),
        b.name,
        String(b.count),
        fmt(b.revenue),
      ]),
      theme: "grid",
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // Footer / assinatura
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setDrawColor(220, 220, 230);
    doc.line(14, pageH - 22, pageW - 14, pageH - 22);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 130);
    doc.setFont("helvetica", "normal");
    const generatedAt = new Date().toLocaleString("pt-BR");
    doc.text(`Gerado em ${generatedAt}`, 14, pageH - 16);
    doc.text(`Página ${i} de ${totalPages}`, pageW - 14, pageH - 16, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 70);
    doc.text(`Assinado por: ${data.ownerName || data.businessName}`, 14, pageH - 9);
  }

  return doc.output("blob");
}
