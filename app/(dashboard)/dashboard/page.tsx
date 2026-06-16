import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Clock, TrendingUp, AlertCircle, Briefcase, AlarmClock } from "lucide-react";
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

      {/* Servicios y Horarios — acceso rápido */}
      <div>
        <h2 className="text-white text-sm font-semibold mb-3 text-slate-300">Mi negocio</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Servicios */}
          <Card className={`border-slate-700 ${serviceCount === 0 ? "bg-amber-500/5 border-amber-500/20" : "bg-slate-800/50"}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
                    <Briefcase className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">Servicios</p>
                    <p className="text-slate-400 text-xs">
                      {serviceCount === 0 ? "Sin servicios aún" : `${serviceCount} ${serviceCount === 1 ? "servicio" : "servicios"}`}
                    </p>
                  </div>
                </div>
                {serviceCount === 0 && (
                  <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full shrink-0">Pendiente</span>
                )}
              </div>
              <p className="text-slate-400 text-xs mb-4 leading-relaxed">
                {serviceCount === 0
                  ? "Agrega los servicios que ofrecés: nombre, precio, duración e imagen."
                  : "Gestiona tus servicios, precios, duraciones e imágenes."}
              </p>
              <Link href="/settings#servicios">
                <Button size="sm" variant={serviceCount === 0 ? "default" : "outline"}
                  className={serviceCount === 0
                    ? "w-full bg-purple-600 hover:bg-purple-500 text-white text-xs"
                    : "w-full border-slate-600 text-slate-300 hover:bg-slate-700 text-xs"}>
                  {serviceCount === 0 ? "+ Agregar primer servicio" : "Gestionar servicios"}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Horarios */}
          <Card className={`border-slate-700 ${availabilityCount === 0 ? "bg-amber-500/5 border-amber-500/20" : "bg-slate-800/50"}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-yellow-500/10 rounded-lg shrink-0">
                    <AlarmClock className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">Horarios</p>
                    <p className="text-slate-400 text-xs">
                      {availabilityCount === 0 ? "Sin días activos" : `${availabilityCount} ${availabilityCount === 1 ? "día activo" : "días activos"}`}
                    </p>
                  </div>
                </div>
                {availabilityCount === 0 && (
                  <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full shrink-0">Pendiente</span>
                )}
              </div>
              <p className="text-slate-400 text-xs mb-4 leading-relaxed">
                {availabilityCount === 0
                  ? "Define los días y horarios en que atendés para que el calendario funcione."
                  : "Ajusta los días y horarios en que tus clientes pueden agendar citas."}
              </p>
              <Link href="/settings#horarios">
                <Button size="sm" variant={availabilityCount === 0 ? "default" : "outline"}
                  className={availabilityCount === 0
                    ? "w-full bg-purple-600 hover:bg-purple-500 text-white text-xs"
                    : "w-full border-slate-600 text-slate-300 hover:bg-slate-700 text-xs"}>
                  {availabilityCount === 0 ? "Configurar horarios" : "Editar horarios"}
                </Button>
              </Link>
            </CardContent>
          </Card>

        </div>
      </div>

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
