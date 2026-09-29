"use server";

import { requireUser } from "@/app/(panel)/dashboard/config/actions";
import { createAdminClient } from "@/lib/supabase/admin";

interface SubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export type PushActionResult = { ok: true } | { ok: false; error: string };

/**
 * Salva a inscrição deste navegador pra receber notificações push — chamada
 * depois que o navegador já pediu permissão e criou a inscrição (Web Push).
 * `onConflict: endpoint` faz reativar em silêncio se a pessoa clicar de novo
 * sem ter desativado antes (mesmo navegador = mesmo endpoint).
 */
export async function subscribePush(
  sub: SubscriptionInput,
  userAgent?: string,
): Promise<PushActionResult> {
  try {
    await requireUser();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Não autenticado." };
  }
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { ok: false, error: "Inscrição inválida." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      user_agent: userAgent ?? null,
    },
    { onConflict: "endpoint" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Remove a inscrição (a pessoa desativou as notificações neste navegador). */
export async function unsubscribePush(endpoint: string): Promise<PushActionResult> {
  try {
    await requireUser();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Não autenticado." };
  }
  if (!endpoint) return { ok: false, error: "Endpoint inválido." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
