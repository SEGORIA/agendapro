import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") || "";
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

  // Detectar si es un subdominio (tenant)
  const isSubdomain =
    host !== rootDomain &&
    host !== `www.${rootDomain}` &&
    host.endsWith(`.${rootDomain}`);

  const tenantSlug = isSubdomain ? host.replace(`.${rootDomain}`, "") : null;

  // ─── Super-admin solo desde el dominio raíz ───
  if (pathname.startsWith("/admin")) {
    if (isSubdomain) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (!req.auth) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (req.auth.user.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // ─── Rutas del dashboard requieren auth ───
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/appointments") ||
      pathname.startsWith("/clients") || pathname.startsWith("/settings") ||
      pathname.startsWith("/automations")) {
    if (!req.auth) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ─── Redirigir usuarios autenticados fuera del login ───
  if (pathname === "/login" || pathname === "/register") {
    if (req.auth) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Añadir tenant info a los headers para server components
  const requestHeaders = new Headers(req.headers);
  if (tenantSlug) {
    requestHeaders.set("x-tenant-slug", tenantSlug);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
