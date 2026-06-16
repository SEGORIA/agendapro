import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Calendar, Briefcase, UserCog, ExternalLink, AlertTriangle, Link2, Globe, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { getTenantBookingUrl, getTenantDashboardUrl } from "@/lib/tenant";
import { TenantEditForm } from "./tenant-edit-form";
import { TenantUsersManager } from "./tenant-users-manager";
import { DangerZone } from "./danger-zone";
import { ImpersonateButton } from "../../impersonate-button";
import { CopyButton } from "./copy-button";

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      users: {
        select: { id: true, name: true, email: true, role: true, isActive: true },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { clients: true, appointments: true, services: true, availabilityRules: true } },
    },
  });

  if (!tenant) notFound();

  const bookingUrl = getTenantBookingUrl(tenant.slug);
  const dashboardUrl = getTenantDashboardUrl(tenant.slug);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ backgroundColor: tenant.primaryColor }}
          >
            {tenant.name[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{tenant.name}</h1>
              <Badge variant={tenant.isActive ? "success" : "secondary"}>
                {tenant.isActive ? "Activo" : "Inactivo"}
              </Badge>
              <Badge variant="outline" className="text-slate-400 border-slate-600">
                {tenant.plan}
              </Badge>
            </div>
            <p className="text-slate-400 text-sm font-mono">/booking/{tenant.slug}</p>
          </div>
          <a href={bookingUrl} target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
              <ExternalLink className="w-3.5 h-3.5" /> Ver booking
            </Button>
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Usuarios", value: tenant.users.length, icon: UserCog, color: "text-blue-400" },
            { label: "Clientes", value: tenant._count.clients, icon: Users, color: "text-green-400" },
            { label: "Citas", value: tenant._count.appointments, icon: Calendar, color: "text-yellow-400" },
            { label: "Servicios", value: tenant._count.services, icon: Briefcase, color: "text-purple-400" },
          ].map((stat) => (
            <Card key={stat.label} className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">{stat.label}</p>
                    <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Accesos del cliente */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-5 space-y-3">
            <h3 className="text-white text-sm font-semibold flex items-center gap-2">
              <Link2 className="w-4 h-4 text-slate-400" />
              Accesos del cliente
            </h3>

            <div className="flex items-center gap-3 bg-slate-900/60 rounded-lg px-3 py-2.5">
              <Globe className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-slate-500 text-xs mb-0.5">Página de reservas pública</p>
                <p className="text-slate-200 text-sm font-mono truncate">{bookingUrl}</p>
              </div>
              <CopyButton text={bookingUrl} />
              <a href={bookingUrl} target="_blank" rel="noreferrer">
                <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white px-2">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
            </div>

            <div className="flex items-center gap-3 bg-slate-900/60 rounded-lg px-3 py-2.5">
              <LayoutDashboard className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-slate-500 text-xs mb-0.5">Panel de administración del cliente</p>
                <p className="text-slate-200 text-sm font-mono truncate">{dashboardUrl}</p>
              </div>
              <CopyButton text={dashboardUrl} />
              <ImpersonateButton tenantId={tenant.id} label="Entrar" />
            </div>
          </CardContent>
        </Card>

        {tenant.isActive && (tenant._count.services === 0 || tenant._count.availabilityRules === 0) && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-300 text-sm font-medium">Setup incompleto</p>
              <p className="text-yellow-400/70 text-xs mt-0.5">
                {[
                  tenant._count.services === 0 && "Sin servicios: los clientes no podrán elegir qué agendar.",
                  tenant._count.availabilityRules === 0 && "Sin horario: el calendario no tendrá días disponibles.",
                ].filter(Boolean).join(" ")}
              </p>
            </div>
          </div>
        )}

        <TenantEditForm
          tenant={{
            id: tenant.id,
            name: tenant.name,
            sector: tenant.sector,
            plan: tenant.plan,
            primaryColor: tenant.primaryColor,
            accentColor: tenant.accentColor,
            customDomain: tenant.customDomain,
            isActive: tenant.isActive,
          }}
        />

        <TenantUsersManager tenantId={tenant.id} users={tenant.users} />

        <DangerZone tenant={{ id: tenant.id, slug: tenant.slug, name: tenant.name }} />
      </div>
    </div>
  );
}
