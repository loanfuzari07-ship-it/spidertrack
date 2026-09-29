import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { cn } from "@/lib/utils";

/** Cartão de KPI (número tabular grande + rótulo; ícone opcional). */
export function StatCard({
  label,
  value,
  hint,
  info,
  icon: Icon,
  accent = "text-primary",
  labelClassName,
  valueClassName,
}: {
  label: string;
  value: string;
  /** Texto pequeno fixo embaixo do valor (dado dinâmico, ex.: contagem). */
  hint?: string;
  /** Explicação do que é o KPI — vira um ícone "i" no canto, só aparece ao tocar. */
  info?: string;
  icon?: LucideIcon;
  accent?: string;
  labelClassName?: string;
  valueClassName?: string;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle
          className={cn(
            "truncate text-sm font-medium text-muted-foreground",
            labelClassName,
          )}
        >
          {label}
        </CardTitle>
        <div className="flex shrink-0 items-center gap-1.5">
          {info ? <InfoTooltip text={info} /> : null}
          {Icon ? <Icon className={`size-4 shrink-0 ${accent}`} /> : null}
        </div>
      </CardHeader>
      <CardContent className="min-w-0">
        <div
          title={value}
          className={cn(
            "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[clamp(1rem,0.7rem+1.6vw,1.875rem)] font-semibold leading-tight tabular-nums",
            valueClassName,
          )}
        >
          {value}
        </div>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
