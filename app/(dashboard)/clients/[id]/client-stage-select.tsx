"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check } from "lucide-react";
import axios from "axios";

interface Stage {
  id: string;
  name: string;
  color: string;
}

export function ClientStageSelect({
  clientId,
  currentStageId,
  stages,
}: {
  clientId: string;
  currentStageId: string | null;
  stages: Stage[];
}) {
  const [value, setValue] = useState(currentStageId || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleChange(stageId: string) {
    setValue(stageId);
    setSaving(true);
    setSaved(false);
    try {
      await axios.patch(`/api/clients/${clientId}`, { pipelineStageId: stageId });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
          <SelectValue placeholder="Sin etapa" />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700 text-white">
          {stages.map((stage) => (
            <SelectItem key={stage.id} value={stage.id}>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: stage.color }} />
                {stage.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {saving && (
        <p className="text-slate-500 text-xs flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" /> Guardando...
        </p>
      )}
      {saved && (
        <p className="text-green-400 text-xs flex items-center gap-1.5">
          <Check className="w-3 h-3" /> Guardado
        </p>
      )}
    </div>
  );
}
