import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { productKey } from "@/lib/products";

// Lista de produtos derivada de purchases + o flag send_meta (product_settings).
// Roda com o cliente AUTENTICADO (RLS) no server component de Configurações.

export interface ProductRow {
  key: string;
  name: string;
  sales: number;
  revenue: number;
  send_meta: boolean;
  /** `null` = manda pra todos os pixels/propriedades ativas (padrão). */
  meta_pixel_id: string | null;
  ga4_measurement_id: string | null;
}

const CAP = 5000;

function isRefund(status: string | null): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return ["refund", "chargeback", "cancel", "dispute", "reembols"].some((d) =>
    s.includes(d),
  );
}

export async function getProducts(
  db: SupabaseClient,
): Promise<ProductRow[]> {
  const [{ data: purchases }, { data: settings }] = await Promise.all([
    db
      .from("purchases")
      .select("product_id, product_name, value, status")
      .limit(CAP),
    db
      .from("product_settings")
      .select("product_key, send_meta, meta_pixel_id, ga4_measurement_id"),
  ]);

  const flag = new Map<
    string,
    { send_meta: boolean; meta_pixel_id: string | null; ga4_measurement_id: string | null }
  >(
    (settings ?? []).map((s) => [
      s.product_key as string,
      {
        send_meta: s.send_meta as boolean,
        meta_pixel_id: (s.meta_pixel_id as string | null) ?? null,
        ga4_measurement_id: (s.ga4_measurement_id as string | null) ?? null,
      },
    ]),
  );

  const map = new Map<string, { name: string; sales: number; revenue: number }>();
  for (const p of purchases ?? []) {
    const key = productKey(p.product_id, p.product_name);
    if (!key) continue;
    const cur = map.get(key) ?? {
      name: p.product_name ?? key,
      sales: 0,
      revenue: 0,
    };
    cur.sales += 1;
    if (!isRefund(p.status) && p.value != null) cur.revenue += Number(p.value);
    map.set(key, cur);
  }

  return [...map.entries()]
    .map(([key, v]) => ({
      key,
      name: v.name,
      sales: v.sales,
      revenue: v.revenue,
      send_meta: flag.get(key)?.send_meta ?? true, // default LIGADO
      meta_pixel_id: flag.get(key)?.meta_pixel_id ?? null,
      ga4_measurement_id: flag.get(key)?.ga4_measurement_id ?? null,
    }))
    .sort((a, b) => b.sales - a.sales);
}
