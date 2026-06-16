import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/appointments/calendar?from=ISO&to=ISO
// Devuelve las citas del tenant que se solapan con el rango [from, to], sin paginar.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  if (!fromParam || !toParam) {
    return NextResponse.json({ error: "Se requieren 'from' y 'to'" }, { status: 400 });
  }

  const from = new Date(fromParam);
  const to = new Date(toParam);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return NextResponse.json({ error: "Fechas inválidas" }, { status: 400 });
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId: session.user.tenantId,
      // Una cita es visible si empieza antes del fin del rango y termina después del inicio.
      startsAt: { lt: to },
      endsAt: { gt: from },
    },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      client: { select: { name: true } },
      service: { select: { name: true, color: true, durationMin: true } },
      staff: { select: { name: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  return NextResponse.json({ data: appointments });
}
