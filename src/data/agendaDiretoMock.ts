// Mock local — usado apenas pela rota /agenda-direto (preview/UX)
// Não integra com banco/admin. Pode ser ajustado livremente.

import gallery1 from "@/assets/styllus/gallery-1.jpg";
import gallery2 from "@/assets/styllus/gallery-2.jpg";
import gallery3 from "@/assets/styllus/gallery-3.jpg";
import gallery4 from "@/assets/styllus/gallery-4.jpg";
import gallery5 from "@/assets/styllus/gallery-5.jpg";
import hero1 from "@/assets/styllus/hero-1.jpg";
import hero2 from "@/assets/styllus/hero-2.jpg";
import hero3 from "@/assets/styllus/hero-3.jpg";

import {
  Wifi, Coffee, ParkingCircle, Snowflake, Tv, Sparkles, CreditCard,
  Accessibility, Baby, Dog, Wine, Music,
  type LucideIcon,
} from "lucide-react";

export interface MockAmenity {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export interface MockService {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  duration: string;
  image: string;
  amenities?: string[]; // amenity ids
}

export interface MockCategory {
  id: string;
  label: string;
  services: MockService[];
}

export interface MockBarber {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  initials: string;
  accent: string; // hsl color
}

// Comodidades disponíveis (admin escolheria quais a barbearia oferece)
export const MOCK_AMENITIES: MockAmenity[] = [
  { id: "wifi", label: "Wi-Fi", icon: Wifi, description: "Internet sem fio gratuita e de alta velocidade disponível para todos os clientes durante o atendimento." },
  { id: "coffee", label: "Café", icon: Coffee, description: "Café fresco, água gelada e bebidas de cortesia enquanto você espera ou durante o serviço." },
  { id: "parking", label: "Estacionamento", icon: ParkingCircle, description: "Estacionamento próprio gratuito com vagas amplas e fáceis de acessar em frente à barbearia." },
  { id: "ar", label: "Ar-condicionado", icon: Snowflake, description: "Ambiente totalmente climatizado para seu máximo conforto, em qualquer estação do ano." },
  { id: "tv", label: "TV / Streaming", icon: Tv, description: "Smart TV com canais esportivos, séries e jogos para você acompanhar enquanto cuida do visual." },
  { id: "produtos", label: "Produtos premium", icon: Sparkles, description: "Trabalhamos apenas com pomadas, óleos e cosméticos premium das melhores marcas do mercado." },
  { id: "cartao", label: "Cartão / PIX", icon: CreditCard, description: "Aceitamos todas as bandeiras de cartão, PIX e dinheiro. Pagamento parcelado disponível." },
  { id: "acessivel", label: "Acessível", icon: Accessibility, description: "Espaço adaptado com acesso facilitado para pessoas com mobilidade reduzida." },
  { id: "kids", label: "Espaço Kids", icon: Baby, description: "Atendimento especializado para crianças com cadeira lúdica e ambiente acolhedor." },
  { id: "petfriendly", label: "Pet friendly", icon: Dog, description: "Seu pet é bem-vindo. Trazemos água e um cantinho confortável para ele esperar com você." },
  { id: "drinks", label: "Drinks de cortesia", icon: Wine, description: "Cervejas, drinks e energéticos de cortesia para tornar sua experiência ainda mais especial." },
  { id: "som", label: "Ambiente sonoro", icon: Music, description: "Trilha sonora cuidadosamente selecionada para criar a atmosfera perfeita para o seu momento." },
];

// Comodidades que ESTA barbearia oferece (máx 4 — admin define)
export const MOCK_BARBERSHOP_AMENITIES = ["wifi", "coffee", "parking", "ar"];

const ALL = MOCK_BARBERSHOP_AMENITIES;

export const MOCK_CATEGORIES: MockCategory[] = [
  {
    id: "cabelo",
    label: "Cabelo",
    services: [
      { id: "c1", title: "Corte Clássico", subtitle: "Tesoura e máquina, acabamento na navalha", price: 45, duration: "40 min", image: gallery1, amenities: ALL },
      { id: "c2", title: "Corte Degradê", subtitle: "Fade tradicional ou americano, transição perfeita", price: 55, duration: "45 min", image: gallery2, amenities: ALL },
      { id: "c3", title: "Corte Tesoura", subtitle: "Estilo clássico totalmente na tesoura", price: 65, duration: "50 min", image: gallery3, amenities: ALL },
      { id: "c4", title: "Corte Infantil", subtitle: "Atendimento especial para crianças", price: 35, duration: "30 min", image: gallery4, amenities: ["wifi","coffee","parking","ar","tv","cartao"] },
    ],
  },
  {
    id: "barba",
    label: "Barba",
    services: [
      { id: "b1", title: "Barba Completa", subtitle: "Toalha quente, navalha e finalização", price: 40, duration: "30 min", image: gallery5, amenities: ALL },
      { id: "b2", title: "Acabamento de Barba", subtitle: "Contorno e ajuste rápido", price: 25, duration: "20 min", image: gallery2, amenities: ALL },
      { id: "b3", title: "Barboterapia Premium", subtitle: "Ritual completo: vapor, esfoliação e hidratação", price: 70, duration: "50 min", image: hero2, amenities: ALL },
    ],
  },
  {
    id: "combos",
    label: "Combos",
    services: [
      { id: "co1", title: "Corte + Barba", subtitle: "O combo mais pedido da casa", price: 75, duration: "1h", image: hero1, amenities: ALL },
      { id: "co2", title: "Pacote Completo", subtitle: "Corte, barba e sobrancelha", price: 95, duration: "1h 20min", image: hero3, amenities: ALL },
      { id: "co3", title: "Day Use Estiloso", subtitle: "Corte, barba, hidratação e pigmentação", price: 140, duration: "1h 45min", image: gallery1, amenities: ALL },
    ],
  },
  {
    id: "tratamentos",
    label: "Tratamentos",
    services: [
      { id: "t1", title: "Hidratação Capilar", subtitle: "Recuperação profunda dos fios", price: 50, duration: "30 min", image: gallery3, amenities: ALL },
      { id: "t2", title: "Pigmentação de Barba", subtitle: "Disfarce de falhas e brancos", price: 60, duration: "45 min", image: gallery5, amenities: ALL },
      { id: "t3", title: "Sobrancelha", subtitle: "Design masculino na navalha", price: 20, duration: "15 min", image: gallery2, amenities: ALL },
      { id: "t4", title: "Platinado", subtitle: "Descoloração e tonalização premium", price: 180, duration: "2h", image: gallery4, amenities: ALL },
    ],
  },
];

export const MOCK_BARBERS: MockBarber[] = [
  { id: "b1", name: "Bruno Styllus", specialty: "Especialista em fade", rating: 4.9, initials: "BS", accent: "hsl(220 70% 55%)" },
  { id: "b2", name: "Carlos Andrade", specialty: "Tesoura clássica", rating: 4.8, initials: "CA", accent: "hsl(15 70% 55%)" },
  { id: "b3", name: "Diego Souza", specialty: "Barboterapia", rating: 5.0, initials: "DS", accent: "hsl(160 50% 45%)" },
  { id: "b4", name: "Marcelo Lima", specialty: "Coloração e platinado", rating: 4.7, initials: "ML", accent: "hsl(280 50% 55%)" },
];

export const MOCK_TIMES = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
];
