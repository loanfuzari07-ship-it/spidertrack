"use client";

import { Info } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Ícone "i" com explicação em tooltip — hover no desktop, toque no celular.
 * Usado ao lado de títulos pra tirar texto explicativo fixo da tela (menos
 * poluição visual), sem esconder a informação de quem precisa dela.
 */
export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label="Mais informações"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <Info className="size-4" />
      </button>
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-0 top-full z-50 mt-2 w-64 max-w-[85vw] rounded-md border border-border bg-popover p-2.5 text-xs leading-relaxed text-popover-foreground opacity-0 shadow-md transition-opacity",
          "group-hover:opacity-100 group-focus-within:opacity-100",
          open && "opacity-100",
        )}
      >
        {text}
      </span>
    </span>
  );
}
