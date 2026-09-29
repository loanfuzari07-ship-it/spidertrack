"use client";

import { GripVertical, LayoutGrid, RotateCcw, Settings2 } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

interface DragState {
  sectionId: string;
  id: string;
  title: string;
  pointerId: number;
  startX: number;
  startY: number;
  /** Só vira drag de verdade depois de passar de um limiar de movimento —
   *  evita sequestrar um toque/clique simples (ex.: no ícone de info). */
  moved: boolean;
}

/**
 * Envolve as seções de uma tela e permite reordenar os itens DENTRO de cada
 * uma arrastando (modo "Personalizar"). A ordem é salva só no navegador
 * (localStorage) — é uma preferência de exibição, não dado do negócio.
 *
 * Usa Pointer Events (não o drag-and-drop nativo do HTML5, que não funciona
 * por toque na maioria dos navegadores mobile) — assim o mesmo código
 * arrasta livremente tanto no mouse (desktop) quanto no dedo (celular).
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

  // Estado do arrasto em andamento. `dragStateRef` guarda os dados "vivos"
  // (lidos/escritos a cada pointermove, sem re-render); os três `useState`
  // abaixo só mudam quando algo *visível* muda (começou a arrastar, mudou o
  // alvo de soltar) — mantém a UI fluida sem re-renderizar a grade inteira
  // a cada pixel de movimento.
  const dragStateRef = useRef<DragState | null>(null);
  const dropTargetRef = useRef<string | null>(null);
  const itemElsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const sectionElsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const floatingElRef = useRef<HTMLDivElement>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingTitle, setDraggingTitle] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  // Botão "Personalizar" mora no header global (barrinha do alternador de
  // tema), fora da árvore desta página — usamos um portal pro elemento com
  // esse id, criado pelo `PanelShell`. Só existe no navegador, por isso o
  // estado começa `null` e é preenchido depois de montar.
  const [personalizarSlot, setPersonalizarSlot] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    // O elemento só existe no DOM do navegador (renderizado pelo
    // `PanelShell`) — ler e sincronizar depois de montar é o caso correto
    // aqui, mesmo que a regra normalmente desencoraje setState em efeito.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPersonalizarSlot(document.getElementById("dashboard-personalizar-slot"));
  }, []);

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

  function moveTo(sectionId: string, dragId: string, targetId: string) {
    if (dragId === targetId) return;
    setOrders((prev) => {
      const order = prev[sectionId] ?? [];
      const fromIdx = order.indexOf(dragId);
      const toIdx = order.indexOf(targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const nextOrder = [...order];
      nextOrder.splice(fromIdx, 1);
      nextOrder.splice(toIdx, 0, dragId);
      const next = { ...prev, [sectionId]: nextOrder };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // preferência só não persiste nesse navegador — segue funcionando.
      }
      return next;
    });
  }

  function registerItemEl(id: string, node: HTMLDivElement | null) {
    if (node) itemElsRef.current.set(id, node);
    else itemElsRef.current.delete(id);
  }

  function registerSectionEl(id: string, node: HTMLDivElement | null) {
    if (node) sectionElsRef.current.set(id, node);
    else sectionElsRef.current.delete(id);
  }

  function handlePointerDown(
    e: React.PointerEvent<HTMLDivElement>,
    sectionId: string,
    id: string,
    title: string,
  ) {
    if (!editing) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragStateRef.current = {
      sectionId,
      id,
      title,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
  }

  function findDropTarget(sectionId: string, dragId: string, x: number, y: number) {
    const container = sectionElsRef.current.get(sectionId);
    if (!container) return null;
    let bestId: string | null = null;
    let bestDist = Infinity;
    for (const [id, node] of itemElsRef.current) {
      if (id === dragId || !container.contains(node)) continue;
      const r = node.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        return id;
      }
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dist = Math.hypot(x - cx, y - cy);
      if (dist < bestDist) {
        bestDist = dist;
        bestId = id;
      }
    }
    return bestId;
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const ds = dragStateRef.current;
    if (!ds || e.pointerId !== ds.pointerId) return;

    if (!ds.moved) {
      const dx = e.clientX - ds.startX;
      const dy = e.clientY - ds.startY;
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      ds.moved = true;
      try {
        e.currentTarget.setPointerCapture?.(ds.pointerId);
      } catch {
        // Pointer já pode ter sido liberado (ex.: gesto sintético/edge case
        // do navegador) — não é fatal, o arrasto continua funcionando pelos
        // eventos que ainda chegarem normalmente.
      }
      setDraggingId(ds.id);
      setDraggingTitle(ds.title);
    }

    e.preventDefault();
    const fl = floatingElRef.current;
    if (fl) {
      fl.style.transform = `translate3d(${e.clientX + 16}px, ${e.clientY + 16}px, 0)`;
    }

    const target = findDropTarget(ds.sectionId, ds.id, e.clientX, e.clientY);
    if (target !== dropTargetRef.current) {
      dropTargetRef.current = target;
      setDropTargetId(target);
    }
  }

  function finishDrag(e: React.PointerEvent<HTMLDivElement>) {
    const ds = dragStateRef.current;
    if (!ds || e.pointerId !== ds.pointerId) return;
    dragStateRef.current = null;
    const targetId = dropTargetRef.current;
    dropTargetRef.current = null;
    setDropTargetId(null);
    setDraggingId(null);
    setDraggingTitle(null);
    if (ds.moved && targetId) {
      moveTo(ds.sectionId, ds.id, targetId);
    }
  }

  function cancelDrag() {
    dragStateRef.current = null;
    dropTargetRef.current = null;
    setDropTargetId(null);
    setDraggingId(null);
    setDraggingTitle(null);
  }

  // Botão só-ícone que mora no header global, ao lado do alternador de
  // tema — o usuário já sabe pra que serve, por isso sem rótulo.
  const personalizarButton = (
    <Button
      type="button"
      variant={editing ? "secondary" : "ghost"}
      size="icon"
      onClick={() => setEditing((e) => !e)}
      aria-label={editing ? "Sair do modo personalizar" : "Personalizar"}
      title="Personalizar"
    >
      <Settings2 className="size-4" />
    </Button>
  );

  return (
    <div className="space-y-6">
      {personalizarSlot ? createPortal(personalizarButton, personalizarSlot) : null}

      {/* Card "fantasma" que segue o dedo/cursor durante o arrasto — some
          sozinho quando o toque termina, já que só é montado enquanto
          `draggingId` existe. */}
      {draggingId
        ? createPortal(
            <div
              ref={floatingElRef}
              className="pointer-events-none fixed left-0 top-0 z-[100] flex max-w-[70vw] items-center gap-1.5 rounded-md border border-primary bg-popover px-3 py-2 text-xs font-medium text-popover-foreground shadow-lg"
              style={{ willChange: "transform" }}
            >
              <GripVertical className="size-3.5 shrink-0 text-primary" />
              <span className="truncate">{draggingTitle}</span>
            </div>,
            document.body,
          )
        : null}

      {editing ? (
        <div className="flex items-center justify-end gap-2">
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
        </div>
      ) : null}

      {editing ? (
        <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
          Toque e segure (ou clique e arraste no computador) um cartão pela
          alça pra movê-lo pra qualquer posição — solte em cima de outro
          lugar da grade. A ordem fica salva só neste navegador.
        </p>
      ) : null}

      {sections.map((section) => {
        const byId = new Map(section.blocks.map((b) => [b.id, b]));
        const order = orders[section.id] ?? section.blocks.map((b) => b.id);
        return (
          <div
            key={section.id}
            ref={(node) => registerSectionEl(section.id, node)}
            className="grid auto-rows-min grid-flow-row-dense grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4"
          >
            {order.map((id) => {
              const block = byId.get(id);
              if (!block) return null;
              const span = block.span ?? "sm";
              const isDragging = draggingId === id;
              const isDropTarget = dropTargetId === id && draggingId !== id;
              return (
                <div
                  key={id}
                  ref={(node) => registerItemEl(id, node)}
                  onPointerDown={(e) =>
                    handlePointerDown(e, section.id, id, block.title)
                  }
                  onPointerMove={handlePointerMove}
                  onPointerUp={finishDrag}
                  onPointerCancel={cancelDrag}
                  style={editing ? { touchAction: "none" } : undefined}
                  className={cn(
                    "flex min-w-0 flex-col rounded-lg transition",
                    SPAN_CLASS[span],
                    editing &&
                      "cursor-grab select-none ring-1 ring-dashed ring-border/70 active:cursor-grabbing",
                    isDragging && "opacity-40",
                    isDropTarget &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-background",
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
