import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** "agora mesmo" / "há 1 min" / "há 12 min" a partir de um timestamp (ms). */
function timeAgoLabel(fetchedAt: number | null): string {
  if (fetchedAt == null) return "";
  const minutes = Math.max(0, Math.round((Date.now() - fetchedAt) / 60_000));
  if (minutes < 1) return "Atualizado agora mesmo";
  if (minutes === 1) return "Atualizado há 1 min";
  return `Atualizado há ${minutes} min`;
}

/**
 * Indicador "Atualizado há X min" + botão verde "Atualizar" que dispara uma
 * Server Action (revalida o cache de insights da Meta sob demanda). Usado em
 * qualquer página cujos dados dependam do cache de ~30 min da API da Meta.
 */
export function RefreshBar({
  fetchedAt,
  action,
}: {
  /** `null` quando não há nenhuma conta de anúncio ativa ainda. */
  fetchedAt: number | null;
  action: () => Promise<void>;
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      {fetchedAt != null ? (
        <span className="text-xs text-muted-foreground">
          {timeAgoLabel(fetchedAt)}
        </span>
      ) : null}
      <form action={action}>
        <Button
          type="submit"
          size="sm"
          className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCw className="size-4" />
          Atualizar
        </Button>
      </form>
    </div>
  );
}
