import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { bookingQuestionSchema } from "@/lib/booking";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().or(z.literal("")),
  durationMin: z.number().int().min(5).max(480).optional(),
  price: z.number().min(0).optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
  bookingQuestions: z.array(bookingQuestionSchema).optional(),
});

// PATCH /api/services/[id] — actualizar servicio
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.service.findUnique({ where: { id, tenantId: session.user.tenantId } });
  if (!existing) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const service = await prisma.service.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.durationMin !== undefined && { durationMin: data.durationMin }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.bookingQuestions !== undefined && { bookingQuestions: JSON.stringify(data.bookingQuestions) }),
      },
    });

    return NextResponse.json({ data: service });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 });
    }
    console.error("[UPDATE SERVICE]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/services/[id] — desactivar servicio (soft delete, conserva historial de citas)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.service.findUnique({ where: { id, tenantId: session.user.tenantId } });
  if (!existing) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });

  await prisma.service.update({ where: { id }, data: { isActive: false } });

  return NextResponse.json({ data: { ok: true } });
}
