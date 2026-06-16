import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  exchangeCodeForTokens, fetchGoogleEmail, getGoogleConnection, saveGoogleTokens,
} from "@/lib/google-calendar";

const APP = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const back = (status: string) => NextResponse.redirect(new URL(`/settings?google=${status}`, APP));

// GET /api/integrations/google/callback — recibe el code de Google
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/login", APP));

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code) return back("error");

  // CSRF: el state debe coincidir con la cookie sembrada en /connect
  const cookieState = req.cookies.get("g_oauth_state")?.value;
  if (!cookieState || cookieState !== state) return back("error");

  try {
    const tokens = await exchangeCodeForTokens(code);

    // Si Google no devolvió refresh_token (re-autorización), conservar el previo
    if (!tokens.refresh_token) {
      const existing = await getGoogleConnection(session.user.tenantId);
      if (existing?.refresh_token) tokens.refresh_token = existing.refresh_token;
    }

    tokens.email = await fetchGoogleEmail(tokens.access_token);
    tokens.calendarId = "primary";

    await saveGoogleTokens(session.user.tenantId, tokens);

    const res = back("connected");
    res.cookies.delete("g_oauth_state");
    return res;
  } catch {
    return back("error");
  }
}
