"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { refreshTimeAgoLabel } from "@/lib/dashboard/refresh-label";

/**
 * Indicador "Atualizado há X min" + botão "Atualizar" que dispara uma Server
 * Action (revalida o cache de insights da Meta sob demanda). Cliente (não só
 * `<form action>`) pra dar feedback visível na hora — spinner + toast —
 * mesmo quando o resultado não muda nada na tela (ex.: sem conta ativa).
 */
export function RefreshBar({
  fetchedAt,
  action,
  showLabel = true,
}: {
  /** `null` quando não há nenhuma conta de anúncio ativa ainda. */
  fetchedAt: number | null;
  action: () => Promise<void>;
  /** `false` quando a tela já mostra "Atualizado há X min" em outro lugar
   *  (ex.: embaixo do título no mobile) — aí só o botão é renderizado aqui. */
  showLabel?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function onRefresh() {
    startTransition(async () => {
      try {
        await action();
        toast.success("Dados atualizados.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha ao atualizar.");
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      {showLabel ? (
        <span className="text-xs text-muted-foreground">
          {refreshTimeAgoLabel(fetchedAt)}
        </span>
      ) : null}
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={onRefresh}
        className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <RefreshCw className="size-4" />
        )}
        {pending ? "Atualizando…" : "Atualizar"}
      </Button>
    </div>
  );
}
