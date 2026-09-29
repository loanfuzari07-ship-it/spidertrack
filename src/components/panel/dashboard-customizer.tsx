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
   *  mapa). "full" = a tela inteira — funil e gráficos de série temporal. */
  span?: DashboardItemSpan;
}

/**
 * Um grupo de blocos com a MESMA "forma" (todo mundo cartão de número, ou
 * todo mundo cartão de conteúdo) — arrastar dentro de um grupo NUNCA deixa
 * buraco, porque o grupo é dimensionado pra fechar sozinho. Cada tela define
 * seus grupos (normalmente: "números" em cima, "conteúdo" embaixo).
 */
export interface DashboardSection {
  id: string;
  blocks: DashboardBlock[];
}

// No mobile a grade é de 1 coluna só (1 card por linha — ver container
// abaixo), então "col-span-2" nem faz efeito ali (o navegador limita ao
// número de colunas que existe); a partir do "sm" (2 colunas) e "lg" (4
// colunas) que os tamanhos "lg"/"full" realmente entram em ação.
const SPAN_CLASS: Record<DashboardItemSpan, string> = {
  sm: "",
  lg: "col-span-2",
  full: "col-span-2 lg:col-span-4",
};

function defaultOrders(sections: DashboardSection[]): Record<string, string[]> {
  return Object.fromEntries(
    sections.map((s) => [s.id, s.blocks.map((b) => b.id)]),
  );
}

/**
 * Envolve as seções de uma tela e permite reordenar os itens DENTRO de cada
 * uma arrastando (modo "Personalizar"). A ordem é salva só no navegador
 * (localStorage) — é uma preferência de exibição, não dado do negócio.
 */
export function DashboardCustomizer({
  sections,
  storageKey,
}: {
  sections: DashboardSection[];
  storageKey: string;
}) {
  const [orders, setOrders] = useState<Record<string, string[]>>(() =>
    defaultOrders(sections),
  );
  const [editing, setEditing] = useState(false);
  const dragRef = useRef<{ section: string; id: string } | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as unknown;
      if (!saved || typeof saved !== "object") return;
      const savedMap = saved as Record<string, unknown>;
      const next: Record<string, string[]> = {};
      let anyValid = false;
      for (const section of sections) {
        const def = section.blocks.map((b) => b.id);
        const candidate = savedMap[section.id];
        // Só aplica se a ordem salva tiver exatamente o mesmo conjunto de
        // blocos de hoje — evita ordem "quebrada" depois que a tela ganha/
        // perde um bloco.
        if (
          Array.isArray(candidate) &&
          candidate.length === def.length &&
          def.every((id) => candidate.includes(id))
        ) {
          next[section.id] = candidate as string[];
          anyValid = true;
        } else {
          next[section.id] = def;
        }
      }
      if (anyValid) {
        // A ordem só existe no localStorage do navegador (não dá pra saber
        // no servidor) — sincronizar depois de montar é a forma correta
        // aqui, mesmo que a regra normalmente desencoraje setState em efeito.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOrders(next);
      }
    } catch {
      // localStorage indisponível (aba anônima etc.) — segue com a ordem padrão.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function persist(next: Record<string, string[]>) {
    setOrders(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // preferência só não persiste nesse navegador — segue funcionando.
    }
  }

  function moveTo(sectionId: string, targetId: string) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.section !== sectionId || drag.id === targetId) return;
    const order = orders[sectionId] ?? [];
    const fromIdx = order.indexOf(drag.id);
    const toIdx = order.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const nextOrder = [...order];
    nextOrder.splice(fromIdx, 1);
    nextOrder.splice(toIdx, 0, drag.id);
    persist({ ...orders, [sectionId]: nextOrder });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        {editing ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => persist(defaultOrders(sections))}
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

      {sections.map((section) => {
        const byId = new Map(section.blocks.map((b) => [b.id, b]));
        const order = orders[section.id] ?? section.blocks.map((b) => b.id);
        return (
          <div
            key={section.id}
            className="grid auto-rows-min grid-flow-row-dense grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4"
          >
            {order.map((id) => {
              const block = byId.get(id);
              if (!block) return null;
              const span = block.span ?? "sm";
              return (
                <div
                  key={id}
                  draggable={editing}
                  onDragStart={(e) => {
                    dragRef.current = { section: section.id, id };
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    if (editing) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    moveTo(section.id, id);
                  }}
                  className={cn(
                    "flex min-w-0 flex-col rounded-lg transition",
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
                  {/* "min-h-0 [&>*]:h-full" faz o card (filho único aqui)
                      esticar até a altura da célula da grade — sem isso,
                      quando um vizinho na mesma linha é mais alto (ex.: funil
                      ao lado de ARPU/CPA), o card curto fica "flutuando" no
                      topo e sobra um vão em branco visível por baixo dele. */}
                  <div className="min-h-0 flex-1 [&>*]:h-full">
                    {block.node}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
