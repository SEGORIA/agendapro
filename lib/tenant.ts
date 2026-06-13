import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

/**
 * Extrae el slug del tenant desde el hostname:
 *   clinica.agendapro.com  → "clinica"
 *   localhost:3000          → null (super-admin / landing)
 */
export function getTenantSlugFromHost(host: string): string | null {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

  // Dominio exacto = raíz (landing / super-admin)
  if (host === rootDomain || host === `www.${rootDomain}`) return null;

  // Subdominio: slug.rootDomain
  if (host.endsWith(`.${rootDomain}`)) {
    return host.replace(`.${rootDomain}`, "");
  }

  return null;
}

/**
 * Obtiene el tenant completo desde la base de datos por slug o dominio custom.
 */
export async function getTenantByHost(host: string) {
  const slug = getTenantSlugFromHost(host);

  if (slug) {
    return prisma.tenant.findUnique({
      where: { slug, isActive: true },
    });
  }

  // Intentar por dominio personalizado
  return prisma.tenant.findUnique({
    where: { customDomain: host, isActive: true },
  });
}

/**
 * Helper para server components: obtiene el tenant desde el request actual.
 */
export async function getCurrentTenant() {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  return getTenantByHost(host);
}

/**
 * Genera la URL de booking público de un tenant.
 */
export function getTenantBookingUrl(slug: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  return `${protocol}://${slug}.${rootDomain}/booking`;
}
