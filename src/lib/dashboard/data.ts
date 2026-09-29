import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as demo from "@/lib/demo/data";
import { IS_DEMO } from "@/lib/demo/mode";
import * as q from "@/lib/dashboard/queries";
import type { DateRange } from "@/lib/dashboard/range";
import * as spend from "@/lib/dashboard/spend";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Fonte de dados do painel — o ÚNICO lugar que sabe se estamos em modo
 * demonstração. As páginas chamam sempre daqui: com Supabase configurado cai em
 * `queries.ts`/`spend.ts` (dados reais, sob RLS); sem Supabase, devolve o
 * conjunto fictício de `@/lib/demo/data`.
 */

export interface Source {
  /** Cliente autenticado (RLS). `null` = modo demonstração. */
  db: SupabaseClient | null;
  /** Cliente service_role (Meta Ads). `null` = modo demonstração. */
  admin: SupabaseClient | null;
  demo: boolean;
}

/** Cria os clientes uma única vez por página. */
export async function getSource(): Promise<Source> {
  if (IS_DEMO) return { db: null, admin: null, demo: true };
  return { db: await createClient(), admin: createAdminClient(), demo: false };
}

// ── agregados do banco ───────────────────────────────────────────────────────
// `oferta` filtra por uma Oferta (definida em Configurações → Produtos);
// undefined/"all" = todas. `campaignKeys` (Vis.Página/ICs) vem do mapa
// campanha→oferta (`getOfertaMaps`) — quem chama monta o Set uma vez por página.
export const getOverview = (s: Source, r: DateRange, oferta?: string, product?: string) =>
  s.db
    ? q.getOverview(s.db, r, oferta, product)
    : Promise.resolve(demo.overview(r, oferta, product));

export const getFunnel = (
  s: Source,
  r: DateRange,
  oferta?: string,
  campaignKeys?: Set<string> | null,
  product?: string,
) =>
  s.db
    ? q.getFunnel(s.db, r, oferta, campaignKeys, product)
    : Promise.resolve(demo.funnel(r, oferta, campaignKeys, product));

export const getSalesStatusCounts = (
  s: Source,
  r: DateRange,
  oferta?: string,
  product?: string,
) =>
  s.db
    ? q.getSalesStatusCounts(s.db, r, oferta, product)
    : Promise.resolve(demo.salesStatus(r, oferta, product));

export const getSalesByCountry = (
  s: Source,
  r: DateRange,
  oferta?: string,
  product?: string,
) =>
  s.db
    ? q.getSalesByCountry(s.db, r, oferta, product)
    : Promise.resolve(demo.salesByCountry(r, oferta, product));

export const getSalesBreakdown = (
  s: Source,
  r: DateRange,
  oferta?: string,
  product?: string,
) =>
  s.db
    ? q.getSalesBreakdown(s.db, r, oferta, product)
    : Promise.resolve(demo.salesBreakdown(r, oferta, product));

export const getEventsByType = (s: Source, r: DateRange) =>
  s.db ? q.getEventsByType(s.db, r) : Promise.resolve(demo.eventsByType(r));

export const getRevenueDaily = (
  s: Source,
  r: DateRange,
  oferta?: string,
  product?: string,
) =>
  s.db
    ? q.getRevenueDaily(s.db, r, oferta, product)
    : Promise.resolve(demo.revenueDaily(r, oferta, product));

export const getFaturamento = (s: Source, r: DateRange) =>
  s.db ? q.getFaturamento(s.db, r) : Promise.resolve(demo.faturamento(r));

export const getChargebackStats = (
  s: Source,
  r: DateRange,
  oferta?: string,
  product?: string,
) =>
  s.db
    ? q.getChargebackStats(s.db, r, oferta, product)
    : Promise.resolve(demo.chargebackStats(r, oferta, product));

export const getApprovalByMethod = (
  s: Source,
  r: DateRange,
  oferta?: string,
  product?: string,
) =>
  s.db
    ? q.getApprovalByMethod(s.db, r, oferta, product)
    : Promise.resolve(demo.approvalByMethod(r, oferta, product));

export const getSalesByHour = (
  s: Source,
  r: DateRange,
  oferta?: string,
  product?: string,
) =>
  s.db
    ? q.getSalesByHour(s.db, r, oferta, product)
    : Promise.resolve(demo.salesByHour(r, oferta, product));

export const getLifetimeRevenue = (s: Source) =>
  s.db ? q.getLifetimeRevenue(s.db) : Promise.resolve(demo.lifetimeRevenue());

export const getFinanceSettings = (s: Source) =>
  s.db ? q.getFinanceSettings(s.db) : Promise.resolve(demo.financeSettings());

export const getOfertaMaps = (s: Source, r: DateRange) =>
  s.db ? q.getOfertaMaps(s.db, r) : Promise.resolve(demo.ofertaMaps(r));

export const getPurchasesList = (
  s: Source,
  r: DateRange,
  limit = 100,
  product?: string,
) =>
  s.db
    ? q.getPurchasesList(s.db, r, limit, product)
    : Promise.resolve(demo.purchasesList(r, limit, product));

export const getProductOptions = (s: Source, r: DateRange) =>
  s.db ? q.getProductOptions(s.db, r) : Promise.resolve(demo.productOptions(r));

export const getGeo = (s: Source, r: DateRange) =>
  s.db ? q.getGeo(s.db, r) : Promise.resolve(demo.geo(r));

export const getPages = (s: Source, r: DateRange) =>
  s.db ? q.getPages(s.db, r) : Promise.resolve(demo.pages(r));

export const getEvents = (
  s: Source,
  opts: {
    range: DateRange;
    eventName?: string | null;
    page?: number;
    pageSize?: number;
  },
) => (s.db ? q.getEvents(s.db, opts) : Promise.resolve(demo.events(opts.range, opts)));

// ── Meta Ads ─────────────────────────────────────────────────────────────────
// `accountId` filtra por uma conta de anúncio (undefined/"all" = todas).
// `campaignKeys` filtra por oferta (campanha→oferta, via `getOfertaMaps`).
export const getTotalSpend = (
  s: Source,
  r: DateRange,
  accountId?: string,
  campaignKeys?: Set<string> | null,
) =>
  s.admin
    ? spend.getTotalSpend(s.admin, r, accountId, campaignKeys)
    : Promise.resolve(demo.totalSpend(r, campaignKeys));

export const getTotalClicks = (
  s: Source,
  r: DateRange,
  accountId?: string,
  campaignKeys?: Set<string> | null,
) =>
  s.admin
    ? spend.getTotalClicks(s.admin, r, accountId, campaignKeys)
    : Promise.resolve(demo.totalClicks(r, campaignKeys));

export const getDailySpendMap = (
  s: Source,
  r: DateRange,
  accountId?: string,
  campaignKeys?: Set<string> | null,
) =>
  s.admin
    ? spend.getDailySpendMap(s.admin, r, accountId, campaignKeys)
    : Promise.resolve(demo.dailySpendMap(r, campaignKeys));

export const getAdNameMap = (s: Source, r: DateRange) =>
  s.admin ? spend.getAdNameMap(s.admin, r) : Promise.resolve(demo.adNameMap());
