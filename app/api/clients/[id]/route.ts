import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
  pipelineStageId: z.string().nullable().optional(),
});

// GET /api/clients/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id, tenantId: session.user.tenantId },
    include: {
      pipelineStage: true,
      appointments: {
        include: { service: true, staff: { select: { id: true, name: true } } },
        orderBy: { startsAt: "desc" },
      },
    },
  });

  if (!client) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({ data: client });
}

// PATCH /api/clients/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const client = await prisma.client.update({
      where: { id, tenantId: session.user.tenantId },
      data: { ...data, email: data.email === "" ? null : data.email },
      include: { pipelineStage: true },
    });

    return NextResponse.json({ data: client });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
