// Mock local — usado apenas pela rota /agenda-direto (preview/UX)
// Não integra com banco/admin. Pode ser ajustado livremente.

import gallery1 from "@/assets/styllus/gallery-1.jpg";
import gallery2 from "@/assets/styllus/gallery-2.jpg";
import gallery3 from "@/assets/styllus/gallery-3.jpg";
import gallery4 from "@/assets/styllus/gallery-4.jpg";
import gallery5 from "@/assets/styllus/gallery-5.jpg";
import gallery6 from "@/assets/styllus/gallery-6.jpg";
import hero1 from "@/assets/styllus/hero-1.jpg";
import hero2 from "@/assets/styllus/hero-2.jpg";
import hero3 from "@/assets/styllus/hero-3.jpg";

export interface MockService {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  duration: string;
  image: string;
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
  avatar: string;
}

export const MOCK_CATEGORIES: MockCategory[] = [
  {
    id: "cabelo",
    label: "Cabelo",
    services: [
      { id: "c1", title: "Corte Clássico", subtitle: "Tesoura e máquina, acabamento na navalha", price: 45, duration: "40 min", image: gallery1 },
      { id: "c2", title: "Corte Degradê", subtitle: "Fade tradicional ou americano, transição perfeita", price: 55, duration: "45 min", image: gallery2 },
      { id: "c3", title: "Corte Tesoura", subtitle: "Estilo clássico totalmente na tesoura", price: 65, duration: "50 min", image: gallery3 },
      { id: "c4", title: "Corte Infantil", subtitle: "Atendimento especial para crianças", price: 35, duration: "30 min", image: gallery4 },
    ],
  },
  {
    id: "barba",
    label: "Barba",
    services: [
      { id: "b1", title: "Barba Completa", subtitle: "Toalha quente, navalha e finalização", price: 40, duration: "30 min", image: gallery5 },
      { id: "b2", title: "Acabamento de Barba", subtitle: "Contorno e ajuste", price: 25, duration: "20 min", image: gallery6 },
      { id: "b3", title: "Barboterapia", subtitle: "Ritual completo: vapor, esfoliação e hidratação", price: 70, duration: "50 min", image: hero2 },
    ],
  },
  {
    id: "combos",
    label: "Combos",
    services: [
      { id: "co1", title: "Corte + Barba", subtitle: "O combo mais pedido da casa", price: 75, duration: "1h", image: hero1 },
      { id: "co2", title: "Pacote Completo", subtitle: "Corte, barba e sobrancelha", price: 95, duration: "1h 20min", image: hero3 },
      { id: "co3", title: "Day Use Estiloso", subtitle: "Corte, barba, hidratação e pigmentação", price: 140, duration: "1h 45min", image: gallery1 },
    ],
  },
  {
    id: "tratamentos",
    label: "Tratamentos",
    services: [
      { id: "t1", title: "Hidratação Capilar", subtitle: "Recuperação profunda dos fios", price: 50, duration: "30 min", image: gallery3 },
      { id: "t2", title: "Pigmentação de Barba", subtitle: "Disfarce de falhas e brancos", price: 60, duration: "45 min", image: gallery5 },
      { id: "t3", title: "Sobrancelha", subtitle: "Design masculino na navalha", price: 20, duration: "15 min", image: gallery2 },
      { id: "t4", title: "Platinado", subtitle: "Descoloração e tonalização premium", price: 180, duration: "2h", image: gallery4 },
    ],
  },
];

export const MOCK_BARBERS: MockBarber[] = [
  { id: "b1", name: "Bruno Styllus", specialty: "Especialista em fade", rating: 4.9, avatar: "https://i.pravatar.cc/200?img=12" },
  { id: "b2", name: "Carlos Andrade", specialty: "Tesoura clássica", rating: 4.8, avatar: "https://i.pravatar.cc/200?img=33" },
  { id: "b3", name: "Diego Souza", specialty: "Barboterapia", rating: 5.0, avatar: "https://i.pravatar.cc/200?img=15" },
  { id: "b4", name: "Marcelo Lima", specialty: "Coloração e platinado", rating: 4.7, avatar: "https://i.pravatar.cc/200?img=68" },
];

export const MOCK_TIMES = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
];
