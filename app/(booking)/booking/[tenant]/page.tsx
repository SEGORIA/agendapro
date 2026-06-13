import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { BookingWidget } from "@/components/booking/booking-widget";
import { parseBookingQuestions } from "@/lib/booking";

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
  }));

  return (
    <div
      className="min-h-screen flex flex-col px-4 py-8 md:py-14"
      style={{
        background: `linear-gradient(160deg, ${tenant.primaryColor}0d 0%, #f1f5f9 35%, #f8fafc 100%)`,
      }}
    >
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
        />
      </main>

      <footer className="text-center mt-8">
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
          Powered by <strong className="text-slate-500">AgendaPro</strong>
        </span>
      </footer>
    </div>
  );
}
