"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react";

interface ImpersonationBannerProps {
  impersonating: boolean;
  tenantName: string;
}

export function ImpersonationBanner({ impersonating, tenantName }: ImpersonationBannerProps) {
  const { update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!impersonating) return null;

  async function handleExit() {
    setLoading(true);
    await update({ exitImpersonation: true });
    router.push("/admin");
  }

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-sm">
      <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0" />
      <span className="text-purple-200">
        Viendo el panel de <span className="font-semibold text-white">{tenantName}</span> como Super Admin
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="text-purple-300 hover:text-white h-7 px-2"
        onClick={handleExit}
        disabled={loading}
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><ArrowLeft className="w-3.5 h-3.5" /> Volver a Super Admin</>}
      </Button>
    </div>
  );
}
