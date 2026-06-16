import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { format, parseISO, addMinutes, setHours, setMinutes, startOfDay, endOfDay } from "date-fns";
import { getFreeBusy } from "@/lib/google-calendar";

// GET /api/slots?tenantId=xxx&serviceId=xxx&date=2024-01-15&staffId=xxx
// Público — no requiere auth
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId");
  const serviceId = searchParams.get("serviceId");
  const dateStr = searchParams.get("date");
  const staffId = searchParams.get("staffId");

  if (!tenantId || !serviceId || !dateStr) {
    return NextResponse.json({ error: "Parámetros requeridos: tenantId, serviceId, date" }, { status: 400 });
  }

  const date = parseISO(dateStr);
  const dayOfWeek = date.getDay();

  // Obtener el servicio (duración)
  const service = await prisma.service.findUnique({
    where: { id: serviceId, tenantId, isActive: true },
  });
  if (!service) {
    return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
  }

  // Obtener reglas de disponibilidad del día
  const availabilityRules = await prisma.availabilityRule.findMany({
    where: {
      tenantId,
      dayOfWeek,
      isActive: true,
      ...(staffId ? { OR: [{ userId: staffId }, { userId: null }] } : { userId: null }),
    },
  });

  if (availabilityRules.length === 0) {
    return NextResponse.json({ data: [] });
  }

  // Obtener citas ya agendadas ese día
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      ...(staffId && { staffId }),
      status: { notIn: ["CANCELLED"] },
      startsAt: { gte: startOfDay(date), lte: endOfDay(date) },
    },
    select: { startsAt: true, endsAt: true },
  });

  // Horarios ocupados en Google Calendar del tenant (si está conectado).
  // getFreeBusy devuelve [] si no hay conexión o si la llamada falla.
  let googleBusy: { start: Date; end: Date }[] = [];
  try {
    googleBusy = await getFreeBusy(tenantId, startOfDay(date), endOfDay(date));
  } catch {
    googleBusy = [];
  }

  // Lista unificada de intervalos ocupados (citas internas + Google Calendar)
  const busyIntervals = [
    ...existingAppointments.map((a) => ({ start: a.startsAt, end: a.endsAt })),
    ...googleBusy,
  ];

  const slots: { time: string; datetime: string; available: boolean }[] = [];

  for (const rule of availabilityRules) {
    const [startH, startM] = rule.startTime.split(":").map(Number);
    const [endH, endM] = rule.endTime.split(":").map(Number);

    let currentTime = setMinutes(setHours(startOfDay(date), startH), startM);
    const endTime = setMinutes(setHours(startOfDay(date), endH), endM);

    while (currentTime < endTime) {
      const slotEnd = addMinutes(currentTime, service.durationMin);

      if (slotEnd > endTime) break;

      // Verificar que no haya conflicto (citas internas o eventos de Google)
      const hasConflict = busyIntervals.some(
        (b) => currentTime < b.end && slotEnd > b.start
      );

      // Solo mostrar slots futuros
      const isInFuture = currentTime > new Date();

      slots.push({
        time: format(currentTime, "HH:mm"),
        datetime: currentTime.toISOString(),
        available: !hasConflict && isInFuture,
      });

      currentTime = addMinutes(currentTime, 30); // intervalo de 30 min
    }
  }

  return NextResponse.json({ data: slots });
}
