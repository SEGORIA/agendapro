export const TRIGGER_LABELS: Record<string, string> = {
  "appointment.created": "Cita agendada",
  "appointment.confirmed": "Cita confirmada",
  "appointment.reminder_24h": "24h antes de cita",
  "appointment.reminder_1h": "1h antes de cita",
  "appointment.cancelled": "Cita cancelada",
  "lead.created": "Lead creado",
  "lead.stage_changed": "Lead cambia etapa",
  "lead.inactive": "Lead inactivo",
};

export const ACTION_LABELS: Record<string, string> = {
  send_email: "Enviar email",
  send_whatsapp: "Enviar WhatsApp",
};

export interface AutomationAction {
  type: "send_email" | "send_whatsapp";
  config: Record<string, string>;
}

export const ACTION_TEMPLATES: Record<AutomationAction["type"], AutomationAction["config"]> = {
  send_email: { subject: "", body: "" },
  send_whatsapp: { message: "" },
};

// Plantillas sugeridas en /automations, indexadas por triggerEvent
export const AUTOMATION_TEMPLATES: Record<string, { name: string; actions: AutomationAction[] }> = {
  "appointment.reminder_24h": {
    name: "Recordatorio 24h",
    actions: [
      {
        type: "send_whatsapp",
        config: { message: "Hola {{client.name}}, te recordamos tu cita de {{service.name}} mañana a las {{appointment.time}}. ¡Te esperamos!" },
      },
    ],
  },
  "appointment.created": {
    name: "Confirmación automática",
    actions: [
      {
        type: "send_email",
        config: {
          subject: "Confirmación de tu cita",
          body: "Hola {{client.name}}, tu cita de {{service.name}} ha sido agendada para {{appointment.date}} a las {{appointment.time}}. ¡Gracias por agendar con nosotros!",
        },
      },
    ],
  },
  "appointment.confirmed": {
    name: "Follow-up post cita",
    actions: [
      {
        type: "send_email",
        config: {
          subject: "¿Cómo fue tu experiencia?",
          body: "Hola {{client.name}}, gracias por tu visita. Nos encantaría conocer tu opinión sobre el servicio {{service.name}}.",
        },
      },
    ],
  },
};
