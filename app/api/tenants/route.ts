import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { PIPELINE_DEFAULT_STAGES } from "@/lib/utils";

const createTenantSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
  sector: z.string().default("general"),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  primaryColor: z.string().default("#6366f1"),
  accentColor: z.string().default("#f59e0b"),
  plan: z.string().default("starter"),
});

// GET /api/tenants — listar todos (solo super admin)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const tenants = await prisma.tenant.findMany({
    include: {
      _count: { select: { users: true, clients: true, appointments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: tenants });
}

// POST /api/tenants — crear nuevo tenant (solo super admin)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = createTenantSchema.parse(body);

    // Verificar que el slug no exista
    const existing = await prisma.tenant.findUnique({ where: { slug: data.slug } });
    if (existing) {
      return NextResponse.json({ error: "El slug ya está en uso" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(data.adminPassword, 12);

    // Crear tenant, admin y pipeline stages en una transacción
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.name,
          slug: data.slug,
          sector: data.sector,
          primaryColor: data.primaryColor,
          accentColor: data.accentColor,
          plan: data.plan,
        },
      });

      // Crear usuario admin
      const adminUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: data.adminName,
          email: data.adminEmail,
          password: hashedPassword,
          role: "ADMIN",
        },
      });

      // Crear etapas de pipeline por defecto
      await tx.pipelineStage.createMany({
        data: PIPELINE_DEFAULT_STAGES.map((stage) => ({
          ...stage,
          tenantId: tenant.id,
        })),
      });

      // Crear disponibilidad por defecto: lun-vie activos 09:00-18:00, sáb-dom inactivos
      await tx.availabilityRule.createMany({
        data: [
          { tenantId: tenant.id, userId: null, dayOfWeek: 0, startTime: "09:00", endTime: "14:00", isActive: false },
          { tenantId: tenant.id, userId: null, dayOfWeek: 1, startTime: "09:00", endTime: "18:00", isActive: true  },
          { tenantId: tenant.id, userId: null, dayOfWeek: 2, startTime: "09:00", endTime: "18:00", isActive: true  },
          { tenantId: tenant.id, userId: null, dayOfWeek: 3, startTime: "09:00", endTime: "18:00", isActive: true  },
          { tenantId: tenant.id, userId: null, dayOfWeek: 4, startTime: "09:00", endTime: "18:00", isActive: true  },
          { tenantId: tenant.id, userId: null, dayOfWeek: 5, startTime: "09:00", endTime: "18:00", isActive: true  },
          { tenantId: tenant.id, userId: null, dayOfWeek: 6, startTime: "09:00", endTime: "14:00", isActive: false },
        ],
      });

      return { tenant, adminUser };
    });

    return NextResponse.json(
      { data: { tenant: result.tenant, adminUser: { id: result.adminUser.id, email: result.adminUser.email } } },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 });
    }
    console.error("[CREATE TENANT]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
