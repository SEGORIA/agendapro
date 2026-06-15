import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, Calendar, Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SessionProvider } from "next-auth/react";
import { TenantList } from "./tenant-list";

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
    <SessionProvider session={session}>
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
            <TenantList tenants={tenants} />
          </CardContent>
        </Card>
      </div>
    </div>
    </SessionProvider>
  );
}
