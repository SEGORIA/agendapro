import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Palette, Link2, Copy } from "lucide-react";
import { SECTOR_LABELS } from "@/lib/utils";
import { parseBookingQuestions } from "@/lib/booking";
import { getTenantBookingUrl } from "@/lib/tenant";
import { ServicesManager } from "./services-manager";
import { BrandingForm } from "./branding-form";

export default async function SettingsPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      services: { orderBy: { createdAt: "asc" } },
      _count: { select: { users: true } },
    },
  });

  if (!tenant) return null;

  const services = tenant.services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    durationMin: s.durationMin,
    price: s.price,
    color: s.color,
    isActive: s.isActive,
    questions: parseBookingQuestions(s.bookingQuestions),
  }));

  const bookingUrl = getTenantBookingUrl(tenant.slug);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-slate-400 text-sm mt-1">Personaliza tu espacio de trabajo</p>
      </div>

      {/* Link de reservas */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Link2 className="w-4 h-4 text-green-400" />
            Tu link de reservas
          </CardTitle>
          <CardDescription>Comparte este link con tus clientes para que puedan agendar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-300 text-sm font-mono truncate">
              {bookingUrl}
            </div>
            <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 shrink-0">
              <Copy className="w-3.5 h-3.5" /> Copiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Palette className="w-4 h-4 text-purple-400" />
            Marca y apariencia
          </CardTitle>
          <CardDescription>
            Sector: {SECTOR_LABELS[tenant.sector] || tenant.sector} · Personaliza el logo y los colores que verán tus clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BrandingForm
            tenant={{
              name: tenant.name,
              logoUrl: tenant.logoUrl,
              primaryColor: tenant.primaryColor,
              accentColor: tenant.accentColor,
              customDomain: tenant.customDomain,
            }}
          />
        </CardContent>
      </Card>

      {/* Servicios */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-400" />
            Servicios ofrecidos
          </CardTitle>
          <CardDescription>
            Los servicios que tus clientes pueden reservar. Agrega preguntas personalizadas para calificar a cada cliente al agendar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ServicesManager services={services} />
        </CardContent>
      </Card>
    </div>
  );
}
