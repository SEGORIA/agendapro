"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

interface DangerZoneProps {
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
}

export function DangerZone({ tenant }: DangerZoneProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canDelete = confirmSlug === tenant.slug;

  async function handleDelete() {
    if (!canDelete) return;
    setLoading(true);
    setError("");
    try {
      await axios.delete(`/api/tenants/${tenant.id}`);
      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al eliminar el tenant");
      setLoading(false);
    }
  }

  return (
    <Card className="bg-red-950/20 border-red-500/30">
      <CardHeader>
        <CardTitle className="text-red-400 text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Zona de peligro
        </CardTitle>
        <CardDescription className="text-red-300/70">
          Eliminar este tenant borra permanentemente sus usuarios, clientes, citas, servicios y
          automatizaciones. Esta acción no se puede deshacer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) {
              setConfirmSlug("");
              setError("");
              setLoading(false);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="w-4 h-4" /> Eliminar tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Eliminar {tenant.name}</DialogTitle>
              <DialogDescription className="text-slate-400">
                Para confirmar, escribe <span className="font-mono text-slate-300">{tenant.slug}</span> en el
                campo de abajo. Esta acción es permanente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              <Input
                value={confirmSlug}
                onChange={(e) => setConfirmSlug(e.target.value)}
                placeholder={tenant.slug}
                className="bg-slate-950 border-slate-600 text-white font-mono"
              />
            </div>
            <DialogFooter>
              <Button variant="destructive" disabled={!canDelete || loading} onClick={handleDelete}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Eliminar permanentemente"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
