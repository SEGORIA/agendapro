"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StickyNote, Loader2, Check } from "lucide-react";
import axios from "axios";

export function ClientNotes({ clientId, initialNotes }: { clientId: string; initialNotes: string }) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await axios.patch(`/api/clients/${clientId}`, { notes });
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-amber-400" />
          Notas internas
        </CardTitle>
        {saved && (
          <span className="text-green-400 text-xs flex items-center gap-1.5">
            <Check className="w-3 h-3" /> Guardado
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setDirty(true);
          }}
          placeholder="Agrega notas sobre este cliente (preferencias, historial, contexto, etc.)"
          rows={5}
          className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <Button
          onClick={handleSave}
          disabled={!dirty || saving}
          size="sm"
          className="bg-purple-600 hover:bg-purple-500"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar notas"}
        </Button>
      </CardContent>
    </Card>
  );
}
