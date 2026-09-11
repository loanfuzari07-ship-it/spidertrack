"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  encrypt,
  requireUser,
} from "@/app/(panel)/dashboard/config/actions";
import { maskSecret, sanitizeSecret } from "@/lib/mask";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeDomain } from "@/lib/webhook/domain";

const PATH = "/dashboard/pixel-spider";

export type ActionState = { ok?: true; error?: string } | null;

const schema = z.object({
  label: z.string().trim().min(1, "Dê um nome pra esse Pixel Spider."),
  pixelId: z.string().trim().min(1, "Informe o Pixel ID."),
});

/** Cria ou atualiza um "Pixel Spider" — o Pixel Meta e, opcionalmente, a
 *  propriedade GA4 vinculada a ele, como um conjunto só. */
export async function savePixelSpider(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireUser();
    const admin = createAdminClient();

    const id = String(formData.get("id") ?? "").trim() || null;
    const linkedGa4Id = String(formData.get("linkedGa4Id") ?? "").trim() || null;
    const isActive = String(formData.get("is_active") ?? "1") === "1";

    const parsed = schema.safeParse({
      label: formData.get("label"),
      pixelId: formData.get("pixelId"),
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    }

    const pixelId = sanitizeSecret(parsed.data.pixelId);
    const capiToken = sanitizeSecret(String(formData.get("capiToken") ?? ""));
    const domain = normalizeDomain(String(formData.get("domain") ?? "")) || null;

    const ga4MeasurementId = sanitizeSecret(
      String(formData.get("ga4MeasurementId") ?? ""),
    );
    const ga4ApiSecret = sanitizeSecret(
      String(formData.get("ga4ApiSecret") ?? ""),
    );

    // ── Pixel Meta ────────────────────────────────────────────────────────
    const pixelRow: Record<string, unknown> = {
      label: parsed.data.label,
      pixel_id: pixelId,
      domain,
      is_active: isActive,
    };
    if (capiToken) {
      pixelRow.capi_token_enc = await encrypt(admin, capiToken);
      pixelRow.capi_token_mask = maskSecret(capiToken);
    }

    // ── GA4 (opcional) ───────────────────────────────────────────────────
    let ga4Id = linkedGa4Id;
    if (ga4MeasurementId) {
      const ga4Row: Record<string, unknown> = {
        label: parsed.data.label,
        measurement_id: ga4MeasurementId,
        domain,
        is_active: isActive,
      };
      if (ga4ApiSecret) {
        ga4Row.api_secret_enc = await encrypt(admin, ga4ApiSecret);
        ga4Row.api_secret_mask = maskSecret(ga4ApiSecret);
      }

      const ga4Res = ga4Id
        ? await admin.from("ga4_accounts").update(ga4Row).eq("id", ga4Id)
        : await admin.from("ga4_accounts").insert(ga4Row).select("id").single();

      if (ga4Res.error) {
        if (ga4Res.error.code === "23505") {
          return { error: "Já existe uma propriedade GA4 com esse Measurement ID." };
        }
        return { error: ga4Res.error.message };
      }
      if (!ga4Id) {
        ga4Id = (ga4Res as { data: { id: string } | null }).data?.id ?? null;
      }
      pixelRow.linked_ga4_id = ga4Id;
    }

    const pixelRes = id
      ? await admin.from("meta_pixels").update(pixelRow).eq("id", id)
      : await admin.from("meta_pixels").insert(pixelRow);

    if (pixelRes.error) {
      if (pixelRes.error.code === "23505") {
        return { error: "Já existe um Pixel com esse Pixel ID." };
      }
      return { error: pixelRes.error.message };
    }

    revalidatePath(PATH);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro inesperado." };
  }
}

/** Apaga o Pixel Spider — e a propriedade GA4 vinculada, se houver. */
export async function deletePixelSpider(id: string) {
  await requireUser();
  const admin = createAdminClient();

  const { data } = await admin
    .from("meta_pixels")
    .select("linked_ga4_id")
    .eq("id", id)
    .maybeSingle();
  const linkedGa4Id = (data as { linked_ga4_id: string | null } | null)
    ?.linked_ga4_id;

  const { error } = await admin.from("meta_pixels").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (linkedGa4Id) {
    await admin.from("ga4_accounts").delete().eq("id", linkedGa4Id);
  }
  revalidatePath(PATH);
}

/** Ativa/desativa o Pixel Spider inteiro (Pixel + GA4 vinculado juntos). */
export async function togglePixelSpiderActive(id: string, next: boolean) {
  await requireUser();
  const admin = createAdminClient();

  const { data } = await admin
    .from("meta_pixels")
    .select("linked_ga4_id")
    .eq("id", id)
    .maybeSingle();
  const linkedGa4Id = (data as { linked_ga4_id: string | null } | null)
    ?.linked_ga4_id;

  const { error } = await admin
    .from("meta_pixels")
    .update({ is_active: next })
    .eq("id", id);
  if (error) throw new Error(error.message);

  if (linkedGa4Id) {
    await admin.from("ga4_accounts").update({ is_active: next }).eq("id", linkedGa4Id);
  }
  revalidatePath(PATH);
}
