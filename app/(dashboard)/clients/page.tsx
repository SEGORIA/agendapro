import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Phone, Mail, Calendar } from "lucide-react";
import { getInitials, formatRelative } from "@/lib/utils";
import Link from "next/link";

export default async function ClientsPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId;

  const [clients, stages] = await Promise.all([
    prisma.client.findMany({
      where: { tenantId },
      include: {
        pipelineStage: true,
        _count: { select: { appointments: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pipelineStage.findMany({
      where: { tenantId, isActive: true },
      orderBy: { order: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes & CRM</h1>
          <p className="text-slate-400 text-sm mt-1">{clients.length} clientes registrados</p>
        </div>
        <div className="flex gap-2">
          <Link href="/clients/pipeline">
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Vista Pipeline
            </Button>
          </Link>
          <Link href="/clients/new">
            <Button className="bg-purple-600 hover:bg-purple-500">
              <Plus className="w-4 h-4" /> Nuevo cliente
            </Button>
          </Link>
        </div>
      </div>

      {/* Pipeline stages summary */}
      {stages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stages.map((stage) => {
            const count = clients.filter((c) => c.pipelineStageId === stage.id).length;
            return (
              <div key={stage.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                  <p className="text-slate-300 text-xs font-medium truncate">{stage.name}</p>
                </div>
                <p className="text-2xl font-bold text-white">{count}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabla de clientes */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            Todos los clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">Sin clientes aún</p>
              <p className="text-slate-500 text-sm mt-1">Los clientes se crean automáticamente al agendar</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {clients.map((client) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="flex items-center gap-4 py-4 hover:bg-slate-700/30 px-3 rounded-lg transition-colors"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
                      {getInitials(client.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">{client.name}</span>
                      {client.pipelineStage && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: client.pipelineStage.color + "20",
                            color: client.pipelineStage.color,
                          }}
                        >
                          {client.pipelineStage.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {client.email && (
                        <span className="text-slate-400 text-xs flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {client.email}
                        </span>
                      )}
                      {client.phone && (
                        <span className="text-slate-400 text-xs flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {client.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-slate-400 text-xs">
                      <Calendar className="w-3 h-3" />
                      {(client as any)._count.appointments} citas
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5">{formatRelative(client.createdAt)}</p>
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
