import { Construction } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/panel/info-tooltip";

/** Cabeçalho padrão das páginas do painel. Só título + ação — sem subtítulo
 *  fixo. Use `info` pra uma explicação em tooltip (ícone "i" ao lado do
 *  título) quando a página precisar de contexto extra. */
export function PageHeader({
  title,
  info,
  action,
}: {
  title: string;
  /** Mantido por compatibilidade com chamadas existentes; não é mais exibido. */
  description?: string;
  /** Explicação em tooltip, mostrada num ícone "i" ao lado do título. */
  info?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {info ? <InfoTooltip text={info} /> : null}
      </div>
      {action}
    </div>
  );
}

/** Aviso de seção ainda não construída (páginas de fases futuras). */
export function ComingSoon({ phase }: { phase: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/70 p-10 text-center">
      <div className="flex size-11 items-center justify-center rounded-md bg-accent-amber/15 text-accent-amber">
        <Construction className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">Em construção</p>
        <p className="text-sm text-muted-foreground">
          Esta seção será implementada na {phase}.
        </p>
      </div>
      <Badge variant="warning">{phase}</Badge>
    </div>
  );
}
