import { PageHeader } from "@/components/panel/page-header";
import { AccountFilter } from "@/components/dashboard/account-filter";
import { ApprovalPanel } from "@/components/dashboard/approval-panel";
import { PaymentDonut, RevenueChart, SalesByHourChart } from "@/components/dashboard/charts";
import { Funnel } from "@/components/dashboard/funnel";
import { SalesMap } from "@/components/dashboard/sales-map";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { RefreshBar } from "@/components/dashboard/refresh-bar";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  DashboardCustomizer,
  type DashboardBlock,
} from "@/components/panel/dashboard-customizer";
import { refreshOverview } from "./actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getApprovalByMethod,
  getChargebackStats,
  getDailySpendMap,
  getFinanceSettings,
  getFunnel,
  getOverview,
  getRevenueDaily,
  getSalesBreakdown,
  getSalesByCountry,
  getSalesByHour,
  getSalesStatusCounts,
  getSource,
  getTotalClicks,
  getTotalSpend,
} from "@/lib/dashboard/data";
import * as demo from "@/lib/demo/data";
import { parseRange } from "@/lib/dashboard/range";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { listAdAccounts } from "@/lib/dashboard/spend";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
    account?: string;
  }>;
}) {
  const sp = await searchParams;
  const range = parseRange(sp.range, sp.from, sp.to);
  const accountParam = sp.account ?? "all";
  const src = await getSource();

  const accounts = src.admin
    ? (await listAdAccounts(src.admin)).map((a) => ({
        id: a.id,
        label: a.label,
      }))
    : demo.campaigns(range).accounts;

  const [
    overview,
    revenue,
    salesGeo,
    spend,
    spendByDay,
    sales,
    salesStatus,
    funnel,
    clicks,
    chargeback,
    approval,
    salesHour,
    finance,
  ] = await Promise.all([
    getOverview(src, range),
    getRevenueDaily(src, range),
    getSalesByCountry(src, range),
    getTotalSpend(src, range, accountParam),
    getDailySpendMap(src, range, accountParam),
    getSalesBreakdown(src, range),
    getSalesStatusCounts(src, range),
    getFunnel(src, range),
    getTotalClicks(src, range, accountParam),
    getChargebackStats(src, range),
    getApprovalByMethod(src, range),
    getSalesByHour(src, range),
    getFinanceSettings(src),
  ]);

  const revenueData = revenue.map((r) => ({
    ...r,
    spend: spendByDay.get(r.day) ?? 0,
  }));

  // Faturamento líquido — receita bruta já descontada a taxa da plataforma de
  // pagamento (Hotmart/Kiwify/DigitalGoat/etc.), configurável em Configurações.
  const faturamentoLiquido = overview.revenue * (1 - finance.platformFeeRate);
  // Imposto Meta Ads continua incidindo sobre o investimento (não a receita) —
  // some só no Lucro, não no Faturamento (definido pelo usuário).
  const impostoMetaAds = spend.spend * finance.metaAdsTaxRate;
  const roas = spend.spend > 0 ? faturamentoLiquido / spend.spend : null;
  const lucro = faturamentoLiquido - spend.spend - impostoMetaAds;
  const arpu = overview.avgTicket > 0 ? overview.avgTicket : null;
  const cpaGeral =
    spend.spend > 0 && overview.purchases > 0
      ? spend.spend / overview.purchases
      : null;
  const refundBase = overview.purchases + salesStatus.refunded;
  const refundRate = refundBase > 0 ? salesStatus.refunded / refundBase : 0;

  const blocks: DashboardBlock[] = [
    {
      id: "kpis",
      title: "KPIs principais",
      node: (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Faturamento total"
            value={formatCurrency(faturamentoLiquido)}
            hint={
              finance.platformFeeRate > 0
                ? `líquido · já descontada a taxa da plataforma (${(finance.platformFeeRate * 100).toFixed(1)}%)`
                : "líquido de taxa da plataforma"
            }
          />
          <StatCard
            label="Investimento (Meta)"
            value={formatCurrency(spend.spend)}
            hint={spend.ok ? undefined : "parcial (erro em conta)"}
          />
          <StatCard
            label="ROAS"
            value={roas !== null ? `${roas.toFixed(2)}x` : "—"}
            labelClassName="text-success"
            valueClassName="text-success"
          />
          <StatCard
            label="Lucro"
            value={formatCurrency(lucro)}
            labelClassName="text-success"
            valueClassName={lucro >= 0 ? "text-success" : "text-destructive"}
          />
        </div>
      ),
    },
    {
      id: "spiderflow",
      title: "SpiderFlow — funil de conversão",
      node: (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Spider<span className="text-primary">Flow</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Funnel
              clicks={clicks.clicks}
              pageviews={funnel.pageviews}
              ics={funnel.ics}
              salesInit={funnel.salesInit}
              salesApproved={funnel.salesApproved}
            />
          </CardContent>
        </Card>
      ),
    },
    {
      id: "linha2",
      title: "ARPU / CPA médio + SpiderCountry",
      node: (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid grid-rows-2 gap-4">
            <Card className="min-w-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  ARPU
                </CardTitle>
              </CardHeader>
              <CardContent className="min-w-0">
                <div
                  title={arpu != null ? formatCurrency(arpu) : "N/A"}
                  className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[clamp(1rem,0.7rem+1.6vw,1.875rem)] font-semibold leading-tight tabular-nums"
                >
                  {arpu != null ? formatCurrency(arpu) : "N/A"}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  receita ÷ pedidos aprovados
                </p>
              </CardContent>
            </Card>

            <Card className="min-w-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  CPA médio
                </CardTitle>
              </CardHeader>
              <CardContent className="min-w-0">
                <div
                  title={cpaGeral != null ? formatCurrency(cpaGeral) : "N/A"}
                  className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[clamp(1rem,0.7rem+1.6vw,1.875rem)] font-semibold leading-tight tabular-nums"
                >
                  {cpaGeral != null ? formatCurrency(cpaGeral) : "N/A"}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  investimento ÷ pedidos aprovados
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <SalesMap data={salesGeo} />
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      id: "linha3",
      title: "Vendas por produto / Taxa de aprovação / Vendas por pagamento",
      node: (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vendas por produto</CardTitle>
            </CardHeader>
            <CardContent>
              {sales.byProduct.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Sem vendas no período.
                </p>
              ) : (
                <ul className="space-y-3">
                  {sales.byProduct.map((p, i) => {
                    const pct =
                      sales.total > 0 ? (p.count / sales.total) * 100 : 0;
                    return (
                      <li key={p.key} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="min-w-0 truncate font-medium">
                            {p.label}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 font-mono tabular-nums",
                              i === 0 ? "text-success" : "text-foreground",
                            )}
                          >
                            {formatCurrency(p.revenue)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-24 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                            {formatNumber(p.count)} · {pct.toFixed(1)}%
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Taxa de Aprovação</CardTitle>
            </CardHeader>
            <CardContent>
              <ApprovalPanel methods={approval} />
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="text-base">Vendas por pagamento</CardTitle>
            </CardHeader>
            <CardContent className="min-w-0">
              <PaymentDonut data={sales.byPayment} total={sales.total} />
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      id: "linha4",
      title: "Chargeback / Vendas pendentes / Vendas reembolsadas / Imposto Meta Ads",
      node: (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Chargeback"
            value={formatPercent(chargeback.rate)}
            hint={
              chargeback.count > 0
                ? `${formatNumber(chargeback.count)} caso(s) · ${formatCurrency(chargeback.value)}`
                : "sem casos no período"
            }
            valueClassName={chargeback.rate > 0.02 ? "text-destructive" : undefined}
          />
          <StatCard
            label="Vendas pendentes"
            value={formatCurrency(salesStatus.pendingValue)}
            hint={`${formatNumber(salesStatus.pending)} venda(s) aguardando`}
          />
          <StatCard
            label="Vendas reembolsadas"
            value={formatPercent(refundRate)}
            hint={`${formatNumber(salesStatus.refunded)} venda(s) · ${formatCurrency(salesStatus.refundedValue)} devolvidos`}
          />
          <StatCard
            label="Imposto Meta Ads"
            value={formatCurrency(impostoMetaAds)}
            hint={`${(finance.metaAdsTaxRate * 100).toFixed(1)}% do investimento`}
          />
        </div>
      ),
    },
    {
      id: "linha5",
      title: "Vendas por Horário",
      node: (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendas por Horário</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesByHourChart data={salesHour} />
          </CardContent>
        </Card>
      ),
    },
    {
      id: "receita",
      title: "Receita × investimento no período",
      node: (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Receita × investimento no período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueData} />
          </CardContent>
        </Card>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Visão geral" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <PeriodSelector current={range.key} />
          {accounts.length > 1 ? (
            <AccountFilter current={accountParam} accounts={accounts} />
          ) : null}
        </div>
        <RefreshBar fetchedAt={spend.fetchedAt} action={refreshOverview} />
      </div>

      <DashboardCustomizer blocks={blocks} storageKey="spidertrack:dashboard-inicio:v1" />
    </div>
  );
}
