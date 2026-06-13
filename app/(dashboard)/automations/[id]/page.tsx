import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AutomationForm } from "../automation-form";
import type { AutomationAction } from "@/lib/automations";

export default async function EditAutomationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const tenantId = session!.user.tenantId;

  const automation = await prisma.automation.findUnique({
    where: { id, tenantId },
  });

  if (!automation) notFound();

  const actions: AutomationAction[] = JSON.parse(automation.actions || "[]");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Editar automatización</h1>
        <p className="text-slate-400 text-sm mt-1">{automation.name}</p>
      </div>

      <AutomationForm
        automationId={automation.id}
        initialName={automation.name}
        initialTrigger={automation.triggerEvent}
        initialActions={actions}
        initialIsActive={automation.isActive}
      />
    </div>
  );
}
