import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { disconnectGoogle, getGoogleConnection } from "@/lib/google-calendar";

// POST /api/integrations/google/disconnect — revoca y elimina la conexión
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  // Best-effort: revocar el token en Google antes de borrarlo localmente
  const conn = await getGoogleConnection(session.user.tenantId);
  const token = conn?.refresh_token || conn?.access_token;
  if (token) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST" });
    } catch {
      // ignorar fallo de revocación
    }
  }

  await disconnectGoogle(session.user.tenantId);
  return NextResponse.json({ ok: true });
}
