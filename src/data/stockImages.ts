import stockCorteMasculino from "@/assets/stock/corte-masculino.jpg";
import stockBarba from "@/assets/stock/barba.jpg";
import stockDegrade from "@/assets/service-degrade.jpg";
import stockSobrancelha from "@/assets/stock/sobrancelha.jpg";
import stockHidratacao from "@/assets/stock/hidratacao.jpg";
import stockDiaDoNoivo from "@/assets/stock/dia-do-noivo.jpg";
import stockCorteBarba from "@/assets/stock/corte-barba.jpg";
import stockToalhaQuente from "@/assets/stock/toalha-quente.jpg";
import stockColoracao from "@/assets/stock/coloracao.jpg";
import stockCorteInfantil from "@/assets/service-infantil.jpg";
import stockNavalha from "@/assets/service-navalha.jpg";
import stockPlatinado from "@/assets/service-platinado.jpg";

export interface StockImage {
  id: string;
  label: string;
  keywords: string[];
  src: string;
}

export const stockImages: StockImage[] = [
  {
    id: "corte-masculino",
    label: "Corte Masculino",
    keywords: ["corte", "masculino", "cabelo", "hair", "cut", "tesoura"],
    src: stockCorteMasculino,
  },
  {
    id: "barba",
    label: "Barba",
    keywords: ["barba", "beard", "navalha", "razor", "shave"],
    src: stockBarba,
  },
  {
    id: "degrade",
    label: "Degradê / Fade",
    keywords: ["degradê", "degrade", "fade", "máquina", "maquina"],
    src: stockDegrade,
  },
  {
    id: "sobrancelha",
    label: "Sobrancelha",
    keywords: ["sobrancelha", "eyebrow", "cera", "pinça", "design"],
    src: stockSobrancelha,
  },
  {
    id: "hidratacao",
    label: "Hidratação Capilar",
    keywords: ["hidratação", "hidratacao", "capilar", "tratamento", "condicionamento"],
    src: stockHidratacao,
  },
  {
    id: "dia-do-noivo",
    label: "Dia do Noivo",
    keywords: ["noivo", "groom", "premium", "pacote", "completo", "casamento"],
    src: stockDiaDoNoivo,
  },
  {
    id: "corte-barba",
    label: "Corte + Barba",
    keywords: ["combo", "corte", "barba", "completo"],
    src: stockCorteBarba,
  },
  {
    id: "toalha-quente",
    label: "Toalha Quente",
    keywords: ["toalha", "quente", "hot", "towel", "relaxante"],
    src: stockToalhaQuente,
  },
  {
    id: "coloracao",
    label: "Coloração",
    keywords: ["coloração", "coloracao", "tintura", "luzes", "mechas", "platinado"],
    src: stockColoracao,
  },
  {
    id: "corte-infantil",
    label: "Corte Infantil",
    keywords: ["infantil", "criança", "crianca", "kids", "child", "children"],
    src: stockCorteInfantil,
  },
  {
    id: "navalha",
    label: "Navalha",
    keywords: ["navalha", "razor", "lamina", "lâmina", "barbear"],
    src: stockNavalha,
  },
  {
    id: "platinado",
    label: "Platinado",
    keywords: ["platinado", "platinum", "loiro", "louro", "descoloracao", "descoloração"],
    src: stockPlatinado,
  },
];

/**
 * Find the best matching stock image for a service title
 */
export function findStockImage(title: string): StockImage | null {
  const lower = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Direct match by label
  const directMatch = stockImages.find(
    (img) => img.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === lower
  );
  if (directMatch) return directMatch;

  // Keyword match - score by how many keywords match
  let bestMatch: StockImage | null = null;
  let bestScore = 0;

  for (const img of stockImages) {
    let score = 0;
    for (const keyword of img.keywords) {
      const normalizedKeyword = keyword.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (lower.includes(normalizedKeyword)) {
        score += normalizedKeyword.length; // longer matches = better
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = img;
    }
  }

  return bestMatch;
}
