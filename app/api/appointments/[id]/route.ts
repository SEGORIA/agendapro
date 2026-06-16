import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { addMinutes } from "date-fns";
import { createNotification, type NotificationType } from "@/lib/notifications";
import { updateCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";

const STATUS_NOTIFICATIONS: Partial<Record<string, { type: NotificationType; title: string }>> = {
  CONFIRMED: { type: "appointment.confirmed", title: "Cita confirmada" },
  CANCELLED: { type: "appointment.cancelled", title: "Cita cancelada" },
  COMPLETED: { type: "appointment.completed", title: "Cita completada" },
};

// Extrae el id del evento de Google guardado en metadata (JSON)
function parseGoogleEventId(metadata: string | null | undefined): string | null {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata)?.googleEventId ?? null;
  } catch {
    return null;
  }
}

const updateSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW", "RESCHEDULED"]).optional(),
  notes: z.string().optional(),
  meetingUrl: z.string().url().optional(),
  staffId: z.string().optional(),
  startsAt: z.string().datetime().optional(),
});

// GET /api/appointments/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const appointment = await prisma.appointment.findUnique({
    where: { id, tenantId: session.user.tenantId },
    include: {
      client: true,
      service: true,
      staff: { select: { id: true, name: true, email: true } },
    },
  });

  if (!appointment) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({ data: appointment });
}

// PATCH /api/appointments/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const { startsAt, ...data } = updateSchema.parse(body);

    // Reprogramación: recalcular endsAt según la duración del servicio
    const reschedule: { startsAt?: Date; endsAt?: Date } = {};
    if (startsAt) {
      const current = await prisma.appointment.findUnique({
        where: { id, tenantId: session.user.tenantId },
        include: { service: true },
      });
      if (!current) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

      const newStart = new Date(startsAt);
      const durationMin =
        current.service?.durationMin ??
        Math.max(15, Math.round((current.endsAt.getTime() - current.startsAt.getTime()) / 60000));
      reschedule.startsAt = newStart;
      reschedule.endsAt = addMinutes(newStart, durationMin);
    }

    const appointment = await prisma.appointment.update({
      where: { id, tenantId: session.user.tenantId },
      data: { ...data, ...reschedule },
      include: { client: true, service: true },
    });

    if (startsAt) {
      await createNotification(session.user.tenantId, {
        type: "appointment.rescheduled",
        title: "Cita reprogramada",
        message: `${appointment.client.name} · ${appointment.service?.name || "Cita"}`,
        link: `/appointments/${appointment.id}`,
      });
    }

    if (data.status) {
      const notif = STATUS_NOTIFICATIONS[data.status];
      if (notif) {
        await createNotification(session.user.tenantId, {
          type: notif.type,
          title: notif.title,
          message: `${appointment.client.name} · ${appointment.service?.name || "Cita"}`,
          link: `/appointments/${appointment.id}`,
        });
      }
    }

    // Sincronizar con Google Calendar (best-effort)
    const googleEventId = parseGoogleEventId(appointment.metadata);
    if (googleEventId) {
      try {
        if (data.status === "CANCELLED") {
          await deleteCalendarEvent(session.user.tenantId, googleEventId);
        } else if (reschedule.startsAt && reschedule.endsAt) {
          await updateCalendarEvent(session.user.tenantId, googleEventId, reschedule.startsAt, reschedule.endsAt);
        }
      } catch {
        // un fallo de Google no debe romper la actualización de la cita
      }
    }

    return NextResponse.json({ data: appointment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/appointments/[id] — sólo cancela, no borra
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const appointment = await prisma.appointment.update({
    where: { id, tenantId: session.user.tenantId },
    data: { status: "CANCELLED" },
    include: { client: true, service: true },
  });

  // Borrar el evento de Google Calendar si existe (best-effort)
  const googleEventId = parseGoogleEventId(appointment.metadata);
  if (googleEventId) {
    try {
      await deleteCalendarEvent(session.user.tenantId, googleEventId);
    } catch {
      // ignorar fallo de Google
    }
  }

  await createNotification(session.user.tenantId, {
    type: "appointment.cancelled",
    title: "Cita cancelada",
    message: `${appointment.client.name} · ${appointment.service?.name || "Cita"}`,
    link: `/appointments/${appointment.id}`,
  });

  return NextResponse.json({ message: "Cita cancelada" });
}
