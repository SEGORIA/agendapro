import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewClientForm } from "./new-client-form";

export default async function NewClientPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId;

  const stages = await prisma.pipelineStage.findMany({
    where: { tenantId, isActive: true },
    orderBy: { order: "asc" },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Nuevo cliente</h1>
        <p className="text-slate-400 text-sm mt-1">Agrega un cliente o lead manualmente</p>
      </div>

      <NewClientForm stages={stages.map((s) => ({ id: s.id, name: s.name, color: s.color }))} />
    </div>
  );
}
