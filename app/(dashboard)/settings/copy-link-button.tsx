"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback silencioso: en contextos no-HTTPS el clipboard puede no estar disponible
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="border-slate-600 text-slate-300 shrink-0 min-w-[90px]"
    >
      {copied ? (
        <><Check className="w-3.5 h-3.5 text-green-400" /> Copiado</>
      ) : (
        <><Copy className="w-3.5 h-3.5" /> Copiar</>
      )}
    </Button>
  );
}
