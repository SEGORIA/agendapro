import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/notifications — últimas notificaciones del tenant + conteo de no leídas
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({
      where: { tenantId: session.user.tenantId, isRead: false },
    }),
  ]);

  return NextResponse.json({ data: notifications, unreadCount });
}

// PATCH /api/notifications — marcar todas como leídas
export async function PATCH() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await prisma.notification.updateMany({
    where: { tenantId: session.user.tenantId, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ message: "Notificaciones marcadas como leídas" });
}
