import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Calendar, Plus, ExternalLink, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SECTOR_LABELS } from "@/lib/utils";

export default async function SuperAdminPage() {
  const session = await auth();

  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const tenants = await prisma.tenant.findMany({
    include: {
      _count: { select: { users: true, clients: true, appointments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalStats = {
    tenants: tenants.length,
    users: tenants.reduce((acc, t) => acc + t._count.users, 0),
    clients: tenants.reduce((acc, t) => acc + t._count.clients, 0),
    appointments: tenants.reduce((acc, t) => acc + t._count.appointments, 0),
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-slate-800 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Super Admin — AgendaPro</h1>
          <p className="text-slate-400 text-sm">Panel de control global</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="outline" className="border-slate-700 text-slate-300">
              <ArrowLeft className="w-4 h-4" /> Mi panel
            </Button>
          </Link>
          <Link href="/admin/tenants/new">
            <Button className="bg-purple-600 hover:bg-purple-500">
              <Plus className="w-4 h-4" /> Nuevo tenant
            </Button>
          </Link>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Stats globales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Tenants activos", value: totalStats.tenants, icon: Building2, color: "text-purple-400" },
            { label: "Total usuarios", value: totalStats.users, icon: Users, color: "text-blue-400" },
            { label: "Total clientes", value: totalStats.clients, icon: Users, color: "text-green-400" },
            { label: "Total citas", value: totalStats.appointments, icon: Calendar, color: "text-yellow-400" },
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

        {/* Lista de tenants */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-400" />
              Todos los tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-700">
              {tenants.map((tenant) => (
                <div key={tenant.id} className="flex items-center gap-4 py-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: tenant.primaryColor }}
                  >
                    {tenant.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{tenant.name}</p>
                      <Badge variant={tenant.isActive ? "success" : "secondary"} className="text-xs">
                        {tenant.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                      <Badge variant="outline" className="text-xs text-slate-400 border-slate-600">
                        {tenant.plan}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-slate-400 text-xs">{tenant.slug}.agendapro.com</span>
                      <span className="text-slate-500 text-xs">·</span>
                      <span className="text-slate-400 text-xs">{SECTOR_LABELS[tenant.sector] || tenant.sector}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden md:block">
                      <p className="text-slate-300 text-xs">{tenant._count.users} usuarios</p>
                      <p className="text-slate-400 text-xs">{tenant._count.appointments} citas</p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/admin/tenants/${tenant.id}`}>
                        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 text-xs">
                          Gestionar
                        </Button>
                      </Link>
                      <a
                        href={`http://${tenant.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000"}/booking`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
