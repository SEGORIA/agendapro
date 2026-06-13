import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  sector: z.string().optional(),
  plan: z.string().optional(),
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  customDomain: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

async function requireSuperAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return null;
  }
  return session;
}

// GET /api/tenants/[id] — detalle de un tenant (solo super admin)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      users: {
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { clients: true, appointments: true, services: true } },
    },
  });

  if (!tenant) return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });

  return NextResponse.json({ data: tenant });
}

// PATCH /api/tenants/[id] — actualizar tenant (solo super admin)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    if (data.customDomain !== undefined) {
      const existing = await prisma.tenant.findFirst({
        where: { customDomain: data.customDomain || undefined, NOT: { id } },
      });
      if (data.customDomain && existing) {
        return NextResponse.json({ error: "Ese dominio ya está en uso" }, { status: 409 });
      }
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...data,
        customDomain: data.customDomain === "" ? null : data.customDomain,
      },
    });

    return NextResponse.json({ data: tenant });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 });
    }
    console.error("[UPDATE TENANT]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
