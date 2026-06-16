import { prisma } from "@/lib/prisma";

/**
 * Integración con Google Calendar — sin SDK, sólo fetch a la API REST.
 *
 * Una sola app OAuth a nivel de plataforma (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).
 * Cada tenant conecta su propia cuenta de Google; los tokens se guardan en
 * IntegrationCredential(provider="google", tokens=JSON).
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

// Scopes mínimos: leer freebusy + crear/borrar eventos + email de la cuenta
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
];

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date: number;       // epoch ms en que expira el access_token
  scope?: string;
  email?: string;
  calendarId?: string;       // calendario destino, default "primary"
}

export function isGoogleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/api/integrations/google/callback`;
}

/** URL de consentimiento de Google. `state` se usa para CSRF (cookie). */
export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",      // queremos refresh_token
    prompt: "consent",           // fuerza refresh_token incluso si ya autorizó antes
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

/** Intercambia el `code` del callback por tokens. */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange falló: ${res.status}`);
  const json = await res.json();
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expiry_date: Date.now() + (json.expires_in ?? 3600) * 1000,
    scope: json.scope,
  };
}

/** Renueva el access_token usando el refresh_token. */
export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expiry_date: number }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh falló: ${res.status}`);
  const json = await res.json();
  return {
    access_token: json.access_token,
    expiry_date: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
}

/** Email de la cuenta de Google autorizada. */
export async function fetchGoogleEmail(accessToken: string): Promise<string | undefined> {
  const res = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return undefined;
  const json = await res.json();
  return json.email;
}

// ─── Persistencia vía IntegrationCredential ────────────────────────

export async function getGoogleConnection(tenantId: string): Promise<GoogleTokens | null> {
  const cred = await prisma.integrationCredential.findUnique({
    where: { tenantId_provider: { tenantId, provider: "google" } },
  });
  if (!cred || !cred.isActive) return null;
  try {
    const tokens = JSON.parse(cred.tokens) as GoogleTokens;
    return tokens.refresh_token || tokens.access_token ? tokens : null;
  } catch {
    return null;
  }
}

export async function saveGoogleTokens(tenantId: string, tokens: GoogleTokens): Promise<void> {
  await prisma.integrationCredential.upsert({
    where: { tenantId_provider: { tenantId, provider: "google" } },
    create: { tenantId, provider: "google", tokens: JSON.stringify(tokens), isActive: true },
    update: { tokens: JSON.stringify(tokens), isActive: true },
  });
}

export async function disconnectGoogle(tenantId: string): Promise<void> {
  await prisma.integrationCredential.deleteMany({ where: { tenantId, provider: "google" } });
}

/**
 * Devuelve un access_token válido para el tenant, renovándolo y persistiéndolo
 * si está por expirar. Devuelve null si no hay conexión utilizable.
 */
export async function getValidAccessToken(tenantId: string): Promise<{ accessToken: string; calendarId: string } | null> {
  const conn = await getGoogleConnection(tenantId);
  if (!conn) return null;

  const calendarId = conn.calendarId || "primary";

  // Margen de 60s antes de expirar
  if (conn.access_token && conn.expiry_date && conn.expiry_date - 60_000 > Date.now()) {
    return { accessToken: conn.access_token, calendarId };
  }

  if (!conn.refresh_token) return null;
  try {
    const refreshed = await refreshAccessToken(conn.refresh_token);
    const updated: GoogleTokens = { ...conn, access_token: refreshed.access_token, expiry_date: refreshed.expiry_date };
    await saveGoogleTokens(tenantId, updated);
    return { accessToken: refreshed.access_token, calendarId };
  } catch {
    return null;
  }
}

// ─── Operaciones de calendario ─────────────────────────────────────

export interface BusyInterval { start: Date; end: Date; }

/** Intervalos ocupados del calendario del tenant entre timeMin y timeMax. */
export async function getFreeBusy(tenantId: string, timeMin: Date, timeMax: Date): Promise<BusyInterval[]> {
  const auth = await getValidAccessToken(tenantId);
  if (!auth) return [];

  const res = await fetch(`${CALENDAR_BASE}/freeBusy`, {
    method: "POST",
    headers: { Authorization: `Bearer ${auth.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: auth.calendarId }],
    }),
  });
  if (!res.ok) return [];
  const json = await res.json();
  const busy = json.calendars?.[auth.calendarId]?.busy ?? [];
  return busy.map((b: { start: string; end: string }) => ({ start: new Date(b.start), end: new Date(b.end) }));
}

export interface CalendarEventInput {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  attendeeEmail?: string;
}

/** Crea un evento; devuelve el id del evento de Google o null si falla. */
export async function createCalendarEvent(tenantId: string, ev: CalendarEventInput): Promise<string | null> {
  const auth = await getValidAccessToken(tenantId);
  if (!auth) return null;

  const res = await fetch(`${CALENDAR_BASE}/calendars/${encodeURIComponent(auth.calendarId)}/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${auth.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: ev.summary,
      description: ev.description,
      start: { dateTime: ev.start.toISOString() },
      end: { dateTime: ev.end.toISOString() },
      ...(ev.attendeeEmail ? { attendees: [{ email: ev.attendeeEmail }] } : {}),
    }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.id ?? null;
}

/** Actualiza el horario de un evento existente. */
export async function updateCalendarEvent(tenantId: string, eventId: string, start: Date, end: Date): Promise<boolean> {
  const auth = await getValidAccessToken(tenantId);
  if (!auth) return false;

  const res = await fetch(`${CALENDAR_BASE}/calendars/${encodeURIComponent(auth.calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${auth.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ start: { dateTime: start.toISOString() }, end: { dateTime: end.toISOString() } }),
  });
  return res.ok;
}

/** Borra un evento (best-effort). */
export async function deleteCalendarEvent(tenantId: string, eventId: string): Promise<boolean> {
  const auth = await getValidAccessToken(tenantId);
  if (!auth) return false;

  const res = await fetch(`${CALENDAR_BASE}/calendars/${encodeURIComponent(auth.calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${auth.accessToken}` },
  });
  return res.ok || res.status === 410; // 410 = ya borrado
}
