import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Users, Calendar, Plus, AlertTriangle,
  TrendingUp, Clock, ExternalLink, Activity
} from "lucide-react";
import Link from "next/link";
import { TenantList } from "./tenant-list";
import { ImpersonateButton } from "./impersonate-button";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, format } from "date-fns";
import { es } from "date-fns/locale";
import { SECTOR_LABELS } from "@/lib/utils";

export default async function SuperAdminPage() {
  const session = await auth();

  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const now = new Date();

  const [tenants, todayByTenant, monthByTenant, recentAppointments] = await Promise.all([
    prisma.tenant.findMany({
      include: {
        _count: { select: { users: true, clients: true, appointments: true, services: true, availabilityRules: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.appointment.groupBy({
      by: ["tenantId"],
      where: {
        startsAt: { gte: startOfDay(now), lte: endOfDay(now) },
        status: { notIn: ["CANCELLED"] },
      },
      _count: true,
    }),
    prisma.appointment.groupBy({
      by: ["tenantId"],
      where: {
        startsAt: { gte: startOfMonth(now), lte: endOfMonth(now) },
        status: { notIn: ["CANCELLED"] },
      },
      _count: true,
    }),
    prisma.appointment.findMany({
      where: { startsAt: { gte: startOfDay(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) } },
      include: {
        client: { select: { name: true } },
        service: { select: { name: true } },
        tenant: { select: { name: true, primaryColor: true, slug: true } },
      },
      orderBy: { startsAt: "desc" },
      take: 12,
    }),
  ]);

  const todayMap = new Map(todayByTenant.map((r) => [r.tenantId, r._count]));
  const monthMap = new Map(monthByTenant.map((r) => [r.tenantId, r._count]));

  // Exclude the root platform tenant from client analytics
  const clientTenants = tenants.filter((t) => t.slug !== "root");

  const totalStats = {
    tenants: clientTenants.filter((t) => t.isActive).length,
    users: tenants.reduce((acc, t) => acc + t._count.users, 0),
    clients: clientTenants.reduce((acc, t) => acc + t._count.clients, 0),
    appointments: clientTenants.reduce((acc, t) => acc + t._count.appointments, 0),
    todayTotal: clientTenants.reduce((acc, t) => acc + (todayMap.get(t.id) ?? 0), 0),
    monthTotal: clientTenants.reduce((acc, t) => acc + (monthMap.get(t.id) ?? 0), 0),
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Panel de control</h1>
          <p className="text-slate-400 text-sm capitalize">
            {format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
        <Link href="/admin/tenants/new">
          <Button className="bg-purple-600 hover:bg-purple-500">
            <Plus className="w-4 h-4" /> Nuevo cliente
          </Button>
        </Link>
      </div>

      <div className="p-8 space-y-8">
        {/* KPIs globales */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {[
            { label: "Clientes activos", value: totalStats.tenants, icon: Building2, color: "text-purple-400", bg: "bg-purple-500/10" },
            { label: "Total usuarios", value: totalStats.users, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Total clientes", value: totalStats.clients, icon: Users, color: "text-green-400", bg: "bg-green-500/10" },
            { label: "Citas hoy", value: totalStats.todayTotal, icon: Calendar, color: "text-yellow-400", bg: "bg-yellow-500/10" },
            { label: "Citas este mes", value: totalStats.monthTotal, icon: TrendingUp, color: "text-orange-400", bg: "bg-orange-500/10" },
            { label: "Citas totales", value: totalStats.appointments, icon: Activity, color: "text-cyan-400", bg: "bg-cyan-500/10" },
          ].map((stat) => (
            <Card key={stat.label} className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-slate-400 text-xs leading-tight">{stat.label}</p>
                    <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${stat.bg} shrink-0`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Analíticas por cliente */}
        <div>
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-400" />
            Analíticas por cliente
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {clientTenants.map((tenant) => {
              const todayCount = todayMap.get(tenant.id) ?? 0;
              const monthCount = monthMap.get(tenant.id) ?? 0;
              const isIncomplete = tenant.isActive && (tenant._count.services === 0 || tenant._count.availabilityRules === 0);

              return (
                <Card key={tenant.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
                  <CardContent className="p-5">
                    {/* Tenant header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                          style={{ backgroundColor: tenant.primaryColor }}
                        >
                          {tenant.name[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-semibold text-sm truncate">{tenant.name}</p>
                          <p className="text-slate-500 text-xs">{SECTOR_LABELS[tenant.sector] || tenant.sector}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant={tenant.isActive ? "success" : "secondary"} className="text-xs">
                          {tenant.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-slate-900/50 rounded-lg p-2.5 text-center">
                        <p className="text-xl font-bold text-white">{todayCount}</p>
                        <p className="text-slate-500 text-xs mt-0.5">Hoy</p>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-2.5 text-center">
                        <p className="text-xl font-bold text-white">{monthCount}</p>
                        <p className="text-slate-500 text-xs mt-0.5">Este mes</p>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-2.5 text-center">
                        <p className="text-xl font-bold text-white">{tenant._count.clients}</p>
                        <p className="text-slate-500 text-xs mt-0.5">Clientes</p>
                      </div>
                    </div>

                    {/* Meta: servicios, usuarios */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                      <span>{tenant._count.services} servicios</span>
                      <span>·</span>
                      <span>{tenant._count.users} usuarios</span>
                      <span>·</span>
                      <span>{tenant._count.appointments} citas total</span>
                    </div>

                    {/* Setup incompleto */}
                    {isIncomplete && (
                      <div className="flex items-center gap-1.5 mb-4 text-yellow-400 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {[
                            tenant._count.services === 0 && "Sin servicios",
                            tenant._count.availabilityRules === 0 && "Sin horario",
                          ].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <ImpersonateButton tenantId={tenant.id} />
                      <Link href={`/admin/tenants/${tenant.id}`} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full border-slate-600 text-slate-300 text-xs hover:bg-slate-700">
                          Gestionar
                        </Button>
                      </Link>
                      <a href={`/booking/${tenant.slug}`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white px-2">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Actividad reciente global */}
        {recentAppointments.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-400" />
                Actividad reciente (últimos 7 días)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentAppointments.map((apt) => (
                  <div key={apt.id} className="flex items-center gap-4 py-2 border-b border-slate-700/50 last:border-0">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: apt.tenant.primaryColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium truncate">{apt.client.name}</span>
                        <span className="text-slate-500 text-xs">·</span>
                        <span className="text-slate-400 text-xs truncate">{apt.service?.name}</span>
                      </div>
                      <span className="text-slate-500 text-xs">{apt.tenant.name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-slate-300 text-xs">
                        {format(new Date(apt.startsAt), "d MMM · HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gestión de clientes (búsqueda + toggle rápido) */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Gestión de clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TenantList tenants={tenants} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
