import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { bookingQuestionSchema } from "@/lib/booking";

const MAX_SERVICE_IMAGE_LENGTH = 1_400_000;

const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().or(z.literal("")),
  durationMin: z.number().int().min(5).max(480),
  price: z.number().min(0).default(0),
  color: z.string().default("#6366f1"),
  bookingQuestions: z.array(bookingQuestionSchema).default([]),
  imageUrl: z
    .string()
    .max(MAX_SERVICE_IMAGE_LENGTH, "La imagen es demasiado grande (máx. ~1MB)")
    .regex(/^data:image\/(png|jpeg|jpg|webp);base64,/, "Formato de imagen no soportado")
    .optional()
    .nullable(),
});

// GET /api/services — listar servicios del tenant (incluye inactivos para gestión)
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const services = await prisma.service.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: services });
}

// POST /api/services — crear servicio
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const service = await prisma.service.create({
      data: {
        tenantId: session.user.tenantId,
        name: data.name,
        description: data.description || undefined,
        durationMin: data.durationMin,
        price: data.price,
        color: data.color,
        bookingQuestions: JSON.stringify(data.bookingQuestions),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl ?? null }),
      },
    });

    return NextResponse.json({ data: service }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 });
    }
    console.error("[CREATE SERVICE]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
