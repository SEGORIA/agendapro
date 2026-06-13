import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const actionSchema = z.object({
  type: z.enum(["send_email", "send_whatsapp"]),
  config: z.record(z.string(), z.any()).default({}),
});

const createSchema = z.object({
  name: z.string().min(2),
  triggerEvent: z.string().min(1),
  actions: z.array(actionSchema).default([]),
  isActive: z.boolean().optional(),
});

// GET /api/automations — listar automatizaciones del tenant
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const automations = await prisma.automation.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: automations });
}

// POST /api/automations — crear automatización
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const automation = await prisma.automation.create({
      data: {
        tenantId: session.user.tenantId,
        name: data.name,
        triggerEvent: data.triggerEvent,
        actions: JSON.stringify(data.actions),
        isActive: data.isActive ?? true,
      },
    });

    return NextResponse.json({ data: automation }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
