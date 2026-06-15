"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar, Users, LayoutDashboard, Settings,
  Zap, LogOut, Building2, Plus, ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

const tenantNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/appointments", label: "Citas", icon: Calendar },
  { href: "/clients", label: "Clientes / CRM", icon: Users },
  { href: "/automations", label: "Automatizaciones", icon: Zap },
  { href: "/settings", label: "Configuración", icon: Settings },
];

const superAdminNavItems = [
  { href: "/admin", label: "Panel global", icon: LayoutDashboard },
  { href: "/admin/tenants/new", label: "Nuevo cliente", icon: Plus },
];

interface SidebarProps {
  tenant: {
    name: string;
    logoUrl?: string | null;
    primaryColor?: string;
    slug: string;
  };
  user: {
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  };
  role?: string;
  impersonating?: boolean;
}

export function Sidebar({ tenant, user, role, impersonating }: SidebarProps) {
  const pathname = usePathname();

  const isSuperAdminMode = role === "SUPER_ADMIN" && !impersonating;

  const items = isSuperAdminMode
    ? superAdminNavItems
    : role === "SUPER_ADMIN"
      ? [...tenantNavItems, { href: "/admin", label: "Super Admin", icon: Building2 }]
      : tenantNavItems;

  return (
    <aside className="flex flex-col w-64 h-screen bg-slate-950 border-r border-slate-800 sticky top-0 shrink-0">
      {/* Logo / Tenant */}
      <div className="p-5 border-b border-slate-800">
        {isSuperAdminMode ? (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-purple-600 text-white text-xs font-bold">
              SA
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm">AgendaPro</p>
              <p className="text-slate-500 text-xs">Panel de control</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {impersonating && (
              <Link href="/admin" className="text-slate-500 hover:text-purple-400 transition-colors mr-1" title="Volver al panel">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            )}
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.name} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: tenant.primaryColor || "#6366f1" }}
              >
                {getInitials(tenant.name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{tenant.name}</p>
              <p className="text-slate-500 text-xs truncate font-mono">/booking/{tenant.slug}</p>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-purple-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatarUrl || undefined} />
            <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
              {getInitials(user.name || user.email || "U")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user.name}</p>
            <p className="text-slate-500 text-xs truncate">{user.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-slate-500 hover:text-red-400 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
