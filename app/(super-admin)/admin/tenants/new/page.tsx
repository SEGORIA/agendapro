"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Building2 } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { slugify, SECTOR_LABELS } from "@/lib/utils";

export default function NewTenantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    slug: "",
    sector: "general",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    primaryColor: "#6366f1",
    accentColor: "#f59e0b",
    plan: "starter",
  });

  function handleNameChange(name: string) {
    setForm((prev) => ({ ...prev, name, slug: slugify(name) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await axios.post("/api/tenants", form);
      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al crear el tenant");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Nuevo Tenant</h1>
            <p className="text-slate-400 text-sm">Crear una nueva empresa en la plataforma</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Empresa */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                Información de la empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Nombre de la empresa *</label>
                <Input
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Clínica San Juan"
                  required
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Slug (subdominio) *</label>
                <div className="flex items-center gap-2">
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="clinica-san-juan"
                    required
                    className="bg-slate-900 border-slate-600 text-white font-mono"
                  />
                  <span className="text-slate-400 text-sm whitespace-nowrap">.agendapro.com</span>
                </div>
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Sector</label>
                <select
                  value={form.sector}
                  onChange={(e) => setForm({ ...form, sector: e.target.value })}
                  className="w-full h-9 rounded-lg border border-slate-600 bg-slate-900 px-3 text-slate-300 text-sm"
                >
                  {Object.entries(SECTOR_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1.5">Color primario</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.primaryColor}
                      onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                      className="w-10 h-9 rounded border border-slate-600 cursor-pointer bg-transparent"
                    />
                    <Input
                      value={form.primaryColor}
                      onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                      className="bg-slate-900 border-slate-600 text-white font-mono text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1.5">Plan</label>
                  <select
                    value={form.plan}
                    onChange={(e) => setForm({ ...form, plan: e.target.value })}
                    className="w-full h-9 rounded-lg border border-slate-600 bg-slate-900 px-3 text-slate-300 text-sm"
                  >
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">Cuenta administrador</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1.5">Nombre *</label>
                  <Input
                    value={form.adminName}
                    onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                    placeholder="Juan García"
                    required
                    className="bg-slate-900 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1.5">Email *</label>
                  <Input
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                    placeholder="admin@clinica.com"
                    required
                    className="bg-slate-900 border-slate-600 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Contraseña inicial *</label>
                <Input
                  type="password"
                  value={form.adminPassword}
                  onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Link href="/admin" className="flex-1">
              <Button type="button" variant="outline" className="w-full border-slate-600 text-slate-300">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={loading} className="flex-1 bg-purple-600 hover:bg-purple-500">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</>
              ) : (
                "Crear tenant"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
