"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APPOINTMENT_STATUS_LABELS, getErrorMessage } from "@/lib/utils";
import { Loader2, Check, Video, XCircle } from "lucide-react";
import axios from "axios";

const STATUS_OPTIONS = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW", "RESCHEDULED"];

export function AppointmentActions({
  appointmentId,
  currentStatus,
  currentNotes,
  currentMeetingUrl,
  notesOnly = false,
}: {
  appointmentId: string;
  currentStatus: string;
  currentNotes: string;
  currentMeetingUrl: string;
  notesOnly?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [notes, setNotes] = useState(currentNotes);
  const [meetingUrl, setMeetingUrl] = useState(currentMeetingUrl);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patch(data: Record<string, unknown>, key: string) {
    setSaving(key);
    setSaved(null);
    setError(null);
    try {
      await axios.patch(`/api/appointments/${appointmentId}`, data);
      setSaved(key);
      router.refresh();
      setTimeout(() => setSaved(null), 1500);
    } catch (err) {
      setError(getErrorMessage(err, "Error al guardar"));
    } finally {
      setSaving(null);
    }
  }

  async function handleCancel() {
    if (!confirm("¿Cancelar esta cita? Esta acción no se puede deshacer.")) return;
    setSaving("cancel");
    try {
      await axios.delete(`/api/appointments/${appointmentId}`);
      setStatus("CANCELLED");
      router.refresh();
    } finally {
      setSaving(null);
    }
  }

  if (notesOnly) {
    return (
      <div className="space-y-3">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas internas sobre esta cita"
          rows={4}
          className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => patch({ notes }, "notes")}
            disabled={saving === "notes"}
            className="bg-purple-600 hover:bg-purple-500"
          >
            {saving === "notes" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar notas"}
          </Button>
          {saved === "notes" && (
            <span className="text-green-400 text-xs flex items-center gap-1">
              <Check className="w-3 h-3" /> Guardado
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div>
        <label className="text-slate-300 text-sm font-medium block mb-1.5">Estado</label>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            patch({ status: v }, "status");
          }}
        >
          <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700 text-white">
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {APPOINTMENT_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {saving === "status" && (
          <p className="text-slate-500 text-xs flex items-center gap-1.5 mt-1.5">
            <Loader2 className="w-3 h-3 animate-spin" /> Guardando...
          </p>
        )}
        {saved === "status" && (
          <p className="text-green-400 text-xs flex items-center gap-1.5 mt-1.5">
            <Check className="w-3 h-3" /> Estado actualizado
          </p>
        )}
      </div>

      <div>
        <label className="text-slate-300 text-sm font-medium block mb-1.5 flex items-center gap-1.5">
          <Video className="w-3.5 h-3.5" /> Link de reunión
        </label>
        <div className="flex gap-2">
          <Input
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            placeholder="https://meet.google.com/..."
            className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => patch({ meetingUrl: meetingUrl || undefined }, "meeting")}
            disabled={saving === "meeting"}
            className="border-slate-600 text-slate-300 hover:bg-slate-700 shrink-0"
          >
            {saving === "meeting" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
          </Button>
        </div>
        {saved === "meeting" && (
          <p className="text-green-400 text-xs flex items-center gap-1.5 mt-1.5">
            <Check className="w-3 h-3" /> Guardado
          </p>
        )}
      </div>

      {status !== "CANCELLED" && (
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={saving === "cancel"}
          className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
        >
          {saving === "cancel" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
          Cancelar cita
        </Button>
      )}
    </div>
  );
}
