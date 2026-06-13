import { z } from "zod";

// Pregunta personalizada que el tenant define por servicio y que
// el cliente final responde al agendar (estilo Calendly).
export interface BookingQuestion {
  id: string;
  label: string;
  type: "text" | "textarea" | "radio";
  options?: string[]; // solo para radio
  required?: boolean;
}

export const bookingQuestionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "textarea", "radio"]),
  options: z.array(z.string().min(1)).optional(),
  required: z.boolean().optional(),
});

export const QUESTION_TYPE_LABELS: Record<BookingQuestion["type"], string> = {
  text: "Respuesta corta",
  textarea: "Respuesta larga",
  radio: "Opción múltiple",
};

export function parseBookingQuestions(raw: string | null | undefined): BookingQuestion[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
