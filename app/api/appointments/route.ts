import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { addMinutes } from "date-fns";
import { createCalendarEvent } from "@/lib/google-calendar";

const createSchema = z.object({
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional(),
  clientPhone: z.string().optional(),
  serviceId: z.string(),
  staffId: z.string().optional(),
  startsAt: z.string(),
  notes: z.string().optional(),
});

// GET /api/appointments — listar citas del tenant
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = 20;

  const where: any = { tenantId: session.user.tenantId };
  if (status) where.status = status;

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: { client: true, service: true, staff: { select: { id: true, name: true } } },
      orderBy: { startsAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.appointment.count({ where }),
  ]);

  return NextResponse.json({
    data: appointments,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// POST /api/appointments — crear cita (staff/admin)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const service = await prisma.service.findUnique({
      where: { id: data.serviceId, tenantId: session.user.tenantId },
    });
    if (!service) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });

    const startsAt = new Date(data.startsAt);
    const endsAt = addMinutes(startsAt, service.durationMin);

    let clientId = data.clientId;
    if (!clientId && data.clientName) {
      const client = await prisma.client.create({
        data: {
          tenantId: session.user.tenantId,
          name: data.clientName,
          email: data.clientEmail,
          phone: data.clientPhone,
          source: "MANUAL",
        },
      });
      clientId = client.id;
    }

    if (!clientId) {
      return NextResponse.json({ error: "Se requiere cliente" }, { status: 400 });
    }

    const appointment = await prisma.appointment.create({
      data: {
        tenantId: session.user.tenantId,
        clientId,
        serviceId: data.serviceId,
        staffId: data.staffId || session.user.id,
        startsAt,
        endsAt,
        status: "CONFIRMED",
        notes: data.notes,
      },
      include: { client: true, service: true },
    });

    // Crear evento en Google Calendar del tenant (si está conectado)
    try {
      const eventId = await createCalendarEvent(session.user.tenantId, {
        summary: `${service.name} — ${appointment.client.name}`,
        description: data.notes || undefined,
        start: startsAt,
        end: endsAt,
      });
      if (eventId) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { metadata: JSON.stringify({ googleEventId: eventId }) },
        });
      }
    } catch {
      // un fallo de Google no debe romper la creación de la cita
    }

    return NextResponse.json({ data: appointment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
