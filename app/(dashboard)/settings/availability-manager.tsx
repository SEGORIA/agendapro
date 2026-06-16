"use client";

import { getErrorMessage } from "@/lib/utils";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";
import axios from "axios";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

interface DayRule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export function AvailabilityManager({ initialRules }: { initialRules: DayRule[] }) {
  const router = useRouter();
  const [rules, setRules] = useState<DayRule[]>(initialRules);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function toggleDay(day: number) {
    setRules((prev) => prev.map((r) => (r.dayOfWeek === day ? { ...r, isActive: !r.isActive } : r)));
    setSuccess(false);
  }

  function updateTime(day: number, field: "startTime" | "endTime", value: string) {
    setRules((prev) => prev.map((r) => (r.dayOfWeek === day ? { ...r, [field]: value } : r)));
    setSuccess(false);
  }

  async function handleSave() {
    for (const rule of rules) {
      if (rule.isActive && rule.startTime >= rule.endTime) {
        setError(`${DAY_NAMES[rule.dayOfWeek]}: la hora de inicio debe ser anterior a la hora de fin`);
        return;
      }
    }

    setError("");
    setSuccess(false);
    setSaving(true);

    try {
      await axios.put("/api/availability", rules);
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Error al guardar el horario"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {rules.map((rule) => (
          <div
            key={rule.dayOfWeek}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
              rule.isActive ? "bg-slate-800/60 border-slate-600" : "bg-slate-900/40 border-slate-700/50"
            }`}
          >
            <button
              type="button"
              onClick={() => toggleDay(rule.dayOfWeek)}
              className="flex items-center gap-3 flex-1 min-w-0 text-left"
            >
              <span
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
                  rule.isActive ? "bg-purple-600" : "bg-slate-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    rule.isActive ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </span>
              <span
                className={`text-sm font-medium w-24 ${rule.isActive ? "text-slate-200" : "text-slate-500"}`}
              >
                {DAY_NAMES[rule.dayOfWeek]}
              </span>
            </button>

            <div className="flex items-center gap-2 shrink-0">
              <input
                type="time"
                value={rule.startTime}
                disabled={!rule.isActive}
                onChange={(e) => updateTime(rule.dayOfWeek, "startTime", e.target.value)}
                className="h-8 rounded-lg border border-slate-600 bg-slate-900 px-2 text-slate-300 text-sm disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-slate-500 text-sm">–</span>
              <input
                type="time"
                value={rule.endTime}
                disabled={!rule.isActive}
                onChange={(e) => updateTime(rule.dayOfWeek, "endTime", e.target.value)}
                className="h-8 rounded-lg border border-slate-600 bg-slate-900 px-2 text-slate-300 text-sm disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg px-3 py-2">
          <Check className="w-3.5 h-3.5" /> Horario guardado
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-500">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Guardar horario
        </Button>
      </div>
    </div>
  );
}
