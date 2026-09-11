import { formatPercent } from "@/lib/format";
import type { ApprovalByMethod } from "@/lib/dashboard/queries";

/** Anel de progresso pequeno (SVG puro, sem libs) pra taxa de aprovação. */
function ApprovalRing({ rate }: { rate: number | null }) {
  const size = 40;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = rate ?? 0;
  const offset = c * (1 - pct);
  const color =
    rate == null
      ? "hsl(220 10% 45%)"
      : rate >= 0.9
        ? "hsl(150 60% 45%)"
        : rate >= 0.7
          ? "hsl(38 92% 50%)"
          : "hsl(0 72% 55%)";
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="hsl(220 12% 30% / 0.25)"
        strokeWidth={stroke}
      />
      {rate != null ? (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}

/** Linha "Método — anel — taxa" reutilizada no painel de aprovação. */
function ApprovalRow({ method }: { method: ApprovalByMethod }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium">{method.label}</span>
      <div className="flex items-center gap-3">
        <ApprovalRing rate={method.rate} />
        <span className="w-14 text-right font-mono text-sm font-semibold tabular-nums">
          {method.rate != null ? formatPercent(method.rate) : "N/A"}
        </span>
      </div>
    </div>
  );
}

/** Painel "Taxa de Aprovação" — uma linha por método de pagamento. */
export function ApprovalPanel({ methods }: { methods: ApprovalByMethod[] }) {
  return (
    <div className="flex flex-col gap-4">
      {methods.map((m) => (
        <ApprovalRow key={m.key} method={m} />
      ))}
    </div>
  );
}
