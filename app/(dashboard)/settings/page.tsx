import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings, Palette, Link2, Clock, CalendarClock } from "lucide-react";
import { SECTOR_LABELS } from "@/lib/utils";
import { parseBookingQuestions } from "@/lib/booking";
import { getTenantBookingUrl } from "@/lib/tenant";
import { getGoogleConnection, isGoogleConfigured } from "@/lib/google-calendar";
import { ServicesManager } from "./services-manager";
import { BrandingForm } from "./branding-form";
import { CopyLinkButton } from "./copy-link-button";
import { AvailabilityManager } from "./availability-manager";
import { GoogleCalendarCard } from "./google-calendar-card";

export default async function SettingsPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      services: { orderBy: { createdAt: "asc" } },
      availabilityRules: {
        where: { userId: null },
        select: { dayOfWeek: true, startTime: true, endTime: true, isActive: true },
        orderBy: { dayOfWeek: "asc" },
      },
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
    imageUrl: s.imageUrl,
  }));

  const byDay = new Map(tenant.availabilityRules.map((r) => [r.dayOfWeek, r]));
  const availabilityRules = Array.from({ length: 7 }, (_, day) => {
    const rule = byDay.get(day);
    return {
      dayOfWeek: day,
      startTime: rule?.startTime ?? "09:00",
      endTime: rule?.endTime ?? "18:00",
      isActive: rule?.isActive ?? false,
    };
  });

  const bookingUrl = getTenantBookingUrl(tenant.slug);

  const googleConn = await getGoogleConnection(tenantId);
  const googleConfigured = isGoogleConfigured();

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
            <CopyLinkButton url={bookingUrl} />
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
            Sector: {SECTOR_LABELS[tenant.sector] || tenant.sector} · Personaliza el logo, portada, colores e información de contacto
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
              coverImageUrl: tenant.coverImageUrl,
              whatsappNumber: tenant.whatsappNumber,
              contactEmail: tenant.contactEmail,
              website: tenant.website,
            }}
          />
        </CardContent>
      </Card>

      {/* Horario de atención */}
      <Card id="horarios" className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            Horario de atención
          </CardTitle>
          <CardDescription>
            Configura los días y horarios en que tus clientes pueden agendar citas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvailabilityManager initialRules={availabilityRules} />
        </CardContent>
      </Card>

      {/* Google Calendar */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-blue-400" />
            Google Calendar
          </CardTitle>
          <CardDescription>
            Conecta tu calendario para bloquear automáticamente los horarios que ya tienes ocupados y crear un evento por cada cita
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <GoogleCalendarCard
              connected={!!googleConn}
              email={googleConn?.email}
              configured={googleConfigured}
            />
          </Suspense>
        </CardContent>
      </Card>

      {/* Servicios */}
      <Card id="servicios" className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-400" />
            Servicios ofrecidos
          </CardTitle>
          <CardDescription>
            Los servicios que tus clientes pueden reservar. Agrega imágenes y preguntas personalizadas para calificar a cada cliente al agendar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ServicesManager services={services} />
        </CardContent>
      </Card>
    </div>
  );
}
