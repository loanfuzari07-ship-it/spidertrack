import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface PixelSpiderRow {
  id: string;
  label: string;
  pixelId: string;
  capiTokenMask: string | null;
  domain: string | null;
  isActive: boolean;
  ga4: {
    id: string;
    measurementId: string;
    apiSecretMask: string | null;
  } | null;
}

export async function getPixelSpiders(
  db: SupabaseClient,
): Promise<PixelSpiderRow[]> {
  const { data: pixels } = await db
    .from("meta_pixels")
    .select(
      "id, label, pixel_id, capi_token_mask, domain, is_active, linked_ga4_id",
    )
    .order("created_at", { ascending: true });

  const ga4Ids = (pixels ?? [])
    .map((p) => p.linked_ga4_id as string | null)
    .filter(Boolean) as string[];

  const ga4Map = new Map<
    string,
    { id: string; measurement_id: string; api_secret_mask: string | null }
  >();
  if (ga4Ids.length > 0) {
    const { data: ga4 } = await db
      .from("ga4_accounts")
      .select("id, measurement_id, api_secret_mask")
      .in("id", ga4Ids);
    for (const g of ga4 ?? []) ga4Map.set(g.id, g);
  }

  return (pixels ?? []).map((p) => {
    const linked = p.linked_ga4_id
      ? ga4Map.get(p.linked_ga4_id as string)
      : undefined;
    return {
      id: p.id,
      label: p.label,
      pixelId: p.pixel_id,
      capiTokenMask: p.capi_token_mask,
      domain: p.domain,
      isActive: p.is_active,
      ga4: linked
        ? {
            id: linked.id,
            measurementId: linked.measurement_id,
            apiSecretMask: linked.api_secret_mask,
          }
        : null,
    };
  });
}
