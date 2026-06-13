"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SECTOR_LABELS } from "@/lib/utils";
import { Settings2, Loader2 } from "lucide-react";
import axios from "axios";

interface TenantEditFormProps {
  tenant: {
    id: string;
    name: string;
    sector: string;
    plan: string;
    primaryColor: string;
    accentColor: string;
    customDomain: string | null;
    isActive: boolean;
  };
}

export function TenantEditForm({ tenant }: TenantEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState(tenant.name);
  const [sector, setSector] = useState(tenant.sector);
  const [plan, setPlan] = useState(tenant.plan);
  const [primaryColor, setPrimaryColor] = useState(tenant.primaryColor);
  const [accentColor, setAccentColor] = useState(tenant.accentColor);
  const [customDomain, setCustomDomain] = useState(tenant.customDomain || "");
  const [isActive, setIsActive] = useState(tenant.isActive);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSaved(false);
    try {
      await axios.patch(`/api/tenants/${tenant.id}`, {
        name,
        sector,
        plan,
        primaryColor,
        accentColor,
        customDomain,
        isActive,
      });
      setSaved(true);
      router.refresh();
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al guardar los cambios");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white text-base flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-purple-400" />
          Configuración del tenant
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1.5">Nombre</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1.5">Sector</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-600 bg-slate-900 px-3 text-slate-300 text-sm"
              >
                {Object.entries(SECTOR_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1.5">Color primario</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-9 rounded border border-slate-600 cursor-pointer bg-transparent"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="bg-slate-900 border-slate-600 text-white font-mono text-xs"
                />
              </div>
            </div>
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1.5">Color acento</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-9 rounded border border-slate-600 cursor-pointer bg-transparent"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="bg-slate-900 border-slate-600 text-white font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1.5">Plan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-600 bg-slate-900 px-3 text-slate-300 text-sm"
              >
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1.5">Dominio personalizado</label>
              <Input
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="agenda.tuempresa.com"
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className="flex items-center justify-between w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2.5"
          >
            <span className="text-slate-300 text-sm font-medium">Tenant activo</span>
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

          <div className="flex justify-end items-center gap-3">
            {saved && <span className="text-green-400 text-sm">Guardado</span>}
            <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-500">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
