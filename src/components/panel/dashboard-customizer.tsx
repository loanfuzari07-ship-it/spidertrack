"use client";

import { GripVertical, LayoutGrid, RotateCcw, Settings2 } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DashboardItemSpan = "sm" | "lg" | "full";

export interface DashboardBlock {
  id: string;
  title: string;
  node: ReactNode;
  /** Largura do item na grade. "sm" (padrão) = 1 coluna — cartões de número.
   *  "lg" = metade da largura no desktop — cartões de conteúdo (listas,
   *  mapa, funil). "full" = a tela inteira — gráficos de série temporal. */
  span?: DashboardItemSpan;
}

const SPAN_CLASS: Record<DashboardItemSpan, string> = {
  sm: "",
  lg: "sm:col-span-2",
  full: "sm:col-span-2 lg:col-span-4",
};

/**
 * Envolve os blocos de uma tela e permite reordená-los arrastando (modo
 * "Personalizar"). A ordem é salva só no navegador (localStorage) — é uma
 * preferência de exibição, não dado do negócio.
 */
export function DashboardCustomizer({
  blocks,
  storageKey,
}: {
  blocks: DashboardBlock[];
  storageKey: string;
}) {
  const defaultOrder = blocks.map((b) => b.id);
  const [order, setOrder] = useState<string[]>(defaultOrder);
  const [editing, setEditing] = useState(false);
  const dragId = useRef<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as unknown;
      // Só aplica se a ordem salva tiver exatamente o mesmo conjunto de blocos
      // de hoje — evita ordem "quebrada" depois que a tela ganha/perde um bloco.
      if (
        Array.isArray(saved) &&
        saved.length === defaultOrder.length &&
        defaultOrder.every((id) => saved.includes(id))
      ) {
        // A ordem só existe no localStorage do navegador (não dá pra saber no
        // servidor) — sincronizar depois de montar é a forma correta aqui,
        // mesmo que a regra normalmente desencoraje setState em efeito.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOrder(saved as string[]);
      }
    } catch {
      // localStorage indisponível (aba anônima etc.) — segue com a ordem padrão.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function persist(next: string[]) {
    setOrder(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // preferência só não persiste nesse navegador — segue funcionando.
    }
  }

  function moveTo(targetId: string) {
    const from = dragId.current;
    dragId.current = null;
    if (!from || from === targetId) return;
    const next = [...order];
    const fromIdx = next.indexOf(from);
    const toIdx = next.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, from);
    persist(next);
  }

  const byId = new Map(blocks.map((b) => [b.id, b]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        {editing ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => persist(defaultOrder)}
              className="gap-1.5 text-muted-foreground"
            >
              <RotateCcw className="size-3.5" />
              Restaurar padrão
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setEditing(false)}
              className="gap-1.5"
            >
              <LayoutGrid className="size-3.5" />
              Concluir
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            className="gap-1.5"
          >
            <Settings2 className="size-3.5" />
            Personalizar
          </Button>
        )}
      </div>

      {editing ? (
        <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
          Arraste cada item pela alça pra reordenar — dá pra trocar só dois
          cards de lugar, sem mudar o resto da tela. A ordem fica salva só
          neste navegador.
        </p>
      ) : null}

      <div className="grid auto-rows-min grid-flow-row-dense grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {order.map((id) => {
          const block = byId.get(id);
          if (!block) return null;
          const span = block.span ?? "sm";
          return (
            <div
              key={id}
              draggable={editing}
              onDragStart={(e) => {
                dragId.current = id;
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                if (editing) e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                moveTo(id);
              }}
              className={cn(
                "min-w-0 rounded-lg transition",
                SPAN_CLASS[span],
                editing &&
                  "cursor-grab ring-1 ring-dashed ring-border/70 active:cursor-grabbing",
              )}
            >
              {editing ? (
                <div className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                  <GripVertical className="size-3.5 shrink-0" />
                  <span className="truncate">{block.title}</span>
                </div>
              ) : null}
              {block.node}
            </div>
          );
        })}
      </div>
    </div>
  );
}
