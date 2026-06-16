"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Loader2 } from "lucide-react";

interface ImpersonateButtonProps {
  tenantId: string;
  label?: string;
}

export function ImpersonateButton({ tenantId, label }: ImpersonateButtonProps) {
  const { update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await update({ impersonateTenantId: tenantId });
    router.push("/dashboard");
  }

  return (
    <Button
      size="sm"
      variant={label ? "default" : "ghost"}
      className={label
        ? "bg-purple-600 hover:bg-purple-500 text-white"
        : "text-slate-400 hover:text-white px-2"}
      onClick={handleClick}
      disabled={loading}
      title="Ver panel del cliente"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LayoutDashboard className="w-3.5 h-3.5" />}
      {label && <span>{label}</span>}
    </Button>
  );
}
