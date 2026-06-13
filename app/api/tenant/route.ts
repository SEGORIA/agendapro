import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
// ~1MB de imagen en base64 (data URL)
const MAX_LOGO_LENGTH = 1_400_000;

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  primaryColor: z.string().regex(HEX_COLOR, "Color inválido").optional(),
  accentColor: z.string().regex(HEX_COLOR, "Color inválido").optional(),
  customDomain: z.string().max(255).optional().nullable(),
  logoUrl: z
    .string()
    .max(MAX_LOGO_LENGTH, "El logo es demasiado grande (máx. 1MB)")
    .regex(/^data:image\/(png|jpeg|jpg|svg\+xml|webp);base64,/, "Formato de imagen no soportado")
    .optional()
    .nullable(),
});

// GET /api/tenant — datos de marca del tenant actual
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: {
      name: true,
      logoUrl: true,
      primaryColor: true,
      accentColor: true,
      customDomain: true,
      slug: true,
    },
  });

  if (!tenant) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({ data: tenant });
}

// PATCH /api/tenant — actualizar marca (colores, logo, nombre, dominio)
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "No tienes permisos para esta acción" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    if (data.customDomain !== undefined && data.customDomain) {
      const existing = await prisma.tenant.findFirst({
        where: { customDomain: data.customDomain, NOT: { id: session.user.tenantId } },
      });
      if (existing) {
        return NextResponse.json({ error: "Ese dominio ya está en uso" }, { status: 409 });
      }
    }

    const tenant = await prisma.tenant.update({
      where: { id: session.user.tenantId },
      data: {
        ...data,
        customDomain: data.customDomain === "" ? null : data.customDomain,
      },
      select: {
        name: true,
        logoUrl: true,
        primaryColor: true,
        accentColor: true,
        customDomain: true,
        slug: true,
      },
    });

    return NextResponse.json({ data: tenant });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
    }
    console.error("[UPDATE TENANT BRANDING]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
