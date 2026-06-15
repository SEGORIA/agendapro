import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Calendar, Briefcase, UserCog, ExternalLink } from "lucide-react";
import Link from "next/link";
import { getInitials } from "@/lib/utils";
import { getTenantBookingUrl } from "@/lib/tenant";
import { TenantEditForm } from "./tenant-edit-form";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrador",
  STAFF: "Staff",
};

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
      _count: { select: { clients: true, appointments: true, services: true } },
    },
  });

  if (!tenant) notFound();

  const bookingUrl = getTenantBookingUrl(tenant.slug);

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

        {/* Usuarios */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <UserCog className="w-4 h-4 text-blue-400" />
              Usuarios ({tenant.users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-700">
              {tenant.users.map((u) => (
                <div key={u.id} className="flex items-center gap-4 py-3">
                  <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {getInitials(u.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{u.name}</p>
                    <p className="text-slate-400 text-xs">{u.email}</p>
                  </div>
                  <Badge variant="outline" className="text-slate-400 border-slate-600 text-xs">
                    {ROLE_LABELS[u.role] || u.role}
                  </Badge>
                  <Badge variant={u.isActive ? "success" : "secondary"} className="text-xs">
                    {u.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
