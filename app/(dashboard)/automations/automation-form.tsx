"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TRIGGER_LABELS, ACTION_LABELS, ACTION_TEMPLATES, type AutomationAction } from "@/lib/automations";
import { Loader2, ArrowLeft, Plus, Trash2, Mail, MessageSquare, Info } from "lucide-react";
import Link from "next/link";
import axios from "axios";

const ACTION_ICONS: Record<string, React.ElementType> = {
  send_email: Mail,
  send_whatsapp: MessageSquare,
};

const VARIABLES_HELP = "Variables disponibles: {{client.name}}, {{service.name}}, {{appointment.date}}, {{appointment.time}}";

interface AutomationFormProps {
  automationId?: string;
  initialName?: string;
  initialTrigger?: string;
  initialActions?: AutomationAction[];
  initialIsActive?: boolean;
}

export function AutomationForm({
  automationId,
  initialName = "",
  initialTrigger = "appointment.created",
  initialActions = [],
  initialIsActive = true,
}: AutomationFormProps) {
  const router = useRouter();
  const isEdit = !!automationId;
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState(initialName);
  const [triggerEvent, setTriggerEvent] = useState(initialTrigger);
  const [actions, setActions] = useState<AutomationAction[]>(
    initialActions.length > 0 ? initialActions : [{ type: "send_email", config: { ...ACTION_TEMPLATES.send_email } }]
  );
  const [isActive, setIsActive] = useState(initialIsActive);

  function addAction() {
    setActions([...actions, { type: "send_email", config: { ...ACTION_TEMPLATES.send_email } }]);
  }

  function removeAction(index: number) {
    setActions(actions.filter((_, i) => i !== index));
  }

  function updateActionType(index: number, type: AutomationAction["type"]) {
    setActions(actions.map((a, i) => (i === index ? { type, config: { ...ACTION_TEMPLATES[type] } } : a)));
  }

  function updateActionConfig(index: number, key: string, value: string) {
    setActions(actions.map((a, i) => (i === index ? { ...a, config: { ...a.config, [key]: value } } : a)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("El nombre es requerido");
      return;
    }
    if (actions.length === 0) {
      setError("Agrega al menos una acción");
      return;
    }

    setLoading(true);
    try {
      const payload = { name, triggerEvent, actions, isActive };
      if (isEdit) {
        await axios.patch(`/api/automations/${automationId}`, payload);
      } else {
        await axios.post("/api/automations", payload);
      }
      router.push("/automations");
      router.refresh();
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al guardar la automatización");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar esta automatización? Esta acción no se puede deshacer.")) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/automations/${automationId}`);
      router.push("/automations");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-slate-300 text-sm font-medium block mb-1.5">Nombre</label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Recordatorio 24 horas antes"
              className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="text-slate-300 text-sm font-medium block mb-1.5">Cuándo se ejecuta (trigger)</label>
            <Select value={triggerEvent} onValueChange={setTriggerEvent}>
              <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className="flex items-center justify-between w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2.5"
          >
            <span className="text-slate-300 text-sm font-medium">Automatización activa</span>
            <span
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                isActive ? "bg-purple-600" : "bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isActive ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </span>
          </button>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-medium text-sm">Acciones a ejecutar</h2>
            <Button type="button" size="sm" variant="outline" onClick={addAction} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <Plus className="w-3.5 h-3.5" /> Agregar acción
            </Button>
          </div>

          <p className="text-slate-500 text-xs flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {VARIABLES_HELP}
          </p>

          {actions.map((action, i) => {
            const Icon = ACTION_ICONS[action.type] || Mail;
            return (
              <div key={i} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Icon className="w-4 h-4 text-purple-400 shrink-0" />
                    <Select value={action.type} onValueChange={(v) => updateActionType(i, v as AutomationAction["type"])}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700 text-white">
                        {Object.entries(ACTION_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAction(i)}
                    className="text-slate-500 hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {action.type === "send_email" && (
                  <div className="space-y-2">
                    <Input
                      value={action.config.subject || ""}
                      onChange={(e) => updateActionConfig(i, "subject", e.target.value)}
                      placeholder="Asunto del email"
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                    <textarea
                      value={action.config.body || ""}
                      onChange={(e) => updateActionConfig(i, "body", e.target.value)}
                      placeholder="Cuerpo del mensaje"
                      rows={3}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}

                {action.type === "send_whatsapp" && (
                  <textarea
                    value={action.config.message || ""}
                    onChange={(e) => updateActionConfig(i, "message", e.target.value)}
                    placeholder="Mensaje de WhatsApp"
                    rows={3}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                )}
              </div>
            );
          })}

          {actions.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-4">Sin acciones. Agrega al menos una.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Link href="/automations" className="flex-1">
          <Button type="button" variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
            <ArrowLeft className="w-4 h-4" /> Cancelar
          </Button>
        </Link>
        {isEdit && (
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            disabled={deleting}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </Button>
        )}
        <Button type="submit" disabled={loading} className="flex-1 bg-purple-600 hover:bg-purple-500">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Guardar cambios" : "Crear automatización"}
        </Button>
      </div>
    </form>
  );
}
