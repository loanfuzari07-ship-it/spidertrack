import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Cartão de KPI (número tabular grande + rótulo; ícone opcional). */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "text-primary",
  labelClassName,
  valueClassName,
}: {
  label: string;
  value: string;
  hint?: string;
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
        {Icon ? (
          <Icon className={`size-4 shrink-0 ${accent}`} />
        ) : null}
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
