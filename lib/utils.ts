import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isToday(d)) return `Hoy, ${format(d, "h:mm a")}`;
  if (isTomorrow(d)) return `Mañana, ${format(d, "h:mm a")}`;
  return format(d, "d MMM yyyy, h:mm a", { locale: es });
}

export function formatTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "h:mm a");
}

export function formatRelative(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function formatCurrency(amount: number, currency = "COP") {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .trim();
}

export const SECTOR_LABELS: Record<string, string> = {
  general: "General",
  medical: "Salud / Médico",
  legal: "Legal / Jurídico",
  education: "Educación",
  beauty: "Belleza & Estética",
  fitness: "Fitness & Bienestar",
};

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No se presentó",
  RESCHEDULED: "Reagendada",
};

export const APPOINTMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-red-100 text-red-800",
  NO_SHOW: "bg-gray-100 text-gray-800",
  RESCHEDULED: "bg-purple-100 text-purple-800",
};

export const PIPELINE_DEFAULT_STAGES = [
  { name: "Nuevo", color: "#6366f1", order: 0 },
  { name: "Contactado", color: "#f59e0b", order: 1 },
  { name: "Calificado", color: "#10b981", order: 2 },
  { name: "Propuesta", color: "#3b82f6", order: 3 },
  { name: "Cliente", color: "#22c55e", order: 4 },
  { name: "Cerrado", color: "#6b7280", order: 5 },
];
