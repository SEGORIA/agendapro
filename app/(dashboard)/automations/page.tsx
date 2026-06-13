import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Plus, Mail, MessageSquare, ArrowRight } from "lucide-react";
import { TRIGGER_LABELS } from "@/lib/automations";
import Link from "next/link";

const ACTION_ICONS: Record<string, React.ElementType> = {
  send_email: Mail,
  send_whatsapp: MessageSquare,
};

export default async function AutomationsPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId;

  const automations = await prisma.automation.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Automatizaciones</h1>
          <p className="text-slate-400 text-sm mt-1">Flujos automáticos para tu negocio</p>
        </div>
        <Link href="/automations/new">
          <Button className="bg-purple-600 hover:bg-purple-500">
            <Plus className="w-4 h-4" /> Nueva automatización
          </Button>
        </Link>
      </div>

      {/* Templates sugeridos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            title: "Recordatorio 24h",
            desc: "Envía WhatsApp al cliente 24 horas antes de su cita",
            trigger: "appointment.reminder_24h",
            action: "send_whatsapp",
            badge: "Popular",
          },
          {
            title: "Confirmación automática",
            desc: "Email de confirmación al instante cuando se agenda una cita",
            trigger: "appointment.created",
            action: "send_email",
            badge: "Esencial",
          },
          {
            title: "Follow-up post cita",
            desc: "Email de seguimiento 1 día después de completada la cita",
            trigger: "appointment.confirmed",
            action: "send_email",
            badge: "Recomendado",
          },
        ].map((t) => (
          <div
            key={t.title}
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:border-purple-500/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <Zap className="w-5 h-5 text-purple-400" />
              <span className="text-xs font-medium text-purple-300 bg-purple-500/10 rounded-full px-2 py-0.5">
                {t.badge}
              </span>
            </div>
            <h3 className="text-white font-medium text-sm mb-1">{t.title}</h3>
            <p className="text-slate-400 text-xs mb-4">{t.desc}</p>
            <Link href={`/automations/new?template=${t.trigger}`}>
              <Button size="sm" variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 text-xs">
                Usar plantilla
              </Button>
            </Link>
          </div>
        ))}
      </div>

      {/* Lista de automatizaciones */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            Mis automatizaciones ({automations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {automations.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">Sin automatizaciones</p>
              <p className="text-slate-500 text-sm mt-1">Crea tu primer flujo automático</p>
            </div>
          ) : (
            <div className="space-y-3">
              {automations.map((auto) => {
                const actions: any[] = JSON.parse(auto.actions || "[]");
                return (
                  <Link
                    key={auto.id}
                    href={`/automations/${auto.id}`}
                    className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-xl hover:bg-slate-700/50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${auto.isActive ? "bg-green-500/10" : "bg-slate-600/20"}`}>
                      <Zap className={`w-4 h-4 ${auto.isActive ? "text-green-400" : "text-slate-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">{auto.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-400 text-xs bg-slate-700 px-2 py-0.5 rounded">
                          {TRIGGER_LABELS[auto.triggerEvent] || auto.triggerEvent}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                        <div className="flex gap-1">
                          {actions?.map((action: any, i: number) => {
                            const Icon = ACTION_ICONS[action.type] || Zap;
                            return (
                              <span key={i} className="text-slate-400 text-xs bg-slate-700 px-2 py-0.5 rounded flex items-center gap-1">
                                <Icon className="w-3 h-3" />
                                {action.type === "send_email" ? "Email" : "WhatsApp"}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <Badge variant={auto.isActive ? "success" : "secondary"}>
                      {auto.isActive ? "Activa" : "Pausada"}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
