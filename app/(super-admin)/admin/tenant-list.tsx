"use client";

import { useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Search } from "lucide-react";
import { SECTOR_LABELS } from "@/lib/utils";
import { ImpersonateButton } from "./impersonate-button";

function getBookingUrl(slug: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${appUrl}/booking/${slug}`;
}

interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  sector: string;
  plan: string;
  isActive: boolean;
  primaryColor: string;
  _count: { users: number; appointments: number };
}

interface TenantListProps {
  tenants: TenantListItem[];
}

export function TenantList({ tenants: initialTenants }: TenantListProps) {
  const [tenants, setTenants] = useState(initialTenants);
  const [search, setSearch] = useState("");

  const filtered = tenants.filter((tenant) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return tenant.name.toLowerCase().includes(q) || tenant.slug.toLowerCase().includes(q);
  });

  async function handleToggleActive(tenantId: string, isActive: boolean) {
    const previous = tenants;
    setTenants((prev) => prev.map((t) => (t.id === tenantId ? { ...t, isActive } : t)));
    try {
      await axios.patch(`/api/tenants/${tenantId}`, { isActive });
    } catch {
      setTenants(previous);
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o slug..."
          className="bg-slate-900 border-slate-700 text-white pl-9"
        />
      </div>

      <div className="divide-y divide-slate-700">
        {filtered.map((tenant) => (
          <div key={tenant.id} className="flex items-center gap-4 py-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ backgroundColor: tenant.primaryColor }}
            >
              {tenant.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-medium">{tenant.name}</p>
                <button
                  type="button"
                  onClick={() => handleToggleActive(tenant.id, !tenant.isActive)}
                  title={tenant.isActive ? "Suspender tenant" : "Activar tenant"}
                >
                  <Badge variant={tenant.isActive ? "success" : "secondary"} className="text-xs cursor-pointer">
                    {tenant.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </button>
                <Badge variant="outline" className="text-xs text-slate-400 border-slate-600">
                  {tenant.plan}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-slate-400 text-xs font-mono">/booking/{tenant.slug}</span>
                <span className="text-slate-500 text-xs">·</span>
                <span className="text-slate-400 text-xs">{SECTOR_LABELS[tenant.sector] || tenant.sector}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right hidden md:block">
                <p className="text-slate-300 text-xs">{tenant._count.users} usuarios</p>
                <p className="text-slate-400 text-xs">{tenant._count.appointments} citas</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/tenants/${tenant.id}`}>
                  <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 text-xs">
                    Gestionar
                  </Button>
                </Link>
                <ImpersonateButton tenantId={tenant.id} />
                <a href={getBookingUrl(tenant.slug)} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-8">No se encontraron tenants.</p>
        )}
      </div>
    </div>
  );
}
