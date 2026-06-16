import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAuthUrl, isGoogleConfigured } from "@/lib/google-calendar";

const SETTINGS = "/settings";

// GET /api/integrations/google/connect — inicia el flujo OAuth
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.redirect(new URL(`${SETTINGS}?google=forbidden`, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  }
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(new URL(`${SETTINGS}?google=not_configured`, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  }

  // state aleatorio para CSRF (se valida contra cookie en el callback)
  const state = crypto.randomUUID();
  const res = NextResponse.redirect(getAuthUrl(state));
  res.cookies.set("g_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
