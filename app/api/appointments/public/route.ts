import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { addMinutes } from "date-fns";
import { createNotification } from "@/lib/notifications";

const schema = z.object({
  tenantId: z.string(),
  serviceId: z.string(),
  staffId: z.string().optional(),
  startsAt: z.string(),
  clientName: z.string().min(2),
  clientEmail: z.string().email(),
  clientPhone: z.string().optional(),
  notes: z.string().optional(),
  // Respuestas a preguntas personalizadas del servicio: { [label]: respuesta }
  formData: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    // Verificar que el tenant existe
    const tenant = await prisma.tenant.findUnique({
      where: { id: data.tenantId, isActive: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
    }

    // Obtener el servicio para calcular duración
    const service = await prisma.service.findUnique({
      where: { id: data.serviceId, tenantId: data.tenantId },
    });
    if (!service) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
    }

    const startsAt = new Date(data.startsAt);
    const endsAt = addMinutes(startsAt, service.durationMin);

    // Verificar que no haya conflicto de horario
    const conflict = await prisma.appointment.findFirst({
      where: {
        tenantId: data.tenantId,
        staffId: data.staffId,
        status: { notIn: ["CANCELLED"] },
        OR: [
          { startsAt: { gte: startsAt, lt: endsAt } },
          { endsAt: { gt: startsAt, lte: endsAt } },
          { startsAt: { lte: startsAt }, endsAt: { gte: endsAt } },
        ],
      },
    });

    if (conflict) {
      return NextResponse.json(
        { error: "El horario seleccionado ya no está disponible" },
        { status: 409 }
      );
    }

    // Buscar o crear cliente
    let client = await prisma.client.findFirst({
      where: { tenantId: data.tenantId, email: data.clientEmail },
    });

    if (!client) {
      // Obtener la primera etapa del pipeline
      const firstStage = await prisma.pipelineStage.findFirst({
        where: { tenantId: data.tenantId, isActive: true },
        orderBy: { order: "asc" },
      });

      client = await prisma.client.create({
        data: {
          tenantId: data.tenantId,
          name: data.clientName,
          email: data.clientEmail,
          phone: data.clientPhone,
          source: "BOOKING",
          pipelineStageId: firstStage?.id,
        },
      });
    }

    // Crear la cita
    const appointment = await prisma.appointment.create({
      data: {
        tenantId: data.tenantId,
        clientId: client.id,
        serviceId: data.serviceId,
        staffId: data.staffId,
        startsAt,
        endsAt,
        status: "PENDING",
        clientNotes: data.notes,
        formData: JSON.stringify(data.formData || {}),
      },
    });

    // TODO: Disparar automatizaciones (appointment.created)
    // TODO: Enviar email de confirmación

    await createNotification(data.tenantId, {
      type: "appointment.created",
      title: "Nueva cita agendada",
      message: `${client.name} agendó "${service.name}" el ${startsAt.toLocaleDateString("es-CO", { day: "numeric", month: "long" })} a las ${startsAt.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })}`,
      link: `/appointments/${appointment.id}`,
    });

    return NextResponse.json({ data: appointment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 });
    }
    console.error("[PUBLIC BOOKING] Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
