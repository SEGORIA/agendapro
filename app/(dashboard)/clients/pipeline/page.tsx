import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { PipelineBoard } from "./pipeline-board";

export default async function PipelinePage() {
  const session = await auth();
  const tenantId = session!.user.tenantId;

  const [stages, clients] = await Promise.all([
    prisma.pipelineStage.findMany({
      where: { tenantId, isActive: true },
      orderBy: { order: "asc" },
    }),
    prisma.client.findMany({
      where: { tenantId },
      include: { _count: { select: { appointments: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/clients" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors mb-2">
            <ArrowLeft className="w-4 h-4" /> Volver a clientes
          </Link>
          <h1 className="text-2xl font-bold text-white">Pipeline de ventas</h1>
          <p className="text-slate-400 text-sm mt-1">Arrastra clientes entre etapas</p>
        </div>
        <Link href="/clients/new">
          <Button className="bg-purple-600 hover:bg-purple-500">
            <Plus className="w-4 h-4" /> Nuevo cliente
          </Button>
        </Link>
      </div>

      <PipelineBoard
        stages={stages.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
        clients={clients.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          pipelineStageId: c.pipelineStageId,
          appointmentsCount: c._count.appointments,
        }))}
      />
    </div>
  );
}
