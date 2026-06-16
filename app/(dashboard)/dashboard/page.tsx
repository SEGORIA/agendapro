import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Clock, TrendingUp, AlertCircle, Briefcase, AlarmClock, ArrowRight } from "lucide-react";
import { formatDate, APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";

export default async function DashboardPage() {
  const session = await auth();

  // Superadmin sin impersonación → panel global
  if (session?.user.role === "SUPER_ADMIN" && !session.user.impersonating) {
    redirect("/admin");
  }

  const tenantId = session!.user.tenantId;
  const now = new Date();

  // Estadísticas en paralelo
  const [
    todayAppointments,
    pendingAppointments,
    totalClients,
    monthAppointments,
    upcomingAppointments,
    serviceCount,
    availabilityCount,
  ] = await Promise.all([
    prisma.appointment.count({
      where: {
        tenantId,
        startsAt: { gte: startOfDay(now), lte: endOfDay(now) },
        status: { notIn: ["CANCELLED"] },
      },
    }),
    prisma.appointment.count({
      where: { tenantId, status: "PENDING" },
    }),
    prisma.client.count({ where: { tenantId } }),
    prisma.appointment.count({
      where: {
        tenantId,
        startsAt: { gte: startOfMonth(now), lte: endOfMonth(now) },
        status: { notIn: ["CANCELLED"] },
      },
    }),
    prisma.appointment.findMany({
      where: {
        tenantId,
        startsAt: { gte: now },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      include: { client: true, service: true, staff: true },
      orderBy: { startsAt: "asc" },
      take: 8,
    }),
    prisma.service.count({ where: { tenantId } }),
    prisma.availabilityRule.count({ where: { tenantId, userId: null, isActive: true } }),
  ]);

  const stats = [
    { label: "Citas hoy", value: todayAppointments, icon: Calendar, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Pendientes", value: pendingAppointments, icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { label: "Total clientes", value: totalClients, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Citas del mes", value: monthAppointments, icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            {now.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link href="/appointments/new">
          <Button className="bg-purple-600 hover:bg-purple-500">
            <Calendar className="w-4 h-4" />
            Nueva cita
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Banner de setup incompleto */}
      {(serviceCount === 0 || availabilityCount === 0) && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-amber-300 font-semibold text-sm">Tu cuenta necesita configuración para recibir reservas</p>
                <p className="text-amber-400/70 text-xs mt-1">
                  Los clientes no podrán agendar hasta que completes estos pasos:
                </p>
                <div className="mt-3 space-y-2">
                  {serviceCount === 0 && (
                    <Link href="/settings" className="flex items-center gap-3 group">
                      <div className="w-6 h-6 rounded-full border border-amber-500/40 flex items-center justify-center shrink-0">
                        <Briefcase className="w-3 h-3 text-amber-400" />
                      </div>
                      <span className="text-amber-300 text-sm group-hover:text-amber-200 transition-colors">
                        Agregar servicios — ¿qué ofrecés?
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  )}
                  {availabilityCount === 0 && (
                    <Link href="/settings" className="flex items-center gap-3 group">
                      <div className="w-6 h-6 rounded-full border border-amber-500/40 flex items-center justify-center shrink-0">
                        <AlarmClock className="w-3 h-3 text-amber-400" />
                      </div>
                      <span className="text-amber-300 text-sm group-hover:text-amber-200 transition-colors">
                        Definir horarios de atención — ¿cuándo estás disponible?
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  )}
                </div>
                <Link href="/settings" className="mt-4 inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors">
                  Ir a Configuración <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Próximas citas */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-white text-base">Próximas citas</CardTitle>
          <Link href="/appointments">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              Ver todas
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-10">
              <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No hay citas próximas</p>
              <Link href="/appointments/new" className="mt-3 inline-block">
                <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                  Crear primera cita
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((apt) => (
                <Link
                  key={apt.id}
                  href={`/appointments/${apt.id}`}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-700/50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-medium truncate">{apt.client.name}</p>
                      <Badge className={`text-xs ${APPOINTMENT_STATUS_COLORS[apt.status]}`}>
                        {APPOINTMENT_STATUS_LABELS[apt.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {apt.service && (
                        <span className="text-slate-400 text-xs">{apt.service.name}</span>
                      )}
                      {apt.staff && (
                        <span className="text-slate-500 text-xs">· {apt.staff.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-purple-400 text-sm font-medium">{formatDate(apt.startsAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
