import { AUTOMATION_TEMPLATES } from "@/lib/automations";
import { AutomationForm } from "../automation-form";

export default async function NewAutomationPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const { template } = await searchParams;
  const preset = template ? AUTOMATION_TEMPLATES[template] : undefined;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Nueva automatización</h1>
        <p className="text-slate-400 text-sm mt-1">Define cuándo y qué debe ocurrir automáticamente</p>
      </div>

      <AutomationForm
        initialName={preset?.name}
        initialTrigger={template}
        initialActions={preset?.actions}
      />
    </div>
  );
}
