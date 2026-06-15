import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const MAX_LOGO_LENGTH = 1_400_000;
const MAX_COVER_LENGTH = 2_200_000;

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
  coverImageUrl: z
    .string()
    .max(MAX_COVER_LENGTH, "La imagen de portada es demasiado grande (máx. ~1.5MB)")
    .regex(/^data:image\/(png|jpeg|jpg|svg\+xml|webp);base64,/, "Formato de imagen no soportado")
    .optional()
    .nullable(),
  whatsappNumber: z
    .string()
    .max(20)
    .regex(/^\+?[\d\s\-()+]{7,20}$/, "Número de WhatsApp inválido")
    .optional()
    .nullable(),
  contactEmail: z.string().email("Email de contacto inválido").max(255).optional().nullable(),
  website: z.string().url("URL de sitio web inválida").max(500).optional().nullable(),
});

const SELECT_FIELDS = {
  name: true,
  logoUrl: true,
  primaryColor: true,
  accentColor: true,
  customDomain: true,
  slug: true,
  coverImageUrl: true,
  whatsappNumber: true,
  contactEmail: true,
  website: true,
} as const;

// GET /api/tenant — datos de marca del tenant actual
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: SELECT_FIELDS,
  });

  if (!tenant) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({ data: tenant });
}

// PATCH /api/tenant — actualizar marca (colores, logo, nombre, dominio, portada, contacto)
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
        ...(data.name !== undefined && { name: data.name }),
        ...(data.primaryColor !== undefined && { primaryColor: data.primaryColor }),
        ...(data.accentColor !== undefined && { accentColor: data.accentColor }),
        ...(data.customDomain !== undefined && { customDomain: data.customDomain === "" ? null : data.customDomain }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl ?? null }),
        ...(data.coverImageUrl !== undefined && { coverImageUrl: data.coverImageUrl ?? null }),
        ...(data.whatsappNumber !== undefined && { whatsappNumber: data.whatsappNumber?.trim() || null }),
        ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail?.trim() || null }),
        ...(data.website !== undefined && { website: data.website?.trim() || null }),
      },
      select: SELECT_FIELDS,
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
