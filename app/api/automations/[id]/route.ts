import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const actionSchema = z.object({
  type: z.enum(["send_email", "send_whatsapp"]),
  config: z.record(z.string(), z.any()).default({}),
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  triggerEvent: z.string().min(1).optional(),
  actions: z.array(actionSchema).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/automations/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const automation = await prisma.automation.findUnique({
    where: { id, tenantId: session.user.tenantId },
  });

  if (!automation) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({ data: automation });
}

// PATCH /api/automations/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const automation = await prisma.automation.update({
      where: { id, tenantId: session.user.tenantId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.triggerEvent !== undefined && { triggerEvent: data.triggerEvent }),
        ...(data.actions !== undefined && { actions: JSON.stringify(data.actions) }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return NextResponse.json({ data: automation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/automations/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  await prisma.automation.delete({
    where: { id, tenantId: session.user.tenantId },
  });

  return NextResponse.json({ message: "Automatización eliminada" });
}
