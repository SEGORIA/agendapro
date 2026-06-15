"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserCog, UserPlus, KeyRound, Loader2 } from "lucide-react";
import { getInitials, ROLE_LABELS } from "@/lib/utils";

interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface TenantUsersManagerProps {
  tenantId: string;
  users: TenantUser[];
}

export function TenantUsersManager({ tenantId, users: initialUsers }: TenantUsersManagerProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [savedId, setSavedId] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "STAFF" });

  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetDone, setResetDone] = useState(false);

  function flashSaved(userId: string) {
    setSavedId(userId);
    setTimeout(() => setSavedId(null), 1500);
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddError("");
    try {
      const res = await axios.post(`/api/tenants/${tenantId}/users`, form);
      setUsers((prev) => [...prev, res.data.data]);
      setForm({ name: "", email: "", password: "", role: "STAFF" });
      setAddOpen(false);
      router.refresh();
    } catch (err: any) {
      setAddError(err.response?.data?.error || "Error al crear el usuario");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleRoleChange(userId: string, role: string) {
    const previous = users;
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    try {
      await axios.patch(`/api/tenants/${tenantId}/users/${userId}`, { role });
      flashSaved(userId);
    } catch {
      setUsers(previous);
    }
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    const previous = users;
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive } : u)));
    try {
      await axios.patch(`/api/tenants/${tenantId}/users/${userId}`, { isActive });
      flashSaved(userId);
    } catch {
      setUsers(previous);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetUserId) return;
    setResetLoading(true);
    setResetError("");
    setResetDone(false);
    try {
      await axios.patch(`/api/tenants/${tenantId}/users/${resetUserId}`, { password: resetPassword });
      setResetDone(true);
      setResetPassword("");
    } catch (err: any) {
      setResetError(err.response?.data?.error || "Error al restablecer la contraseña");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <UserCog className="w-4 h-4 text-blue-400" />
          Usuarios ({users.length})
        </CardTitle>

        <Dialog
          open={addOpen}
          onOpenChange={(open) => {
            setAddOpen(open);
            if (!open) setAddError("");
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-500">
              <UserPlus className="w-3.5 h-3.5" /> Agregar usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Agregar usuario</DialogTitle>
              <DialogDescription className="text-slate-400">
                Crea una cuenta de acceso para el equipo de este tenant.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddUser} className="space-y-3">
              {addError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
                  {addError}
                </div>
              )}
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Nombre</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="bg-slate-950 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Email</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="bg-slate-950 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Contraseña</label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  className="bg-slate-950 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Rol</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full h-9 rounded-lg border border-slate-600 bg-slate-950 px-3 text-slate-300 text-sm"
                >
                  <option value="STAFF">Staff</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={addLoading} className="bg-purple-600 hover:bg-purple-500">
                  {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear usuario"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        <div className="divide-y divide-slate-700">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 py-3">
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {getInitials(u.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{u.name}</p>
                <p className="text-slate-400 text-xs">{u.email}</p>
              </div>

              {u.role === "SUPER_ADMIN" ? (
                <>
                  <Badge variant="outline" className="text-slate-400 border-slate-600 text-xs">
                    {ROLE_LABELS[u.role] || u.role}
                  </Badge>
                  <Badge variant={u.isActive ? "success" : "secondary"} className="text-xs">
                    {u.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </>
              ) : (
                <>
                  {savedId === u.id && <span className="text-green-400 text-xs shrink-0">Guardado</span>}

                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="h-8 rounded-lg border border-slate-600 bg-slate-900 px-2 text-slate-300 text-xs shrink-0"
                  >
                    <option value="STAFF">Staff</option>
                    <option value="ADMIN">Administrador</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(u.id, !u.isActive)}
                    title={u.isActive ? "Desactivar usuario" : "Activar usuario"}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
                      u.isActive ? "bg-purple-600" : "bg-slate-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        u.isActive ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>

                  <Dialog
                    open={resetUserId === u.id}
                    onOpenChange={(open) => {
                      setResetUserId(open ? u.id : null);
                      setResetPassword("");
                      setResetError("");
                      setResetDone(false);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Restablecer contraseña"
                        className="text-slate-400 hover:text-white shrink-0"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 border-slate-700 text-white">
                      <DialogHeader>
                        <DialogTitle>Restablecer contraseña</DialogTitle>
                        <DialogDescription className="text-slate-400">
                          Nueva contraseña para {u.name} ({u.email}).
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleResetPassword} className="space-y-3">
                        {resetError && (
                          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
                            {resetError}
                          </div>
                        )}
                        {resetDone && (
                          <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2">
                            Contraseña actualizada
                          </div>
                        )}
                        <Input
                          type="password"
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                          required
                          minLength={8}
                          placeholder="Mínimo 8 caracteres"
                          className="bg-slate-950 border-slate-600 text-white"
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={resetLoading} className="bg-purple-600 hover:bg-purple-500">
                            {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
