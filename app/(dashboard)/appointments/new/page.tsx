import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewAppointmentForm } from "./new-appointment-form";

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const session = await auth();
  const tenantId = session!.user.tenantId;

  const [services, staff, clients, preselectedClient] = await Promise.all([
    prisma.service.findMany({ where: { tenantId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { tenantId, isActive: true }, select: { id: true, name: true } }),
    prisma.client.findMany({ where: { tenantId }, select: { id: true, name: true, email: true, phone: true }, orderBy: { name: "asc" }, take: 200 }),
    clientId
      ? prisma.client.findUnique({ where: { id: clientId, tenantId }, select: { id: true, name: true, email: true, phone: true } })
      : Promise.resolve(null),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Nueva cita</h1>
        <p className="text-slate-400 text-sm mt-1">Agenda una cita manualmente para un cliente</p>
      </div>

      <NewAppointmentForm
        tenantId={tenantId}
        services={services.map((s) => ({ id: s.id, name: s.name, durationMin: s.durationMin, price: s.price, currency: s.currency }))}
        staff={staff}
        clients={clients}
        preselectedClient={preselectedClient}
      />
    </div>
  );
}
