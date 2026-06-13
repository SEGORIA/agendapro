import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createNotification, type NotificationType } from "@/lib/notifications";

const STATUS_NOTIFICATIONS: Partial<Record<string, { type: NotificationType; title: string }>> = {
  CONFIRMED: { type: "appointment.confirmed", title: "Cita confirmada" },
  CANCELLED: { type: "appointment.cancelled", title: "Cita cancelada" },
  COMPLETED: { type: "appointment.completed", title: "Cita completada" },
};

const updateSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW", "RESCHEDULED"]).optional(),
  notes: z.string().optional(),
  meetingUrl: z.string().url().optional(),
  staffId: z.string().optional(),
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
    const data = updateSchema.parse(body);

    const appointment = await prisma.appointment.update({
      where: { id, tenantId: session.user.tenantId },
      data,
      include: { client: true, service: true },
    });

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

  await createNotification(session.user.tenantId, {
    type: "appointment.cancelled",
    title: "Cita cancelada",
    message: `${appointment.client.name} · ${appointment.service?.name || "Cita"}`,
    link: `/appointments/${appointment.id}`,
  });

  return NextResponse.json({ message: "Cita cancelada" });
}
