"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/(panel)/dashboard/config/actions";
import { createClient } from "@/lib/supabase/server";

const MINHA_CONTA_PATH = "/dashboard/minha-conta";

export type ActionState = { ok?: true; error?: string } | null;

/** Salva nome/sobrenome no `user_metadata` do próprio usuário (self-service —
 *  não precisa de service_role, é o dado dele mesmo). Aparece no lugar do
 *  e-mail na barra lateral. */
export async function updateProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireUser();

    const firstName = String(formData.get("first_name") ?? "").trim();
    const lastName = String(formData.get("last_name") ?? "").trim();
    if (!firstName) return { error: "Informe seu nome." };

    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      data: { first_name: firstName, last_name: lastName || null },
    });
    if (error) return { error: error.message };

    revalidatePath(MINHA_CONTA_PATH);
    // Revalida o layout do painel inteiro — é onde a barra lateral mostra o nome.
    revalidatePath("/dashboard", "layout");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro inesperado." };
  }
}
