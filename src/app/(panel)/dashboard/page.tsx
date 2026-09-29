import { AccountFilter } from "@/components/dashboard/account-filter";
import { ApprovalPanel } from "@/components/dashboard/approval-panel";
import { PaymentDonut, RevenueChart, SalesByHourChart } from "@/components/dashboard/charts";
import { Funnel } from "@/components/dashboard/funnel";
import { OfertaFilter } from "@/components/dashboard/oferta-filter";
import { ProductFilter } from "@/components/dashboard/product-filter";
import { SalesMap } from "@/components/dashboard/sales-map";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { RefreshBar } from "@/components/dashboard/refresh-bar";
import { refreshTimeAgoLabel } from "@/lib/dashboard/refresh-label";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  DashboardCustomizer,
  type DashboardBlock,
  type DashboardSection,
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
  getOfertaMaps,
  getOverview,
  getProductOptions,
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
    oferta?: string;
    product?: string;
  }>;
}) {
  const sp = await searchParams;
  const range = parseRange(sp.range, sp.from, sp.to);
  const accountParam = sp.account ?? "all";
  const ofertaParam = sp.oferta ?? "all";
  const productParam = sp.product ?? "all";
  const src = await getSource();

  const accounts = src.admin
    ? (await listAdAccounts(src.admin)).map((a) => ({
        id: a.id,
        label: a.label,
      }))
    : demo.campaigns(range).accounts;

  // Monta o mapa campanha→oferta uma vez (revenue por oferta + gasto por oferta
  // usam o mesmo mapa; ver aba Ofertas). "Todas as ofertas" = sem filtro.
  const ofertaMaps = await getOfertaMaps(src, range);
  const ofertaOptions = [...new Set(ofertaMaps.revenue.keys())].sort((a, b) =>
    a.localeCompare(b),
  );
  const productOptions = await getProductOptions(src, range);
  const campaignKeysForOferta =
    ofertaParam !== "all"
      ? new Set(
          [...ofertaMaps.campaignOferta.entries()]
            .filter(([, o]) => o === ofertaParam)
            .map(([k]) => k),
        )
      : null;

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
    getOverview(src, range, ofertaParam, productParam),
    getRevenueDaily(src, range, ofertaParam, productParam),
    getSalesByCountry(src, range, ofertaParam, productParam),
    getTotalSpend(src, range, accountParam, campaignKeysForOferta),
    getDailySpendMap(src, range, accountParam, campaignKeysForOferta),
    getSalesBreakdown(src, range, ofertaParam, productParam),
    getSalesStatusCounts(src, range, ofertaParam, productParam),
    getFunnel(src, range, ofertaParam, campaignKeysForOferta, productParam),
    getTotalClicks(src, range, accountParam, campaignKeysForOferta),
    getChargebackStats(src, range, ofertaParam, productParam),
    getApprovalByMethod(src, range, ofertaParam, productParam),
    getSalesByHour(src, range, ofertaParam, productParam),
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

  // Duas grades separadas: "kpiBlocks" (cartões de número, todos do mesmo
  // tamanho — arrastar em qualquer ordem/quantidade nunca deixa buraco) e
  // "contentBlocks" (funil, mapa, listas e gráficos, maiores). Misturar os
  // dois tamanhos numa única grade "inteligente" foi o que causava os vãos
  // em branco reportados — grades de tamanho uniforme não têm esse problema.
  const kpiBlocks: DashboardBlock[] = [
    {
      id: "faturamento",
      title: "Faturamento total",
      node: (
        <StatCard
          label="Faturamento total"
          value={formatCurrency(faturamentoLiquido)}
          hint={
            finance.platformFeeRate > 0
              ? `líquido · já descontada a taxa da plataforma (${(finance.platformFeeRate * 100).toFixed(1)}%)`
              : "líquido de taxa da plataforma"
          }
        />
      ),
    },
    {
      id: "investimento",
      title: "Investimento (Meta)",
      node: (
        <StatCard
          label="Investimento (Meta)"
          value={formatCurrency(spend.spend)}
          hint={spend.ok ? undefined : "parcial (erro em conta)"}
        />
      ),
    },
    {
      id: "roas",
      title: "ROAS",
      node: (
        <StatCard
          label="ROAS"
          value={roas !== null ? `${roas.toFixed(2)}x` : "—"}
          labelClassName="text-success"
          valueClassName="text-success"
        />
      ),
    },
    {
      id: "lucro",
      title: "Lucro",
      node: (
        <StatCard
          label="Lucro"
          value={formatCurrency(lucro)}
          labelClassName="text-success"
          valueClassName={lucro >= 0 ? "text-success" : "text-destructive"}
        />
      ),
    },
  ];

  // Cartões maiores (funil, mapa, listas, gráficos). Os 4 "lg" ficam juntos
  // de propósito — assim eles sempre formam pares de linha completa (2+2),
  // e os "full" abrem/fecham sozinhos sua própria linha. Nada de vão em
  // branco, em qualquer ordem que o usuário arrastar DENTRO deste grupo.
  const contentBlocks: DashboardBlock[] = [
    {
      // Funil grande à esquerda (mesma altura das 3 linhas de cartões à
      // direita) + uma grade 2×3 de métricas secundárias — um único bloco
      // "full", já que a proporção interna (funil alto + grade fina) só faz
      // sentido junta; os 6 cartõezinhos não são arrastáveis à parte.
      id: "spiderflow-hero",
      title: "SpiderFlow — funil de conversão",
      span: "full",
      node: (
        <div className="grid items-stretch gap-4 lg:grid-cols-2">
          <Card className="flex h-full flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Spider<span className="text-primary">Flow</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col pt-0">
              <div className="min-h-0 flex-1">
                <Funnel
                  clicks={clicks.clicks}
                  pageviews={funnel.pageviews}
                  ics={funnel.ics}
                  salesInit={funnel.salesInit}
                  salesApproved={funnel.salesApproved}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Linha 1 */}
            <Card className="flex min-w-0 flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  ARPU
                </CardTitle>
              </CardHeader>
              <CardContent className="flex min-w-0 flex-1 flex-col justify-center">
                <div
                  title={arpu != null ? formatCurrency(arpu) : "N/A"}
                  className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-lg font-semibold leading-tight tabular-nums"
                >
                  {arpu != null ? formatCurrency(arpu) : "N/A"}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  receita ÷ pedidos aprovados
                </p>
              </CardContent>
            </Card>
            <Card className="flex min-w-0 flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  CPA médio
                </CardTitle>
              </CardHeader>
              <CardContent className="flex min-w-0 flex-1 flex-col justify-center">
                <div
                  title={cpaGeral != null ? formatCurrency(cpaGeral) : "N/A"}
                  className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-lg font-semibold leading-tight tabular-nums"
                >
                  {cpaGeral != null ? formatCurrency(cpaGeral) : "N/A"}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  investimento ÷ pedidos aprovados
                </p>
              </CardContent>
            </Card>
            {/* Linha 2 */}
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
            {/* Linha 3 */}
            <StatCard
              label="Chargeback"
              value={formatPercent(chargeback.rate)}
              hint={
                chargeback.count > 0
                  ? `${formatNumber(chargeback.count)} caso(s) · ${formatCurrency(chargeback.value)}`
                  : "sem casos no período"
              }
              valueClassName={
                chargeback.rate > 0.02 ? "text-destructive" : undefined
              }
            />
            <StatCard
              label="Imposto Meta Ads"
              value={formatCurrency(impostoMetaAds)}
              hint={`${(finance.metaAdsTaxRate * 100).toFixed(1)}% do investimento`}
            />
          </div>
        </div>
      ),
    },
    {
      id: "spidercountry",
      title: "SpiderCountry — mapa de vendas",
      span: "lg",
      node: (
        <Card>
          <CardContent className="pt-6">
            <SalesMap data={salesGeo} />
          </CardContent>
        </Card>
      ),
    },
    {
      id: "vendas-produto",
      title: "Vendas por produto",
      span: "lg",
      node: (
        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle className="text-base">Vendas por produto</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            {sales.byProduct.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Sem vendas no período.
                </p>
              </div>
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
      ),
    },
    {
      id: "taxa-aprovacao",
      title: "Taxa de Aprovação",
      span: "lg",
      node: (
        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle className="text-base">Taxa de Aprovação</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-center">
            <ApprovalPanel methods={approval} />
          </CardContent>
        </Card>
      ),
    },
    {
      id: "vendas-pagamento",
      title: "Vendas por pagamento",
      span: "lg",
      node: (
        <Card className="flex h-full min-w-0 flex-col">
          <CardHeader>
            <CardTitle className="text-base">Vendas por pagamento</CardTitle>
          </CardHeader>
          <CardContent className="flex min-w-0 flex-1 flex-col justify-center">
            <PaymentDonut data={sales.byPayment} total={sales.total} />
          </CardContent>
        </Card>
      ),
    },
    {
      id: "vendas-horario",
      title: "Vendas por Horário",
      span: "full",
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
      span: "full",
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

  const sections: DashboardSection[] = [
    { id: "kpis", blocks: kpiBlocks },
    { id: "content", blocks: contentBlocks },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho + filtros dentro de um único cartão (mesmo cinza dos
          cartões de KPI) — inspirado na UTMify, mantendo nossos próprios
          filtros (nada de "período de visualização" etc.), só acrescentando
          o filtro de Produto. */}
      <Card>
        <CardContent className="space-y-4 py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">Visão geral</h1>
              {/* No mobile o texto fica embaixo do título (igual UTMify); a
                  partir do "sm" ele volta a ficar do lado do botão. */}
              <p className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                {refreshTimeAgoLabel(spend.fetchedAt)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {refreshTimeAgoLabel(spend.fetchedAt)}
              </span>
              <RefreshBar
                fetchedAt={spend.fetchedAt}
                action={refreshOverview}
                showLabel={false}
              />
            </div>
          </div>

          {/* Divisorzinho sutil entre o título e os filtros. */}
          <div className="border-t border-border/60" />

          {/* Mobile: grade 2×2 (Período+Conta na 1ª linha, Oferta+Produto na
              2ª). A partir do "sm" volta a ser uma linha só, com quebra. */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
            <PeriodSelector current={range.key} />
            <AccountFilter current={accountParam} accounts={accounts} />
            <OfertaFilter current={ofertaParam} ofertas={ofertaOptions} />
            <ProductFilter current={productParam} products={productOptions} />
          </div>
        </CardContent>
      </Card>

      <DashboardCustomizer
        sections={sections}
        storageKey="spidertrack:dashboard-inicio:v3"
      />
    </div>
  );
}
