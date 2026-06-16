"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { CalendarClock, Check, Loader2, AlertTriangle, Unplug } from "lucide-react";

interface Props {
  connected: boolean;
  email?: string | null;
  configured: boolean;
}

export function GoogleCalendarCard({ connected, email, configured }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const status = params.get("google"); // connected | error | not_configured | forbidden
  const [loading, setLoading] = useState(false);

  async function handleDisconnect() {
    setLoading(true);
    try {
      await axios.post("/api/integrations/google/disconnect");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {status === "connected" && (
        <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
          <Check className="w-4 h-4" /> Google Calendar conectado correctamente.
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4" /> No se pudo conectar. Intenta de nuevo.
        </div>
      )}
      {status === "not_configured" && (
        <div className="flex items-center gap-2 text-yellow-400 text-sm bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4" /> La plataforma aún no tiene Google configurado.
        </div>
      )}

      <div className="flex items-center justify-between gap-4 bg-slate-900/40 border border-slate-700 rounded-lg px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
            <CalendarClock className="w-5 h-5 text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium">
              {connected ? "Conectado" : "Sin conectar"}
            </p>
            <p className="text-slate-400 text-xs truncate">
              {connected
                ? (email || "Cuenta de Google vinculada")
                : "Sincroniza tus citas y bloquea los horarios ya ocupados"}
            </p>
          </div>
        </div>

        {connected ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleDisconnect}
            disabled={loading}
            className="border-slate-600 text-slate-300 hover:bg-slate-800 shrink-0"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unplug className="w-3.5 h-3.5" />}
            Desconectar
          </Button>
        ) : (
          <a href={configured ? "/api/integrations/google/connect" : undefined} className="shrink-0">
            <Button
              type="button"
              size="sm"
              disabled={!configured}
              className="bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
              title={configured ? undefined : "El administrador de la plataforma debe configurar Google primero"}
            >
              <CalendarClock className="w-3.5 h-3.5" /> Conectar Google Calendar
            </Button>
          </a>
        )}
      </div>

      {connected && (
        <p className="text-slate-500 text-xs">
          Los horarios ocupados en tu Google Calendar se restan automáticamente de tu disponibilidad,
          y cada cita agendada se crea como evento en tu calendario.
        </p>
      )}
    </div>
  );
}
