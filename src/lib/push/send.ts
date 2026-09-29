import "server-only";
import webpush from "web-push";
import { BRAND_NAME } from "@/lib/branding";
import { ensureVapidKeys } from "@/lib/push/vapid";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export interface PushPayload {
  title: string;
  body: string;
  /** Rota aberta ao tocar na notificação (padrão: /dashboard). */
  url?: string;
}

/**
 * Manda uma notificação push pra TODOS os navegadores/dispositivos que
 * ativaram — não existe "por usuário" aqui: é um painel single-tenant, o
 * time inteiro (dono + colaboradores) recebe o mesmo aviso.
 *
 * Nunca lança: uma falha no push não pode derrubar o webhook de compra que
 * a chamou. Inscrição expirada/revogada (404/410, a pessoa desinstalou o
 * app ou limpou os dados do navegador) é apagada na hora, pra lista não
 * acumular lixo.
 */
export async function sendPushToAll(
  admin: Admin,
  payload: PushPayload,
): Promise<void> {
  try {
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth");
    const list = (subs ?? []) as {
      endpoint: string;
      p256dh: string;
      auth: string;
    }[];
    if (list.length === 0) return;

    const vapid = await ensureVapidKeys(admin);
    if (!vapid) return;

    // Contato exigido pelo protocolo VAPID (só usado por provedores de push
    // em caso de abuso) — não precisa ser um e-mail de verdade monitorado.
    const domainish = BRAND_NAME.toLowerCase().replace(/[^a-z0-9]+/g, "") || "app";
    webpush.setVapidDetails(`mailto:push@${domainish}.app`, vapid.publicKey, vapid.privateKey);

    const body = JSON.stringify(payload);

    await Promise.all(
      list.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            body,
          );
        } catch (err) {
          const statusCode = (err as { statusCode?: number } | null)?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await admin
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
          } else {
            console.error(
              "[push] falha ao enviar:",
              err instanceof Error ? err.message : err,
            );
          }
        }
      }),
    );
  } catch (err) {
    console.error(
      "[push] sendPushToAll falhou:",
      err instanceof Error ? err.message : err,
    );
  }
}

/** Notificação de venda aprovada — título fixo + comissão já em reais. */
export async function sendApprovedSalePush(
  admin: Admin,
  commissionBRL: number,
): Promise<void> {
  const value = commissionBRL.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  await sendPushToAll(admin, {
    title: "Venda aprovada!",
    body: `Comissão: R$ ${value}`,
    url: "/dashboard",
  });
}
