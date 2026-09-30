import { Tag } from "lucide-react";
import { AccountFilter } from "@/components/dashboard/account-filter";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { RefreshBar } from "@/components/dashboard/refresh-bar";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/panel/page-header";
import { Card } from "@/components/ui/card";
import { getFinanceSettings, getOfertaMaps, getSource, type Source } from "@/lib/dashboard/data";
import { parseRange, type DateRange } from "@/lib/dashboard/range";
import { listAdAccounts, rangeToSinceUntil } from "@/lib/dashboard/spend";
import * as demo from "@/lib/demo/data";
import { getInsights, mapAccountsSequential } from "@/lib/dispatch/meta-ads";
import { formatCurrency, formatNumber } from "@/lib/format";
import { refreshOfertas } from "./actions";

export const dynamic = "force-dynamic";

const SEM_OFERTA = "Sem oferta";

interface OfertaResult {
  oferta: string;
  spend: number;
  revenue: number;
  orders: number;
}

interface OfertasData {
  accounts: { id: string; label: string }[];
  rows: OfertaResult[];
  fetchedAt: number | null;
  hasAccounts: boolean;
}

/** Acha a oferta de uma campanha pelo nome OU pelo id (mesma convenção usada
 *  em Campanhas pra casar UTM ↔ objeto do Meta). */
function ofertaOf(m: Map<string, string>, name: string, id: string): string | undefined {
  return m.get(name.toLowerCase()) ?? m.get(id.toLowerCase());
}

async function loadOfertas(
  src: Source,
  range: DateRange,
  accountParam: string,
): Promise<OfertasData> {
  const maps = await getOfertaMaps(src, range);

  // spendByCampaign: uma linha {id, name, spend} por campanha, venha do Meta
  // (produção) ou da vitrine (demo) — o resto da lógica é igual nos dois casos.
  let spendByCampaign: { id: string; name: string; spend: number }[] = [];
  let accounts: { id: string; label: string }[] = [];
  let fetchedAt: number | null = null;
  let hasAccounts = true;

  if (src.demo || !src.db || !src.admin) {
    const d = demo.campaigns(range);
    accounts = d.accounts;
    spendByCampaign = d.campaigns.map((c) => ({ id: c.id, name: c.name, spend: c.spend }));
    fetchedAt = Date.now();
  } else {
    const all = await listAdAccounts(src.admin);
    hasAccounts = all.length > 0;
    accounts = all.map((a) => ({ id: a.id, label: a.label }));
    const selected = accountParam === "all" ? all : all.filter((a) => a.id === accountParam);
    const { since, until } = rangeToSinceUntil(range);

    const results = await mapAccountsSequential(selected, (a) =>
      getInsights(a.ad_account_id, a.token, since, until),
    );
    const byId = new Map<string, { name: string; spend: number }>();
    for (const r of results) {
      for (const row of r.rows) {
        const cur = byId.get(row.campaign_id) ?? { name: row.campaign_name, spend: 0 };
        cur.spend += row.spend;
        byId.set(row.campaign_id, cur);
      }
    }
    spendByCampaign = [...byId.entries()].map(([id, v]) => ({ id, name: v.name, spend: v.spend }));
    fetchedAt = results.length ? Math.min(...results.map((r) => r.fetchedAt)) : null;
  }

  const totals = new Map<string, { spend: number; revenue: number; orders: number }>();
  const bump = (key: string, patch: Partial<{ spend: number; revenue: number; orders: number }>) => {
    const cur = totals.get(key) ?? { spend: 0, revenue: 0, orders: 0 };
    cur.spend += patch.spend ?? 0;
    cur.revenue += patch.revenue ?? 0;
    cur.orders += patch.orders ?? 0;
    totals.set(key, cur);
  };

  for (const c of spendByCampaign) {
    if (c.spend <= 0) continue;
    const oferta = ofertaOf(maps.campaignOferta, c.name, c.id) ?? SEM_OFERTA;
    bump(oferta, { spend: c.spend });
  }
  for (const agg of maps.revenue.values()) {
    bump(agg.oferta, { revenue: agg.revenue, orders: agg.orders });
  }

  const rows = [...totals.entries()]
    .map(([oferta, v]) => ({ oferta, ...v }))
    .sort((a, b) => b.revenue - a.revenue || b.spend - a.spend);

  return { accounts, rows, fetchedAt, hasAccounts };
}

export default async function OfertasPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; account?: string }>;
}) {
  const sp = await searchParams;
  const range = parseRange(sp.range, sp.from, sp.to);
  const accountParam = sp.account ?? "all";

  const src = await getSource();
  const [data, finance] = await Promise.all([
    loadOfertas(src, range, accountParam),
    getFinanceSettings(src),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ofertas"
        info="Resultado por oferta: some o investimento das campanhas dedicadas a ela (definida em Configurações → Produtos) com o faturamento dos produtos marcados com essa oferta."
        action={
          data.accounts.length > 1 ? (
            <AccountFilter current={accountParam} accounts={data.accounts} />
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PeriodSelector current={range.key} />
        <RefreshBar fetchedAt={data.fetchedAt} action={refreshOfertas} />
      </div>

      {!data.hasAccounts ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma conta de anúncio ativa. Cadastre em Configurações.
          </p>
        </Card>
      ) : data.rows.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <Tag className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhum resultado no período. Marque a Oferta de cada produto em
            Configurações → Produtos para começar a ver o resumo aqui.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.rows.map((r) => {
            const faturamentoLiquido = r.revenue * (1 - finance.platformFeeRate);
            const impostoMetaAds = r.spend * finance.metaAdsTaxRate;
            const lucro = faturamentoLiquido - r.spend - impostoMetaAds;
            const roas = r.spend > 0 ? faturamentoLiquido / r.spend : null;
            return (
              <div key={r.oferta} className="space-y-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Tag className="size-4" />
                  {r.oferta}
                  {r.oferta === SEM_OFERTA ? (
                    <span className="font-normal">
                      — investimento de campanhas sem oferta marcada
                    </span>
                  ) : null}
                </h2>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatCard label="Investimento" value={formatCurrency(r.spend)} />
                  <StatCard
                    label="Faturamento"
                    value={formatCurrency(faturamentoLiquido)}
                    hint={`${formatNumber(r.orders)} vendas`}
                  />
                  <StatCard
                    label="Lucro"
                    value={formatCurrency(lucro)}
                    valueClassName={lucro >= 0 ? "text-primary" : "text-destructive"}
                  />
                  <StatCard label="ROAS" value={roas != null ? `${roas.toFixed(2)}x` : "—"} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
