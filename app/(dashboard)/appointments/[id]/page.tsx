import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInitials, formatDate, APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS } from "@/lib/utils";
import { ArrowLeft, Mail, Phone, Clock, User, Briefcase, FileText, MessageCircleQuestion } from "lucide-react";
import { AppointmentActions } from "./appointment-actions";

function parseFormData(raw: string | null | undefined): [string, string][] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Object.entries(parsed).filter(([, v]) => typeof v === "string" && v) as [string, string][];
  } catch {
    return [];
  }
}

export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const tenantId = session!.user.tenantId;

  const appointment = await prisma.appointment.findUnique({
    where: { id, tenantId },
    include: {
      client: true,
      service: true,
      staff: { select: { id: true, name: true, email: true } },
    },
  });

  if (!appointment) notFound();

  const formAnswers = parseFormData(appointment.formData);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/appointments" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a citas
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{appointment.service?.name || "Cita"}</h1>
            <Badge className={APPOINTMENT_STATUS_COLORS[appointment.status]}>
              {APPOINTMENT_STATUS_LABELS[appointment.status]}
            </Badge>
          </div>
          <p className="text-slate-400 text-sm mt-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> {formatDate(appointment.startsAt)}
            {appointment.service && ` · ${appointment.service.durationMin} min`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`/clients/${appointment.client.id}`} className="flex items-center gap-3 group">
                <Avatar className="h-11 w-11">
                  <AvatarFallback className="bg-slate-700 text-slate-200">
                    {getInitials(appointment.client.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm group-hover:underline">{appointment.client.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {appointment.client.email && (
                      <span className="text-slate-400 text-xs flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {appointment.client.email}
                      </span>
                    )}
                    {appointment.client.phone && (
                      <span className="text-slate-400 text-xs flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {appointment.client.phone}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
              {appointment.clientNotes && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Notas del cliente al agendar</p>
                  <p className="text-slate-300 text-sm">{appointment.clientNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {formAnswers.length > 0 && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <MessageCircleQuestion className="w-4 h-4 text-purple-400" />
                  Respuestas del cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {formAnswers.map(([question, answer]) => (
                  <div key={question}>
                    <p className="text-slate-400 text-xs mb-0.5">{question}</p>
                    <p className="text-white text-sm font-medium">{answer}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {appointment.staff && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-400" />
                  Atendido por
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-slate-700 text-slate-200">
                      {getInitials(appointment.staff.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-white font-medium text-sm">{appointment.staff.name}</p>
                    <p className="text-slate-400 text-xs">{appointment.staff.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                Notas internas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AppointmentActions
                appointmentId={appointment.id}
                currentStatus={appointment.status}
                currentNotes={appointment.notes || ""}
                currentMeetingUrl={appointment.meetingUrl || ""}
                notesOnly
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">Gestionar cita</CardTitle>
            </CardHeader>
            <CardContent>
              <AppointmentActions
                appointmentId={appointment.id}
                currentStatus={appointment.status}
                currentNotes={appointment.notes || ""}
                currentMeetingUrl={appointment.meetingUrl || ""}
              />
            </CardContent>
          </Card>

          {appointment.service && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-base">Servicio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                <p className="text-white text-sm font-medium">{appointment.service.name}</p>
                <p className="text-slate-400 text-xs">{appointment.service.durationMin} min</p>
                {appointment.service.price > 0 && (
                  <p className="text-slate-400 text-xs">
                    {new Intl.NumberFormat("es-CO", { style: "currency", currency: appointment.service.currency, maximumFractionDigits: 0 }).format(appointment.service.price)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
