import { prisma } from "@/lib/prisma";

export type NotificationType =
  | "appointment.created"
  | "appointment.confirmed"
  | "appointment.cancelled"
  | "appointment.completed";

export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  "appointment.created": "Nueva cita",
  "appointment.confirmed": "Cita confirmada",
  "appointment.cancelled": "Cita cancelada",
  "appointment.completed": "Cita completada",
};

interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export async function createNotification(tenantId: string, data: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      tenantId,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link,
    },
  });
}
