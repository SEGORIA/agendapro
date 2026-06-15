import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const TIME_REGEX = /^([0-1]\d|2[0-3]):[0-5]\d$/;

const ruleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(TIME_REGEX, "Formato HH:MM requerido"),
  endTime: z.string().regex(TIME_REGEX, "Formato HH:MM requerido"),
  isActive: z.boolean(),
});

const putSchema = z.array(ruleSchema).length(7, "Se requieren exactamente 7 días");

const DEFAULTS = { startTime: "09:00", endTime: "18:00", isActive: false };

// GET /api/availability — reglas tenant-wide del tenant autenticado
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const existing = await prisma.availabilityRule.findMany({
    where: { tenantId: session.user.tenantId, userId: null },
    orderBy: { dayOfWeek: "asc" },
  });

  const byDay = new Map(existing.map((r) => [r.dayOfWeek, r]));

  const rules = Array.from({ length: 7 }, (_, day) => {
    const rule = byDay.get(day);
    if (rule) return { dayOfWeek: rule.dayOfWeek, startTime: rule.startTime, endTime: rule.endTime, isActive: rule.isActive };
    return { dayOfWeek: day, ...DEFAULTS };
  });

  return NextResponse.json({ data: rules });
}

// PUT /api/availability — guardar/reemplazar las 7 reglas tenant-wide
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "No tienes permisos para esta acción" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const rules = putSchema.parse(body);

    for (const rule of rules) {
      if (rule.isActive && rule.startTime >= rule.endTime) {
        return NextResponse.json(
          { error: `La hora de inicio debe ser anterior a la hora de fin (día ${rule.dayOfWeek})` },
          { status: 400 }
        );
      }
    }

    const tenantId = session.user.tenantId;

    await prisma.$transaction(async (tx) => {
      for (const rule of rules) {
        const existing = await tx.availabilityRule.findFirst({
          where: { tenantId, userId: null, dayOfWeek: rule.dayOfWeek },
        });
        if (existing) {
          await tx.availabilityRule.update({
            where: { id: existing.id },
            data: { startTime: rule.startTime, endTime: rule.endTime, isActive: rule.isActive },
          });
        } else {
          await tx.availabilityRule.create({
            data: { tenantId, userId: null, dayOfWeek: rule.dayOfWeek, startTime: rule.startTime, endTime: rule.endTime, isActive: rule.isActive },
          });
        }
      }
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
    }
    console.error("[AVAILABILITY PUT]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
