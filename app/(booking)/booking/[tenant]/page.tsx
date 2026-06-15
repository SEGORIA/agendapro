import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { BookingWidget } from "@/components/booking/booking-widget";
import { parseBookingQuestions } from "@/lib/booking";
import { MessageCircle, Mail, Globe } from "lucide-react";

interface BookingPageProps {
  params: Promise<{ tenant: string }>;
}

export async function generateMetadata({ params }: BookingPageProps) {
  const { tenant: slug } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug, isActive: true },
  });
  if (!tenant) return { title: "Página no encontrada" };
  return {
    title: `Agendar cita · ${tenant.name}`,
    description: `Agenda tu cita con ${tenant.name}`,
  };
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { tenant: slug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug, isActive: true },
    include: {
      services: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
      users: {
        where: { role: { in: ["ADMIN", "STAFF"] }, isActive: true },
        select: { id: true, name: true, avatarUrl: true },
      },
      availabilityRules: { where: { isActive: true }, select: { dayOfWeek: true } },
    },
  });

  if (!tenant) notFound();

  const availableWeekdays = [...new Set(tenant.availabilityRules.map((r) => r.dayOfWeek))];

  const services = tenant.services.map((s) => ({
    id: s.id,
    name: s.name,
    durationMin: s.durationMin,
    price: s.price,
    color: s.color,
    description: s.description,
    questions: parseBookingQuestions(s.bookingQuestions),
    imageUrl: s.imageUrl,
  }));

  const contactInfo = {
    whatsappNumber: tenant.whatsappNumber,
    contactEmail: tenant.contactEmail,
    website: tenant.website,
  };

  const hasContact = !!(tenant.whatsappNumber || tenant.contactEmail || tenant.website);

  return (
    <div
      className="min-h-screen flex flex-col px-4 py-8 md:py-14"
      style={{
        background: `linear-gradient(160deg, ${tenant.primaryColor}0d 0%, #f1f5f9 35%, #f8fafc 100%)`,
      }}
    >
      {tenant.coverImageUrl && (
        <div className="w-full max-w-4xl mx-auto mb-6 rounded-2xl overflow-hidden shadow-lg" style={{ maxHeight: "220px" }}>
          <img src={tenant.coverImageUrl} alt={tenant.name} className="w-full h-full object-cover" />
        </div>
      )}

      <main className="flex-1 w-full">
        <BookingWidget
          tenant={{
            id: tenant.id,
            name: tenant.name,
            logoUrl: tenant.logoUrl,
            primaryColor: tenant.primaryColor,
            accentColor: tenant.accentColor,
          }}
          services={services}
          staff={tenant.users}
          availableWeekdays={availableWeekdays}
          contactInfo={contactInfo}
        />
      </main>

      <footer className="text-center mt-8 space-y-3">
        {hasContact && (
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500">
            <span className="text-slate-400 font-medium">Contáctanos:</span>
            {tenant.whatsappNumber && (
              <a
                href={`https://wa.me/${tenant.whatsappNumber.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 hover:text-green-600 transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            )}
            {tenant.contactEmail && (
              <a href={`mailto:${tenant.contactEmail}`} className="hover:text-blue-600 transition-colors flex items-center gap-1.5">
                <Mail className="w-4 h-4" /> {tenant.contactEmail}
              </a>
            )}
            {tenant.website && (
              <a href={tenant.website} target="_blank" rel="noreferrer" className="hover:text-purple-600 transition-colors flex items-center gap-1.5">
                <Globe className="w-4 h-4" /> Sitio web
              </a>
            )}
          </div>
        )}
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
          Powered by <strong className="text-slate-500">AgendaPro</strong>
        </span>
      </footer>
    </div>
  );
}
