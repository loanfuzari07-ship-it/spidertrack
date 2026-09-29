// Função pura (sem hooks/estado) — mora fora de `refresh-bar.tsx` (que tem
// "use client") de propósito, pra poder ser chamada tanto no Server Component
// da página (texto embaixo do título, no mobile) quanto dentro do próprio
// `RefreshBar` (client). Um módulo "use client" só pode ser CONSUMIDO por um
// Server Component como componente — chamar uma função exportada dele direto
// no servidor quebra em runtime ("Attempted to call X() from the server").

/** "agora mesmo" / "há 1 min" / "há 12 min" a partir de um timestamp (ms). Sem
 *  conta de anúncio ativa (`fetchedAt` nulo) explica por que não há hora. */
export function refreshTimeAgoLabel(fetchedAt: number | null): string {
  if (fetchedAt == null) return "Sem conta de anúncio ativa pra atualizar";
  const minutes = Math.max(0, Math.round((Date.now() - fetchedAt) / 60_000));
  if (minutes < 1) return "Atualizado agora mesmo";
  if (minutes === 1) return "Atualizado há 1 min";
  return `Atualizado há ${minutes} min`;
}
