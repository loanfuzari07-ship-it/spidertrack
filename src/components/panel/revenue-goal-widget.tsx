import { Rocket } from "lucide-react";
import { formatCurrencyCompact } from "@/lib/format";

// Metas em ordem — ao bater uma, a barra "reseta" (a % passa a ser calculada
// contra a meta seguinte, que é maior) e a cor muda, dando a sensação de novo
// nível. De 1M em diante sobe de 1 em 1 milhão até 10M.
const MILESTONES = [
  100_000, 250_000, 500_000, 1_000_000, 2_000_000, 3_000_000, 4_000_000,
  5_000_000, 6_000_000, 7_000_000, 8_000_000, 9_000_000, 10_000_000,
];

// Uma cor por nível — cicla se algum dia passar de 10M (não deveria acontecer
// já que 10M é o teto da lista, mas evita `undefined` se a lista mudar).
const TIER_COLORS = [
  "hsl(217 91% 60%)", // azul
  "hsl(190 90% 50%)", // ciano
  "hsl(142 70% 45%)", // verde
  "hsl(38 92% 55%)", // âmbar
  "hsl(280 70% 62%)", // roxo
  "hsl(340 75% 58%)", // rosa
];

/** Placar de metas de faturamento vitalício, para a lateral do painel. */
export function RevenueGoalWidget({ revenue }: { revenue: number }) {
  const tierIndex = MILESTONES.findIndex((m) => revenue < m);
  const atMax = tierIndex === -1;
  const target = atMax ? MILESTONES[MILESTONES.length - 1] : MILESTONES[tierIndex];
  const colorIdx = atMax ? MILESTONES.length - 1 : tierIndex;
  const color = TIER_COLORS[colorIdx % TIER_COLORS.length];
  const pct = Math.min(100, target > 0 ? (revenue / target) * 100 : 0);

  return (
    <div className="rounded-lg border border-border/70 bg-card/40 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Rocket className="size-3.5" style={{ color }} />
        Faturamento rastreado
      </div>
      <p className="mt-1.5 font-mono text-lg font-bold tabular-nums">
        {formatCurrencyCompact(revenue)}
        <span className="text-sm font-medium text-muted-foreground">
          {" "}
          / {formatCurrencyCompact(target)}
        </span>
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {atMax
          ? "meta máxima atingida 🎉"
          : `${pct.toFixed(0)}% até ${formatCurrencyCompact(target)}`}
      </p>
    </div>
  );
}
