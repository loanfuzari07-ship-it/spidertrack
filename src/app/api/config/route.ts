import { NextRequest } from "next/server";
import {
  jsonResponse,
  notConfiguredResponse,
  preflightResponse,
} from "@/lib/capture/http";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Config pública para o snippet: measurement_ids (GA4) e pixel_ids (Meta) ativos.
 * São identificadores PÚBLICOS (já apareceriam no HTML de qualquer site). Nenhum
 * segredo é exposto aqui.
 *
 * Roteamento por domínio (multi-produto): se a página mandar `?domain=`, cada
 * Pixel/GA4 com domínio próprio cadastrado só entra se bater com esse domínio;
 * os que ficaram SEM domínio (`domain IS NULL`) entram sempre — cobre tanto o
 * caso "todos os produtos no mesmo domínio" (nada precisa ser preenchido)
 * quanto um pixel "global" que deva rodar em todas as páginas mesmo com
 * outros produtos tendo pixel próprio. Sem `?domain=` (script antigo em cache,
 * por ex.), devolve tudo — comportamento anterior, sem quebrar nada.
 */
export async function GET(req: NextRequest) {
  // Sem Supabase não há contas cadastradas — o snippet só não carrega nada.
  if (notConfiguredResponse()) return jsonResponse({ ga4: [], pixels: [] });

  const domain = req.nextUrl.searchParams.get("domain")?.toLowerCase().trim() || null;

  const admin = createAdminClient();
  const [ga4, pixels] = await Promise.all([
    admin
      .from("ga4_accounts")
      .select("measurement_id, domain")
      .eq("is_active", true),
    admin.from("meta_pixels").select("pixel_id, domain").eq("is_active", true),
  ]);

  const matches = (rowDomain: string | null) =>
    !domain || !rowDomain || rowDomain.toLowerCase() === domain;

  return jsonResponse({
    ga4: (ga4.data ?? [])
      .filter((r) => matches(r.domain as string | null))
      .map((r) => r.measurement_id),
    pixels: (pixels.data ?? [])
      .filter((r) => matches(r.domain as string | null))
      .map((r) => r.pixel_id),
  });
}

export async function OPTIONS() {
  return preflightResponse();
}
