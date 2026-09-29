import "server-only";
import webpush from "web-push";
import { encrypt } from "@/app/(panel)/dashboard/config/actions";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

async function decrypt(admin: Admin, ciphertext: string) {
  const { data, error } = await admin.rpc("decrypt_secret", { ciphertext });
  if (error) throw new Error(`Falha ao decifrar: ${error.message}`);
  return data as string | null;
}

/**
 * Lê (ou gera, na primeira vez que alguém precisa) o par de chaves VAPID —
 * a "identidade" que prova pro navegador que é ESTE servidor quem está
 * mandando o push, e não qualquer um. A pública viaja pro navegador
 * (`pushManager.subscribe`); a privada nunca sai daqui — fica cifrada no
 * banco, no mesmo esquema dos outros segredos (webhook_token, tokens de
 * anúncio etc.), e só é decifrada na hora de assinar um envio.
 */
export async function ensureVapidKeys(
  admin: Admin,
): Promise<{ publicKey: string; privateKey: string } | null> {
  const { data } = await admin
    .from("settings")
    .select("vapid_public_key, vapid_private_key_enc")
    .eq("id", 1)
    .maybeSingle();

  const row = data as
    | { vapid_public_key: string | null; vapid_private_key_enc: string | null }
    | null;

  if (row?.vapid_public_key && row.vapid_private_key_enc) {
    const privateKey = await decrypt(admin, row.vapid_private_key_enc);
    if (privateKey) return { publicKey: row.vapid_public_key, privateKey };
  }

  // Ainda não existe (1ª vez) ou ficou incompleto — gera um par novo e salva.
  const keys = webpush.generateVAPIDKeys();
  const privateEnc = await encrypt(admin, keys.privateKey);
  const { error } = await admin
    .from("settings")
    .update({
      vapid_public_key: keys.publicKey,
      vapid_private_key_enc: privateEnc,
    })
    .eq("id", 1);
  if (error) {
    throw new Error(`Falha ao salvar chaves VAPID: ${error.message}`);
  }

  return { publicKey: keys.publicKey, privateKey: keys.privateKey };
}

/** Só a chave pública — usada pelo layout do painel pra habilitar o botão
 *  "Ativar notificações" sem nunca tocar na privada. */
export async function getVapidPublicKey(admin: Admin): Promise<string | null> {
  const keys = await ensureVapidKeys(admin);
  return keys?.publicKey ?? null;
}
