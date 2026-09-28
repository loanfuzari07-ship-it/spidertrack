"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/(panel)/dashboard/config/actions";
import { createAdminClient } from "@/lib/supabase/admin";

const CONFIGURACOES_PATH = "/dashboard/configuracoes";

export type ActionState = { ok?: true; error?: string } | null;

/** Converte o texto do input (aceita vírgula) num número entre 0 e 100. */
function parsePercent(raw: FormDataEntryValue | null): number | null {
  if (raw == null) return null;
  const n = Number(String(raw).trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

export async function saveFinanceSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireUser();

    const metaAdsTaxRatePct = parsePercent(formData.get("meta_ads_tax_rate_pct"));
    const platformFeeRatePct = parsePercent(formData.get("platform_fee_rate_pct"));
    if (metaAdsTaxRatePct === null) {
      return { error: "Imposto Meta Ads: informe um valor entre 0 e 100." };
    }
    if (platformFeeRatePct === null) {
      return { error: "Taxa da plataforma: informe um valor entre 0 e 100." };
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("settings")
      .update({
        meta_ads_tax_rate_pct: metaAdsTaxRatePct,
        platform_fee_rate_pct: platformFeeRatePct,
      })
      .eq("id", 1);
    if (error) return { error: error.message };

    revalidatePath(CONFIGURACOES_PATH);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro inesperado." };
  }
}
