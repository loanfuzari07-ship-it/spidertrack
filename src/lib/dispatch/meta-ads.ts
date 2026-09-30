import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import {
  META_GRAPH_BASE,
  META_GRAPH_VERSION,
  META_INSIGHTS_CACHE_TTL_SECONDS,
  metaEdgeUrl,
  metaInsightsUrl,
} from "@/lib/constants";

// Insights do Meta Ads (nível de anúncio) com CACHE agressivo (unstable_cache):
// as respostas ficam em cache por META_INSIGHTS_CACHE_TTL_SECONDS (30 min), o que
// espaça naturalmente as chamadas e evita abusar da API. Atualização sob demanda
// via revalidateTag("meta-insights").

export const META_INSIGHTS_TAG = "meta-insights";

/**
 * O endpoint de Insights do Meta tem um limite de CONCORRÊNCIA bem rígido por
 * conta (comum em contas menores/novas): "(#613) ... concurrent request limit
 * of 1 calls per 20 seconds". Várias telas do painel (Visão geral, Campanhas,
 * Ofertas) pedem os mesmos insights de uma conta em paralelo — sem isso, cada
 * uma dispara sua PRÓPRIA chamada simultânea e estoura esse limite. Detecta o
 * erro (código ou mensagem) pra decidir se vale tentar de novo.
 */
function isMetaRateLimit(message: string | undefined, code?: unknown): boolean {
  if ([4, 17, 32, 613].includes(Number(code))) return true;
  const m = (message ?? "").toLowerCase();
  return (
    m.includes("rate limit") ||
    m.includes("too many calls") ||
    m.includes("concurrent request") ||
    m.includes("request limit")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executa `fn` (uma chamada HTTP ao Graph API) e, se vier limitada por
 * concorrência, espera um pouco e tenta de novo (até `maxRetries` vezes) —
 * em vez de estourar um erro feio pra pessoa por causa de um pico passageiro
 * de chamadas simultâneas (ex.: várias abas do painel carregando junto).
 */
async function withRateLimitRetry<T extends { ok: boolean; error?: string }>(
  fn: () => Promise<T>,
  maxRetries = 2,
): Promise<T> {
  let attempt = 0;
  for (;;) {
    const result = await fn();
    if (result.ok || attempt >= maxRetries || !isMetaRateLimit(result.error)) {
      return result;
    }
    attempt++;
    // Backoff curto e crescente — o limite costuma liberar rápido (janela de
    // poucos segundos), não precisa esperar o "20s" inteiro do erro.
    await sleep(1500 * attempt);
  }
}

/**
 * Roda uma lista de tarefas (uma por conta de anúncio) uma de cada vez, com um
 * pequeno intervalo entre elas — contas diferentes costumam compartilhar o
 * MESMO token (um System User dá acesso a várias contas de uma vez), então
 * chamadas "em paralelo" pra contas diferentes ainda competem pelo mesmo
 * limite de concorrência do token. Sequencial é um pouco mais lento, mas não
 * cai no #613 quando a pessoa seleciona "Todas as contas".
 */
export async function mapAccountsSequential<A, T>(
  items: A[],
  fn: (item: A) => Promise<T>,
  delayMs = 300,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < items.length; i++) {
    if (i > 0) await sleep(delayMs);
    out.push(await fn(items[i]));
  }
  return out;
}

export interface InsightRow {
  campaign_id: string;
  campaign_name: string;
  adset_id: string;
  adset_name: string;
  ad_id: string;
  ad_name: string;
  spend: number;
  clicks: number;
  linkClicks: number;
  impressions: number;
  /** Início de reprodução do vídeo (soma de todos os action_type de play). */
  videoPlays: number;
  /** ThruPlays — vídeo assistido até o fim ou por 15s+ (proxy de retenção). */
  videoThruplays: number;
}

export interface InsightsResult {
  ok: boolean;
  rows: InsightRow[];
  error?: string;
  fetchedAt: number;
}

/** Soma o `value` de todas as entradas de um array de ações do Meta Insights
 *  (formato `[{action_type, value}, ...]`), somando qualquer action_type —
 *  no nível de anúncio normalmente há só uma entrada relevante por campo. */
function sumActionValues(arr: unknown): number {
  if (!Array.isArray(arr)) return 0;
  return arr.reduce((s: number, a) => {
    const v = (a as { value?: string | number })?.value;
    return s + (v != null ? parseFloat(String(v)) || 0 : 0);
  }, 0);
}

async function fetchInsightsRaw(
  adAccountId: string,
  token: string,
  since: string,
  until: string,
): Promise<InsightsResult> {
  return withRateLimitRetry(() =>
    fetchInsightsRawOnce(adAccountId, token, since, until),
  );
}

async function fetchInsightsRawOnce(
  adAccountId: string,
  token: string,
  since: string,
  until: string,
): Promise<InsightsResult> {
  const rows: InsightRow[] = [];
  try {
    const base = new URL(metaInsightsUrl(adAccountId));
    base.searchParams.set("level", "ad");
    base.searchParams.set(
      "fields",
      "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,clicks,inline_link_clicks,impressions,video_play_actions,video_thruplay_watched_actions",
    );
    base.searchParams.set("time_range", JSON.stringify({ since, until }));
    base.searchParams.set("limit", "500");
    base.searchParams.set("access_token", token);

    let next: string | null = base.toString();
    let pages = 0;
    while (next && pages < 5) {
      const res: Response = await fetch(next);
      const json = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          rows,
          error: json?.error?.message ?? `HTTP ${res.status}`,
          fetchedAt: Date.now(),
        };
      }
      for (const d of json.data ?? []) {
        rows.push({
          campaign_id: d.campaign_id ?? "",
          campaign_name: d.campaign_name ?? "(sem nome)",
          adset_id: d.adset_id ?? "",
          adset_name: d.adset_name ?? "(sem nome)",
          ad_id: d.ad_id ?? "",
          ad_name: d.ad_name ?? "(sem nome)",
          spend: parseFloat(d.spend ?? "0") || 0,
          clicks: parseInt(d.clicks ?? "0", 10) || 0,
          linkClicks: parseInt(d.inline_link_clicks ?? "0", 10) || 0,
          impressions: parseInt(d.impressions ?? "0", 10) || 0,
          videoPlays: sumActionValues(d.video_play_actions),
          videoThruplays: sumActionValues(d.video_thruplay_watched_actions),
        });
      }
      next = json.paging?.next ?? null;
      pages++;
    }
    return { ok: true, rows, fetchedAt: Date.now() };
  } catch (e) {
    return {
      ok: false,
      rows,
      error: e instanceof Error ? e.message : String(e),
      fetchedAt: Date.now(),
    };
  }
}

/**
 * Versão com cache. O token NÃO entra na chave (fica no closure). Só respostas
 * de SUCESSO são cacheadas — em erro a função lança, então nada é gravado no
 * cache (evita "grudar" um erro por 30 min quando a causa já foi corrigida).
 *
 * `cache()` do React memoiza por request: se DUAS telas/funções pedirem os
 * MESMOS insights (mesma conta+período) dentro da mesma renderização — ex.:
 * a Visão geral chama getTotalSpend/getTotalClicks/getAdNameMap, e os três
 * usam getInsights com os mesmos parâmetros —, a segunda e a terceira chamada
 * reaproveitam a mesma promise em vez de disparar sua PRÓPRIA requisição
 * simultânea ao Graph API (isso sozinho já cobria a maior parte dos #613).
 */
export const getInsights = cache(async function getInsights(
  adAccountId: string,
  token: string,
  since: string,
  until: string,
): Promise<InsightsResult> {
  const cached = unstable_cache(
    async () => {
      const r = await fetchInsightsRaw(adAccountId, token, since, until);
      if (!r.ok) throw new Error(r.error ?? "insights_error");
      return r;
    },
    [META_INSIGHTS_TAG, adAccountId, since, until],
    {
      revalidate: META_INSIGHTS_CACHE_TTL_SECONDS,
      tags: [META_INSIGHTS_TAG, `${META_INSIGHTS_TAG}:${adAccountId}`],
    },
  );
  try {
    return await cached();
  } catch (e) {
    return {
      ok: false,
      rows: [],
      error: e instanceof Error ? e.message : String(e),
      fetchedAt: Date.now(),
    };
  }
});

// ── gasto diário (para o gráfico de receita × investimento) ─────────────────

export interface DailySpend {
  day: string; // YYYY-MM-DD
  spend: number;
  /** Nível campanha (não conta) — permite filtrar o gasto diário por oferta
   *  (campanha → oferta), igual ao gasto total. */
  campaign_id: string;
  campaign_name: string;
}

async function fetchDailySpendRaw(
  adAccountId: string,
  token: string,
  since: string,
  until: string,
): Promise<{ ok: boolean; rows: DailySpend[]; error?: string }> {
  return withRateLimitRetry(() =>
    fetchDailySpendRawOnce(adAccountId, token, since, until),
  );
}

async function fetchDailySpendRawOnce(
  adAccountId: string,
  token: string,
  since: string,
  until: string,
): Promise<{ ok: boolean; rows: DailySpend[]; error?: string }> {
  const rows: DailySpend[] = [];
  try {
    const base = new URL(metaInsightsUrl(adAccountId));
    base.searchParams.set("level", "campaign");
    base.searchParams.set("fields", "campaign_id,campaign_name,spend");
    base.searchParams.set("time_range", JSON.stringify({ since, until }));
    base.searchParams.set("time_increment", "1"); // um registro por dia
    base.searchParams.set("limit", "500");
    base.searchParams.set("access_token", token);

    let next: string | null = base.toString();
    let pages = 0;
    while (next && pages < 5) {
      const res: Response = await fetch(next);
      const json = await res.json();
      if (!res.ok) {
        return { ok: false, rows, error: json?.error?.message ?? `HTTP ${res.status}` };
      }
      for (const d of json.data ?? []) {
        rows.push({
          day: d.date_start,
          spend: parseFloat(d.spend ?? "0") || 0,
          campaign_id: d.campaign_id ?? "",
          campaign_name: d.campaign_name ?? "(sem nome)",
        });
      }
      next = json.paging?.next ?? null;
      pages++;
    }
    return { ok: true, rows };
  } catch (e) {
    return { ok: false, rows, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Gasto por dia (nível de conta), com o mesmo cache dos insights. Também
 *  memoizado por request (ver comentário em `getInsights`). */
export const getDailySpend = cache(async function getDailySpend(
  adAccountId: string,
  token: string,
  since: string,
  until: string,
): Promise<DailySpend[]> {
  const cached = unstable_cache(
    async () => {
      const r = await fetchDailySpendRaw(adAccountId, token, since, until);
      if (!r.ok) throw new Error(r.error ?? "insights_error");
      return r.rows;
    },
    [META_INSIGHTS_TAG, "daily-v2", adAccountId, since, until],
    {
      revalidate: META_INSIGHTS_CACHE_TTL_SECONDS,
      tags: [META_INSIGHTS_TAG, `${META_INSIGHTS_TAG}:${adAccountId}`],
    },
  );
  try {
    return await cached();
  } catch {
    return [];
  }
});

// ── objetos (campanha/conjunto/anúncio) com status e orçamento ──────────────

export interface AdObject {
  id: string;
  name: string;
  status: string; // ACTIVE / PAUSED / ARCHIVED ...
  effective_status: string;
  daily_budget: number | null; // centavos
  lifetime_budget: number | null; // centavos
  campaign_id: string | null; // conjuntos e anúncios
  adset_id: string | null; // anúncios
}

async function fetchEdgeRaw(
  adAccountId: string,
  token: string,
  edge: string,
  fields: string,
): Promise<{ ok: boolean; rows: AdObject[]; error?: string }> {
  return withRateLimitRetry(() =>
    fetchEdgeRawOnce(adAccountId, token, edge, fields),
  );
}

async function fetchEdgeRawOnce(
  adAccountId: string,
  token: string,
  edge: string,
  fields: string,
): Promise<{ ok: boolean; rows: AdObject[]; error?: string }> {
  const rows: AdObject[] = [];
  try {
    const base = new URL(metaEdgeUrl(adAccountId, edge));
    base.searchParams.set("fields", fields);
    base.searchParams.set("limit", "500");
    base.searchParams.set("access_token", token);

    let next: string | null = base.toString();
    let pages = 0;
    while (next && pages < 8) {
      const res: Response = await fetch(next);
      const json = await res.json();
      if (!res.ok) {
        return { ok: false, rows, error: json?.error?.message ?? `HTTP ${res.status}` };
      }
      for (const d of json.data ?? []) {
        rows.push({
          id: d.id,
          name: d.name ?? "(sem nome)",
          status: d.status ?? "",
          effective_status: d.effective_status ?? "",
          daily_budget: d.daily_budget != null ? Number(d.daily_budget) : null,
          lifetime_budget:
            d.lifetime_budget != null ? Number(d.lifetime_budget) : null,
          campaign_id: d.campaign_id ?? null,
          adset_id: d.adset_id ?? null,
        });
      }
      next = json.paging?.next ?? null;
      pages++;
    }
    return { ok: true, rows };
  } catch (e) {
    return { ok: false, rows, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Lista objetos de uma borda (campaigns/adsets/ads), com o cache dos insights. */
async function getEdge(
  adAccountId: string,
  token: string,
  edge: string,
  fields: string,
): Promise<AdObject[]> {
  const cached = unstable_cache(
    async () => {
      const r = await fetchEdgeRaw(adAccountId, token, edge, fields);
      if (!r.ok) throw new Error(r.error ?? "meta_error");
      return r.rows;
    },
    [META_INSIGHTS_TAG, "edge", edge, adAccountId],
    {
      revalidate: META_INSIGHTS_CACHE_TTL_SECONDS,
      tags: [META_INSIGHTS_TAG, `${META_INSIGHTS_TAG}:${adAccountId}`],
    },
  );
  try {
    return await cached();
  } catch {
    return [];
  }
}

const CAMPAIGN_FIELDS =
  "id,name,status,effective_status,daily_budget,lifetime_budget";
const ADSET_FIELDS =
  "id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget";
const AD_FIELDS = "id,name,adset_id,campaign_id,status,effective_status";

export const getCampaigns = (id: string, token: string) =>
  getEdge(id, token, "campaigns", CAMPAIGN_FIELDS);
export const getAdSets = (id: string, token: string) =>
  getEdge(id, token, "adsets", ADSET_FIELDS);
export const getAds = (id: string, token: string) =>
  getEdge(id, token, "ads", AD_FIELDS);

// ── descoberta de contas (colar 1 token e listar todas as contas dele) ──────

export interface DiscoveredAdAccount {
  id: string; // já vem com "act_" da própria API
  name: string;
  active: boolean; // account_status === 1
}

/**
 * Lista as contas de anúncio que o token enxerga (`/me/adaccounts`). Não usa
 * cache — é uma ação explícita da pessoa ("Buscar contas"), sem custo de API
 * repetido em segundo plano.
 */
export async function discoverAdAccounts(
  token: string,
): Promise<{ ok: boolean; accounts: DiscoveredAdAccount[]; error?: string }> {
  const accounts: DiscoveredAdAccount[] = [];
  try {
    const base = new URL(`${META_GRAPH_BASE}/${META_GRAPH_VERSION}/me/adaccounts`);
    base.searchParams.set("fields", "id,name,account_status");
    base.searchParams.set("limit", "200");
    base.searchParams.set("access_token", token);

    let next: string | null = base.toString();
    let pages = 0;
    while (next && pages < 5) {
      const res: Response = await fetch(next);
      const json = await res.json();
      if (!res.ok) {
        const err = json?.error as
          | {
              message?: string;
              error_user_msg?: string;
              code?: number;
              error_subcode?: number;
            }
          | undefined;
        const detail = err?.error_user_msg ?? err?.message ?? `HTTP ${res.status}`;
        // Inclui o código do erro do Meta na mensagem: ajuda a diferenciar um
        // problema temporário (rate limit) de um bloqueio de conta/token —
        // cada código tem uma causa e resolução diferentes do lado do Meta.
        const code = err?.code
          ? ` (código ${err.code}${err.error_subcode ? "/" + err.error_subcode : ""})`
          : "";
        return {
          ok: false,
          accounts,
          error: `${detail}${code}`,
        };
      }
      for (const d of json.data ?? []) {
        accounts.push({
          id: d.id,
          name: d.name ?? d.id,
          active: Number(d.account_status) === 1,
        });
      }
      next = json.paging?.next ?? null;
      pages++;
    }
    return { ok: true, accounts };
  } catch (e) {
    return {
      ok: false,
      accounts,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
