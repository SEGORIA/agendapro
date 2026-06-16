import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS, formatDate } from "@/lib/utils";
import { Calendar, Plus, Video } from "lucide-react";
import Link from "next/link";
import { AppointmentsView } from "./appointments-view";

export default async function AppointmentsPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId;

  const appointments = await prisma.appointment.findMany({
    where: { tenantId },
    include: { client: true, service: true, staff: true },
    orderBy: { startsAt: "desc" },
    take: 50,
  });

  const statusGroups = {
    PENDING: appointments.filter((a) => a.status === "PENDING"),
    CONFIRMED: appointments.filter((a) => a.status === "CONFIRMED"),
    COMPLETED: appointments.filter((a) => a.status === "COMPLETED"),
    CANCELLED: appointments.filter((a) => a.status === "CANCELLED"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Citas</h1>
          <p className="text-slate-400 text-sm mt-1">{appointments.length} citas registradas</p>
        </div>
        <Link href="/appointments/new">
          <Button className="bg-purple-600 hover:bg-purple-500">
            <Plus className="w-4 h-4" />
            Nueva cita
          </Button>
        </Link>
      </div>

      <AppointmentsView
        listContent={
          <>
      {/* Resumen por estado */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(statusGroups).map(([status, items]) => (
          <div key={status} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs uppercase tracking-wide">{APPOINTMENT_STATUS_LABELS[status]}</p>
            <p className="text-2xl font-bold text-white mt-1">{items.length}</p>
          </div>
        ))}
      </div>

      {/* Lista de citas */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-400" />
            Todas las citas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">Sin citas aún</p>
              <p className="text-slate-500 text-sm mt-1">Las citas aparecerán aquí cuando se agenden</p>
              <Link href="/appointments/new" className="mt-4 inline-block">
                <Button className="bg-purple-600 hover:bg-purple-500">
                  <Plus className="w-4 h-4" /> Crear cita manual
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {appointments.map((apt) => (
                <Link
                  key={apt.id}
                  href={`/appointments/${apt.id}`}
                  className="flex items-center gap-4 py-4 hover:bg-slate-700/30 px-3 rounded-lg transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium text-sm">{apt.client.name}</span>
                      <Badge className={`text-xs ${APPOINTMENT_STATUS_COLORS[apt.status]}`}>
                        {APPOINTMENT_STATUS_LABELS[apt.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {apt.service && (
                        <span className="text-slate-400 text-xs">{apt.service.name} · {apt.service.durationMin} min</span>
                      )}
                      {apt.staff && (
                        <span className="text-slate-500 text-xs">· {apt.staff.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-3">
                    {apt.meetingUrl && (
                      <a
                        href={apt.meetingUrl}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-400 hover:text-blue-300"
                        title="Unirse a la reunión"
                      >
                        <Video className="w-4 h-4" />
                      </a>
                    )}
                    <div>
                      <p className="text-purple-400 text-sm font-medium">{formatDate(apt.startsAt)}</p>
                      {apt.client.email && (
                        <p className="text-slate-500 text-xs">{apt.client.email}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
          </>
        }
      />
    </div>
  );
}
