import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInitials, formatDate, formatRelative, APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS } from "@/lib/utils";
import { ArrowLeft, Mail, Phone, Building2, Calendar, Plus, Video } from "lucide-react";
import { ClientStageSelect } from "./client-stage-select";
import { ClientNotes } from "./client-notes";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const tenantId = session!.user.tenantId;

  const [client, stages] = await Promise.all([
    prisma.client.findUnique({
      where: { id, tenantId },
      include: {
        pipelineStage: true,
        appointments: {
          include: { service: true, staff: { select: { id: true, name: true } } },
          orderBy: { startsAt: "desc" },
        },
      },
    }),
    prisma.pipelineStage.findMany({
      where: { tenantId, isActive: true },
      orderBy: { order: "asc" },
    }),
  ]);

  if (!client) notFound();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/clients" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a clientes
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-slate-700 text-slate-200 text-lg">
              {getInitials(client.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold text-white">{client.name}</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Cliente desde {formatRelative(client.createdAt)}
            </p>
          </div>
        </div>
        <Link href={`/appointments/new?clientId=${client.id}`}>
          <Button className="bg-purple-600 hover:bg-purple-500">
            <Plus className="w-4 h-4" /> Nueva cita
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                Historial de citas ({client.appointments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {client.appointments.length === 0 ? (
                <div className="text-center py-10">
                  <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Sin citas registradas</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {client.appointments.map((apt) => (
                    <Link
                      key={apt.id}
                      href={`/appointments/${apt.id}`}
                      className="flex items-center gap-4 py-3 hover:bg-slate-700/30 px-3 -mx-3 rounded-lg transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-medium text-sm">
                            {apt.service?.name || "Cita"}
                          </span>
                          <Badge className={`text-xs ${APPOINTMENT_STATUS_COLORS[apt.status]}`}>
                            {APPOINTMENT_STATUS_LABELS[apt.status]}
                          </Badge>
                        </div>
                        {apt.staff && (
                          <p className="text-slate-500 text-xs mt-0.5">Con {apt.staff.name}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-3">
                        {apt.meetingUrl && (
                          <Video className="w-4 h-4 text-blue-400" />
                        )}
                        <p className="text-purple-400 text-sm font-medium">{formatDate(apt.startsAt)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <ClientNotes clientId={client.id} initialNotes={client.notes || ""} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">Información de contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {client.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                  <a href={`mailto:${client.email}`} className="text-slate-300 hover:text-white truncate">
                    {client.email}
                  </a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                  <a href={`tel:${client.phone}`} className="text-slate-300 hover:text-white">
                    {client.phone}
                  </a>
                </div>
              )}
              {client.company && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="text-slate-300">{client.company}</span>
                </div>
              )}
              {!client.email && !client.phone && !client.company && (
                <p className="text-slate-500 text-sm">Sin información de contacto adicional</p>
              )}
              <div className="pt-2 text-xs text-slate-500">
                Origen: <span className="text-slate-400">{client.source}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">Etapa del pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientStageSelect
                clientId={client.id}
                currentStageId={client.pipelineStageId}
                stages={stages.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
