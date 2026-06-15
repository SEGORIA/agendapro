import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const updateUserSchema = z.object({
  role: z.enum(["ADMIN", "STAFF"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

async function requireSuperAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return null;
  }
  return session;
}

// PATCH /api/tenants/[id]/users/[userId] — actualizar usuario de un tenant (solo super admin)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id, userId } = await params;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.tenantId !== id) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }
  if (target.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Este usuario no se puede editar desde aquí" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const data = updateUserSchema.parse(body);

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.role !== undefined && { role: data.role }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.password !== undefined && { password: await bcrypt.hash(data.password, 12) }),
      },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    return NextResponse.json({ data: user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 });
    }
    console.error("[UPDATE TENANT USER]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
