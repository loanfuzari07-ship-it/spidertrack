"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { DEMO_WRITE_ERROR, IS_DEMO } from "@/lib/demo/mode";
import { META_INSIGHTS_TAG } from "@/lib/dispatch/meta-ads";
import { createClient } from "@/lib/supabase/server";

const OFERTAS_PATH = "/dashboard/ofertas";

async function requireUser() {
  if (IS_DEMO) throw new Error(DEMO_WRITE_ERROR);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
}

/** Força a atualização dos insights do Meta Ads usados nesta página. */
export async function refreshOfertas() {
  await requireUser();
  revalidateTag(META_INSIGHTS_TAG, "max");
  revalidatePath(OFERTAS_PATH);
}
