"use client";

import { Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Ícone de informação (canto do card) que mostra uma explicação curta num
 * balão só quando tocado/clicado — substitui os subtítulos fixos embaixo do
 * valor. Funciona em mobile (toque) e desktop (clique); fecha ao tocar fora
 * ou apertar Esc.
 */
export function InfoTooltip({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative inline-flex shrink-0", className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Mais informações"
        aria-expanded={open}
        className="flex size-5 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground"
      >
        <Info className="size-3.5" />
      </button>
      {open ? (
        <div
          role="tooltip"
          className="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-md border border-border bg-popover p-2.5 text-xs leading-snug text-popover-foreground shadow-md"
        >
          {text}
        </div>
      ) : null}
    </div>
  );
}
