import { Scissors, Sparkles, Star, Brush, Droplets, Crown } from "lucide-react";

export interface Service {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  duration: string;
  icon: typeof Scissors;
}

export const services: Service[] = [
  {
    id: "corte",
    title: "Corte Masculino",
    subtitle: "Corte personalizado no estilo que você preferir",
    price: 45,
    duration: "40 min",
    icon: Scissors,
  },
  {
    id: "barba",
    title: "Barba",
    subtitle: "Modelagem e alinhamento com navalha",
    price: 35,
    duration: "30 min",
    icon: Brush,
  },
  {
    id: "combo",
    title: "Corte + Barba",
    subtitle: "Combo completo com desconto especial",
    price: 70,
    duration: "1h 10min",
    icon: Crown,
  },
  {
    id: "sobrancelha",
    title: "Sobrancelha",
    subtitle: "Design e limpeza com cera ou pinça",
    price: 20,
    duration: "15 min",
    icon: Sparkles,
  },
  {
    id: "hidratacao",
    title: "Hidratação Capilar",
    subtitle: "Tratamento profundo para fios saudáveis",
    price: 55,
    duration: "45 min",
    icon: Droplets,
  },
  {
    id: "premium",
    title: "Dia do Noivo",
    subtitle: "Pacote completo: corte, barba, hidratação e sobrancelha",
    price: 150,
    duration: "2h",
    icon: Star,
  },
];

export interface Barber {
  id: string;
  name: string;
  specialty: string;
  avatar: string;
}

export const barbers: Barber[] = [
  { id: "1", name: "Carlos", specialty: "Cortes clássicos", avatar: "C" },
  { id: "2", name: "Rafael", specialty: "Degradê e fade", avatar: "R" },
  { id: "3", name: "Lucas", specialty: "Barba artística", avatar: "L" },
];

export const availableTimes = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
];
