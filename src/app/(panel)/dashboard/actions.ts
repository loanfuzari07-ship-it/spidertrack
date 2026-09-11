"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { DEMO_WRITE_ERROR, IS_DEMO } from "@/lib/demo/mode";
import { META_INSIGHTS_TAG } from "@/lib/dispatch/meta-ads";
import { createClient } from "@/lib/supabase/server";

/** Força a atualização dos dados de Meta Ads usados na Visão geral. */
export async function refreshOverview() {
  if (IS_DEMO) throw new Error(DEMO_WRITE_ERROR);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  revalidateTag(META_INSIGHTS_TAG, "max");
  revalidatePath("/dashboard");
}
