"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import axios from "axios";

interface Stage {
  id: string;
  name: string;
  color: string;
}

export function NewClientForm({ stages }: { stages: Stage[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
    pipelineStageId: stages[0]?.id || "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post("/api/clients", form);
      router.push(`/clients/${res.data.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al crear el cliente");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="text-slate-300 text-sm font-medium block mb-1.5">Nombre completo *</label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre del cliente"
              className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1.5">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="cliente@email.com"
                className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1.5">Teléfono</label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+57 300 000 0000"
                className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 text-sm font-medium block mb-1.5">Empresa</label>
            <Input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Empresa (opcional)"
              className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          {stages.length > 0 && (
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1.5">Etapa del pipeline</label>
              <Select
                value={form.pipelineStageId}
                onValueChange={(v) => setForm({ ...form, pipelineStageId: v })}
              >
                <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                  <SelectValue placeholder="Selecciona una etapa" />
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
            </div>
          )}

          <div>
            <label className="text-slate-300 text-sm font-medium block mb-1.5">Notas</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notas internas sobre este cliente"
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Link href="/clients" className="flex-1">
              <Button type="button" variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
                <ArrowLeft className="w-4 h-4" /> Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={loading} className="flex-1 bg-purple-600 hover:bg-purple-500">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear cliente"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
